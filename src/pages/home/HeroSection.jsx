import { useMemo } from 'react';
import { ChevronRight, Database } from 'lucide-react';

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
          <span
            className="radar-blip"
            key={`${blip.x}-${blip.y}`}
            style={{
              left: `${blip.x}%`,
              top: `${blip.y}%`,
              width: blip.size,
              height: blip.size,
              '--blip-delay': `${blip.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SidePanel({ activeGenre, archiveMode, metrics, recentSignals, timestamp }) {
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

export default function HeroSection({
  activeGenre,
  archiveMode,
  metrics,
  onResetCoordinateMap,
  recentSignals,
  timestamp,
}) {
  return (
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
            <a className="primary-action" href="#coordinates" onClick={onResetCoordinateMap}>
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
          timestamp={timestamp}
        />
      </section>

      <div className="archive-status">
        <Database aria-hidden="true" />
        <span>ARCHIVE STATUS</span>
        <strong>WORKS 111&nbsp;&nbsp;NODES 08&nbsp;&nbsp;SIGNAL READY</strong>
      </div>
    </main>
  );
}
