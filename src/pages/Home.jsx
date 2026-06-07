import { lazy, Suspense, useCallback, useMemo } from 'react';
import PageTransition from '../components/PageTransition';
import { useActivityToast } from '../context/activityToastContextValue';
import { useAuth } from '../context/authContextValue';
import { getStorageItem, setStorageItem } from '../lib/browserStorage';
import ArchiveDock from './home/ArchiveDock';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import ContactSection from './home/ContactSection';
import CoordinatesSection from './home/CoordinatesSection';
import HeroSection from './home/HeroSection';
import HomeGuideSection from './home/HomeGuideSection';
import HomeTopBar from './home/HomeTopBar';
import MediaArchiveSection from './home/MediaArchiveSection';
import TasteTestSection from './home/TasteTestSection';
import WorksArchiveSection from './home/WorksArchiveSection';
import {
  archiveCards,
  conceptEntries,
  contactChannels,
  fallbackWorks,
  navItems,
} from './home/homeContent';
import {
  getConceptSource,
  getRandomWorks,
  mergeWorksByCode,
} from './home/homeUtils';
import useCommunityComposer from './home/useCommunityComposer';
import useConceptDictionary from './home/useConceptDictionary';
import useCoordinateMap from './home/useCoordinateMap';
import useHomeData from './home/useHomeData';
import useHomeModalProps from './home/useHomeModalProps';
import useHomeStatus from './home/useHomeStatus';
import useMediaArchivePreview from './home/useMediaArchivePreview';
import useTasteTest from './home/useTasteTest';
import useWorkArchiveInteractions from './home/useWorkArchiveInteractions';
import useWorksArchivePreview from './home/useWorksArchivePreview';
import './Home.css';
import './home/HeroSection.css';
import './home/HomeGuideSection.css';
import './home/ArchiveDock.css';
import './home/WorksArchiveSection.css';
import './home/MediaArchiveSection.css';
import './home/CoordinatesSection.css';
import './home/ConceptDictionarySection.css';
import './home/CommunitySection.css';
import './home/HomeResponsive.css';
import '../styles/MobileExperience.css';

const HomeModals = lazy(() => import('./home/HomeModals'));

