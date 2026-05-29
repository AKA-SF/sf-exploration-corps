import { Link } from 'react-router-dom';
import { ChevronRight, Database } from 'lucide-react';

export default function WorksArchiveSection({
  displayedWorks,
  onOpenWorkDetail,
  onOpenWorkSubmit,
  selectedWork,
  workCategories,
  workCategoryCounts,
  worksCount,
}) {
  return (
    <section className="works-archive-section" id="works-archive">
      <div className="section-shell">
        <div className="section-heading">
          <span>ARCHIVE NODE 01</span>
          <h2>작품 아카이브</h2>
          <p>
            SF 탐사단의 작품 아카이브는 작품을 단순 목록으로 보관하지 않고,
            세계관, 매체, 핵심 질문, 감각적 밀도에 따라 탐사 가능한 신호로 분류합니다.
          </p>
        </div>

        <div className="archive-category-grid" aria-label="작품 매체 분류">
          {workCategories.map(category => (
            <Link
              className="category-tile"
              key={category.label}
              to={`/works/${category.slug}`}
            >
              <span>{category.label}</span>
              <strong>{category.title}</strong>
              <em>{String(workCategoryCounts[category.slug] ?? 0).padStart(3, '0')} SIGNALS</em>
            </Link>
          ))}
        </div>

        <div className="works-layout">
          <div className="works-brief">
            <span>CLASSIFICATION METHOD</span>
            <h3>작품을 좌표로 읽기</h3>
            <p>
              각 작품은 장르보다 먼저 질문으로 기록됩니다. 이 작품이 어떤 인간 이후의 조건을
              상상하는지, 어떤 기술과 감각을 호출하는지, 그리고 지금 우리의 세계와 어디에서
              접속되는지를 추적합니다.
            </p>
            <dl>
              <div>
                <dt>AXIS 01</dt>
                <dd>세계관과 사회 구조</dd>
              </div>
              <div>
                <dt>AXIS 02</dt>
                <dd>기술, 신체, 의식의 변화</dd>
              </div>
              <div>
                <dt>AXIS 03</dt>
                <dd>토론 가능한 핵심 질문</dd>
              </div>
            </dl>
            <button className="work-submit-open" onClick={onOpenWorkSubmit} type="button">
              <Database aria-hidden="true" />
              작품 아카이브
            </button>
          </div>

          <div className="archive-view-status">
            <span>RANDOM SIGNALS</span>
            <strong>{displayedWorks.length} / {worksCount} WORKS</strong>

            <div className="featured-work-grid" aria-label="대표 작품 신호">
              {displayedWorks.map(work => (
                <article
                  className={`work-card ${selectedWork?.code === work.code ? 'is-expanded' : ''} ${work.cover ? 'has-cover' : ''}`}
                  key={work.code}
                  onClick={() => onOpenWorkDetail(work)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenWorkDetail(work);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="work-card-top">
                    <span>{work.code}</span>
                    <em>{work.medium}</em>
                  </div>
                  {work.cover && (
                    <figure className="work-cover">
                      <img src={work.cover} alt={`${work.title} 표지`} loading="lazy" />
                    </figure>
                  )}
                  <h3>{work.title}</h3>
                  <p>{work.subtitle}</p>
                  {work.recommender && <span className="work-recommender">추천자 {work.recommender}</span>}
                  <div className="work-tags">
                    {work.tags.map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="work-card-footer">
                    <span>DETAIL / COMMENTS</span>
                    <button
                      className="work-detail-open"
                      onClick={event => {
                        event.stopPropagation();
                        onOpenWorkDetail(work);
                      }}
                      type="button"
                    >
                      상세 보기
                    </button>
                    <ChevronRight aria-hidden="true" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
