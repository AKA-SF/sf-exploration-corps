import { Link } from 'react-router-dom';

export default function ProfileActivityPanel({
  activities,
  activityLabels,
  activitySummary,
  activityTitle,
  message,
  status,
}) {
  return (
    <section className="profile-activity panel">
      <div className="class-track-header">
        <div>
          <span className="mono text-muted text-xs">RECENT SIGNALS</span>
          <h3 className="mono">최근 활동</h3>
        </div>
      </div>

      <div className="profile-activity-summary" aria-label="내 활동 요약">
        <article>
          <span className="mono">MY POSTS</span>
          {activitySummary.posts.length > 0 ? activitySummary.posts.map(activity => (
            <strong key={activity.id}>{activityTitle(activity)}</strong>
          )) : <em>아직 게시글 없음</em>}
        </article>
        <article>
          <span className="mono">MY COMMENTS</span>
          {activitySummary.comments.length > 0 ? activitySummary.comments.map(activity => (
            <strong key={activity.id}>{activityTitle(activity)}</strong>
          )) : <em>아직 댓글 없음</em>}
        </article>
        <article>
          <span className="mono">MY BADGES</span>
          {activitySummary.badges.length > 0 ? activitySummary.badges.map(badge => (
            <strong key={badge.id}>{badge.title}</strong>
          )) : <em>첫 배지 대기 중</em>}
        </article>
        <article>
          <span className="mono">MISSION QUEUE</span>
          {activitySummary.missions.length > 0 ? activitySummary.missions.map(mission => (
            <strong key={mission.id}>{mission.title}</strong>
          )) : <em>현재 루트 완료</em>}
        </article>
      </div>

      {activities.length > 0 ? activities.slice(0, 8).map(activity => (
        <article className="profile-activity-row" key={activity.id}>
          <span>{activityLabels[activity.action_type] || activity.action_type}</span>
          <strong>{activityTitle(activity)}</strong>
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
  );
}
