import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeQuestionCategory } from './useQuestionsBoard';

export default function QuestionsBoard({
  activeCategory,
  categories,
  loadStatus,
  onCategoryChange,
  questions,
  visibleQuestions,
}) {
  const getCategoryCount = category => (
    category === '전체'
      ? questions.length
      : questions.filter(question => normalizeQuestionCategory(question.category) === category).length
  );

  return (
    <>
      <nav className="questions-filter" aria-label="커뮤니티 게시판 분류">
        {categories.map(category => (
          <button
            className={activeCategory === category ? 'is-active' : ''}
            key={category}
            onClick={() => onCategoryChange(category)}
            type="button"
          >
            <span>{category}</span>
            <em>{getCategoryCount(category)}</em>
          </button>
        ))}
      </nav>

      <section className="questions-board" aria-label="커뮤니티 게시글">
        <div className="questions-board-head">
          <span>글번호</span>
          <span>말머리</span>
          <span>제목</span>
          <span>작성자</span>
          <span>날짜</span>
          <span>조회수</span>
        </div>
        {visibleQuestions.length > 0 ? visibleQuestions.map(question => (
          <Link className="question-row" key={question.id} to={`/questions/${question.id}`}>
            <span className="question-code">{question.code}</span>
            <span className="question-category">{normalizeQuestionCategory(question.category)}</span>
            <strong>{question.title}</strong>
            <span>{question.author}</span>
            <time>{question.date || '-'}</time>
            <span className="question-views">{question.views ?? 0}</span>
          </Link>
        )) : (
          <div className="questions-empty">
            <MessageSquare aria-hidden="true" />
            <strong>{loadStatus === 'loading' ? '게시글을 불러오는 중입니다' : '아직 게시글이 없습니다'}</strong>
            <span>새 글을 남기면 이곳에 바로 표시됩니다.</span>
          </div>
        )}
      </section>
    </>
  );
}
