import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  ChevronRight,
  Database,
  FileText,
  Mail,
  MessageSquare,
  Play,
  Satellite,
  Sparkles,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import CoordinateLogModal from './home/CoordinateLogModal';
import CoordinatesSection from './home/CoordinatesSection';
import MediaArchiveSection from './home/MediaArchiveSection';
import WorkArchiveFormPanel from './home/WorkArchiveFormPanel';
import WorkDetailPanel from './home/WorkDetailPanel';
import WorksArchiveSection from './home/WorksArchiveSection';
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

const blips = [
  { x: 23, y: 43, size: 6, delay: 0 },
  { x: 36, y: 28, size: 5, delay: 0.3 },
  { x: 49, y: 61, size: 4, delay: 0.6 },
  { x: 70, y: 49, size: 5, delay: 0.9 },
  { x: 60, y: 24, size: 4, delay: 1.2 },
  { x: 32, y: 70, size: 5, delay: 1.5 },
];

const tasteProfiles = {
  engineer: {
    code: 'TYPE-01',
    title: '하드웨어 엔지니어',
    genre: '하드 SF형',
    vessel: '정밀 관측선 오비터',
    summary: '과학적 고증, 기술적 개연성, 우주 공학의 디테일에서 가장 큰 즐거움을 느끼는 탐사 대원입니다.',
    keywords: ['하드', '과학', '물리', '우주공학', '화성', '기술', '프로젝트', '솔라리스'],
  },
  linguist: {
    code: 'TYPE-02',
    title: '외계 생명체 언어학자',
    genre: '뉴웨이브 / 퍼스트 콘택트형',
    vessel: '심우주 번역선 에코',
    summary: '낯선 존재와 언어, 타자성, 감각의 변화처럼 인간의 인식 자체를 흔드는 이야기에 끌립니다.',
    keywords: ['외계', '언어', '타자', '문명', '콘택트', '솔라리스', '어둠의 왼손', '르 귄'],
  },
  navigator: {
    code: 'TYPE-03',
    title: '은하 항로 개척자',
    genre: '스페이스 오페라형',
    vessel: '은하 항로선 노바',
    summary: '제국, 함대, 행성, 문명 충돌처럼 우주 규모로 펼쳐지는 큰 서사와 모험에 강하게 반응합니다.',
    keywords: ['스페이스', '오페라', '은하', '제국', '우주', '듄', '파운데이션', '나인폭스'],
  },
  hacker: {
    code: 'TYPE-04',
    title: '도시 네트워크 해커',
    genre: '사이버펑크 / 포스트휴먼형',
    vessel: '궤도 침투선 글리치',
    summary: '인공지능, 기억, 신체 개조, 거대 도시와 통제 시스템의 어두운 빛에 민감한 탐사자입니다.',
    keywords: ['사이버', '안드로이드', '인공지능', 'AI', '기억', '신체', '네트워크', '포스트휴먼'],
  },
  archivist: {
    code: 'TYPE-05',
    title: '폐허 기록 보관자',
    genre: '디스토피아 / 아포칼립스형',
    vessel: '잔해 수집선 아카이브',
    summary: '무너진 세계와 감시 사회, 재난 이후의 공동체처럼 현재의 불안을 밀도 있게 읽는 성향입니다.',
    keywords: ['디스토피아', '아포칼립스', '재난', '통제', '감시', '생존', '화씨', '온실'],
  },
  ecologist: {
    code: 'TYPE-06',
    title: '비인간 생태학자',
    genre: '생태 SF / 공생형',
    vessel: '행성 생태선 리프',
    summary: '기후, 식물, 동물, 비인간 존재와의 공생처럼 인간 중심 바깥의 세계를 탐사합니다.',
    keywords: ['생태', '기후', '환경', '동물', '식물', '공생', '비인간', '온실'],
  },
};

