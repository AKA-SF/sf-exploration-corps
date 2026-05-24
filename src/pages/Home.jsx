import { useEffect, useMemo, useRef, useState } from 'react';
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
    text: 'SF 소설·영화·게임·음악 등 작품 데이터베이스',
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
  {
    icon: Mail,
    title: 'Contact',
    text: '협업·협찬·강의·일반 문의 채널',
    href: '#contact',
  },
];

const logLines = [
  ['LOG 001', 'SYSTEM BOOT', '00:00:01'],
  ['LOG 002', 'SIGNAL SCAN', '00:00:21'],
  ['LOG 003', 'ARCHIVE SYNC', '00:00:42'],
  ['LOG 004', 'NETWORK LINK', '00:01:05'],
  ['LOG 005', 'EXPLORATION READY', '00:01:30'],
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
  { label: 'SOUND', title: '음악', count: '013 SIGNALS' },
  { label: 'ANIMATION', title: '애니메이션', count: '011 SIGNALS' },
];

function getRandomWorks(items, count) {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
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

const mediaCategories = ['SF 작가 인터뷰', 'SF 관련 미디어', 'SF 관련 기사', '고전 SF 영화'];

function normalizeMediaCategory(category = '') {
  const normalized = category.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('작가') || normalized.includes('인터뷰')) return 'SF 작가 인터뷰';
  if (normalized.includes('미디어') || normalized.includes('media') || normalized.includes('콘텐츠') || normalized.includes('자료')) return 'SF 관련 미디어';
  if (normalized.includes('기사') || normalized.includes('article')) return 'SF 관련 기사';
  if (normalized.includes('고전') && (normalized.includes('영화') || normalized.includes('sf'))) return '고전 SF 영화';
  return category;
}

const genreNodes = [
  { id: 'cyberpunk', label: '사이버펑크', en: 'CYBERPUNK', x: 24, y: 31, orbit: 2, tone: 'cyan', signals: 12 },
  { id: 'space-opera', label: '스페이스 오페라', en: 'SPACE OPERA', x: 32, y: 65, orbit: 3, tone: 'blue', signals: 18 },
  { id: 'hard-sf', label: '하드 SF', en: 'HARD SF', x: 58, y: 27, orbit: 1, tone: 'cyan', signals: 9 },
  { id: 'dystopia', label: '디스토피아', en: 'DYSTOPIA', x: 61, y: 59, orbit: 2, tone: 'amber', signals: 16 },
  { id: 'posthuman', label: '포스트휴먼', en: 'POST-HUMAN', x: 74, y: 42, orbit: 3, tone: 'amber', signals: 14 },
  { id: 'ai-sf', label: 'AI SF', en: 'A.I', x: 20, y: 78, orbit: 2, tone: 'blue', signals: 10 },
  { id: 'time-travel', label: '시간여행', en: 'TIME TRAVEL', x: 70, y: 78, orbit: 1, tone: 'cyan', signals: 11 },
  { id: 'cosmic', label: '코즈믹 호러', en: 'COSMIC HORROR', x: 83, y: 23, orbit: 3, tone: 'blue', signals: 7 },
  { id: 'apocalypse', label: '아포칼립스', en: 'APOCALYPSE', x: 87, y: 61, orbit: 3, tone: 'amber', signals: 13 },
  { id: 'eco-sf', label: '생태 SF', en: 'ECO SF', x: 14, y: 50, orbit: 1, tone: 'cyan', signals: 8 },
];

const mapConnections = [
  ['cyberpunk', 'dystopia'],
  ['cyberpunk', 'ai-sf'],
  ['hard-sf', 'posthuman'],
  ['hard-sf', 'cosmic'],
  ['space-opera', 'hard-sf'],
  ['space-opera', 'eco-sf'],
  ['dystopia', 'apocalypse'],
  ['posthuman', 'ai-sf'],
  ['time-travel', 'dystopia'],
  ['time-travel', 'apocalypse'],
  ['cosmic', 'space-opera'],
  ['eco-sf', 'apocalypse'],
];

