import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function ProfileActivityPanel({
  activities,
  activityLabels,
  activitySummary,
  activityTitle,
  message,
  networkSignals = [],
  status,
}) {
  const fallbackSignals = activities.slice(0, 6).map(activity => ({
    key: activity.id,
    label: activityLabels[activity.action_type] || activity.action_type,
    title: activityTitle(activity),
    detail: `${activity.points ?? 0} MP 기록`,
    href: activity.metadata?.question_id
      ? `/questions/${activity.metadata.question_id}`
      : activity.metadata?.work_code
        ? `/works/novels?work=${encodeURIComponent(activity.metadata.work_code)}`
        : '',
    commentCount: 0,
    tone: 'cyan',
  }));
  const signals = networkSignals.length > 0 ? networkSignals : fallbackSignals;

  return (
    <section className="profile-activity panel">
      <div className="class-track-header">
        <div>
          <span className="mono text-muted text-xs">RECENT SIGNALS</span>
          <h3 className="mono">네트워크 신호</h3>
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

      {signals.length > 0 ? signals.map(signal => (
        <Link className={`profile-activity-row is-${signal.tone}`} key={signal.key} to={signal.href || '/profile'}>
          <span>{signal.label}</span>
          <strong>{signal.title}</strong>
          <p>{signal.detail}</p>
          <em><MessageSquare size={13} aria-hidden="true" /> {signal.commentCount ?? 0}</em>
        </Link>
      )) : (
        <div className="profile-empty-state">
          <p>아직 수신된 네트워크 신호가 없습니다. 커뮤니티 글, 작품 댓글, 작품 상태를 남기면 이곳에 실제 기록이 올라옵니다.</p>
          <Link to="/questions">커뮤니티로 이동</Link>
        </div>
      )}
      {message && <p className={`profile-message is-${status}`}>{message}</p>}
    </section>
  );
}
