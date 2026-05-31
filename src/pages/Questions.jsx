import { useState } from 'react';
import { useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import CommentsPanel from './questions/CommentsPanel';
import QuestionDetailView from './questions/QuestionDetailView';
import QuestionsBoard from './questions/QuestionsBoard';
import QuestionsHeader from './questions/QuestionsHeader';
import QuestionWritePanel from './questions/QuestionWritePanel';
import useQuestionsBoard from './questions/useQuestionsBoard';
import './Questions.css';

export default function Questions() {
  const { questionId } = useParams();
  const { user } = useAuth();
  const [localReadingMode, setLocalReadingMode] = useState(false);
  const {
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
  } = useQuestionsBoard({ questionId, user });

  if (questionId) {
    return (
      <PageTransition className="questions-page">
        <QuestionsHeader
          count={`${comments.length} COMMENTS`}
          description="게시글 전체 내용과 댓글을 확인하는 공간입니다."
          eyebrow="COMMUNITY POST"
          homeLink="/questions"
          title="게시글"
        />

        <QuestionDetailView
          activeQuestion={activeQuestion}
          loadStatus={loadStatus}
          localReadingMode={localReadingMode}
          onReadingModeToggle={() => setLocalReadingMode(value => !value)}
        />

        <CommentsPanel
          comments={comments}
          form={commentForm}
          message={commentMessage}
          onChange={updateCommentForm}
          onSubmit={submitComment}
          status={commentStatus}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="questions-page">
      <QuestionsHeader
        count={`${questions.length} QUESTIONS`}
        description="SF 작품을 읽고 남은 질문, 추천, 수업 주제, 함께 나누고 싶은 이야기를 모아두는 게시판입니다."
        eyebrow="COMMUNITY BOARD"
        title="커뮤니티 게시판"
      />

      <QuestionsBoard
        activeCategory={activeCategory}
        categories={categories}
        loadStatus={loadStatus}
        onCategoryChange={setActiveCategory}
        visibleQuestions={visibleQuestions}
      />

      <QuestionWritePanel
        form={questionForm}
        message={questionMessage}
        onChange={updateQuestionForm}
        onSubmit={submitQuestion}
        status={questionStatus}
      />
    </PageTransition>
  );
}
