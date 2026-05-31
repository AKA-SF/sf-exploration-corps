import { useCallback, useEffect, useMemo, useState } from 'react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import ArchiveDock from './home/ArchiveDock';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import ContactSection from './home/ContactSection';
import CoordinateLogModal from './home/CoordinateLogModal';
import CoordinatesSection from './home/CoordinatesSection';
import HeroSection from './home/HeroSection';
import HomeTopBar from './home/HomeTopBar';
import MediaArchiveSection from './home/MediaArchiveSection';
import TasteTestSection from './home/TasteTestSection';
import WorkArchiveFormPanel from './home/WorkArchiveFormPanel';
import WorkDetailPanel from './home/WorkDetailPanel';
import WorksArchiveSection from './home/WorksArchiveSection';
import {
  archiveCards,
  conceptEntries,
  contactChannels,
  fallbackWorks,
  navItems,
} from './home/homeContent';
import {
  formatTimestamp,
  getConceptSource,
  getRandomWorks,
  mergeWorksByCode,
} from './home/homeUtils';
import useCommunityComposer from './home/useCommunityComposer';
import useConceptDictionary from './home/useConceptDictionary';
import useCoordinateMap from './home/useCoordinateMap';
import useHomeData from './home/useHomeData';
import useHomeStatus from './home/useHomeStatus';
import useMediaArchivePreview from './home/useMediaArchivePreview';
import useTasteTest from './home/useTasteTest';
import useWorkArchiveInteractions from './home/useWorkArchiveInteractions';
import './Home.css';
import './home/WorksArchiveSection.css';
import './home/MediaArchiveSection.css';
import './home/CoordinatesSection.css';
import './home/ConceptDictionarySection.css';
import './home/CommunitySection.css';
import './home/HomeResponsive.css';

