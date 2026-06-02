import { useState } from 'react';
import { useActivityToast } from '../../context/activityToastContextValue';
import { recordUserActivity } from '../../lib/activityLogger';
import { getCommunityAuthHeaders } from '../questions/communityApi';
import { getCommunityAuthorName, getCommunityOwnerToken } from '../questions/communityIdentity';

const initialQuestionForm = {
  title: '',
  content: '',
  category: '자유글',
};

export default function useCommunityComposer({ user }) {
  const { showActivityToast } = useActivityToast();
  const [questionForm, setQuestionForm] = useState(initialQuestionForm);
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');

  const updateQuestionForm = event => {
    const { name, value } = event.target;
    setQuestionForm(form => ({ ...form, [name]: value }));
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
          name: getCommunityAuthorName(user),
          ownerToken: getCommunityOwnerToken(user),
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

      setQuestionForm(initialQuestionForm);
      setQuestionStatus('success');
      setQuestionMessage('새 글이 저장되었습니다. +20 MP가 반영됩니다.');
      showActivityToast({
        detail: `${questionForm.category} 게시글 신호가 커뮤니티에 저장되었습니다.`,
        points: 20,
        title: '커뮤니티 교신 기록',
      });
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
    }
  };

  return {
    authorName: getCommunityAuthorName(user),
    isAuthenticated: Boolean(user),
    questionForm,
    questionMessage,
    questionStatus,
    submitQuestion,
    updateQuestionForm,
  };
}
