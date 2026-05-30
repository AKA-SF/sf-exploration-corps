import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ChevronRight,
  FileText,
  Mail,
  MessageSquare,
  Play,
  Satellite,
  Sparkles,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import {
  getRandomTasteQuestions,
  getTasteProfile,
  getTasteRecommendations,
} from '../data/tasteTest';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import CoordinateLogModal from './home/CoordinateLogModal';
import CoordinatesSection from './home/CoordinatesSection';
import HeroSection from './home/HeroSection';
import MediaArchiveSection from './home/MediaArchiveSection';
import WorkArchiveFormPanel from './home/WorkArchiveFormPanel';
import WorkDetailPanel from './home/WorkDetailPanel';
import WorksArchiveSection from './home/WorksArchiveSection';
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

const navItems = [
  { label: '작품 아카이브', href: '#works-archive' },
  { label: '미디어 아카이브', href: '#media-archive' },
  { label: '탐사 좌표', href: '#coordinates' },
  { label: '탐사 로그', href: '/exploration-log' },
  { label: 'SF 개념 사전', href: '#concept-dictionary' },
  { label: '커뮤니티게시판', href: '/questions' },
  { label: '내 탐사 프로필', href: '/profile' },
  { label: 'Contact', href: '#contact' },
];

const archiveCards = [
  {
    icon: Box,
    title: '작품 아카이브',
    text: 'SF 소설·영화·게임·애니메이션 작품 데이터베이스',
    href: '#works-archive',
  },
  {
    icon: Play,
    title: '미디어 아카이브',
    text: '이미지·영상·오디오 등 미디어 자료 저장소',
    href: '#media-archive',
  },
  {
    icon: Satellite,
    title: '탐사 좌표',
    text: '장르와 개념을 연결하는 노드 기반 탐사 지도',
    href: '#coordinates',
  },
  {
    icon: FileText,
    title: '탐사 로그',
    text: '탐사 과정과 발견한 아이디어 기록',
    href: '/exploration-log',
  },
  {
    icon: Satellite,
    title: 'SF 개념 사전',
    text: '관계된 개념과 용어를 정리한 지식 아카이브',
    href: '#concept-dictionary',
  },
  {
    icon: MessageSquare,
    title: '커뮤니티게시판',
    text: '질문, 추천, 제안을 남기는 커뮤니티 공간',
    href: '/questions',
  },
];

function getRandomWorks(items, count) {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function mergeWorksByCode(currentWorks, incomingWorks) {
  const currentByCode = new Map(currentWorks.map(work => [work.code, work]));
  return incomingWorks.map(work => ({
    ...(currentByCode.get(work.code) ?? {}),
    ...work,
  }));
}

function formatTimestamp(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\s/g, ' ');
}

const fallbackWorks = [
  {
    code: 'SFA-001',
    medium: 'NOVEL',
    title: '듄',
    subtitle: '생태, 제국, 예언, 행성 규모의 정치학',
    tags: ['생태 SF', '제국', '메시아'],
  },
  {
    code: 'SFA-014',
    medium: 'CINEMA',
    title: '블레이드 러너',
    subtitle: '기억과 신체, 인공 생명의 권리를 묻는 도시 신호',
    tags: ['안드로이드', '기억', '느와르'],
  },
  {
    code: 'SFA-027',
    medium: 'GAME',
    title: '시그널리스',
    subtitle: '반복되는 꿈과 우주적 고립 속에서 흔들리는 정체성',
    tags: ['우주 공포', '기억', '루프'],
  },
  {
    code: 'SFA-039',
    medium: 'ANIMATION',
    title: '공각기동대',
    subtitle: '네트워크, 의식, 사이버네틱 신체의 경계 탐사',
    tags: ['사이버펑크', '정체성', '네트워크'],
  },
];

const contactChannels = [
  {
    label: 'PARTNERSHIP',
    title: '협업, 협찬 제안',
    text: '프로젝트 협업, 콘텐츠 제휴, 후원과 협찬 제안을 받습니다.',
  },
  {
    label: 'LECTURE / WORKSHOP',
    title: '강의 및 워크숍',
    text: 'SF, 미래사회, 작품 아카이브를 주제로 한 강의와 워크숍을 논의합니다.',
  },
  {
    label: 'GENERAL MESSAGE',
    title: '일반 문의',
    text: '프로젝트 소개, 운영, 업데이트에 관한 메시지를 남깁니다.',
  },
];

