import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Award, BadgeCheck, Orbit, Shield, Sparkles, Trophy } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getActivityStats, getBadges, mergeManualBadges } from '../data/profileProgress';
import { supabase } from '../lib/supabaseClient';
import './Profile.css';

const iconMap = {
  award: Award,
  badge: BadgeCheck,
  orbit: Orbit,
  shield: Shield,
  sparkles: Sparkles,
  trophy: Trophy,
};

export default function Badges() {
  const { isConfigured, loading, user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [workStatuses, setWorkStatuses] = useState([]);
  const [manualBadges, setManualBadges] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;

    async function loadActivities() {
      setStatus('loading');
      const [
        { data, error },
        { data: statusData, error: statusError },
        { data: badgeData, error: badgeError },
      ] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('work_statuses')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('user_badges')
          .select('badge_id,awarded_at,badges(title,description)')
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false }),
      ]);

      if (!isMounted) return;
      setActivities(error ? [] : data ?? []);
      setWorkStatuses(statusError ? [] : statusData ?? []);
      setManualBadges(badgeError ? [] : badgeData ?? []);
      setStatus(error ? 'error' : 'ready');
      setMessage(error ? error.message : '');
    }

    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const stats = useMemo(() => getActivityStats(activities, workStatuses), [activities, workStatuses]);
  const badges = mergeManualBadges(getBadges(stats), manualBadges);
  const unlockedCount = badges.filter(badge => badge.unlocked).length;

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
    <PageTransition className="profile-container badges-page">
      <header className="page-header profile-page-header">
        <h2 className="mono title-glitch">
          <Trophy size={20} /> 독서 업적 배지 <span className="text-muted text-xs">/ ACHIEVEMENT VAULT</span>
        </h2>
        <Link className="profile-signout" to="/profile">프로필로 돌아가기</Link>
      </header>

      <section className="profile-badge-hero panel">
        <div>
          <span className="mono text-muted text-xs">BADGE STATUS</span>
          <h3 className="mono">{unlockedCount} / {badges.length} UNLOCKED</h3>
          <p>글, 댓글, 탐사 로그가 쌓일수록 배지가 열립니다. 아직 연결되지 않은 활동도 이 보관함을 기준으로 이어 붙이면 됩니다.</p>
        </div>
      </section>

      <section className="profile-badge-section panel">
        <div className="profile-badge-grid is-vault">
          {badges.map(badge => {
            const Icon = iconMap[badge.icon] ?? Sparkles;
            return (
              <article className={`profile-badge ${badge.unlocked ? 'is-unlocked' : ''}`} key={badge.id}>
                <Icon size={26} />
                <strong>{badge.title}</strong>
                <p>{badge.description}</p>
                <div className="mission-progress" style={{ '--progress': `${badge.progress}%` }}><i /></div>
                <span className="mono badge-progress-label">{Math.round(badge.progress)}%</span>
              </article>
            );
          })}
        </div>
        {status === 'error' && <p className="profile-message is-error">{message}</p>}
      </section>
    </PageTransition>
  );
}
