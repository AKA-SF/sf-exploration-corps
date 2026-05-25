import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Play, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import './MediaArchive.css';

const mediaCategories = [
  { label: 'SF 작가 인터뷰', slug: 'interviews' },
  { label: 'SF 관련 미디어', slug: 'media' },
  { label: 'SF 관련 기사', slug: 'articles' },
  { label: '고전 SF 영화', slug: 'classic-films' },
];

function normalizeMediaCategory(category = '') {
  const normalized = category.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('작가') || normalized.includes('인터뷰')) return 'SF 작가 인터뷰';
  if (normalized.includes('미디어') || normalized.includes('media') || normalized.includes('콘텐츠') || normalized.includes('자료')) return 'SF 관련 미디어';
  if (normalized.includes('기사') || normalized.includes('article')) return 'SF 관련 기사';
  if (normalized.includes('고전') && (normalized.includes('영화') || normalized.includes('sf'))) return '고전 SF 영화';
  return category;
}

export default function MediaArchive() {
  const { categorySlug = 'interviews' } = useParams();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const activeCategory = mediaCategories.find(category => category.slug === categorySlug) ?? mediaCategories[0];

  useEffect(() => {
    let isMounted = true;

    fetch('/api/media', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Media archive unavailable');
        return response.json();
      })
      .then(data => {
        if (!isMounted) return;
        setItems(Array.isArray(data.media) ? data.media : []);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setItems([]);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleItems = useMemo(() => (
    items.filter(item => normalizeMediaCategory(item.category) === activeCategory.label)
  ), [activeCategory.label, items]);

  return (
    <PageTransition className="media-archive-page">
      <header className="media-archive-header">
        <Link className="media-back-link" to="/#media-archive">
          <ArrowLeft aria-hidden="true" />
          미디어 아카이브
        </Link>
        <div>
          <span>MEDIA ARCHIVE / FULL INDEX</span>
          <h1>{activeCategory.label}</h1>
          <p>노션 미디어 아카이브에서 연결된 링크를 분류별로 모두 펼쳐보는 페이지입니다.</p>
        </div>
        <div className="media-archive-status">
          <Sparkles aria-hidden="true" />
          <strong>{visibleItems.length} SIGNALS</strong>
        </div>
      </header>

      <nav className="media-archive-tabs" aria-label="미디어 전체 분류">
        {mediaCategories.map(category => (
          <Link
            className={category.slug === activeCategory.slug ? 'is-active' : ''}
            key={category.slug}
            to={`/media/${category.slug}`}
          >
            {category.label}
          </Link>
        ))}
      </nav>

      <section className="media-archive-grid" aria-label={`${activeCategory.label} 전체 목록`}>
        {visibleItems.length > 0 ? visibleItems.map(item => (
          <a className="media-archive-card" href={item.link} key={item.code} rel="noreferrer" target="_blank">
            <div className="media-archive-thumb">
              {item.thumbnail ? <img src={item.thumbnail} alt={`${item.title} 썸네일`} loading="lazy" /> : <Play aria-hidden="true" />}
            </div>
            <div className="media-archive-body">
              <span>{item.code} / {item.medium}</span>
              <h2>{item.title}</h2>
              <p>{item.description || item.publisher || item.category}</p>
              <div className="media-archive-meta">
                {item.publisher && <em>{item.publisher}</em>}
                {item.year && <em>{item.year}</em>}
              </div>
              <div className="media-archive-tags">
                {item.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
              <div className="media-archive-link">
                <span>OPEN SIGNAL</span>
                <ExternalLink aria-hidden="true" />
              </div>
            </div>
          </a>
        )) : (
          <div className="media-archive-empty">
            <strong>{status === 'loading' ? 'LOADING SIGNALS' : 'NO SIGNALS'}</strong>
            <span>{activeCategory.label} 데이터가 아직 없습니다.</span>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