const conceptEntries = [
  {
    code: 'CON-001',
    term: '사이버펑크',
    english: 'Cyberpunk',
    category: '장르 / 세계관',
    summary: '고도화된 기술과 붕괴한 사회 질서가 동시에 존재하는 도시적 SF 감각.',
    keywords: ['해커', '거대기업', '신체개조'],
  },
  {
    code: 'CON-002',
    term: '하드 SF',
    english: 'Hard SF',
    category: '과학적 상상력',
    summary: '과학 이론, 물리 법칙, 기술적 개연성을 서사의 핵심 조건으로 삼는 SF.',
    keywords: ['물리학', '우주공학', '과학적 개연성'],
  },
  {
    code: 'CON-003',
    term: '스페이스 오페라',
    english: 'Space Opera',
    category: '우주 서사',
    summary: '은하 규모의 정치, 전쟁, 모험, 문명 충돌을 장대한 서사로 펼치는 장르.',
    keywords: ['은하제국', '함대', '문명'],
  },
  {
    code: 'CON-004',
    term: '포스트휴먼',
    english: 'Posthuman',
    category: '인간 이후',
    summary: '인간의 신체, 의식, 정체성이 기술과 결합하며 달라지는 조건을 탐구하는 개념.',
    keywords: ['의식 업로드', '인공생명', '정체성'],
  },
  {
    code: 'CON-005',
    term: '디스토피아',
    english: 'Dystopia',
    category: '사회 비판',
    summary: '통제, 감시, 불평등, 생태 위기 등 미래 사회의 어두운 가능성을 드러내는 상상력.',
    keywords: ['감시사회', '통제', '저항'],
  },
  {
    code: 'CON-006',
    term: '퍼스트 콘택트',
    english: 'First Contact',
    category: '조우의 서사',
    summary: '인류가 외계 지성 또는 낯선 존재와 처음 마주할 때 생기는 인식의 충격.',
    keywords: ['외계지성', '언어', '타자성'],
  },
];

const mediaCategories = ['SF 작가 인터뷰', 'SF 관련 미디어', '고전 SF 영화'];
const mediaCategorySlugs = {
  'SF 작가 인터뷰': 'interviews',
  'SF 관련 미디어': 'media',
  '고전 SF 영화': 'classic-films',
};

function normalizeMediaCategory(category = '') {
  const normalized = category.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('작가') || normalized.includes('인터뷰')) return 'SF 작가 인터뷰';
  if (normalized.includes('미디어') || normalized.includes('media') || normalized.includes('콘텐츠') || normalized.includes('자료')) return 'SF 관련 미디어';
  if (normalized.includes('기사') || normalized.includes('article') || normalized.includes('news')) return 'SF 관련 미디어';
  if (normalized.includes('고전') && (normalized.includes('영화') || normalized.includes('sf'))) return '고전 SF 영화';
  return category;
}

