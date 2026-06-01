import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogs } from '../context/LogContext';
import { Lock, Radar, Activity, Skull, AlertTriangle, Hexagon, RadioTower, SendHorizontal, MessageSquareText, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { ZoomableMap } from '../components/ZoomableMap';
import { useAuth } from '../context/authContextValue';
import { recordUserActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import './Network.css';

const LOG_TYPES = {
  WARNING: { color: 'var(--accent-amber)', icon: AlertTriangle },
  DEEP_SIGNAL: { color: 'var(--primary-cyan)', icon: Activity },
  ANOMALY: { color: '#a855f7', icon: Hexagon }, // Purple
  LOST_TRANSMISSION: { color: '#ef4444', icon: Skull } // Red
};

const SIGNAL_ACTIONS = ['RESONATE', 'DECODE_REQ', 'ECHO', 'DISTORT', 'ARCHIVE'];
const MAX_VISIBLE_NODES = 80;
const MAX_VISIBLE_EDGES = 160;
const MAX_ANIMATED_EDGES = 72;
const RADIO_MESSAGE_LIMIT = 48;

function getUserNickname(user) {
  return user?.user_metadata?.nickname || user?.email?.split('@')[0] || '탐사자';
}

function formatSignalTime(value) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const getSignalLine = (log, index) => {
  const emotion = log.emotions?.[0] || '미확인 감정';
  const idea = log.ideas?.[0] || '미확인 개념';
  const action = SIGNAL_ACTIONS[index % SIGNAL_ACTIONS.length];
  return `${log.explorerId} // ${log.type} 섹터에서 '${log.title}' ${action} / ${emotion} + ${idea}`;
};

const Network = () => {
  const { logs, networkLogs } = useLogs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userLogCount = logs.length;

  const [hoveredNode, setHoveredNode] = useState(null);
  const [radioMessages, setRadioMessages] = useState([]);
  const [radioStatus, setRadioStatus] = useState('loading');
  const [radioNotice, setRadioNotice] = useState('');
  const [radioBody, setRadioBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [isRadioSubmitting, setIsRadioSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRadioMessages() {
      if (!supabase) {
        setRadioStatus('unavailable');
        return;
      }

      const { data, error } = await supabase
        .from('radio_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(RADIO_MESSAGE_LIMIT);

      if (!isMounted) return;
      if (error) {
        setRadioStatus(error.code === '42P01' ? 'schema-missing' : 'error');
        setRadioNotice(error.message);
        return;
      }

      setRadioMessages(data ?? []);
      setRadioStatus('ready');
      setRadioNotice('');
    }

    loadRadioMessages();

    if (!supabase) return () => {
      isMounted = false;
    };

    const channel = supabase
      .channel('radio-messages-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'radio_messages',
      }, payload => {
        setRadioMessages(current => {
          if (current.some(message => message.id === payload.new.id)) return current;
          return [payload.new, ...current].slice(0, RADIO_MESSAGE_LIMIT);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const radioParentMap = useMemo(() => new Map(radioMessages.map(message => [message.id, message])), [radioMessages]);

  const radioStream = useMemo(() => radioMessages.slice(0, 12).map(message => {
    const parent = message.parent_id ? radioParentMap.get(message.parent_id) : null;
    const isReplyToMe = Boolean(parent && user && parent.user_id === user.id && message.user_id !== user.id);
    return {
      id: message.id,
      color: isReplyToMe ? 'var(--accent-amber)' : message.parent_id ? '#a855f7' : 'var(--primary-cyan)',
      status: isReplyToMe ? 'DIRECT_REPLY' : message.parent_id ? 'REPLY_SIGNAL' : 'OPEN_RADIO',
      sender: message.author_name,
      body: message.parent_id
        ? `${message.recipient_name || parent?.author_name || '탐사자'}에게 답신 // ${message.body}`
        : message.body,
      time: formatSignalTime(message.created_at),
      message,
      parent,
      isReplyToMe,
    };
  }), [radioMessages, radioParentMap, user]);

  const submitRadioMessage = async event => {
    event.preventDefault();
    if (!user) {
      setRadioNotice('로그인 후 무전 메시지를 송신할 수 있습니다.');
      return;
    }
    if (!radioBody.trim()) {
      setRadioNotice('무전 내용을 입력해주세요.');
      return;
    }

    setIsRadioSubmitting(true);
    setRadioNotice('');
    const body = radioBody.trim().slice(0, 240);
    const { data, error } = await supabase
      .from('radio_messages')
      .insert({
        user_id: user.id,
        author_name: getUserNickname(user),
        body,
      })
      .select()
      .single();

    if (error) {
      setRadioNotice(error.code === '42P01' ? '무전 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.' : error.message);
      setIsRadioSubmitting(false);
      return;
    }

    setRadioMessages(current => current.some(message => message.id === data.id) ? current : [data, ...current].slice(0, RADIO_MESSAGE_LIMIT));
    setRadioBody('');
    await recordUserActivity(user, {
      actionType: 'radio_message',
      points: 4,
      genre: '네트워크 무전',
      metadata: { title: '무전 메시지 송신', body },
    });
    setIsRadioSubmitting(false);
  };

  const submitRadioReply = async event => {
    event.preventDefault();
    if (!replyTarget) return;
    if (!user) {
      setRadioNotice('로그인 후 답신을 보낼 수 있습니다.');
      return;
    }
    if (!replyBody.trim()) {
      setRadioNotice('답신 내용을 입력해주세요.');
      return;
    }

    setIsRadioSubmitting(true);
    setRadioNotice('');
    const body = replyBody.trim().slice(0, 180);
    const { data, error } = await supabase
      .from('radio_messages')
      .insert({
        user_id: user.id,
        author_name: getUserNickname(user),
        body,
        parent_id: replyTarget.id,
        recipient_name: replyTarget.author_name,
      })
      .select()
      .single();

    if (error) {
      setRadioNotice(error.code === '42P01' ? '무전 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.' : error.message);
      setIsRadioSubmitting(false);
      return;
    }

    setRadioMessages(current => current.some(message => message.id === data.id) ? current : [data, ...current].slice(0, RADIO_MESSAGE_LIMIT));
    setReplyBody('');
    setReplyTarget(null);
    await recordUserActivity(user, {
      actionType: 'radio_reply',
      points: 3,
      genre: '네트워크 답신',
      metadata: { title: '무전 답신 송신', body, recipient: replyTarget.author_name },
    });
    setIsRadioSubmitting(false);
  };

  // Generate spatial coordinates and types for logs
  const spatialLogs = useMemo(() => {
    return networkLogs.slice(0, MAX_VISIBLE_NODES).map((log) => {
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

    return lines
      .sort((a, b) => b.strength - a.strength)
      .slice(0, MAX_VISIBLE_EDGES);
  }, [spatialLogs]);

  const transmissionStream = useMemo(() => {
    const radioSignals = radioStream.map(signal => ({
      id: `radio-${signal.id}`,
      color: signal.color,
      status: signal.status,
      sender: signal.sender,
      body: signal.body,
      time: signal.time,
      message: signal.message,
      isReplyToMe: signal.isReplyToMe,
    }));

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

    if (baseStream.length + radioSignals.length < 5) {
      baseStream.push(
        { id: 'system-watch-01', color: 'var(--primary-cyan)', status: 'SYSTEM', sender: 'ARCHIVE-CORE', body: '섹터별 감정 동기화율을 갱신 중입니다.' },
        { id: 'system-watch-02', color: 'var(--accent-amber)', status: 'MISSION', sender: 'MISSION-CONTROL', body: '이번 주 공동 목표: LOST_TRANSMISSION 3개 해독.' },
        { id: 'system-watch-03', color: '#a855f7', status: 'ANOMALY', sender: 'NULL-PILGRIM', body: '하드SF 클러스터 근처에서 비정상 개념 태그가 반복됩니다.' },
      );
    }

    return [...radioSignals, ...baseStream].slice(0, 10);
  }, [radioStream, spatialLogs, userLogCount]);

  const handleNodeClick = (log) => {
    if (userLogCount >= log.encryptionLevel) {
      navigate(`/network/${log.id}`);
    }
  };

  const renderRelayLine = (signal, index, ghost = false) => (
    <motion.div
      aria-hidden={ghost ? 'true' : undefined}
      key={`${ghost ? 'ghost' : 'live'}-${signal.id}`}
      className={`relay-line ${signal.isReplyToMe ? 'is-received-reply' : ''}`}
      initial={ghost ? false : { opacity: 0, x: -8 }}
      animate={ghost ? undefined : { opacity: 1, x: 0 }}
      transition={ghost ? undefined : { delay: index * 0.05 }}
    >
      <span className="relay-pulse" style={{ backgroundColor: signal.color, boxShadow: `0 0 10px ${signal.color}` }} />
      <div>
        <div className="relay-line-meta mono">
          <span style={{ color: signal.color }}>{signal.status}</span>
          <span>{signal.time || signal.sender}</span>
        </div>
        <p>{signal.body}</p>
        {!ghost && signal.message && signal.message.user_id !== user?.id && (
          <button
            className="radio-reply-button mono"
            onClick={() => {
              setReplyTarget(signal.message);
              setReplyBody('');
            }}
            type="button"
          >
            답신 보내기
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <PageTransition className="network-container">
      <header className="page-header pointer-area">
        <h2 className="mono title-glitch" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)' }}>
          <Radar size={20} className="spin-slow" /> RELAY_RECEIVER
        </h2>
        <p className="mono text-muted text-xs">탐사 장비: 기록, 감정, 섹터가 비슷한 신호를 수신하고 교신망으로 연결합니다.</p>
      </header>

      <section className="network-primer panel">
        <div>
          <span className="mono">RECEIVER_FUNCTION</span>
          <strong>탐사 기록이 무전 신호처럼 수신되고, 유사 감정/섹터/개념을 가진 로그와 연결됩니다.</strong>
        </div>
        <div className="network-device-readout mono" aria-label="교신 장비 상태">
          <span>
            <b>CHANNEL</b>
            <em>SF-ARCHIVE</em>
          </span>
          <span>
            <b>NODES</b>
            <em>{spatialLogs.length}</em>
          </span>
          <span>
            <b>PACKETS</b>
            <em>{edges.length * 2}</em>
          </span>
        </div>
      </section>

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
                {edges.map((edge, edgeIndex) => (
                  <g key={edge.id} className="signal-edge">
                    <line 
                      x1={edge.x1} y1={edge.y1} 
                      x2={edge.x2} y2={edge.y2} 
                      stroke="var(--primary-cyan-dim)" 
                      strokeWidth={0.8 + edge.strength * 1.4}
                      opacity={0.14 + edge.strength * 0.42}
                    />
                    {edgeIndex < MAX_ANIMATED_EDGES && (
                      <>
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
                      </>
                    )}
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

              {spatialLogs.length === 0 && (
                <div className="network-empty-state panel">
                  <span className="mono">NO_LIVE_SIGNAL</span>
                  <strong>아직 수신된 탐사 신호가 없습니다</strong>
                  <p>첫 탐사 보고서를 송신하면 이 공간에 감정 반응, 유사 탐사자, 연결 작품 신호가 나타납니다.</p>
                  <button className="mono" onClick={() => navigate('/log')}>첫 탐사 보고서 작성</button>
                </div>
              )}

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
              <span>{Math.max(7, spatialLogs.length * 3 + radioMessages.length)} ACTIVE</span>
            </div>
            <div className="relay-metric mono">
              <Zap size={11} />
              <span>{edges.length * 2 + radioMessages.length} PACKETS</span>
            </div>
          </div>
          <form className="radio-composer" onSubmit={submitRadioMessage}>
            <label className="mono" htmlFor="radio-message">OPEN_RADIO_MESSAGE</label>
            <textarea
              id="radio-message"
              maxLength={240}
              onChange={event => setRadioBody(event.target.value)}
              placeholder={user ? '현재 탐사 중인 좌표, 읽는 책, 감지한 신호를 짧게 남겨보세요.' : '로그인 후 무전 메시지를 송신할 수 있습니다.'}
              value={radioBody}
            />
            <div className="radio-composer-bottom">
              <span className="mono">{radioBody.length}/240</span>
              <button className="mono" disabled={!user || isRadioSubmitting || !radioBody.trim()} type="submit">
                송신 +4MP
              </button>
            </div>
          </form>
          {replyTarget && (
            <form className="radio-reply-composer" onSubmit={submitRadioReply}>
              <div className="radio-reply-target mono">
                <span>REPLY_TO</span>
                <strong>{replyTarget.author_name}</strong>
                <button type="button" onClick={() => setReplyTarget(null)}>취소</button>
              </div>
              <textarea
                maxLength={180}
                onChange={event => setReplyBody(event.target.value)}
                placeholder={`${replyTarget.author_name} 대원에게 공개 답신 보내기`}
                value={replyBody}
              />
              <div className="radio-composer-bottom">
                <span className="mono">{replyBody.length}/180</span>
                <button className="mono" disabled={!user || isRadioSubmitting || !replyBody.trim()} type="submit">
                  답신 +3MP
                </button>
              </div>
            </form>
          )}
          {radioStatus === 'schema-missing' && (
            <p className="radio-notice">무전 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.</p>
          )}
          {radioNotice && radioStatus !== 'schema-missing' && <p className="radio-notice">{radioNotice}</p>}
          <div
            className="relay-stream"
            style={{ '--relay-duration': `${Math.max(26, transmissionStream.length * 4.2)}s` }}
          >
            <div className="relay-stream-track">
              <div className="relay-stream-set">
                {transmissionStream.map((signal, index) => renderRelayLine(signal, index))}
              </div>
              <div className="relay-stream-set is-duplicate">
                {transmissionStream.map((signal, index) => renderRelayLine(signal, index, true))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Network;
