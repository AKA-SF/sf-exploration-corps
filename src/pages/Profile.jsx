import { lazy, Suspense, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Inbox, LayoutDashboard, LogOut, Medal, PenLine, UserRound } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { readExplorationDraft } from '../features/exploration-logs/explorationDraftStorage';
import ProfileActivityPanel from './profile/ProfileActivityPanel';
import ProfileHubPanel from './profile/ProfileHubPanel';
import ProfileIdentityCard from './profile/ProfileIdentityCard';
import ProfileMissionTree from './profile/ProfileMissionTree';
import ProfileMessagesPanel from './profile/ProfileMessagesPanel';
import ProfileOnboardingPanel from './profile/ProfileOnboardingPanel';
import { activityLabels, workStatusLabels } from './profile/profileLabels';
import { activityTitle } from './profile/profileDataUtils';
import {
  ProfileBadgeSummary,
  ProfileLaunchPanel,
  ProfileMileagePanel,
  ProfileStatsGrid,
} from './profile/ProfileOverviewPanels';
import ProfileReadingPanel from './profile/ProfileReadingPanel';
import { useProfileData } from './profile/hooks/useProfileData';
import './Profile.css';
import '../styles/MobileExperience.css';

const ProfileCyberIdCard = lazy(() => import('./profile/ProfileCyberIdCard'));
const PROFILE_TABS = [
  { id: 'overview', icon: LayoutDashboard, label: '개요' },
  { id: 'records', icon: BookOpen, label: '내 기록' },
  { id: 'progress', icon: Medal, label: '진행' },
  { id: 'inbox', icon: Inbox, label: '수신함' },
];
const PROFILE_TAB_IDS = new Set(PROFILE_TABS.map(tab => tab.id));


function ProfileCyberIdFallback() {
  return (
    <button className="profile-cyber-id-tab" type="button" disabled>
      <span className="mono">CYBER ID</span>
      <strong>ID 카드 준비 중</strong>
    </button>
  );
}

