import { CheckCircle2, GitBranch, LockKeyhole } from 'lucide-react';

export default function ProfileMissionTree({ missionTree, onChooseRoute }) {
  return (
    <section className="mission-tree-panel panel">
      <div className="mission-tree-header">
        <div>
          <span className="mono text-muted text-xs">MISSION TREE</span>
          <h3 className="mono">대원 임무 트리</h3>
          <p>기본 훈련을 완료하면 정식 대원 임무 카드와 분기 루트가 해금됩니다.</p>
        </div>
        <strong className={`mono mission-unlock-badge ${missionTree.trainingComplete ? 'is-unlocked' : ''}`}>
          {missionTree.trainingComplete ? 'FORMAL CREW UNLOCKED' : 'BASIC TRAINING'}
        </strong>
      </div>

      <div className="mission-training-grid">
        {missionTree.training.map(mission => (
          <article className={`mission-node ${mission.complete ? 'is-complete' : ''}`} key={mission.id}>
            <div className="mission-node-icon">
              {mission.complete ? <CheckCircle2 aria-hidden="true" /> : <span />}
            </div>
            <div>
              <strong>{mission.title}</strong>
              <p>{mission.description}</p>
              <em className="mono">{Math.min(mission.value, mission.target)} / {mission.target}</em>
              <div className="mission-progress" style={{ '--progress': `${mission.progress}%` }}><i /></div>
            </div>
          </article>
        ))}
      </div>

      <div className={`mission-route-grid ${missionTree.trainingComplete ? 'is-unlocked' : 'is-locked'}`}>
        {missionTree.routes.map(route => (
          <article className={`mission-route-card ${route.selected ? 'is-selected' : ''}`} key={route.id}>
            <div className="mission-route-top">
              <GitBranch aria-hidden="true" />
              <span className="mono">{route.unlocked ? 'ROUTE AVAILABLE' : 'LOCKED ROUTE'}</span>
            </div>
            <h4 className="mono">{route.title}</h4>
            <strong>{route.subtitle}</strong>
            <p>{route.description}</p>
            <div className="mission-route-list">
              {route.missions.map(mission => (
                <div className={`mission-route-step ${mission.complete ? 'is-complete' : ''} ${mission.locked ? 'is-locked' : ''}`} key={mission.id}>
                  <span className="mono">{mission.locked ? <LockKeyhole size={12} aria-hidden="true" /> : `${Math.min(mission.value, mission.target)}/${mission.target}`}</span>
                  <strong>{mission.title}</strong>
                  <div className="mission-progress" style={{ '--progress': `${mission.progress}%` }}><i /></div>
                </div>
              ))}
            </div>
            <button
              disabled={!route.unlocked}
              onClick={() => onChooseRoute(route.id)}
              type="button"
            >
              {route.selected ? '선택된 루트' : route.unlocked ? '이 루트 선택' : '기본 훈련 필요'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
