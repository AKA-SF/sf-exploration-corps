import { Send } from 'lucide-react';
import CoordinateUniverse from '../../components/CoordinateUniverse';

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
  selectedCoordinate,
  selectedCoordinateConcepts,
  selectedCoordinateId,
  selectedCoordinateQuestions,
  selectedCoordinateWorks,
  visibleConnections,
}) {
  return (
    <section className="coordinates-section" id="coordinates">
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
