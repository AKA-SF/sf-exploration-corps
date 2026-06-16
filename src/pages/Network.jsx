import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogs } from '../context/LogContext';
import { Lock, Radar, RadioTower, SendHorizontal, MessageSquareText, Users, Zap } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { ZoomableMap } from '../components/ZoomableMap';
import { useAuth } from '../context/authContextValue';
import { useActivityToast } from '../context/activityToastContextValue';
import { useMotionProfile } from '../hooks/useMotionProfile';
import { recordUserActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import { fetchCommunityQuestions } from './questions/communityApi';
import useRadioMessages from './network/useRadioMessages';
import {
  formatSignalTime,
  getActivitySignal,
  getBoardSignal,
  getDailyNetworkMission,
  getSignalLine,
  getSignalColor,
  getUnknownSignalTarget,
  getWorkCommentSignal,
  LOG_TYPES,
  MAX_ANIMATED_EDGES,
  MAX_EDGE_COMPARE_WINDOW,
  MAX_VISIBLE_EDGES,
  MAX_VISIBLE_NODES,
  NETWORK_AUX_SIGNAL_LIMIT,
  NETWORK_REACTIONS,
} from './network/networkUtils';
import './Network.css';
import '../styles/MobileExperience.css';

const Network = () => {
  const { logs, networkLogs } = useLogs();
  const { user } = useAuth();
  const { showActivityToast } = useActivityToast();
  const navigate = useNavigate();
  const userLogCount = logs.length;

  const [hoveredNode, setHoveredNode] = useState(null);
  const [activitySignals, setActivitySignals] = useState([]);
  const [boardSignals, setBoardSignals] = useState([]);
  const [workCommentSignals, setWorkCommentSignals] = useState([]);
  const [amplifiedSignals, setAmplifiedSignals] = useState(() => new Set());
  const [reactionNotice, setReactionNotice] = useState('');
  const [isReacting, setIsReacting] = useState(false);
  const motionProfile = useMotionProfile();
  const {
    isRadioSubmitting,
    radioBody,
    radioMessages,
    radioNotice,
    radioStatus,
    radioStream,
    replyBody,
    replyTarget,
    setRadioBody,
    setReplyBody,
    setReplyTarget,
    submitRadioMessage,
    submitRadioReply,
  } = useRadioMessages(user);

  const normalizeActivitySignal = useCallback(activity => {
    const signal = getActivitySignal(activity);
    return {
      id: `activity-${activity.id}`,
      color: getSignalColor(signal.status),
      status: signal.status,
      sender: activity.genre || 'CREW_ACTIVITY',
      body: signal.body,
      href: signal.href,
      time: formatSignalTime(activity.created_at),
      createdAt: activity.created_at,
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadActivitySignals = async () => {
      if (!supabase) {
        setActivitySignals([]);
        return;
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action_type, genre, points, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(18);

      if (!isMounted) return;

      if (error) {
        setActivitySignals([]);
        return;
      }

      setActivitySignals((data ?? []).map(normalizeActivitySignal));
    };

    loadActivitySignals();

    if (!supabase) return () => {
      isMounted = false;
    };

    const channel = supabase
      .channel('network-activity-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
      }, payload => {
        if (payload.new?.user_id !== user?.id) return;
        setActivitySignals(current => {
          const nextSignal = normalizeActivitySignal(payload.new);
          if (current.some(signal => signal.id === nextSignal.id)) return current;
          return [nextSignal, ...current].slice(0, 18);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [normalizeActivitySignal, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadAuxiliarySignals() {
      const [boardResult, workCommentResult] = await Promise.allSettled([
        fetchCommunityQuestions({ pageSize: NETWORK_AUX_SIGNAL_LIMIT }),
        supabase
          ? supabase
            .from('work_comments')
            .select('id,work_code,work_title,author_name,body,created_at')
            .order('created_at', { ascending: false })
            .limit(NETWORK_AUX_SIGNAL_LIMIT)
          : Promise.resolve({ data: [] }),
      ]);

      if (!isMounted) return;

      if (boardResult.status === 'fulfilled') {
        setBoardSignals((boardResult.value.questions ?? []).map(getBoardSignal));
      }

      if (workCommentResult.status === 'fulfilled' && !workCommentResult.value.error) {
        setWorkCommentSignals((workCommentResult.value.data ?? []).map(getWorkCommentSignal));
      }
    }

    loadAuxiliarySignals();

    return () => {
      isMounted = false;
    };
  }, []);

  // Generate spatial coordinates and types for logs
  const spatialLogs = useMemo(() => {
    const nodeLimit = motionProfile.reduced ? 32 : motionProfile.compact ? 38 : MAX_VISIBLE_NODES;
    return networkLogs.slice(0, nodeLimit).map((log) => {
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
  }, [motionProfile, networkLogs, userLogCount]);

  // Generate edges between similar logs (same genre or emotion)
  const edges = useMemo(() => {
    const lines = [];
    const compareWindow = motionProfile.reduced ? 10 : motionProfile.compact ? 12 : MAX_EDGE_COMPARE_WINDOW;
    const edgeLimit = motionProfile.reduced ? 36 : motionProfile.compact ? 52 : MAX_VISIBLE_EDGES;
    for (let i = 0; i < spatialLogs.length; i++) {
      const maxJ = Math.min(spatialLogs.length, i + 1 + compareWindow);
      for (let j = i + 1; j < maxJ; j++) {
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
      .slice(0, edgeLimit);
  }, [motionProfile, spatialLogs]);

  const dailyMission = useMemo(() => getDailyNetworkMission(), []);

  const unknownSignal = useMemo(
    () => getUnknownSignalTarget({ activitySignals, radioMessages, spatialLogs }),
    [activitySignals, radioMessages, spatialLogs],
  );

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

    const unknownStreamSignal = {
      id: 'unknown-daily-signal',
      color: unknownSignal.color,
      status: unknownSignal.status,
      sender: 'DEEP_SCAN',
      body: `미확인 신호 감지 // ${unknownSignal.body}`,
      href: unknownSignal.href,
      time: unknownSignal.label,
    };

    const missionSignal = {
      id: `daily-mission-${dailyMission.id}`,
      color: getSignalColor(dailyMission.signal),
      status: 'DAILY_MISSION',
      sender: 'MISSION-CONTROL',
      body: `${dailyMission.title} // ${dailyMission.detail}`,
      href: dailyMission.href,
      time: dailyMission.reward,
    };

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
            href: isEncrypted ? null : `/network/${log.id}`,
            time: isEncrypted ? `LVL_${log.encryptionLevel}` : 'LOG_TRACE',
          },
          ...log.responseSignals.slice(-1).map(signal => ({
            id: `${log.id}-${signal.signalId}`,
            color: 'var(--accent-amber)',
            status: 'RESPONSE',
            sender: signal.sender,
            body: `응답 신호 수신 // ${signal.message}`,
            href: `/network/${log.id}`,
            time: 'RELAY_REPLY',
          })),
        ];
      });

    if (baseStream.length + radioSignals.length < 5) {
      baseStream.push(
        { id: 'system-watch-01', color: 'var(--primary-cyan)', status: 'SYSTEM', sender: 'ARCHIVE-CORE', body: '섹터별 감정 동기화율을 갱신 중입니다.', href: '/works/novels', time: 'ARCHIVE' },
        { id: 'system-watch-02', color: 'var(--accent-amber)', status: 'MISSION', sender: 'MISSION-CONTROL', body: '오늘의 임무 채널을 열어 대원 활동 신호를 기다리는 중입니다.', href: dailyMission.href, time: dailyMission.reward },
      );
    }

    return [
      unknownStreamSignal,
      ...radioSignals.slice(0, 5),
      ...activitySignals.slice(0, 6),
      ...boardSignals.slice(0, 4),
      ...workCommentSignals.slice(0, 4),
      missionSignal,
      ...baseStream,
    ].slice(0, 22);
  }, [activitySignals, boardSignals, dailyMission, radioStream, spatialLogs, unknownSignal, userLogCount, workCommentSignals]);

  const handleNodeClick = (log) => {
    if (userLogCount >= log.encryptionLevel) {
      navigate(`/network/${log.id}`);
    }
  };

  const animatedEdgeLimit = motionProfile.reduced ? 0 : motionProfile.compact ? 10 : MAX_ANIMATED_EDGES;

  const reactToSignal = async (signal, reaction) => {
    if (!user) {
      setReactionNotice('로그인 후 신호에 반응할 수 있습니다.');
      return;
    }
    if (isReacting) return;

    const today = new Date().toLocaleDateString('sv-SE');
    const reactionKey = `${reaction.id}:${signal.id}:${today}`;
    if (amplifiedSignals.has(reactionKey)) {
      setReactionNotice('이 신호는 오늘 이미 처리했습니다.');
      return;
    }

    setIsReacting(true);
    setReactionNotice('');
    const result = await recordUserActivity(user, {
      actionType: reaction.id === 'amplify' ? 'signal_reaction' : 'reaction',
      dedupeKey: `network:${reactionKey}`,
      genre: '네트워크 반응',
      points: reaction.points,
      metadata: {
        title: `${reaction.label} / ${signal.status}`,
        body: signal.body,
        href: signal.href,
        signal_id: signal.id,
        signal_status: signal.status,
        reaction: reaction.id,
        node: 'network-relay',
      },
    });

    if (result.ok) {
      setAmplifiedSignals(current => new Set(current).add(reactionKey));
      setReactionNotice(`${reaction.label} 완료. +${reaction.points} MP`);
      showActivityToast({
        detail: `${signal.status} 신호에 ${reaction.label}을 남겼습니다.`,
        points: reaction.points,
        title: '네트워크 반응 기록',
      });
    } else {
      setReactionNotice(result.error?.message || '신호 반응 저장에 실패했습니다.');
    }
    setIsReacting(false);
  };

  const renderRelayLine = (signal, index, ghost = false) => (
    <div
      aria-hidden={ghost ? 'true' : undefined}
      key={`${ghost ? 'ghost' : 'live'}-${signal.id}`}
      className={`relay-line ${ghost ? 'is-ghost' : ''} ${signal.isReplyToMe ? 'is-received-reply' : ''}`}
      style={ghost ? undefined : { animationDelay: `${index * 0.05}s` }}
    >
      <span className="relay-pulse" style={{ backgroundColor: signal.color, boxShadow: `0 0 10px ${signal.color}` }} />
      <div>
        <div className="relay-line-meta mono">
          <span style={{ color: signal.color }}>{signal.status}</span>
          <span>{signal.time || signal.sender}</span>
        </div>
        <p>{signal.body}</p>
        {!ghost && (
          <div className="relay-line-actions">
            {signal.href && (
              <button
                className="relay-track-button mono"
                onClick={() => navigate(signal.href)}
                type="button"
              >
                신호 추적
              </button>
            )}
            {NETWORK_REACTIONS.map(reaction => {
              const today = new Date().toLocaleDateString('sv-SE');
              const reactionKey = `${reaction.id}:${signal.id}:${today}`;
              const isDone = amplifiedSignals.has(reactionKey);
              return (
                <button
                  className={`relay-reaction-button mono ${reaction.id === 'amplify' ? 'is-amplify' : ''}`}
                  disabled={isReacting || isDone}
                  key={reaction.id}
                  onClick={() => reactToSignal(signal, reaction)}
                  type="button"
                >
                  {isDone ? '완료' : `${reaction.label} +${reaction.points}`}
                </button>
              );
            })}
            {signal.message && signal.message.user_id !== user?.id && (
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
        )}
      </div>
    </div>
  );

  return (
    <PageTransition className="network-container">
      <header className="page-header pointer-area">
        <h2 className="mono title-glitch" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)' }}>
          <Radar size={20} className="spin-slow" /> RELAY_RECEIVER
        </h2>
        <p className="mono text-muted text-xs">탐사 장비: 기록, 감정, 섹터가 비슷한 신호를 수신하고 교신망으로 연결합니다.</p>
      </header>

      <section className="network-primer network-control-deck panel panel-accent">
        <div className="network-control-status">
          <div className="relay-header mono">
            <MessageSquareText size={12} />
            <span>EXPLORER_COMM_STREAM</span>
          </div>
          <strong>탐사자 활동, 커뮤니티 글, 작품 댓글, 무전 메시지가 하나의 공개 신호망으로 흐릅니다.</strong>
          <div className="network-device-readout mono" aria-label="교신 장비 상태">
            <span>
              <b>ACTIVE</b>
              <em>{Math.max(7, spatialLogs.length * 3 + radioMessages.length + activitySignals.length)}</em>
            </span>
            <span>
              <b>NODES</b>
              <em>{spatialLogs.length}</em>
            </span>
            <span>
              <b>PACKETS</b>
              <em>{edges.length * 2 + activitySignals.length + radioMessages.length}</em>
            </span>
          </div>
        </div>

        <button className="unknown-signal-card network-top-signal" onClick={() => navigate(unknownSignal.href)} type="button">
          <span className="mono">UNKNOWN_SIGNAL</span>
          <strong>{unknownSignal.body}</strong>
          <em className="mono">{unknownSignal.label}</em>
        </button>

        <div className="network-radio-dock">
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
          {reactionNotice && <p className="radio-notice">{reactionNotice}</p>}
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
                    {edgeIndex < animatedEdgeLimit && (
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

                      {isHovered && (
                          <div
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
                          </div>
                        )}

                    </div>
                  </div>
                );
              })}

              {spatialLogs.length === 0 && (
                <div className="network-empty-state panel panel-accent">
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
          <div className="relay-top">
            <div className="relay-header mono">
              <MessageSquareText size={12} />
              <span>LIVE_SIGNAL_LOG</span>
            </div>
            <div className="relay-metrics">
              <div className="relay-metric mono">
                <Users size={11} />
                <span>{Math.max(7, spatialLogs.length * 3 + radioMessages.length + activitySignals.length)} ACTIVE</span>
              </div>
              <div className="relay-metric mono">
                <Zap size={11} />
                <span>{edges.length * 2 + radioMessages.length + activitySignals.length} PACKETS</span>
              </div>
            </div>
          </div>

          <div
            className="relay-stream"
            style={{ '--relay-duration': `${Math.max(34, transmissionStream.length * 3.5)}s` }}
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
