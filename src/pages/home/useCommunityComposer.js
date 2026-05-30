import { useState } from 'react';
import { recordUserActivity } from '../../lib/activityLogger';

const initialQuestionForm = {
  title: '',
  content: '',
  name: '',
  contact: '',
  category: '커뮤니티',
  password: '',
};

export default function useCommunityComposer({ user }) {
  const [questionForm, setQuestionForm] = useState(initialQuestionForm);
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');

  const updateQuestionForm = event => {
    const { name, value } = event.target;
    setQuestionForm(form => ({ ...form, [name]: value }));
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

      setQuestionForm(initialQuestionForm);
      setQuestionStatus('success');
      setQuestionMessage(user ? '새 글이 저장되었습니다. +20 MP가 반영됩니다.' : '새 글이 저장되었습니다.');
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
    }
  };

  return {
    questionForm,
    questionMessage,
    questionStatus,
    submitQuestion,
    updateQuestionForm,
  };
}
