import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogs } from '../context/LogContext';
import { Lock, Radar, Activity, Skull, AlertTriangle, Hexagon, RadioTower, SendHorizontal, MessageSquareText, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { ZoomableMap } from '../components/ZoomableMap';
import './Network.css';

const LOG_TYPES = {
  WARNING: { color: 'var(--accent-amber)', icon: AlertTriangle },
  DEEP_SIGNAL: { color: 'var(--primary-cyan)', icon: Activity },
  ANOMALY: { color: '#a855f7', icon: Hexagon }, // Purple
  LOST_TRANSMISSION: { color: '#ef4444', icon: Skull } // Red
};

const SIGNAL_ACTIONS = ['동조 신호', '경고 증폭', '항로 연결', '추가 탐사 요청', '해석 대기'];

const getSignalLine = (log, index) => {
  const emotion = log.emotions?.[0] || '미확인 감정';
  const idea = log.ideas?.[0] || '미확인 개념';
  const action = SIGNAL_ACTIONS[index % SIGNAL_ACTIONS.length];
  return `${log.explorerId} // ${log.type} 섹터에서 '${log.title}' ${action} / ${emotion} + ${idea}`;
};

const Network = () => {
  const { logs, networkLogs } = useLogs();
  const navigate = useNavigate();
  const userLogCount = logs.length;

  const [hoveredNode, setHoveredNode] = useState(null);

  // Generate spatial coordinates and types for logs
  const spatialLogs = useMemo(() => {
    return networkLogs.map((log) => {
      // Deterministic pseudo-random placement based on index/id
      const hash = log.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const r1 = Math.sin(hash) * 10000;
      const r2 = Math.cos(hash) * 10000;
      
      const x = (r1 - Math.floor(r1)) * 2000; // 0 to 2000
      const y = (r2 - Math.floor(r2)) * 1500; // 0 to 1500

      // Assign type based on metrics
      let typeKey = 'DEEP_SIGNAL';
      if (log.experiences.derealization > 85) typeKey = 'WARNING';
      if (log.experiences.complexity > 85) typeKey = 'ANOMALY';
      if (log.encryptionLevel > userLogCount + 2) typeKey = 'LOST_TRANSMISSION';

      return { ...log, x, y, typeKey };
    });
  }, [networkLogs, userLogCount]);

  // Generate edges between similar logs (same genre or emotion)
  const edges = useMemo(() => {
    const lines = [];
    for (let i = 0; i < spatialLogs.length; i++) {
      for (let j = i + 1; j < spatialLogs.length; j++) {
        const logA = spatialLogs[i];
        const logB = spatialLogs[j];
        
        let isConnected = false;
        if (logA.type === logB.type) isConnected = true; // Same genre
        else if (logA.emotions.some(e => logB.emotions.includes(e))) isConnected = true; // Same emotion

        if (isConnected) {
          const dx = logA.x - logB.x;
          const dy = logA.y - logB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 800) { // Only connect if within a reasonable range
            const strength = Math.max(0.18, 1 - distance / 800);
            lines.push({ id: `${logA.id}-${logB.id}`, x1: logA.x, y1: logA.y, x2: logB.x, y2: logB.y, strength });
          }
        }
      }
    }

    if (lines.length === 0 && spatialLogs.length > 1) {
      for (let i = 0; i < spatialLogs.length - 1; i++) {
        const logA = spatialLogs[i];
        const logB = spatialLogs[i + 1];
        lines.push({
          id: `relay-${logA.id}-${logB.id}`,
          x1: logA.x,
          y1: logA.y,
          x2: logB.x,
          y2: logB.y,
          strength: 0.22,
        });
      }
    }

    return lines;
  }, [spatialLogs]);

  const transmissionStream = useMemo(() => {
    const baseStream = spatialLogs
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .flatMap((log, index) => {
        const typeConfig = LOG_TYPES[log.typeKey];
        const isEncrypted = userLogCount < log.encryptionLevel;
        return [
          {
            id: `${log.id}-primary`,
            color: typeConfig.color,
            status: isEncrypted ? 'LOCKED' : log.typeKey,
            sender: log.explorerId,
            body: isEncrypted ? `암호화된 신호 감지 / ACCESS_REQ LVL_${log.encryptionLevel}` : getSignalLine(log, index),
          },
          ...log.responseSignals.slice(-1).map(signal => ({
            id: `${log.id}-${signal.signalId}`,
            color: 'var(--accent-amber)',
            status: 'RESPONSE',
            sender: signal.sender,
            body: `응답 신호 수신 // ${signal.message}`,
          })),
        ];
      });

    if (baseStream.length < 5) {
      baseStream.push(
        { id: 'system-watch-01', color: 'var(--primary-cyan)', status: 'SYSTEM', sender: 'ARCHIVE-CORE', body: '섹터별 감정 동기화율을 갱신 중입니다.' },
        { id: 'system-watch-02', color: 'var(--accent-amber)', status: 'MISSION', sender: 'MISSION-CONTROL', body: '이번 주 공동 목표: LOST_TRANSMISSION 3개 해독.' },
        { id: 'system-watch-03', color: '#a855f7', status: 'ANOMALY', sender: 'NULL-PILGRIM', body: '하드SF 클러스터 근처에서 비정상 개념 태그가 반복됩니다.' },
      );
    }

    return baseStream.slice(0, 8);
  }, [spatialLogs, userLogCount]);

  const handleNodeClick = (log) => {
    if (userLogCount >= log.encryptionLevel) {
      navigate(`/network/${log.id}`);
    }
  };

  return (
    <PageTransition className="network-container">
      <header className="page-header pointer-area">
        <h2 className="mono title-glitch" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)' }}>
          <Radar size={20} className="spin-slow" /> LIVE_SIGNAL_NET
        </h2>
        <p className="mono text-muted text-xs">탐사자 교신망: {spatialLogs.length} SIGNALS DETECTED</p>
      </header>

      <div className="network-viewport">
        <div className="signal-sweep"></div>
        <ZoomableMap
          width={2000}
          height={1500}
          initialScale={0.92}
          minScale={0.38}
          maxScale={3.2}
          contentClassName="network-transform-content"
        >
            <div className="network-canvas-area">
              <div className="network-grid-depth"></div>
              
              <svg className="network-edges" width="2000" height="1500">
                {edges.map(edge => (
                  <g key={edge.id} className="signal-edge">
                    <line 
                      x1={edge.x1} y1={edge.y1} 
                      x2={edge.x2} y2={edge.y2} 
                      stroke="var(--primary-cyan-dim)" 
                      strokeWidth={0.8 + edge.strength * 1.4}
                      opacity={0.14 + edge.strength * 0.42}
                    />
                    <circle r={1.6 + edge.strength * 2.4} fill="var(--primary-cyan)" opacity="0.88">
                      <animateMotion 
                        dur={`${5 - edge.strength * 2.2}s`} 
                        repeatCount="indefinite" 
                        path={`M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`}
                      />
                    </circle>
                    <circle r="1.5" fill="var(--accent-amber)" opacity="0.7">
                      <animateMotion 
                        dur={`${7 - edge.strength * 2}s`}
                        begin="1.2s"
                        repeatCount="indefinite" 
                        path={`M ${edge.x2} ${edge.y2} L ${edge.x1} ${edge.y1}`}
                      />
                    </circle>
                  </g>
                ))}
              </svg>

              {spatialLogs.map(log => {
                const isEncrypted = userLogCount < log.encryptionLevel;
                const typeConfig = LOG_TYPES[log.typeKey];
                const Icon = typeConfig.icon;
                const isHovered = hoveredNode === log.id;

                return (
                  <div 
                    key={log.id}
                    className="network-node pointer-area"
                    style={{ left: log.x, top: log.y }}
                    onMouseEnter={() => setHoveredNode(log.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleNodeClick(log)}
                  >
                    <div className="node-icon-container">
                      
                      {/* Node Core */}
                      <div 
                        className={`signal-node-core ${isHovered ? 'hovered' : ''}`}
                        style={{ backgroundColor: typeConfig.color, boxShadow: `0 0 10px ${typeConfig.color}` }}
                      >
                        {isEncrypted && <div className="encrypted-overlay"></div>}
                      </div>
                      
                      <div 
                        className="signal-radar-ring"
                        style={{ borderColor: typeConfig.color }}
                      ></div>
                      <div
                        className="signal-strength-ring"
                        style={{
                          borderColor: typeConfig.color,
                          width: 30 + log.experiences.immersion * 0.45,
                          height: 30 + log.experiences.immersion * 0.45,
                        }}
                      ></div>

                      <AnimatePresence>
                        {isHovered && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className={`node-hud ${isEncrypted ? 'encrypted-hud' : ''}`}
                            style={{ borderColor: isEncrypted ? '#ef4444' : 'var(--primary-cyan)' }}
                          >
                            <div className="hud-type-header">
                              <Icon size={12} color={typeConfig.color} />
                              <span className="mono" style={{ color: typeConfig.color, fontSize: '8px' }}>
                                {log.typeKey}
                              </span>
                            </div>
                            
                            {isEncrypted ? (
                              <div className="mono encrypted-text">
                                <Lock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                                ENCRYPTED_DATA
                                <div className="access-req">ACCESS_REQ: LVL_{log.encryptionLevel}</div>
                              </div>
                            ) : (
                              <>
                                <div className="mono hud-title">{log.title}</div>
                                <div className="mono hud-sender">SENDER: {log.explorerId}</div>
                                <div className="hud-tags">
                                  {log.emotions.slice(0, 2).map(e => (
                                    <span key={e} className="mono mini-tag">{e}</span>
                                  ))}
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                );
              })}

            </div>
        </ZoomableMap>
        
        <div className="network-legend">
          <div className="mono legend-title">NODE_TYPES</div>
          {Object.entries(LOG_TYPES).map(([key, config]) => (
            <div key={key} className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: config.color }}></div>
              <span className="mono legend-label" style={{ color: config.color }}>{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="signal-telemetry panel">
          <div className="mono legend-title"><RadioTower size={12} /> LIVE_RELAY</div>
          <div className="telemetry-row mono">
            <span>PACKETS</span>
            <strong>{edges.length * 2}</strong>
          </div>
          <div className="telemetry-row mono">
            <span>USER_LOGS</span>
            <strong>{userLogCount}</strong>
          </div>
          <div className="transmission-strip">
            {[0, 1, 2, 3, 4, 5].map(i => <span key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
          <div className="mono uplink-label"><SendHorizontal size={10} /> LOG_TRANSMISSION_ARMED</div>
        </div>

        <div className="community-relay panel">
          <div className="relay-header mono">
            <MessageSquareText size={12} />
            <span>EXPLORER_COMM_STREAM</span>
          </div>
          <div className="relay-metrics">
            <div className="relay-metric mono">
              <Users size={11} />
              <span>{Math.max(7, spatialLogs.length * 3)} ACTIVE</span>
            </div>
            <div className="relay-metric mono">
              <Zap size={11} />
              <span>{edges.length * 2} PACKETS</span>
            </div>
          </div>
          <div className="relay-stream">
            {transmissionStream.map((signal, index) => (
              <motion.div
                key={signal.id}
                className="relay-line"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="relay-pulse" style={{ backgroundColor: signal.color, boxShadow: `0 0 10px ${signal.color}` }} />
                <div>
                  <div className="relay-line-meta mono">
                    <span style={{ color: signal.color }}>{signal.status}</span>
                    <span>{signal.sender}</span>
                  </div>
                  <p>{signal.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Network;
