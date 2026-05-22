import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  ChevronRight,
  Database,
  FileText,
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
              SF 탐사단은 소설, 영화, 게임, 철학, 음악, 미디어아트를 탐사하며
              인간 이후의 세계와 미래 사회를 연구하는 인터스텔라 아카이브입니다.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#archive-links">
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
              <a className="dock-card" id={card.href.slice(1)} href={card.href} key={card.title}>
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

        <div className="coordinates" id="coordinates">
          <Database aria-hidden="true" />
          <span>COORDINATES</span>
          <strong>X: 3986.21&nbsp;&nbsp;Y: -210.93&nbsp;&nbsp;Z: 1250.78</strong>
        </div>
      </main>
    </PageTransition>
  );
}