function getSignalSearchText(item) {
  return [
    item?.title,
    item?.term,
    item?.english,
    item?.subtitle,
    item?.medium,
    item?.category,
    item?.summary,
    item?.content,
    item?.author,
    ...(item?.tags ?? []),
    ...(item?.keywords ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function getRelatedItemsForWork(work, items, limit = 4) {
  if (!work) return [];
  const keywords = [
    work.title,
    work.medium,
    ...(work.tags ?? []),
    ...String(work.subtitle ?? '').split(/[,\s/]+/),
  ].filter(Boolean).map(keyword => String(keyword).trim().toLowerCase()).filter(keyword => keyword.length > 1);

  return items
    .filter(item => item && item.code !== work.code)
    .map(item => {
      const text = getSignalSearchText(item);
      const score = keywords.reduce((total, keyword) => (
        text.includes(keyword.replace(/\s/g, '')) || text.includes(keyword) ? total + 1 : total
      ), 0);
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item)
    .slice(0, limit);
}

export default function Home() {
  const { user } = useAuth();
  const { showActivityToast } = useActivityToast();
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
    authorName: communityAuthorName,
    isAuthenticated: isCommunityAuthenticated,
    questionForm,
    questionMessage,
    questionStatus,
    submitQuestion,
    updateQuestionForm,
  } = useCommunityComposer({
    onQuestionCreated: question => setDashboard(state => ({
      ...state,
      questions: [question, ...state.questions],
      loadState: { ...state.loadState, questions: 'ready' },
      status: { ...state.status, questions: true },
    })),
    user,
  });
  const workArchiveControls = useWorkArchiveInteractions({
    getRandomWorks,
    setRandomWorkCodes,
    setWorks,
    user,
  });
  const {
    openWorkDetail,
    openWorkSubmit,
    selectedWork,
  } = workArchiveControls;

  const recordMissionSignal = useCallback(async (signalKey, activity) => {
    if (!user) return;
    const storageKey = `sf-mission-signal:${user.id}:${signalKey}`;
    if (getStorageItem(storageKey, '')) return;
    const { recordUserActivity } = await import('../lib/activityLogger');
    const result = await recordUserActivity(user, {
      ...activity,
      dedupeKey: activity.dedupeKey || signalKey,
    });
    if (result?.ok) {
      setStorageItem(storageKey, '1');
      if (!result.skipped) {
        showActivityToast({
          detail: `${activity.metadata?.title || activity.genre || '탐사 활동'} 신호가 기록되었습니다.`,
          points: activity.points ?? 0,
          title: '탐사 기록 갱신',
        });
      }
    }
  }, [showActivityToast, user]);

  const coordinateControls = useCoordinateMap({
    concepts,
    questions: dashboard.questions,
    setDashboard,
    works,
  });
  const {
    activeGenre,
    handleGenreNodeClick,
    hasCoordinateFocus,
    mapDescription,
    mapPositions,
    minimapViewport,
    openCoordinateLogModal,
    relatedCoordinateIds,
    recommendedRoutes,
    resetCoordinateMap,
    selectedCoordinate,
    selectedCoordinateConcepts,
    selectedCoordinateId,
    selectedCoordinateRoutes,
    selectedCoordinateBoardQuestions,
    selectedCoordinateQuestions,
    selectedCoordinateWorks,
    setMapView,
    visibleConnections,
  } = coordinateControls;
  const modalProps = useHomeModalProps({
    coordinate: {
      ...coordinateControls,
      closeCoordinateLogModal: () => coordinateControls.setIsLogModalOpen(false),
    },
    workArchive: {
      ...workArchiveControls,
      closeWorkSubmit: () => workArchiveControls.setIsWorkSubmitOpen(false),
    },
  });
  const workDetailRecommendations = useMemo(() => ({
    concepts: getRelatedItemsForWork(selectedWork, concepts, 3),
    questions: getRelatedItemsForWork(selectedWork, dashboard.questions, 3),
    works: getRelatedItemsForWork(selectedWork, works, 3),
  }), [concepts, dashboard.questions, selectedWork, works]);
  const shouldRenderHomeModals = modalProps.coordinateLog.isOpen
    || modalProps.workArchive.isSubmitOpen
    || Boolean(modalProps.workArchive.selectedWork);
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
  const recordMediaSignal = useCallback((item) => recordMissionSignal(`media:${item.code}`, {
    actionType: 'media_visit',
    points: 3,
    genre: item.category || activeMediaCategory,
    metadata: {
      title: item.title,
      media_code: item.code,
      node: 'media-archive',
    },
  }), [activeMediaCategory, recordMissionSignal]);
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
  const toggleConceptReadingMode = useCallback(() => setConceptReadingMode(value => !value), [setConceptReadingMode]);
  const toggleShowAllConcepts = useCallback(() => setShowAllConcepts(value => !value), [setShowAllConcepts]);

  const {
    displayedWorks,
    workCategories,
    workCategoryCounts,
  } = useWorksArchivePreview({ randomWorkCodes, works });
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
        todaySignal={metrics.todaySignal}
      />

      <ArchiveDock archiveCards={archiveCards} metrics={metrics} onResetCoordinateMap={resetCoordinateMap} />

      <HomeGuideSection
        concepts={visibleConcepts}
        mediaItems={previewMedia}
        questions={dashboard.questions}
        works={displayedWorks}
      />

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
          onRecordMediaSignal={recordMediaSignal}
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
        onOpenWorkDetail={openWorkDetail}
        onReset={resetCoordinateMap}
        onViewChange={setMapView}
        relatedCoordinateIds={relatedCoordinateIds}
        recommendedRoutes={recommendedRoutes}
        selectedCoordinate={selectedCoordinate}
        selectedCoordinateConcepts={selectedCoordinateConcepts}
        selectedCoordinateId={selectedCoordinateId}
        selectedCoordinateRoutes={selectedCoordinateRoutes}
        selectedCoordinateBoardQuestions={selectedCoordinateBoardQuestions}
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
          onReadingModeToggle={toggleConceptReadingMode}
          onShowAllToggle={toggleShowAllConcepts}
          selectedConcept={selectedConcept}
          showAllConcepts={showAllConcepts}
          visibleConcepts={visibleConcepts}
        />
      </div>

      <div ref={communitySectionRef}>
        <CommunitySection
          authorName={communityAuthorName}
          isAuthenticated={isCommunityAuthenticated}
          onQuestionFormChange={updateQuestionForm}
          onQuestionSubmit={submitQuestion}
          questionForm={questionForm}
          questionLoadState={dashboard.loadState?.questions}
          questionMessage={questionMessage}
          questionStatus={questionStatus}
          questions={dashboard.questions}
        />
      </div>

      <ContactSection contactChannels={contactChannels} />

      {shouldRenderHomeModals && (
        <Suspense fallback={null}>
          <HomeModals
            user={user}
            workDetailRecommendations={workDetailRecommendations}
            {...modalProps}
          />
        </Suspense>
      )}
    </PageTransition>
  );
}
