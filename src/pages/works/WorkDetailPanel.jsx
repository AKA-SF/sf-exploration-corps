import { Link } from 'react-router-dom';
import { ChevronRight, Compass, MessageSquareText, Send } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

export default function WorkDetailPanel({
  commentMessage,
  commentStatus,
  commentText,
  comments,
  onClose,
  onCommentSubmit,
  onCommentTextChange,
  onRelatedWorkOpen,
  onWorkStatusChange,
  relatedConcepts = [],
  relatedQuestions = [],
  relatedWorks = [],
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
              {!user && (
                <em>
                  로그인하면 독서 상태를 저장하고 내 탐사 프로필에 모을 수 있습니다.
                  <Link to="/login"> 로그인하기</Link>
                </em>
              )}
            </div>
          </div>
        </div>

        <section className="work-related-section">
          <div className="work-comment-head">
            <span>NEXT SIGNAL ROUTES</span>
            <strong>이어지는 탐사</strong>
          </div>
          <div className="work-related-grid">
            <article>
              <span><Compass aria-hidden="true" /> 비슷한 작품</span>
              {relatedWorks.length > 0 ? relatedWorks.map(item => (
                <button key={item.code} onClick={() => onRelatedWorkOpen?.(item)} type="button">
                  <strong>{item.title}</strong>
                  <em>{item.medium}</em>
                </button>
              )) : <p>같은 태그의 작품 신호가 아직 부족합니다.</p>}
              <a href="#coordinates" onClick={onClose}>이 작품과 비슷한 좌표 보기</a>
            </article>
            <article>
              <span><MessageSquareText aria-hidden="true" /> 관련 개념/토론</span>
              {relatedConcepts.length > 0 ? relatedConcepts.map(concept => (
                <a href="#concept-dictionary" key={concept.code} onClick={onClose}>
                  <strong>{concept.term}</strong>
                  <em>{concept.english || concept.category}</em>
                </a>
              )) : <p>연결된 개념 신호가 더 쌓이면 표시됩니다.</p>}
              {relatedQuestions.length > 0 ? relatedQuestions.map(question => (
                <Link key={question.id || question.title} to={question.id ? `/questions/${question.id}` : '/questions'}>
                  <strong>{question.title}</strong>
                  <em>{question.category || '커뮤니티'}</em>
                </Link>
              )) : <Link to="/questions">이 작품으로 토론 열기</Link>}
            </article>
          </div>
        </section>

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
          {!user && <Link className="work-login-cta" to="/login">로그인하고 댓글 남기기</Link>}
          {commentMessage && <p className={`work-comment-message is-${commentStatus}`}>{commentMessage}</p>}
        </section>
      </article>
    </ModalShell>
  );
}
