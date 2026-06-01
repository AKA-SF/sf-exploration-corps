import { MessageSquare, Pencil, Save, Trash2, X } from 'lucide-react';
import { BOARD_CATEGORIES } from './useQuestionsBoard';

export default function QuestionDetailView({
  activeQuestion,
  editForm,
  editMessage,
  editStatus,
  isEditing,
  loadStatus,
  localReadingMode,
  onDelete,
  onEditCancel,
  onEditChange,
  onEditStart,
  onEditSubmit,
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
      <button
        className="question-reading-toggle"
        onClick={onReadingModeToggle}
        type="button"
      >
        {localReadingMode ? 'Console View' : 'Reading View'}
      </button>
      {isEditing ? (
        <form className="question-form question-edit-form" onSubmit={onEditSubmit}>
          <label>
            <span>글머리</span>
            <select name="category" onChange={onEditChange} value={editForm.category}>
              {BOARD_CATEGORIES.filter(category => category !== '전체').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span>제목</span>
            <input name="title" onChange={onEditChange} type="text" value={editForm.title} />
          </label>
          <label>
            <span>내용</span>
            <textarea name="content" onChange={onEditChange} rows="12" value={editForm.content} />
          </label>
          <div className="question-owner-actions is-editing">
            <p className={`question-status is-${editStatus}`}>
              {editStatus === 'success' && editMessage}
              {editStatus === 'error' && editMessage}
              {editStatus === 'submitting' && '글을 수정 중입니다.'}
            </p>
            <button type="button" onClick={onEditCancel}>
              <X aria-hidden="true" />
              취소
            </button>
            <button type="submit" disabled={editStatus === 'submitting'}>
              <Save aria-hidden="true" />
              {editStatus === 'submitting' ? '저장 중' : '수정 저장'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2>{activeQuestion.title}</h2>
          <div className="question-detail-meta">
            <span>작성자 {activeQuestion.author}</span>
            <time>{activeQuestion.date || 'NO DATE'}</time>
            <em>조회수 {activeQuestion.views ?? 0}</em>
          </div>
          <div className="question-detail-body">
            <p>{activeQuestion.content}</p>
          </div>
          {activeQuestion.canEdit && (
            <div className="question-owner-actions">
              <p className={`question-status is-${editStatus}`}>
                {editStatus === 'success' && editMessage}
                {editStatus === 'error' && editMessage}
              </p>
              <button type="button" onClick={onEditStart}>
                <Pencil aria-hidden="true" />
                수정
              </button>
              <button className="is-danger" type="button" onClick={onDelete}>
                <Trash2 aria-hidden="true" />
                글삭제
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
