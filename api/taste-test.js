import { requireAuthenticatedUser } from './_adminAuth.js';
import { supabaseRestRequest } from './_supabaseRest.js';

const TASTE_POINTS = 10;

function sanitizeText(value, maxLength = 200) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function getUserAuthorName(user) {
  const metadata = user?.user_metadata ?? {};
  return sanitizeText(
    metadata.nickname
      || metadata.display_name
      || metadata.name
      || user?.email?.split('@')[0]
      || '탐사 대원',
    24,
  ) || '탐사 대원';
}

async function ensureProfile(user) {
  await supabaseRestRequest('profiles?on_conflict=id', {
    body: {
      id: user.id,
      nickname: getUserAuthorName(user),
    },
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    service: true,
  });
}

async function findExistingTasteActivity(userId, dedupeKey) {
  if (!dedupeKey) return null;

  const params = new URLSearchParams();
  params.set('select', 'id');
  params.set('user_id', `eq.${userId}`);
  params.set('action_type', 'eq.taste_test');
  params.set('metadata', `cs.${JSON.stringify({ dedupe_key: dedupeKey })}`);
  params.set('limit', '1');

  const rows = await supabaseRestRequest(`activity_logs?${params.toString()}`, { service: true });
  return rows?.[0] ?? null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  let body = request.body ?? {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const tasteCode = sanitizeText(metadata.taste_code || body.tasteCode, 40);
  const tasteTitle = sanitizeText(metadata.taste_title || body.tasteTitle, 120);
  const genre = sanitizeText(body.genre || metadata.genre || 'SF 성향 테스트', 120);
  const dedupeKey = sanitizeText(body.dedupeKey || metadata.dedupe_key || (tasteCode ? `taste:${tasteCode}` : ''), 120);

  if (!tasteCode || !tasteTitle) {
    response.status(400).json({ error: '테스트 결과 정보가 부족합니다.' });
    return;
  }

  try {
    await ensureProfile(user);

    const existing = await findExistingTasteActivity(user.id, dedupeKey);
    if (existing) {
      response.status(200).json({ ok: true, skipped: true, activityId: existing.id });
      return;
    }

    const rows = await supabaseRestRequest('activity_logs', {
      body: {
        action_type: 'taste_test',
        genre,
        metadata: {
          ...metadata,
          dedupe_key: dedupeKey,
          node: metadata.node || 'taste-test',
          title: metadata.title || '나의 SF 성향 테스트 완료',
        },
        points: Number.isFinite(Number(body.points)) ? Number(body.points) : TASTE_POINTS,
        user_id: user.id,
      },
      method: 'POST',
      prefer: 'return=representation',
      service: true,
    });

    response.status(201).json({ ok: true, activity: rows?.[0] ?? null });
  } catch (error) {
    response.status(error.status || 500).json({
      details: error.details,
      error: error.message || '테스트 결과 저장에 실패했습니다.',
    });
  }
}
