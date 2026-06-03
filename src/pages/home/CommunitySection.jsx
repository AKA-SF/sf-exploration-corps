import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Send } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

const communityCategories = ['자유글', '작품추천', '질문', '토론'];

function normalizeQuestionCategory(category = '') {
  if (category === '작품 추천') return '작품추천';
  if (category === '토론 질문') return '질문';
  if (['강의/워크숍 주제', '아카이브 제안', '커뮤니티'].includes(category)) return '자유글';
  return communityCategories.includes(category) ? category : '자유글';
}

function formatQuestionDate(value) {
  if (!value) return '최근';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근';
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export default function CommunitySection({
  authorName,
  isAuthenticated,
  onQuestionFormChange,
  onQuestionSubmit,
  questionForm,
  questionLoadState = 'loading',
  questionMessage,
  questions = [],
  questionStatus,
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const groupedQuestions = useMemo(() => Object.fromEntries(
    communityCategories.map(category => [
      category,
      questions
        .filter(question => normalizeQuestionCategory(question.category) === category)
        .slice(0, 2),
    ]),
  ), [questions]);

  return (
    <section className="question-section" id="question-vault">
      <div className="section-shell">
        <div className="section-heading community-heading">
          <span>ARCHIVE NODE 04</span>
          <h2>커뮤니티 게시판</h2>
          <p>
            자유글, 작품추천, 질문, 토론으로 들어온 최신 교신을 빠르게 확인하고,
            새 글은 팝업에서 바로 남길 수 있습니다.
          </p>
          <button className="question-write-open" onClick={() => setIsComposerOpen(true)} type="button">
            <PenLine aria-hidden="true" />
            새글쓰기
          </button>
        </div>

        <div className="community-signal-grid" aria-label="커뮤니티 최신글">
          {communityCategories.map(category => (
            <article className="community-signal-card" key={category}>
              <div className="community-signal-head">
                <span>{category}</span>
                <Link to="/questions">전체 보기</Link>
              </div>
              <div className="community-signal-list">
                {questionLoadState === 'loading' ? (
                  <p className="community-signal-empty is-loading">커뮤니티 신호를 수신 중입니다.</p>
                ) : questionLoadState === 'error' ? (
                  <p className="community-signal-empty is-error">커뮤니티 연결이 지연되고 있습니다. 전체 게시판에서 다시 확인해주세요.</p>
                ) : groupedQuestions[category].length > 0 ? groupedQuestions[category].map(question => (
                  <Link
                    className="community-signal-item"
                    key={`${category}-${question.id || question.title}`}
                    to={question.id ? `/questions/${question.id}` : '/questions'}
                  >
                    <strong>{question.title}</strong>
                    <p>{question.content || question.summary || '내용 미리보기가 아직 없습니다.'}</p>
                    <em>{question.author || question.name || '탐사자'} / {formatQuestionDate(question.createdAt || question.date || question.created_at)}</em>
                  </Link>
                )) : (
                  <p className="community-signal-empty">아직 {category} 신호가 없습니다.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {isComposerOpen && (
        <ModalShell ariaLabel="커뮤니티 새글쓰기">
          <article className="question-composer-modal">
            <header className="question-composer-head">
              <div>
                <span>NEW COMMUNITY SIGNAL</span>
                <h3>새글쓰기</h3>
                <p>{isAuthenticated ? `${authorName} 대원으로 저장됩니다.` : '로그인 후 새 글을 저장할 수 있습니다.'}</p>
              </div>
              <button onClick={() => setIsComposerOpen(false)} type="button" aria-label="새글쓰기 닫기">×</button>
            </header>

            <form className="question-form" onSubmit={onQuestionSubmit}>
              <label>
                <span>글 제목</span>
                <input
                  name="title"
                  onChange={onQuestionFormChange}
                  placeholder="예: 인간과 인공지능의 경계는 어디서 무너질까?"
                  type="text"
                  value={questionForm.title}
                />
              </label>

              <label>
                <span>글 내용</span>
                <textarea
                  name="content"
                  onChange={onQuestionFormChange}
                  placeholder="작품명, 장면, 떠오른 생각을 자유롭게 적어주세요."
                  rows="7"
                  value={questionForm.content}
                />
              </label>

              <label>
                <span>말머리</span>
                <select name="category" onChange={onQuestionFormChange} value={questionForm.category}>
                  {communityCategories.map(category => <option key={category}>{category}</option>)}
                </select>
              </label>

              <label>
                <span>첨부 링크</span>
                <input
                  name="attachmentUrl"
                  onChange={onQuestionFormChange}
                  placeholder="자료 파일, 이미지, 참고 링크 URL"
                  type="url"
                  value={questionForm.attachmentUrl}
                />
              </label>

              <div className="question-form-actions">
                <p className={`question-status is-${questionStatus}`}>
                  {questionStatus === 'success' && questionMessage}
                  {questionStatus === 'error' && questionMessage}
                  {questionStatus === 'submitting' && '새 글을 저장 중입니다.'}
                  {questionStatus === 'idle' && (isAuthenticated ? '글을 작성한 뒤 새글 저장을 눌러주세요.' : '로그인 후 새 글을 저장할 수 있습니다.')}
                </p>
                <button className="question-submit-button" type="submit" disabled={!isAuthenticated || questionStatus === 'submitting'}>
                  <Send aria-hidden="true" />
                  {questionStatus === 'submitting' ? '저장 중' : '새글 저장'}
                </button>
              </div>
            </form>
          </article>
        </ModalShell>
      )}
    </section>
  );
}
