import { useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getRandomWorks } from './home/homeUtils';
import WorkArchiveFormPanel from './home/WorkArchiveFormPanel';
import WorkDetailPanel from './home/WorkDetailPanel';
import useWorkArchiveInteractions from './home/useWorkArchiveInteractions';
import WorksArchiveGrid from './works/WorksArchiveGrid';
import WorksArchiveHeader from './works/WorksArchiveHeader';
import WorksArchiveSearch from './works/WorksArchiveSearch';
import WorksArchiveTabs from './works/WorksArchiveTabs';
import useWorksArchivePage from './works/useWorksArchivePage';
import './WorksArchive.css';
import './home/WorksArchiveSection.css';

export default function WorksArchive() {
  const { user } = useAuth();
  const { categorySlug = 'novels' } = useParams();
  const {
    activeCategory,
    categoryWorks,
    searchQuery,
    setSearchQuery,
    setWorks,
    status,
    visibleWorks,
    workCategories,
  } = useWorksArchivePage(categorySlug);
  const {
    closeWorkDetail,
    commentMessage,
    commentStatus,
    commentText,
    isWorkSubmitOpen,
    openWorkDetail,
    openWorkSubmit,
    selectedWork,
    setCommentText,
    setIsWorkSubmitOpen,
    submitWorkArchive,
    submitWorkComment,
    updateWorkStatus,
    updateWorkSubmitForm,
    workComments,
    workStatusSaving,
    workStatuses,
    workSubmitForm,
    workSubmitMessage,
    workSubmitStatus,
  } = useWorkArchiveInteractions({
    getRandomWorks,
    setRandomWorkCodes: () => {},
    setWorks,
    user,
  });

  return (
    <PageTransition className="works-full-page">
      <WorksArchiveHeader
        activeCategory={activeCategory}
        onOpenWorkSubmit={openWorkSubmit}
        visibleCount={visibleWorks.length}
      />

      <WorksArchiveTabs activeCategory={activeCategory} workCategories={workCategories} />

      <WorksArchiveSearch
        categoryCount={categoryWorks.length}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        visibleCount={visibleWorks.length}
      />

      <WorksArchiveGrid
        activeCategory={activeCategory}
        categoryCount={categoryWorks.length}
        onOpenWorkDetail={openWorkDetail}
        status={status}
        visibleWorks={visibleWorks}
      />

      {isWorkSubmitOpen && (
        <WorkArchiveFormPanel
          form={workSubmitForm}
          message={workSubmitMessage}
          onChange={updateWorkSubmitForm}
          onClose={() => setIsWorkSubmitOpen(false)}
          onSubmit={submitWorkArchive}
          status={workSubmitStatus}
        />
      )}

      <WorkDetailPanel
        commentMessage={commentMessage}
        commentStatus={commentStatus}
        comments={workComments}
        commentText={commentText}
        onClose={closeWorkDetail}
        onCommentSubmit={submitWorkComment}
        onCommentTextChange={setCommentText}
        onWorkStatusChange={updateWorkStatus}
        user={user}
        work={selectedWork}
        workStatus={selectedWork ? workStatuses[selectedWork.code] : ''}
        workStatusSaving={workStatusSaving}
      />
    </PageTransition>
  );
}
