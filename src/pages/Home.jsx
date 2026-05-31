import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import {
  getRandomTasteQuestions,
  getTasteProfile,
  getTasteRecommendations,
} from '../data/tasteTest';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import ArchiveDock from './home/ArchiveDock';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import ContactSection from './home/ContactSection';
import CoordinateLogModal from './home/CoordinateLogModal';
import CoordinatesSection from './home/CoordinatesSection';
import HeroSection from './home/HeroSection';
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
  mediaCategories,
  mediaCategorySlugs,
  navItems,
} from './home/homeContent';
import {
  formatTimestamp,
  getConceptSource,
  getRandomWorks,
  mergeWorksByCode,
  normalizeMediaCategory,
  sortMediaByLatest,
} from './home/homeUtils';
import useCommunityComposer from './home/useCommunityComposer';
import useCoordinateMap from './home/useCoordinateMap';
import useHomeData from './home/useHomeData';
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
  const [tasteQuestionSet, setTasteQuestionSet] = useState(() => getRandomTasteQuestions());
  const [tasteAnswers, setTasteAnswers] = useState({});
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
  const [activeMediaCategory, setActiveMediaCategory] = useState(mediaCategories[0]);
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const [conceptReadingMode, setConceptReadingMode] = useState(false);
  const conceptFeatureRef = useRef(null);
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

  const selectConcept = code => {
    setActiveConceptCode(code);
    const concept = concepts.find(entry => entry.code === code);
    recordMissionSignal(`concept:${code}`, {
      actionType: 'concept_read',
      points: 5,
      genre: concept?.category || 'SF 개념 사전',
      metadata: {
        title: concept?.term || code,
        concept_code: code,
        node: 'concept-dictionary',
      },
    });

    if (showAllConcepts) {
      requestAnimationFrame(() => {
        conceptFeatureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const displayedWorks = works.filter(work => randomWorkCodes.includes(work.code)).slice(0, 6);
  const workCategoryCounts = useMemo(() => Object.fromEntries(
    workCategories.map(category => [
      category.slug,
      works.filter(work => getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === category.slug).length,
    ]),
  ), [works]);
  const isTasteComplete = Object.keys(tasteAnswers).length === tasteQuestionSet.length;
  const tasteProfile = isTasteComplete ? getTasteProfile(tasteAnswers, tasteQuestionSet) : null;
  const tasteRecommendations = getTasteRecommendations(works, tasteProfile);
  const updateTasteAnswer = (questionId, optionIndex) => {
    setTasteAnswers(answer => ({ ...answer, [questionId]: optionIndex }));
  };
  const resetTasteTest = () => {
    setTasteAnswers({});
    setTasteQuestionSet(getRandomTasteQuestions());
  };

  useEffect(() => {
    if (!isTasteComplete || !tasteProfile) return;
    recordMissionSignal(`taste:${tasteProfile.code}`, {
      actionType: 'taste_test',
      points: 10,
      genre: tasteProfile.genre,
      metadata: {
        title: '나의 SF 성향 테스트 완료',
        taste_code: tasteProfile.code,
        taste_title: tasteProfile.title,
        node: 'taste-test',
      },
    });
  }, [isTasteComplete, recordMissionSignal, tasteProfile]);

  const displayedMedia = sortMediaByLatest(
    mediaItems.filter(item => normalizeMediaCategory(item.category) === activeMediaCategory),
  );
  const previewMedia = displayedMedia.slice(0, 3);
  const activeMediaArchivePath = `/media/${mediaCategorySlugs[activeMediaCategory] ?? 'media'}`;
  const orderedConcepts = [
    ...randomConceptCodes.map(code => concepts.find(concept => concept.code === code)).filter(Boolean),
    ...concepts.filter(concept => !randomConceptCodes.includes(concept.code)),
  ];
  const selectedConcept = orderedConcepts.find(concept => concept.code === activeConceptCode) ?? orderedConcepts[0];
  const visibleConcepts = showAllConcepts ? orderedConcepts : orderedConcepts.slice(0, 6);
  const metrics = {
    works: works.length,
    media: mediaItems.length,
    concepts: concepts.length,
    logs: dashboard.logs.length,
    questions: dashboard.questions.length,
    status: dashboard.status,
  };
  const recentSignals = [
    works[0] && { id: 'WORK 001', label: `${works[0].title} / 작품 아카이브`, time: dashboard.status.works ? 'SYNC OK' : 'LOCAL FALLBACK' },
    mediaItems[0] && { id: 'MEDIA 001', label: `${mediaItems[0].title} / 미디어`, time: 'SYNC OK' },
    dashboard.logs[0] && { id: 'LOG 001', label: `${dashboard.logs[0].workTitle} / 탐사 로그`, time: 'SYNC OK' },
    dashboard.questions[0] && { id: 'BOARD 001', label: `${dashboard.questions[0].title} / 커뮤니티`, time: 'SYNC OK' },
    selectedConcept && { id: 'CONCEPT', label: `${selectedConcept.term} / 개념 사전`, time: dashboard.status.concepts ? 'SYNC OK' : 'LOCAL FALLBACK' },
  ].filter(Boolean).slice(0, 5);
  const systemReady = Object.values(dashboard.status).filter(Boolean).length >= 3;

  return (
    <PageTransition className="archive-home">
      <header className="home-topbar">
        <a className="brand-mark" href="#top" aria-label="SF 탐사단 홈">
          <Sparkles aria-hidden="true" />
          <span>SF 탐사단</span>
          <em>INTERSTELLAR ARCHIVE VESSEL</em>
        </a>
        <nav className="top-nav" aria-label="주요 메뉴">
          {navItems.map(item => (
            <a key={item.label} href={item.href} onClick={item.href === '#coordinates' ? resetCoordinateMap : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="system-status">
          <span>SYSTEM STATUS</span>
          <strong><i /> {systemReady ? 'ONLINE' : 'PARTIAL'}</strong>
        </div>
      </header>

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
