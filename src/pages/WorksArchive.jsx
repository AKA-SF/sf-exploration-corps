import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
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
import '../styles/MobileExperience.css';

function getWorkSearchText(work) {
  return [
    work.title,
    work.subtitle,
    work.medium,
    work.category,
    ...(work.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function getRelatedWorks(work, works) {
  if (!work) return [];
  const keywords = [work.medium, ...(work.tags ?? []), ...String(work.subtitle ?? '').split(/[,\s/]+/)]
    .filter(Boolean)
    .map(keyword => String(keyword).trim().toLowerCase())
    .filter(keyword => keyword.length > 1);

  return works
    .filter(item => item.code !== work.code)
    .map(item => {
      const text = getWorkSearchText(item);
      const score = keywords.reduce((total, keyword) => (
        text.includes(keyword.replace(/\s/g, '')) || text.includes(keyword) ? total + 1 : total
      ), 0);
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item)
    .slice(0, 3);
}

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
  const relatedWorks = useMemo(() => getRelatedWorks(selectedWork, visibleWorks), [selectedWork, visibleWorks]);

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
        onRelatedWorkOpen={openWorkDetail}
        onWorkStatusChange={updateWorkStatus}
        relatedWorks={relatedWorks}
        user={user}
        work={selectedWork}
        workStatus={selectedWork ? workStatuses[selectedWork.code] : ''}
        workStatusSaving={workStatusSaving}
      />
    </PageTransition>
  );
}
