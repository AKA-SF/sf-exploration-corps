import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useMotionProfile } from '../../hooks/useMotionProfile';

const CoordinateUniverse = lazy(() => import('../../components/CoordinateUniverse'));

function CoordinateUniverseFallback() {
  return (
    <div className="coordinate-universe coordinate-universe-loading" role="status" aria-live="polite">
      <span>COORDINATE ATLAS LOADING</span>
    </div>
  );
}

function MobileCoordinateMap({ activeGenre, nodes, onExpand, onNodeSelect, onReset, selectedId }) {
  const featuredNodes = nodes
    .filter(node => !node.secondary || node.id === selectedId)
    .slice(0, 12);

  return (
    <div className="coordinate-mobile-map" aria-label="모바일 탐사 좌표 요약">
      <div className="coordinate-mobile-orbit" aria-hidden="true">
        {featuredNodes.map(node => (
          <button
            className={`mobile-coordinate-node tone-${node.tone} ${node.id === selectedId ? 'is-selected' : ''}`}
            key={node.id}
            onClick={() => onNodeSelect(node)}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            type="button"
          >
            <i />
            <span>{node.label}</span>
          </button>
        ))}
      </div>
      <div className="coordinate-mobile-actions">
        <span>{activeGenre ? '하위 좌표 탐색 중' : '핵심 좌표 요약 모드'}</span>
        <div>
          {activeGenre && <button onClick={onReset} type="button">중심으로</button>}
          <button onClick={onExpand} type="button">우주 지도 열기</button>
        </div>
      </div>
    </div>
  );
}