function getMediaSortTime(item) {
  if (item.date) {
    const timestamp = Date.parse(item.date);
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  const year = String(item.year ?? '').match(/\d{4}/)?.[0];
  return year ? Date.UTC(Number(year), 11, 31) : 0;
}

function sortMediaByLatest(items) {
  return [...items].sort((a, b) => getMediaSortTime(b) - getMediaSortTime(a));
}

function formatSourceDomain(hostname) {
  const cleanHost = hostname.replace(/^www\./, '');
  if (cleanHost.includes('wikipedia.org')) return 'Wikipedia';
  if (cleanHost.includes('britannica.com')) return 'Britannica';
  if (cleanHost.includes('sf-encyclopedia.com')) return 'The Encyclopedia of Science Fiction';
  if (cleanHost.includes('namu.wiki')) return 'Namu Wiki';
  if (cleanHost.includes('terms.naver.com')) return 'Naver 지식백과';
  return cleanHost
    .split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getConceptSource(source, concept) {
  const sourceText = source?.trim() ?? '';
  const url = sourceText.match(/https?:\/\/[^\s)]+/)?.[0];

  if (!url) {
    return {
      href: '',
      label: sourceText,
    };
  }

  try {
    const parsedUrl = new URL(url);
    const domain = formatSourceDomain(parsedUrl.hostname);
    const conceptName = concept.english || concept.term;

    return {
      href: url,
      label: conceptName ? `${domain} - ${conceptName}` : domain,
    };
  } catch {
    return {
      href: '',
      label: sourceText,
    };
  }
}

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

      <section className="archive-dock" id="archive-links" aria-label="아카이브 바로가기">
        {archiveCards.map(card => {
          const Icon = card.icon;
          return (
            <a className="dock-card" href={card.href} key={card.title} onClick={card.href === '#coordinates' ? resetCoordinateMap : undefined}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{card.title}</strong>
                <em>{card.text}</em>
              </span>
              <ChevronRight aria-hidden="true" />
            </a>
          );
        })}
      </section>

      <section className="taste-test-section" id="taste-test">
        <div className="section-shell">
          <div className="section-heading">
            <span>CREW PROFILING</span>
            <h2>나의 SF 성향<br />테스트</h2>
            <p>
              당신은 어떤 우주선에 어울리는 탐사 대원인가요?
              네 개의 가벼운 질문을 지나면, 성향에 맞는 탐사 경로와 추천 도서가 열립니다.
            </p>
          </div>

          <div className="taste-test-layout">
            <div className="taste-questions">
              {tasteQuestionSet.map((question, questionIndex) => (
                <article className="taste-question-card" key={question.id}>
                  <span>QUESTION {String(questionIndex + 1).padStart(2, '0')}</span>
                  <h3>{question.question}</h3>
                  <div className="taste-options">
                    {question.options.map((option, optionIndex) => (
                      <button
                        className={tasteAnswers[question.id] === optionIndex ? 'is-selected' : ''}
                        key={option.label}
                        onClick={() => setTasteAnswers(answer => ({ ...answer, [question.id]: optionIndex }))}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <aside className={`taste-result-panel ${tasteProfile ? 'is-complete' : ''}`}>
              <span>{tasteProfile?.code ?? 'TYPE SCAN'}</span>
              <h3>{tasteProfile?.title ?? '탐사 성향 분석 중'}</h3>
              <strong>{tasteProfile?.genre ?? `${Object.keys(tasteAnswers).length} / ${tasteQuestionSet.length} 응답 완료`}</strong>
              <p>
                {tasteProfile?.summary ?? '질문에 답하면 당신에게 어울리는 탐사 대원 유형과 추천 도서 3권이 표시됩니다.'}
              </p>
              {tasteProfile && (
                <>
                  <dl>
                    <div>
                      <dt>ASSIGNED VESSEL</dt>
                      <dd>{tasteProfile.vessel}</dd>
                    </div>
                    <div>
                      <dt>RECOMMENDED ROUTE</dt>
                      <dd>{tasteProfile.genre}</dd>
                    </div>
                  </dl>
                  <div className="taste-recommendations">
                    <span>추천 도서 3권</span>
                    {tasteRecommendations.map(work => {
                      const WorkLink = work.link ? 'a' : 'article';
                      return (
                        <WorkLink
                          className="taste-book-link"
                          href={work.link || undefined}
                          key={work.code}
                          rel={work.link ? 'noreferrer' : undefined}
                          target={work.link ? '_blank' : undefined}
                        >
                          <strong>{work.title}</strong>
                          <em>{work.subtitle}</em>
                        </WorkLink>
                      );
                    })}
                  </div>
                  <div className="taste-result-actions">
                    <a href="#works-archive">작품 아카이브로 이동</a>
                    <button
                      type="button"
                      onClick={() => {
                        setTasteAnswers({});
                        setTasteQuestionSet(getRandomTasteQuestions());
                      }}
                    >
                      다시 테스트
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>

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

      <section className="contact-section" id="contact">
        <div className="section-shell contact-shell">
          <div className="section-heading contact-heading">
            <span>COMMUNICATION NODE</span>
            <h2>Contact</h2>
            <p>
              SF 탐사단의 협업, 협찬, 강의, 워크숍, 일반 문의를 위한 공식 연락
              채널입니다. 아래 이메일 또는 인스타그램으로 메시지를 보내주세요.
            </p>
          </div>

          <div className="contact-grid">
            <div className="contact-signal">
              <Mail aria-hidden="true" />
              <span>PRIMARY CHANNEL</span>
              <a href="mailto:brokenfuzz@gmail.com">brokenfuzz@gmail.com</a>
              <a href="https://www.instagram.com/aka_book_/" target="_blank" rel="noreferrer">
                instagram.com/aka_book_
              </a>
              <em>협업, 협찬, 강의, 워크숍, 일반 문의</em>
            </div>

            {contactChannels.map(channel => (
              <article className="contact-card" key={channel.label}>
                <span>{channel.label}</span>
                <h3>{channel.title}</h3>
                <p>{channel.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

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
