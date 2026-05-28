import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, GitBranch, LockKeyhole, LogOut, Rocket, UserRound } from 'lucide-react';
import CrewAvatar from '../components/CrewAvatar';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getActivityStats, getBadges, getMissionTree, getRank } from '../data/profileProgress';
import { supabase } from '../lib/supabaseClient';
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

export default function Profile() {
  const { isConfigured, loading, user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedMissionRoute, setSelectedMissionRoute] = useState('');

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

      if (isMounted) {
        setProfile(nextProfile);
        setNickname(nextProfile.nickname ?? fallbackNickname);
        setActivities(activityError ? [] : activityData ?? []);
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
  const missionTree = useMemo(() => getMissionTree(stats, selectedMissionRoute), [selectedMissionRoute, stats]);

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
      <header className="page-header profile-page-header">
        <h2 className="mono title-glitch"><UserRound size={20} /> 내 탐사 프로필 <span className="text-muted text-xs">/ CREW DOSSIER</span></h2>
        <button className="profile-signout" onClick={signOut} type="button"><LogOut size={15} /> 로그아웃</button>
      </header>

      <section className="profile-card panel profile-identity-card">
        <CrewAvatar seed={user?.id || user?.email || nickname} label={nickname || '탐사 대원'} />
        <div className="agent-id">
          <span className="mono text-muted text-xs">EXPLORER_CALLSIGN</span>
          <h3 className="mono text-cyan">{nickname || '탐사 대원'}</h3>
          <div className="agent-role mono"><BadgeCheck size={12} /><span>{rank.current.title}</span></div>
        </div>
        <form className="profile-nickname-form" onSubmit={saveNickname}>
          <label>
            <span className="mono text-muted text-xs">닉네임</span>
            <input onChange={event => setNickname(event.target.value)} value={nickname} />
          </label>
          <button disabled={status === 'saving'} type="submit">저장</button>
        </form>
      </section>

      <section className="class-track panel">
        <div className="class-track-header">
          <div>
            <span className="mono text-muted text-xs">EXPLORATION MILEAGE</span>
            <h3 className="mono">{rank.current.title}</h3>
          </div>
          <span className="mono class-progress">{points} MP</span>
        </div>
        <div className="class-progress-bar" style={{ '--progress': `${rank.progress}%` }}><span /></div>
        <p className="mono">{rank.next ? `다음 등급 ${rank.next.title}까지 ${rank.next.min - points} MP 남았습니다.` : '최종 등급에 도달했습니다. 이제 인간 이후의 독서 감각을 기록하세요.'}</p>
      </section>

      <section className="profile-launch-panel panel">
        <div>
          <span className="mono text-muted text-xs">MISSION START</span>
          <h3 className="mono">작품 아카이브에서 탐사 시작</h3>
          <p>작품 카드를 열고, 관심 있는 장르와 질문을 따라 다음 독서 좌표를 선택하세요.</p>
        </div>
        <a className="profile-primary-link" href="/#works-archive">
          <Rocket size={16} />
          탐사 시작
        </a>
      </section>

      <section className="mission-tree-panel panel">
        <div className="mission-tree-header">
          <div>
            <span className="mono text-muted text-xs">MISSION TREE</span>
            <h3 className="mono">대원 임무 트리</h3>
            <p>기본 훈련을 완료하면 정식 대원 임무 카드와 분기 루트가 해금됩니다.</p>
          </div>
          <strong className={`mono mission-unlock-badge ${missionTree.trainingComplete ? 'is-unlocked' : ''}`}>
            {missionTree.trainingComplete ? 'FORMAL CREW UNLOCKED' : 'BASIC TRAINING'}
          </strong>
        </div>

        <div className="mission-training-grid">
          {missionTree.training.map(mission => (
            <article className={`mission-node ${mission.complete ? 'is-complete' : ''}`} key={mission.id}>
              <div className="mission-node-icon">
                {mission.complete ? <CheckCircle2 aria-hidden="true" /> : <span />}
              </div>
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.description}</p>
                <em className="mono">{Math.min(mission.value, mission.target)} / {mission.target}</em>
                <div className="mission-progress" style={{ '--progress': `${mission.progress}%` }}><i /></div>
              </div>
            </article>
          ))}
        </div>

        <div className={`mission-route-grid ${missionTree.trainingComplete ? 'is-unlocked' : 'is-locked'}`}>
          {missionTree.routes.map(route => (
            <article className={`mission-route-card ${route.selected ? 'is-selected' : ''}`} key={route.id}>
              <div className="mission-route-top">
                <GitBranch aria-hidden="true" />
                <span className="mono">{route.unlocked ? 'ROUTE AVAILABLE' : 'LOCKED ROUTE'}</span>
              </div>
              <h4 className="mono">{route.title}</h4>
              <strong>{route.subtitle}</strong>
              <p>{route.description}</p>
              <div className="mission-route-list">
                {route.missions.map(mission => (
                  <div className={`mission-route-step ${mission.complete ? 'is-complete' : ''} ${mission.locked ? 'is-locked' : ''}`} key={mission.id}>
                    <span className="mono">{mission.locked ? <LockKeyhole size={12} aria-hidden="true" /> : `${Math.min(mission.value, mission.target)}/${mission.target}`}</span>
                    <strong>{mission.title}</strong>
                    <div className="mission-progress" style={{ '--progress': `${mission.progress}%` }}><i /></div>
                  </div>
                ))}
              </div>
              <button
                disabled={!route.unlocked}
                onClick={() => chooseMissionRoute(route.id)}
                type="button"
              >
                {route.selected ? '선택된 루트' : route.unlocked ? '이 루트 선택' : '기본 훈련 필요'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-stat-grid">
        <article className="stat-block panel"><span className="mono text-muted text-xs">POSTS</span><strong>{stats.posts}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">COMMENTS</span><strong>{stats.comments}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">REVIEWS</span><strong>{stats.reviews}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">BADGES</span><strong>{badges.filter(badge => badge.unlocked).length}</strong></article>
      </section>

      <section className="profile-badge-summary panel">
        <div>
          <span className="mono text-muted text-xs">ACHIEVEMENT BADGES</span>
          <h3 className="mono">독서 업적 배지 {badges.filter(badge => badge.unlocked).length} / {badges.length}</h3>
          <p>업적 배지는 별도 탭에서 조건과 진행률을 확인할 수 있습니다.</p>
        </div>
        <Link className="profile-secondary-link" to="/badges">배지 보관함 열기</Link>
      </section>

      <section className="profile-activity panel">
        <div className="class-track-header">
          <div>
            <span className="mono text-muted text-xs">RECENT SIGNALS</span>
            <h3 className="mono">최근 활동</h3>
          </div>
        </div>
        {activities.length > 0 ? activities.slice(0, 8).map(activity => (
          <article className="profile-activity-row" key={activity.id}>
            <span>{activityLabels[activity.action_type] || activity.action_type}</span>
            <strong>{activity.metadata?.title || activity.metadata?.work_title || activity.genre || '탐사 활동'}</strong>
            <em>+{activity.points ?? 0} MP</em>
          </article>
        )) : (
          <div className="profile-empty-state">
            <p>아직 기록된 활동이 없습니다. 커뮤니티 글, 댓글, 탐사 로그와 연결하면 마일리지가 쌓입니다.</p>
            <Link to="/questions">커뮤니티로 이동</Link>
          </div>
        )}
        {message && <p className={`profile-message is-${status}`}>{message}</p>}
      </section>
    </PageTransition>
  );
}
