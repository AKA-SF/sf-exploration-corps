const DEFAULT_NICKNAME = '탐사 대원';
const MAX_NICKNAME_LENGTH = 24;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeNickname(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NICKNAME_LENGTH);
}

export function getUserNickname(user, fallback = DEFAULT_NICKNAME) {
  const metadata = user?.user_metadata ?? {};
  return normalizeNickname(
    metadata.nickname
    || metadata.display_name
    || metadata.name
    || user?.email?.split('@')[0]
    || fallback
  ) || fallback;
}

export function getProfileNickname(user, profile, fallback = DEFAULT_NICKNAME) {
  return normalizeNickname(
    profile?.nickname
    || user?.user_metadata?.nickname
    || user?.user_metadata?.display_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || fallback
  ) || fallback;
}

export async function ensureUserProfile(user, supabase, preferredNickname = '') {
  if (!user || !supabase) return { ok: false, skipped: true };

  const nickname = normalizeNickname(preferredNickname) || getUserNickname(user);
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    nickname,
  }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) return { ok: false, error };
  return { ok: true, nickname };
}
