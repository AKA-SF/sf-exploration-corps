import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, Mail } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { supabase } from '../lib/supabaseClient';
import { ensureUserProfile, normalizeEmail, normalizeNickname } from '../lib/userIdentity';
import './Login.css';
import '../styles/MobileExperience.css';

export default function Login() {
  const navigate = useNavigate();
  const { isConfigured, loading, user } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  if (!loading && user) return <Navigate to="/profile" replace />;

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
          navigate('/profile');
          return;
        }
        setStatus('success');
        setMessage('등록 요청이 완료되었습니다. Supabase 이메일 확인 설정이 켜져 있다면 메일함에서 확인 링크를 눌러주세요.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/profile');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <PageTransition className="login-page">
      <section className="login-panel">
        <div className="login-header">
          <span>CREW AUTHENTICATION</span>
          <h1>{mode === 'signup' ? '탐사 대원 등록' : '탐사 대원 로그인'}</h1>
          <p>
            {mode === 'signup'
              ? '이메일과 비밀번호로 개인 탐사 프로필을 만듭니다.'
              : '개인 탐사 프로필, 마일리지, 배지를 저장하기 위한 계정입니다.'}
          </p>
        </div>

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

          <button disabled={status === 'submitting'} type="submit">
            <LogIn aria-hidden="true" />
            {status === 'submitting' ? '처리 중' : mode === 'signup' ? '계정 등록하기' : '로그인'}
          </button>
          <p className={`login-message is-${status}`}>
            {message || (mode === 'signup' ? '비밀번호는 6자 이상이어야 합니다.' : '아직 계정이 없다면 아래에서 등록하세요.')}
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
    </PageTransition>
  );
}
