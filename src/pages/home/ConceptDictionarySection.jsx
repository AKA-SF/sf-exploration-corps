export default function ConceptDictionarySection({
  conceptFeatureRef,
  conceptReadingMode,
  conceptsCount,
  getConceptSource,
  onConceptSelect,
  onReadingModeToggle,
  onShowAllToggle,
  selectedConcept,
  showAllConcepts,
  visibleConcepts,
}) {
  return (
    <section className="concept-section" id="concept-dictionary">
      <div className="section-shell">
        <div className="section-heading">
          <span>ARCHIVE NODE 02</span>
          <h2>SF 개념 사전</h2>
          <p>
            SF 작품을 읽을 때 반복해서 나타나는 장르, 세계관, 기술, 사회적 질문을
            작은 탐사 용어로 정리합니다.
          </p>
        </div>

        <div className="concept-layout">
          <aside className="concept-index">
            <span>DICTIONARY INDEX</span>
            <button
              aria-expanded={showAllConcepts}
              className="concept-count-button"
              onClick={onShowAllToggle}
              type="button"
            >
              {conceptsCount} TERMS
            </button>
            <p>작품 아카이브와 탐사 좌표 사이를 연결하는 개념 신호 목록입니다.</p>
          </aside>

          {selectedConcept ? (
            <div className="concept-browser">
              <article className={`concept-feature-card ${conceptReadingMode ? 'is-reading-local' : ''}`} ref={conceptFeatureRef}>
                <div className="concept-card-top">
                  <span>{selectedConcept.code}</span>
                  <em>{selectedConcept.category}</em>
                </div>
                <button
                  className="local-reading-toggle"
                  onClick={onReadingModeToggle}
                  type="button"
                >
                  {conceptReadingMode ? 'Console View' : 'Reading View'}
                </button>
                <h3>{selectedConcept.term}</h3>
                <strong>{selectedConcept.english}</strong>
                <p>{selectedConcept.summary}</p>
                {selectedConcept.relatedWorks?.length > 0 && (
                  <dl className="concept-meta-list">
                    <div>
                      <dt>관련 작품</dt>
                      <dd>{selectedConcept.relatedWorks.join(', ')}</dd>
                    </div>
                  </dl>
                )}
                {selectedConcept.source && (
                  <dl className="concept-meta-list">
                    <div>
                      <dt>출처</dt>
                      <dd>
                        {getConceptSource(selectedConcept.source, selectedConcept).href ? (
                          <a
                            className="concept-source-link"
                            href={getConceptSource(selectedConcept.source, selectedConcept).href}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {getConceptSource(selectedConcept.source, selectedConcept).label}
                          </a>
                        ) : (
                          getConceptSource(selectedConcept.source, selectedConcept).label
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
                {selectedConcept.keywords?.length > 0 && (
                  <div className="concept-tags">
                    {selectedConcept.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}
                  </div>
                )}
              </article>

              <div className="concept-grid">
                {visibleConcepts.map(entry => (
                  <button
                    className={`concept-card ${entry.code === selectedConcept.code ? 'is-active' : ''}`}
                    key={entry.code}
                    onClick={() => onConceptSelect(entry.code)}
                    type="button"
                  >
                    <span>{entry.code}</span>
                    <strong>{entry.term}</strong>
                    {entry.english && <small>{entry.english}</small>}
                    <em>{entry.category}</em>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="concept-empty">
              <strong>NO TERMS</strong>
              <span>노션 SF 개념 사전에 아직 등록된 개념어가 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
