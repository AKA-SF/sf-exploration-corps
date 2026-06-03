import { MessageSquare, Send } from 'lucide-react';

export default function QuestionWritePanel({
  authorName,
  form,
  isAuthenticated,
  message,
  onChange,
  onSubmit,
  status,
}) {
  return (
    <section className="question-write-panel" aria-label="커뮤니티 게시글 작성">
      <div className="question-write-brief">
        <MessageSquare aria-hidden="true" />
        <span>WRITE POST</span>
        <h2>새 글 쓰기</h2>
        <p>{isAuthenticated ? `${authorName} 대원 계정으로 저장됩니다.` : '로그인한 대원만 글을 저장할 수 있습니다.'}</p>
      </div>

      <form className="question-form" onSubmit={onSubmit}>
        <label>
          <span>글 제목</span>
          <input
            name="title"
            onChange={onChange}
            placeholder="예: 인간과 인공지능의 경계는 어디서 무너질까?"
            type="text"
            value={form.title}
          />
        </label>

        <label>
          <span>글 내용</span>
          <textarea
            name="content"
            onChange={onChange}
            placeholder="작품명, 장면, 떠오른 생각을 자유롭게 적어주세요."
            rows="7"
            value={form.content}
          />
        </label>

        <label>
          <span>말머리</span>
          <select name="category" onChange={onChange} value={form.category}>
            <option>자유글</option>
            <option>작품추천</option>
            <option>질문</option>
            <option>토론</option>
          </select>
        </label>

        <div className="question-form-actions">
          <p className={`question-status is-${status}`}>
            {status === 'success' && message}
            {status === 'error' && message}
            {status === 'submitting' && '새 글을 저장 중입니다.'}
            {status === 'idle' && (isAuthenticated ? '글을 작성한 뒤 새글 저장을 눌러주세요.' : '로그인 후 새 글을 저장할 수 있습니다.')}
          </p>
          <button className="question-submit-button" type="submit" disabled={!isAuthenticated || status === 'submitting'}>
            <Send aria-hidden="true" />
            {status === 'submitting' ? '저장 중' : '새글 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
