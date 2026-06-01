import { Send } from 'lucide-react';

export default function CommentsPanel({
  comments,
  form,
  message,
  onChange,
  onSubmit,
  status,
}) {
  return (
    <section className="comments-panel" aria-label="댓글">
      <div className="comments-list">
        <div className="comments-heading">
          <span>COMMENTS</span>
          <strong>{comments.length}</strong>
        </div>
        {comments.length > 0 ? comments.map((comment, index) => (
          <article className="comment-item" key={`${comment.date}-${comment.name}-${index}`}>
            <div>
              <strong>{comment.name || '익명'}</strong>
              <span>{comment.date}</span>
            </div>
            <p>{comment.content}</p>
          </article>
        )) : (
          <p className="comments-empty">아직 댓글이 없습니다.</p>
        )}
      </div>

      <form className="question-form comment-form" onSubmit={onSubmit}>
        <label>
          <span>이름</span>
          <input name="name" onChange={onChange} placeholder="익명 가능" type="text" value={form.name} />
        </label>
        <label>
          <span>댓글 내용</span>
          <textarea name="content" onChange={onChange} placeholder="댓글을 입력해주세요." rows="5" value={form.content} />
        </label>
        <div className="question-form-actions">
          <p className={`question-status is-${status}`}>
            {status === 'success' && message}
            {status === 'error' && message}
            {status === 'submitting' && '댓글을 저장 중입니다.'}
            {status === 'idle' && '댓글을 작성한 뒤 저장을 눌러주세요.'}
          </p>
          <button type="submit" disabled={status === 'submitting'}>
            <Send aria-hidden="true" />
            {status === 'submitting' ? '저장 중' : '댓글 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
