import { BookMarked } from 'lucide-react';

export default function ProfileReadingPanel({
  latestWorkStatus,
  statusCounts,
  workStatuses = [],
  workStatusLabels,
}) {
  const wantWorks = workStatuses.filter(item => item.status === 'want').slice(0, 4);
  const readingWorks = workStatuses.filter(item => item.status === 'reading').slice(0, 4);
  const doneWorks = workStatuses.filter(item => item.status === 'done').slice(0, 3);
  const nextWork = readingWorks[0] ?? wantWorks[0] ?? null;

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
      <div className="profile-reading-shelves">
        <article>
          <span className="mono">NEXT COORDINATE</span>
          <strong>{nextWork?.work_title ?? '다음 탐사 작품 대기 중'}</strong>
          <p>{nextWork ? `${workStatusLabels[nextWork.status] ?? nextWork.status} 목록에서 추천` : '작품 카드에서 읽고 싶어요를 누르면 여기에 표시됩니다.'}</p>
          <a href="/#works-archive">작품 아카이브로 이동</a>
        </article>
        <article>
          <span className="mono">WANT TO READ</span>
          {wantWorks.length > 0 ? wantWorks.map(item => (
            <p key={item.work_code || item.work_title}>{item.work_title || item.work_code}</p>
          )) : <p>아직 등록된 예정 좌표가 없습니다.</p>}
        </article>
        <article>
          <span className="mono">NOW READING</span>
          {readingWorks.length > 0 ? readingWorks.map(item => (
            <p key={item.work_code || item.work_title}>{item.work_title || item.work_code}</p>
          )) : <p>현재 탐사 중인 작품이 없습니다.</p>}
        </article>
        <article>
          <span className="mono">RECENT COMPLETE</span>
          {doneWorks.length > 0 ? doneWorks.map(item => (
            <p key={item.work_code || item.work_title}>{item.work_title || item.work_code}</p>
          )) : <p>완료한 작품이 쌓이면 최근 기록이 표시됩니다.</p>}
        </article>
      </div>
    </section>
  );
}
