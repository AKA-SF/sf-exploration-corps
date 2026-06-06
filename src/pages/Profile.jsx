import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
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
  } = useProfileData(user);

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
          <p>VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경 변수를 먼저 설정해주세요.</p>
        </div>
      </PageTransition>
    );
  }

  if (user && status === 'loading' && !profile) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <div className="profile-card panel">
          <h2 className="mono">프로필 동기화 중</h2>
          <p>관리자 등급, MP, 배지 정보를 불러오고 있습니다.</p>
        </div>
      </PageTransition>
    );
  }

  if (user && status === 'error' && !profile) {
    return (
      <PageTransition className="profile-container profile-auth-state">
        <div className="profile-card panel">
          <h2 className="mono">프로필 연결 오류</h2>
          <p>{message || 'Supabase 프로필 정보를 불러오지 못했습니다.'}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="profile-container">
      <div className="personal-terminal">
        <div className="terminal-topbar" aria-hidden="true">
          <span className="mono">PERSONAL TERMINAL</span>
          <div>
            <i />
            <i />
            <i />
          </div>
          <span className="mono">CREW LINK ACTIVE</span>
        </div>
        <div className="terminal-screen">
          <header className="page-header profile-page-header">
            <h2 className="mono title-glitch profile-page-title"><UserRound size={20} /> <span>내 탐사 프로필</span> <span className="text-muted text-xs">/ CREW DOSSIER</span></h2>
            <button className="profile-signout" onClick={signOut} type="button"><LogOut size={15} /> 로그아웃</button>
          </header>

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

          <ProfileOnboardingPanel
            latestTasteProfile={latestTasteProfile}
            stats={stats}
            workStatuses={workStatuses}
          />

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

          <ProfileMileagePanel points={points} rank={rank} />
          <ProfileLaunchPanel />
          <ProfileMissionTree missionTree={missionTree} onChooseRoute={chooseMissionRoute} />
          <ProfileStatsGrid badges={badges} stats={stats} />
          <ProfileReadingPanel
            latestWorkStatus={latestWorkStatus}
            statusCounts={statusCounts}
            workStatuses={workStatuses}
            workStatusLabels={workStatusLabels}
          />
          <ProfileMessagesPanel profile={profile} user={user} />
          <ProfileBadgeSummary badges={badges} />
          <ProfileActivityPanel
            activities={activities}
            activityLabels={activityLabels}
            activitySummary={activitySummary}
            activityTitle={activityTitle}
            message={message}
            networkSignals={networkSignals}
            status={status}
          />
        </div>
      </div>
    </PageTransition>
  );
}
