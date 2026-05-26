import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
import CoordinateUniverse from '../components/CoordinateUniverse';
import PageTransition from '../components/PageTransition';
import './Home.css';

const navItems = [
  { label: '작품 아카이브', href: '#works-archive' },
  { label: '미디어 아카이브', href: '#media-archive' },
  { label: '탐사 좌표', href: '#coordinates' },
  { label: '탐사 로그', href: '/exploration-log' },
  { label: 'SF 개념 사전', href: '#concept-dictionary' },
  { label: '커뮤니티게시판', href: '/questions' },
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

const workCategories = [
  { label: 'NOVEL', title: '소설', count: '042 SIGNALS' },
  { label: 'CINEMA', title: '영화', count: '027 SIGNALS' },
  { label: 'GAME', title: '게임', count: '018 SIGNALS' },
  { label: 'ANIMATION', title: '애니메이션', count: '011 SIGNALS' },
];

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

export default function Home() {
  const [works, setWorks] = useState(fallbackWorks);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [selectedCoordinateId, setSelectedCoordinateId] = useState('');
  const [mapView, setMapView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [archiveMode, setArchiveMode] = useState('random');
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
    let isMounted = true;

    fetch('/api/works', { cache: 'no-store' })
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
      setQuestionForm({
        title: '',
        content: '',
        name: '',
        contact: '',
        category: '커뮤니티',
        password: '',
      });
      setQuestionStatus('success');
      setQuestionMessage('새 글이 저장되었습니다.');
    } catch (error) {
      setQuestionStatus('error');
      setQuestionMessage(error.message);
    }
  };

  const displayedWorks = archiveMode === 'all'
    ? works
    : works.filter(work => randomWorkCodes.includes(work.code)).slice(0, 6);
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

      <section className="works-archive-section" id="works-archive">
        <div className="section-shell">
          <div className="section-heading">
            <span>ARCHIVE NODE 01</span>
            <h2>작품 아카이브</h2>
            <p>
              SF 탐사단의 작품 아카이브는 작품을 단순 목록으로 보관하지 않고,
              세계관, 매체, 핵심 질문, 감각적 밀도에 따라 탐사 가능한 신호로 분류합니다.
            </p>
          </div>

          <div className="archive-category-grid" aria-label="작품 매체 분류">
            {workCategories.map(category => (
              <button
                className={`category-tile ${category.label === 'NOVEL' && archiveMode === 'all' ? 'is-active' : ''}`}
                key={category.label}
                onClick={() => category.label === 'NOVEL' && setArchiveMode(mode => (mode === 'all' ? 'random' : 'all'))}
                type="button"
              >
                <span>{category.label}</span>
                <strong>{category.title}</strong>
                <em>{category.label === 'NOVEL' ? `${works.length} SIGNALS` : category.count}</em>
              </button>
            ))}
          </div>

          <div className="works-layout">
            <div className="works-brief">
              <span>CLASSIFICATION METHOD</span>
              <h3>작품을 좌표로 읽기</h3>
              <p>
                각 작품은 장르보다 먼저 질문으로 기록됩니다. 이 작품이 어떤 인간 이후의 조건을
                상상하는지, 어떤 기술과 감각을 호출하는지, 그리고 지금 우리의 세계와 어디에서
                접속되는지를 추적합니다.
              </p>
              <dl>
                <div>
                  <dt>AXIS 01</dt>
                  <dd>세계관과 사회 구조</dd>
                </div>
                <div>
                  <dt>AXIS 02</dt>
                  <dd>기술, 신체, 의식의 변화</dd>
                </div>
                <div>
                  <dt>AXIS 03</dt>
                  <dd>토론 가능한 핵심 질문</dd>
                </div>
              </dl>
            </div>

            <div className="archive-view-status">
              <span>{archiveMode === 'all' ? 'FULL NOVEL ARCHIVE' : 'RANDOM SIGNALS'}</span>
              <strong>{displayedWorks.length} / {works.length} WORKS</strong>

              <div className="featured-work-grid" aria-label="대표 작품 신호">
                {displayedWorks.map(work => {
                  const WorkCard = work.link ? 'a' : 'article';
                  return (
                    <WorkCard
                      className={`work-card ${work.link ? 'is-linked' : ''} ${work.cover ? 'has-cover' : ''}`}
                      href={work.link || undefined}
                      key={work.code}
                      rel={work.link ? 'noreferrer' : undefined}
                      target={work.link ? '_blank' : undefined}
                    >
                      <div className="work-card-top">
                        <span>{work.code}</span>
                        <em>{work.medium}</em>
                      </div>
                      {work.cover && (
                        <figure className="work-cover">
                          <img src={work.cover} alt={`${work.title} 표지`} loading="lazy" />
                        </figure>
                      )}
                      <h3>{work.title}</h3>
                      <p>{work.subtitle}</p>
                      {work.recommender && <span className="work-recommender">추천자 {work.recommender}</span>}
                      <div className="work-tags">
                        {work.tags.map(tag => <span key={tag}>{tag}</span>)}
                      </div>
                      <div className="work-card-footer">
                        <span>{work.link ? 'ARCHIVE LINK' : 'ARCHIVE SIGNAL'}</span>
                        <ChevronRight aria-hidden="true" />
                      </div>
                    </WorkCard>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="media-section" id="media-archive">
        <div className="section-shell">
          <div className="section-heading">
            <span>ARCHIVE NODE 03</span>
            <h2>미디어 아카이브</h2>
            <p>
              SF 작가 인터뷰, 관련 미디어, 고전 SF 영화를 모아두는 영상과 읽을거리 저장소입니다.
            </p>
          </div>

          <div className="media-tabs" aria-label="미디어 분류">
            {mediaCategories.map(category => (
              <button
                className={activeMediaCategory === category ? 'is-active' : ''}
                key={category}
                onClick={() => setActiveMediaCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
            <Link className="media-full-link" to={activeMediaArchivePath}>
              전체 보기 <ChevronRight aria-hidden="true" />
            </Link>
          </div>

          <div className="media-grid">
            {previewMedia.length > 0 ? previewMedia.map(item => (
              <a className="media-card" href={item.link} key={item.code} rel="noreferrer" target="_blank">
                <div className="media-thumb">
                  {item.thumbnail ? <img src={item.thumbnail} alt={`${item.title} 썸네일`} loading="lazy" /> : <Play aria-hidden="true" />}
                </div>
                <div className="media-card-body">
                  <span>{item.code} / {item.medium}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description || item.publisher || item.category}</p>
                  <div className="media-meta">
                    {item.publisher && <em>{item.publisher}</em>}
                    {(item.date || item.year) && <em>{item.date || item.year}</em>}
                  </div>
                  <div className="media-tags">
                    {item.tags.map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
              </a>
            )) : (
              <div className="media-empty">
                <strong>NO SIGNALS</strong>
                <span>{activeMediaCategory} 데이터가 아직 없습니다.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="coordinates-section" id="coordinates">
        <div className="section-shell">
          <div className="section-heading">
            <span>EXPLORATION NODE MAP</span>
            <h2>탐사 좌표</h2>
            <p>
              SF 장르와 개념을 노드 기반 지도로 배치한 탐사 좌표입니다.
              각 노드는 작품 아카이브의 신호가 모이는 방향이며, 서로 다른 상상력의 경로를 연결합니다.
            </p>
          </div>

          <div className="coordinate-map-layout">
            <CoordinateUniverse
              activeGenre={activeGenre}
              className={hasCoordinateFocus ? 'is-focused' : ''}
              connections={visibleConnections}
              hasFocus={hasCoordinateFocus}
              nodes={mapPositions}
              onNodeSelect={handleGenreNodeClick}
              onReset={resetCoordinateMap}
              onViewChange={setMapView}
              relatedIds={relatedCoordinateIds}
              selectedId={selectedCoordinateId}
            />

            <aside className="coordinate-brief">
              <span>MAP PROTOCOL</span>
              <h3>{selectedCoordinate.label}</h3>
              <p>{mapDescription}</p>
              <dl>
                <div>
                  <dt>SELECTED NODE</dt>
                  <dd>{selectedCoordinate.en}</dd>
                </div>
                <div>
                  <dt>RELATED WORKS</dt>
                  <dd>{selectedCoordinateWorks.length} 작품 신호</dd>
                </div>
                <div>
                  <dt>MODE</dt>
                  <dd>{activeGenre ? 'Subgenre Mapping' : 'Archive Mapping'}</dd>
                </div>
              </dl>
              <button
                className="coordinate-log-trigger"
                disabled={!selectedCoordinateId}
                onClick={openCoordinateLogModal}
                type="button"
              >
                <Send size={16} />
                탐사 로그 작성
              </button>
              <div className="coordinate-panel-section">
                <span>RELATED WORKS</span>
                {selectedCoordinateWorks.length > 0 ? (
                  <div className="coordinate-work-list">
                    {selectedCoordinateWorks.map(work => {
                      const WorkLink = work.link ? 'a' : 'article';
                      return (
                        <WorkLink
                          className="coordinate-work-item"
                          href={work.link || undefined}
                          key={work.code}
                          rel={work.link ? 'noreferrer' : undefined}
                          target={work.link ? '_blank' : undefined}
                        >
                          <strong>{work.title}</strong>
                          <em>{work.medium}</em>
                        </WorkLink>
                      );
                    })}
                  </div>
                ) : (
                  <p className="coordinate-empty-note">아직 이 좌표와 자동 연결된 작품이 없습니다.</p>
                )}
              </div>
              <div className="coordinate-panel-section">
                <span>CORE QUESTIONS</span>
                <ul className="coordinate-question-list">
                  {selectedCoordinateQuestions.map(question => <li key={question}>{question}</li>)}
                </ul>
              </div>
              <div className="coordinate-panel-section">
                <span>RELATED CONCEPTS</span>
                <div className="coordinate-concept-list">
                  {(selectedCoordinateConcepts.length > 0 ? selectedCoordinateConcepts : selectedCoordinate.concepts?.map(term => ({ code: term, term })) ?? []).map(concept => (
                    <button
                      key={concept.code || concept.term}
                      onClick={() => concept.code && selectConcept(concept.code)}
                      type="button"
                    >
                      {concept.term}
                    </button>
                  ))}
                </div>
              </div>
              <div className="coordinate-minimap" aria-label="탐사 좌표 미니맵">
                <div className="coordinate-minimap-top">
                  <span>MINI MAP</span>
                  <strong>+</strong>
                </div>
                <div className="coordinate-mini-space">
                  {mapPositions.map(node => (
                    <i
                      key={node.id}
                      className={`mini-node tone-${node.tone}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    />
                  ))}
                  <span
                    className="mini-viewport"
                    style={{
                      left: `${minimapViewport.x}%`,
                      top: `${minimapViewport.y}%`,
                      width: `${minimapViewport.width}%`,
                      height: `${minimapViewport.height}%`,
                    }}
                  />
                  <b />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="concept-section" id="concept-dictionary">
        <div className="section-shell">
          <div className="section-heading">
            <span>ARCHIVE NODE 02</span>
            <h2>SF 개념 사전</h2>
            <p>
              SF 작품을 읽을 때 반복해서 나타나는 장르, 세계관, 기술, 사회적 질문을
              작은 탐사 용어로 정리합니다.
            </p>
          </div>

          <div className="concept-layout">
            <aside className="concept-index">
              <span>DICTIONARY INDEX</span>
              <button
                aria-expanded={showAllConcepts}
                className="concept-count-button"
                onClick={() => setShowAllConcepts(value => !value)}
                type="button"
              >
                {concepts.length} TERMS
              </button>
              <p>작품 아카이브와 탐사 좌표 사이를 연결하는 개념 신호 목록입니다.</p>
            </aside>

            {selectedConcept ? (
              <div className="concept-browser">
                <article className={`concept-feature-card ${conceptReadingMode ? 'is-reading-local' : ''}`} ref={conceptFeatureRef}>
                  <div className="concept-card-top">
                    <span>{selectedConcept.code}</span>
                    <em>{selectedConcept.category}</em>
                  </div>
                  <button
                    className="local-reading-toggle"
                    onClick={() => setConceptReadingMode(value => !value)}
                    type="button"
                  >
                    {conceptReadingMode ? 'Console View' : 'Reading View'}
                  </button>
                  <h3>{selectedConcept.term}</h3>
                  <strong>{selectedConcept.english}</strong>
                  <p>{selectedConcept.summary}</p>
                  {selectedConcept.relatedWorks?.length > 0 && (
                    <dl className="concept-meta-list">
                      <div>
                        <dt>관련 작품</dt>
                        <dd>{selectedConcept.relatedWorks.join(', ')}</dd>
                      </div>
                    </dl>
                  )}
                  {selectedConcept.source && (
                    <dl className="concept-meta-list">
                      <div>
                        <dt>출처</dt>
                        <dd>
                          {getConceptSource(selectedConcept.source, selectedConcept).href ? (
                            <a
                              className="concept-source-link"
                              href={getConceptSource(selectedConcept.source, selectedConcept).href}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {getConceptSource(selectedConcept.source, selectedConcept).label}
                            </a>
                          ) : (
                            getConceptSource(selectedConcept.source, selectedConcept).label
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {selectedConcept.keywords?.length > 0 && (
                    <div className="concept-tags">
                      {selectedConcept.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}
                    </div>
                  )}
                </article>

                <div className="concept-grid">
                  {visibleConcepts.map(entry => (
                    <button
                      className={`concept-card ${entry.code === selectedConcept.code ? 'is-active' : ''}`}
                      key={entry.code}
                      onClick={() => selectConcept(entry.code)}
                      type="button"
                    >
                      <span>{entry.code}</span>
                      <strong>{entry.term}</strong>
                      {entry.english && <small>{entry.english}</small>}
                      <em>{entry.category}</em>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="concept-empty">
                <strong>NO TERMS</strong>
                <span>노션 SF 개념 사전에 아직 등록된 개념어가 없습니다.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="question-section" id="question-vault">
        <div className="section-shell">
          <div className="section-heading">
            <span>ARCHIVE NODE 04</span>
            <h2>커뮤니티 게시판</h2>
            <p>
              SF 작품을 읽고 남은 질문, 추천, 제안, 함께 나누고 싶은 이야기를
              비밀번호 입력 후 바로 남길 수 있습니다.
            </p>
          </div>

          <div className="question-layout">
            <aside className="question-brief">
              <MessageSquare aria-hidden="true" />
              <span>QUESTION VAULT</span>
              <h3>새 글은 다음 탐사의 좌표가 됩니다</h3>
              <p>
                작품명, 핵심 질문, 떠오른 장면, 추천하고 싶은 자료를 함께 적어두면
                더 좋은 커뮤니티 신호가 됩니다.
              </p>
              <dl>
                <div>
                  <dt>TYPE</dt>
                  <dd>질문 / 추천 / 제안 / 수업 주제</dd>
                </div>
                <div>
                  <dt>MODE</dt>
                  <dd>비밀번호 입력 후 바로 저장</dd>
                </div>
              </dl>
            </aside>

            <form className="question-form" onSubmit={submitQuestion}>
              <label>
                <span>글 제목</span>
                <input
                  name="title"
                  onChange={updateQuestionForm}
                  placeholder="예: 인간과 인공지능의 경계는 어디서 무너질까?"
                  type="text"
                  value={questionForm.title}
                />
              </label>

              <label>
                <span>글 내용</span>
                <textarea
                  name="content"
                  onChange={updateQuestionForm}
                  placeholder="작품명, 장면, 떠오른 생각을 자유롭게 적어주세요."
                  rows="7"
                  value={questionForm.content}
                />
              </label>

              <div className="question-form-row">
                <label>
                  <span>이름</span>
                  <input
                    name="name"
                    onChange={updateQuestionForm}
                    placeholder="익명 가능"
                    type="text"
                    value={questionForm.name}
                  />
                </label>
                <label>
                  <span>연락처</span>
                  <input
                    name="contact"
                    onChange={updateQuestionForm}
                    placeholder="이메일 또는 인스타그램"
                    type="text"
                    value={questionForm.contact}
                  />
                </label>
              </div>

              <label>
                <span>분류</span>
                <select name="category" onChange={updateQuestionForm} value={questionForm.category}>
                  <option>커뮤니티</option>
                  <option>토론 질문</option>
                  <option>작품 추천</option>
                  <option>강의/워크숍 주제</option>
                  <option>아카이브 제안</option>
                </select>
              </label>

              <label>
                <span>게시판 비밀번호</span>
                <input
                  name="password"
                  onChange={updateQuestionForm}
                  placeholder="비밀번호를 입력하세요"
                  type="password"
                  value={questionForm.password}
                />
              </label>

              <div className="question-form-actions">
                <p className={`question-status is-${questionStatus}`}>
                  {questionStatus === 'success' && questionMessage}
                  {questionStatus === 'error' && questionMessage}
                  {questionStatus === 'submitting' && '새 글을 저장 중입니다.'}
                  {questionStatus === 'idle' && '비밀번호를 입력한 뒤 새글 저장을 눌러주세요.'}
                </p>
                <button type="submit" disabled={questionStatus === 'submitting'}>
                  <Send aria-hidden="true" />
                  {questionStatus === 'submitting' ? '저장 중' : '새글 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

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
    </PageTransition>
  );
}
