import { lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ListFilter, Map, Radio, Radar, SendHorizontal } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { useVisibleExplorationLogs } from '../features/exploration-logs/useVisibleExplorationLogs';
import useRadioMessages from './network/useRadioMessages';
import './NetworkV2.css';

const NetworkMapV2 = lazy(() => import('./network/NetworkMapV2'));
const NETWORK_TABS = [
  { id: 'signals', icon: ListFilter, label: '신호 목록' },
  { id: 'map', icon: Map, label: '지도' },
  { id: 'radio', icon: Radio, label: '무전' },
];
const NETWORK_TAB_IDS = new Set(NETWORK_TABS.map(tab => tab.id));

function formatDate(value) {
  if (!value) return '최근 수신';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 수신';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function signalDescription(log) {
  if (Array.isArray(log.ideas) && log.ideas.length > 0) return log.ideas.slice(0, 2).join(' · ');
  const immersion = Number(log.experiences?.immersion ?? 0);
  const complexity = Number(log.experiences?.complexity ?? 0);
  return `몰입 ${immersion} · 복잡성 ${complexity}의 공개 탐사 신호입니다.`;
}

function NetworkSourceError({ onRetry }) {
  return (
    <div className="network-v2-empty panel" role="alert">
      <strong>공개 신호 연결을 확인하지 못했습니다.</strong>
      <p>실제 빈 네트워크가 아닐 수 있습니다. 연결 상태를 확인한 뒤 다시 수신해 주세요.</p>
      <button className="network-v2-empty-cta" onClick={onRetry} type="button">다시 수신하기</button>
    </div>
  );
}

