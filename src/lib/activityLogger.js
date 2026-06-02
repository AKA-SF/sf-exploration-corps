import { getSupabaseClient } from './getSupabaseClient';
import { ensureUserProfile, getUserNickname } from './userIdentity';

export async function recordUserActivity(user, activity) {
  const supabase = await getSupabaseClient();
  if (!user || !supabase) return { ok: false, skipped: true };

  const nickname = getUserNickname(user, '탐사자');
  const dedupeKey = activity.dedupeKey || activity.metadata?.dedupe_key || '';
  const metadata = {
    ...(activity.metadata ?? {}),
    ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
  };

  await ensureUserProfile(user, supabase, nickname);

  if (dedupeKey) {
    const { data: existing, error: lookupError } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('action_type', activity.actionType)
      .contains('metadata', { dedupe_key: dedupeKey })
      .limit(1);

    if (lookupError) return { ok: false, error: lookupError };
    if (existing?.length) return { ok: true, skipped: true };
  }

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    action_type: activity.actionType,
    points: activity.points,
    genre: activity.genre ?? null,
    metadata,
  });

  if (error) return { ok: false, error };
  return { ok: true };
}

export async function recordDailyLoginBonus(user) {
  const supabase = await getSupabaseClient();
  if (!user || !supabase) return { ok: false, skipped: true };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('action_type', 'daily_login')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString())
    .limit(1);

  if (error) return { ok: false, error };
  if (data?.length) return { ok: true, skipped: true };

  return recordUserActivity(user, {
    actionType: 'daily_login',
    points: 5,
    genre: '로그인 보너스',
    metadata: {
      title: '일일 접속 보너스',
      node: 'crew-authentication',
      local_date: todayStart.toLocaleDateString('sv-SE'),
    },
  });
}
