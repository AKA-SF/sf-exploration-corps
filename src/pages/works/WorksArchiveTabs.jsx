import { Link } from 'react-router-dom';

export default function WorksArchiveTabs({ activeCategory, workCategories }) {
  return (
    <nav className="works-full-tabs" aria-label="작품 전체 분류">
      {workCategories.map(category => (
        <Link
          aria-current={category.slug === activeCategory.slug ? 'page' : undefined}
          className={category.slug === activeCategory.slug ? 'is-active' : ''}
          key={category.slug}
          to={`/works/${category.slug}`}
        >
          {category.title}
        </Link>
      ))}
    </nav>
  );
}
