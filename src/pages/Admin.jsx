import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  KeyRound,
  LockKeyhole,
  RadioTower,
  Sparkles,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAdminAccess } from '../context/adminAccessContext';
import './Admin.css';

const emptyPasswordForm = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
};

export default function Admin() {
  const { changePassword, lock } = useAdminAccess();
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [securityStatus, setSecurityStatus] = useState('idle');
  const [securityMessage, setSecurityMessage] = useState('');

  function updatePasswordField(key, value) {
    setPasswordForm(current => ({ ...current, [key]: value }));
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setSecurityMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityStatus('error');
      setSecurityMessage('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSecurityStatus('saving');
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setSecurityStatus('saved');
      setSecurityMessage('접속 비밀번호를 변경했습니다. 기존 접속 세션은 더 이상 사용할 수 없습니다.');
    } catch (error) {
      setSecurityStatus('error');
      setSecurityMessage(error.message || '접속 비밀번호를 변경하지 못했습니다.');
    }
  }

  return (
    <PageTransition className="admin-page admin-hub">
      <header className="admin-header panel">
        <div>
          <span className="mono">QUIET OBSERVATORY · ADMIN</span>
          <h1>관리자 관측실</h1>
          <p>지금 실제로 운영하는 콘텐츠 작업만 남겼습니다. 초안은 여기서 검토하고, 공개는 마지막 확인 뒤에만 진행합니다.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="admin-header-link" to="/discover">공개 화면</Link>
          <Link className="admin-header-link" to="/">홈으로</Link>
        </div>
      </header>

      <main className="admin-hub-layout">
        <section className="admin-hub-main" aria-labelledby="admin-operations-title">
          <div className="admin-hub-heading">
            <span className="mono">ACTIVE OPERATIONS</span>
            <h2 id="admin-operations-title">운영 작업</h2>
          </div>

          <Link className="admin-operation-card is-primary panel" to="/admin/discoveries">
            <div className="admin-operation-icon" aria-hidden="true"><BookOpenCheck /></div>
            <div className="admin-operation-copy">
              <div className="admin-operation-meta"><span>핵심 기능</span><i>운영 중</i></div>
              <h3>신작 정보 관리</h3>
              <p>신작, 공개 예정작, 편집 추천을 초안부터 검수·발행까지 한곳에서 관리합니다.</p>
              <ul aria-label="지원하는 정보 유형">
                <li>신작</li>
                <li>공개 예정</li>
                <li>편집 추천</li>
              </ul>
            </div>
            <ArrowUpRight className="admin-operation-arrow" aria-hidden="true" />
          </Link>

          <article className="admin-automation-note panel">
            <div className="admin-operation-icon" aria-hidden="true"><Sparkles /></div>
            <div>
              <span className="mono">NEXT CONNECTION</span>
              <h3>자동화 후보 입력</h3>
              <p>향후 조사·서지·출판 일정 자동화는 새 글을 바로 공개하지 않고, 검토할 초안 후보만 이 작업함으로 전달합니다.</p>
            </div>
          </article>

          <article className="admin-principles panel">
            <div className="admin-operation-icon" aria-hidden="true"><RadioTower /></div>
            <div>
              <span className="mono">OPERATING RULE</span>
              <h3>가벼운 운영 원칙</h3>
              <ol>
                <li><strong>먼저 저장</strong><span>새 정보는 항상 비공개 초안으로 시작합니다.</span></li>
                <li><strong>직접 검수</strong><span>출처·표지 권리·공개일을 확인합니다.</span></li>
                <li><strong>마지막 발행</strong><span>저장된 최신 상태만 사용자가 직접 공개합니다.</span></li>
              </ol>
            </div>
          </article>
        </section>

        <aside className="admin-security panel" aria-labelledby="admin-security-title">
          <div className="admin-security-heading">
            <div className="admin-operation-icon" aria-hidden="true"><KeyRound /></div>
            <div>
              <span className="mono">ACCESS SECURITY</span>
              <h2 id="admin-security-title">접속 보안</h2>
            </div>
          </div>
          <p>관리자 계정 로그인과 별도로 접속 세션을 보호합니다.</p>

          <details className="admin-security-disclosure">
            <summary>접속 비밀번호 변경</summary>
            <div className="admin-security-disclosure__body">
              <p>새 비밀번호는 8자 이상으로 설정해 주세요.</p>
              <form className="admin-security-form" onSubmit={submitPasswordChange}>
                <label>
                  <span>현재 비밀번호</span>
                  <input
                    autoComplete="current-password"
                    maxLength={128}
                    onChange={event => updatePasswordField('currentPassword', event.target.value)}
                    required
                    type="password"
                    value={passwordForm.currentPassword}
                  />
                </label>
                <label>
                  <span>새 비밀번호</span>
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    onChange={event => updatePasswordField('newPassword', event.target.value)}
                    required
                    type="password"
                    value={passwordForm.newPassword}
                  />
                </label>
                <label>
                  <span>새 비밀번호 확인</span>
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    onChange={event => updatePasswordField('confirmPassword', event.target.value)}
                    required
                    type="password"
                    value={passwordForm.confirmPassword}
                  />
                </label>
                {securityMessage && (
                  <p className={`admin-security-message is-${securityStatus}`} role={securityStatus === 'error' ? 'alert' : 'status'}>
                    {securityMessage}
                  </p>
                )}
                <button disabled={securityStatus === 'saving'} type="submit">
                  {securityStatus === 'saving' ? '변경 중…' : '비밀번호 변경'}
                </button>
              </form>
            </div>
          </details>

          <div className="admin-security-divider" />
          <button className="admin-lock-button" onClick={() => void lock()} type="button">
            <LockKeyhole aria-hidden="true" /> 관리자 화면 잠그기
          </button>
          <small>공용 기기에서는 작업을 마친 뒤 화면을 잠가 주세요.</small>
        </aside>
      </main>
    </PageTransition>
  );
}