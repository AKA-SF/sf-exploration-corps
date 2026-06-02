import { Link } from 'react-router-dom';
import { BadgeCheck, BookMarked, RadioTower, Route } from 'lucide-react';

export default function ProfileHubPanel({
  activitySummary,
  dailyLoginReceived,
  latestWorkStatus,
  nextMission,
  points,
  rank,
  stats,
  unlockedBadges,
  workStatuses,
}) {
  const nextLevelText = rank.next ? `${rank.next.title}까지 ${rank.next.min - points} MP` : '최종 등급 도달';
  const dashboardItems = [
    {
      detail: dailyLoginReceived ? '+5 MP 접속 보너스 수신 완료' : '오늘 접속 신호 확인 중',
      icon: RadioTower,
      label: 'TODAY',
      value: `${points} MP`,
    },
    {
      detail: nextLevelText,
      icon: Route,
      label: 'NEXT LEVEL',
      value: rank.current.title,
    },
    {
      detail: nextMission?.description ?? '기본 임무가 안정적으로 진행 중입니다.',
      icon: BadgeCheck,
      label: 'NEXT MISSION',
      value: nextMission?.title ?? '모든 기본 임무 완료',
    },
    {
      detail: latestWorkStatus?.work_title ?? `${workStatuses.length}개 작품 상태 저장`,
      icon: BookMarked,
      label: 'READING LOG',
      value: `${workStatuses.length} 작품`,
    },
  ];

  return (
    <section className="profile-hub-panel panel profile-dashboard-panel">
      <div className="profile-hub-main">
        <div>
          <span className="mono text-muted text-xs">TODAY'S DASHBOARD</span>
          <h3 className="mono">오늘의 탐사 대시보드</h3>
          <p>
            글 {stats.posts ?? 0}개, 댓글 {stats.comments ?? 0}개, 배지 {unlockedBadges.length}개가
            현재 대원의 탐사 기록으로 집계됩니다.
          </p>
        </div>
        <strong className="profile-dashboard-points">{points} MP</strong>
      </div>
      <div className="profile-hub-grid">
        {dashboardItems.map(item => {
          const Icon = item.icon;
          return (
            <article className="profile-hub-item" key={item.label}>
              <span className="mono"><Icon aria-hidden="true" /> {item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          );
        })}
      </div>
      <div className="profile-dashboard-actions">
        <Link to="/#works-archive">작품 탐사</Link>
        <Link to="/questions">커뮤니티 교신</Link>
        <Link to="/network">무전 네트워크</Link>
        <span>{activitySummary.missions.length > 0 ? `다음 임무 ${activitySummary.missions.length}개 대기` : '임무 큐 안정화'}</span>
      </div>
    </section>
  );
}
