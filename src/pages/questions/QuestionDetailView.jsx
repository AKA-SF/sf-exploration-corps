import { MessageSquare } from 'lucide-react';

export default function QuestionDetailView({
  activeQuestion,
  loadStatus,
  localReadingMode,
  onReadingModeToggle,
}) {
  if (!activeQuestion) {
    return (
      <div className="questions-empty">
        <MessageSquare aria-hidden="true" />
        <strong>{loadStatus === 'loading' ? '게시글을 불러오는 중입니다' : '게시글을 찾을 수 없습니다'}</strong>
        <span>목록으로 돌아가 다시 선택해주세요.</span>
      </div>
    );
  }

  return (
    <article className={`question-detail ${localReadingMode ? 'is-reading-local' : ''}`}>
      <div className="question-detail-top">
        <span>{activeQuestion.category}</span>
        <em>{activeQuestion.date || 'NO DATE'}</em>
      </div>
      <button
        className="question-reading-toggle"
        onClick={onReadingModeToggle}
        type="button"
      >
        {localReadingMode ? 'Console View' : 'Reading View'}
      </button>
      <h2>{activeQuestion.title}</h2>
      <div className="question-detail-meta">
        <span>작성자 {activeQuestion.author}</span>
      </div>
      <p>{activeQuestion.content}</p>
    </article>
  );
}
