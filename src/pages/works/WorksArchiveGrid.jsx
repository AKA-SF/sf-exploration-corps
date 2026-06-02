import { BookOpen, ExternalLink, MessageSquareText } from 'lucide-react';

export default function WorksArchiveGrid({
  activeCategory,
  categoryCount,
  onOpenWorkDetail,
  status,
  visibleWorks,
}) {
  return (
    <section className="works-full-grid" aria-label={`${activeCategory.title} 전체 목록`}>
      {visibleWorks.length > 0 ? visibleWorks.map(work => (
        <article
          className="works-full-card"
          key={work.code}
        >
          <div className="works-full-card-top">
            <span>{work.code}</span>
            <em>{work.medium}</em>
          </div>
          {work.cover ? (
            <figure className="works-full-cover">
              <img src={work.cover} alt={`${work.title} 표지`} loading="lazy" />
            </figure>
          ) : (
            <div className="works-full-placeholder"><BookOpen aria-hidden="true" /></div>
          )}
          <h2>{work.title}</h2>
          <p>{work.subtitle}</p>
          {work.recommender && <strong className="works-full-recommender">추천자 {work.recommender}</strong>}
          <div className="works-full-tags">
            {(Array.isArray(work.tags) ? work.tags : []).map(tag => <span key={tag}>{tag}</span>)}
          </div>
          <div className="works-full-link">
            <span>ARCHIVE ACTIONS</span>
            <div className="works-full-actions">
              <button onClick={() => onOpenWorkDetail(work)} type="button">
                <MessageSquareText aria-hidden="true" />
                상세/댓글
              </button>
              {work.link && (
                <a
                  href={work.link}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" />
                  링크
                </a>
              )}
            </div>
          </div>
        </article>
      )) : (
        <div className="works-full-empty">
          <strong>{status === 'loading' ? 'LOADING SIGNALS' : 'NO SIGNALS'}</strong>
          <span>
            {status === 'ready' && categoryCount > 0
              ? `${activeCategory.title} 신호 중 검색어와 맞는 항목이 없습니다.`
              : `${activeCategory.title} 데이터가 아직 없습니다.`}
          </span>
        </div>
      )}
    </section>
  );
}
