import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import './Questions.css';

const fallbackQuestions = [];

const emptyForm = {
  title: '',
  content: '',
  name: '',
  contact: '',
  category: '토론 질문',
};

function excerpt(value) {
  if (!value) return '질문 내용이 공개 대기 중입니다.';
  if (value.length <= 180) return value;
  return `${value.slice(0, 178).trim()}...`;
}

export default function Questions() {
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [questionForm, setQuestionForm] = useState(emptyForm);
  const [questionStatus, setQuestionStatus] = useState('idle');
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

  useEffect(() => {
    loadQuestions();
  }, []);

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

  const submitQuestion = async event => {
    event.preventDefault();
    if (!questionForm.title.trim() || !questionForm.content.trim()) {
      setQuestionStatus('error');
      return;
    }

    setQuestionStatus('submitting');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm),
      });
      if (!response.ok) throw new Error('Question submission failed');
      setQuestionForm(emptyForm);
      setQuestionStatus('success');
      loadQuestions();
    } catch {
      setQuestionStatus('error');
    }
  };

  return (
    <PageTransition className="questions-page">
      <header className="questions-header">
        <Link className="questions-back-link" to="/">
          <ArrowLeft aria-hidden="true" />
          SF 탐사단
        </Link>
        <div>
          <span>DISCUSSION QUESTION VAULT</span>
          <h1>토론 질문 저장소</h1>
          <p>SF 작품을 읽고 남은 질문과 함께 이야기하고 싶은 논점을 모아두는 공개 질문 아카이브입니다.</p>
        </div>
        <div className="questions-status">
          <Sparkles aria-hidden="true" />
          <strong>{questions.length} QUESTIONS</strong>
        </div>
      </header>

      <nav className="questions-filter" aria-label="토론 질문 분류">
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

      <section className="questions-grid" aria-label="공개 토론 질문">
        {visibleQuestions.length > 0 ? visibleQuestions.map(question => (
          <article className="public-question-card" key={`${question.code}-${question.title}`}>
            <div className="public-question-top">
              <span>{question.code}</span>
              <em>{question.category}</em>
            </div>
            <h2>{question.title}</h2>
            <p>{excerpt(question.content)}</p>
            <div className="public-question-meta">
              <span>{question.author}</span>
              {question.date && <span>{question.date}</span>}
            </div>
          </article>
        )) : (
          <div className="questions-empty">
            <MessageSquare aria-hidden="true" />
            <strong>{loadStatus === 'loading' ? '질문 신호를 불러오는 중입니다' : '공개된 질문이 아직 없습니다'}</strong>
            <span>질문을 남기면 관리자가 확인한 뒤 이곳에 공개할 수 있습니다.</span>
          </div>
        )}
      </section>

      <section className="question-write-panel" aria-label="토론 질문 작성">
        <div className="question-write-brief">
          <MessageSquare aria-hidden="true" />
          <span>WRITE QUESTION</span>
          <h2>새 질문 남기기</h2>
          <p>제출된 질문은 바로 공개되지 않고, 저장소에서 확인한 뒤 공개 목록에 올라갑니다.</p>
        </div>

        <form className="question-form" onSubmit={submitQuestion}>
          <label>
            <span>질문 제목</span>
            <input
              name="title"
              onChange={updateQuestionForm}
              placeholder="예: 인간과 인공지능의 경계는 어디서 무너질까?"
              type="text"
              value={questionForm.title}
            />
          </label>

          <label>
            <span>질문 내용</span>
            <textarea
              name="content"
              onChange={updateQuestionForm}
              placeholder="작품명, 장면, 떠오른 질문을 자유롭게 적어주세요."
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
              <option>토론 질문</option>
              <option>작품 추천</option>
              <option>강의/워크숍 주제</option>
              <option>아카이브 제안</option>
            </select>
          </label>

          <div className="question-form-actions">
            <p className={`question-status is-${questionStatus}`}>
              {questionStatus === 'success' && '질문 신호가 저장되었습니다. 확인 후 공개됩니다.'}
              {questionStatus === 'error' && '저장에 실패했습니다. 필수 항목 또는 Notion 연결을 확인해주세요.'}
              {questionStatus === 'submitting' && '질문 신호를 전송 중입니다.'}
              {questionStatus === 'idle' && '제출하면 토론 질문 저장소에 임시 저장됩니다.'}
            </p>
            <button type="submit" disabled={questionStatus === 'submitting'}>
              <Send aria-hidden="true" />
              {questionStatus === 'submitting' ? '전송 중' : '질문 저장'}
            </button>
          </div>
        </form>
      </section>
    </PageTransition>
  );
}