export default function CoordinatesSection({
  activeGenre,
  hasCoordinateFocus,
  mapDescription,
  mapPositions,
  minimapViewport,
  onConceptSelect,
  onLogOpen,
  onNodeSelect,
  onReset,
  onViewChange,
  relatedCoordinateIds,
  recommendedRoutes,
  selectedCoordinate,
  selectedCoordinateBoardQuestions,
  selectedCoordinateConcepts,
  selectedCoordinateId,
  selectedCoordinateQuestions,
  selectedCoordinateRoutes,
  selectedCoordinateWorks,
  visibleConnections,
}) {
  const sectionRef = useRef(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(() => (
    typeof window !== 'undefined' && !('IntersectionObserver' in window)
  ));
  const { compact: isCompactViewport } = useMotionProfile();
  const [isMobileMapExpanded, setIsMobileMapExpanded] = useState(false);

  useEffect(() => {
    if (shouldLoadMap) return undefined;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldLoadMap(true);
      observer.disconnect();
    }, {
      rootMargin: '720px 0px',
      threshold: 0.01,
    });

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [shouldLoadMap]);

  const mobileMapExpanded = isCompactViewport && isMobileMapExpanded;
  const useMobileLiteMap = isCompactViewport && !mobileMapExpanded;

  return (
    <section className="coordinates-section" id="coordinates" ref={sectionRef}>
      <div className="section-shell">
        <div className="section-heading">
          <span>EXPLORATION NODE MAP</span>
          <h2>탐사 좌표</h2>
          <p>
            SF 장르와 개념을 노드 기반 지도로 배치한 탐사 좌표입니다.
            각 노드는 작품 아카이브의 신호가 모이는 방향이며, 서로 다른 상상력의 경로를 연결합니다.
          </p>
        </div>

        <div className="coordinate-map-layout">
          {useMobileLiteMap ? (
            <MobileCoordinateMap
              activeGenre={activeGenre}
              nodes={mapPositions}
              onExpand={() => {
                setShouldLoadMap(true);
                setIsMobileMapExpanded(true);
              }}
              onNodeSelect={onNodeSelect}
              onReset={onReset}
              selectedId={selectedCoordinateId}
            />
          ) : shouldLoadMap ? (
            <Suspense fallback={<CoordinateUniverseFallback />}>
              <CoordinateUniverse
                activeGenre={activeGenre}
                className={hasCoordinateFocus ? 'is-focused' : ''}
                connections={visibleConnections}
                hasFocus={hasCoordinateFocus}
                nodes={mapPositions}
                onNodeSelect={onNodeSelect}
                onReset={onReset}
                onViewChange={onViewChange}
                relatedIds={relatedCoordinateIds}
                selectedId={selectedCoordinateId}
              />
            </Suspense>
          ) : (
            <CoordinateUniverseFallback />
          )}

          <aside className="coordinate-brief">
            <span>MAP PROTOCOL</span>
            <h3>{selectedCoordinate.label}</h3>
            <p>{mapDescription}</p>
            <dl>
              <div>
                <dt>SELECTED NODE</dt>
                <dd>{selectedCoordinate.en}</dd>
              </div>
              <div>
                <dt>RELATED WORKS</dt>
                <dd>{selectedCoordinateWorks.length} 작품 신호</dd>
              </div>
              <div>
                <dt>MODE</dt>
                <dd>{activeGenre ? 'Subgenre Mapping' : 'Archive Mapping'}</dd>
              </div>
            </dl>
            <button
              className="coordinate-log-trigger"
              disabled={!selectedCoordinateId}
              onClick={onLogOpen}
              type="button"
            >
              <Send size={16} />
              탐사 로그 작성
            </button>
            <div className="coordinate-panel-section">
              <span>RECOMMENDED ROUTES</span>
              <div className="coordinate-recommend-route-list">
                {recommendedRoutes.map(route => (
                  <article key={route.id}>
                    <strong>{route.title}</strong>
                    <p>{route.description}</p>
                    <div>
                      {route.nodes.map(node => (
                        <button key={node.id} onClick={() => onNodeSelect(node)} type="button">
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="coordinate-panel-section">
              <span>CONNECTED ROUTES</span>
              {selectedCoordinateRoutes.length > 0 ? (
                <div className="coordinate-route-list">
                  {selectedCoordinateRoutes.map(node => (
                    <button
                      className="coordinate-route-item"
                      key={node.id}
                      onClick={() => onNodeSelect(node)}
                      type="button"
                    >
                      <strong>{node.label}</strong>
                      <em>{node.en}</em>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="coordinate-empty-note">중심 좌표를 선택하면 연결 항로가 표시됩니다.</p>
              )}
            </div>
            <div className="coordinate-panel-section">
              <span>RELATED WORKS</span>
              {selectedCoordinateWorks.length > 0 ? (
                <div className="coordinate-work-list">
                  {selectedCoordinateWorks.map(work => {
                    const WorkLink = work.link ? 'a' : 'article';
                    return (
                      <WorkLink
                        className="coordinate-work-item"
                        href={work.link || undefined}
                        key={work.code}
                        rel={work.link ? 'noreferrer' : undefined}
                        target={work.link ? '_blank' : undefined}
                      >
                        <strong>{work.title}</strong>
                        <em>{work.medium}</em>
                      </WorkLink>
                    );
                  })}
                </div>
              ) : (
                <p className="coordinate-empty-note">아직 이 좌표와 자동 연결된 작품이 없습니다.</p>
              )}
            </div>
            <div className="coordinate-panel-section">
              <span>CORE QUESTIONS</span>
              <ul className="coordinate-question-list">
                {selectedCoordinateQuestions.map(question => <li key={question}>{question}</li>)}
              </ul>
            </div>
            <div className="coordinate-panel-section">
              <span>BOARD SIGNALS</span>
              {selectedCoordinateBoardQuestions.length > 0 ? (
                <div className="coordinate-board-list">
                  {selectedCoordinateBoardQuestions.map(question => (
                    <Link
                      className="coordinate-board-item"
                      key={question.id || question.title}
                      to={question.id ? `/questions/${question.id}` : '/questions'}
                    >
                      <strong>{question.title}</strong>
                      <em>{question.category || '커뮤니티'}</em>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="coordinate-empty-note">이 좌표와 연결된 커뮤니티 글이 아직 없습니다.</p>
              )}
            </div>
            <div className="coordinate-panel-section">
              <span>RELATED CONCEPTS</span>
              <div className="coordinate-concept-list">
                {(selectedCoordinateConcepts.length > 0 ? selectedCoordinateConcepts : selectedCoordinate.concepts?.map(term => ({ code: term, term })) ?? []).map(concept => (
                  <button
                    key={concept.code || concept.term}
                    onClick={() => concept.code && onConceptSelect(concept.code)}
                    type="button"
                  >
                    {concept.term}
                  </button>
                ))}
              </div>
            </div>
            <div className="coordinate-minimap" aria-label="탐사 좌표 미니맵">
              <div className="coordinate-minimap-top">
                <span>MINI MAP</span>
                <strong>+</strong>
              </div>
              <div className="coordinate-mini-space">
                {mapPositions.map(node => (
                  <i
                    key={node.id}
                    className={`mini-node tone-${node.tone}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  />
                ))}
                <span
                  className="mini-viewport"
                  style={{
                    left: `${minimapViewport.x}%`,
                    top: `${minimapViewport.y}%`,
                    width: `${minimapViewport.width}%`,
                    height: `${minimapViewport.height}%`,
                  }}
                />
                <b />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