export default function Profile() {
  const { isConfigured, loading, user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = PROFILE_TAB_IDS.has(requestedTab) ? requestedTab : 'overview';
  const draft = useMemo(
    () => loading ? {} : readExplorationDraft(user?.id),
    [loading, user?.id],
  );
  const hasDraft = Boolean(draft?.title || draft?.type || draft?.memo);
  const {
    activities,
    chooseMissionRoute,
    message,
    networkSignals,
    nickname,
    profile,
    status,
    viewModel,
    workStatuses,
  } = useProfileData(user, activeTab);

  const {
    activitySummary,
    badges,
    dailyLoginReceived,
    latestTasteProfile,
    latestWorkStatus,
    missionTree,
    nextMission,
    points,
    rank,
    stats,
    statusCounts,
    unlockedBadges,
  } = viewModel;

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (!isConfigured) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <div className="profile-card panel">
          <h2 className="mono">Supabase 연결 필요</h2>
          <p>프로필과 개인 기록을 사용하려면 Supabase 연결이 필요합니다.</p>
        </div>
      </PageTransition>
    );
  }

  if (user && status === 'loading' && !profile) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <div className="profile-card panel" role="status" aria-live="polite">
          <h2 className="mono">내 탐사 기록 동기화 중</h2>
          <p>대원 정보와 최근 탐사 신호를 불러오고 있습니다.</p>
        </div>
      </PageTransition>
    );
  }

  if (user && status === 'error' && !profile) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <div className="profile-card panel" role="alert">
          <h2 className="mono">프로필 연결 오류</h2>
          <p>{message || 'Supabase 프로필 정보를 불러오지 못했습니다.'}</p>
        </div>
      </PageTransition>
    );
  }

  const selectTab = tabId => {
    const next = new URLSearchParams(searchParams);
    if (tabId === 'overview') next.delete('tab');
    else next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  return (
    <PageTransition className="profile-container profile-v2">
      <header className="profile-v2-header">
        <div>
          <span className="mono">개인 아카이브 · PERSONAL ARCHIVE</span>
          <h1><UserRound aria-hidden="true" /> 내 탐사 기록</h1>
          <p>최근 기록을 이어가고, 나의 탐사 진행과 수신 신호를 확인합니다.</p>
        </div>
        <button className="profile-signout" onClick={signOut} type="button"><LogOut size={15} /> 로그아웃</button>
      </header>

      <div className="profile-v2-workspace">
        <aside className="profile-v2-rail">
          <nav className="profile-tab-list" aria-label="내 정보 메뉴" role="tablist">
            {PROFILE_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  aria-controls={`profile-panel-${tab.id}`}
                  aria-selected={isActive}
                  className={isActive ? 'is-active' : ''}
                  id={`profile-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="profile-v2-identity">
          <ProfileIdentityCard
            actionSlot={(
              <Suspense fallback={<ProfileCyberIdFallback />}>
                <ProfileCyberIdCard
                  nickname={nickname}
                  points={points}
                  publicCode={profile?.public_code}
                  rank={rank}
                  stats={stats}
                  tasteProfile={latestTasteProfile}
                  unlockedBadges={unlockedBadges}
                  user={user}
                />
              </Suspense>
            )}
            nickname={nickname}
            rank={rank}
            user={user}
          />
          <div className="profile-v2-quick panel">
            <span className="mono">다음 행동 · NEXT ACTION</span>
            <strong>{hasDraft ? '작성 중인 탐사 기록' : nextMission?.title || '새 작품 탐사'}</strong>
            <p>{hasDraft ? draft.title || '제목을 정하지 않은 기록' : nextMission?.description || '다음 작품을 발견하고 기록을 남겨보세요.'}</p>
            <Link to={hasDraft ? '/log' : '/works/novels'}>{hasDraft ? '기록 이어가기' : '작품 발견하기'}</Link>
          </div>
          </div>
        </aside>

        <div className="profile-v2-content">
          {activeTab === 'overview' && (
            <section aria-labelledby="profile-tab-overview" id="profile-panel-overview" role="tabpanel">
              {hasDraft && (
                <Link className="profile-resume-card panel" to="/log">
                  <PenLine aria-hidden="true" />
                  <div><span className="mono">DRAFT SIGNAL</span><strong>{draft.title || '작성 중인 탐사 기록'}</strong><p>저장된 지점부터 기록을 이어갑니다.</p></div>
                  <b>이어가기</b>
                </Link>
              )}
              <ProfileOnboardingPanel latestTasteProfile={latestTasteProfile} stats={stats} workStatuses={workStatuses} />
              <ProfileHubPanel
                activitySummary={activitySummary}
                dailyLoginReceived={dailyLoginReceived}
                latestWorkStatus={latestWorkStatus}
                nextMission={nextMission}
                points={points}
                rank={rank}
                stats={stats}
                unlockedBadges={unlockedBadges}
                workStatuses={workStatuses}
              />
              <section className="profile-v2-recent panel">
                <div><span className="mono">RECENT ACTIVITY</span><h2>최근 탐사 활동</h2></div>
                {activities.slice(0, 3).length > 0 ? activities.slice(0, 3).map(activity => (
                  <article key={activity.id}><span>{activityLabels[activity.action_type] || '탐사 활동'}</span><strong>{activityTitle(activity)}</strong><em>+{activity.points ?? 0} MP</em></article>
                )) : <p>아직 기록된 탐사 활동이 없습니다.</p>}
              </section>
            </section>
          )}

          {activeTab === 'records' && (
            <section aria-labelledby="profile-tab-records" id="profile-panel-records" role="tabpanel">
              <ProfileLaunchPanel />
              <ProfileReadingPanel latestWorkStatus={latestWorkStatus} statusCounts={statusCounts} workStatuses={workStatuses} workStatusLabels={workStatusLabels} />
              <Link className="profile-record-cta panel" to="/log"><PenLine aria-hidden="true" /><div><strong>새 탐사 기록 남기기</strong><p>작품에서 받은 감정과 아이디어를 개인 아카이브에 저장합니다.</p></div></Link>
            </section>
          )}

          {activeTab === 'progress' && (
            <section aria-labelledby="profile-tab-progress" id="profile-panel-progress" role="tabpanel">
              <ProfileMileagePanel points={points} rank={rank} />
              <ProfileMissionTree missionTree={missionTree} onChooseRoute={chooseMissionRoute} />
              <ProfileStatsGrid badges={badges} stats={stats} />
              <ProfileBadgeSummary badges={badges} />
            </section>
          )}

          {activeTab === 'inbox' && (
            <section aria-labelledby="profile-tab-inbox" id="profile-panel-inbox" role="tabpanel">
              <ProfileMessagesPanel profile={profile} user={user} />
              <ProfileActivityPanel activities={activities} activityLabels={activityLabels} activitySummary={activitySummary} activityTitle={activityTitle} message={message} networkSignals={networkSignals} status={status} />
            </section>
          )}
        </div>
      </div>
    </PageTransition>
  );
}