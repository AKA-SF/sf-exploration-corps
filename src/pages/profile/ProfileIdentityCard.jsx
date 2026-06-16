import { BadgeCheck } from 'lucide-react';
import CrewAvatar from '../../components/CrewAvatar';

export default function ProfileIdentityCard({
  actionSlot,
  nickname,
  rank,
  user,
}) {
  const baseSeed = user?.id || user?.email || nickname;
  const normalizedName = (nickname || '').trim().toLowerCase();
  const avatarSeed = normalizedName === '아카' || normalizedName === 'aka'
    ? `${baseSeed || 'aka'}:crew-avatar-v2`
    : baseSeed;

  return (
    <section className="profile-card panel panel-accent profile-identity-card">
      <CrewAvatar seed={avatarSeed} label={nickname || '탐사 대원'} />
      <div className="agent-id">
        <span className="mono text-muted text-xs">EXPLORER_CALLSIGN</span>
        <h3 className="mono text-cyan">{nickname || '탐사 대원'}</h3>
        <div className="agent-mini-actions">
          <div className="agent-role mono"><BadgeCheck size={12} /><span>{rank.current.title}</span></div>
          {actionSlot && (
            <div className="profile-identity-action">
              {actionSlot}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
