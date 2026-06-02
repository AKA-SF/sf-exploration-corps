import { useState } from 'react';

function TasteTestContent({
  onAnswer,
  onReset,
  tasteAnswers,
  tasteProfile,
  tasteQuestionSet,
  tasteRecommendations,
}) {
  return (
    <div className="taste-test-layout">
      <div className="taste-questions">
        {tasteQuestionSet.map((question, questionIndex) => (
          <article className="taste-question-card" key={question.id}>
            <span>QUESTION {String(questionIndex + 1).padStart(2, '0')}</span>
            <h3>{question.question}</h3>
            <div className="taste-options">
              {question.options.map((option, optionIndex) => (
                <button
                  className={tasteAnswers[question.id] === optionIndex ? 'is-selected' : ''}
                  key={option.label}
                  onClick={() => onAnswer(question.id, optionIndex)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <aside className={`taste-result-panel ${tasteProfile ? 'is-complete' : ''}`}>
        <span>{tasteProfile?.code ?? 'TYPE SCAN'}</span>
        <h3>{tasteProfile?.title ?? '탐사 성향 분석 중'}</h3>
        <strong>{tasteProfile?.genre ?? `${Object.keys(tasteAnswers).length} / ${tasteQuestionSet.length} 응답 완료`}</strong>
        <p>
          {tasteProfile?.summary ?? '질문에 답하면 당신에게 어울리는 탐사 대원 유형과 추천 도서 3권이 표시됩니다.'}
        </p>
        {tasteProfile && (
          <>
            <dl>
              <div>
                <dt>ASSIGNED VESSEL</dt>
                <dd>{tasteProfile.vessel}</dd>
              </div>
              <div>
                <dt>RECOMMENDED ROUTE</dt>
                <dd>{tasteProfile.genre}</dd>
              </div>
            </dl>
            <div className="taste-recommendations">
              <span>추천 도서 3권</span>
              {tasteRecommendations.map(work => {
                const WorkLink = work.link ? 'a' : 'article';
                return (
                  <WorkLink
                    className="taste-book-link"
                    href={work.link || undefined}
                    key={work.code}
                    rel={work.link ? 'noreferrer' : undefined}
                    target={work.link ? '_blank' : undefined}
                  >
                    <strong>{work.title}</strong>
                    <em>{work.subtitle}</em>
                  </WorkLink>
                );
              })}
            </div>
            <div className="taste-result-actions">
              <a href="#works-archive">작품 아카이브로 이동</a>
              <button type="button" onClick={onReset}>
                다시 테스트
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default function TasteTestSection({
  onAnswer,
  onReset,
  tasteAnswers,
  tasteProfile,
  tasteQuestionSet,
  tasteRecommendations,
}) {
  const [isMobileTestOpen, setIsMobileTestOpen] = useState(false);
  const contentProps = {
    onAnswer,
    onReset,
    tasteAnswers,
    tasteProfile,
    tasteQuestionSet,
    tasteRecommendations,
  };

  return (
    <section className="taste-test-section" id="taste-test">
      <div className="section-shell">
        <div className="section-heading">
          <span>CREW PROFILING</span>
          <h2>
            <button
              className="taste-mobile-title-trigger"
              onClick={() => setIsMobileTestOpen(true)}
              type="button"
            >
              나의 SF 성향<br />테스트
            </button>
          </h2>
          <p>
            당신은 어떤 우주선에 어울리는 탐사 대원인가요?
            네 개의 가벼운 질문을 지나면, 성향에 맞는 탐사 경로와 추천 도서가 열립니다.
          </p>
        </div>

        <TasteTestContent {...contentProps} />
      </div>

      {isMobileTestOpen && (
        <div className="taste-mobile-window" role="dialog" aria-modal="true" aria-label="나의 SF 성향 테스트">
          <div className="taste-mobile-window-panel">
            <div className="taste-mobile-window-top">
              <span>CREW PROFILING</span>
              <button onClick={() => setIsMobileTestOpen(false)} type="button">닫기</button>
            </div>
            <TasteTestContent {...contentProps} />
          </div>
        </div>
      )}
    </section>
  );
}
