import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CircleDot,
  Compass,
  LogIn,
  PenLine,
  Radio,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/authContextValue';
import { readExplorationDraft } from '../features/exploration-logs/explorationDraftStorage';
import SfDiscoveryDialog from '../features/sf-discoveries/SfDiscoveryDialog';
import { discoverySourceLinkLabel } from '../features/sf-discoveries/sfDiscoveryPresentation';
import { HOME_EVENT_NAMES, trackProductEvent } from '../lib/productAnalytics';
import { millisecondsUntilNextKoreanDay } from './home/dailyDiscoveryRefresh';
import './HomeV2.css';

const RADAR_POSITIONS = [
  ['64%', '29%'],
  ['30%', '61%'],
  ['69%', '70%'],
];

async function fetchHomeFeed(signal) {
  const response = await fetch('/api/home-feed', { signal });
  if (!response.ok) throw new Error('home feed unavailable');
  return {
    cacheStatus: response.headers.get('X-SF-Archive-Cache') || 'LIVE',
    payload: await response.json(),
  };
}

function compactDate(value) {
  if (!value) return '최근 신호';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 신호';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function workTitle(work) {
  return work?.title || work?.term || '미확인 작품 신호';
}

function signalType(signal) {
  return signal?.logType || signal?.log_type || '탐사 기록';
}

function isClassifiedSignal(signal) {
  return signal?.spoiler === 'CLASSIFIED_SIGNAL';
}

function publicSignalTitle(signal) {
  return isClassifiedSignal(signal)
    ? '분류된 탐사 신호'
    : signal?.title || '제목 없는 탐사 신호';
}

const DISCOVERY_KIND_LABELS = {
  EDITOR_PICK: '편집 추천',
  NEW_RELEASE: '신작',
  UPCOMING: '공개 예정',
};

const DISCOVERY_MEDIA_LABELS = {
  ANIMATION: '애니메이션',
  FILM: '영화',
  GAME: '게임',
  NOVEL: '소설',
  OTHER: '기타',
  SERIES: '시리즈',
};

