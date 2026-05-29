import { BookMarked } from 'lucide-react';

export default function ProfileReadingPanel({
  latestWorkStatus,
  statusCounts,
  workStatusLabels,
}) {
  return (
    <section className="profile-reading-panel panel">
      <div>
        <span className="mono text-muted text-xs">READING STATUS</span>
        <h3 className="mono">작품 상태 보드</h3>
        <p>작품 카드에서 저장한 읽고 싶어요, 읽는 중, 읽었어요 상태가 여기에 모입니다.</p>
      </div>
      <div className="profile-reading-grid">
        {Object.entries(workStatusLabels).map(([key, label]) => (
          <article key={key}>
            <BookMarked aria-hidden="true" />
            <span>{label}</span>
            <strong>{statusCounts[key] ?? 0}</strong>
          </article>
        ))}
      </div>
      {latestWorkStatus && (
        <p className="profile-reading-latest">
          최근 저장: <strong>{latestWorkStatus.work_title}</strong> / {workStatusLabels[latestWorkStatus.status] ?? latestWorkStatus.status}
        </p>
      )}
    </section>
  );
}
