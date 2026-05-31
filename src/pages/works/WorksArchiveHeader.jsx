import { ArrowLeft, Database, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorksArchiveHeader({ activeCategory, onOpenWorkSubmit, visibleCount }) {
  return (
    <header className="works-full-header">
      <Link className="works-back-link" to="/#works-archive">
        <ArrowLeft aria-hidden="true" />
        작품 아카이브
      </Link>
      <div>
        <span>WORKS ARCHIVE / FULL INDEX</span>
        <h1>{activeCategory.title}</h1>
        <p>작품 아카이브의 {activeCategory.title} 신호를 별도 전체 페이지에서 검색하고 탐색합니다.</p>
      </div>
      <div className="works-full-status">
        <Sparkles aria-hidden="true" />
        <strong>{visibleCount} SIGNALS</strong>
        <button className="works-full-submit-button" onClick={onOpenWorkSubmit} type="button">
          <Database aria-hidden="true" />
          <span>작품 아카이브</span>
        </button>
      </div>
    </header>
  );
}
