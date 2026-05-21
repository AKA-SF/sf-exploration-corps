import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, RadioReceiver, ShieldAlert, SatelliteDish, Crosshair, X, PlayCircle, Orbit, Plus, Minus, Navigation, Search, MapPinned } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { ZoomableMap } from '../components/ZoomableMap';
import { useLogs } from '../context/LogContext';
import { MAP_SECTORS } from '../data/sfTaxonomy';
import { fetchSFBooks } from '../services/aladinService';
import './Home.css';

const hashString = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return Math.abs(hash);
};

const seeded = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const emotionScore = (book, index) => {
  const base = book.metrics?.immersion || 50;
  const danger = book.metrics?.dangerLevel || 50;
  const complexity = book.metrics?.complexity || 50;
  return Math.round(([base, danger, complexity, (base + danger) / 2, (danger + complexity) / 2][index] || 50));
};

const CALLSIGNS = ['ORBIT-17', 'NULL-PILGRIM', 'ECHO-04', 'HORIZON-8', 'VOID-CART', 'SIGNAL-MOTH', 'NOVA-31', 'DREAM-RELAY'];
const CLUSTER_PREVIEW_LIMIT = 7;
const ACTIVE_SIGNAL_LIMIT = 56;
const LINK_SIGNAL_LIMIT = 46;

const signalRank = (book) => (
  (book.signalStrength || 0) +
  (book.metrics?.dangerLevel || 0) * 0.34 +
  (book.metrics?.immersion || 0) * 0.22 +
  (book.metrics?.complexity || 0) * 0.12
);

const selectMapSignals = (works, limit, selectedId) => {
  const selected = selectedId ? works.find(work => work.id === selectedId) : null;
  const topSignals = [...works]
    .sort((a, b) => signalRank(b) - signalRank(a))
    .slice(0, limit);

  if (selected && !topSignals.some(work => work.id === selected.id)) {
    return [...topSignals.slice(0, Math.max(0, limit - 1)), selected];
  }

  return topSignals;
};

