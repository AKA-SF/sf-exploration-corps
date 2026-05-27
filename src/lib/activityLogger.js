import { supabase } from './supabaseClient';

export async function recordUserActivity(user, activity) {
  if (!user || !supabase) return { ok: false, skipped: true };

  const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐사자';

  await supabase.from('profiles').upsert({
    id: user.id,
    nickname,
  }, { onConflict: 'id' });

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
