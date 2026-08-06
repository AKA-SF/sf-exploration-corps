import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import PageTransition from '../PageTransition';
import AdminAccessPrompt from './AdminAccessPrompt';
import { AdminAccessContext } from '../../context/adminAccessContext';
import { useAuth } from '../../context/authContextValue';
import { supabase } from '../../lib/supabaseClient';
import { getAdminAccessToken, hasAdminRole } from '../../pages/admin/adminUtils';
import './AdminAccessBoundary.css';

async function adminAccessRequest(method, body) {
  const token = await getAdminAccessToken(supabase);
  const response = await fetch('/api/admin-access', {
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    method,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || '관리자 접속을 확인하지 못했습니다.');
    error.status = response.status;
    error.retryAfter = data.retryAfter;
    throw error;
  }
  return data;
}

export default function AdminAccessBoundary({ children }) {
  const { isConfigured, loading, user } = useAuth();
  const isAdmin = hasAdminRole(user);
  const [status, setStatus] = useState('checking');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  const checkAccess = useCallback(async () => {
    if (!user || !isAdmin || !supabase) return;
    setStatus('checking');
    setMessage('');
    try {
      await adminAccessRequest('GET');
      setStatus('unlocked');
    } catch (error) {
      if (error.status === 401) {
        setStatus('locked');
        return;
      }
      setStatus('error');
      setMessage(error.message);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (loading || !user || !isAdmin || !supabase) return;
    let active = true;
    adminAccessRequest('GET').then(() => {
      if (active) setStatus('unlocked');
    }).catch(error => {
      if (!active) return;
      if (error.status === 401) {
        setStatus('locked');
        return;
      }
      setStatus('error');
      setMessage(error.message);
    });
    return () => {
      active = false;
    };
  }, [isAdmin, loading, user]);

  const unlock = useCallback(async event => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    try {
      await adminAccessRequest('POST', { password });
      setPassword('');
      setRetryAfter(0);
      setStatus('unlocked');
    } catch (error) {
      setRetryAfter(Number(error.retryAfter || 0));
      setMessage(error.message);
      setStatus('locked');
    }
  }, [password]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const result = await adminAccessRequest('PATCH', { currentPassword, newPassword });
    return result;
  }, []);

  const lock = useCallback(async () => {
    await adminAccessRequest('DELETE');
    setPassword('');
    setMessage('');
    setStatus('locked');
  }, []);

  const contextValue = useMemo(() => ({ changePassword, lock }), [changePassword, lock]);

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (!isConfigured || !supabase) {
    return (
      <PageTransition className="admin-access-page">
        <section className="admin-access-card panel">
          <ShieldCheck aria-hidden="true" />
          <h1>관리자 연결이 필요합니다</h1>
          <p>Supabase 환경 구성을 확인해 주세요.</p>
          <Link to="/">홈으로 돌아가기</Link>
        </section>
      </PageTransition>
    );
  }

  if (user && !isAdmin) {
    return (
      <PageTransition className="admin-access-page">
        <section className="admin-access-card panel">
          <ShieldCheck aria-hidden="true" />
          <span className="mono">ADMIN ROLE REQUIRED</span>
          <h1>관리자 권한이 필요합니다</h1>
          <p>관리자 역할이 확인된 계정만 이 화면을 사용할 수 있습니다.</p>
          <Link to="/profile">내 정보로 돌아가기</Link>
        </section>
      </PageTransition>
    );
  }

  if (loading || status === 'checking') {
    return (
      <PageTransition className="admin-access-page">
        <section className="admin-access-card panel" role="status" aria-live="polite">
          <ShieldCheck aria-hidden="true" />
          <span className="mono">DOUBLE ACCESS CHECK</span>
          <h1>관리자 접속 확인 중</h1>
          <p>로그인 계정과 관리자 접속 세션을 확인하고 있습니다.</p>
        </section>
      </PageTransition>
    );
  }

  if (status === 'error') {
    return (
      <PageTransition className="admin-access-page">
        <section className="admin-access-card panel" role="alert">
          <ShieldCheck aria-hidden="true" />
          <h1>접속 확인을 완료하지 못했습니다</h1>
          <p>{message}</p>
          <button onClick={() => void checkAccess()} type="button">다시 확인</button>
        </section>
      </PageTransition>
    );
  }

  if (status !== 'unlocked') {
    return (
      <AdminAccessPrompt
        busy={status === 'submitting'}
        message={message}
        onPasswordChange={setPassword}
        onSubmit={unlock}
        password={password}
        retryAfter={retryAfter}
      />
    );
  }

  return <AdminAccessContext.Provider value={contextValue}>{children}</AdminAccessContext.Provider>;
}
