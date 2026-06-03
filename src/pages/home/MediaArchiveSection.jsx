import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Play } from 'lucide-react';

function MediaArchiveSection({
  activeMediaArchivePath,
  activeMediaCategory,
  mediaCategories,
  onMediaCategoryChange,
  onRecordMediaSignal,
  previewMedia,
}) {
  return (
    <section className="media-section" id="media-archive">
      <div className="section-shell">
        <div className="section-heading">
          <span>ARCHIVE NODE 03</span>
          <h2>미디어 아카이브</h2>
          <p>
            SF 작가 인터뷰, 관련 미디어, 고전 SF 영화를 모아두는 영상과 읽을거리 저장소입니다.
          </p>
        </div>

        <div className="media-tabs" aria-label="미디어 분류">
          {mediaCategories.map(category => (
            <button
              className={activeMediaCategory === category ? 'is-active' : ''}
              key={category}
              onClick={() => onMediaCategoryChange(category)}
              type="button"
            >
              {category}
            </button>
          ))}
          <Link className="media-full-link" to={activeMediaArchivePath}>
            전체 보기 <ChevronRight aria-hidden="true" />
          </Link>
        </div>

        <div className="media-grid">
          {previewMedia.length > 0 ? previewMedia.map(item => (
            <a
              className="media-card"
              href={item.link}
              key={item.code}
              onClick={() => onRecordMediaSignal(item)}
              rel="noreferrer"
              target="_blank"
            >
              <div className="media-thumb">
                {item.thumbnail ? <img src={item.thumbnail} alt={`${item.title} 썸네일`} loading="lazy" /> : <Play aria-hidden="true" />}
              </div>
              <div className="media-card-body">
                <span>{item.code} / {item.medium}</span>
                <h3>{item.title}</h3>
                <p>{item.description || item.publisher || item.category}</p>
                <div className="media-meta">
                  {item.publisher && <em>{item.publisher}</em>}
                  {(item.date || item.year) && <em>{item.date || item.year}</em>}
                </div>
                <div className="media-tags">
                  {item.tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </a>
          )) : (
            <div className="media-empty">
              <strong>NO SIGNALS</strong>
              <span>{activeMediaCategory} 데이터가 아직 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(MediaArchiveSection);
