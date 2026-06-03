import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LockKeyhole, MessageSquareText, Send } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useActivityToast } from '../context/activityToastContextValue';
import { useAuth } from '../context/authContextValue';
import { recordUserActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import { getProfileNickname, getUserNickname } from '../lib/userIdentity';
import './CrewMessage.css';

const normalizeCrewCode = value => String(value ?? '').trim().toUpperCase();

async function loadOwnCrewProfile(user) {
  const { data } = await supabase
    .from('profiles')
    .select('id,nickname,public_code,title')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}

export default function CrewMessage() {
  const { crewCode = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { isConfigured, loading, user } = useAuth();
  const { showActivityToast } = useActivityToast();
  const [recipient, setRecipient] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const normalizedCode = useMemo(() => normalizeCrewCode(crewCode), [crewCode]);
  const parentId = searchParams.get('replyTo') || null;

  useEffect(() => {
    let isMounted = true;

    async function loadRecipient() {
      if (!supabase || !normalizedCode) {
        setStatus('error');
        setMessage('대원 교신 좌표를 찾지 못했습니다.');
        return;
      }

      setStatus('loading');
      const { data, error } = await supabase.rpc('get_public_crew_profile', {
        p_public_code: normalizedCode,
      });

      if (!isMounted) return;

      if (error) {
        setStatus('error');
        setMessage(error.code === '42883'
          ? '개인 쪽지 SQL 연결이 필요합니다. Supabase에서 crew_messages.sql을 실행해주세요.'
          : error.message);
        return;
      }

      const nextRecipient = Array.isArray(data) ? data[0] : data;
      if (!nextRecipient) {
        setStatus('error');
        setMessage('해당 대원 코드를 찾지 못했습니다.');
        return;
      }

      setRecipient(nextRecipient);
      setStatus('ready');
      setMessage('');
    }

    loadRecipient();

    return () => {
      isMounted = false;
    };
  }, [normalizedCode]);

  useEffect(() => {
    if (!user || !supabase) return undefined;
    let isMounted = true;

    loadOwnCrewProfile(user).then(profile => {
      if (isMounted) setOwnProfile(profile);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const submitMessage = async event => {
    event.preventDefault();
    if (!user) {
      setMessage('로그인 후 개인 교신을 보낼 수 있습니다.');
      return;
    }
    if (!recipient) return;
    if (recipient.id === user.id) {
      setMessage('자기 자신에게는 쪽지를 보낼 수 없습니다.');
      return;
    }
    if (!body.trim()) {
      setMessage('쪽지 내용을 입력해주세요.');
      return;
    }

    setIsSending(true);
    setMessage('');
    const senderName = getProfileNickname(user, ownProfile, getUserNickname(user));
    const payload = {
      body: body.trim().slice(0, 600),
      parent_id: parentId,
      recipient_code: recipient.public_code,
      recipient_id: recipient.id,
      recipient_name: recipient.nickname,
      sender_code: ownProfile?.public_code ?? null,
      sender_id: user.id,
      sender_name: senderName,
    };

    const { error } = await supabase.from('crew_messages').insert(payload);

    if (error) {
      setMessage(error.code === '42P01'
        ? '개인 쪽지 테이블 연결이 필요합니다. Supabase에서 crew_messages.sql을 실행해주세요.'
        : error.message);
      setIsSending(false);
      return;
    }

    await recordUserActivity(user, {
      actionType: parentId ? 'crew_reply' : 'crew_message',
      genre: '개인 교신',
      points: parentId ? 2 : 3,
      metadata: {
        node: 'crew-direct-message',
        recipient_code: recipient.public_code,
        recipient_name: recipient.nickname,
        title: parentId ? '개인 쪽지 답장' : '개인 쪽지 발송',
      },
    });

    showActivityToast({
      detail: `${recipient.nickname} 대원에게 개인 교신을 보냈습니다.`,
      points: parentId ? 2 : 3,
      title: parentId ? '쪽지 답장 송신' : '개인 쪽지 송신',
    });

    setBody('');
    setMessage('쪽지를 전송했습니다. 상대 대원의 프로필 수신함에 표시됩니다.');
    setIsSending(false);
  };

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (!isConfigured) {
    return (
      <PageTransition className="crew-message-page">
        <section className="crew-message-panel">
          <h1>Supabase 연결 필요</h1>
          <p>개인 교신 기능은 로그인과 권한이 필요합니다.</p>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="crew-message-page">
      <section className="crew-message-panel">
        <div className="crew-message-header">
          <span className="mono">PRIVATE CREW CHANNEL</span>
          <h1><MessageSquareText aria-hidden="true" /> 개인 쪽지 송신</h1>
          <p>ID 카드 QR로 열린 대원 전용 교신 채널입니다.</p>
        </div>

        <div className="crew-message-target">
          <LockKeyhole aria-hidden="true" />
          <div>
            <span className="mono">RECIPIENT</span>
            <strong>{recipient?.nickname ?? normalizedCode}</strong>
            <em>{recipient?.public_code ?? 'SIGNAL SCANNING'} / {recipient?.title ?? '대원 확인 중'}</em>
          </div>
        </div>

        {status === 'loading' && <p className="crew-message-status">대원 교신 좌표를 확인하고 있습니다.</p>}
        {status === 'error' && <p className="crew-message-status is-error">{message}</p>}

        <form className="crew-message-form" onSubmit={submitMessage}>
          <label>
            <span className="mono">MESSAGE BODY</span>
            <textarea
              disabled={status !== 'ready' || recipient?.id === user?.id}
              maxLength={600}
              onChange={event => setBody(event.target.value)}
              placeholder={recipient?.id === user?.id ? '자기 자신에게는 쪽지를 보낼 수 없습니다.' : '짧은 인사, 추천 작품, 교신 내용을 남겨보세요.'}
              rows="8"
              value={body}
            />
          </label>
          <div className="crew-message-actions">
            <span className="mono">{body.length}/600</span>
            <button disabled={status !== 'ready' || isSending || !body.trim() || recipient?.id === user?.id} type="submit">
              <Send size={15} aria-hidden="true" />
              {isSending ? '송신 중' : parentId ? '답장 보내기' : '쪽지 보내기'}
            </button>
          </div>
        </form>

        {message && status !== 'error' && <p className="crew-message-status">{message}</p>}
        <Link className="crew-message-back" to="/profile">내 탐사 프로필로 돌아가기</Link>
      </section>
    </PageTransition>
  );
}
