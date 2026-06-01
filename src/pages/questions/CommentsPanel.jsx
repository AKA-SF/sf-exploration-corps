import { Pencil, Save, Send, Trash2, X } from 'lucide-react';

export default function CommentsPanel({
  comments,
  editForm,
  editMessage,
  editingCommentId,
  editStatus,
  form,
  message,
  onChange,
  onDeleteComment,
  onEditCancel,
  onEditChange,
  onEditStart,
  onEditSubmit,
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
          <article className="comment-item" key={comment.id || `${comment.date}-${comment.name}-${index}`}>
            <div>
              <strong>{comment.name || '익명'}</strong>
              <span>{comment.date}</span>
            </div>
            {editingCommentId === comment.id ? (
              <form className="question-form comment-edit-form" onSubmit={onEditSubmit}>
                <label>
                  <span>이름</span>
                  <input name="name" onChange={onEditChange} placeholder="익명 가능" type="text" value={editForm.name} />
                </label>
                <label>
                  <span>댓글 내용</span>
                  <textarea name="content" onChange={onEditChange} rows="4" value={editForm.content} />
                </label>
                <div className="comment-actions">
                  <button type="button" onClick={onEditCancel}>
                    <X aria-hidden="true" />
                    취소
                  </button>
                  <button type="submit" disabled={editStatus === 'submitting'}>
                    <Save aria-hidden="true" />
                    {editStatus === 'submitting' ? '저장 중' : '저장'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>{comment.content}</p>
                {comment.canEdit && (
                  <div className="comment-actions">
                    <button type="button" onClick={() => onEditStart(comment)}>
                      <Pencil aria-hidden="true" />
                      수정
                    </button>
                    <button className="is-danger" type="button" onClick={() => onDeleteComment(comment.id)}>
                      <Trash2 aria-hidden="true" />
                      삭제
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        )) : (
          <p className="comments-empty">아직 댓글이 없습니다.</p>
        )}
        <p className={`question-status comment-edit-status is-${editStatus}`}>
          {editStatus === 'success' && editMessage}
          {editStatus === 'error' && editMessage}
          {editStatus === 'submitting' && '댓글을 처리 중입니다.'}
        </p>
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
