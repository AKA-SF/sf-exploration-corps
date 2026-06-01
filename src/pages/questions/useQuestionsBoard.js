import { useEffect, useMemo, useState } from 'react';
import { recordUserActivity } from '../../lib/activityLogger';

const fallbackQuestions = [];

export const BOARD_CATEGORIES = ['자유글', '작품추천', '질문', '토론'];

export const normalizeQuestionCategory = category => {
  if (category === '작품 추천') return '작품추천';
  if (category === '토론 질문') return '질문';
  if (category === '강의/워크숍 주제' || category === '아카이브 제안' || category === '커뮤니티') return '자유글';
  return BOARD_CATEGORIES.includes(category) ? category : '자유글';
};

const emptyQuestionForm = {
  title: '',
  content: '',
  name: '',
  contact: '',
  category: '자유글',
  password: '',
};

const emptyCommentForm = { name: '', content: '', password: '' };

export default function useQuestionsBoard({ questionId, user }) {
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [comments, setComments] = useState([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [commentForm, setCommentForm] = useState(emptyCommentForm);
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');
  const [commentMessage, setCommentMessage] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');
  const [activeCategory, setActiveCategory] = useState('자유글');

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

  const categories = useMemo(() => BOARD_CATEGORIES, []);

  const visibleQuestions = questions.filter(question => normalizeQuestionCategory(question.category) === activeCategory);

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
      await recordUserActivity(user, {
        actionType: 'post',
        points: 20,
        genre: questionForm.category,
        metadata: {
          title: questionForm.title,
          category: questionForm.category,
          node: 'community-board',
        },
      });
      setQuestionForm(emptyQuestionForm);
      setQuestionStatus('success');
      setQuestionMessage(user ? '새 글이 저장되었습니다. +20 MP가 반영됩니다.' : '새 글이 저장되어 게시판에 표시됩니다.');
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
      await recordUserActivity(user, {
        actionType: 'comment',
        points: 10,
        genre: activeQuestion?.category ?? '커뮤니티',
        metadata: {
          title: `${activeQuestion?.title ?? '커뮤니티 글'} 댓글`,
          question_id: questionId,
          question_title: activeQuestion?.title,
          node: 'community-board',
        },
      });
      setCommentForm(emptyCommentForm);
      setCommentStatus('success');
      setCommentMessage(user ? '댓글이 저장되었습니다. +10 MP가 반영됩니다.' : '댓글이 저장되었습니다.');
      loadQuestionDetail(questionId);
    } catch (error) {
      setCommentStatus('error');
      setCommentMessage(error.message);
    }
  };

  return {
    activeCategory,
    activeQuestion,
    categories,
    commentForm,
    commentMessage,
    comments,
    commentStatus,
    loadStatus,
    questionForm,
    questionMessage,
    questions,
    questionStatus,
    setActiveCategory,
    submitComment,
    submitQuestion,
    updateCommentForm,
    updateQuestionForm,
    visibleQuestions,
  };
}
