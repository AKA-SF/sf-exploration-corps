import { Navigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import ProfileActivityPanel from './profile/ProfileActivityPanel';
import ProfileCyberIdCard from './profile/ProfileCyberIdCard';
import ProfileHubPanel from './profile/ProfileHubPanel';
import ProfileIdentityCard from './profile/ProfileIdentityCard';
import ProfileMissionTree from './profile/ProfileMissionTree';
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

export default function Profile() {
  const { isConfigured, loading, user, signOut } = useAuth();
  const {
    activities,
    chooseMissionRoute,
    message,
    nickname,
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
              <ProfileCyberIdCard
                nickname={nickname}
                points={points}
                rank={rank}
                stats={stats}
                tasteProfile={latestTasteProfile}
                unlockedBadges={unlockedBadges}
                user={user}
              />
            )}
            nickname={nickname}
            rank={rank}
            user={user}
          />

          <ProfileHubPanel
            dailyLoginReceived={dailyLoginReceived}
            nextMission={nextMission}
            points={points}
            rank={rank}
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
            workStatusLabels={workStatusLabels}
          />
          <ProfileBadgeSummary badges={badges} />
          <ProfileActivityPanel
            activities={activities}
            activityLabels={activityLabels}
            activitySummary={activitySummary}
            activityTitle={activityTitle}
            message={message}
            status={status}
          />
        </div>
      </div>
    </PageTransition>
  );
}
