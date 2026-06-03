import { useState } from 'react';
import { useActivityToast } from '../../context/activityToastContextValue';
import { recordUserActivity } from '../../lib/activityLogger';
import { createCommunityQuestion } from '../questions/communityApi';
import { getCommunityAuthorName, getCommunityOwnerToken } from '../questions/communityIdentity';

const initialQuestionForm = {
  attachmentUrl: '',
  title: '',
  content: '',
  category: '자유글',
};

export default function useCommunityComposer({ onQuestionCreated, user }) {
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
      const data = await createCommunityQuestion({
        ...questionForm,
        name: getCommunityAuthorName(user),
        ownerToken: getCommunityOwnerToken(user),
      });

      await recordUserActivity(user, {
        actionType: 'post',
        points: 20,
        genre: questionForm.category,
        metadata: {
          title: questionForm.title,
          category: questionForm.category,
          question_id: data.question?.id,
          attachment_url: questionForm.attachmentUrl,
          node: 'community-board',
        },
      });

      setQuestionForm(initialQuestionForm);
      setQuestionStatus('success');
      setQuestionMessage('새 글이 저장되었습니다. +20 MP가 반영됩니다.');
      onQuestionCreated?.({
        author: getCommunityAuthorName(user),
        category: questionForm.category,
        content: questionForm.content,
        createdAt: new Date().toISOString(),
        id: data.question?.id ?? '',
        attachmentUrl: questionForm.attachmentUrl,
        title: questionForm.title,
      });
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
