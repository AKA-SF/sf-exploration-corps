import { KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../PageTransition';
import './AdminAccessBoundary.css';

export default function AdminAccessPrompt({
  busy,
  message,
  onPasswordChange,
  onSubmit,
  password,
  retryAfter = 0,
}) {
  return (
    <PageTransition className="admin-access-page">
      <section className="admin-access-card panel">
        <div className="admin-access-mark" aria-hidden="true"><KeyRound /></div>
        <span className="mono">ADMIN ACCESS</span>
        <h1>관리자 접속</h1>
        <p>관리자 계정 확인을 마쳤습니다. 별도 접속 비밀번호를 입력해 주세요.</p>
        <form className="admin-access-form" onSubmit={onSubmit}>
          <label htmlFor="admin-access-password">접속 비밀번호</label>
          <input
            autoComplete="current-password"
            autoFocus
            id="admin-access-password"
            maxLength={128}
            onChange={event => onPasswordChange(event.target.value)}
            required
            type="password"
            value={password}
          />
          {message && <p className="admin-access-error" role="alert">{message}</p>}
          {retryAfter > 0 && <span className="admin-access-retry">약 {retryAfter}초 후 다시 시도할 수 있습니다.</span>}
          <button className="admin-access-submit" disabled={busy} type="submit">
            {busy ? '확인 중…' : '대시보드 열기'}
          </button>
        </form>
        <Link to="/">홈으로 돌아가기</Link>
      </section>
    </PageTransition>
  );
}
