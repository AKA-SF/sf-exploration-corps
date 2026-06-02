import { useCallback, useEffect, useMemo, useState } from 'react';
import { recordUserActivity } from '../../lib/activityLogger';
import { getCommunityAuthHeaders } from './communityApi';
import { getCommunityAuthorName, getCommunityOwnerToken } from './communityIdentity';

const fallbackQuestions = [];

export const BOARD_CATEGORIES = ['전체', '자유글', '작품추천', '질문', '토론'];

export const normalizeQuestionCategory = category => {
  if (category === '작품 추천') return '작품추천';
  if (category === '토론 질문') return '질문';
  if (category === '강의/워크숍 주제' || category === '아카이브 제안' || category === '커뮤니티') return '자유글';
  return BOARD_CATEGORIES.includes(category) && category !== '전체' ? category : '자유글';
};

const emptyQuestionForm = {
  title: '',
  content: '',
  category: '자유글',
};

const emptyCommentForm = { content: '' };
const QUESTIONS_PAGE_SIZE = 40;

const getOwnerToken = user => {
  const userToken = getCommunityOwnerToken(user);
  if (userToken) return userToken;
  return '';
};

export default function useQuestionsBoard({ onQuestionDeleted, questionId, user }) {
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [comments, setComments] = useState([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [commentForm, setCommentForm] = useState(emptyCommentForm);
  const [questionEditForm, setQuestionEditForm] = useState(emptyQuestionForm);
  const [commentEditForm, setCommentEditForm] = useState(emptyCommentForm);
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');
  const [questionEditStatus, setQuestionEditStatus] = useState('idle');
  const [questionEditMessage, setQuestionEditMessage] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentEditStatus, setCommentEditStatus] = useState('idle');
  const [commentEditMessage, setCommentEditMessage] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');
  const [nextCursor, setNextCursor] = useState('');
  const [hasMoreQuestions, setHasMoreQuestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [isQuestionEditing, setIsQuestionEditing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState('');
  const authorName = getCommunityAuthorName(user);

  const loadQuestions = useCallback(({ cursor = '', append = false } = {}) => {
    const query = new URLSearchParams({ pageSize: String(QUESTIONS_PAGE_SIZE) });
    if (cursor) query.set('cursor', cursor);

    fetch(`/api/questions?${query.toString()}`, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Question archive unavailable');
        return response.json();
      })
      .then(data => {
        const nextQuestions = Array.isArray(data.questions) ? data.questions : fallbackQuestions;
        setQuestions(current => (append ? [...current, ...nextQuestions] : nextQuestions));
        setNextCursor(data.nextCursor || '');
        setHasMoreQuestions(Boolean(data.hasMore));
        setLoadStatus('ready');
      })
      .catch(() => {
        if (!append) setQuestions(fallbackQuestions);
        setLoadStatus('error');
      });
  }, []);

  const loadMoreQuestions = useCallback(() => {
    if (!hasMoreQuestions || !nextCursor) return;
    loadQuestions({ cursor: nextCursor, append: true });
  }, [hasMoreQuestions, loadQuestions, nextCursor]);

  const loadQuestionDetail = useCallback(async id => {
    const ownerToken = getOwnerToken(user);
    const query = new URLSearchParams({ id, ownerToken });
    const authHeaders = await getCommunityAuthHeaders();
    fetch(`/api/questions?${query.toString()}`, { cache: 'no-store', headers: authHeaders })
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
  }, [user]);

  useEffect(() => {
    if (questionId) {
      loadQuestionDetail(questionId);
    } else {
      loadQuestions();
    }
  }, [loadQuestionDetail, loadQuestions, questionId]);

  const categories = useMemo(() => BOARD_CATEGORIES, []);

  const visibleQuestions = activeCategory === '전체'
    ? questions
    : questions.filter(question => normalizeQuestionCategory(question.category) === activeCategory);

  const updateQuestionForm = event => {
    const { name, value } = event.target;
    setQuestionForm(form => ({ ...form, [name]: value }));
  };

  const updateCommentForm = event => {
    const { name, value } = event.target;
    setCommentForm(form => ({ ...form, [name]: value }));
  };

  const updateQuestionEditForm = event => {
    const { name, value } = event.target;
    setQuestionEditForm(form => ({ ...form, [name]: value }));
  };

  const updateCommentEditForm = event => {
    const { name, value } = event.target;
    setCommentEditForm(form => ({ ...form, [name]: value }));
  };

  const submitQuestion = async event => {
    event.preventDefault();
    if (!user) {
      setQuestionStatus('error');
      setQuestionMessage('로그인 후 새 글을 저장할 수 있습니다.');
      return;
    }
    if (!questionForm.title.trim() || !questionForm.content.trim()) {
      setQuestionStatus('error');
      setQuestionMessage('글 제목과 글 내용을 입력해주세요.');
      return;
    }

    setQuestionStatus('submitting');
    setQuestionMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...questionForm,
          name: authorName,
          ownerToken: getOwnerToken(user),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
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
      setQuestionMessage('새 글이 저장되었습니다. +20 MP가 반영됩니다.');
      loadQuestions();
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
    }
  };

  const submitComment = async event => {
    event.preventDefault();
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('로그인 후 댓글을 저장할 수 있습니다.');
      return;
    }
    if (!commentForm.content.trim()) {
      setCommentStatus('error');
      setCommentMessage('댓글 내용을 입력해주세요.');
      return;
    }

    setCommentStatus('submitting');
    setCommentMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mode: 'comment',
          questionId,
          name: authorName,
          ownerToken: getOwnerToken(user),
          ...commentForm,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.notion?.message || data?.error || '댓글 저장에 실패했습니다.');
      }
      const data = await response.json().catch(() => ({}));
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
      if (data.comment) {
        setComments(current => [...current, data.comment]);
      }
      setCommentStatus('success');
      setCommentMessage('댓글이 저장되었습니다. +10 MP가 반영됩니다.');
    } catch (error) {
      setCommentStatus('error');
      setCommentMessage(error.message);
    }
  };

  const beginQuestionEdit = () => {
    if (!activeQuestion?.canEdit) return;
    setQuestionEditForm({
      title: activeQuestion.title ?? '',
      content: activeQuestion.content ?? '',
      category: normalizeQuestionCategory(activeQuestion.category),
    });
    setQuestionEditMessage('');
    setQuestionEditStatus('idle');
    setIsQuestionEditing(true);
  };

  const cancelQuestionEdit = () => {
    setIsQuestionEditing(false);
    setQuestionEditMessage('');
    setQuestionEditStatus('idle');
  };

  const submitQuestionEdit = async event => {
    event.preventDefault();
    if (!questionEditForm.title.trim() || !questionEditForm.content.trim()) {
      setQuestionEditStatus('error');
      setQuestionEditMessage('글 제목과 글 내용을 입력해주세요.');
      return;
    }

    setQuestionEditStatus('submitting');
    setQuestionEditMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mode: 'post',
          questionId,
          name: activeQuestion.author,
          contact: activeQuestion.contact,
          ownerToken: getOwnerToken(user),
          ...questionEditForm,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.notion?.message || data?.error || '글 수정에 실패했습니다.');
      }
      const data = await response.json().catch(() => ({}));
      setActiveQuestion(current => ({
        ...(current ?? {}),
        ...(data.question ?? questionEditForm),
        canEdit: true,
      }));
      setIsQuestionEditing(false);
      setQuestionEditStatus('success');
      setQuestionEditMessage('글이 수정되었습니다.');
    } catch (error) {
      setQuestionEditStatus('error');
      setQuestionEditMessage(error.message);
    }
  };

  const deleteQuestion = async () => {
    if (!questionId || !activeQuestion?.canEdit) return;
    const shouldDelete = window.confirm('이 글을 삭제할까요? 삭제 후에는 게시판에서 보이지 않습니다.');
    if (!shouldDelete) return;

    setQuestionEditStatus('submitting');
    setQuestionEditMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mode: 'post',
          questionId,
          ownerToken: getOwnerToken(user),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.notion?.message || data?.error || '글 삭제에 실패했습니다.');
      }
      setQuestionEditStatus('success');
      setQuestionEditMessage('글이 삭제되었습니다.');
      onQuestionDeleted?.();
    } catch (error) {
      setQuestionEditStatus('error');
      setQuestionEditMessage(error.message);
    }
  };

  const beginCommentEdit = comment => {
    if (!comment?.canEdit) return;
    setEditingCommentId(comment.id);
    setCommentEditForm({
      content: comment.content ?? '',
    });
    setCommentEditStatus('idle');
    setCommentEditMessage('');
  };

  const cancelCommentEdit = () => {
    setEditingCommentId('');
    setCommentEditForm(emptyCommentForm);
    setCommentEditStatus('idle');
    setCommentEditMessage('');
  };

  const submitCommentEdit = async event => {
    event.preventDefault();
    if (!editingCommentId || !commentEditForm.content.trim()) {
      setCommentEditStatus('error');
      setCommentEditMessage('댓글 내용을 입력해주세요.');
      return;
    }

    setCommentEditStatus('submitting');
    setCommentEditMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mode: 'comment',
          commentId: editingCommentId,
          name: comments.find(comment => comment.id === editingCommentId)?.name || authorName,
          ownerToken: getOwnerToken(user),
          ...commentEditForm,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.notion?.message || data?.error || '댓글 수정에 실패했습니다.');
      }
      const data = await response.json().catch(() => ({}));
      if (data.comment) {
        setComments(current => current.map(comment => (
          comment.id === editingCommentId ? data.comment : comment
        )));
      }
      setEditingCommentId('');
      setCommentEditForm(emptyCommentForm);
      setCommentEditStatus('success');
      setCommentEditMessage('댓글이 수정되었습니다.');
    } catch (error) {
      setCommentEditStatus('error');
      setCommentEditMessage(error.message);
    }
  };

  const deleteComment = async commentId => {
    const target = comments.find(comment => comment.id === commentId);
    if (!target?.canEdit) return;
    const shouldDelete = window.confirm('이 댓글을 삭제할까요?');
    if (!shouldDelete) return;

    setCommentEditStatus('submitting');
    setCommentEditMessage('');

    try {
      const authHeaders = await getCommunityAuthHeaders();
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mode: 'comment',
          commentId,
          ownerToken: getOwnerToken(user),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.notion?.message || data?.error || '댓글 삭제에 실패했습니다.');
      }
      setComments(current => current.filter(comment => comment.id !== commentId));
      setCommentEditStatus('success');
      setCommentEditMessage('댓글이 삭제되었습니다.');
    } catch (error) {
      setCommentEditStatus('error');
      setCommentEditMessage(error.message);
    }
  };

  return {
    activeCategory,
    activeQuestion,
    authorName,
    beginCommentEdit,
    beginQuestionEdit,
    cancelCommentEdit,
    cancelQuestionEdit,
    categories,
    commentEditForm,
    commentEditMessage,
    commentEditStatus,
    commentForm,
    commentMessage,
    comments,
    commentStatus,
    deleteComment,
    deleteQuestion,
    editingCommentId,
    isQuestionEditing,
    hasMoreQuestions,
    loadStatus,
    loadMoreQuestions,
    questionEditForm,
    questionEditMessage,
    questionEditStatus,
    questionForm,
    questionMessage,
    questions,
    questionStatus,
    setActiveCategory,
    submitComment,
    submitCommentEdit,
    submitQuestion,
    submitQuestionEdit,
    updateCommentEditForm,
    updateCommentForm,
    updateQuestionEditForm,
    updateQuestionForm,
    visibleQuestions,
  };
}
