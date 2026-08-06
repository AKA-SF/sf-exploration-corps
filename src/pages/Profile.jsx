import { useMemo, useState } from 'react';
import { ArrowRight, Inbox, LockKeyhole, LogOut, PenLine, UserRound } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { readExplorationDraft } from '../features/exploration-logs/explorationDraftStorage';
import AccountSettingsPanel from './profile/AccountSettingsPanel';
import { useOwnExplorationLogs } from './profile/hooks/useOwnExplorationLogs';
import './Profile.css';
import '../styles/MobileExperience.css';

function formatRecordDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getAccountName(user) {
  return user?.user_metadata?.nickname
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || '탐사 대원';
}

function isLocalProfilePreview() {
  if (typeof window === 'undefined') return false;
  const localHosts = new Set(['localhost', '127.0.0.1']);
  const preview = new URLSearchParams(window.location.search).get('preview');
  return localHosts.has(window.location.hostname) && preview === 'profile';
}

export default function Profile() {
  const { isConfigured, loading, signOut, user } = useAuth();
  const isPreview = isLocalProfilePreview();
  const [nameOverride, setNameOverride] = useState(null);
  const draft = useMemo(
    () => isPreview || loading ? {} : readExplorationDraft(user?.id),
    [isPreview, loading, user?.id],
  );
  const hasDraft = Boolean(draft?.title || draft?.memo);
  const { error, logs, status } = useOwnExplorationLogs(isPreview ? null : user);
  const visibleLogs = isPreview ? [] : logs;
  const visibleStatus = isPreview ? 'ready' : status;
  const displayName = isPreview
    ? '프리뷰 탐사자'
    : nameOverride?.userId === user?.id
      ? nameOverride.nickname
      : getAccountName(user);

  if (!isPreview && !loading && !user) return <Navigate to="/login" replace />;

  if (!isPreview && !isConfigured) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <section className="profile-card panel">
          <h2>개인 기록 연결이 필요합니다</h2>
          <p>내 정보와 비공개 기록을 사용하려면 Supabase 연결이 필요합니다.</p>
        </section>
      </PageTransition>
    );
  }

  if (!isPreview && loading) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <section className="profile-card panel" role="status">계정 정보를 확인하고 있습니다.</section>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="profile-container profile-home">
      {isPreview && (
        <aside className="profile-preview-notice" role="status">
          <strong>로컬 화면 검토 모드</strong>
          <p>레이아웃 확인을 위한 빈 상태입니다. 실제 계정과 실제 개인 기록은 표시하지 않습니다.</p>
        </aside>
      )}
      <header className="profile-home-header">
        <div>
          <span className="mono">PERSONAL ARCHIVE</span>
          <h1><UserRound aria-hidden="true" /> 내 정보</h1>
          <p>{displayName}님의 기록과 개인정보 설정을 한곳에서 확인합니다.</p>
        </div>
        {!isPreview && (
          <button className="profile-signout" onClick={signOut} type="button">
            <LogOut aria-hidden="true" size={16} /> 로그아웃
          </button>
        )}
      </header>

      <main className="profile-home-grid">
        <section className="profile-home-section profile-draft-section panel" aria-labelledby="profile-draft-title">
          <div className="profile-section-heading">
            <span className="profile-section-icon"><PenLine aria-hidden="true" /></span>
            <div><span className="mono">DRAFT</span><h2 id="profile-draft-title">작성 중인 기록</h2></div>
          </div>
          {hasDraft ? (
            <Link className="profile-primary-card" to="/log">
              <div>
                <strong>{draft.title || '제목을 정하지 않은 기록'}</strong>
                <p>{draft.memo || '저장된 지점부터 감상을 이어서 작성합니다.'}</p>
              </div>
              <span>이어가기 <ArrowRight aria-hidden="true" /></span>
            </Link>
          ) : (
            <div className="profile-empty-action">
              <p>작성 중인 기록이 없습니다. 작품과 한 줄 감상만으로 시작할 수 있습니다.</p>
              <Link to="/log">새 기록 쓰기</Link>
            </div>
          )}
        </section>

        <section className="profile-home-section profile-records-section panel" aria-labelledby="profile-records-title">
          <div className="profile-section-heading">
            <span className="profile-section-icon"><LockKeyhole aria-hidden="true" /></span>
            <div><span className="mono">PRIVATE RECORDS</span><h2 id="profile-records-title">최근 기록</h2></div>
          </div>
          {visibleStatus === 'loading' && <p className="profile-state" role="status">최근 기록을 불러오고 있습니다.</p>}
          {visibleStatus === 'error' && <p className="profile-state" role="alert">{error}</p>}
          {visibleStatus === 'ready' && visibleLogs.length === 0 && (
            <div className="profile-empty-action"><p>아직 저장한 기록이 없습니다.</p><Link to="/log">첫 기록 남기기</Link></div>
          )}
          {visibleLogs.length > 0 && (
            <div className="profile-record-list">
              {visibleLogs.map(log => (
                <Link key={log.id} to={`/result/${log.id}`}>
                  <div><strong>{log.title}</strong><p>{log.memo}</p></div>
                  <time dateTime={log.createdAt}>{formatRecordDate(log.createdAt)}</time>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="profile-home-section panel" aria-labelledby="profile-replies-title">
          <div className="profile-section-heading">
            <span className="profile-section-icon"><Inbox aria-hidden="true" /></span>
            <div><span className="mono">REPLIES</span><h2 id="profile-replies-title">받은 답신</h2></div>
          </div>
          <div className="profile-quiet-state">
            <strong>아직 표시할 답신이 없습니다.</strong>
            <p>내 공개 신호에 답신이 도착하면 원문과 함께 이곳에서 확인할 수 있습니다.</p>
          </div>
        </section>

        <section className="profile-home-section panel" aria-labelledby="profile-account-title">
          <div className="profile-section-heading">
            <span className="profile-section-icon"><UserRound aria-hidden="true" /></span>
            <div><span className="mono">ACCOUNT</span><h2 id="profile-account-title">계정과 개인정보</h2></div>
          </div>
          <AccountSettingsPanel
            isPreview={isPreview}
            key={isPreview ? 'preview' : user?.id}
            onNicknameChange={nickname => setNameOverride({ nickname, userId: user?.id })}
            user={user}
          />
        </section>
      </main>
    </PageTransition>
  );
}