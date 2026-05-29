import { Link } from 'react-router-dom';

export default function ProfileActivityPanel({
  activities,
  activityLabels,
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
  );
}
