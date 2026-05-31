import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuestionsBoard({
  activeCategory,
  categories,
  loadStatus,
  onCategoryChange,
  visibleQuestions,
}) {
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
            {category}
          </button>
        ))}
      </nav>

      <section className="questions-board" aria-label="커뮤니티 게시글">
        <div className="questions-board-head">
          <span>제목</span>
          <span>작성자</span>
          <span>날짜</span>
        </div>
        {visibleQuestions.length > 0 ? visibleQuestions.map(question => (
          <Link className="question-row" key={question.id} to={`/questions/${question.id}`}>
            <strong>{question.title}</strong>
            <span>{question.author}</span>
            <time>{question.date || '-'}</time>
          </Link>
        )) : (
          <div className="questions-empty">
            <MessageSquare aria-hidden="true" />
            <strong>{loadStatus === 'loading' ? '게시글을 불러오는 중입니다' : '아직 게시글이 없습니다'}</strong>
            <span>비밀번호를 입력해 새 글을 남기면 이곳에 바로 표시됩니다.</span>
          </div>
        )}
      </section>
    </>
  );
}
