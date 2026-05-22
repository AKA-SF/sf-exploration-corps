import { useMemo } from 'react';
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
import './Home.css';

const navItems = [
  { label: '작품 아카이브', href: '#works-archive' },
  { label: '탐사 로그', href: '#exploration-log' },
  { label: 'SF 개념 사전', href: '#concept-dictionary' },
  { label: '미디어 아카이브', href: '#media-archive' },
  { label: '토론 질문 저장소', href: '#question-vault' },
  { label: 'Contact', href: '#contact' },
  { label: '탐사 좌표', href: '#coordinates' },
];

const archiveCards = [
  {
    icon: Box,
    title: '작품 아카이브',
    text: 'SF 소설·영화·게임·음악 등 작품 데이터베이스',
    href: '#works-archive',
  },
  {
    icon: FileText,
    title: '탐사 로그',
    text: '탐사 과정과 발견한 아이디어 기록',
    href: '#exploration-log',
  },
  {
    icon: Satellite,
    title: 'SF 개념 사전',
    text: '관계된 개념과 용어를 정리한 지식 아카이브',
    href: '#concept-dictionary',
  },
  {
    icon: Play,
    title: '미디어 아카이브',
    text: '이미지·영상·오디오 등 미디어 자료 저장소',
    href: '#media-archive',
  },
  {
    icon: MessageSquare,
    title: '토론 질문 저장소',
    text: '탐구하고 토론할 질문을 모아둔 아카이브',
    href: '#question-vault',
  },
  {
    icon: Mail,
    title: 'Contact',
    text: '협업·문의·아카이브 제안을 위한 통신 채널',
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

const featuredWorks = [
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
    label: 'ARCHIVE PROPOSAL',
    title: '작품/개념 제안',
    text: 'SF 탐사단에 추가하고 싶은 작품, 개념, 질문을 제안합니다.',
  },
  {
    label: 'COLLABORATION',
    title: '강의·전시·워크숍',
    text: 'SF와 기술문화, 영상, 게임, 미래사회 연구를 함께 기획합니다.',
  },
  {
    label: 'MESSAGE',
    title: '일반 문의',
    text: '프로젝트 소개, 운영, 업데이트에 관한 메시지를 남깁니다.',
  },
];

const genreNodes = [
  { id: 'cyberpunk', label: '사이버펑크', x: 69, y: 34, orbit: 2, tone: 'cyan' },
  { id: 'space-opera', label: '스페이스 오페라', x: 76, y: 62, orbit: 3, tone: 'blue' },
  { id: 'post-apocalypse', label: '포스트 아포칼립스', x: 49, y: 76, orbit: 3, tone: 'amber' },
  { id: 'time-travel', label: '시간여행', x: 24, y: 59, orbit: 2, tone: 'cyan' },
  { id: 'alien-intelligence', label: '외계지성', x: 31, y: 31, orbit: 2, tone: 'blue' },
  { id: 'dystopia', label: '디스토피아', x: 50, y: 22, orbit: 1, tone: 'amber' },
  { id: 'eco-sf', label: '생태 SF', x: 18, y: 43, orbit: 3, tone: 'cyan' },
  { id: 'new-wave', label: '뉴웨이브', x: 82, y: 45, orbit: 1, tone: 'blue' },
];

const mapConnections = [
  ['cyberpunk', 'dystopia'],
  ['cyberpunk', 'new-wave'],
  ['space-opera', 'alien-intelligence'],
  ['space-opera', 'eco-sf'],
  ['post-apocalypse', 'dystopia'],
  ['time-travel', 'new-wave'],
  ['alien-intelligence', 'eco-sf'],
  ['time-travel', 'post-apocalypse'],
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
              <article className="category-tile" key={category.label}>
                <span>{category.label}</span>
                <strong>{category.title}</strong>
                <em>{category.count}</em>
              </article>
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

            <div className="featured-work-grid" aria-label="대표 작품 신호">
              {featuredWorks.map(work => (
                <article className="work-card" key={work.code}>
                  <div className="work-card-top">
                    <span>{work.code}</span>
                    <em>{work.medium}</em>
                  </div>
                  <h3>{work.title}</h3>
                  <p>{work.subtitle}</p>
                  <div className="work-tags">
                    {work.tags.map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
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
              <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {mapConnections.map(([from, to]) => {
                  const start = genreNodes.find(node => node.id === from);
                  const end = genreNodes.find(node => node.id === to);
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

              <div className="map-core">
                <strong>SF</strong>
                <span>CORE</span>
              </div>

              {genreNodes.map(node => (
                <button
                  className={`genre-node tone-${node.tone}`}
                  type="button"
                  key={node.id}
                  style={{ left: `${node.x}%`, top: `${node.y}%`, '--orbit': node.orbit }}
                >
                  <i />
                  <span>{node.label}</span>
                </button>
              ))}
            </div>

            <aside className="coordinate-brief">
              <span>MAP PROTOCOL</span>
              <h3>장르를 고정하지 않고 연결하기</h3>
              <p>
                탐사 좌표는 작품을 하나의 장르에 가두지 않습니다. 사이버펑크는 디스토피아와,
                생태 SF는 스페이스 오페라와, 시간여행은 뉴웨이브와 겹치며 새로운 질문을 만듭니다.
              </p>
              <dl>
                <div>
                  <dt>NODES</dt>
                  <dd>08 장르 좌표</dd>
                </div>
                <div>
                  <dt>LINKS</dt>
                  <dd>08 개념 연결선</dd>
                </div>
                <div>
                  <dt>MODE</dt>
                  <dd>Archive Mapping</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="section-shell contact-shell">
          <div className="section-heading contact-heading">
            <span>COMMUNICATION NODE</span>
            <h2>Contact</h2>
            <p>
              SF 탐사단은 작품 추천, 개념 제안, 강의와 워크숍, 전시 협업을 위한
              열린 통신 채널을 준비하고 있습니다.
            </p>
          </div>

          <div className="contact-grid">
            <div className="contact-signal">
              <Mail aria-hidden="true" />
              <span>PRIMARY CHANNEL</span>
              <strong>contact@sf-tamsadan.archive</strong>
              <em>임시 주소입니다. 실제 운영 이메일로 교체 예정</em>
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