export default function Home() {
  const { user } = useAuth();
  const archiveMode = 'random';
  const {
    activeConceptCode,
    communitySectionRef,
    conceptSectionRef,
    concepts,
    dashboard,
    mediaArchiveRef,
    mediaItems,
    randomConceptCodes,
    randomWorkCodes,
    setActiveConceptCode,
    setDashboard,
    setRandomWorkCodes,
    setWorks,
    works,
    worksArchiveRef,
  } = useHomeData({
    conceptEntries,
    fallbackWorks,
    getRandomWorks,
    mergeWorksByCode,
  });
  const {
    questionForm,
    questionMessage,
    questionStatus,
    submitQuestion,
    updateQuestionForm,
  } = useCommunityComposer({ user });
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
    setRandomWorkCodes,
    setWorks,
    user,
  });

  const recordMissionSignal = useCallback(async (signalKey, activity) => {
    if (!user) return;
    const storageKey = `sf-mission-signal:${user.id}:${signalKey}`;
    if (localStorage.getItem(storageKey)) return;
    const result = await recordUserActivity(user, activity);
    if (result?.ok) localStorage.setItem(storageKey, '1');
  }, [user]);

  const {
    activeGenre,
    coordinateLogMessage,
    coordinateLogStatus,
    coordinateLogUrl,
    handleGenreNodeClick,
    hasCoordinateFocus,
    isLogModalOpen,
    mapDescription,
    mapPositions,
    minimapViewport,
    openCoordinateLogModal,
    relatedCoordinateIds,
    resetCoordinateMap,
    selectedCoordinate,
    selectedCoordinateConcepts,
    selectedCoordinateId,
    selectedCoordinateQuestions,
    selectedCoordinateWorks,
    setCoordinateLogUrl,
    setIsLogModalOpen,
    setMapView,
    submitCoordinateLog,
    visibleConnections,
  } = useCoordinateMap({
    concepts,
    setDashboard,
    works,
  });
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const recordTasteComplete = useCallback((tasteProfileResult) => recordMissionSignal(`taste:${tasteProfileResult.code}`, {
    actionType: 'taste_test',
    points: 10,
    genre: tasteProfileResult.genre,
    metadata: {
      title: '나의 SF 성향 테스트 완료',
      taste_code: tasteProfileResult.code,
      taste_title: tasteProfileResult.title,
      node: 'taste-test',
    },
  }), [recordMissionSignal]);
  const recordConceptRead = useCallback((code, concept) => recordMissionSignal(`concept:${code}`, {
    actionType: 'concept_read',
    points: 5,
    genre: concept?.category || 'SF 개념 사전',
    metadata: {
      title: concept?.term || code,
      concept_code: code,
      node: 'concept-dictionary',
    },
  }), [recordMissionSignal]);

  const {
    resetTasteTest,
    tasteAnswers,
    tasteProfile,
    tasteQuestionSet,
    tasteRecommendations,
    updateTasteAnswer,
  } = useTasteTest({
    works,
    onComplete: recordTasteComplete,
  });
  const {
    activeMediaArchivePath,
    activeMediaCategory,
    mediaCategories,
    previewMedia,
    setActiveMediaCategory,
  } = useMediaArchivePreview(mediaItems);
  const {
    conceptFeatureRef,
    conceptReadingMode,
    selectConcept,
    selectedConcept,
    setConceptReadingMode,
    setShowAllConcepts,
    showAllConcepts,
    visibleConcepts,
  } = useConceptDictionary({
    activeConceptCode,
    concepts,
    randomConceptCodes,
    setActiveConceptCode,
    onConceptRead: recordConceptRead,
  });

  const displayedWorks = works.filter(work => randomWorkCodes.includes(work.code)).slice(0, 6);
  const workCategoryCounts = useMemo(() => Object.fromEntries(
    workCategories.map(category => [
      category.slug,
      works.filter(work => getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === category.slug).length,
    ]),
  ), [works]);
  const { metrics, recentSignals, systemReady } = useHomeStatus({
    concepts,
    dashboard,
    mediaItems,
    selectedConcept,
    works,
  });

  return (
    <PageTransition className="archive-home">
      <HomeTopBar
        navItems={navItems}
        onResetCoordinateMap={resetCoordinateMap}
        systemReady={systemReady}
      />

      <HeroSection
        activeGenre={activeGenre}
        archiveMode={archiveMode}
        metrics={metrics}
        onResetCoordinateMap={resetCoordinateMap}
        recentSignals={recentSignals}
        timestamp={formatTimestamp(currentTime)}
      />

      <ArchiveDock archiveCards={archiveCards} onResetCoordinateMap={resetCoordinateMap} />

      <TasteTestSection
        onAnswer={updateTasteAnswer}
        onReset={resetTasteTest}
        tasteAnswers={tasteAnswers}
        tasteProfile={tasteProfile}
        tasteQuestionSet={tasteQuestionSet}
        tasteRecommendations={tasteRecommendations}
      />

      <div ref={worksArchiveRef}>
        <WorksArchiveSection
          displayedWorks={displayedWorks}
          onOpenWorkDetail={openWorkDetail}
          onOpenWorkSubmit={openWorkSubmit}
          selectedWork={selectedWork}
          workCategories={workCategories}
          workCategoryCounts={workCategoryCounts}
          worksCount={works.length}
        />
      </div>

      <div ref={mediaArchiveRef}>
        <MediaArchiveSection
          activeMediaArchivePath={activeMediaArchivePath}
          activeMediaCategory={activeMediaCategory}
          mediaCategories={mediaCategories}
          onMediaCategoryChange={setActiveMediaCategory}
          onRecordMediaSignal={item => recordMissionSignal(`media:${item.code}`, {
            actionType: 'media_visit',
            points: 3,
            genre: item.category || activeMediaCategory,
            metadata: {
              title: item.title,
              media_code: item.code,
              node: 'media-archive',
            },
          })}
          previewMedia={previewMedia}
        />
      </div>

      <CoordinatesSection
        activeGenre={activeGenre}
        hasCoordinateFocus={hasCoordinateFocus}
        mapDescription={mapDescription}
        mapPositions={mapPositions}
        minimapViewport={minimapViewport}
        onConceptSelect={selectConcept}
        onLogOpen={openCoordinateLogModal}
        onNodeSelect={handleGenreNodeClick}
        onReset={resetCoordinateMap}
        onViewChange={setMapView}
        relatedCoordinateIds={relatedCoordinateIds}
        selectedCoordinate={selectedCoordinate}
        selectedCoordinateConcepts={selectedCoordinateConcepts}
        selectedCoordinateId={selectedCoordinateId}
        selectedCoordinateQuestions={selectedCoordinateQuestions}
        selectedCoordinateWorks={selectedCoordinateWorks}
        visibleConnections={visibleConnections}
      />

      <div ref={conceptSectionRef}>
        <ConceptDictionarySection
          conceptFeatureRef={conceptFeatureRef}
          conceptReadingMode={conceptReadingMode}
          conceptsCount={concepts.length}
          getConceptSource={getConceptSource}
          onConceptSelect={selectConcept}
          onReadingModeToggle={() => setConceptReadingMode(value => !value)}
          onShowAllToggle={() => setShowAllConcepts(value => !value)}
          selectedConcept={selectedConcept}
          showAllConcepts={showAllConcepts}
          visibleConcepts={visibleConcepts}
        />
      </div>

      <div ref={communitySectionRef}>
        <CommunitySection
          onQuestionFormChange={updateQuestionForm}
          onQuestionSubmit={submitQuestion}
          questionForm={questionForm}
          questionMessage={questionMessage}
          questionStatus={questionStatus}
        />
      </div>

      <ContactSection contactChannels={contactChannels} />

      {isLogModalOpen && (
        <CoordinateLogModal
          coordinateLogMessage={coordinateLogMessage}
          coordinateLogStatus={coordinateLogStatus}
          coordinateLogUrl={coordinateLogUrl}
          onClose={() => setIsLogModalOpen(false)}
          onSubmit={submitCoordinateLog}
          onUrlChange={setCoordinateLogUrl}
          selectedCoordinate={selectedCoordinate}
        />
      )}

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
        commentText={commentText}
        comments={workComments}
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
