import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import './Questions.css';

const fallbackQuestions = [];

const emptyForm = {
  title: '',
  content: '',
  name: '',
  contact: '',
  category: '커뮤니티',
  password: '',
};

export default function Questions() {
  const { questionId } = useParams();
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [comments, setComments] = useState([]);
  const [questionForm, setQuestionForm] = useState(emptyForm);
  const [commentForm, setCommentForm] = useState({ name: '', content: '', password: '' });
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');
  const [commentMessage, setCommentMessage] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');

  const loadQuestions = () => {
    fetch('/api/questions', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Question archive unavailable');
        return response.json();
      })
      .then(data => {
        setQuestions(Array.isArray(data.questions) ? data.questions : fallbackQuestions);
        setLoadStatus('ready');
      })
      .catch(() => {
        setQuestions(fallbackQuestions);
        setLoadStatus('error');
      });
  };

  const loadQuestionDetail = id => {
    fetch(`/api/questions?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Question detail unavailable');
        return response.json();
      })
      .then(data => {
        setActiveQuestion(data.question);
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setLoadStatus('ready');
      })
      .catch(() => {
        setActiveQuestion(null);
        setComments([]);
        setLoadStatus('error');
      });
  };

  useEffect(() => {
    if (questionId) {
      loadQuestionDetail(questionId);
    } else {
      loadQuestions();
    }
  }, [questionId]);

  const categories = useMemo(() => (
    ['전체', ...new Set(questions.map(question => question.category).filter(Boolean))]
  ), [questions]);
  const [activeCategory, setActiveCategory] = useState('전체');

  const visibleQuestions = activeCategory === '전체'
    ? questions
    : questions.filter(question => question.category === activeCategory);

  const updateQuestionForm = event => {
    const { name, value } = event.target;
    setQuestionForm(form => ({ ...form, [name]: value }));
  };

  const updateCommentForm = event => {
    const { name, value } = event.target;
    setCommentForm(form => ({ ...form, [name]: value }));
  };

  const submitQuestion = async event => {
    event.preventDefault();
    if (!questionForm.title.trim() || !questionForm.content.trim()) {
      setQuestionStatus('error');
      setQuestionMessage('글 제목과 글 내용을 입력해주세요.');
      return;
    }

    setQuestionStatus('submitting');
    setQuestionMessage('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('비밀번호가 맞지 않습니다. 기본 비밀번호는 sf 입니다.');
        throw new Error(data?.notion?.message || data?.error || '저장에 실패했습니다.');
      }
      setQuestionForm(emptyForm);
      setQuestionStatus('success');
      setQuestionMessage('새 글이 저장되어 게시판에 표시됩니다.');
      loadQuestions();
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
    }
  };

  const submitComment = async event => {
    event.preventDefault();
    if (!commentForm.content.trim()) {
      setCommentStatus('error');
      setCommentMessage('댓글 내용을 입력해주세요.');
      return;
    }

    setCommentStatus('submitting');
    setCommentMessage('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'comment',
          questionId,
          ...commentForm,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('비밀번호가 맞지 않습니다. 기본 비밀번호는 sf 입니다.');
        throw new Error(data?.notion?.message || data?.error || '댓글 저장에 실패했습니다.');
      }
      setCommentForm({ name: '', content: '', password: '' });
      setCommentStatus('success');
      setCommentMessage('댓글이 저장되었습니다.');
      loadQuestionDetail(questionId);
    } catch (error) {
      setCommentStatus('error');
      setCommentMessage(error.message);
    }
  };

  if (questionId) {
    return (
      <PageTransition className="questions-page">
        <header className="questions-header">
          <Link className="questions-back-link" to="/questions">
            <ArrowLeft aria-hidden="true" />
            게시판 목록
          </Link>
          <div>
            <span>COMMUNITY POST</span>
            <h1>게시글</h1>
            <p>게시글 전체 내용과 댓글을 확인하는 공간입니다.</p>
          </div>
          <div className="questions-status">
            <Sparkles aria-hidden="true" />
            <strong>{comments.length} COMMENTS</strong>
          </div>
        </header>

        {activeQuestion ? (
          <article className="question-detail">
            <div className="question-detail-top">
              <span>{activeQuestion.category}</span>
              <em>{activeQuestion.date || 'NO DATE'}</em>
            </div>
            <h2>{activeQuestion.title}</h2>
            <div className="question-detail-meta">
              <span>작성자 {activeQuestion.author}</span>
            </div>
            <p>{activeQuestion.content}</p>
          </article>
        ) : (
          <div className="questions-empty">
            <MessageSquare aria-hidden="true" />
            <strong>{loadStatus === 'loading' ? '게시글을 불러오는 중입니다' : '게시글을 찾을 수 없습니다'}</strong>
            <span>목록으로 돌아가 다시 선택해주세요.</span>
          </div>
        )}

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

          <form className="question-form comment-form" onSubmit={submitComment}>
            <label>
              <span>이름</span>
              <input name="name" onChange={updateCommentForm} placeholder="익명 가능" type="text" value={commentForm.name} />
            </label>
            <label>
              <span>댓글 내용</span>
              <textarea name="content" onChange={updateCommentForm} placeholder="댓글을 입력해주세요." rows="5" value={commentForm.content} />
            </label>
            <label>
              <span>게시판 비밀번호</span>
              <input name="password" onChange={updateCommentForm} placeholder="비밀번호를 입력하세요" type="password" value={commentForm.password} />
            </label>
            <div className="question-form-actions">
              <p className={`question-status is-${commentStatus}`}>
                {commentStatus === 'success' && commentMessage}
                {commentStatus === 'error' && commentMessage}
                {commentStatus === 'submitting' && '댓글을 저장 중입니다.'}
                {commentStatus === 'idle' && '비밀번호를 입력한 뒤 댓글 저장을 눌러주세요.'}
              </p>
              <button type="submit" disabled={commentStatus === 'submitting'}>
                <Send aria-hidden="true" />
                {commentStatus === 'submitting' ? '저장 중' : '댓글 저장'}
              </button>
            </div>
          </form>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="questions-page">
      <header className="questions-header">
        <Link className="questions-back-link" to="/">
          <ArrowLeft aria-hidden="true" />
          SF 탐사단
        </Link>
        <div>
          <span>COMMUNITY BOARD</span>
          <h1>커뮤니티 게시판</h1>
          <p>SF 작품을 읽고 남은 질문, 추천, 수업 주제, 함께 나누고 싶은 이야기를 모아두는 게시판입니다.</p>
        </div>
        <div className="questions-status">
          <Sparkles aria-hidden="true" />
          <strong>{questions.length} QUESTIONS</strong>
        </div>
      </header>

      <nav className="questions-filter" aria-label="커뮤니티 게시판 분류">
        {categories.map(category => (
          <button
            className={activeCategory === category ? 'is-active' : ''}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      <section className="questions-board" aria-label="커뮤니티 게시글">
        <div className="questions-board-head">
          <span>제목</span>
          <span>작성자</span>
          <span>날짜</span>
        </div>
        {visibleQuestions.length > 0 ? visibleQuestions.map(question => (
          <Link className="question-row" key={question.id} to={`/questions/${question.id}`}>
            <strong>{question.title}</strong>
            <span>{question.author}</span>
            <time>{question.date || '-'}</time>
          </Link>
        )) : (
          <div className="questions-empty">
            <MessageSquare aria-hidden="true" />
            <strong>{loadStatus === 'loading' ? '게시글을 불러오는 중입니다' : '아직 게시글이 없습니다'}</strong>
            <span>비밀번호를 입력해 새 글을 남기면 이곳에 바로 표시됩니다.</span>
          </div>
        )}
      </section>

      <section className="question-write-panel" aria-label="커뮤니티 게시글 작성">
        <div className="question-write-brief">
          <MessageSquare aria-hidden="true" />
          <span>WRITE POST</span>
          <h2>새 글 쓰기</h2>
          <p>비밀번호를 입력해 저장하면 게시판 목록에 바로 올라갑니다.</p>
        </div>

        <form className="question-form" onSubmit={submitQuestion}>
          <label>
            <span>글 제목</span>
            <input
              name="title"
              onChange={updateQuestionForm}
              placeholder="예: 인간과 인공지능의 경계는 어디서 무너질까?"
              type="text"
              value={questionForm.title}
            />
          </label>

          <label>
            <span>글 내용</span>
            <textarea
              name="content"
              onChange={updateQuestionForm}
              placeholder="작품명, 장면, 떠오른 생각을 자유롭게 적어주세요."
              rows="7"
              value={questionForm.content}
            />
          </label>

          <div className="question-form-row">
            <label>
              <span>이름</span>
              <input name="name" onChange={updateQuestionForm} placeholder="익명 가능" type="text" value={questionForm.name} />
            </label>
            <label>
              <span>연락처</span>
              <input name="contact" onChange={updateQuestionForm} placeholder="이메일 또는 인스타그램" type="text" value={questionForm.contact} />
            </label>
          </div>

          <label>
            <span>분류</span>
            <select name="category" onChange={updateQuestionForm} value={questionForm.category}>
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
              onChange={updateQuestionForm}
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={questionForm.password}
            />
          </label>

          <div className="question-form-actions">
            <p className={`question-status is-${questionStatus}`}>
              {questionStatus === 'success' && questionMessage}
              {questionStatus === 'error' && questionMessage}
              {questionStatus === 'submitting' && '새 글을 저장 중입니다.'}
              {questionStatus === 'idle' && '비밀번호를 입력한 뒤 새글 저장을 눌러주세요.'}
            </p>
            <button type="submit" disabled={questionStatus === 'submitting'}>
              <Send aria-hidden="true" />
              {questionStatus === 'submitting' ? '저장 중' : '새글 저장'}
            </button>
          </div>
        </form>
      </section>
    </PageTransition>
  );
}
