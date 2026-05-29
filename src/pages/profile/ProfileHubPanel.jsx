export default function ProfileHubPanel({
  dailyLoginReceived,
  nextMission,
  points,
  rank,
  unlockedBadges,
  workStatuses,
}) {
  return (
    <section className="profile-hub-panel panel">
      <div className="profile-hub-main">
        <span className="mono text-muted text-xs">TODAY'S HUB</span>
        <h3 className="mono">오늘의 탐사 상태</h3>
        <p>{dailyLoginReceived ? '+5 MP 접속 보너스 수신 완료' : '접속 보너스 확인 중'}</p>
      </div>
      <div className="profile-hub-grid">
        <article className="profile-hub-item">
          <span className="mono">NEXT LEVEL</span>
          <strong>{rank.next ? `${rank.next.title}까지 ${rank.next.min - points} MP` : '최종 등급 도달'}</strong>
        </article>
        <article className="profile-hub-item">
          <span className="mono">NEXT MISSION</span>
          <strong>{nextMission?.title ?? '모든 기본 임무 완료'}</strong>
        </article>
        <article className="profile-hub-item">
          <span className="mono">REP BADGE</span>
          <strong>{unlockedBadges[0]?.title ?? '첫 배지 대기 중'}</strong>
        </article>
        <article className="profile-hub-item">
          <span className="mono">READING LOG</span>
          <strong>{workStatuses.length} 작품 저장</strong>
        </article>
      </div>
    </section>
  );
}
