import { ChevronRight, Send } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

export default function WorkDetailPanel({
  commentMessage,
  commentStatus,
  commentText,
  comments,
  onClose,
  onCommentSubmit,
  onCommentTextChange,
  onWorkStatusChange,
  user,
  work,
  workStatus,
  workStatusSaving,
}) {
  if (!work) return null;

  const statusOptions = [
    { value: 'want', label: '읽고 싶어요' },
    { value: 'reading', label: '읽는 중' },
    { value: 'done', label: '읽었어요' },
  ];

  return (
    <ModalShell ariaLabel={`${work.title} 댓글`}>
      <article className={`work-detail-panel ${work.cover ? 'has-cover' : ''}`}>
        <header className="work-detail-head">
          <div>
            <span>{work.code}</span>
            <h3>{work.title}</h3>
            <p>{work.subtitle}</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 상세 닫기">×</button>
        </header>

        <div className="work-detail-body">
          {work.cover && (
            <figure className="work-detail-cover">
              <img src={work.cover} alt={`${work.title} 표지`} />
            </figure>
          )}
          <div className="work-detail-meta">
            <dl>
              <div>
                <dt>MEDIUM</dt>
                <dd>{work.medium}</dd>
              </div>
              {work.recommender && (
                <div>
                  <dt>RECOMMENDER</dt>
                  <dd>{work.recommender}</dd>
                </div>
              )}
            </dl>
            <div className="work-tags">
              {(work.tags ?? []).map(tag => <span key={tag}>{tag}</span>)}
            </div>
            {work.link && (
              <a className="work-archive-link" href={work.link} target="_blank" rel="noreferrer">
                알라딘 링크 열기 <ChevronRight aria-hidden="true" />
              </a>
            )}
            <div className="work-status-control" aria-label="작품 독서 상태">
              <span>READING STATUS</span>
              <div>
                {statusOptions.map(option => (
                  <button
                    className={workStatus === option.value ? 'is-active' : ''}
                    disabled={!user || workStatusSaving}
                    key={option.value}
                    onClick={() => onWorkStatusChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!user && <em>로그인하면 독서 상태를 저장할 수 있습니다.</em>}
            </div>
          </div>
        </div>

        <section className="work-comment-section">
          <div className="work-comment-head">
            <span>COMMENT SIGNALS</span>
            <strong>{comments.length} COMMENTS</strong>
          </div>
          <div className="work-comment-list">
            {comments.length > 0 ? comments.map(comment => (
              <article className="work-comment" key={comment.id}>
                <div>
                  <strong>{comment.author_name || '익명 탐사자'}</strong>
                  <time>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</time>
                </div>
                <p>{comment.body}</p>
              </article>
            )) : (
              <p className="work-comment-empty">아직 댓글 신호가 없습니다. 첫 반응을 남겨보세요.</p>
            )}
          </div>
          <form className="work-comment-form" onSubmit={onCommentSubmit}>
            <textarea
              disabled={!user || commentStatus === 'saving'}
              onChange={event => onCommentTextChange(event.target.value)}
              placeholder={user ? '이 작품에 대한 짧은 감상이나 질문을 남겨주세요.' : '댓글을 남기려면 먼저 로그인해주세요.'}
              rows={3}
              value={commentText}
            />
            <button disabled={!user || !commentText.trim() || commentStatus === 'saving'} type="submit">
              <Send aria-hidden="true" />
              댓글 저장
            </button>
          </form>
          {commentMessage && <p className={`work-comment-message is-${commentStatus}`}>{commentMessage}</p>}
        </section>
      </article>
    </ModalShell>
  );
}
