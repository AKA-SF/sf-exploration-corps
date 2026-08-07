import { verifySameOrigin } from './_adminAccess.js';
import { requireAdminAccess } from './_adminAuth.js';
import {
  fetchAladinNewReleases,
  importAladinNewReleaseDrafts,
  isAuthorizedCronRequest,
  normalizeAladinNewReleaseBatch,
} from './_aladinNewReleases.js';

const ALADIN_ENDPOINT = 'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const allowedParams = [
  'Query',
  'QueryType',
  'MaxResults',
  'start',
  'SearchTarget',
  'output',
  'Version',
];

function noStore(response) {
  response.setHeader('Cache-Control', 'private, no-store');
}

function syncLimit(value, fallback) {
  return Math.min(Math.max(Number(pickFirst(value)) || fallback, 1), 50);
}

async function syncNewReleases(limit) {
  const fetchedAt = new Date().toISOString();
  const upstream = await fetchAladinNewReleases({
    apiKey: process.env.ALADIN_TTB_KEY,
    limit,
  });
  const normalized = normalizeAladinNewReleaseBatch(upstream.items, { fetchedAt, limit });
  const imported = await importAladinNewReleaseDrafts({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    drafts: normalized.drafts,
  });
  return {
    ok: true,
    fetchedAt,
    totalResults: upstream.totalResults,
    rejected: normalized.rejected.length,
    ...imported,
  };
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.status(204).end();
    return;
  }

  const isSyncGet = request.method === 'GET' && pickFirst(request.query?.mode) === 'sync-new-releases';
  const isSyncPost = request.method === 'POST' && request.body?.action === 'sync-new-releases';

  if (isSyncGet || isSyncPost) {
    noStore(response);
    if (isSyncGet && !isAuthorizedCronRequest(request, process.env.CRON_SECRET)) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    if (isSyncPost) {
      if (!verifySameOrigin(request)) return response.status(403).json({ error: 'Forbidden' });
      const user = await requireAdminAccess(request, response);
      if (!user) return;
    }
    try {
      const limit = syncLimit(isSyncPost ? request.body?.limit : request.query?.limit, isSyncPost ? 10 : 20);
      return response.status(200).json(await syncNewReleases(limit));
    } catch (error) {
      console.error('Aladin new-release sync failed:', error.message);
      return response.status(503).json({ error: 'Aladin new-release sync is unavailable' });
    }
  }

  if (request.method !== 'GET') {
    noStore(response);
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ALADIN_TTB_KEY;
  if (!apiKey) {
    noStore(response);
    response.status(500).json({ error: 'ALADIN_TTB_KEY is not configured' });
    return;
  }

  const params = new URLSearchParams({
    ttbkey: apiKey,
    QueryType: 'Keyword',
    MaxResults: '25',
    start: '1',
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
  });

  allowedParams.forEach((key) => {
    const value = pickFirst(request.query?.[key]);
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  if (!params.get('Query')) {
    noStore(response);
    response.status(400).json({ error: 'Query is required' });
    return;
  }

  try {
    const upstream = await fetch(`${ALADIN_ENDPOINT}?${params.toString()}`);
    const text = await upstream.text();

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', upstream.ok
      ? 's-maxage=3600, stale-while-revalidate=86400'
      : 'private, no-store');
    response.status(upstream.status).send(text.trim().replace(/;$/, ''));
  } catch {
    noStore(response);
    response.status(502).json({ error: 'Aladin relay failed' });
  }
}
