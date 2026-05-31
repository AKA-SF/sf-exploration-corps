import { MessageSquare, Send } from 'lucide-react';

export default function QuestionWritePanel({
  form,
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
        <p>비밀번호를 입력해 저장하면 게시판 목록에 바로 올라갑니다.</p>
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

        <div className="question-form-row">
          <label>
            <span>이름</span>
            <input name="name" onChange={onChange} placeholder="익명 가능" type="text" value={form.name} />
          </label>
          <label>
            <span>연락처</span>
            <input name="contact" onChange={onChange} placeholder="이메일 또는 인스타그램" type="text" value={form.contact} />
          </label>
        </div>

        <label>
          <span>분류</span>
          <select name="category" onChange={onChange} value={form.category}>
            <option>커뮤니티</option>
            <option>토론 질문</option>
            <option>작품 추천</option>
            <option>강의/워크숍 주제</option>
            <option>아카이브 제안</option>
          </select>
        </label>

        <label>
          <span>게시판 비밀번호</span>
          <input
            name="password"
            onChange={onChange}
            placeholder="비밀번호를 입력하세요"
            type="password"
            value={form.password}
          />
        </label>

        <div className="question-form-actions">
          <p className={`question-status is-${status}`}>
            {status === 'success' && message}
            {status === 'error' && message}
            {status === 'submitting' && '새 글을 저장 중입니다.'}
            {status === 'idle' && '비밀번호를 입력한 뒤 새글 저장을 눌러주세요.'}
          </p>
          <button type="submit" disabled={status === 'submitting'}>
            <Send aria-hidden="true" />
            {status === 'submitting' ? '저장 중' : '새글 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
