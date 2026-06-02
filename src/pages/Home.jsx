import { useCallback } from 'react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { recordUserActivity } from '../lib/activityLogger';
import { getStorageItem, setStorageItem } from '../lib/browserStorage';
import ArchiveDock from './home/ArchiveDock';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import ContactSection from './home/ContactSection';
import CoordinatesSection from './home/CoordinatesSection';
import HeroSection from './home/HeroSection';
import HomeModals from './home/HomeModals';
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
import './home/ArchiveDock.css';
import './home/WorksArchiveSection.css';
import './home/MediaArchiveSection.css';
import './home/CoordinatesSection.css';
import './home/ConceptDictionarySection.css';
import './home/CommunitySection.css';
import './home/HomeResponsive.css';
import '../styles/MobileExperience.css';

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
    authorName: communityAuthorName,
    isAuthenticated: isCommunityAuthenticated,
    questionForm,
    questionMessage,
    questionStatus,
    submitQuestion,
    updateQuestionForm,
  } = useCommunityComposer({ user });
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
    const result = await recordUserActivity(user, {
      ...activity,
      dedupeKey: activity.dedupeKey || signalKey,
    });
    if (result?.ok) setStorageItem(storageKey, '1');
  }, [user]);

  const coordinateControls = useCoordinateMap({
    concepts,
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
    resetCoordinateMap,
    selectedCoordinate,
    selectedCoordinateConcepts,
    selectedCoordinateId,
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
          authorName={communityAuthorName}
          isAuthenticated={isCommunityAuthenticated}
          onQuestionFormChange={updateQuestionForm}
          onQuestionSubmit={submitQuestion}
          questionForm={questionForm}
          questionMessage={questionMessage}
          questionStatus={questionStatus}
        />
      </div>

      <ContactSection contactChannels={contactChannels} />

      <HomeModals user={user} {...modalProps} />
    </PageTransition>
  );
}