const Home = () => {
  const navigate = useNavigate();
  const { logs, setCurrentSystemState } = useLogs();
  const mapRef = useRef(null);
  const miniMapRef = useRef(null);
  
  const [genres, setGenres] = useState(MAP_SECTORS);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1); // 1, 2, 3
  const [mapCamera, setMapCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiStatus, setApiStatus] = useState({
    source: 'booting',
    status: 'scanning',
    count: 0,
    totalResults: 0,
  });

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      const result = await fetchSFBooks();
      const books = Array.isArray(result) ? result : result.books;
      
      const newGenres = MAP_SECTORS.map(g => ({ ...g, works: [] }));
      
      books.forEach((book, index) => {
        const targetGenre = newGenres.find(g => g.name === book.sfGenre) || newGenres.find(g => g.id === 'newwave');
        
        const seed = hashString(`${book.id}-${book.title}-${index}`);
        const angle = seeded(seed) * Math.PI * 2;
        const orbit = 145 + seeded(seed + 13) * 260;
        book.offsetX = Math.cos(angle) * orbit;
        book.offsetY = Math.sin(angle) * orbit;
        book.signalStrength = Math.round(45 + seeded(seed + 29) * 55);
        
        targetGenre.works.push(book);
      });
      
      setGenres(newGenres);
      setApiStatus({
        source: result.source || 'legacy',
        status: result.status || 'connected',
        count: books.length,
        totalResults: result.totalResults || books.length,
        queryCount: result.queryCount || 1,
        error: result.error,
      });
      setIsLoading(false);
    };
    
    loadBooks();
  }, []);

  const handleCameraChange = (camera) => {
    setMapCamera(prev => {
      if (
        Math.abs(prev.x - camera.x) < 0.7 &&
        Math.abs(prev.y - camera.y) < 0.7 &&
        Math.abs(prev.scale - camera.scale) < 0.01
      ) {
        return prev;
      }
      return camera;
    });

    if (camera.scale < 1.15) {
      if (zoomLevel !== 1) setZoomLevel(1);
    }
    else if (camera.scale >= 1.15 && camera.scale < 2.25) {
      if (zoomLevel !== 2) setZoomLevel(2);
    }
    else {
      if (zoomLevel !== 3) setZoomLevel(3);
    }
  };

  const handleNodeClick = (genre) => {
    setActiveGenreId(genre.id);
    setSelectedArtifact(null);
    mapRef.current?.focusWorldPoint({ x: genre.x, y: genre.y, scale: 1.9 });
    setCurrentSystemState(prev => ({ ...prev, selectedGenre: genre.en }));
  };

  const selectWork = (book, genre, focusScale = Math.max(mapCamera.scale, 2.55)) => {
    setActiveGenreId(genre.id);
    setSelectedArtifact({ book, genreEn: genre.en });
    mapRef.current?.focusWorldPoint({
      x: genre.x + book.offsetX,
      y: genre.y + book.offsetY,
      scale: focusScale,
    });
  };

  const handleWorkClick = (e, book, genre) => {
    e.stopPropagation();
    if (zoomLevel < 3 && !activeGenreId) return;
    selectWork(book, genre);
  };

  const handleDockWorkClick = (book, genre) => {
    if (selectedArtifact?.book.id === book.id) {
      setSelectedArtifact(null);
      mapRef.current?.focusWorldPoint({ x: genre.x, y: genre.y, scale: Math.max(mapCamera.scale, 1.9) });
      return;
    }

    selectWork(book, genre);
  };

  const startExploration = () => {
    if (!selectedArtifact) return;
    const { book, genreEn } = selectedArtifact;
    navigate('/log', { 
      state: { 
        prefilledTitle: book.title, 
        prefilledType: genreEn,
        prefilledExperiences: {
          immersion: book.metrics.immersion,
          addiction: 50,
          complexity: book.metrics.complexity,
          visual: 50,
          derealization: book.metrics.dangerLevel,
          scale: 50
        },
        prefilledEmotions: book.tags.emotions,
        prefilledIdeas: book.tags.concepts
      } 
    });
  };

  // Generate random stars for parallax background
  const stars = useMemo(() => {
    return Array.from({ length: 300 }).map((_, i) => ({
      id: i,
      x: seeded(i + 17) * 4000 - 500,
      y: seeded(i + 43) * 3000 - 500,
      size: seeded(i + 79) * 2 + 1,
      opacity: seeded(i + 131) * 0.8 + 0.2
    }));
  }, []);

  const nebulae = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: seeded(i + 101) * 3600 - 300,
      y: seeded(i + 211) * 2400 - 200,
      size: 220 + seeded(i + 307) * 420,
      opacity: 0.06 + seeded(i + 401) * 0.1,
    }));
  }, []);

  const dataLanes = useMemo(() => {
    return MAP_SECTORS.slice(0, 8).map((genre, i) => ({
      id: `lane-${genre.id}`,
      x1: genre.x - 260,
      y1: genre.y + 120,
      x2: MAP_SECTORS[(i + 4) % MAP_SECTORS.length].x + 180,
      y2: MAP_SECTORS[(i + 4) % MAP_SECTORS.length].y - 140,
    }));
  }, []);

  const sectorExplorers = useMemo(() => {
    return MAP_SECTORS.flatMap((genre, genreIndex) => {
      const count = 2 + Math.floor(seeded(genreIndex + 501) * 4);
      return Array.from({ length: count }).map((_, index) => {
        const seed = hashString(`${genre.id}-${index}-explorer`);
        const angle = seeded(seed) * Math.PI * 2;
        const radius = 72 + seeded(seed + 41) * 118;
        return {
          id: `${genre.id}-explorer-${index}`,
          genreId: genre.id,
          callsign: CALLSIGNS[(genreIndex + index) % CALLSIGNS.length],
          x: genre.x + Math.cos(angle) * radius,
          y: genre.y + Math.sin(angle) * radius,
          delay: seeded(seed + 91) * 1.8,
          amber: seeded(seed + 13) > 0.72,
        };
      });
    });
  }, []);

  const activeGenre = useMemo(
    () => genres.find(genre => genre.id === activeGenreId) || null,
    [activeGenreId, genres]
  );

  const mapGenres = useMemo(() => {
    const selectedId = selectedArtifact?.book.id;
    return genres.map(genre => {
      const isActive = activeGenreId === genre.id;
      const limit = isActive ? ACTIVE_SIGNAL_LIMIT : CLUSTER_PREVIEW_LIMIT;
      const selectedInGenre = isActive ? selectedId : null;

      return {
        ...genre,
        mapWorks: selectMapSignals(genre.works, limit, selectedInGenre),
      };
    });
  }, [activeGenreId, genres, selectedArtifact?.book.id]);

  const activeMapWorks = useMemo(() => (
    mapGenres.find(genre => genre.id === activeGenreId)?.mapWorks || []
  ), [activeGenreId, mapGenres]);

  const filteredActiveWorks = useMemo(() => {
    if (!activeGenre) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeGenre.works;

    return activeGenre.works.filter(book => [
      book.title,
      book.author,
      book.publisher,
      book.sfGenre,
      ...(book.tags?.emotions || []),
      ...(book.tags?.concepts || []),
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [activeGenre, searchQuery]);

  const activeGenreLogs = useMemo(() => {
    if (!activeGenre) return [];
    return logs.filter(log => log.type === activeGenre.name || log.type === activeGenre.en);
  }, [activeGenre, logs]);

  const latestLog = logs[0] || null;

  const workLinks = useMemo(() => {
    if (!activeGenre || activeMapWorks.length < 2) return [];

    const linkCandidates = activeMapWorks
      .slice(0, LINK_SIGNAL_LIMIT)
      .map(work => ({
      ...work,
      worldX: activeGenre.x + work.offsetX,
      worldY: activeGenre.y + work.offsetY,
      genreRisk: activeGenre.risk,
    }));

    const links = [];
    for (let i = 0; i < linkCandidates.length; i++) {
      for (let j = i + 1; j < linkCandidates.length; j++) {
        const a = linkCandidates[i];
        const b = linkCandidates[j];
        const sharedEmotion = a.tags.emotions.some(e => b.tags.emotions.includes(e));
        const sharedConcept = a.tags.concepts.some(c => b.tags.concepts.includes(c));
        const similarDanger = Math.abs(a.metrics.dangerLevel - b.metrics.dangerLevel) < 14;
        const dx = a.worldX - b.worldX;
        const dy = a.worldY - b.worldY;
        const dist = Math.hypot(dx, dy);

        if ((sharedEmotion || sharedConcept || similarDanger) && dist < 520) {
          links.push({
            id: `${a.id}-${b.id}`,
            sourceId: a.id,
            targetId: b.id,
            x1: a.worldX,
            y1: a.worldY,
            x2: b.worldX,
            y2: b.worldY,
            strength: sharedConcept ? 0.8 : sharedEmotion ? 0.55 : 0.32,
            amber: a.metrics.dangerLevel > 76 || b.metrics.dangerLevel > 76,
          });
        }
      }
    }
    return links.sort((a, b) => b.strength - a.strength).slice(0, 64);
  }, [activeGenre, activeMapWorks]);

  const parallaxStyle = (speed, scaleInfluence = 0.04) => ({
    transform: `translate3d(${mapCamera.x * speed}px, ${mapCamera.y * speed}px, 0) scale(${1 + (mapCamera.scale - 1) * scaleInfluence})`,
  });

  const cameraWorld = useMemo(() => ({
    x: Math.max(0, Math.min(3000, (1500 - mapCamera.x) / Math.max(mapCamera.scale, 0.001))),
    y: Math.max(0, Math.min(2000, (1000 - mapCamera.y) / Math.max(mapCamera.scale, 0.001))),
  }), [mapCamera.scale, mapCamera.x, mapCamera.y]);

  const jumpToMapPoint = (x, y, scale = Math.max(mapCamera.scale, 1.18)) => {
    mapRef.current?.focusWorldPoint({ x, y, scale, immediate: true });
  };

  const handleMiniMapClick = (event) => {
    const rect = miniMapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 3000;
    const y = ((event.clientY - rect.top) / rect.height) * 2000;
    const nearestGenre = genres.reduce((nearest, genre) => {
      const currentDistance = Math.hypot(genre.x - x, genre.y - y);
      if (!nearest || currentDistance < nearest.distance) return { genre, distance: currentDistance };
      return nearest;
    }, null);

    setSelectedArtifact(null);
    if (nearestGenre?.distance < 260) {
      setActiveGenreId(nearestGenre.genre.id);
      setCurrentSystemState(prev => ({ ...prev, selectedGenre: nearestGenre.genre.en }));
      jumpToMapPoint(nearestGenre.genre.x, nearestGenre.genre.y);
      return;
    }

    setActiveGenreId(null);
    jumpToMapPoint(x, y);
  };

  const getConnectionReasons = (book) => {
    const reasons = [
      ...(book.tags?.emotions || []).slice(0, 2).map(tag => `감정 유사성: ${tag}`),
      ...(book.tags?.concepts || []).slice(0, 2).map(tag => `개념 태그: ${tag}`),
    ];
    if (book.metrics?.dangerLevel > 72) reasons.push(`위험도 신호: ${book.metrics.dangerLevel}%`);
    if (book.metrics?.immersion > 78) reasons.push(`몰입 신호: ${book.metrics.immersion}%`);
    return reasons.slice(0, 4);
  };

  return (
    <PageTransition className="home-container">
      <header className="map-header">
        <h1 className="title glitch-hover">SF 탐사단 <span className="subtitle mono text-muted">/ DEEP SPACE MAP</span></h1>
        <div className="status-indicator">
          <span className={`dot ${isLoading ? 'pulse fast' : 'pulse'}`} style={{ backgroundColor: isLoading ? 'var(--accent-amber)' : 'var(--primary-cyan)' }}></span>
          <span className="mono status-text" style={{ color: isLoading ? 'var(--accent-amber)' : 'var(--primary-cyan)' }}>
            {isLoading ? 'SCANNING_DATABASE...' : activeGenre ? `SCANNING_${activeGenre.en} / ${activeGenre.works.length}_SIGNALS` : `SYSTEM_READY / ZOOM_LVL_${zoomLevel}`}
          </span>
        </div>
      </header>

      <div className={`api-signal-strip panel ${apiStatus.source === 'aladin' ? 'connected' : 'fallback'}`}>
        <span className="mono">ALADIN_RELAY</span>
        <strong className="mono">
          {isLoading
            ? 'SCANNING...'
            : apiStatus.source === 'aladin'
              ? `CONNECTED // ${apiStatus.count} ITEMS // ${apiStatus.queryCount} QUERIES`
              : `LOCAL_FALLBACK // ${apiStatus.count} ITEMS`}
        </strong>
        {apiStatus.error && <em className="mono">{apiStatus.error}</em>}
      </div>

      {!activeGenre && (
        <section className="mission-onboarding panel">
          <div className="mission-onboarding-main">
            <span className="mono"><MapPinned size={12} /> FIRST_CONTACT_SEQUENCE</span>
            <strong>관심 SF 섹터를 선택하세요</strong>
            <p>장르 노드를 누르면 작품 신호가 펼쳐지고, 아래 목록에서 타겟을 고르면 분석 패널과 탐사 로그로 이어집니다.</p>
          </div>
          <div className="mission-onboarding-steps mono">
            <span>1 SECTOR_SELECT</span>
            <span>2 SIGNAL_SCAN</span>
            <span>3 FIELD_LOG</span>
          </div>
        </section>
      )}

      {/* Layer 1: Parallax Stars */}
      <div className="starfield-container">
        <div className="nebula-layer" style={parallaxStyle(0.07, 0.08)}>
          {nebulae.map(cloud => (
            <div
              key={cloud.id}
              className="nebula-cloud"
              style={{ left: cloud.x, top: cloud.y, width: cloud.size, height: cloud.size, opacity: cloud.opacity }}
            />
          ))}
        </div>
        <div className="starfield" style={parallaxStyle(0.16, 0.03)}>
          {stars.map(star => (
            <div 
              key={star.id} 
              className="star" 
              style={{ left: star.x, top: star.y, width: star.size, height: star.size, opacity: star.opacity }}
            />
          ))}
        </div>
      </div>

      <div className="map-viewport-container">
        <div className="map-overlay-vignette"></div>
        <div className="camera-reticle"><Crosshair size={18} /></div>
        <ZoomableMap
          ref={mapRef}
          width={3000}
          height={2000}
          minScale={0.48}
          maxScale={4}
          initialScale={0.82}
          onCameraChange={handleCameraChange}
          contentClassName="map-transform-content"
        >
            <div className="map-canvas-area" style={{ width: 3000, height: 2000, position: 'relative', pointerEvents: 'auto' }}>
              <svg className="data-lane-layer" width="3000" height="2000">
                {dataLanes.map((lane, i) => (
                  <g key={lane.id} opacity="0.35">
                    <line
                      x1={lane.x1} y1={lane.y1}
                      x2={lane.x2} y2={lane.y2}
                      stroke={i % 3 === 0 ? 'var(--accent-amber)' : 'var(--primary-cyan)'}
                      strokeWidth="1"
                      strokeDasharray="2 18"
                    />
                    <circle r="3" fill={i % 3 === 0 ? 'var(--accent-amber)' : 'var(--primary-cyan)'}>
                      <animateMotion
                        dur={`${6 + i * 0.7}s`}
                        repeatCount="indefinite"
                        path={`M ${lane.x1} ${lane.y1} L ${lane.x2} ${lane.y2}`}
                      />
                    </circle>
                  </g>
                ))}
              </svg>
              
              <svg className="map-connections" width="3000" height="2000">
                {genres.map((g1, i) => 
                  genres.slice(i + 1, i + 3).map(g2 => (
                    <line 
                      key={`${g1.id}-${g2.id}`} 
                      x1={g1.x} y1={g1.y} 
                      x2={g2.x} y2={g2.y} 
                      stroke="var(--primary-cyan-dim)" 
                      strokeWidth="2" 
                      strokeDasharray="10 10"
                      opacity={zoomLevel >= 2 ? 0.2 : 0.5}
                    />
                  ))
                )}

                <AnimatePresence>
                  {activeGenreId && workLinks.map(link => (
                    <motion.line
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.18 + link.strength * 0.35 }}
                      exit={{ opacity: 0 }}
                      key={link.id}
                      x1={link.x1} y1={link.y1}
                      x2={link.x2} y2={link.y2}
                      stroke={link.amber ? 'var(--accent-amber)' : 'var(--primary-cyan)'}
                      strokeWidth={link.strength > 0.7 ? 1.4 : 0.8}
                      strokeDasharray={link.strength > 0.7 ? '1 0' : '7 9'}
                    />
                  ))}
                </AnimatePresence>
                
                <AnimatePresence>
                  {(zoomLevel >= 2 || activeGenreId) && mapGenres.map(g => {
                    const shouldShowLines = activeGenreId ? activeGenreId === g.id : zoomLevel >= 2;
                    if (!shouldShowLines) return null;

                    return g.mapWorks.map(work => (
                      <motion.line
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 0.4, pathLength: 1 }}
                        exit={{ opacity: 0 }}
                        key={`line-${work.id}`}
                        x1={g.x} y1={g.y}
                        x2={g.x + work.offsetX} y2={g.y + work.offsetY}
                        stroke={g.risk > 80 ? 'var(--accent-amber)' : 'var(--primary-cyan)'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ));
                  })}
                </AnimatePresence>
              </svg>

              {/* Nodes */}
              <div className="sector-explorer-layer" aria-hidden="true">
                {sectorExplorers.map(explorer => (
                  <div
                    key={explorer.id}
                    className={`sector-explorer-signal ${explorer.amber ? 'amber' : ''} ${activeGenreId === explorer.genreId ? 'active' : ''}`}
                    style={{ left: explorer.x, top: explorer.y, animationDelay: `${explorer.delay}s` }}
                  >
                    <span />
                    <em className="mono">{explorer.callsign}</em>
                  </div>
                ))}
              </div>

              {mapGenres.map((genre) => {
                const isActiveGenre = activeGenreId === genre.id;
                const showGenreWorks = activeGenreId ? isActiveGenre : zoomLevel >= 2;

                return (
                <div key={genre.id} className={`genre-cluster ${isActiveGenre ? 'active-cluster' : ''} ${activeGenreId && !isActiveGenre ? 'muted-cluster' : ''}`} style={{ left: genre.x, top: genre.y }}>
                  {isActiveGenre && (
                    <div className="genre-scan-field pointer-area">
                      <span className="mono">FIELD_SCAN_ACTIVE</span>
                      <b className="mono">{genre.mapWorks.length}/{genre.works.length} MAP_SIGNALS // {activeGenreLogs.length} CORPS_LOGS</b>
                    </div>
                  )}
                  
                  {/* Main Genre Node */}
                  <div
                    className="genre-node pointer-area"
                    onClick={() => handleNodeClick(genre)}
                  >
                    <div className="node-core" style={{ backgroundColor: genre.risk > 80 ? 'var(--accent-amber)' : 'var(--primary-cyan)' }}></div>
                    <div className="node-radar pulse-slow"></div>
                    <div className={`node-label mono ${zoomLevel >= 2 && !isActiveGenre ? 'fade-out' : ''}`}>
                      <span className="kr text-lg">{genre.name}</span>
                      <span className="en">{genre.en}</span>
                      <span className="count">[{genre.works.length}]</span>
                    </div>
                  </div>

                  {/* Orbital Books */}
                  <AnimatePresence>
                    {showGenreWorks && genre.mapWorks.map((book, i) => (
                      <motion.div 
                        key={book.id}
                        className={`artifact-node lvl-${zoomLevel} ${isActiveGenre ? 'active-satellite' : ''} ${selectedArtifact?.book.id === book.id ? 'selected-satellite' : ''}`}
                        style={{ 
                          x: book.offsetX, 
                          y: book.offsetY 
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ delay: i * 0.02, duration: 0.3 }}
                      >
                        {/* Level 2 View: Small Signal Point */}
                        <div className="signal-point pointer-area" onClick={(e) => handleWorkClick(e, book, genre)}>
                          <div className="signal-core" style={{ backgroundColor: book.metrics.dangerLevel > 70 ? 'var(--accent-amber)' : 'var(--primary-cyan)' }}></div>
                          <span className={`signal-title mono text-[8px] pointer-area ${zoomLevel >= 3 || isActiveGenre ? 'text-cyan' : ''}`}>
                            {book.title}
                          </span>
                        </div>

                        {/* Level 3 View: Deep Data Overlay */}
                        <AnimatePresence>
                          {zoomLevel >= 3 && selectedArtifact?.book.id === book.id && (
                            <motion.div 
                              className="deep-data-hud pointer-area"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              onClick={(e) => handleWorkClick(e, book, genre)}
                            >
                              <div className="hud-header mono">
                                <span className="text-cyan truncate w-32">{book.title}</span>
                              </div>
                              <div className="hud-body mono text-[6px]">
                                <div className="hud-row text-amber"><ShieldAlert size={6} className="inline mr-1"/>RISK: {book.metrics.dangerLevel}%</div>
                                <div className="hud-row"><RadioReceiver size={6} className="inline mr-1"/>EXP: {book.tags.emotions[0]}</div>
                                <div className="hud-row"><SatelliteDish size={6} className="inline mr-1"/>SIG: {book.signalStrength}%</div>
                                <div className="hud-row text-muted"><Scan size={6} className="inline mr-1"/>AWAITING LOGS</div>
                              </div>
                              <div className="mini-radar" aria-hidden="true">
                                {[0, 1, 2, 3, 4].map(axis => (
                                  <span
                                    key={axis}
                                    style={{
                                      height: `${16 + emotionScore(book, axis) * 0.22}px`,
                                      transform: `rotate(${axis * 72}deg) translateY(-10px)`,
                                    }}
                                  />
                                ))}
                              </div>
                              <div className="hud-footer">
                                <span className="kr-label">{book.author.split('(')[0]}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                </div>
                );
              })}
            </div>
        </ZoomableMap>

        <AnimatePresence>
          {selectedArtifact && (
            <motion.aside
              className="artifact-analysis-panel panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button className="analysis-close" onClick={() => setSelectedArtifact(null)} aria-label="close analysis">
                <X size={16} />
              </button>
              <div className="analysis-kicker mono"><Orbit size={12} /> TARGET_ANALYSIS_INTERFACE</div>
              <h2>{selectedArtifact.book.title}</h2>
              <div className="analysis-meta mono">
                <span>{selectedArtifact.genreEn}</span>
                <span>RISK {selectedArtifact.book.metrics.dangerLevel}%</span>
              </div>
              <div className="analysis-signal-grid mono">
                <p><span>AUTHOR</span>{selectedArtifact.book.author.split('(')[0]}</p>
                <p><span>PUBLISHER</span>{selectedArtifact.book.publisher || 'UNKNOWN_ARCHIVE'}</p>
                <p><span>DATE</span>{selectedArtifact.book.pubDate || 'NO_TIMESTAMP'}</p>
                <p>
                  <span>CLASSIFICATION</span>
                  {selectedArtifact.book.classification?.confidence || 0}% {selectedArtifact.book.classification?.inferred ? 'INFERRED' : 'MATCHED'}
                </p>
              </div>
              <div className="radar-chart" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <i
                    key={i}
                    style={{
                      height: `${18 + emotionScore(selectedArtifact.book, i % 5) * 0.24}px`,
                      transform: `rotate(${i * 60}deg) translateY(-18px)`,
                    }}
                  />
                ))}
                <span>EMOTION_RADAR</span>
              </div>
              <div className="analysis-tags">
                {selectedArtifact.book.tags.emotions.concat(selectedArtifact.book.tags.concepts).slice(0, 5).map(tag => (
                  <span key={tag} className="mono">{tag}</span>
                ))}
              </div>
              <div className="analysis-reasons mono">
                <span>WHY_THIS_SIGNAL</span>
                {getConnectionReasons(selectedArtifact.book).map(reason => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
              <p className="analysis-description">
                {selectedArtifact.book.description || '탐사 대상 기록이 손상되어 일부 데이터만 복구되었습니다.'}
              </p>
              <div className="analysis-readout mono">
                <p>IMMERSION: {selectedArtifact.book.metrics.immersion}%</p>
                <p>COMPLEXITY: {selectedArtifact.book.metrics.complexity}%</p>
                <p>SIGNAL: {selectedArtifact.book.signalStrength}%</p>
              </div>
              <button className="exploration-start" onClick={startExploration}>
                <PlayCircle size={18} />
                <span className="mono">탐사 시작 / BEGIN_FIELD_LOG</span>
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* HUD Info Panel (Bottom Left) */}
        <div className="hud-controls mono text-xs">
          <span className="text-cyan">INSTRUCTION:</span>
          <span className="text-muted">PINCH/SCROLL to ZOOM // DRAG to PAN // CLICK ARTIFACT to EXPLORE</span>
        </div>

        <div className="nav-console panel">
          <div className="nav-console-header mono">
            <Navigation size={12} />
            <span>ASTRO_NAV</span>
          </div>
          <button
            ref={miniMapRef}
            type="button"
            className="mini-map"
            aria-label="sector mini map"
            onClick={handleMiniMapClick}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div
              className="mini-map-reticle"
              style={{ left: `${(cameraWorld.x / 3000) * 100}%`, top: `${(cameraWorld.y / 2000) * 100}%` }}
            />
            {genres.map(genre => (
              <span
                key={genre.id}
                className={`mini-sector ${activeGenreId === genre.id ? 'active' : ''}`}
                style={{ left: `${(genre.x / 3000) * 100}%`, top: `${(genre.y / 2000) * 100}%` }}
                title={genre.en}
              />
            ))}
          </button>
          <div className="nav-readout mono">
            <span>X {cameraWorld.x.toFixed(0)}</span>
            <span>Y {cameraWorld.y.toFixed(0)}</span>
            <span>Z {(mapCamera.scale * 100).toFixed(0)}</span>
          </div>
          <div className="nav-buttons">
            <button onClick={() => mapRef.current?.zoomBy(1.22)} aria-label="zoom in">
              <Plus size={14} />
            </button>
            <button onClick={() => mapRef.current?.zoomBy(0.82)} aria-label="zoom out">
              <Minus size={14} />
            </button>
          </div>
        </div>

        {activeGenre && (
          <div className="sector-command-panel panel">
            <div className="sector-command-head">
              <span className="mono">SECTOR_LOCKED</span>
              <strong>{activeGenre.name}</strong>
            </div>
            <p>{activeGenre.works.length}개 작품 신호 감지. 아래 목록에서 작품을 선택하면 전체 분석 화면이 열립니다.</p>
            <div className="sector-command-stats mono">
              <span>RISK {activeGenre.risk}%</span>
              <span>LOGS {activeGenreLogs.length}</span>
              <span>MAP {activeMapWorks.length}</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeGenre && (
          <motion.section
            className="artifact-dock panel"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
          >
            <div className="artifact-dock-header">
              <div>
                <span className="mono dock-kicker">DETECTED_SIGNAL_LIST</span>
                <h2>{activeGenre.name} <em className="mono">{activeGenre.en}</em></h2>
              </div>
              <span className="mono dock-count">{activeGenre.works.length} SIGNALS / {activeGenreLogs.length} LOGS</span>
            </div>
            <div className="dock-mission-line mono">
              <span>SCAN_LOOP</span>
              <p>장르 선택 → 신호 포착 → 타겟 분석 → 탐사보고서 제출 → NETWORK 반영</p>
            </div>
            <label className="signal-search mono">
              <Search size={13} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="SIGNAL_SEARCH: 작품명 / 작가 / 감정 / 개념"
              />
              <span>{filteredActiveWorks.length}</span>
            </label>
            <div className="artifact-dock-list">
              {filteredActiveWorks.map(book => (
                <button
                  key={book.id}
                  className={`dock-artifact ${selectedArtifact?.book.id === book.id ? 'active' : ''}`}
                  onClick={() => handleDockWorkClick(book, activeGenre)}
                >
                  <span className="dock-signal" style={{ backgroundColor: book.metrics.dangerLevel > 70 ? 'var(--accent-amber)' : 'var(--primary-cyan)' }} />
                  <span className="dock-title">{book.title}</span>
                  <span className="dock-meta mono">
                    RISK {book.metrics.dangerLevel}% / SIG {book.signalStrength}% / CLS {book.classification?.confidence || 0}%
                  </span>
                </button>
              ))}
              {filteredActiveWorks.length === 0 && (
                <div className="dock-empty mono">
                  <strong>NO_SIGNAL_MATCH</strong>
                  <span>검색어를 지우거나 다른 감정/작가 신호를 입력하세요.</span>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {latestLog && (
        <aside className="latest-transmission panel">
          <span className="mono dock-kicker">RECENT_TRANSMISSION</span>
          <strong>{latestLog.title}</strong>
          <p className="mono">{latestLog.type} // {latestLog.emotions?.[0] || 'NO_EMOTION'} // NETWORK_SYNCED</p>
        </aside>
      )}

    </PageTransition>
  );
};

export default Home;
