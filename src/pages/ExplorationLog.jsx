import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Radio, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import './ExplorationLog.css';

const fallbackLogs = [
  {
    code: 'LOG-001',
    workTitle: '탐사 로그 대기 중',
    instagramUrl: 'https://www.instagram.com/',
    review: '노션 탐사 로그 데이터베이스와 연결되면 인스타 리뷰 카드가 이곳에 표시됩니다.',
    category: '탐사 로그',
    date: '',
    tags: ['Instagram Review'],
  },
];

function getShape(index) {
  const shapes = ['tall', 'rating', 'quote', 'compact', 'note', 'wide', 'compact', 'tall'];
  return shapes[index % shapes.length];
}

export default function ExplorationLog() {
  const [logs, setLogs] = useState(fallbackLogs);
  const [activeCategory, setActiveCategory] = useState('전체');

  useEffect(() => {
    let isMounted = true;

    fetch('/api/exploration-log', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Exploration log unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
        }
      })
      .catch(() => {
        if (isMounted) setLogs(fallbackLogs);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => (
    ['전체', ...new Set(logs.map(log => log.category).filter(Boolean))]
  ), [logs]);

  const visibleLogs = activeCategory === '전체'
    ? logs
    : logs.filter(log => log.category === activeCategory);

  return (
    <PageTransition className="exploration-log-page">
      <header className="log-archive-header">
        <Link className="log-back-link" to="/">
          <ArrowLeft aria-hidden="true" />
          SF 탐사단
        </Link>
        <div>
          <span>INSTAGRAM REVIEW ARCHIVE</span>
          <h1>탐사 로그</h1>
          <p>인스타그램에 기록된 SF 리뷰와 감상 신호를 한 페이지에 모아둔 로그 보드입니다.</p>
        </div>
        <div className="log-header-status">
          <Sparkles aria-hidden="true" />
          <strong>{logs.length} SIGNALS</strong>
        </div>
      </header>

      <nav className="log-filter-bar" aria-label="탐사 로그 분류">
        {categories.map(category => (
          <button
            className={activeCategory === category ? 'is-active' : ''}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      <section className="log-masonry" aria-label="인스타 리뷰 탐사 로그">
        {visibleLogs.map((log, index) => {
          const shape = getShape(index);
          return (
            <a
              className={`log-card ${shape}`}
              href={log.instagramUrl}
              key={`${log.code}-${log.workTitle}`}
              rel="noreferrer"
              target="_blank"
            >
              <div className="log-card-top">
                <span>{log.code}</span>
                <Radio aria-hidden="true" />
              </div>
              {(shape === 'rating' || shape === 'note') && (
                <div className="log-stars" aria-label="review signal strength">★★★★★</div>
              )}
              <h2>{log.workTitle}</h2>
              <p>{shape === 'compact' ? log.review.slice(0, 92) : log.review}</p>
              <div className="log-card-meta">
                {log.date && <em>{log.date}</em>}
                <em>{log.category}</em>
              </div>
              <div className="log-tags">
                {log.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
              <div className="log-card-link">
                <span>OPEN REVIEW</span>
                <ExternalLink aria-hidden="true" />
              </div>
            </a>
          );
        })}
      </section>
    </PageTransition>
  );
}