const genreSubmaps = {
  'hard-sf': {
    description: '하드 SF는 과학적 가설, 기술적 가능성, 물리 법칙의 제약을 중심으로 다시 여러 탐사 경로로 갈라집니다.',
    nodes: [
      { id: 'near-future', label: '근미래 기술 SF', en: 'NEAR FUTURE', x: 50, y: 19, orbit: 2, tone: 'cyan', signals: 8 },
      { id: 'space-engineering', label: '우주 공학 SF', en: 'SPACE ENGINEERING', x: 75, y: 34, orbit: 3, tone: 'blue', signals: 7 },
      { id: 'planetary-science', label: '행성과학 SF', en: 'PLANETARY SCIENCE', x: 77, y: 64, orbit: 2, tone: 'cyan', signals: 6 },
      { id: 'first-contact', label: '퍼스트 콘택트', en: 'FIRST CONTACT', x: 50, y: 82, orbit: 2, tone: 'amber', signals: 9 },
      { id: 'simulation', label: '시뮬레이션 SF', en: 'SIMULATION', x: 24, y: 64, orbit: 1, tone: 'blue', signals: 5 },
      { id: 'astrobiology', label: '우주생물학', en: 'ASTROBIOLOGY', x: 24, y: 34, orbit: 1, tone: 'amber', signals: 6 },
    ],
  },
};

const mapSignalDots = [
  { x: 18, y: 24, size: 2, delay: 0.1 },
  { x: 28, y: 43, size: 3, delay: 0.4 },
  { x: 42, y: 18, size: 2, delay: 0.8 },
  { x: 52, y: 72, size: 3, delay: 1.1 },
  { x: 67, y: 35, size: 2, delay: 1.4 },
  { x: 79, y: 50, size: 3, delay: 1.7 },
  { x: 35, y: 82, size: 2, delay: 2.0 },
  { x: 90, y: 33, size: 2, delay: 2.3 },
  { x: 11, y: 69, size: 3, delay: 2.6 },
  { x: 48, y: 46, size: 2, delay: 2.9 },
  { x: 56, y: 12, size: 2, delay: 3.2 },
  { x: 73, y: 87, size: 3, delay: 3.5 },
];

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

