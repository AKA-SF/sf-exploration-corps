import { supabase } from './supabaseClient';

export async function recordUserActivity(user, activity) {
  if (!user || !supabase) return { ok: false, skipped: true };

  const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐사자';

  await supabase.from('profiles').upsert({
    id: user.id,
    nickname,
  }, { onConflict: 'id', ignoreDuplicates: true });

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    action_type: activity.actionType,
    points: activity.points,
    genre: activity.genre ?? null,
    metadata: activity.metadata ?? {},
  });

  if (error) return { ok: false, error };
  return { ok: true };
}

export async function recordDailyLoginBonus(user) {
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
