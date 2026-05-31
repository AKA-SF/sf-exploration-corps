import { BadgeCheck } from 'lucide-react';
import CrewAvatar from '../../components/CrewAvatar';

export default function ProfileIdentityCard({
  actionSlot,
  nickname,
  rank,
  user,
}) {
  return (
    <section className="profile-card panel profile-identity-card">
      <CrewAvatar seed={user?.id || user?.email || nickname} label={nickname || '탐사 대원'} />
      <div className="agent-id">
        <span className="mono text-muted text-xs">EXPLORER_CALLSIGN</span>
        <h3 className="mono text-cyan">{nickname || '탐사 대원'}</h3>
        <div className="agent-role mono"><BadgeCheck size={12} /><span>{rank.current.title}</span></div>
        <p className="agent-lock-note mono">INITIAL CALLSIGN</p>
      </div>
      {actionSlot && (
        <div className="profile-identity-action">
          {actionSlot}
        </div>
      )}
    </section>
  );
}