const tasteQuestions = [
  {
    id: 'q1',
    question: '처음 보는 SF를 고를 때 가장 먼저 끌리는 것은?',
    options: [
      { label: '과학 설정이 얼마나 설득력 있는지', scores: { engineer: 3, navigator: 1 } },
      { label: '낯선 존재와 세계를 만나는 감각', scores: { linguist: 3, ecologist: 1 } },
      { label: '무너진 사회와 살아남는 사람들', scores: { archivist: 3, hacker: 1 } },
    ],
  },
  {
    id: 'q2',
    question: '가장 오래 생각나는 장면은 어느 쪽인가요?',
    options: [
      { label: '거대한 우주선, 행성, 은하 정치', scores: { navigator: 3, engineer: 1 } },
      { label: '기억이 조작되거나 몸이 바뀌는 순간', scores: { hacker: 3, linguist: 1 } },
      { label: '인간이 아닌 존재와 관계를 맺는 순간', scores: { ecologist: 3, linguist: 2 } },
    ],
  },
  {
    id: 'q3',
    question: '토론 모임에서 가장 던지고 싶은 질문은?',
    options: [
      { label: '이 기술은 실제로 가능할까?', scores: { engineer: 3, hacker: 1 } },
      { label: '우리는 무엇을 인간이라고 부를 수 있을까?', scores: { hacker: 2, linguist: 2 } },
      { label: '세계가 망한 뒤 공동체는 어떻게 다시 생길까?', scores: { archivist: 3, ecologist: 1 } },
    ],
  },
  {
    id: 'q4',
    question: '당신에게 더 매력적인 탐사 임무는?',
    options: [
      { label: '미지의 행성 궤도와 물리 조건 분석', scores: { engineer: 3, navigator: 1 } },
      { label: '외계 문명의 언어와 의례 기록', scores: { linguist: 3, ecologist: 1 } },
      { label: '거대 도시의 은폐된 시스템 침투', scores: { hacker: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q5',
    question: '책장을 덮은 뒤 가장 만족스러운 감정은?',
    options: [
      { label: '설정이 정교하게 맞물렸다는 쾌감', scores: { engineer: 3, navigator: 1 } },
      { label: '내가 알던 인간의 기준이 흔들리는 감각', scores: { linguist: 2, hacker: 2 } },
      { label: '지금 사회를 다시 보게 되는 불편함', scores: { archivist: 3, ecologist: 1 } },
    ],
  },
  {
    id: 'q6',
    question: '가장 궁금한 미래 기술은?',
    options: [
      { label: '우주 항행, 궤도 거주, 테라포밍', scores: { engineer: 2, navigator: 2 } },
      { label: '의식 업로드, 인공 신체, 네트워크 자아', scores: { hacker: 3, linguist: 1 } },
      { label: '기후 복원, 생태 네트워크, 공생 기술', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q7',
    question: '당신이 선호하는 주인공은?',
    options: [
      { label: '문제를 계산하고 해결하는 과학자/엔지니어', scores: { engineer: 3 } },
      { label: '낯선 문화 사이를 통역하는 관찰자', scores: { linguist: 3, navigator: 1 } },
      { label: '붕괴한 세계에서 기록을 남기는 생존자', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q8',
    question: '가장 끌리는 배경은?',
    options: [
      { label: '거대한 행성 도시와 데이터 네트워크', scores: { hacker: 3, navigator: 1 } },
      { label: '은하 제국의 변경 지대', scores: { navigator: 3 } },
      { label: '인간보다 오래된 숲과 바다', scores: { ecologist: 3, linguist: 1 } },
    ],
  },
  {
    id: 'q9',
    question: '당신이 더 오래 붙잡는 질문은?',
    options: [
      { label: '이 세계의 물리 법칙은 어떻게 작동할까?', scores: { engineer: 3 } },
      { label: '타자의 언어를 정말 이해할 수 있을까?', scores: { linguist: 3 } },
      { label: '감시와 편의는 어디서 갈라질까?', scores: { hacker: 2, archivist: 2 } },
    ],
  },
  {
    id: 'q10',
    question: 'SF에서 가장 피하고 싶은 것은?',
    options: [
      { label: '과학 설정이 너무 헐거운 이야기', scores: { engineer: 3 } },
      { label: '우주 규모인데 인간 사회가 너무 단순한 이야기', scores: { navigator: 2, linguist: 1 } },
      { label: '세계가 무너졌는데 공동체 질문이 없는 이야기', scores: { archivist: 2, ecologist: 1 } },
    ],
  },
  {
    id: 'q11',
    question: '당신의 탐사 장비를 하나 고른다면?',
    options: [
      { label: '정밀 센서와 계산 모듈', scores: { engineer: 3 } },
      { label: '언어 샘플러와 문화 기록 장치', scores: { linguist: 3 } },
      { label: '암호 해독기와 접속 단말', scores: { hacker: 3 } },
    ],
  },
  {
    id: 'q12',
    question: '더 읽고 싶은 갈등은?',
    options: [
      { label: '행성 환경과 기술 한계의 충돌', scores: { engineer: 2, ecologist: 2 } },
      { label: '문명과 문명의 오해', scores: { linguist: 2, navigator: 2 } },
      { label: '개인과 통제 시스템의 충돌', scores: { hacker: 2, archivist: 2 } },
    ],
  },
  {
    id: 'q13',
    question: '가장 매력적인 제목의 느낌은?',
    options: [
      { label: '방정식, 궤도, 실험, 임계점', scores: { engineer: 3 } },
      { label: '제국, 항로, 함대, 성간', scores: { navigator: 3 } },
      { label: '폐허, 금지구역, 마지막 기록', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q14',
    question: '작품 속 AI를 볼 때 먼저 드는 생각은?',
    options: [
      { label: '어떤 구조와 학습 방식으로 작동할까?', scores: { engineer: 2, hacker: 1 } },
      { label: '의식이나 권리를 가질 수 있을까?', scores: { hacker: 2, linguist: 1 } },
      { label: '인간 사회의 통제 도구가 되지 않을까?', scores: { archivist: 2, hacker: 1 } },
    ],
  },
  {
    id: 'q15',
    question: '당신에게 좋은 SF 세계관이란?',
    options: [
      { label: '내부 규칙이 단단한 세계', scores: { engineer: 3 } },
      { label: '규모가 크고 역사성이 느껴지는 세계', scores: { navigator: 3 } },
      { label: '비인간 존재까지 살아 있는 세계', scores: { ecologist: 3 } },
    ],
  },
  {
    id: 'q16',
    question: '가장 마음이 가는 결말은?',
    options: [
      { label: '문제의 원리를 이해하고 다음 실험으로 나아간다', scores: { engineer: 3 } },
      { label: '완전한 이해 대신 공존의 가능성을 남긴다', scores: { linguist: 2, ecologist: 2 } },
      { label: '낡은 체제가 무너지고 작은 공동체가 살아남는다', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q17',
    question: '독서 모임에서 맡고 싶은 역할은?',
    options: [
      { label: '설정 오류와 과학적 가능성 체크', scores: { engineer: 3 } },
      { label: '상징, 언어, 타자성 해석', scores: { linguist: 3 } },
      { label: '사회 구조와 권력 관계 분석', scores: { archivist: 3, hacker: 1 } },
    ],
  },
  {
    id: 'q18',
    question: '가장 흥미로운 공포는?',
    options: [
      { label: '우주의 규모 앞에서 느끼는 압도감', scores: { navigator: 2, linguist: 1 } },
      { label: '내 기억과 몸이 내 것이 아닐 수 있다는 감각', scores: { hacker: 3 } },
      { label: '기후와 생태계가 되돌릴 수 없게 바뀌는 감각', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q19',
    question: '작품을 추천받는다면 어떤 문장이 좋나요?',
    options: [
      { label: '과학 설정이 탄탄해서 천천히 파고들 맛이 있어요.', scores: { engineer: 3 } },
      { label: '읽고 나면 인간이라는 말이 이상해져요.', scores: { linguist: 2, hacker: 2 } },
      { label: '세계가 망하는데도 이상하게 따뜻해요.', scores: { archivist: 2, ecologist: 2 } },
    ],
  },
  {
    id: 'q20',
    question: '당신의 우주선 항로를 정한다면?',
    options: [
      { label: '검증되지 않은 과학 가설을 따라간다', scores: { engineer: 3 } },
      { label: '은하 외곽의 오래된 문명을 찾아간다', scores: { navigator: 2, linguist: 2 } },
      { label: '버려진 지구 생태권의 회복 신호를 따라간다', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
];

function getRandomTasteQuestions() {
  return [...tasteQuestions].sort(() => Math.random() - 0.5).slice(0, 4);
}

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

function getWorkSearchText(work) {
  return [
    work.title,
    work.subtitle,
    work.medium,
    work.recommender,
    ...(work.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function getTasteProfile(answers, questions) {
  const scores = Object.keys(tasteProfiles).reduce((result, key) => ({ ...result, [key]: 0 }), {});

  questions.forEach(question => {
    const selectedIndex = answers[question.id];
    const selectedOption = question.options[selectedIndex];
    if (!selectedOption) return;

    Object.entries(selectedOption.scores).forEach(([profile, score]) => {
      scores[profile] = (scores[profile] ?? 0) + score;
    });
  });

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'engineer';
  return tasteProfiles[winner];
}

function getTasteRecommendations(items, profile) {
  if (!profile) return [];

  const bookLikeWorks = items.filter(work => {
    const medium = String(work.medium ?? '').toLowerCase();
    return medium.includes('novel') || medium.includes('소설') || medium.includes('이론서') || medium.includes('archive');
  });
  const source = bookLikeWorks.length > 0 ? bookLikeWorks : items;
  const keywords = profile.keywords.map(keyword => keyword.toLowerCase());

  const ranked = source
    .map(work => {
      const searchText = getWorkSearchText(work);
      const score = keywords.reduce((total, keyword) => (
        searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword)
          ? total + 2
          : total
      ), 0);
      return { work, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked
    .filter(item => item.score > 0)
    .map(item => item.work)
    .concat(source.filter(work => !ranked.some(item => item.work.code === work.code)))
    .slice(0, 3);
}

function RadarDisplay() {
  const orbitDots = useMemo(() => (
    Array.from({ length: 44 }, (_, index) => {
      const angle = (index / 44) * Math.PI * 2;
      const radius = 35 + (index % 5) * 19;
      return {
        id: index,
        x: 50 + Math.cos(angle) * radius * 0.42,
        y: 50 + Math.sin(angle) * radius * 0.42,
        opacity: 0.15 + (index % 4) * 0.12,
      };
    })
  ), []);

  return (
    <div className="radar-shell" aria-label="탐사 레이더">
      <div className="radar-frame">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="radar-meta radar-meta-left">
        <span>RANGE</span>
        <strong>120.00 AU</strong>
      </div>
      <div className="radar-meta radar-meta-right">
        <span>SIGNAL</span>
        <strong>STRENGTH</strong>
      </div>
      <div className="radar">
        <span className="radar-axis radar-axis-x" />
        <span className="radar-axis radar-axis-y" />
        <span className="radar-ring radar-ring-a" />
        <span className="radar-ring radar-ring-b" />
        <span className="radar-ring radar-ring-c" />
        <span className="radar-sweep" />
        <span className="radar-orbit radar-orbit-a"><i /></span>
        <span className="radar-orbit radar-orbit-b"><i /></span>
        <span className="radar-orbit radar-orbit-c"><i /></span>
        <span className="radar-core" />
        {orbitDots.map(dot => (
          <span
            className="radar-dust"
            key={dot.id}
            style={{ left: `${dot.x}%`, top: `${dot.y}%`, opacity: dot.opacity }}
          />
        ))}
        {blips.map(blip => (
          <motion.span
            className="radar-blip"
            key={`${blip.x}-${blip.y}`}
            style={{
              left: `${blip.x}%`,
              top: `${blip.y}%`,
              width: blip.size,
              height: blip.size,
            }}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.25, 0.85] }}
            transition={{ duration: 2.4, delay: blip.delay, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}

function SidePanel({ metrics, recentSignals, timestamp, activeGenre, archiveMode }) {
  const onlineCount = Object.values(metrics.status).filter(Boolean).length;
  const syncState = onlineCount >= 3 ? 'READY' : 'PARTIAL';

  return (
    <aside className="home-side">
      <section className="hud-panel">
        <h2>SYSTEM LOG</h2>
        {recentSignals.map(signal => (
          <div className="log-line" key={signal.id}>
            <strong>{signal.id}</strong>
            <span>{signal.label}</span>
            <em>{signal.time}</em>
          </div>
        ))}
      </section>
      <section className="hud-panel compact">
        <h2>VESSEL INFO</h2>
        <dl>
          <dt>WORKS</dt>
          <dd>{metrics.works} SIGNALS</dd>
          <dt>MEDIA</dt>
          <dd>{metrics.media} ITEMS</dd>
          <dt>LOGS</dt>
          <dd>{metrics.logs} REVIEWS</dd>
          <dt>BOARD</dt>
          <dd>{metrics.questions} POSTS</dd>
          <dt>SECTOR</dt>
          <dd>{activeGenre?.label ?? (archiveMode === 'all' ? 'NOVEL ARCHIVE' : 'RANDOM ARCHIVE')}</dd>
        </dl>
      </section>
      <section className="hud-panel timestamp">
        <h2>ARCHIVE SYNC</h2>
        <p>{timestamp}</p>
        <dl className="sync-list">
          <div>
            <dt>STATUS</dt>
            <dd>{syncState}</dd>
          </div>
          <div>
            <dt>ONLINE</dt>
            <dd>{onlineCount} / {Object.keys(metrics.status).length}</dd>
          </div>
        </dl>
      </section>
      <section className="mini-map" aria-label="탐사 지도">
        <div className="mini-map-top">
          <span>EXPLORATION MAP</span>
          <strong>+</strong>
        </div>
        <div className="galaxy">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} style={{ '--ring': index + 1 }} />
          ))}
          <i />
        </div>
      </section>
    </aside>
  );
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
  const [questionForm, setQuestionForm] = useState({
    title: '',
    content: '',
    name: '',
    contact: '',
    category: '커뮤니티',
    password: '',
  });
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionMessage, setQuestionMessage] = useState('');
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

  const updateQuestionForm = event => {
    const { name, value } = event.target;
    setQuestionForm(form => ({ ...form, [name]: value }));
  };

  const submitQuestion = async event => {
    event.preventDefault();
    if (!questionForm.title.trim() || !questionForm.content.trim()) {
      setQuestionStatus('error');
      setQuestionMessage('글 제목과 글 내용을 입력해주세요.');
      return;
    }

    setQuestionStatus('submitting');
    setQuestionMessage('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('비밀번호가 맞지 않습니다. 기본 비밀번호는 sf 입니다.');
        throw new Error(data?.notion?.message || data?.error || '저장에 실패했습니다.');
      }
      await recordUserActivity(user, {
        actionType: 'post',
        points: 20,
        genre: questionForm.category,
        metadata: {
          title: questionForm.title,
          category: questionForm.category,
          node: 'community-board',
        },
      });
      setQuestionForm({
        title: '',
        content: '',
        name: '',
        contact: '',
        category: '커뮤니티',
        password: '',
      });
      setQuestionStatus('success');
      setQuestionMessage(user ? '새 글이 저장되었습니다. +20 MP가 반영됩니다.' : '새 글이 저장되었습니다.');
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
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

      <main className="home-stage" id="top">
        <div className="scan-column" aria-hidden="true">
          {['01', '01', '02', '03', '04', '05'].map((tick, index) => (
            <span className={tick === '03' ? 'active' : ''} key={`${tick}-${index}`}>{tick}</span>
          ))}
        </div>

        <section className="hero-panel">
          <div className="hero-copy">
            <p className="signal-label">SIGNAL DETECTED ⊕<br />ARCHIVE ONLINE</p>
            <h1>SF<br />탐사단</h1>
            <p className="hero-kicker">INTERSTELLAR ARCHIVE VESSEL</p>
            <p className="hero-description">
              SF 탐사단은 소설, 영화, 게임, 애니메이션을 탐사하며
              인간 이후의 세계와 미래 사회를 연구하는 인터스텔라 아카이브입니다.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#coordinates" onClick={resetCoordinateMap}>
                탐사 시작 <ChevronRight aria-hidden="true" />
              </a>
              <a className="secondary-action" href="#archive-links">
                아카이브 열기 <ChevronRight aria-hidden="true" />
              </a>
            </div>
            <aside className="hero-signal-banner" aria-label="추천 신호 배너">
              <div>
                <span className="mono">SPONSORED SIGNAL / BOOK PICK</span>
                <strong>이번 주 탐사 추천 좌표</strong>
                <p>고전 SF와 최신 한국 SF를 연결하는 큐레이션 슬롯</p>
              </div>
              <a href="#works-archive">
                신호 확인 <ChevronRight aria-hidden="true" />
              </a>
            </aside>
            <div className="mission-card">
              <div>
                <strong>MISSION BRIEF</strong>
                <span>WE EXPLORE POSSIBILITIES<br />BEYOND THE HUMAN.</span>
                <em>CODE: SFA-2026-05</em>
              </div>
              <div className="wire-globe" aria-hidden="true" />
            </div>
          </div>

          <RadarDisplay />
          <SidePanel
            activeGenre={activeGenre}
            archiveMode={archiveMode}
            metrics={metrics}
            recentSignals={recentSignals}
            timestamp={formatTimestamp(currentTime)}
          />
        </section>

        <div className="archive-status">
          <Database aria-hidden="true" />
          <span>ARCHIVE STATUS</span>
          <strong>WORKS 111&nbsp;&nbsp;NODES 08&nbsp;&nbsp;SIGNAL READY</strong>
        </div>
      </main>

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