function SidePanel() {
  return (
    <aside className="home-side">
      <section className="hud-panel">
        <h2>SYSTEM LOG</h2>
        {logLines.map(([id, label, time]) => (
          <div className="log-line" key={id}>
            <strong>{id}</strong>
            <span>{label}</span>
            <em>{time}</em>
          </div>
        ))}
      </section>
      <section className="hud-panel compact">
        <h2>VESSEL INFO</h2>
        <dl>
          <dt>VESSEL</dt>
          <dd>SF EXPLORATION UNIT</dd>
          <dt>CLASS</dt>
          <dd>RESEARCH / ARCHIVE</dd>
          <dt>CREW</dt>
          <dd>SOLO OPERATION</dd>
          <dt>MODE</dt>
          <dd>DEEP EXPLORATION</dd>
        </dl>
      </section>
      <section className="hud-panel timestamp">
        <h2>TIME STAMP</h2>
        <p>2026.05.21 22:53:13</p>
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
        }
      })
      .catch(() => {
        if (isMounted) setWorks(fallbackWorks);
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
        }
      })
      .catch(() => {
        if (isMounted) setMediaItems([]);
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
        }
      })
      .catch(() => {
        if (isMounted) {
          const randomizedConcepts = getRandomWorks(conceptEntries, conceptEntries.length);
          setConcepts(conceptEntries);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeGenre = activeGenreId ? genreNodes.find(node => node.id === activeGenreId) : null;
  const activeSubmap = activeGenreId ? genreSubmaps[activeGenreId] : null;
  const visibleNodes = activeSubmap?.nodes ?? genreNodes;
  const visibleConnections = activeSubmap
    ? activeSubmap.nodes.map(node => [activeGenreId, node.id])
    : mapConnections;
  const mapPositions = [
    ...(activeGenre ? [{ ...activeGenre, x: 50, y: 50 }] : []),
    ...visibleNodes,
  ];
  const mapDescription = activeSubmap?.description
    ?? '탐사 좌표는 작품을 하나의 장르에 가두지 않습니다. 사이버펑크는 디스토피아와, 생태 SF는 스페이스 오페라와, 시간여행은 뉴웨이브와 겹치며 새로운 질문을 만듭니다.';

  const handleGenreNodeClick = node => {
    if (genreSubmaps[node.id]) {
      setActiveGenreId(node.id);
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
  const displayedMedia = mediaItems.filter(item => normalizeMediaCategory(item.category) === activeMediaCategory);
  const orderedConcepts = [
    ...randomConceptCodes.map(code => concepts.find(concept => concept.code === code)).filter(Boolean),
    ...concepts.filter(concept => !randomConceptCodes.includes(concept.code)),
  ];
  const selectedConcept = orderedConcepts.find(concept => concept.code === activeConceptCode) ?? orderedConcepts[0];
  const visibleConcepts = showAllConcepts ? orderedConcepts : orderedConcepts.slice(0, 6);

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
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="system-status">
          <span>SYSTEM STATUS</span>
          <strong><i /> ONLINE</strong>
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
              SF 탐사단은 소설, 영화, 게임, 애니메이션, 음악을 탐사하며
              인간 이후의 세계와 미래 사회를 연구하는 인터스텔라 아카이브입니다.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#coordinates">
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
          <SidePanel />
        </section>

        <section className="archive-dock" id="archive-links" aria-label="아카이브 바로가기">
          {archiveCards.map(card => {
            const Icon = card.icon;
            return (
              <a className="dock-card" href={card.href} key={card.title}>
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

        <div className="archive-status">
          <Database aria-hidden="true" />
          <span>ARCHIVE STATUS</span>
          <strong>WORKS 111&nbsp;&nbsp;NODES 08&nbsp;&nbsp;SIGNAL READY</strong>
        </div>
      </main>

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
              SF 작가 인터뷰, 관련 미디어, 기사, 고전 SF 영화를 모아두는 영상과 읽을거리 저장소입니다.
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
          </div>

          <div className="media-grid">
            {displayedMedia.length > 0 ? displayedMedia.map(item => (
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
                    {item.year && <em>{item.year}</em>}
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
            <div className="genre-map" aria-label="SF 장르 노드 맵">
              <div className="map-hud map-hud-top">
                <span>{activeGenre ? 'SUB-SECTOR VIEW' : 'SECTOR VIEW'}</span>
                <strong>{activeGenre ? activeGenre.en : 'ARCHIVE CARTOGRAPHY'}</strong>
              </div>
              <div className="map-hud map-hud-bottom">
                <span>CAMERA</span>
                <strong>X 3986.21 / Y -210.93</strong>
              </div>
              <div className="map-grid-cross" aria-hidden="true" />
              <div className="map-nebula map-nebula-a" aria-hidden="true" />
              <div className="map-nebula map-nebula-b" aria-hidden="true" />
              <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {visibleConnections.map(([from, to]) => {
                  const start = mapPositions.find(node => node.id === from);
                  const end = mapPositions.find(node => node.id === to);
                  if (!start || !end) return null;
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                    />
                  );
                })}
              </svg>

              <button
                className={`map-core ${activeGenre ? 'is-returnable' : ''}`}
                type="button"
                onClick={() => activeGenre && setActiveGenreId(null)}
                aria-label={activeGenre ? '상위 SF 장르 지도로 돌아가기' : 'SF 중심 좌표'}
              >
                <strong>{activeGenre ? activeGenre.label : 'SF'}</strong>
                <span>{activeGenre ? 'BACK TO ROOT' : 'CORE'}</span>
              </button>

              {mapSignalDots.map(dot => (
                <span
                  className="map-signal-dot"
                  key={`${dot.x}-${dot.y}`}
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: dot.size,
                    height: dot.size,
                    animationDelay: `${dot.delay}s`,
                  }}
                />
              ))}

              {visibleNodes.map(node => (
                <button
                  className={`genre-node tone-${node.tone} ${genreSubmaps[node.id] ? 'has-submap' : ''}`}
                  type="button"
                  key={node.id}
                  onClick={() => handleGenreNodeClick(node)}
                  style={{ left: `${node.x}%`, top: `${node.y}%`, '--orbit': node.orbit }}
                  aria-label={`${node.label} 좌표 ${genreSubmaps[node.id] ? '하위 지도 열기' : '탐사 신호'}`}
                >
                  <i />
                  <span>
                    <b>{node.label}</b>
                    <em>{node.en} / {node.signals} SIGNALS</em>
                  </span>
                </button>
              ))}
            </div>

            <aside className="coordinate-brief">
              <span>MAP PROTOCOL</span>
              <h3>{activeGenre ? `${activeGenre.label} 하위 좌표` : '장르를 고정하지 않고 연결하기'}</h3>
              <p>{mapDescription}</p>
              <dl>
                <div>
                  <dt>NODES</dt>
                  <dd>{visibleNodes.length} 장르 좌표</dd>
                </div>
                <div>
                  <dt>LINKS</dt>
                  <dd>{visibleConnections.length} 개념 연결선</dd>
                </div>
                <div>
                  <dt>MODE</dt>
                  <dd>{activeGenre ? 'Subgenre Mapping' : 'Archive Mapping'}</dd>
                </div>
              </dl>
              <div className="coordinate-minimap" aria-label="탐사 좌표 미니맵">
                <div className="coordinate-minimap-top">
                  <span>MINI MAP</span>
                  <strong>+</strong>
                </div>
                <div className="coordinate-mini-space">
                  {visibleNodes.map(node => (
                    <i
                      key={node.id}
                      className={`mini-node tone-${node.tone}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    />
                  ))}
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
                        <dd>{selectedConcept.source}</dd>
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
    </PageTransition>
  );
}
