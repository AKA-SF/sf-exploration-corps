import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MessageCircle, Send, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { createDiscoveryComment, fetchDiscoveryComments } from './sfDiscoveryComments';
import { discoverySourceLinkLabel } from './sfDiscoveryPresentation';
import './SfDiscoveryDialog.css';

function formatCommentDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function focusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

export default function SfDiscoveryDialog({ item, onClose, user }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentLoadAttempt, setCommentLoadAttempt] = useState(0);
  const [commentLoadStatus, setCommentLoadStatus] = useState('loading');
  const [commentSubmitStatus, setCommentSubmitStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const previousActive = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements(dialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDiscoveryComments(item.id, { signal: controller.signal })
      .then(nextComments => {
        setComments(nextComments);
        setCommentLoadStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          setCommentLoadStatus('error');
        }
      });
    return () => controller.abort();
  }, [commentLoadAttempt, item.id]);

  const retryComments = () => {
    setCommentLoadStatus('loading');
    setCommentLoadAttempt(current => current + 1);
  };

  const submitComment = async event => {
    event.preventDefault();
    const content = commentBody.trim();
    if (!user) {
      setMessage('로그인 후 댓글을 남길 수 있습니다.');
      return;
    }
    if (!content || content.length > 1000) {
      setMessage('댓글은 1자 이상 1000자 이하로 입력해 주세요.');
      return;
    }

    setCommentSubmitStatus('submitting');
    setMessage('');
    try {
      const comment = await createDiscoveryComment({ content, discoveryId: item.id });
      if (comment) setComments(current => [...current, comment]);
      setCommentBody('');
      setCommentSubmitStatus('success');
      setMessage('댓글을 남겼습니다.');
    } catch (error) {
      setCommentSubmitStatus('error');
      setMessage(error.message);
    }
  };

  return createPortal((
    <div
      className="sf-discovery-dialog-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby={`sf-discovery-dialog-title-${item.id}`}
        aria-modal="true"
        className="sf-discovery-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <button aria-label="상세 창 닫기" className="sf-discovery-dialog__close" onClick={onClose} ref={closeRef} type="button">
          <X aria-hidden="true" />
        </button>

        <div className="sf-discovery-dialog__article">
          <div className="sf-discovery-dialog__cover">
            {item.image_url
              ? <img alt={item.image_alt || `${item.title} 표지`} src={item.image_url} />
              : <span>표지 정보 없음</span>}
          </div>
          <div className="sf-discovery-dialog__copy">
            <span className="mono">새로 포착된 SF · 관측 상세</span>
            <h2 id={`sf-discovery-dialog-title-${item.id}`}>{item.title}</h2>
            {(item.author_text || item.publisher_text) && (
              <dl className="sf-discovery-dialog__bibliography">
                {item.author_text && <div><dt>작가</dt><dd>{item.author_text}</dd></div>}
                {item.publisher_text && <div><dt>출판사</dt><dd>{item.publisher_text}</dd></div>}
              </dl>
            )}
            <p>{item.is_spoiler ? '스포일러 보호를 위해 요약을 숨겼습니다.' : item.summary}</p>
            <a href={item.source_url} rel="noreferrer" target="_blank">
              {discoverySourceLinkLabel(item)} <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>

        <section aria-label="이 관측 정보의 댓글" className="sf-discovery-dialog__comments">
          <header><MessageCircle aria-hidden="true" /><h3>댓글</h3><span>{comments.length}</span></header>
          <div className="sf-discovery-dialog__comment-list">
            {commentLoadStatus === 'loading' && <p role="status">댓글을 불러오는 중입니다.</p>}
            {commentLoadStatus === 'error' && (
              <div className="sf-discovery-dialog__comment-error" role="alert">
                <p>댓글을 불러오지 못했습니다.</p>
                <button onClick={retryComments} type="button">다시 시도</button>
              </div>
            )}
            {commentLoadStatus === 'ready' && comments.length === 0 && <p>아직 댓글이 없습니다. 첫 의견을 남겨보세요.</p>}
            {comments.map(comment => (
              <article key={comment.id}>
                <div><strong>{comment.author_name || '탐사자'}</strong><time>{formatCommentDate(comment.created_at)}</time></div>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>

          {user ? (
            <form onSubmit={submitComment}>
              <label htmlFor={`sf-discovery-comment-${item.id}`}>댓글 내용</label>
              <textarea
                id={`sf-discovery-comment-${item.id}`}
                maxLength="1000"
                onChange={event => setCommentBody(event.target.value)}
                placeholder="이 작품에 대한 짧은 의견을 남겨주세요."
                rows="3"
                value={commentBody}
              />
              <div>
                <small>{commentBody.length}/1000</small>
                <button disabled={!commentBody.trim() || commentSubmitStatus === 'submitting'} type="submit">
                  <Send aria-hidden="true" /> {commentSubmitStatus === 'submitting' ? '저장 중' : '댓글 남기기'}
                </button>
              </div>
            </form>
          ) : (
            <p className="sf-discovery-dialog__login">댓글은 로그인 후 작성할 수 있습니다. <Link to="/login">로그인하기</Link></p>
          )}
          <p aria-live="polite" className={`sf-discovery-dialog__status is-${commentSubmitStatus}`}>{message}</p>
        </section>
      </section>
    </div>
  ), document.body);
}
