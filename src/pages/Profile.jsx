import { Hexagon, Fingerprint, Network, Radio, BadgeCheck, Shield, SatelliteDish, Trophy, Map, Compass, Eye, Flame, CheckCircle2, Lock, Activity } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import { PROFILE_SECTORS } from '../data/sfTaxonomy';
import PageTransition from '../components/PageTransition';
import './Profile.css';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const Profile = () => {
  const { logs, networkLogs } = useLogs();
  
  const totalLogs = logs.length;
  const level = Math.max(1, Math.floor(totalLogs / 3) + 1);

  // Calculate my total response signals sent across the network
  let commCount = 0;
  networkLogs.forEach(netLog => {
    netLog.responseSignals.forEach(sig => {
      if (sig.sender === "USER-7734") commCount++;
    });
  });

  // Calculate averages for the 6 experience parameters
  const averages = logs.reduce((acc, log) => {
    acc.immersion += log.experiences?.immersion || 50;
    acc.addiction += log.experiences?.addiction || 50;
    acc.complexity += log.experiences?.complexity || 50;
    acc.visual += log.experiences?.visual || 50;
    acc.derealization += log.experiences?.derealization || 50;
    acc.scale += log.experiences?.scale || 50;
    return acc;
  }, { immersion: 0, addiction: 0, complexity: 0, visual: 0, derealization: 0, scale: 0 });

  if (totalLogs > 0) {
    Object.keys(averages).forEach(k => averages[k] = averages[k] / totalLogs);
  } else {
    Object.keys(averages).forEach(k => averages[k] = 50); // default
  }

  // Hexagon Radar Chart points
  const getPoint = (val, angle) => {
    const rad = (Math.PI / 180) * (angle - 90);
    const r = (val / 100) * 40; 
    return `${50 + r * Math.cos(rad)},${50 + r * Math.sin(rad)}`;
  };

  const pts = [
    getPoint(averages.immersion, 0),
    getPoint(averages.addiction, 60),
    getPoint(averages.complexity, 120),
    getPoint(averages.visual, 180),
    getPoint(averages.derealization, 240),
    getPoint(averages.scale, 300)
  ].join(' ');

  // Determine Primary Sector
  const sectorCounts = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});
  const countForSector = (sector) => (
    (sectorCounts[sector.name] || 0) + (sectorCounts[sector.en] || 0)
  );
  const primarySector = Object.keys(sectorCounts).sort((a,b) => sectorCounts[b] - sectorCounts[a])[0] || 'UNKNOWN';
  const topSectors = PROFILE_SECTORS
    .map(sector => ({ ...sector, count: countForSector(sector) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Determine Most felt emotion
  const emotionCounts = logs.reduce((acc, log) => {
    log.emotions?.forEach(e => {
      acc[e] = (acc[e] || 0) + 1;
    });
    return acc;
  }, {});
  const topEmotion = Object.keys(emotionCounts).sort((a,b) => emotionCounts[b] - emotionCounts[a])[0] || 'NONE';

  const recentLog = logs[0];
  const role = averages.derealization > 75
    ? 'ANOMALY READER'
    : averages.scale > 72
      ? 'WORLD CARTOGRAPHER'
      : averages.immersion > 72
        ? 'EMOTION DIVER'
        : 'SIGNAL ANALYST';
  const clearance = `LVL-${Math.min(9, level + Math.floor(commCount / 2))}`;
  const syncRate = Math.min(99, Math.round((averages.immersion + averages.scale + commCount * 8) / 2.2));

  const roleProgress = role === 'ANOMALY READER'
    ? averages.derealization
    : role === 'WORLD CARTOGRAPHER'
      ? averages.scale
      : role === 'EMOTION DIVER'
        ? averages.immersion
        : Math.min(100, totalLogs * 22 + commCount * 8);

  const nextRoleHint = role === 'SIGNAL ANALYST'
    ? '몰입감 평균 72 이상 또는 로그 3개를 달성하면 전문 클래스가 열립니다.'
    : role === 'EMOTION DIVER'
      ? '세계관 규모감 72 이상을 만들면 WORLD CARTOGRAPHER 경로가 열립니다.'
      : role === 'WORLD CARTOGRAPHER'
        ? '현실감 상실 평균 75 이상을 넘기면 ANOMALY READER 권한이 열립니다.'
        : '고위험 탐사 로그를 네트워크에 공유해 특수 해석 권한을 유지하십시오.';

  const highRiskLogs = logs.filter(log => ((log.experiences?.derealization || 0) + (log.experiences?.complexity || 0)) / 2 >= 70).length;

  const nextClass = role === 'SIGNAL ANALYST'
    ? { name: 'EMOTION DIVER', condition: '몰입감 평균 72 이상 또는 로그 3개', progress: Math.max(averages.immersion, totalLogs * 34) }
    : role === 'EMOTION DIVER'
      ? { name: 'WORLD CARTOGRAPHER', condition: '세계관 규모감 평균 72 이상', progress: averages.scale }
      : role === 'WORLD CARTOGRAPHER'
        ? { name: 'ANOMALY READER', condition: '현실감 상실 평균 75 이상', progress: averages.derealization }
        : { name: 'BLACK_ARCHIVE_DECODER', condition: '고위험 로그 5개와 네트워크 응답 3회', progress: Math.min(100, highRiskLogs * 16 + commCount * 8) };

  const classEvidence = [
    `${topSectors[0]?.name || '미탐사'} 섹터 반응 ${topSectors[0]?.count || 0}회`,
    `주요 감정대 ${topEmotion}`,
    `몰입 ${Math.round(averages.immersion)} / 세계관 ${Math.round(averages.scale)} / 현실감 상실 ${Math.round(averages.derealization)}`,
  ];

  const emotionTotal = (names) => names.reduce((sum, name) => sum + (emotionCounts[name] || 0), 0);
  const dystopiaCount = countForSector(PROFILE_SECTORS.find(s => s.id === 'dystopia'));

  const achievements = [
    { id: 'first-contact', title: 'FIRST_CONTACT', label: '첫 탐사 로그 작성', icon: Fingerprint, unlocked: totalLogs >= 1, progress: clamp(totalLogs * 100) },
    { id: 'dystopia-survivor', title: 'DYSTOPIA_SURVIVOR', label: '디스토피아 로그 3개', icon: Shield, unlocked: dystopiaCount >= 3, progress: clamp((dystopiaCount / 3) * 100) },
    { id: 'void-listener', title: 'VOID_LISTENER', label: '외로움/공포감 신호 5회', icon: Eye, unlocked: emotionTotal(['외로움', '공포감']) >= 5, progress: clamp((emotionTotal(['외로움', '공포감']) / 5) * 100) },
    { id: 'deep-archivist', title: 'DEEP_ARCHIVIST', label: '탐사 로그 10개', icon: Trophy, unlocked: totalLogs >= 10, progress: clamp((totalLogs / 10) * 100) },
    { id: 'signal-responder', title: 'SIGNAL_RESPONDER', label: '네트워크 응답 3회', icon: SatelliteDish, unlocked: commCount >= 3, progress: clamp((commCount / 3) * 100) },
    { id: 'reality-drift', title: 'REALITY_DRIFT', label: '현실감 상실 평균 80+', icon: Flame, unlocked: averages.derealization >= 80, progress: clamp(averages.derealization * 1.25) },
  ];

  const unexploredSector = PROFILE_SECTORS.find(sector => countForSector(sector) === 0);
  const missions = [
    {
      id: 'mission-logs',
      title: totalLogs < 3 ? '기초 탐사 기록 3개 확보' : '심층 아카이브 10개 확장',
      progress: totalLogs < 3 ? clamp((totalLogs / 3) * 100) : clamp((totalLogs / 10) * 100),
      status: totalLogs < 3 ? `${totalLogs}/3 LOGS` : `${totalLogs}/10 LOGS`,
    },
    {
      id: 'mission-sector',
      title: unexploredSector ? `${unexploredSector.name} 미탐사 섹터 진입` : '모든 주요 섹터 접촉 완료',
      progress: unexploredSector ? 0 : 100,
      status: unexploredSector ? 'UNEXPLORED' : 'COMPLETE',
    },
    {
      id: 'mission-risk',
      title: '고위험 신호 3개 해석',
      progress: clamp((highRiskLogs / 3) * 100),
      status: `${highRiskLogs}/3 HAZARD_LOGS`,
    },
  ];

  const diagnosis = (() => {
    if (averages.derealization >= 76) return '당신의 로그는 현실 붕괴감과 불안정한 세계 규칙에 강하게 반응합니다.';
    if (averages.scale >= 74) return '당신은 거대한 세계관, 문명 규모의 충돌, 장기적 시간축에 강하게 끌립니다.';
    if (averages.immersion >= 74) return '당신은 작품 내부로 깊게 잠수하는 감정 몰입형 탐사자입니다.';
    if (topEmotion !== 'NONE') return `${topEmotion} 신호가 반복됩니다. 이 감정대를 중심으로 다음 탐사 경로를 잡을 수 있습니다.`;
    return '아직 충분한 탐사 데이터가 없습니다. 첫 로그를 남기면 성향 진단이 활성화됩니다.';
  })();

  const recentImpact = recentLog
    ? networkLogs.filter(log => (
      log.id !== recentLog.id &&
      (log.type === recentLog.type || log.emotions?.some(e => recentLog.emotions?.includes(e)))
    )).length
    : 0;

  return (
    <PageTransition className="profile-container">
      <header className="page-header">
        <h2 className="mono title-glitch"><Fingerprint size={20} /> 탐사자 데이터 카드 <span className="text-muted text-xs">/ DOSSIER</span></h2>
      </header>

      <div className="profile-card panel">
        <div className="agent-id">
          <span className="mono text-muted text-xs">EXPLORER_CALLSIGN</span>
          <h3 className="mono text-cyan">ORBIT-7734</h3>
          <div className="agent-role mono">
            <BadgeCheck size={12} />
            <span>{role}</span>
          </div>
        </div>
        
        <div className="agent-stats">
          <div className="stat-block">
            <span className="mono text-muted text-xs">LEVEL</span>
            <span className="mono text-main text-lg">{level}</span>
          </div>
          <div className="stat-block">
            <span className="mono text-muted text-xs">LOGS</span>
            <span className="mono text-cyan text-lg">{totalLogs}</span>
          </div>
          <div className="stat-block">
            <span className="mono text-muted text-xs">COMMS</span>
            <span className="mono text-amber text-lg">{commCount}</span>
          </div>
        </div>
      </div>

      <div className="class-track panel">
        <div className="class-track-header">
          <div>
            <span className="mono text-muted text-xs">CLASS_EVOLUTION</span>
            <h3 className="mono">{role}</h3>
          </div>
          <span className="mono class-progress">{Math.round(roleProgress)}%</span>
        </div>
        <div className="class-progress-bar" style={{ '--progress': `${clamp(roleProgress)}%` }}>
          <span />
        </div>
        <p className="mono">{nextRoleHint}</p>
      </div>

      <div className="class-briefing panel">
        <h3 className="mono text-xs text-muted section-title"><Activity size={12}/> 클래스 판정 근거 <span className="text-cyan">/ CLASS_EVIDENCE</span></h3>
        <div className="evidence-list mono">
          {classEvidence.map(item => <span key={item}>{item}</span>)}
        </div>
        <div className="next-class mono">
          <div>
            <span>NEXT_CLASS</span>
            <strong>{nextClass.name}</strong>
            <p>{nextClass.condition}</p>
          </div>
          <em>{Math.round(clamp(nextClass.progress))}%</em>
        </div>
      </div>

      <div className="corps-pass panel">
        <div className="pass-stamp mono">
          <Shield size={14} />
          <span>SF_EXPLORATION_CORPS</span>
        </div>
        <div className="pass-grid mono">
          <div>
            <span>CLEARANCE</span>
            <strong>{clearance}</strong>
          </div>
          <div>
            <span>SYNC_RATE</span>
            <strong>{syncRate}%</strong>
          </div>
          <div>
            <span>PRIMARY BAND</span>
            <strong>{topEmotion}</strong>
          </div>
          <div>
            <span>COMM STATUS</span>
            <strong>{commCount > 0 ? 'LINKED' : 'LISTENING'}</strong>
          </div>
        </div>
        <div className="pass-footer mono">
          <SatelliteDish size={12} />
          <span>공동 탐사망 접속 가능 / SIGNAL RESPONSE AUTHORIZED</span>
        </div>
      </div>

      <div className="radar-section panel">
        <h3 className="mono text-xs text-muted section-title"><Network size={12}/> 탐사 성향 그래프 <span className="text-cyan">/ SENSORY_RADAR</span></h3>
        
        <div className="radar-display">
          <svg viewBox="0 0 100 100" className="radar-svg">
            <polygon points="50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30" fill="none" stroke="var(--text-dark)" strokeWidth="0.5" />
            <polygon points="50,30 67.3,40 67.3,60 50,70 32.7,60 32.7,40" fill="none" stroke="var(--text-dark)" strokeWidth="0.5" />
            
            <line x1="50" y1="50" x2="50" y2="10" stroke="var(--text-dark)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="84.6" y2="30" stroke="var(--text-dark)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="84.6" y2="70" stroke="var(--text-dark)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="50" y2="90" stroke="var(--text-dark)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="15.4" y2="70" stroke="var(--text-dark)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="15.4" y2="30" stroke="var(--text-dark)" strokeWidth="0.5" />
            
            <polygon 
              points={pts} 
              fill="var(--primary-cyan-dim)" 
              stroke="var(--primary-cyan)" 
              strokeWidth="1.5" 
              className="pulse-slow"
            />
          </svg>
          
          <div className="radar-labels mono text-xs">
            <span style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)' }}>IMMERSION</span>
            <span style={{ position: 'absolute', top: '25%', right: '0' }}>ADDICTION</span>
            <span style={{ position: 'absolute', bottom: '25%', right: '0' }}>COMPLEXITY</span>
            <span style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)' }}>VISUAL</span>
            <span style={{ position: 'absolute', bottom: '25%', left: '0' }}>DEREAL</span>
            <span style={{ position: 'absolute', top: '25%', left: '0' }}>SCALE</span>
          </div>
        </div>
      </div>

      <div className="personal-map panel">
        <h3 className="mono text-xs text-muted section-title"><Map size={12}/> 개인 탐사 성좌 <span className="text-cyan">/ PERSONAL_SECTOR_MAP</span></h3>
        <div className="personal-map-field">
          {PROFILE_SECTORS.map(sector => {
            const count = countForSector(sector);
            return (
              <div
                key={sector.id}
                className={`personal-sector ${count > 0 ? 'visited' : ''}`}
                style={{ left: `${sector.x}%`, top: `${sector.y}%` }}
                title={`${sector.name}: ${count}`}
              >
                <span />
                <em className="mono">{count}</em>
              </div>
            );
          })}
        </div>
      </div>

      <div className="taste-vector panel">
        <h3 className="mono text-xs text-muted section-title"><Compass size={12}/> 다음 탐사 신호 <span className="text-cyan">/ NEXT_SIGNAL</span></h3>
        <div className="vector-grid mono">
          {topSectors.map(sector => (
            <div key={sector.id}>
              <span>{sector.count > 0 ? 'ACTIVE_SECTOR' : 'UNTOUCHED_SECTOR'}</span>
              <strong>{sector.name}</strong>
              <em>{sector.count} LOGS</em>
            </div>
          ))}
          {unexploredSector && (
            <div className="recommended">
              <span>RECOMMENDED_DRIFT</span>
              <strong>{unexploredSector.name}</strong>
              <em>미탐사 구역 진입 권장</em>
            </div>
          )}
        </div>
      </div>

      <div className="achievement-grid panel">
        <h3 className="mono text-xs text-muted section-title"><Trophy size={12}/> 획득 배지 <span className="text-cyan">/ ACHIEVEMENTS</span></h3>
        <div className="badge-grid">
          {achievements.map(badge => {
            const Icon = badge.unlocked ? badge.icon : Lock;
            return (
              <div key={badge.id} className={`badge-card ${badge.unlocked ? 'unlocked' : ''}`}>
                <Icon size={16} />
                <strong className="mono">{badge.title}</strong>
                <span>{badge.label}</span>
                <i style={{ width: `${badge.progress}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mission-board panel">
        <h3 className="mono text-xs text-muted section-title"><Compass size={12}/> 현재 임무 <span className="text-cyan">/ ACTIVE_DIRECTIVES</span></h3>
        {missions.map(mission => (
          <div key={mission.id} className="mission-row mono">
            <div>
              <strong>{mission.title}</strong>
              <span>{mission.status}</span>
            </div>
            <div className="mission-progress" style={{ '--progress': `${mission.progress}%` }}>
              <i />
            </div>
          </div>
        ))}
      </div>

      <div className="analysis-summary panel">
        <h3 className="mono text-xs text-muted section-title"><Hexagon size={12}/> 주요 분석 <span className="text-cyan">/ ANALYSIS</span></h3>
        <div className="summary-list mono text-sm">
          <div className="summary-item">
            <span className="text-muted">PRIMARY_SECTOR:</span>
            <span className="text-cyan">{primarySector}</span>
          </div>
          <div className="summary-item">
            <span className="text-muted">DOMINANT_EMOTION:</span>
            <span className="text-amber">{topEmotion}</span>
          </div>
          <div className="summary-diagnosis">
            <Activity size={12} />
            <p>{diagnosis}</p>
          </div>
        </div>
      </div>

      {recentLog && (
        <div className="recent-log panel">
          <h3 className="mono text-xs text-muted section-title"><Radio size={12}/> 최근 탐사 <span className="text-cyan">/ LATEST_LOG</span></h3>
          <div className="summary-list mono text-sm" style={{ marginTop: '12px' }}>
             <div className="summary-item">
               <span className="text-muted">TARGET:</span>
               <span>{recentLog.title}</span>
             </div>
             <div className="summary-item">
               <span className="text-muted">SECTOR:</span>
               <span>{recentLog.type}</span>
             </div>
             <div className="network-impact">
               <CheckCircle2 size={13} />
               <span>LIVE_SIGNAL_NET에 동기화됨. 유사 신호 {recentImpact}개와 교차 감지.</span>
             </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default Profile;
