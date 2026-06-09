import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Reply, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function formatMessageDate(value) {
  if (!value) return '방금';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금';
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    + ' '
    + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ProfileMessagesPanel({ profile, user }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user || !supabase) return undefined;
    let isMounted = true;

    async function loadMessages() {
      setStatus('loading');
      const { data, error } = await supabase
        .from('crew_messages')
        .select('id,sender_id,recipient_id,sender_name,recipient_name,sender_code,recipient_code,body,parent_id,read_at,created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(24);

      if (!isMounted) return;

      if (error) {
        setMessages([]);
        setStatus(error.code === '42P01' || error.code === '42703' ? 'schema-missing' : 'error');
        setNotice(error.code === '42P01' || error.code === '42703'
          ? '개인 쪽지 SQL 연결이 필요합니다. Supabase에서 crew_messages.sql을 실행해주세요.'
          : error.message);
        return;
      }

      setMessages(data ?? []);
      setStatus('ready');
      setNotice('');
    }

    loadMessages();

    const upsertMessage = nextMessage => {
      if (!nextMessage) return;
      setMessages(current => {
        const existingIndex = current.findIndex(message => message.id === nextMessage.id);
        if (existingIndex < 0) return [nextMessage, ...current].slice(0, 24);
        return current.map(message => (
          message.id === nextMessage.id ? { ...message, ...nextMessage } : message
        ));
      });
    };

    const subscribeToMessages = (direction, filter) => supabase
      .channel(`crew-messages-${direction}-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        filter,
        schema: 'public',
        table: 'crew_messages',
      }, payload => upsertMessage(payload.new))
      .on('postgres_changes', {
        event: 'UPDATE',
        filter,
        schema: 'public',
        table: 'crew_messages',
      }, payload => upsertMessage(payload.new))
      .subscribe();

    const channels = [
      subscribeToMessages('inbox', `recipient_id=eq.${user.id}`),
      subscribeToMessages('outbox', `sender_id=eq.${user.id}`),
    ];

    return () => {
      isMounted = false;
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]);

  const unreadCount = useMemo(() => messages.filter(message => (
    message.recipient_id === user?.id && !message.read_at
  )).length, [messages, user]);

  const markAsRead = async message => {
    if (!message || message.recipient_id !== user?.id || message.read_at) return;
    const readAt = new Date().toISOString();
    setMessages(current => current.map(item => (
      item.id === message.id ? { ...item, read_at: readAt } : item
    )));
    const { error } = await supabase
      .from('crew_messages')
      .update({ read_at: readAt })
      .eq('id', message.id);
    if (error) setNotice(error.message);
  };

  return (
    <section className="profile-messages panel">
      <div className="class-track-header">
        <div>
          <span className="mono text-muted text-xs">PRIVATE SIGNAL INBOX</span>
          <h3 className="mono">개인 수신함</h3>
        </div>
        <strong className="profile-message-count mono">{unreadCount} UNREAD</strong>
      </div>

      <div className="profile-message-address">
        <Inbox size={16} aria-hidden="true" />
        <div>
          <span className="mono">MY CREW MESSAGE LINK</span>
          <strong>{profile?.public_code ?? 'SQL 연결 후 생성'}</strong>
        </div>
        {profile?.public_code && (
          <Link to={`/crew/${profile.public_code}/message`}>내 QR 주소 확인</Link>
        )}
      </div>

      {notice && <p className={`profile-message is-${status}`}>{notice}</p>}

      <div className="profile-message-list">
        {messages.length > 0 ? messages.map(message => {
          const isInbox = message.recipient_id === user?.id;
          const peerName = isInbox ? message.sender_name : message.recipient_name;
          const peerCode = isInbox ? message.sender_code : message.recipient_code;
          const canReply = isInbox && peerCode;
          return (
            <article className={`profile-message-row ${isInbox && !message.read_at ? 'is-unread' : ''}`} key={message.id}>
              <div>
                <span className="mono">{isInbox ? 'RECEIVED' : 'SENT'} / {formatMessageDate(message.created_at)}</span>
                <strong>{peerName || '탐사자'}</strong>
                <p>{message.body}</p>
              </div>
              <div className="profile-message-actions">
                {isInbox && !message.read_at && (
                  <button type="button" onClick={() => markAsRead(message)}>읽음</button>
                )}
                {canReply ? (
                  <Link to={`/crew/${peerCode}/message?replyTo=${message.id}`}>
                    <Reply size={13} aria-hidden="true" />
                    답장
                  </Link>
                ) : (
                  <span className="mono"><Send size={12} aria-hidden="true" /> {isInbox ? '답장 좌표 없음' : '송신 완료'}</span>
                )}
              </div>
            </article>
          );
        }) : (
          <div className="profile-empty-state">
            <p>{status === 'loading' ? '개인 교신 신호를 확인하고 있습니다.' : '아직 받은 쪽지가 없습니다. ID 카드 QR을 공유하면 이곳으로 개인 교신이 들어옵니다.'}</p>
          </div>
        )}
      </div>
    </section>
  );
}
