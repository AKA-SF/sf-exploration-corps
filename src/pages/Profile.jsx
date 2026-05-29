import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getActivityStats, getBadges, getMissionTree, getRank } from '../data/profileProgress';
import { supabase } from '../lib/supabaseClient';
import ProfileActivityPanel from './profile/ProfileActivityPanel';
import ProfileHubPanel from './profile/ProfileHubPanel';
import ProfileIdentityCard from './profile/ProfileIdentityCard';
import ProfileMissionTree from './profile/ProfileMissionTree';
import {
  ProfileBadgeSummary,
  ProfileLaunchPanel,
  ProfileMileagePanel,
  ProfileStatsGrid,
} from './profile/ProfileOverviewPanels';
import ProfileReadingPanel from './profile/ProfileReadingPanel';
import './Profile.css';

const activityLabels = {
  comment: '댓글',
  concept_read: '개념 읽기',
  daily_login: '일일 접속',
  exploration_log: '탐사 로그',
  media_visit: '미디어 방문',
  post: '게시글',
  review: '리뷰',
  taste_test: '성향 테스트',
};

const workStatusLabels = {
  want: '읽고 싶어요',
  reading: '읽는 중',
  done: '읽었어요',
};

function activityTitle(activity) {
  return activity.metadata?.title
    || activity.metadata?.work_title
    || activity.metadata?.node
    || activity.genre
    || '탐사 활동';
}

export default function Profile() {
  const { isConfigured, loading, user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedMissionRoute, setSelectedMissionRoute] = useState('');
  const [workStatuses, setWorkStatuses] = useState([]);

  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      const fallbackNickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐사 대원';
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        if (isMounted) {
          setStatus('error');
          setMessage(profileError.message);
        }
        return;
      }

      let nextProfile = profileData;
      if (!nextProfile) {
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: user.id, nickname: fallbackNickname })
          .select('*')
          .single();
        if (createError) {
          if (isMounted) {
            setStatus('error');
            setMessage(createError.message);
          }
          return;
        }
        nextProfile = createdProfile;
      }

      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const localWorkStatuses = JSON.parse(localStorage.getItem(`sf-work-statuses:${user.id}`) || '{}');
      const { data: statusData, error: statusError } = await supabase
        .from('work_statuses')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (isMounted) {
        setProfile(nextProfile);
        setNickname(nextProfile.nickname ?? fallbackNickname);
        setActivities(activityError ? [] : activityData ?? []);
        setWorkStatuses(statusError
          ? Object.entries(localWorkStatuses).map(([workCode, readStatus]) => ({
              work_code: workCode,
              work_title: workCode,
              status: readStatus,
            }))
          : statusData ?? []);
        setSelectedMissionRoute(localStorage.getItem(`sf-selected-mission-route:${user.id}`) || '');
        setStatus(activityError ? 'partial' : 'ready');
        setMessage(activityError ? activityError.message : '');
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const points = profile?.mileage ?? activities.reduce((sum, activity) => sum + (activity.points ?? 0), 0);
  const rank = getRank(points);
  const stats = useMemo(() => getActivityStats(activities), [activities]);
  const badges = getBadges(stats);
  const missionTree = getMissionTree(stats, selectedMissionRoute);
  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const todayKey = new Date().toLocaleDateString('sv-SE');
  const dailyLoginReceived = activities.some(activity => (
    activity.action_type === 'daily_login'
    && new Date(activity.created_at).toLocaleDateString('sv-SE') === todayKey
  ));
  const nextMission = missionTree.training.find(mission => !mission.complete)
    || missionTree.selectedRoute?.missions.find(mission => !mission.complete)
    || missionTree.routes.find(route => route.unlocked)?.missions.find(mission => !mission.complete)
    || null;
  const statusCounts = workStatuses.reduce((result, item) => ({
    ...result,
    [item.status]: (result[item.status] ?? 0) + 1,
  }), {});
  const latestWorkStatus = workStatuses[0] ?? null;
  const activitySummary = {
    posts: activities.filter(activity => activity.action_type === 'post').slice(0, 3),
    comments: activities.filter(activity => activity.action_type === 'comment').slice(0, 3),
    badges: unlockedBadges.slice(0, 3),
    missions: [
      ...missionTree.training,
      ...(missionTree.selectedRoute?.missions ?? []),
    ].filter(mission => !mission.complete).slice(0, 3),
  };

  if (!loading && !user) return <Navigate to="/login" replace />;

  const saveNickname = async event => {
    event.preventDefault();
    if (!user || !supabase) return;
    setStatus('saving');
    const { data, error } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setProfile(data);
    setStatus('ready');
    setMessage('프로필이 저장되었습니다.');
  };

  const chooseMissionRoute = routeId => {
    if (!missionTree.trainingComplete) return;
    setSelectedMissionRoute(routeId);
    if (user) localStorage.setItem(`sf-selected-mission-route:${user.id}`, routeId);
  };

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
            nickname={nickname}
            onNicknameChange={setNickname}
            onSaveNickname={saveNickname}
            rank={rank}
            status={status}
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
