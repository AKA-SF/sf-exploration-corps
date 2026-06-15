import { getSupabaseClient } from './getSupabaseClient';
import { ensureUserProfile, getUserNickname } from './userIdentity';

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function fetchJsonWithTimeout(path, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'Request failed');
    }
    return payload;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function recordTasteTestActivity(supabase, user, activity, metadata, dedupeKey) {
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    5000,
    '로그인 세션 확인 시간이 너무 오래 걸립니다.',
  );

  if (error) return { ok: false, error };
  const token = data?.session?.access_token;
  if (!token) {
    return { ok: false, error: new Error('로그인 세션을 찾지 못했습니다. 다시 로그인해주세요.') };
  }

  try {
    const payload = await fetchJsonWithTimeout('/api/taste-test', {
      body: JSON.stringify({
        dedupeKey,
        genre: activity.genre ?? null,
        metadata,
        points: activity.points,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    return { ok: true, skipped: Boolean(payload.skipped) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function recordUserActivity(user, activity) {
  const supabase = await getSupabaseClient();
  if (!user || !supabase) return { ok: false, skipped: true };

  const nickname = getUserNickname(user, '탐사자');
  const dedupeKey = activity.dedupeKey || activity.metadata?.dedupe_key || '';
  const metadata = {
    ...(activity.metadata ?? {}),
    ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
  };

  if (activity.actionType === 'taste_test') {
    const tasteResult = await recordTasteTestActivity(supabase, user, activity, metadata, dedupeKey);
    if (tasteResult.ok) return tasteResult;
    metadata.server_save_error = tasteResult.error?.message || 'taste-test api failed';
  }

  await withTimeout(
    ensureUserProfile(user, supabase, nickname),
    8000,
    '프로필 확인 시간이 너무 오래 걸립니다.',
  );

  if (dedupeKey) {
    const { data: existing, error: lookupError } = await withTimeout(
      supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('action_type', activity.actionType)
        .contains('metadata', { dedupe_key: dedupeKey })
        .limit(1),
      8000,
      '중복 기록 확인 시간이 너무 오래 걸립니다.',
    );

    // If the duplicate check fails, still record the activity. This keeps
    // mission-critical actions such as taste-test completion from being blocked
    // by a JSONB filter issue or an older Supabase schema.
    if (lookupError) {
      metadata.dedupe_lookup_error = lookupError.message;
    }
    if (existing?.length) return { ok: true, skipped: true };
  }

  const { error } = await withTimeout(
    supabase.from('activity_logs').insert({
      user_id: user.id,
      action_type: activity.actionType,
      points: activity.points,
      genre: activity.genre ?? null,
      metadata,
    }),
    9000,
    '활동 기록 저장 시간이 너무 오래 걸립니다.',
  );

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
