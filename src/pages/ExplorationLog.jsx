import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Radio, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import './ExplorationLog.css';
import '../styles/MobileExperience.css';

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

function hashText(value) {
  return [...value].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleWithSeed(items, seed) {
  return [...items]
    .map((item, index) => ({
      item,
      sort: seededRandom(seed + index * 97 + hashText(`${item.code}-${item.workTitle}`)),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(entry => entry.item);
}

function getShape(index, log, seed) {
  const shapes = ['poster', 'rating', 'quote', 'mini', 'note', 'wide', 'compact', 'tall'];
  const shapeIndex = Math.abs(hashText(`${log.code}-${log.workTitle}-${seed}-${index}`)) % shapes.length;
  return shapes[shapeIndex];
}

function summarizeReview(review, log) {
  const cleaned = (review || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\S+/g, '')
    .replace(/#[^\s#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const fallback = `${log.workTitle || '이 작품'}에 대한 탐사 리뷰가 기록된 카드입니다.`;
  if (!cleaned) return fallback;

  const sentences = cleaned
    .split(/(?<=[.!?。！？]|[가-힣]\.)\s+|(?<=[다요죠음함됨임까])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 8);
  const summary = sentences.slice(0, 2).join(' ');

  if (summary && summary.length <= 150) return summary;
  const source = summary || cleaned;
  const excerpt = source.slice(0, 132).trim();
  return excerpt ? `${excerpt}...` : fallback;
}

export default function ExplorationLog() {
  const [logs, setLogs] = useState(fallbackLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [localReadingMode, setLocalReadingMode] = useState(false);
  const [layoutSeed] = useState(() => Date.now());

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

  const visibleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredLogs = query
      ? logs.filter(log => [
        log.workTitle,
        log.review,
        log.category,
        log.date,
        ...log.tags,
      ].filter(Boolean).join(' ').toLowerCase().includes(query))
      : logs;
    return shuffleWithSeed(filteredLogs, layoutSeed);
  }, [layoutSeed, logs, searchQuery]);

  return (
    <PageTransition className={`exploration-log-page ${localReadingMode ? 'is-reading-local' : ''}`}>
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
        <button
          className="log-reading-toggle"
          onClick={() => setLocalReadingMode(value => !value)}
          type="button"
        >
          {localReadingMode ? 'Console View' : 'Reading View'}
        </button>
      </header>

      <div className="log-search-bar" role="search">
        <Search aria-hidden="true" />
        <input
          aria-label="탐사 로그 검색"
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="작품명, 리뷰 문구, 태그 검색"
          type="search"
          value={searchQuery}
        />
        <span>{visibleLogs.length} / {logs.length} SIGNALS</span>
      </div>

      <section className="log-masonry" aria-label="인스타 리뷰 탐사 로그">
        {visibleLogs.length > 0 ? visibleLogs.map((log, index) => {
          const shape = getShape(index, log, layoutSeed);
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
              <p>{summarizeReview(log.review, log)}</p>
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
        }) : (
          <div className="log-empty-result">
            <strong>NO SIGNALS</strong>
            <span>검색어와 일치하는 탐사 로그가 없습니다.</span>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
