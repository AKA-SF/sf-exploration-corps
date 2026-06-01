import { MessageSquare, Send } from 'lucide-react';

export default function CommunitySection({
  authorName,
  isAuthenticated,
  onQuestionFormChange,
  onQuestionSubmit,
  questionForm,
  questionMessage,
  questionStatus,
}) {
  return (
    <section className="question-section" id="question-vault">
      <div className="section-shell">
        <div className="section-heading">
          <span>ARCHIVE NODE 04</span>
          <h2>커뮤니티 게시판</h2>
          <p>
            SF 작품을 읽고 남은 질문, 추천, 제안, 함께 나누고 싶은 이야기를
              로그인한 대원 계정으로 바로 남길 수 있습니다.
          </p>
        </div>

        <div className="question-layout">
          <aside className="question-brief">
            <MessageSquare aria-hidden="true" />
            <span>QUESTION VAULT</span>
            <h3>새 글은 다음 탐사의 좌표가 됩니다</h3>
            <p>
              작품명, 핵심 질문, 떠오른 장면, 추천하고 싶은 자료를 함께 적어두면
              더 좋은 커뮤니티 신호가 됩니다.
            </p>
            <dl>
              <div>
                <dt>TYPE</dt>
                <dd>질문 / 추천 / 제안 / 수업 주제</dd>
              </div>
              <div>
                <dt>MODE</dt>
                <dd>{isAuthenticated ? `${authorName} 대원으로 저장` : '로그인 후 저장 가능'}</dd>
              </div>
            </dl>
          </aside>

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
                <option>자유글</option>
                <option>작품추천</option>
                <option>질문</option>
                <option>토론</option>
              </select>
            </label>

            <div className="question-form-actions">
              <p className={`question-status is-${questionStatus}`}>
                {questionStatus === 'success' && questionMessage}
                {questionStatus === 'error' && questionMessage}
                {questionStatus === 'submitting' && '새 글을 저장 중입니다.'}
                {questionStatus === 'idle' && (isAuthenticated ? '글을 작성한 뒤 새글 저장을 눌러주세요.' : '로그인 후 새 글을 저장할 수 있습니다.')}
              </p>
              <button type="submit" disabled={!isAuthenticated || questionStatus === 'submitting'}>
                <Send aria-hidden="true" />
                {questionStatus === 'submitting' ? '저장 중' : '새글 저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
