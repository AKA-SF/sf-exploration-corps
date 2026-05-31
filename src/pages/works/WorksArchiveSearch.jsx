import { Search } from 'lucide-react';

export default function WorksArchiveSearch({
  categoryCount,
  onSearchChange,
  searchQuery,
  visibleCount,
}) {
  return (
    <div className="works-full-search" role="search">
      <Search aria-hidden="true" />
      <input
        aria-label="작품 아카이브 검색"
        onChange={event => onSearchChange(event.target.value)}
        placeholder="제목, 저자/출판사, 추천자, 태그 검색"
        type="search"
        value={searchQuery}
      />
      <span>{visibleCount} / {categoryCount} SIGNALS</span>
    </div>
  );
}