export default function Network() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('view') || 'signals';
  const activeTab = NETWORK_TAB_IDS.has(requestedTab) ? requestedTab : 'signals';
  const { logs: visibleExplorationLogs, loading, reload, status: networkSourceStatus } = useVisibleExplorationLogs(36);
  const networkSourceUnavailable = networkSourceStatus === 'error' || networkSourceStatus === 'unavailable';
  const {
    isRadioSubmitting,
    radioBody,
    radioNotice,
    radioStatus,
    radioStream,
    replyBody,
    replyTarget,
    setRadioBody,
    setReplyBody,
    setReplyTarget,
    submitRadioMessage,
    submitRadioReply,
  } = useRadioMessages(user, activeTab === 'radio');

  const selectTab = tabId => {
    const next = new URLSearchParams(searchParams);
    if (tabId === 'signals') next.delete('view');
    else next.set('view', tabId);
    setSearchParams(next, { replace: true });
  };

  return (
    <PageTransition className="network-container network-v2">
      <header className="network-v2-header">
        <div>
          <span className="mono">공개 탐사 신호 · PUBLIC NETWORK</span>
          <h1><Radar aria-hidden="true" /> 탐사 네트워크</h1>
          <p>다른 탐사자가 공개한 SF 감상 기록을 발견하고, 비슷한 감정과 아이디어에서 새로운 연결점을 찾습니다.</p>
        </div>
        <div className="network-v2-count mono" aria-label={networkSourceUnavailable ? '공개 신호 상태 확인 불가' : `공개 신호 ${visibleExplorationLogs.length}개`}>
          <span>VISIBLE SIGNALS</span>
          <strong>{networkSourceUnavailable ? '—' : visibleExplorationLogs.length}</strong>
        </div>
      </header>

      <div className="network-v2-workspace">
        <aside className="network-v2-rail">
          <nav className="network-v2-tabs" aria-label="탐사 네트워크 보기" role="tablist">
            {NETWORK_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  aria-controls={`network-panel-${tab.id}`}
                  aria-selected={isActive}
                  className={isActive ? 'is-active' : ''}
                  id={`network-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="network-v2-rail-guide panel">
            <span className="mono">탐사망 안내 · NETWORK GUIDE</span>
            <strong>{activeTab === 'signals' ? '공개 신호 탐색' : activeTab === 'map' ? '연결 구조 보기' : '공개 무전 참여'}</strong>
            <p>{activeTab === 'signals' ? '공개 범위가 허용된 탐사 기록만 표시합니다.' : activeTab === 'map' ? '노드를 선택하면 해당 기록의 상세로 이동합니다.' : '이름과 무전 내용은 네트워크에 공개됩니다.'}</p>
          </div>
        </aside>

        <main className="network-v2-content">
          {activeTab === 'signals' && (
        <section className="network-v2-panel" aria-labelledby="network-tab-signals" id="network-panel-signals" role="tabpanel">
          <div className="network-v2-section-head">
            <div><span className="mono">LATEST SIGNALS</span><h2>최근 공개 탐사 기록</h2></div>
            <p>기록을 선택하면 공개가 허용된 필드만으로 상세 신호를 확인합니다.</p>
          </div>

          {networkSourceUnavailable ? (
            <NetworkSourceError onRetry={reload} />
          ) : loading ? (
            <div className="network-v2-empty panel" role="status" aria-live="polite"><strong>공개 신호를 수신하고 있습니다.</strong></div>
          ) : visibleExplorationLogs.length > 0 ? (
            <div className="network-v2-feed">
              {visibleExplorationLogs.map(log => (
                <Link className="network-v2-card" key={log.id} to={`/network/${log.id}`}>
                  <div className="network-v2-card-meta">
                    <b>{log.visibility === 'PUBLIC_SIGNAL' ? '공개 신호' : '익명 신호'}</b>
                    <span>{log.logType || '탐사 기록'}</span>
                    <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                  </div>
                  <h3>{log.spoiler === 'CLASSIFIED_SIGNAL' ? '분류된 탐사 신호' : log.title || '제목 없는 탐사 신호'}</h3>
                  <p>{log.spoiler === 'CLASSIFIED_SIGNAL' ? '스포일러가 포함된 분류 신호입니다. 상세에서 직접 확인할 수 있습니다.' : signalDescription(log)}</p>
                  <div className="network-v2-emotions" aria-label="감정 태그">
                    {(log.spoiler === 'CLASSIFIED_SIGNAL' ? [] : log.emotions || []).slice(0, 3).map(emotion => <span key={emotion}>{emotion}</span>)}
                  </div>
                  <div className="network-v2-card-cta"><span>신호 상세 보기</span><ArrowRight aria-hidden="true" size={17} /></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="network-v2-empty network-v2-empty--guided panel">
              <header>
                <span className="mono">NO PUBLIC SIGNALS RECEIVED</span>
                <strong>아직 수신된 공개 신호가 없습니다.</strong>
                <p>첫 신호는 자동으로 생성되지 않습니다. 탐사자가 기록의 공개 범위를 직접 선택할 때 네트워크에 연결됩니다.</p>
              </header>
              <ol className="network-v2-empty-steps" aria-label="공개 신호를 만드는 과정">
                <li><span className="mono">01</span><strong>작품을 발견합니다</strong><p>소설, 영화, 게임에서 남기고 싶은 감각과 아이디어를 찾습니다.</p></li>
                <li><span className="mono">02</span><strong>탐사 기록을 남깁니다</strong><p>경험 수치와 감정, 메모를 먼저 개인 기록으로 저장합니다.</p></li>
                <li><span className="mono">03</span><strong>공개 범위를 직접 선택합니다</strong><p>공개 신호로 선택한 기록만 다른 탐사자에게 연결됩니다.</p></li>
              </ol>
              <div className="network-v2-empty-boundary">
                <div><span className="mono">공개되는 정보</span><p>작품명, 공개 경험 수치, 선택한 감정과 아이디어</p></div>
                <div><span className="mono">비공개로 유지</span><p>개인 초안, 비공개 메모, 공개하지 않은 탐사 기록</p></div>
              </div>
              <Link className="network-v2-empty-cta" to="/log">첫 탐사 기록 작성 <ArrowRight aria-hidden="true" /></Link>
            </div>
          )}
        </section>
      )}

      {activeTab === 'map' && (
        <section className="network-v2-panel" aria-labelledby="network-tab-map" id="network-panel-map" role="tabpanel">
          <div className="network-v2-section-head">
            <div><span className="mono">SIGNAL MAP</span><h2>공개 신호 연결 지도</h2></div>
            <p>지도 노드를 선택하면 해당 공개 탐사 기록의 상세 화면으로 이동합니다.</p>
          </div>
          {networkSourceUnavailable ? (
            <NetworkSourceError onRetry={reload} />
          ) : loading ? (
            <div className="network-v2-empty panel" role="status">공개 신호를 수신하고 있습니다.</div>
          ) : (
            <Suspense fallback={<div className="network-v2-empty panel" role="status">신호 지도를 준비하고 있습니다.</div>}>
              <NetworkMapV2 logs={visibleExplorationLogs} onSelect={log => navigate(`/network/${log.id}`)} />
            </Suspense>
          )}
        </section>
      )}

      {activeTab === 'radio' && (
        <section className="network-v2-panel" aria-labelledby="network-tab-radio" id="network-panel-radio" role="tabpanel">
          <div className="network-v2-section-head">
            <div><span className="mono">OPEN RADIO</span><h2>공개 무전 채널</h2></div>
            <p>무전 내용과 발신자 이름은 공개됩니다. 개인 정보나 비공개 기록을 입력하지 마세요.</p>
          </div>
          <div className="network-v2-radio-grid">
            <div className="network-v2-radio-compose-column">
              <form className="network-v2-radio-composer panel" onSubmit={submitRadioMessage}>
                <label className="mono" htmlFor="network-radio-body">새 공개 무전</label>
                <textarea
                  id="network-radio-body"
                  maxLength={240}
                  onChange={event => setRadioBody(event.target.value)}
                  placeholder={user ? '탐사 중 발견한 연결점을 240자 이내로 공유하세요.' : '로그인 후 공개 무전을 보낼 수 있습니다.'}
                  value={radioBody}
                />
                <div className="network-v2-form-bottom">
                  <span>{radioBody.length}/240</span>
                  <button disabled={!user || isRadioSubmitting || !radioBody.trim()} type="submit"><SendHorizontal aria-hidden="true" size={15} /> 송신</button>
                </div>
              </form>

              {replyTarget && (
                <form className="network-v2-reply-composer panel" onSubmit={submitRadioReply}>
                  <div className="network-v2-reply-head"><strong>{replyTarget.author_name}에게 공개 답신</strong><button onClick={() => setReplyTarget(null)} type="button">취소</button></div>
                  <textarea maxLength={180} onChange={event => setReplyBody(event.target.value)} value={replyBody} />
                  <div className="network-v2-form-bottom"><span>{replyBody.length}/180</span><button disabled={!user || isRadioSubmitting || !replyBody.trim()} type="submit">답신</button></div>
                </form>
              )}

              {radioStatus === 'schema-missing' && <p className="network-v2-notice">무전 데이터 연결이 필요합니다.</p>}
              {radioNotice && radioStatus !== 'schema-missing' && <p className="network-v2-notice" role="status">{radioNotice}</p>}
            </div>

            <div className="network-v2-radio-list" aria-live="polite">
              {radioStream.length > 0 ? radioStream.map(signal => (
                <article className="network-v2-radio-card panel" key={signal.id}>
                  <header><strong>{signal.sender || '탐사자'}</strong><span>{signal.time}</span></header>
                  <p>{signal.body}</p>
                  {signal.message && signal.message.user_id !== user?.id && <button onClick={() => { setReplyTarget(signal.message); setReplyBody(''); }} type="button">공개 답신</button>}
                </article>
              )) : <div className="network-v2-empty panel"><strong>{radioStatus === 'loading' ? '무전을 수신하고 있습니다.' : '아직 공개 무전이 없습니다.'}</strong></div>}
            </div>
          </div>
        </section>
      )}
        </main>
      </div>
    </PageTransition>
  );
}