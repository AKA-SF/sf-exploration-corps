import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';

export function ProfileMileagePanel({ points, rank }) {
  return (
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
  );
}

export function ProfileLaunchPanel() {
  return (
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
  );
}

export function ProfileStatsGrid({ badges, stats }) {
  return (
    <section className="profile-stat-grid">
      <article className="stat-block panel"><span className="mono text-muted text-xs">POSTS</span><strong>{stats.posts}</strong></article>
      <article className="stat-block panel"><span className="mono text-muted text-xs">COMMENTS</span><strong>{stats.comments}</strong></article>
      <article className="stat-block panel"><span className="mono text-muted text-xs">REVIEWS</span><strong>{stats.reviews}</strong></article>
      <article className="stat-block panel"><span className="mono text-muted text-xs">BADGES</span><strong>{badges.filter(badge => badge.unlocked).length}</strong></article>
    </section>
  );
}

export function ProfileBadgeSummary({ badges }) {
  return (
    <section className="profile-badge-summary panel">
      <div>
        <span className="mono text-muted text-xs">ACHIEVEMENT BADGES</span>
        <h3 className="mono">독서 업적 배지 {badges.filter(badge => badge.unlocked).length} / {badges.length}</h3>
        <p>업적 배지는 별도 탭에서 조건과 진행률을 확인할 수 있습니다.</p>
      </div>
      <Link className="profile-secondary-link" to="/badges">배지 보관함 열기</Link>
    </section>
  );
}
