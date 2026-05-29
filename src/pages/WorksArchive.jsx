import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, Search, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import './WorksArchive.css';

const fallbackWorks = [
  {
    code: 'SFA-001',
    medium: 'NOVEL',
    title: '듄',
    subtitle: '생태, 제국, 예언, 행성 규모의 정치학',
    tags: ['생태 SF', '제국', '메시아'],
  },
  {
    code: 'SFA-014',
    medium: 'CINEMA',
    title: '블레이드 러너',
    subtitle: '기억과 신체, 인공 생명의 권리를 묻는 도시 신호',
    tags: ['안드로이드', '기억', '느와르'],
  },
  {
    code: 'SFA-027',
    medium: 'GAME',
    title: '시그널리스',
    subtitle: '반복되는 꿈과 우주적 고립 속에서 흔들리는 정체성',
    tags: ['우주 공포', '기억', '루프'],
  },
  {
    code: 'SFA-039',
    medium: 'ANIMATION',
    title: '공각기동대',
    subtitle: '네트워크, 의식, 사이버네틱 신체의 경계 탐사',
    tags: ['사이버펑크', '정체성', '네트워크'],
  },
];

function getWorkSearchText(work) {
  return [
    work.code,
    work.medium,
    work.title,
    work.subtitle,
    work.recommender,
    work.link,
    ...(Array.isArray(work.tags) ? work.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export default function WorksArchive() {
  const { categorySlug = 'novels' } = useParams();
  const [works, setWorks] = useState(fallbackWorks);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const activeCategory = workCategories.find(category => category.slug === categorySlug) ?? workCategories[0];

  useEffect(() => {
    let isMounted = true;

    fetch('/api/works', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Works archive unavailable');
        return response.json();
      })
      .then(data => {
        if (!isMounted) return;
        setWorks(Array.isArray(data.works) && data.works.length > 0 ? data.works : fallbackWorks);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setWorks(fallbackWorks);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryWorks = useMemo(() => works.filter(work => (
    getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === activeCategory.slug
  )), [activeCategory.slug, works]);

  const visibleWorks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryWorks;
    return categoryWorks.filter(work => getWorkSearchText(work).includes(query));
  }, [categoryWorks, searchQuery]);

  return (
    <PageTransition className="works-full-page">
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
          <strong>{visibleWorks.length} SIGNALS</strong>
        </div>
      </header>

      <nav className="works-full-tabs" aria-label="작품 전체 분류">
        {workCategories.map(category => (
          <Link
            className={category.slug === activeCategory.slug ? 'is-active' : ''}
            key={category.slug}
            to={`/works/${category.slug}`}
          >
            {category.title}
          </Link>
        ))}
      </nav>

      <div className="works-full-search" role="search">
        <Search aria-hidden="true" />
        <input
          aria-label="작품 아카이브 검색"
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="제목, 저자/출판사, 추천자, 태그 검색"
          type="search"
          value={searchQuery}
        />
        <span>{visibleWorks.length} / {categoryWorks.length} SIGNALS</span>
      </div>

      <section className="works-full-grid" aria-label={`${activeCategory.title} 전체 목록`}>
        {visibleWorks.length > 0 ? visibleWorks.map(work => {
          const CardContent = (
            <>
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
                <span>{work.link ? 'OPEN ARCHIVE LINK' : 'ARCHIVE SIGNAL'}</span>
                {work.link && <ExternalLink aria-hidden="true" />}
              </div>
            </>
          );

          return work.link ? (
            <a className="works-full-card" href={work.link} key={work.code} rel="noreferrer" target="_blank">
              {CardContent}
            </a>
          ) : (
            <article className="works-full-card" key={work.code}>
              {CardContent}
            </article>
          );
        }) : (
          <div className="works-full-empty">
            <strong>{status === 'loading' ? 'LOADING SIGNALS' : 'NO SIGNALS'}</strong>
            <span>
              {status === 'ready' && categoryWorks.length > 0
                ? `${activeCategory.title} 신호 중 검색어와 맞는 항목이 없습니다.`
                : `${activeCategory.title} 데이터가 아직 없습니다.`}
            </span>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
