import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArchiveRestore, ArrowLeft, KeyRound, LockKeyhole, LogIn, Mail, RadioTower } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { supabase } from '../lib/supabaseClient';
import { ensureUserProfile, normalizeEmail, normalizeNickname } from '../lib/userIdentity';
import './Login.css';
import '../styles/MobileExperience.css';

function scopeReturnState(returnState, userId) {
  if (!returnState?.draft || !userId) return returnState;
  return { ...returnState, draftOwnerId: userId };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, loading, user } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : '/profile';
  const returnState = location.state?.returnState;
  const canPreviewProfile = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!loading && user) {
    return <Navigate replace state={scopeReturnState(returnState, user.id)} to={returnTo} />;
  }

  const updateForm = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  };

  const submitAuth = async event => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      if (!isConfigured || !supabase) throw new Error('Supabase 환경 변수가 아직 연결되지 않았습니다.');
      const email = normalizeEmail(form.email);
      const password = form.password;
      if (!email) throw new Error('이메일을 입력해주세요.');
      if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.');

      if (mode === 'signup') {
        const nickname = normalizeNickname(form.nickname);
        if (!nickname) throw new Error('탐사 프로필에 남길 닉네임을 입력해주세요.');
        if (nickname.length < 2) throw new Error('닉네임은 2자 이상으로 입력해주세요.');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: nickname,
              name: nickname,
              nickname,
              onboarding_version: 'sf-crew-v1',
            },
          },
        });
        if (error) throw error;
        if (data.user && data.session) {
          await ensureUserProfile(data.user, supabase, nickname);
        }
        if (data.session) {
          navigate(returnTo, { state: scopeReturnState(returnState, data.user?.id) });
          return;
        }
        setStatus('success');
        setMessage('등록 요청이 완료되었습니다. Supabase 이메일 확인 설정이 켜져 있다면 메일함에서 확인 링크를 눌러주세요.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate(returnTo, { state: scopeReturnState(returnState, data.user?.id) });
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <PageTransition className="login-page">
      <div className="login-workspace">
        <aside className="login-brief" aria-labelledby="login-brief-title">
          <Link className="login-back-link" to="/"><ArrowLeft aria-hidden="true" /> 탐색으로 돌아가기</Link>
          <div className="login-brief__copy">
            <span className="mono">PRIVATE ARCHIVE ACCESS</span>
            <h2 id="login-brief-title">탐사를 계속할 수 있도록<br />기록을 안전하게 연결합니다.</h2>
            <p>계정은 공개 활동보다 먼저, 개인 기록을 잃지 않고 이어가기 위해 사용됩니다.</p>
          </div>
          <ul className="login-benefits">
            <li><ArchiveRestore aria-hidden="true" /><span><strong>초안 복원</strong><small>현재 브라우저에 저장된 탐사 기록을 계정별로 이어갑니다.</small></span></li>
            <li><LockKeyhole aria-hidden="true" /><span><strong>기본 비공개</strong><small>기본 저장 범위는 나만 보는 개인 아카이브입니다.</small></span></li>
            <li><RadioTower aria-hidden="true" /><span><strong>선택적 연결</strong><small>직접 공개한 기록만 네트워크 신호가 됩니다.</small></span></li>
          </ul>
          <p className="login-brief__status mono"><i aria-hidden="true" /> OWNER-SCOPED DRAFT STORAGE</p>
        </aside>

      <section className="login-panel">
        <div className="login-header">
          <span>CREW AUTHENTICATION</span>
          <h1>{mode === 'signup' ? '탐사 대원 등록' : '탐사 대원 로그인'}</h1>
          <p>
            {mode === 'signup'
              ? '이메일과 비밀번호로 개인 탐사 프로필을 만듭니다.'
              : '비공개 기록과 개인정보 설정을 안전하게 이어가기 위한 계정입니다.'}
          </p>
        </div>

        {!isConfigured && (
          <aside className="login-preview-callout" role="status">
            <strong>현재 Preview는 계정 연결 전입니다.</strong>
            <p>실제 로그인에는 Supabase 환경 변수 연결과 재빌드가 필요합니다.</p>
            {canPreviewProfile && <Link to="/profile?preview=profile">내 정보 화면 검토</Link>}
          </aside>
        )}

        <form className="login-form" onSubmit={submitAuth}>
          {mode === 'signup' && (
            <label>
              <span>닉네임</span>
              <input
                name="nickname"
                onChange={updateForm}
                placeholder="예: 오비터"
                required
                maxLength={24}
                minLength={2}
                type="text"
                autoComplete="nickname"
                value={form.nickname}
              />
            </label>
          )}
          <label>
            <span>이메일</span>
            <div className="login-input">
              <Mail aria-hidden="true" />
              <input
                name="email"
                onChange={updateForm}
                placeholder="crew@example.com"
                required
                type="email"
                autoComplete="email"
                value={form.email}
              />
            </div>
          </label>
          <label>
            <span>비밀번호</span>
            <div className="login-input">
              <KeyRound aria-hidden="true" />
              <input
                minLength={6}
                name="password"
                onChange={updateForm}
                placeholder="6자 이상"
                required
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={form.password}
              />
            </div>
          </label>

          <button disabled={!isConfigured || status === 'submitting'} type="submit">
            <LogIn aria-hidden="true" />
            {status === 'submitting' ? '처리 중' : mode === 'signup' ? '계정 등록하기' : '로그인'}
          </button>
          <p className={`login-message is-${status}`}>
            {message || location.state?.notice || (mode === 'signup' ? '비밀번호는 6자 이상이어야 합니다.' : '아직 계정이 없다면 아래에서 등록하세요.')}
          </p>
        </form>

        <button
          className="login-mode-switch"
          onClick={() => {
            setMode(current => (current === 'signin' ? 'signup' : 'signin'));
            setStatus('idle');
            setMessage('');
          }}
          type="button"
        >
          {mode === 'signup' ? '이미 계정이 있어요' : '새 탐사 대원 등록'}
        </button>
      </section>
      </div>
    </PageTransition>
  );
}
