import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Award, BadgeCheck, LogOut, Rocket, Shield, Sparkles, Trophy, UserRound } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { supabase } from '../lib/supabaseClient';
import './Profile.css';

const rankTable = [
  { title: '수습 대원', min: 0 },
  { title: '항해사', min: 100 },
  { title: '선임 항해사', min: 300 },
  { title: '함장', min: 700 },
  { title: '포스트휴먼', min: 1500 },
];

const badgeRules = [
  { id: 'first-signal', title: '첫 신호 수신', description: '첫 활동 기록을 남기면 획득', icon: Sparkles, condition: stats => stats.total >= 1, progress: stats => Math.min(100, stats.total * 100) },
  { id: 'archive-scribe', title: '아카이브 기록자', description: '리뷰/로그 5개 작성', icon: Award, condition: stats => stats.reviews >= 5, progress: stats => Math.min(100, (stats.reviews / 5) * 100) },
  { id: 'quantum-reader', title: '양자역학 탐서가', description: '하드 SF 관련 기록 5개', icon: Shield, condition: stats => stats.hardSf >= 5, progress: stats => Math.min(100, (stats.hardSf / 5) * 100) },
  { id: 'android-dream', title: '안드로이드의 꿈', description: '필립 K. 딕 관련 활동 3개', icon: BadgeCheck, condition: stats => stats.android >= 3, progress: stats => Math.min(100, (stats.android / 3) * 100) },
  { id: 'resistance-leader', title: '저항군 리더', description: '디스토피아 관련 활동 5개', icon: Trophy, condition: stats => stats.dystopia >= 5, progress: stats => Math.min(100, (stats.dystopia / 5) * 100) },
];

function getRank(points) {
  const current = [...rankTable].reverse().find(rank => points >= rank.min) ?? rankTable[0];
  const next = rankTable.find(rank => rank.min > points) ?? null;
  const progress = next ? ((points - current.min) / (next.min - current.min)) * 100 : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)) };
}

function getActivityStats(activities) {
  const text = activities.map(activity => [activity.action_type, activity.genre, activity.metadata?.title, activity.metadata?.work_title].filter(Boolean).join(' ')).join(' ').toLowerCase();
  return {
    total: activities.length,
    comments: activities.filter(activity => activity.action_type === 'comment').length,
    posts: activities.filter(activity => activity.action_type === 'post').length,
    reviews: activities.filter(activity => ['review', 'exploration_log'].includes(activity.action_type)).length,
    hardSf: (text.match(/하드|hard|과학|양자|물리/g) ?? []).length,
    dystopia: (text.match(/디스토피아|dystopia|감시|저항/g) ?? []).length,
    android: (text.match(/필립|philip|딕|dick|안드로이드|android/g) ?? []).length,
  };
}

export default function Profile() {
  const { isConfigured, loading, user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

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
  const badges = badgeRules.map(rule => ({ ...rule, unlocked: rule.condition(stats), progress: rule.progress(stats) }));

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

      <section className="profile-stat-grid">
        <article className="stat-block panel"><span className="mono text-muted text-xs">POSTS</span><strong>{stats.posts}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">COMMENTS</span><strong>{stats.comments}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">REVIEWS</span><strong>{stats.reviews}</strong></article>
        <article className="stat-block panel"><span className="mono text-muted text-xs">BADGES</span><strong>{badges.filter(badge => badge.unlocked).length}</strong></article>
      </section>

      <section className="profile-badge-section panel">
        <div className="class-track-header">
          <div>
            <span className="mono text-muted text-xs">ACHIEVEMENT BADGES</span>
            <h3 className="mono">독서 업적 배지</h3>
          </div>
          <Rocket className="text-cyan" size={22} />
        </div>
        <div className="profile-badge-grid">
          {badges.map(badge => {
            const Icon = badge.icon;
            return (
              <article className={`profile-badge ${badge.unlocked ? 'is-unlocked' : ''}`} key={badge.id}>
                <Icon size={22} />
                <strong>{badge.title}</strong>
                <p>{badge.description}</p>
                <div className="mission-progress" style={{ '--progress': `${badge.progress}%` }}><i /></div>
              </article>
            );
          })}
        </div>
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
            <span>{activity.action_type}</span>
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
