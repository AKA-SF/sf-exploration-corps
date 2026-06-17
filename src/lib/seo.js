const SITE_URL = 'https://www.sf-explorer.net';
const SITE_NAME = 'SF 탐사단';
const DEFAULT_TITLE = 'SF 탐사단 | 과학소설 아카이브와 탐사 커뮤니티';
const DEFAULT_DESCRIPTION = 'SF 탐사단은 SF 소설, 영화, 게임, 애니메이션, 개념 사전, 미디어 자료, 커뮤니티 기록을 탐사 좌표처럼 연결하는 과학소설 아카이브입니다.';
const OG_IMAGE = `${SITE_URL}/og-image.svg`;

const routeMeta = [
  {
    match: pathname => pathname === '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  {
    match: pathname => pathname.startsWith('/works/novels'),
    title: 'SF 소설 아카이브 | SF 탐사단',
    description: 'SF 탐사단의 소설 아카이브입니다. 한국 과학소설, 해외 SF, 고전, 장르 태그, 추천자 기록을 탐사 좌표처럼 찾아볼 수 있습니다.',
  },
  {
    match: pathname => pathname.startsWith('/works/cinema'),
    title: 'SF 영화 아카이브 | SF 탐사단',
    description: 'SF 영화와 영상 작품을 장르, 질문, 감각적 키워드로 정리하는 SF 탐사단 작품 아카이브입니다.',
  },
  {
    match: pathname => pathname.startsWith('/works/games'),
    title: 'SF 게임 아카이브 | SF 탐사단',
    description: 'SF 게임과 인터랙티브 작품을 세계관, 질문, 장르 좌표로 연결해 살펴보는 SF 탐사단 아카이브입니다.',
  },
  {
    match: pathname => pathname.startsWith('/works/animation'),
    title: 'SF 애니메이션 아카이브 | SF 탐사단',
    description: 'SF 애니메이션 작품을 장르와 핵심 질문으로 탐사하는 SF 탐사단 작품 아카이브입니다.',
  },
  {
    match: pathname => pathname.startsWith('/media/interviews'),
    title: 'SF 작가 인터뷰 아카이브 | SF 탐사단',
    description: 'SF 작가와 창작자의 인터뷰, 강연, 대담 영상을 모아 읽기와 토론의 단서로 연결합니다.',
  },
  {
    match: pathname => pathname.startsWith('/media/media'),
    title: 'SF 관련 미디어 아카이브 | SF 탐사단',
    description: 'SF 관련 영상, 기사, 자료, 해설 콘텐츠를 모아 과학소설을 넓게 탐사하는 미디어 아카이브입니다.',
  },
  {
    match: pathname => pathname.startsWith('/media/classic-films'),
    title: '고전 SF 영화 아카이브 | SF 탐사단',
    description: '고전 SF 영화와 오래된 미래 상상력을 모아 현재의 SF 읽기와 연결하는 미디어 아카이브입니다.',
  },
  {
    match: pathname => pathname === '/exploration-log',
    title: '탐사 로그 | SF 탐사단',
    description: '인스타그램 리뷰와 서평 기록을 탐사 로그처럼 모아보는 SF 탐사단의 독서 기록 아카이브입니다.',
  },
  {
    match: pathname => pathname.startsWith('/questions'),
    title: '커뮤니티 게시판 | SF 탐사단',
    description: 'SF 작품 추천, 질문, 토론, 자유글을 남기고 다른 탐사자들과 댓글로 교신하는 커뮤니티 게시판입니다.',
  },
  {
    match: pathname => pathname.startsWith('/network'),
    title: '탐사 네트워크 | SF 탐사단',
    description: '커뮤니티 글, 작품 댓글, 무전 메시지를 실시간 신호망처럼 연결해 보여주는 SF 탐사단 네트워크입니다.',
  },
  {
    match: pathname => pathname === '/badges',
    title: '독서 업적 배지 | SF 탐사단',
    description: '독서 상태, 댓글, 커뮤니티 활동으로 해금되는 SF 탐사단의 독서 업적 배지 보관함입니다.',
    robots: 'noindex, nofollow',
  },
  {
    match: pathname => pathname === '/profile',
    title: '내 탐사 프로필 | SF 탐사단',
    description: 'SF 탐사단 개인 프로필, 마일리지, 배지, 미션, 수신함을 확인하는 대원 단말기입니다.',
    robots: 'noindex, nofollow',
  },
  {
    match: pathname => pathname === '/login',
    title: '로그인 | SF 탐사단',
    description: 'SF 탐사단 탐사 대원 계정으로 로그인하거나 새 계정을 등록합니다.',
    robots: 'noindex, nofollow',
  },
  {
    match: pathname => pathname.startsWith('/admin') || pathname.startsWith('/crew/'),
    title: 'SF 탐사단',
    description: DEFAULT_DESCRIPTION,
    robots: 'noindex, nofollow',
  },
];

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function ensureCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function getSeoMetadata(pathname) {
  const path = normalizePath(pathname);
  const matched = routeMeta.find(meta => meta.match(path));
  const meta = matched ?? {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;

  return {
    canonical,
    description: meta.description,
    image: OG_IMAGE,
    robots: meta.robots ?? 'index, follow, max-image-preview:large',
    siteName: SITE_NAME,
    title: meta.title,
  };
}

export function applySeoMetadata(metadata) {
  if (typeof document === 'undefined') return;
  document.title = metadata.title;

  ensureCanonical(metadata.canonical);
  ensureMeta('meta[name="description"]', { content: metadata.description, name: 'description' });
  ensureMeta('meta[name="robots"]', { content: metadata.robots, name: 'robots' });
  ensureMeta('meta[property="og:title"]', { content: metadata.title, property: 'og:title' });
  ensureMeta('meta[property="og:description"]', { content: metadata.description, property: 'og:description' });
  ensureMeta('meta[property="og:url"]', { content: metadata.canonical, property: 'og:url' });
  ensureMeta('meta[property="og:image"]', { content: metadata.image, property: 'og:image' });
  ensureMeta('meta[property="og:site_name"]', { content: metadata.siteName, property: 'og:site_name' });
  ensureMeta('meta[name="twitter:title"]', { content: metadata.title, name: 'twitter:title' });
  ensureMeta('meta[name="twitter:description"]', { content: metadata.description, name: 'twitter:description' });
  ensureMeta('meta[name="twitter:image"]', { content: metadata.image, name: 'twitter:image' });
}