function SignalCard({ onOpen, signal }) {
  const emotions = isClassifiedSignal(signal) ? [] : signal?.emotions ?? [];
  return (
    <Link className="home-v2-signal" onClick={onOpen} to={`/network/${signal.id}`}>
      <span className="home-v2-signal__pulse" aria-hidden="true" />
      <span className="home-v2-signal__body">
        <span className="home-v2-signal__meta mono">
          {signalType(signal)} · {compactDate(signal?.createdAt || signal?.created_at)}
        </span>
        <strong>{publicSignalTitle(signal)}</strong>
        <span className="home-v2-signal__tags">
          {emotions.slice(0, 3).map(emotion => <small key={emotion}>#{emotion}</small>)}
        </span>
      </span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function HomeV2() {
  const { loading: authLoading, user } = useAuth();
  const [feed, setFeed] = useState(null);
  const [feedStatus, setFeedStatus] = useState('loading');
  const [feedCacheStatus, setFeedCacheStatus] = useState('');
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const draft = useMemo(
    () => authLoading ? {} : readExplorationDraft(user?.id),
    [authLoading, user?.id],
  );
  const hasDraft = Boolean(draft?.title || draft?.type || draft?.memo);

  const loadFeed = useCallback(async signal => {
    try {
      const { cacheStatus, payload } = await fetchHomeFeed(signal);
      setFeed(payload);
      setFeedCacheStatus(cacheStatus);
      setFeedStatus('ready');
    } catch (error) {
      if (error.name !== 'AbortError') setFeedStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHomeFeed(controller.signal)
      .then(({ cacheStatus, payload }) => {
        setFeed(payload);
        setFeedCacheStatus(cacheStatus);
        setFeedStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setFeedStatus('error');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    let controller;
    let timer;

    const scheduleNextDay = () => {
      timer = window.setTimeout(async () => {
        controller = new AbortController();
        setFeedStatus('loading');
        await loadFeed(controller.signal);
        if (active) scheduleNextDay();
      }, millisecondsUntilNextKoreanDay() + 250);
    };

    scheduleNextDay();
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(timer);
    };
  }, [loadFeed]);

  const featuredWorks = feed?.featuredWorks ?? [];
  const latestDiscoveries = feed?.latestDiscoveries ?? [];
  const signals = feed?.latestSignals ?? [];
  const sourceStatus = feed?.sourceStatus;
  const conceptsUnavailable = sourceStatus?.concepts === 'unavailable';
  const mediaUnavailable = sourceStatus?.media === 'unavailable';
  const signalsUnavailable = sourceStatus?.signals === 'unavailable';
  const worksUnavailable = sourceStatus?.works === 'unavailable';
  const hasPartialSourceFailure = Object.values(sourceStatus ?? {}).includes('unavailable');
  const discoveryItem = feed?.featuredConcepts?.[0] || feed?.latestMedia?.[0];
  const discoverySourceMessage = conceptsUnavailable && mediaUnavailable
    ? '개념·미디어 연결이 지연되고 있습니다.'
    : conceptsUnavailable
      ? '개념 자료 연결이 지연되고 있습니다.'
      : mediaUnavailable
        ? '미디어 자료 연결이 지연되고 있습니다.'
        : '';
  const primaryAction = useMemo(() => {
    if (hasDraft) return { label: '작성 중인 기록 이어가기', to: '/log' };
    if (user) return { label: '새 탐사 시작하기', to: '/works/novels' };
    return { label: '첫 작품 발견하기', to: '/works/novels' };
  }, [hasDraft, user]);
  const visitorState = hasDraft ? 'draft' : user ? 'member' : 'guest';
  const secondaryAction = hasDraft
    ? { icon: Compass, label: '새 작품 발견하기', to: '/works/novels' }
    : { icon: PenLine, label: '탐사 기록 남기기', to: '/log' };
  const SecondaryActionIcon = secondaryAction.icon;
  const continuation = hasDraft
    ? { label: '이어갈 기록', value: draft.title || '제목을 정하지 않은 탐사 기록', detail: '계정별로 분리된 초안에서 계속합니다.' }
    : user
      ? { label: '현재 탐사 경로', value: '새 작품에서 다음 신호 발견하기', detail: '기록은 기본적으로 나만 보는 개인 아카이브에 저장됩니다.' }
      : { label: '처음 오셨나요?', value: '작품을 발견한 뒤, 부담 없이 기록해 보세요.', detail: '로그인 전 기록은 이 기기에만 저장되며, 공개 여부는 나중에 직접 선택합니다.' };

  const trackHomeAction = (action, surface) => {
    trackProductEvent(HOME_EVENT_NAMES.CTA, { action, state: visitorState, surface });
  };
  const closeDiscovery = useCallback(() => setSelectedDiscovery(null), []);

  return (
    <main className="home-v2">
      <header className="home-v2-header">
        <Link className="home-v2-brand" to="/" aria-label="SF 탐사단 홈">
          <span className="home-v2-brand__mark" aria-hidden="true"><CircleDot /></span>
          <span><b>SF 탐사단</b><small className="mono">EXPLORATION CORPS</small></span>
        </Link>
        <nav className="home-v2-header__nav" aria-label="상단 메뉴">
          <Link to="/works/novels">탐색</Link>
          <Link to="/log">기록</Link>
          <Link to="/network">네트워크</Link>
          <Link className="home-v2-account" to={user ? '/profile' : '/login'}>
            {user ? <UserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {authLoading ? '확인 중' : user ? '내 정보' : '로그인'}
          </Link>
        </nav>
      </header>

      <section className="home-v2-hero" aria-labelledby="home-v2-title">
        <div className="home-v2-hero__copy">
          <p className="home-v2-eyebrow mono"><span /> 탐사 경로 01 <small>DISCOVER / LOG / CONNECT</small></p>
          <h1 id="home-v2-title">SF를 발견하고,<br />당신의 감상을 <em>신호로 남기세요.</em></h1>
          <p className="home-v2-lead">
            작품과 아이디어를 발견하고, 나만의 탐사 기록을 남기고,
            다른 탐사자의 신호와 연결되는 SF 아카이브입니다.
          </p>
          <div className="home-v2-actions">
            <Link className="home-v2-button home-v2-button--primary" onClick={() => trackHomeAction(hasDraft ? 'resume' : 'discover', 'hero_primary')} to={primaryAction.to}>
              {hasDraft && <span className="home-v2-resume-dot" aria-hidden="true" />}
              {primaryAction.label}<ArrowRight aria-hidden="true" />
            </Link>
            <Link className="home-v2-button" onClick={() => trackHomeAction(hasDraft ? 'discover' : 'log', 'hero_secondary')} to={secondaryAction.to}><SecondaryActionIcon aria-hidden="true" />{secondaryAction.label}</Link>
          </div>
          <aside className="home-v2-continuation" aria-label="현재 탐사 상태">
            <span className="mono">{continuation.label}</span>
            <strong>{continuation.value}</strong>
            <p>{continuation.detail}</p>
          </aside>
          <dl className="home-v2-stats" aria-label="아카이브 현황">
            <div><dt>작품 신호</dt><dd>{feed?.counts?.works ?? '—'}</dd></div>
            <div><dt>최근 공개 기록</dt><dd>{feed?.counts?.logs ?? '—'}</dd></div>
            <div><dt>SF 개념</dt><dd>{feed?.counts?.concepts ?? '—'}</dd></div>
          </dl>
        </div>

        <div className="home-v2-radar" aria-label="최근 탐사 신호 시각화">
          <div className="home-v2-radar__grid">
            <span className="home-v2-radar__rings" aria-hidden="true"><i /><i /><i /><i /><b className="home-v2-radar__sweep" /></span>
            {signals.slice(0, RADAR_POSITIONS.length).map((signal, index) => (
              <Link
                aria-label={`${publicSignalTitle(signal)} 공개 신호 보기`}
                className="home-v2-radar__signal"
                key={signal.id}
                onClick={() => trackProductEvent(HOME_EVENT_NAMES.RADAR_SIGNAL, { action: 'open', state: visitorState, surface: 'hero_radar' })}
                style={{ '--radar-x': RADAR_POSITIONS[index][0], '--radar-y': RADAR_POSITIONS[index][1] }}
                to={`/network/${signal.id}`}
              />
            ))}
          </div>
          <div className="home-v2-radar__label">
            {feedStatus === 'loading' ? (
              <><span className="mono">공개 신호 · CONNECTING</span><strong>공개 신호를 확인하는 중</strong></>
            ) : feedStatus === 'error' || signalsUnavailable ? (
              <><span className="mono">공개 신호 · DELAYED</span><strong>공개 신호 연결이 지연되고 있습니다</strong></>
            ) : signals.length > 0 ? (
              <>
                <span className="mono">공개 신호 · LIVE ARCHIVE</span>
                <strong>{signals.length}개의 최근 공개 신호</strong>
              </>
            ) : discoveryItem ? (
              <Link className="home-v2-radar__discovery" onClick={() => trackHomeAction('discover', 'hero_radar_empty')} to="/works/novels">
                <span className="mono">오늘의 관측 · DISCOVERY</span>
                <strong>{workTitle(discoveryItem)}</strong>
                <small>관련 작품 찾기 <ArrowRight aria-hidden="true" /></small>
              </Link>
            ) : (
              <>
                <span className="mono">공개 신호 · LIVE ARCHIVE</span>
                <strong>새 신호를 기다리는 중</strong>
              </>
            )}
          </div>
        </div>
        <a className="home-v2-scroll-cue mono" href="#home-v2-flow-title">
          탐사 과정 보기 <ArrowDown aria-hidden="true" />
        </a>
      </section>

      <section className="home-v2-flow" aria-labelledby="home-v2-flow-title">
        <div className="home-v2-section-heading">
          <p className="mono">탐사 순환 · THE EXPLORATION LOOP</p>
          <h2 id="home-v2-flow-title">세 단계로 시작하는 SF 탐사</h2>
        </div>
        <ol>
          <li>
            <Link className="home-v2-flow-card" to="/works/novels">
              <span className="home-v2-flow-card__index">01</span><Compass aria-hidden="true" />
              <div><h3>발견</h3><p>소설, 영화, 게임과 새로운 SF 개념을 만납니다.</p></div>
              <span className="home-v2-flow-card__action"><span>작품 탐색</span><ArrowRight aria-hidden="true" /></span>
            </Link>
          </li>
          <li>
            <Link className="home-v2-flow-card" to="/log">
              <span className="home-v2-flow-card__index">02</span><PenLine aria-hidden="true" />
              <div><h3>기록</h3><p>몰입, 감정, 아이디어를 나만의 탐사 기록으로 남깁니다.</p></div>
              <span className="home-v2-flow-card__action"><span>기록 작성</span><ArrowRight aria-hidden="true" /></span>
            </Link>
          </li>
          <li>
            <Link className="home-v2-flow-card" to="/network">
              <span className="home-v2-flow-card__index">03</span><Radio aria-hidden="true" />
              <div><h3>연결</h3><p>공개된 기록에서 다른 탐사자와 닮은 신호를 찾습니다.</p></div>
              <span className="home-v2-flow-card__action"><span>신호 탐색</span><ArrowRight aria-hidden="true" /></span>
            </Link>
          </li>
        </ol>
      </section>

      <section className="home-v2-discovery" aria-labelledby="home-v2-discovery-title">
        <div className="home-v2-section-heading home-v2-section-heading--row">
          <div><p className="mono">오늘의 추천 · TODAY'S DISCOVERY</p><h2 id="home-v2-discovery-title">오늘의 발견</h2></div>
          <Link to="/works/novels">전체 작품 보기 <ArrowRight aria-hidden="true" /></Link>
        </div>

        {feedStatus === 'loading' && (
          <div className="home-v2-skeleton" role="status" aria-live="polite">
            <span /><span /><span /><span /><b className="sr-only">추천 작품을 불러오는 중입니다.</b>
          </div>
        )}
        {feedStatus === 'error' && (
          <div className="home-v2-feed-state" role="alert">
            <Sparkles aria-hidden="true" /><p><strong>피드를 불러오지 못했습니다.</strong>아카이브 전체 탐색은 계속 이용할 수 있습니다.</p>
            <div className="home-v2-feed-actions">
              <button onClick={() => { setFeedStatus('loading'); trackProductEvent(HOME_EVENT_NAMES.FEED_RETRY, { action: 'retry', state: visitorState, surface: 'discovery' }); void loadFeed(); }} type="button">다시 불러오기</button>
              <Link to="/works/novels">작품 아카이브 열기</Link>
            </div>
          </div>
        )}
        {feedStatus === 'ready' && worksUnavailable && (
          <div className="home-v2-feed-state" role="alert"><BookOpen aria-hidden="true" /><p><strong>추천 작품 연결이 지연되고 있습니다.</strong>전체 아카이브는 계속 이용할 수 있습니다.</p><Link to="/works/novels">작품 아카이브 열기</Link></div>
        )}
        {feedStatus === 'ready' && !worksUnavailable && featuredWorks.length === 0 && (
          <div className="home-v2-feed-state"><BookOpen aria-hidden="true" /><p><strong>추천 작품을 준비하고 있습니다.</strong>전체 아카이브에서 먼저 탐사를 시작해 보세요.</p></div>
        )}
        {featuredWorks.length > 0 && (
          <div className="home-v2-work-grid">
            {featuredWorks.map((work, index) => (
              <Link className="home-v2-work" key={work.code || work.id || index} onClick={() => trackProductEvent(HOME_EVENT_NAMES.RECOMMENDATION, { action: 'open', state: visitorState, surface: 'daily_discovery' })} to={`/works/novels?work=${encodeURIComponent(work.code || '')}`}>
                <span className="home-v2-work__index mono">SIGNAL {String(index + 1).padStart(2, '0')}</span>
                <div className="home-v2-work__cover">
                  {work.image || work.cover
                    ? <img alt="" loading="lazy" src={work.image || work.cover} />
                    : <BookOpen aria-hidden="true" />}
                </div>
                <div><strong>{workTitle(work)}</strong><span>{work.author || work.subtitle || work.category || 'SF ARCHIVE'}</span></div>
              </Link>
            ))}
          </div>
        )}

        {discoveryItem && (
          <aside className="home-v2-concept">
            <Sparkles aria-hidden="true" />
            <span className="mono">개념 신호 · CONCEPT</span>
            <strong>{discoveryItem.term || discoveryItem.title}</strong>
            <p>{discoveryItem.summary || discoveryItem.description || '오늘의 SF 개념 신호를 확인하세요.'}</p>
            <Link onClick={() => trackHomeAction('discover', 'concept_signal')} to="/works/novels">관련 작품 찾기 <ArrowRight aria-hidden="true" /></Link>
          </aside>
        )}
        {discoverySourceMessage && (
          <div className="home-v2-feed-state" role="alert"><Sparkles aria-hidden="true" /><p><strong>{discoverySourceMessage}</strong>연결된 다른 추천 자료는 계속 이용할 수 있습니다.</p></div>
        )}
      </section>

      <section className="home-v2-news" aria-labelledby="home-v2-news-title">
        <div className="home-v2-section-heading home-v2-section-heading--row">
          <div><p className="mono">편집 관측 · EDITORIAL OBSERVATORY</p><h2 id="home-v2-news-title">새로 포착된 SF</h2></div>
          <Link to="/discover">전체 관측 정보 보기 <ArrowRight aria-hidden="true" /></Link>
        </div>
        {feedStatus === 'loading' && <div className="home-v2-news__loading" role="status">검증된 SF 정보를 불러오는 중입니다.</div>}
        {feedStatus === 'ready' && feed?.discoveriesUnavailable && (
          <div className="home-v2-feed-state" role="alert"><BookOpen aria-hidden="true" /><p><strong>새 관측 정보를 확인하지 못했습니다.</strong>기존 작품 탐색은 계속 이용할 수 있습니다.</p><Link to="/discover">관측 정보 다시 확인하기</Link></div>
        )}
        {feedStatus === 'ready' && !feed?.discoveriesUnavailable && latestDiscoveries.length === 0 && (
          <div className="home-v2-feed-state"><BookOpen aria-hidden="true" /><p><strong>현재 공개된 새 관측 정보가 없습니다.</strong>출처 확인을 마친 항목만 이곳에 게시합니다.</p><Link to="/discover">관측 정보 페이지 열기</Link></div>
        )}
        {latestDiscoveries.length > 0 && (
          <div className="home-v2-news__grid">
            {latestDiscoveries.map(item => (
              <article className={`home-v2-news__card home-v2-news__card--${item.kind?.toLowerCase()}`} key={item.id}>
                <button className="home-v2-news__open" onClick={() => setSelectedDiscovery(item)} type="button">
                  {item.image_url && (
                    <span className="home-v2-news__cover">
                      <img alt={item.image_alt || `${item.title} 표지`} loading="lazy" src={item.image_url} />
                    </span>
                  )}
                  <span className="home-v2-news__kind mono">{DISCOVERY_KIND_LABELS[item.kind] || 'SF 정보'} · {DISCOVERY_MEDIA_LABELS[item.media_type] || '기타'}</span>
                  <h3>{item.title}</h3>
                  {(item.author_text || item.publisher_text) && (
                    <span className="home-v2-news__bibliography">
                      {item.author_text && <span>{item.author_text}</span>}
                      {item.publisher_text && <small>{item.publisher_text}</small>}
                    </span>
                  )}
                  <span className="home-v2-news__summary">{item.is_spoiler ? '스포일러 보호를 위해 요약을 숨겼습니다.' : item.summary}</span>
                  <span className="home-v2-news__detail">상세·댓글 보기 <ArrowRight aria-hidden="true" /></span>
                </button>
                <div className="home-v2-news__footer"><small>{item.release_date ? `${compactDate(item.release_date)} 공개` : '공개 일정 미정'}</small><a href={item.source_url} rel="noreferrer" target="_blank">{discoverySourceLinkLabel(item)} <ArrowRight aria-hidden="true" /></a></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-v2-network" aria-labelledby="home-v2-network-title">
        <div className="home-v2-section-heading home-v2-section-heading--row">
          <div><p className="mono">공개 중계 · PUBLIC RELAY</p><h2 id="home-v2-network-title">최근 탐사 신호</h2></div>
          <Link to="/network">네트워크 열기 <ArrowRight aria-hidden="true" /></Link>
        </div>
        {feedStatus === 'loading' ? (
          <div className="home-v2-feed-state" role="status"><Radio aria-hidden="true" /><p><strong>공개 신호를 확인하고 있습니다.</strong>네트워크 상태를 불러오는 중입니다.</p></div>
        ) : feedStatus === 'error' || signalsUnavailable ? (
          <div className="home-v2-feed-state" role="alert"><Radio aria-hidden="true" /><p><strong>공개 신호를 불러오지 못했습니다.</strong>네트워크에서 잠시 후 다시 확인해 주세요.</p><Link to="/network">네트워크 열기</Link></div>
        ) : signals.length === 0 ? (
          <div className="home-v2-feed-state"><Radio aria-hidden="true" /><p><strong>아직 공개된 탐사 신호가 없습니다.</strong>첫 번째 신호를 공개해 탐사 네트워크를 시작할 수 있습니다.</p><Link to="/log">첫 신호 기록하기</Link></div>
        ) : (
          <div className="home-v2-signal-list">
            {signals.map(signal => <SignalCard key={signal.id} onOpen={() => trackProductEvent(HOME_EVENT_NAMES.RADAR_SIGNAL, { action: 'open', state: visitorState, surface: 'signal_list' })} signal={signal} />)}
          </div>
        )}
      </section>

      <section className="home-v2-final-cta">
        <span className="mono">당신의 신호 · YOUR SIGNAL MATTERS</span>
        <h2>당신이 읽은 SF는<br />어떤 미래를 남겼나요?</h2>
        <Link className="home-v2-button home-v2-button--primary" onClick={() => trackHomeAction(hasDraft ? 'resume' : 'log', 'final_cta')} to="/log">{hasDraft ? '작성 중인 기록 이어가기' : '탐사 기록 시작하기'} <ArrowRight aria-hidden="true" /></Link>
      </section>

      <footer className="home-v2-footer">
        <span>SF 탐사단 · Seoul Sector</span>
        <nav aria-label="보조 메뉴"><Link to="/questions">커뮤니티</Link><Link to="/exploration-log">리뷰 아카이브</Link><Link to="/profile">내 정보</Link></nav>
        <span className="mono">{feed?.syncedAt
          ? `${hasPartialSourceFailure ? '일부 자료 연결 지연' : feedCacheStatus.includes('STALE') ? '마지막 정상 자료' : '자료 갱신'} · ${compactDate(feed.syncedAt)}`
          : '자료 연결 대기 중'}</span>
      </footer>
      {selectedDiscovery && <SfDiscoveryDialog item={selectedDiscovery} onClose={closeDiscovery} user={user} />}
    </main>
  );
}

export default HomeV2;
