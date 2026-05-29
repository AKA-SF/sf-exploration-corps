import { BadgeCheck } from 'lucide-react';
import CrewAvatar from '../../components/CrewAvatar';

export default function ProfileIdentityCard({
  nickname,
  onNicknameChange,
  onSaveNickname,
  rank,
  status,
  user,
}) {
  return (
    <section className="profile-card panel profile-identity-card">
      <CrewAvatar seed={user?.id || user?.email || nickname} label={nickname || '탐사 대원'} />
      <div className="agent-id">
        <span className="mono text-muted text-xs">EXPLORER_CALLSIGN</span>
        <h3 className="mono text-cyan">{nickname || '탐사 대원'}</h3>
        <div className="agent-role mono"><BadgeCheck size={12} /><span>{rank.current.title}</span></div>
      </div>
      <form className="profile-nickname-form" onSubmit={onSaveNickname}>
        <label>
          <span className="mono text-muted text-xs">닉네임</span>
          <input onChange={event => onNicknameChange(event.target.value)} value={nickname} />
        </label>
        <button disabled={status === 'saving'} type="submit">저장</button>
      </form>
    </section>
  );
}
