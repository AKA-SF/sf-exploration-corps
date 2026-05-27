import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, Mail } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

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
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              nickname: form.nickname || form.email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        setStatus('success');
        setMessage('가입 메일을 확인해주세요. 확인 후 로그인할 수 있습니다.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
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
            개인 탐사 프로필, 마일리지, 배지를 저장하기 위한 계정입니다.
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
                type="text"
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
                value={form.password}
              />
            </div>
          </label>

          <button disabled={status === 'submitting'} type="submit">
            <LogIn aria-hidden="true" />
            {status === 'submitting' ? '접속 중' : mode === 'signup' ? '등록하기' : '로그인'}
          </button>
          <p className={`login-message is-${status}`}>
            {message || (mode === 'signup' ? '가입 후 이메일 확인이 필요할 수 있습니다.' : '아직 계정이 없다면 아래에서 등록하세요.')}
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
