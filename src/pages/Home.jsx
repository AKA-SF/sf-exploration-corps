import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Send,
  Sparkles,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import CommunitySection from './home/CommunitySection';
import ConceptDictionarySection from './home/ConceptDictionarySection';
import CoordinatesSection from './home/CoordinatesSection';
import MediaArchiveSection from './home/MediaArchiveSection';
import WorksArchiveSection from './home/WorksArchiveSection';
import './Home.css';

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

function findRelatedWorksForNode(node, works) {
  const keywords = [node.label, node.en, ...(node.keywords ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  const scoredWorks = works
    .map(work => {
      const searchText = getWorkSearchText(work);
      const score = keywords.reduce((total, keyword) => (
        searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword)
          ? total + 1
          : total
      ), 0);
      return { work, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredWorks.map(item => item.work).slice(0, 5);
}

function findRelatedConceptsForNode(node, concepts) {
  const keywords = [node.label, node.en, ...(node.keywords ?? []), ...(node.concepts ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  return concepts
    .filter(concept => {
      const searchText = [
        concept.term,
        concept.english,
        concept.category,
        concept.summary,
        ...(concept.keywords ?? []),
      ].filter(Boolean).join(' ').toLowerCase();

      return keywords.some(keyword => searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword));
    })
    .slice(0, 4);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const genreNodes = [
  { id: 'hard-sf', label: '하드 SF', en: 'HARD SF', x: 50, y: 16, orbit: 2, tone: 'cyan', signals: 14, keywords: ['하드SF', '하드 SF', '과학', '물리학', '우주공학'], questions: ['과학적 개연성은 상상력의 제약일까, 추진력일까?'], concepts: ['하드 SF', '과학적 개연성'] },
  { id: 'space-opera', label: '스페이스 오페라', en: 'SPACE OPERA', x: 75, y: 30, orbit: 3, tone: 'blue', signals: 18, keywords: ['스페이스오페라', '은하', '제국', '우주', '함대'], questions: ['우주 규모의 정치는 인간 사회를 어떻게 확대해서 보여주는가?'], concepts: ['스페이스 오페라', '우주 서사'] },
  { id: 'cyberpunk', label: '사이버펑크', en: 'CYBERPUNK', x: 80, y: 58, orbit: 2, tone: 'cyan', signals: 12, keywords: ['사이버펑크', '안드로이드', '네트워크', 'AI', '해커'], questions: ['기술은 인간의 신체와 기억을 어디까지 바꿀 수 있을까?'], concepts: ['사이버펑크', '포스트휴먼'] },
  { id: 'dystopia', label: '디스토피아', en: 'DYSTOPIA', x: 63, y: 82, orbit: 2, tone: 'amber', signals: 16, keywords: ['디스토피아', '통제', '감시', '전체주의'], questions: ['디스토피아는 미래 예언보다 현재 진단에 가까운가?'], concepts: ['디스토피아', '감시사회'] },
  { id: 'apocalypse', label: '아포칼립스', en: 'APOCALYPSE', x: 36, y: 82, orbit: 3, tone: 'amber', signals: 13, keywords: ['아포칼립스', '종말', '재난', '생존'], questions: ['세계의 끝은 사회의 본질을 어떻게 드러내는가?'], concepts: ['아포칼립스', '생존'] },
  { id: 'posthuman', label: '포스트휴먼', en: 'POST-HUMAN', x: 18, y: 58, orbit: 3, tone: 'amber', signals: 14, keywords: ['포스트휴먼', '신체', '의식', '인공생명'], questions: ['인간 이후에도 인간성이라는 말은 유효할까?'], concepts: ['포스트휴먼', '신체성'] },
  { id: 'time-travel', label: '시간여행', en: 'TIME TRAVEL', x: 24, y: 30, orbit: 1, tone: 'cyan', signals: 11, keywords: ['시간여행', '시간', '루프', '평행세계'], questions: ['시간여행 서사는 왜 후회와 선택의 문제로 돌아오는가?'], concepts: ['시간여행', '인과율'] },
  { id: 'eco-sf', label: '생태 SF', en: 'ECO SF', x: 50, y: 50, orbit: 1, tone: 'blue', signals: 10, keywords: ['생태', '기후', '환경', '공생', '비인간'], questions: ['비인간 존재를 이야기의 중심에 놓으면 세계관은 어떻게 바뀌는가?'], concepts: ['생태 SF', '공생'] },
];

const sfCoreNode = {
  id: 'sf-core',
  label: 'SF',
  en: 'SCIENCE FICTION',
  x: 50,
  y: 50,
  orbit: 5,
  tone: 'cyan',
  signals: 8,
  keywords: ['SF', '과학소설', 'science fiction', '미래', '상상력'],
  questions: ['SF는 미래를 예측하는 장르일까, 현재를 다르게 읽는 장치일까?'],
  concepts: ['SF', '과학소설', '사변적 상상력'],
};

const mapConnections = [
  ...genreNodes.map(node => ['sf-core', node.id]),
  ['hard-sf', 'space-opera'],
  ['hard-sf', 'time-travel'],
  ['space-opera', 'eco-sf'],
  ['space-opera', 'cyberpunk'],
  ['cyberpunk', 'posthuman'],
  ['cyberpunk', 'dystopia'],
  ['dystopia', 'apocalypse'],
  ['dystopia', 'time-travel'],
  ['apocalypse', 'eco-sf'],
  ['posthuman', 'eco-sf'],
  ['posthuman', 'time-travel'],
  ['eco-sf', 'hard-sf'],
];

const genreSubmaps = {
  'hard-sf': {
    description: '하드 SF는 과학적 가설과 물리 법칙의 제약을 중심으로, 기술과 우주를 가능한 세계로 계산합니다.',
    nodes: [
      { id: 'near-future', label: '근미래 기술', en: 'NEAR FUTURE', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 8, keywords: ['근미래', '기술', 'AI'], questions: ['가까운 미래의 기술은 지금 우리의 습관을 어떻게 비틀어 보여주는가?'], concepts: ['근미래', '기술사회'] },
      { id: 'space-engineering', label: '우주 공학', en: 'SPACE ENGINEERING', x: 76, y: 36, orbit: 3, tone: 'blue', signals: 7, keywords: ['우주공학', '궤도', '화성'], questions: ['우주 개발은 탐험인가, 시스템의 확장인가?'], concepts: ['우주공학', '궤도'] },
      { id: 'planetary-science', label: '행성과학', en: 'PLANETARY SCIENCE', x: 68, y: 72, orbit: 2, tone: 'cyan', signals: 6, keywords: ['행성', '테라포밍', '기후'], questions: ['행성 환경이 바뀌면 사회의 규칙도 바뀌는가?'], concepts: ['행성과학', '테라포밍'] },
      { id: 'first-contact', label: '퍼스트 콘택트', en: 'FIRST CONTACT', x: 32, y: 72, orbit: 2, tone: 'amber', signals: 9, keywords: ['외계', '조우', '언어'], questions: ['첫 조우에서 무너지는 것은 언어일까 세계관일까?'], concepts: ['타자성', '언어'] },
      { id: 'simulation', label: '시뮬레이션', en: 'SIMULATION', x: 24, y: 36, orbit: 1, tone: 'blue', signals: 5, keywords: ['시뮬레이션', '가상', '현실'], questions: ['현실이 계산된 것이라면 경험의 진짜성은 어디에 놓이는가?'], concepts: ['가상현실', '의식'] },
    ],
    connections: [['hard-sf', 'near-future'], ['hard-sf', 'space-engineering'], ['hard-sf', 'planetary-science'], ['hard-sf', 'first-contact'], ['hard-sf', 'simulation'], ['space-engineering', 'space-opera'], ['first-contact', 'space-opera'], ['simulation', 'cyberpunk']],
  },
  'space-opera': {
    description: '스페이스 오페라는 은하 규모의 정치, 전쟁, 모험, 문명 충돌을 장대한 서사로 펼칩니다.',
    nodes: [
      { id: 'galactic-empire', label: '은하 제국', en: 'GALACTIC EMPIRE', x: 50, y: 17, orbit: 3, tone: 'amber', signals: 9, keywords: ['제국', '은하', '정치'], questions: ['거대한 제국은 어떤 질서와 폭력을 동시에 만드는가?'], concepts: ['제국', '정치SF'] },
      { id: 'fleet-war', label: '함대 전쟁', en: 'FLEET WAR', x: 77, y: 38, orbit: 2, tone: 'blue', signals: 7, keywords: ['함대', '전쟁', '전략'], questions: ['전쟁은 우주 규모에서 어떻게 추상화되는가?'], concepts: ['전쟁', '군사SF'] },
      { id: 'alien-civilization', label: '외계 문명', en: 'ALIEN CIVILIZATION', x: 66, y: 75, orbit: 2, tone: 'cyan', signals: 8, keywords: ['외계', '문명', '타자'], questions: ['타자의 문명은 인간 중심의 역사를 어떻게 흔드는가?'], concepts: ['타자성', '문명'] },
      { id: 'deep-voyage', label: '심우주 항해', en: 'DEEP VOYAGE', x: 34, y: 75, orbit: 1, tone: 'blue', signals: 6, keywords: ['항해', '우주선', '탐사'], questions: ['탐사는 발견인가, 새로운 경계의 생산인가?'], concepts: ['탐사', '우주선'] },
      { id: 'stellar-myth', label: '성간 신화', en: 'STELLAR MYTH', x: 23, y: 38, orbit: 2, tone: 'amber', signals: 5, keywords: ['신화', '예언', '영웅'], questions: ['우주 서사는 왜 다시 신화가 되는가?'], concepts: ['신화', '영웅서사'] },
    ],
    connections: [['space-opera', 'galactic-empire'], ['space-opera', 'fleet-war'], ['space-opera', 'alien-civilization'], ['space-opera', 'deep-voyage'], ['space-opera', 'stellar-myth'], ['alien-civilization', 'first-contact'], ['deep-voyage', 'space-engineering'], ['galactic-empire', 'dystopia']],
  },
  cyberpunk: {
    description: '사이버펑크는 고도화된 기술과 붕괴한 사회 질서가 동시에 존재하는 도시적 SF 감각입니다.',
    nodes: [
      { id: 'megacity', label: '메가시티', en: 'MEGACITY', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 6, keywords: ['도시', '기업', '계급'], questions: ['도시는 왜 미래의 불평등을 가장 먼저 드러내는가?'], concepts: ['도시', '불평등'] },
      { id: 'cybernetics', label: '사이버네틱스', en: 'CYBERNETICS', x: 76, y: 38, orbit: 3, tone: 'amber', signals: 8, keywords: ['신체개조', '의수', '기계'], questions: ['신체가 교체되면 정체성도 교체되는가?'], concepts: ['신체성', '포스트휴먼'] },
      { id: 'net-hacker', label: '해커/네트워크', en: 'NET HACKER', x: 66, y: 75, orbit: 1, tone: 'blue', signals: 7, keywords: ['해커', '네트워크', '정보'], questions: ['정보에 접속하는 능력은 새로운 계급이 되는가?'], concepts: ['네트워크', '정보'] },
      { id: 'ai-corporation', label: 'AI 기업국가', en: 'AI CORP STATE', x: 34, y: 75, orbit: 2, tone: 'cyan', signals: 6, keywords: ['AI', '기업', '통제'], questions: ['기업이 국가처럼 작동할 때 시민은 무엇이 되는가?'], concepts: ['AI SF', '통제'] },
      { id: 'noir-interface', label: '느와르 인터페이스', en: 'NOIR INTERFACE', x: 24, y: 38, orbit: 1, tone: 'blue', signals: 5, keywords: ['느와르', '기억', '탐정'], questions: ['기억이 조작될 수 있다면 진실은 어디에 남는가?'], concepts: ['기억', '정체성'] },
    ],
    connections: [['cyberpunk', 'megacity'], ['cyberpunk', 'cybernetics'], ['cyberpunk', 'net-hacker'], ['cyberpunk', 'ai-corporation'], ['cyberpunk', 'noir-interface'], ['cybernetics', 'posthuman'], ['ai-corporation', 'dystopia'], ['net-hacker', 'posthuman']],
  },
  dystopia: {
    description: '디스토피아는 미래를 예언하기보다 현재의 통제, 감시, 불평등을 극단화해 읽게 합니다.',
    nodes: [
      { id: 'surveillance-state', label: '감시국가', en: 'SURVEILLANCE', x: 50, y: 18, orbit: 2, tone: 'blue', signals: 8, keywords: ['감시', '통제', '국가'], questions: ['감시는 안전의 언어로 어떻게 정당화되는가?'], concepts: ['감시사회'] },
      { id: 'totalitarian-order', label: '전체주의 질서', en: 'TOTAL ORDER', x: 76, y: 38, orbit: 2, tone: 'amber', signals: 7, keywords: ['전체주의', '검열', '권력'], questions: ['언어와 기억의 통제는 어떻게 현실을 바꾸는가?'], concepts: ['전체주의', '검열'] },
      { id: 'class-divide', label: '계급 격차', en: 'CLASS DIVIDE', x: 66, y: 75, orbit: 1, tone: 'cyan', signals: 6, keywords: ['계급', '불평등', '빈곤'], questions: ['미래 사회의 기술은 격차를 줄이는가 확대하는가?'], concepts: ['불평등'] },
      { id: 'memory-control', label: '기억 통제', en: 'MEMORY CONTROL', x: 34, y: 75, orbit: 2, tone: 'blue', signals: 5, keywords: ['기억', '조작', '기록'], questions: ['기억을 잃은 사회는 저항할 수 있는가?'], concepts: ['기억', '기록'] },
      { id: 'resistance-cell', label: '저항 조직', en: 'RESISTANCE', x: 24, y: 38, orbit: 1, tone: 'cyan', signals: 5, keywords: ['저항', '혁명', '탈출'], questions: ['저항은 개인의 윤리인가, 공동체의 전략인가?'], concepts: ['저항', '공동체'] },
    ],
    connections: [['dystopia', 'surveillance-state'], ['dystopia', 'totalitarian-order'], ['dystopia', 'class-divide'], ['dystopia', 'memory-control'], ['dystopia', 'resistance-cell'], ['surveillance-state', 'cyberpunk'], ['class-divide', 'apocalypse'], ['memory-control', 'time-travel']],
  },
  apocalypse: {
    description: '아포칼립스 좌표는 세계가 무너지는 장면보다, 붕괴 이후 어떤 질서와 공동체가 다시 태어나는지를 추적합니다.',
    nodes: [
      { id: 'climate-collapse', label: '기후 재난', en: 'CLIMATE COLLAPSE', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 7, keywords: ['기후', '환경', '재난'], questions: ['기후 위기는 자연재해인가, 사회 시스템의 실패인가?'], concepts: ['기후위기'] },
      { id: 'pandemic-sf', label: '팬데믹 SF', en: 'PANDEMIC SF', x: 76, y: 38, orbit: 1, tone: 'blue', signals: 6, keywords: ['팬데믹', '감염', '바이러스'], questions: ['감염 서사는 타자에 대한 공포를 어떻게 드러내는가?'], concepts: ['팬데믹'] },
      { id: 'post-collapse', label: '붕괴 이후', en: 'POST-COLLAPSE', x: 66, y: 75, orbit: 3, tone: 'amber', signals: 9, keywords: ['종말', '생존', '폐허'], questions: ['무너진 세계에서 가장 먼저 다시 만들어지는 규칙은 무엇인가?'], concepts: ['생존'] },
      { id: 'resource-war', label: '자원 전쟁', en: 'RESOURCE WAR', x: 34, y: 75, orbit: 2, tone: 'amber', signals: 5, keywords: ['자원', '전쟁', '식량'], questions: ['부족한 자원은 윤리를 어떻게 시험하는가?'], concepts: ['자원', '전쟁'] },
      { id: 'survival-community', label: '생존 공동체', en: 'SURVIVAL COMMUNITY', x: 24, y: 38, orbit: 2, tone: 'cyan', signals: 8, keywords: ['생존', '공동체', '연대'], questions: ['생존은 개인의 능력인가, 공동체의 구조인가?'], concepts: ['연대'] },
    ],
    connections: [['apocalypse', 'climate-collapse'], ['apocalypse', 'pandemic-sf'], ['apocalypse', 'post-collapse'], ['apocalypse', 'resource-war'], ['apocalypse', 'survival-community'], ['climate-collapse', 'eco-sf'], ['resource-war', 'dystopia'], ['survival-community', 'posthuman']],
  },
  posthuman: {
    description: '포스트휴먼은 인간의 몸, 의식, 관계가 기술과 비인간 존재를 통해 재정의되는 좌표입니다.',
    nodes: [
      { id: 'body-augmentation', label: '신체 확장', en: 'BODY AUGMENT', x: 50, y: 18, orbit: 2, tone: 'amber', signals: 7, keywords: ['신체', '확장', '개조'], questions: ['확장된 몸은 더 자유로운 몸인가?'], concepts: ['신체성'] },
      { id: 'mind-upload', label: '의식 업로드', en: 'MIND UPLOAD', x: 76, y: 38, orbit: 2, tone: 'blue', signals: 6, keywords: ['의식', '업로드', '기억'], questions: ['복제된 의식은 같은 사람인가?'], concepts: ['의식', '정체성'] },
      { id: 'synthetic-life', label: '인공생명', en: 'SYNTHETIC LIFE', x: 66, y: 75, orbit: 3, tone: 'cyan', signals: 7, keywords: ['인공생명', '로봇', '안드로이드'], questions: ['만들어진 생명은 어떤 권리를 갖는가?'], concepts: ['인공생명'] },
      { id: 'human-animal', label: '인간-동물 경계', en: 'HUMAN ANIMAL', x: 34, y: 75, orbit: 1, tone: 'amber', signals: 5, keywords: ['동물', '비인간', '공생'], questions: ['비인간과의 관계는 인간성을 어떻게 바꾸는가?'], concepts: ['비인간'] },
      { id: 'collective-mind', label: '집합 의식', en: 'COLLECTIVE MIND', x: 24, y: 38, orbit: 2, tone: 'blue', signals: 5, keywords: ['집합', '의식', '네트워크'], questions: ['개별 자아가 연결될 때 책임은 어디에 있는가?'], concepts: ['네트워크', '의식'] },
    ],
    connections: [['posthuman', 'body-augmentation'], ['posthuman', 'mind-upload'], ['posthuman', 'synthetic-life'], ['posthuman', 'human-animal'], ['posthuman', 'collective-mind'], ['synthetic-life', 'cyberpunk'], ['human-animal', 'eco-sf'], ['collective-mind', 'cyberpunk']],
  },
  'time-travel': {
    description: '시간여행은 과거와 미래의 이동보다, 선택과 책임의 구조를 다시 묻는 장르 좌표입니다.',
    nodes: [
      { id: 'time-loop', label: '타임 루프', en: 'TIME LOOP', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 7, keywords: ['루프', '반복', '시간'], questions: ['반복되는 시간은 구원인가 감옥인가?'], concepts: ['루프'] },
      { id: 'alternate-history', label: '대체역사', en: 'ALT HISTORY', x: 76, y: 38, orbit: 2, tone: 'amber', signals: 6, keywords: ['대체역사', '역사', '분기'], questions: ['다른 역사는 현재의 책임을 어떻게 묻는가?'], concepts: ['역사'] },
      { id: 'parallel-world', label: '평행세계', en: 'PARALLEL WORLD', x: 66, y: 75, orbit: 3, tone: 'blue', signals: 7, keywords: ['평행세계', '멀티버스'], questions: ['다른 내가 존재한다면 자아는 하나인가?'], concepts: ['멀티버스'] },
      { id: 'causal-paradox', label: '인과 역설', en: 'CAUSAL PARADOX', x: 34, y: 75, orbit: 1, tone: 'cyan', signals: 6, keywords: ['인과', '역설', '패러독스'], questions: ['원인과 결과가 뒤엉키면 책임도 뒤엉키는가?'], concepts: ['인과율'] },
      { id: 'temporal-memory', label: '시간과 기억', en: 'TEMPORAL MEMORY', x: 24, y: 38, orbit: 2, tone: 'amber', signals: 5, keywords: ['기억', '시간', '상실'], questions: ['시간을 바꾸는 것은 기억을 바꾸는 일인가?'], concepts: ['기억'] },
    ],
    connections: [['time-travel', 'time-loop'], ['time-travel', 'alternate-history'], ['time-travel', 'parallel-world'], ['time-travel', 'causal-paradox'], ['time-travel', 'temporal-memory'], ['alternate-history', 'dystopia'], ['parallel-world', 'simulation'], ['temporal-memory', 'cyberpunk']],
  },
  'eco-sf': {
    description: '생태 SF는 인간 중심의 미래 대신, 기후와 비인간 존재, 공생 관계가 만드는 세계를 탐사합니다.',
    nodes: [
      { id: 'climate-fiction', label: '기후소설', en: 'CLI-FI', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 8, keywords: ['기후', '환경', '온실'], questions: ['기후 위기는 어떤 서사 형식을 요구하는가?'], concepts: ['기후위기'] },
      { id: 'animal-sentience', label: '동물 지성', en: 'ANIMAL SENTIENCE', x: 76, y: 38, orbit: 1, tone: 'amber', signals: 5, keywords: ['동물', '지성', '비인간'], questions: ['동물이 말할 수 있다면 인간 사회는 어떻게 달라지는가?'], concepts: ['비인간'] },
      { id: 'plant-network', label: '식물 네트워크', en: 'PLANT NETWORK', x: 66, y: 75, orbit: 2, tone: 'cyan', signals: 5, keywords: ['식물', '네트워크', '숲'], questions: ['느린 생명의 시간은 인간의 속도를 어떻게 바꾸는가?'], concepts: ['네트워크'] },
      { id: 'symbiosis', label: '공생 사회', en: 'SYMBIOSIS', x: 34, y: 75, orbit: 3, tone: 'blue', signals: 7, keywords: ['공생', '관계', '생명'], questions: ['공생은 선택인가 생존 조건인가?'], concepts: ['공생'] },
      { id: 'terraforming-ethics', label: '테라포밍 윤리', en: 'TERRAFORMING ETHICS', x: 24, y: 38, orbit: 2, tone: 'amber', signals: 6, keywords: ['테라포밍', '행성', '윤리'], questions: ['다른 행성을 바꾸는 권리는 누구에게 있는가?'], concepts: ['테라포밍'] },
    ],
    connections: [['eco-sf', 'climate-fiction'], ['eco-sf', 'animal-sentience'], ['eco-sf', 'plant-network'], ['eco-sf', 'symbiosis'], ['eco-sf', 'terraforming-ethics'], ['climate-fiction', 'apocalypse'], ['terraforming-ethics', 'hard-sf'], ['animal-sentience', 'posthuman']],
  },
};

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

function WorkDetailPanel({
  commentMessage,
  commentStatus,
  commentText,
  comments,
  onClose,
  onCommentSubmit,
  onCommentTextChange,
  onWorkStatusChange,
  user,
  work,
  workStatus,
  workStatusSaving,
}) {
  if (!work) return null;

  const statusOptions = [
    { value: 'want', label: '읽고 싶어요' },
    { value: 'reading', label: '읽는 중' },
    { value: 'done', label: '읽었어요' },
  ];

  const panel = (
    <div className="work-detail-modal" role="dialog" aria-modal="true" aria-label={`${work.title} 댓글`}>
      <article className={`work-detail-panel ${work.cover ? 'has-cover' : ''}`}>
        <header className="work-detail-head">
          <div>
            <span>{work.code}</span>
            <h3>{work.title}</h3>
            <p>{work.subtitle}</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 상세 닫기">×</button>
        </header>

        <div className="work-detail-body">
          {work.cover && (
            <figure className="work-detail-cover">
              <img src={work.cover} alt={`${work.title} 표지`} />
            </figure>
          )}
          <div className="work-detail-meta">
            <dl>
              <div>
                <dt>MEDIUM</dt>
                <dd>{work.medium}</dd>
              </div>
              {work.recommender && (
                <div>
                  <dt>RECOMMENDER</dt>
                  <dd>{work.recommender}</dd>
                </div>
              )}
            </dl>
            <div className="work-tags">
              {(work.tags ?? []).map(tag => <span key={tag}>{tag}</span>)}
            </div>
            {work.link && (
              <a className="work-archive-link" href={work.link} target="_blank" rel="noreferrer">
                알라딘 링크 열기 <ChevronRight aria-hidden="true" />
              </a>
            )}
            <div className="work-status-control" aria-label="작품 독서 상태">
              <span>READING STATUS</span>
              <div>
                {statusOptions.map(option => (
                  <button
                    className={workStatus === option.value ? 'is-active' : ''}
                    disabled={!user || workStatusSaving}
                    key={option.value}
                    onClick={() => onWorkStatusChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!user && <em>로그인하면 독서 상태를 저장할 수 있습니다.</em>}
            </div>
          </div>
        </div>

        <section className="work-comment-section">
          <div className="work-comment-head">
            <span>COMMENT SIGNALS</span>
            <strong>{comments.length} COMMENTS</strong>
          </div>
          <div className="work-comment-list">
            {comments.length > 0 ? comments.map(comment => (
              <article className="work-comment" key={comment.id}>
                <div>
                  <strong>{comment.author_name || '익명 탐사자'}</strong>
                  <time>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</time>
                </div>
                <p>{comment.body}</p>
              </article>
            )) : (
              <p className="work-comment-empty">아직 댓글 신호가 없습니다. 첫 반응을 남겨보세요.</p>
            )}
          </div>
          <form className="work-comment-form" onSubmit={onCommentSubmit}>
            <textarea
              disabled={!user || commentStatus === 'saving'}
              onChange={event => onCommentTextChange(event.target.value)}
              placeholder={user ? '이 작품에 대한 짧은 감상이나 질문을 남겨주세요.' : '댓글을 남기려면 먼저 로그인해주세요.'}
              rows={3}
              value={commentText}
            />
            <button disabled={!user || !commentText.trim() || commentStatus === 'saving'} type="submit">
              <Send aria-hidden="true" />
              댓글 저장
            </button>
          </form>
          {commentMessage && <p className={`work-comment-message is-${commentStatus}`}>{commentMessage}</p>}
        </section>
      </article>
    </div>
  );

  if (typeof document === 'undefined') return panel;
  return createPortal(panel, document.body);
}

function WorkArchiveFormPanel({
  form,
  message,
  onChange,
  onClose,
  onSubmit,
  status,
}) {
  const panel = (
    <div className="work-detail-modal" role="dialog" aria-modal="true" aria-label="작품 아카이브 입력">
      <article className="work-submit-panel">
        <header className="work-detail-head">
          <div>
            <span>NEW ARCHIVE SIGNAL</span>
            <h3>작품 아카이브</h3>
            <p>입력한 작품 신호는 노션 작품 아카이브 DB에 바로 저장됩니다.</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 아카이브 입력 닫기">×</button>
        </header>

        <form className="work-submit-form" onSubmit={onSubmit}>
          <label>
            <span>제목</span>
            <input name="title" onChange={onChange} placeholder="작품 제목" required value={form.title} />
          </label>
          <label>
            <span>카테고리</span>
            <select name="category" onChange={onChange} value={form.category}>
              <option value="소설">소설</option>
              <option value="영화">영화</option>
              <option value="게임">게임</option>
              <option value="애니메이션">애니메이션</option>
            </select>
          </label>
          <label>
            <span>저자</span>
            <input name="author" onChange={onChange} placeholder="저자 / 감독 / 제작자" value={form.author} />
          </label>
          <label>
            <span>출판사</span>
            <input name="publisher" onChange={onChange} placeholder="출판사 / 배급사 / 스튜디오" value={form.publisher} />
          </label>
          <label className="is-wide">
            <span>알라딘 링크</span>
            <input name="link" onChange={onChange} placeholder="https://www.aladin.co.kr/..." value={form.link} />
          </label>
          <label>
            <span>태그</span>
            <input name="tags" onChange={onChange} placeholder="쉼표로 구분: 하드SF, 디스토피아" value={form.tags} />
          </label>
          <label>
            <span>추천자</span>
            <input name="recommender" onChange={onChange} placeholder="추천자 이름" value={form.recommender} />
          </label>
          <div className="work-submit-actions">
            <p className={`work-comment-message is-${status}`}>
              {status === 'idle' && '현재는 소설 입력을 기준으로 작동합니다. 다른 카테고리는 선택만 가능합니다.'}
              {status === 'submitting' && '노션에 작품 신호를 저장 중입니다.'}
              {status !== 'idle' && status !== 'submitting' && message}
            </p>
            <button disabled={status === 'submitting'} type="submit">
              <Database aria-hidden="true" />
              {status === 'submitting' ? '저장 중' : '노션에 저장'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );

  if (typeof document === 'undefined') return panel;
  return createPortal(panel, document.body);
}

export default function Home() {
  const { user } = useAuth();
  const [works, setWorks] = useState(fallbackWorks);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [selectedCoordinateId, setSelectedCoordinateId] = useState('');
  const [mapView, setMapView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [tasteQuestionSet, setTasteQuestionSet] = useState(() => getRandomTasteQuestions());
  const [tasteAnswers, setTasteAnswers] = useState({});
  const archiveMode = 'random';
  const [randomWorkCodes, setRandomWorkCodes] = useState(() => getRandomWorks(fallbackWorks, 6).map(work => work.code));
  const [mediaItems, setMediaItems] = useState([]);
  const [activeMediaCategory, setActiveMediaCategory] = useState(mediaCategories[0]);
  const [concepts, setConcepts] = useState(conceptEntries);
  const [randomConceptCodes, setRandomConceptCodes] = useState(() => getRandomWorks(conceptEntries, conceptEntries.length).map(concept => concept.code));
  const [activeConceptCode, setActiveConceptCode] = useState('');
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
  const [selectedWork, setSelectedWork] = useState(null);
  const [workComments, setWorkComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');
  const [commentMessage, setCommentMessage] = useState('');
  const [workStatuses, setWorkStatuses] = useState({});
  const [workStatusSaving, setWorkStatusSaving] = useState(false);
  const [isWorkSubmitOpen, setIsWorkSubmitOpen] = useState(false);
  const [workSubmitStatus, setWorkSubmitStatus] = useState('idle');
  const [workSubmitMessage, setWorkSubmitMessage] = useState('');
  const [workSubmitForm, setWorkSubmitForm] = useState({
    title: '',
    author: '',
    publisher: '',
    category: '소설',
    link: '',
    tags: '',
    recommender: '',
  });
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [coordinateLogUrl, setCoordinateLogUrl] = useState('');
  const [coordinateLogStatus, setCoordinateLogStatus] = useState('idle');
  const [coordinateLogMessage, setCoordinateLogMessage] = useState('');
  const [dashboard, setDashboard] = useState({
    logs: [],
    questions: [],
    status: {
      works: false,
      media: false,
      concepts: false,
      logs: false,
      questions: false,
    },
  });

  const recordMissionSignal = useCallback(async (signalKey, activity) => {
    if (!user) return;
    const storageKey = `sf-mission-signal:${user.id}:${signalKey}`;
    if (localStorage.getItem(storageKey)) return;
    const result = await recordUserActivity(user, activity);
    if (result?.ok) localStorage.setItem(storageKey, '1');
  }, [user]);

  const resetCoordinateMap = () => {
    setActiveGenreId(null);
    setSelectedCoordinateId('');
    setMapView({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  };
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const localKey = `sf-work-statuses:${user.id}`;
    if (!supabase) return;
    let isMounted = true;

    supabase
      .from('work_statuses')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted || error) return;
        const nextStatuses = Object.fromEntries((data ?? []).map(item => [item.work_code, item.status]));
        setWorkStatuses(nextStatuses);
        localStorage.setItem(localKey, JSON.stringify(nextStatuses));
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedWork || !supabase) {
      return undefined;
    }

    let isMounted = true;

    supabase
      .from('work_comments')
      .select('*')
      .eq('work_code', selectedWork.code)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setWorkComments([]);
          setCommentStatus('error');
          setCommentMessage('댓글 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.');
          return;
        }
        setWorkComments(data ?? []);
        setCommentStatus('idle');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWork]);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/works')
      .then(response => {
        if (!response.ok) throw new Error('Notion archive unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.works) && data.works.length > 0) {
          setWorks(data.works);
          setRandomWorkCodes(getRandomWorks(data.works, 6).map(work => work.code));
          setDashboard(state => ({ ...state, status: { ...state.status, works: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setWorks(fallbackWorks);
          setDashboard(state => ({ ...state, status: { ...state.status, works: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/media', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Notion media unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.media)) {
          setMediaItems(data.media);
          setDashboard(state => ({ ...state, status: { ...state.status, media: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setMediaItems([]);
          setDashboard(state => ({ ...state, status: { ...state.status, media: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/concepts', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Notion concepts unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.concepts)) {
          const randomizedConcepts = getRandomWorks(data.concepts, data.concepts.length);
          setConcepts(data.concepts);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          const randomizedConcepts = getRandomWorks(conceptEntries, conceptEntries.length);
          setConcepts(conceptEntries);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      fetch('/api/exploration-log', { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Exploration log unavailable');
        return response.json();
      }),
      fetch('/api/questions', { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Questions unavailable');
        return response.json();
      }),
    ]).then(([logsResult, questionsResult]) => {
      if (!isMounted) return;

      setDashboard(state => ({
        ...state,
        logs: logsResult.status === 'fulfilled' && Array.isArray(logsResult.value.logs) ? logsResult.value.logs : [],
        questions: questionsResult.status === 'fulfilled' && Array.isArray(questionsResult.value.questions) ? questionsResult.value.questions : [],
        status: {
          ...state.status,
          logs: logsResult.status === 'fulfilled',
          questions: questionsResult.status === 'fulfilled',
        },
      }));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeGenre = activeGenreId ? genreNodes.find(node => node.id === activeGenreId) : null;
  const activeSubmap = activeGenreId ? genreSubmaps[activeGenreId] : null;
  const activeSubmapNodeIds = new Set(activeSubmap?.nodes.map(node => node.id) ?? []);
  const externalNodeSlots = [
    { x: 13, y: 17 },
    { x: 87, y: 17 },
    { x: 89, y: 84 },
    { x: 11, y: 84 },
    { x: 50, y: 92 },
  ];
  const submapExternalNodes = activeSubmap
    ? [...new Set((activeSubmap.connections ?? []).flat())]
      .filter(id => id !== activeGenreId && !activeSubmapNodeIds.has(id))
      .map((id, index) => {
        const linkedGenre = genreNodes.find(node => node.id === id);
        if (!linkedGenre) return null;
        return {
          ...linkedGenre,
          ...externalNodeSlots[index % externalNodeSlots.length],
          orbit: Math.max(1, linkedGenre.orbit - 1),
          external: true,
        };
      })
      .filter(Boolean)
    : [];
  const visibleNodes = activeSubmap
    ? [...activeSubmap.nodes, ...submapExternalNodes]
    : [sfCoreNode, ...genreNodes];
  const visibleConnections = activeSubmap
    ? activeSubmap.connections ?? activeSubmap.nodes.map(node => [activeGenreId, node.id])
    : mapConnections;
  const mapPositions = activeSubmap && activeGenre
    ? [{ ...activeGenre, x: 50, y: 50, orbit: 5 }, ...visibleNodes]
    : visibleNodes;
  const selectedCoordinate = mapPositions.find(node => node.id === selectedCoordinateId) ?? activeGenre ?? sfCoreNode;
  const selectedCoordinateConnections = selectedCoordinateId
    ? visibleConnections.filter(([from, to]) => from === selectedCoordinateId || to === selectedCoordinateId)
    : [];
  const relatedCoordinateIds = new Set(selectedCoordinateConnections.flat());
  const hasCoordinateFocus = Boolean(selectedCoordinateId);
  const selectedCoordinateWorks = findRelatedWorksForNode(selectedCoordinate, works);
  const selectedCoordinateConcepts = findRelatedConceptsForNode(selectedCoordinate, concepts);
  const selectedCoordinateQuestions = selectedCoordinate.questions?.length
    ? selectedCoordinate.questions
    : ['이 좌표는 어떤 인간 이후의 조건을 상상하게 만드는가?'];
  const mapDescription = activeSubmap?.description
    ?? '탐사 좌표는 SF를 중심으로 8개의 하위 장르를 배치합니다. 각 장르는 독립된 행성이면서도 서로 다른 장르와 연결되어 새로운 질문의 항로를 만듭니다.';
  const minimapViewportWidth = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewportHeight = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewport = {
    width: minimapViewportWidth,
    height: minimapViewportHeight,
    x: clamp(50 + (mapView.yaw * 5) - minimapViewportWidth / 2, 4, 96 - minimapViewportWidth),
    y: clamp(50 + (mapView.pitch * 14) - minimapViewportHeight / 2, 4, 96 - minimapViewportHeight),
  };

  const handleGenreNodeClick = node => {
    if (node.id === sfCoreNode.id) {
      resetCoordinateMap();
      return;
    }

    if (node.id === selectedCoordinateId && !genreSubmaps[node.id]) {
      setSelectedCoordinateId('');
      return;
    }

    setSelectedCoordinateId(node.id);
    if (genreSubmaps[node.id]) {
      setActiveGenreId(node.id);
    }
  };

  const openCoordinateLogModal = () => {
    if (!selectedCoordinateId) return;
    setCoordinateLogUrl('');
    setCoordinateLogStatus('idle');
    setCoordinateLogMessage('');
    setIsLogModalOpen(true);
  };

  const submitCoordinateLog = async event => {
    event.preventDefault();
    if (!coordinateLogUrl.trim()) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage('인스타 서평 주소를 입력해주세요.');
      return;
    }

    setCoordinateLogStatus('submitting');
    setCoordinateLogMessage('');

    try {
      const response = await fetch('/api/exploration-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramUrl: coordinateLogUrl,
          nodeId: selectedCoordinate.id,
          nodeLabel: selectedCoordinate.label,
          nodeEnglish: selectedCoordinate.en,
          workTitle: selectedCoordinate.label,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.notion?.message || data?.error || '탐사 로그 저장에 실패했습니다.');
      }

      setCoordinateLogStatus('success');
      setCoordinateLogMessage('탐사 로그가 노션에 저장되었습니다.');
      setDashboard(state => ({
        ...state,
        logs: data.log ? [data.log, ...state.logs] : state.logs,
        status: { ...state.status, logs: true },
      }));
      setCoordinateLogUrl('');
    } catch (error) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage(error.message);
    }
  };

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

  const openWorkDetail = work => {
    setSelectedWork(work);
    setWorkComments([]);
    setCommentText('');
    setCommentStatus('loading');
    setCommentMessage('');
  };

  const openWorkSubmit = () => {
    setWorkSubmitStatus('idle');
    setWorkSubmitMessage('');
    setIsWorkSubmitOpen(true);
  };

  const updateWorkSubmitForm = event => {
    const { name, value } = event.target;
    setWorkSubmitForm(form => ({ ...form, [name]: value }));
  };

  const submitWorkArchive = async event => {
    event.preventDefault();
    if (!workSubmitForm.title.trim()) {
      setWorkSubmitStatus('error');
      setWorkSubmitMessage('작품 제목을 입력해주세요.');
      return;
    }

    setWorkSubmitStatus('submitting');
    setWorkSubmitMessage('');

    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workSubmitForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.notion?.message || data?.error || '작품 저장에 실패했습니다.');
      }

      const refreshResponse = await fetch('/api/works?refresh=1');
      const refreshed = await refreshResponse.json().catch(() => ({}));
      if (Array.isArray(refreshed.works) && refreshed.works.length > 0) {
        setWorks(refreshed.works);
        setRandomWorkCodes(getRandomWorks(refreshed.works, 6).map(work => work.code));
      } else if (data.work) {
        setWorks(current => [data.work, ...current]);
      }

      setWorkSubmitForm({
        title: '',
        author: '',
        publisher: '',
        category: '소설',
        link: '',
        tags: '',
        recommender: '',
      });
      setWorkSubmitStatus('success');
      setWorkSubmitMessage('작품 신호가 노션 아카이브에 저장되었습니다.');
    } catch (error) {
      setWorkSubmitStatus('error');
      setWorkSubmitMessage(error.message);
    }
  };

  const updateWorkStatus = async nextStatus => {
    if (!selectedWork) return;
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('독서 상태를 저장하려면 먼저 로그인해주세요.');
      return;
    }

    const localKey = `sf-work-statuses:${user.id}`;
    const nextStatuses = { ...workStatuses, [selectedWork.code]: nextStatus };
    setWorkStatuses(nextStatuses);
    localStorage.setItem(localKey, JSON.stringify(nextStatuses));
    setWorkStatusSaving(true);

    if (!supabase) {
      setWorkStatusSaving(false);
      return;
    }

    const { error } = await supabase
      .from('work_statuses')
      .upsert({
        user_id: user.id,
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,work_code' });

    setWorkStatusSaving(false);
    if (error) {
      setCommentStatus('error');
      setCommentMessage('독서 상태 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.');
      return;
    }

    setCommentStatus('success');
    setCommentMessage('독서 상태가 저장되었습니다.');
  };

  const submitWorkComment = async event => {
    event.preventDefault();
    if (!selectedWork || !supabase) return;
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('댓글을 남기려면 먼저 로그인해주세요.');
      return;
    }

    const body = commentText.trim();
    if (!body) return;

    setCommentStatus('saving');
    setCommentMessage('');

    const authorName = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐사자';
    const { data, error } = await supabase
      .from('work_comments')
      .insert({
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        user_id: user.id,
        author_name: authorName,
        body,
      })
      .select('*')
      .single();

    if (error) {
      setCommentStatus('error');
      setCommentMessage(error.message);
      return;
    }

    await recordUserActivity(user, {
      actionType: 'comment',
      points: 10,
      genre: selectedWork.medium,
      metadata: {
        title: `${selectedWork.title} 댓글`,
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        tags: selectedWork.tags ?? [],
        node: 'works-archive',
      },
    });

    setWorkComments(current => [...current, data]);
    setCommentText('');
    setCommentStatus('success');
    setCommentMessage('+10 MP. 댓글 신호가 저장되었습니다.');
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

      <WorksArchiveSection
        displayedWorks={displayedWorks}
        onOpenWorkDetail={openWorkDetail}
        onOpenWorkSubmit={openWorkSubmit}
        selectedWork={selectedWork}
        workCategories={workCategories}
        workCategoryCounts={workCategoryCounts}
        worksCount={works.length}
      />

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

      <CommunitySection
        onQuestionFormChange={updateQuestionForm}
        onQuestionSubmit={submitQuestion}
        questionForm={questionForm}
        questionMessage={questionMessage}
        questionStatus={questionStatus}
      />

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
        <div className="coordinate-log-modal" role="dialog" aria-modal="true" aria-label="탐사 로그 작성">
          <form className="coordinate-log-form" onSubmit={submitCoordinateLog}>
            <div className="coordinate-log-form-head">
              <span>MISSION LOG INPUT</span>
              <button
                aria-label="탐사 로그 작성 닫기"
                onClick={() => setIsLogModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <h3>{selectedCoordinate.label} 탐사 로그</h3>
            <p>
              선택한 좌표에 연결할 인스타 서평 주소를 입력하면 탐사 로그 노션 DB에 저장됩니다.
            </p>
            <label>
              <span>인스타 서평 주소</span>
              <input
                autoFocus
                onChange={event => setCoordinateLogUrl(event.target.value)}
                placeholder="https://www.instagram.com/p/..."
                type="url"
                value={coordinateLogUrl}
              />
            </label>
            <div className="coordinate-log-actions">
              <p className={`coordinate-log-message is-${coordinateLogStatus}`}>
                {coordinateLogStatus === 'idle' && '저장 후 탐사 로그 페이지에서 함께 보입니다.'}
                {coordinateLogStatus === 'submitting' && '노션으로 신호를 전송 중입니다.'}
                {coordinateLogStatus !== 'idle' && coordinateLogStatus !== 'submitting' && coordinateLogMessage}
              </p>
              <button type="submit" disabled={coordinateLogStatus === 'submitting'}>
                <Send size={16} />
                {coordinateLogStatus === 'submitting' ? '저장 중' : '노션에 저장'}
              </button>
            </div>
          </form>
        </div>
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
        onClose={() => {
          setSelectedWork(null);
          setWorkComments([]);
        }}
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
