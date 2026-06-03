import { useEffect, useMemo, useState } from 'react';
import { useActivityToast } from '../../context/activityToastContextValue';
import { recordUserActivity } from '../../lib/activityLogger';
import { supabase } from '../../lib/supabaseClient';
import { getUserNickname } from '../../lib/userIdentity';
import { formatSignalTime, RADIO_MESSAGE_LIMIT } from './networkUtils';

export default function useRadioMessages(user) {
  const { showActivityToast } = useActivityToast();
  const [radioMessages, setRadioMessages] = useState([]);
  const [radioStatus, setRadioStatus] = useState('loading');
  const [radioNotice, setRadioNotice] = useState('');
  const [radioBody, setRadioBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [isRadioSubmitting, setIsRadioSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRadioMessages() {
      if (!supabase) {
        setRadioStatus('unavailable');
        return;
      }

      const { data, error } = await supabase
        .from('radio_messages')
        .select('id,user_id,author_name,body,parent_id,recipient_name,created_at')
        .order('created_at', { ascending: false })
        .limit(RADIO_MESSAGE_LIMIT);

      if (!isMounted) return;
      if (error) {
        setRadioStatus(error.code === '42P01' ? 'schema-missing' : 'error');
        setRadioNotice(error.message);
        return;
      }

      setRadioMessages(data ?? []);
      setRadioStatus('ready');
      setRadioNotice('');
    }

    loadRadioMessages();

    if (!supabase) return () => {
      isMounted = false;
    };

    const channel = supabase
      .channel('radio-messages-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'radio_messages',
      }, payload => {
        setRadioMessages(current => {
          if (current.some(message => message.id === payload.new.id)) return current;
          return [payload.new, ...current].slice(0, RADIO_MESSAGE_LIMIT);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const radioParentMap = useMemo(() => new Map(radioMessages.map(message => [message.id, message])), [radioMessages]);

  const radioStream = useMemo(() => radioMessages.slice(0, 12).map(message => {
    const parent = message.parent_id ? radioParentMap.get(message.parent_id) : null;
    const isReplyToMe = Boolean(parent && user && parent.user_id === user.id && message.user_id !== user.id);
    return {
      id: message.id,
      color: isReplyToMe ? 'var(--accent-amber)' : message.parent_id ? '#a855f7' : 'var(--primary-cyan)',
      status: isReplyToMe ? 'DIRECT_REPLY' : message.parent_id ? 'REPLY_SIGNAL' : 'OPEN_RADIO',
      sender: message.author_name,
      body: message.parent_id
        ? `${message.recipient_name || parent?.author_name || '탐사자'}에게 답신 // ${message.body}`
        : message.body,
      time: formatSignalTime(message.created_at),
      message,
      parent,
      isReplyToMe,
    };
  }), [radioMessages, radioParentMap, user]);

  const submitRadioMessage = async event => {
    event.preventDefault();
    if (!user) {
      setRadioNotice('로그인 후 무전 메시지를 송신할 수 있습니다.');
      return;
    }
    if (!radioBody.trim()) {
      setRadioNotice('무전 내용을 입력해주세요.');
      return;
    }

    setIsRadioSubmitting(true);
    setRadioNotice('');
    const body = radioBody.trim().slice(0, 240);
    const { data, error } = await supabase
      .from('radio_messages')
      .insert({
        user_id: user.id,
        author_name: getUserNickname(user),
        body,
      })
      .select()
      .single();

    if (error) {
      setRadioNotice(error.code === '42P01' ? '무전 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.' : error.message);
      setIsRadioSubmitting(false);
      return;
    }

    setRadioMessages(current => current.some(message => message.id === data.id) ? current : [data, ...current].slice(0, RADIO_MESSAGE_LIMIT));
    setRadioBody('');
    await recordUserActivity(user, {
      actionType: 'radio_message',
      points: 4,
      genre: '네트워크 무전',
      metadata: { title: '무전 메시지 송신', body },
    });
    showActivityToast({
      detail: '공개 무전 채널에 새 신호를 송신했습니다.',
      points: 4,
      title: '무전 메시지 송신',
    });
    setIsRadioSubmitting(false);
  };

  const submitRadioReply = async event => {
    event.preventDefault();
    if (!replyTarget) return;
    if (!user) {
      setRadioNotice('로그인 후 답신을 보낼 수 있습니다.');
      return;
    }
    if (!replyBody.trim()) {
      setRadioNotice('답신 내용을 입력해주세요.');
      return;
    }

    setIsRadioSubmitting(true);
    setRadioNotice('');
    const body = replyBody.trim().slice(0, 180);
    const { data, error } = await supabase
      .from('radio_messages')
      .insert({
        user_id: user.id,
        author_name: getUserNickname(user),
        body,
        parent_id: replyTarget.id,
        recipient_name: replyTarget.author_name,
      })
      .select()
      .single();

    if (error) {
      setRadioNotice(error.code === '42P01' ? '무전 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.' : error.message);
      setIsRadioSubmitting(false);
      return;
    }

    setRadioMessages(current => current.some(message => message.id === data.id) ? current : [data, ...current].slice(0, RADIO_MESSAGE_LIMIT));
    setReplyBody('');
    setReplyTarget(null);
    await recordUserActivity(user, {
      actionType: 'radio_reply',
      points: 3,
      genre: '네트워크 답신',
      metadata: { title: '무전 답신 송신', body, recipient: replyTarget.author_name },
    });
    showActivityToast({
      detail: `${replyTarget.author_name || '탐사자'}에게 답신 신호를 보냈습니다.`,
      points: 3,
      title: '무전 답신 송신',
    });
    setIsRadioSubmitting(false);
  };

  return {
    isRadioSubmitting,
    radioBody,
    radioMessages,
    radioNotice,
    radioStatus,
    radioStream,
    replyBody,
    replyTarget,
    setRadioBody,
    setReplyBody,
    setReplyTarget,
    submitRadioMessage,
    submitRadioReply,
  };
}
