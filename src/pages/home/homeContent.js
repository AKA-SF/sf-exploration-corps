import {
  Box,
  FileText,
  MessageSquare,
  Play,
  Satellite,
} from 'lucide-react';

export const navItems = [
  { label: '작품 아카이브', href: '#works-archive' },
  { label: '미디어 아카이브', href: '#media-archive' },
  { label: '탐사 좌표', href: '#coordinates' },
  { label: '탐사 로그', href: '/exploration-log' },
  { label: 'SF 개념 사전', href: '#concept-dictionary' },
  { label: '커뮤니티게시판', href: '/questions' },
  { label: '내 탐사 프로필', href: '/profile' },
  { label: 'Contact', href: '#contact' },
];

export const archiveCards = [
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

export const fallbackWorks = [
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

export const contactChannels = [
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

export const conceptEntries = [
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

export const mediaCategories = ['SF 작가 인터뷰', 'SF 관련 미디어', '고전 SF 영화'];

export const mediaCategorySlugs = {
  'SF 작가 인터뷰': 'interviews',
  'SF 관련 미디어': 'media',
  '고전 SF 영화': 'classic-films',
};
