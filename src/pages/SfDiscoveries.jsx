import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Newspaper, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { discoverySourceLinkLabel } from '../features/sf-discoveries/sfDiscoveryPresentation';
import './SfDiscoveries.css';

const KIND_OPTIONS = [
  ['ALL', '전체'],
  ['NEW_RELEASE', '신작'],
  ['UPCOMING', '공개 예정'],
  ['EDITOR_PICK', '편집 추천'],
];

const MEDIA_OPTIONS = [
  ['ALL', '모든 형식'],
  ['NOVEL', '소설'],
  ['FILM', '영화'],
  ['SERIES', '시리즈'],
  ['GAME', '게임'],
  ['ANIMATION', '애니메이션'],
  ['OTHER', '기타'],
];

const KIND_LABELS = Object.fromEntries(KIND_OPTIONS);
const MEDIA_LABELS = Object.fromEntries(MEDIA_OPTIONS);

async function fetchDiscoveries({ kind, mediaType, signal }) {
  const params = new URLSearchParams({ kind, limit: '60', mediaType });
  const response = await fetch(`/api/discoveries?${params}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'discovery feed unavailable');
  return data.discoveries ?? [];
}

function formatDate(value, fallback = '일정 미정') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function DiscoveryCard({ item }) {
  return (
    <article className={`sf-discovery-card sf-discovery-card--${item.kind?.toLowerCase()}`}>
      <div className="sf-discovery-card__meta mono">
        <span>{KIND_LABELS[item.kind] || 'SF 정보'}</span>
        <span>{MEDIA_LABELS[item.media_type] || '기타'}</span>
      </div>
      {item.image_url && <img alt={item.image_alt || `${item.title} 표지`} className="sf-discovery-card__image" loading="lazy" src={item.image_url} />}
      <div className="sf-discovery-card__body">
        <h2>{item.title}</h2>
        {item.is_spoiler && <span className="sf-discovery-card__spoiler">스포일러 포함</span>}
        <p>{item.is_spoiler ? '스포일러 보호를 위해 요약을 숨겼습니다.' : item.summary}</p>
      </div>
      <dl>
        <div><dt><CalendarDays aria-hidden="true" /> 공개 일정</dt><dd>{formatDate(item.release_date)}</dd></div>
        <div><dt>정보 갱신</dt><dd>{formatDate(item.updated_at, '최근 갱신')}</dd></div>
      </dl>
      {item.has_editorial_detail ? (
        <Link to={`/discover/${item.slug}`}>편집 추천 읽기 <ArrowUpRight aria-hidden="true" /></Link>
      ) : (
        <a href={item.source_url} rel="noreferrer" target="_blank">
          {discoverySourceLinkLabel(item)} <ArrowUpRight aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

export default function SfDiscoveries() {
  const [kind, setKind] = useState('ALL');
  const [mediaType, setMediaType] = useState('ALL');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadDiscoveries = useCallback(async signal => {
    try {
      setItems(await fetchDiscoveries({ kind, mediaType, signal }));
      setStatus('ready');
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('error');
    }
  }, [kind, mediaType]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDiscoveries({ kind, mediaType, signal: controller.signal })
      .then(nextItems => {
        setItems(nextItems);
        setStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, [kind, mediaType]);

  return (
    <main className="sf-discoveries-page">
      <header className="sf-discoveries-hero">
        <Link className="sf-discoveries-back" to="/"><ArrowLeft aria-hidden="true" /> 탐색으로 돌아가기</Link>
        <span className="mono">EDITORIAL OBSERVATORY · VERIFIED SOURCES</span>
        <h1>새로 포착된 SF</h1>
        <p>신작, 공개 예정작과 다시 살펴볼 작품을 공식 출처와 함께 기록합니다. 추천과 공개 네트워크 신호는 서로 섞지 않습니다.</p>
      </header>

      <section className="sf-discoveries-controls" aria-label="관측 정보 필터">
        <div className="sf-discoveries-kind" role="group" aria-label="정보 유형">
          {KIND_OPTIONS.map(([value, label]) => (
            <button aria-pressed={kind === value} key={value} onClick={() => { setStatus('loading'); setKind(value); }} type="button">{label}</button>
          ))}
        </div>
        <label>
          <span>작품 형식</span>
          <select onChange={event => { setStatus('loading'); setMediaType(event.target.value); }} value={mediaType}>
            {MEDIA_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </section>

      {status === 'loading' && (
        <div className="sf-discoveries-state" role="status"><Newspaper aria-hidden="true" /><strong>정보를 불러오는 중입니다.</strong><span>검증된 공개 항목만 확인하고 있습니다.</span></div>
      )}
      {status === 'error' && (
        <div className="sf-discoveries-state" role="alert"><RefreshCw aria-hidden="true" /><strong>정보를 불러오지 못했습니다.</strong><span>기존 작품 탐색은 계속 이용할 수 있습니다.</span><button onClick={() => { setStatus('loading'); void loadDiscoveries(); }} type="button">다시 불러오기</button></div>
      )}
      {status === 'ready' && items.length === 0 && (
        <div className="sf-discoveries-state"><Newspaper aria-hidden="true" /><strong>현재 공개된 관측 정보가 없습니다.</strong><span>출처 확인을 마친 새 항목이 게시되면 이곳에 표시됩니다.</span><Link to="/works/novels">작품 아카이브 보기</Link></div>
      )}
      {status === 'ready' && items.length > 0 && (
        <section className="sf-discoveries-grid" aria-label="SF 신작과 추천 정보">
          {items.map(item => <DiscoveryCard item={item} key={item.id} />)}
        </section>
      )}
    </main>
  );
}
