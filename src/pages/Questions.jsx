import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PenLine, X } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import CommentsPanel from './questions/CommentsPanel';
import QuestionDetailView from './questions/QuestionDetailView';
import QuestionsBoard from './questions/QuestionsBoard';
import QuestionsHeader from './questions/QuestionsHeader';
import QuestionWritePanel from './questions/QuestionWritePanel';
import useQuestionsBoard from './questions/useQuestionsBoard';
import './Questions.css';
import '../styles/MobileExperience.css';

function focusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

export default function Questions() {
  const { questionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localReadingMode, setLocalReadingMode] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const composerTriggerRef = useRef(null);
  const composerDialogRef = useRef(null);
  const composerCloseRef = useRef(null);
  const {
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
    commentsLoadStatus,
    commentStatus,
    deleteComment,
    deleteQuestion,
    editingCommentId,
    hasMoreQuestions,
    isQuestionEditing,
    loadStatus,
    loadMoreQuestions,
    prepareQuestionDetail,
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
  } = useQuestionsBoard({
    questionId,
    questionPreview: questionId && location.state?.question?.id === questionId ? location.state.question : null,
    user,
    onQuestionDeleted: () => navigate('/questions'),
  });

  useEffect(() => {
    if (!isComposerOpen) return undefined;

    const composerTrigger = composerTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    composerCloseRef.current?.focus();

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsComposerOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = focusableElements(composerDialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      composerTrigger?.focus();
    };
  }, [isComposerOpen]);

  if (questionId) {
    return (
      <PageTransition className="questions-page">
        <QuestionsHeader
          count={commentsLoadStatus === 'loading' ? 'COMMENTS LOADING' : `${comments.length} COMMENTS`}
          description="게시글 전체 내용과 댓글을 확인하는 공간입니다."
          eyebrow="COMMUNITY POST"
          homeLink="/questions"
          title="게시글"
        />

        <QuestionDetailView
          activeQuestion={activeQuestion}
          editForm={questionEditForm}
          editMessage={questionEditMessage}
          editStatus={questionEditStatus}
          isEditing={isQuestionEditing}
          loadStatus={loadStatus}
          localReadingMode={localReadingMode}
          onDelete={deleteQuestion}
          onEditCancel={cancelQuestionEdit}
          onEditChange={updateQuestionEditForm}
          onEditStart={beginQuestionEdit}
          onEditSubmit={submitQuestionEdit}
          onReadingModeToggle={() => setLocalReadingMode(value => !value)}
        />

        {activeQuestion && (
          <CommentsPanel
            authorName={authorName}
            editForm={commentEditForm}
            editMessage={commentEditMessage}
            editingCommentId={editingCommentId}
            editStatus={commentEditStatus}
            comments={comments}
            form={commentForm}
            isAuthenticated={Boolean(user)}
            loadStatus={commentsLoadStatus}
            message={commentMessage}
            onChange={updateCommentForm}
            onDeleteComment={deleteComment}
            onEditCancel={cancelCommentEdit}
            onEditChange={updateCommentEditForm}
            onEditStart={beginCommentEdit}
            onEditSubmit={submitCommentEdit}
            onSubmit={submitComment}
            status={commentStatus}
          />
        )}
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
        hasMoreQuestions={hasMoreQuestions}
        loadStatus={loadStatus}
        onCategoryChange={setActiveCategory}
        onLoadMore={loadMoreQuestions}
        onQuestionSelect={prepareQuestionDetail}
        questions={questions}
        visibleQuestions={visibleQuestions}
      />

      <button className="question-write-fab" onClick={() => setIsComposerOpen(true)} ref={composerTriggerRef} type="button">
        <PenLine aria-hidden="true" />
        <span>새 글 쓰기</span>
      </button>

      {isComposerOpen && (
        <div className="question-write-modal" role="dialog" aria-modal="true" aria-label="새 글 쓰기">
          <div aria-hidden="true" className="question-write-backdrop" onClick={() => setIsComposerOpen(false)} />
          <div className="question-write-dialog" ref={composerDialogRef}>
            <button className="question-write-close" onClick={() => setIsComposerOpen(false)} ref={composerCloseRef} type="button">
              <X aria-hidden="true" />
              닫기
            </button>
            <QuestionWritePanel
              authorName={authorName}
              form={questionForm}
              isAuthenticated={Boolean(user)}
              message={questionMessage}
              onChange={updateQuestionForm}
              onSubmit={submitQuestion}
              status={questionStatus}
            />
          </div>
        </div>
      )}
    </PageTransition>
  );
}
