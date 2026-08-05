import { requireAuthorizedArchiveRefresh } from './_archiveSyncAuth.js';
import { buildHomeFeed } from './_homeFeed.js';
import { getDurableCachedJson } from './_persistentCache.js';
import { supabaseRpcRequest } from './_supabaseRest.js';
import { loadConceptsSnapshot } from './concepts.js';
import { loadMediaSnapshot } from './media.js';
import { loadWorksSnapshot } from './works.js';

const HOME_FEED_CACHE_KEY = 'home-feed:v5-source-availability';
const HOME_FEED_TTL_MS = 5 * 60 * 1000;

export function hasUsableArchiveSource(results) {
  return results.some((result, index) => {
    if (index > 2 || result.status !== 'fulfilled') return false;
    const items = index === 0
      ? result.value.works
      : index === 1
        ? result.value.media
        : result.value.concepts;
    return Array.isArray(items) && items.length > 0;
  });
}

export function getHomeFeedSourceStatus(results) {
  const names = ['works', 'media', 'concepts', 'signals', 'discoveries'];
  return Object.fromEntries(names.map((name, index) => [
    name,
    results[index]?.status === 'fulfilled' ? 'available' : 'unavailable',
  ]));
}

async function loadHomeFeedSources({ refresh }) {
  const sources = await Promise.allSettled([
    loadWorksSnapshot({ includeCovers: false, refresh }),
    loadMediaSnapshot({ refresh }),
    loadConceptsSnapshot({ refresh }),
    supabaseRpcRequest('get_visible_exploration_logs', { body: { p_limit: 3 } }),
    supabaseRpcRequest('get_published_sf_discoveries', { body: { p_limit: 3, p_offset: 0 } }),
  ]);
  const [worksResult, mediaResult, conceptsResult, signalsResult, discoveriesResult] = sources;
  if (!hasUsableArchiveSource(sources)) {
    throw new Error('Home feed sources are unavailable');
  }

  const sourceStatus = getHomeFeedSourceStatus(sources);
  return buildHomeFeed({
    concepts: conceptsResult.status === 'fulfilled' ? conceptsResult.value.concepts : [],
    discoveries: discoveriesResult.status === 'fulfilled' ? discoveriesResult.value : [],
    discoveriesUnavailable: discoveriesResult.status !== 'fulfilled',
    logs: signalsResult.status === 'fulfilled' ? signalsResult.value : [],
    media: mediaResult.status === 'fulfilled' ? mediaResult.value.media : [],
    questions: [],
    sourceStatus,
    syncedAt: new Date().toISOString(),
    works: worksResult.status === 'fulfilled' ? worksResult.value.works : [],
  });
}

export function loadHomeFeedSnapshot({ refresh = false } = {}) {
  return getDurableCachedJson(
    HOME_FEED_CACHE_KEY,
    HOME_FEED_TTL_MS,
    () => loadHomeFeedSources({ refresh }),
    { preferStale: false, refresh },
  );
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const requestUrl = new URL(request.url ?? '/api/home-feed', 'https://sf-explorer.net');
  const refresh = requestUrl.searchParams.get('refresh') === '1';
  if (refresh && !requireAuthorizedArchiveRefresh(request, response)) return;

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

  try {
    const snapshot = await loadHomeFeedSnapshot({ refresh });
    response.setHeader('X-SF-Archive-Cache', snapshot.cache);
    return response.status(200).json(snapshot.value);
  } catch (error) {
    return response.status(503).json({
      error: 'Home feed is temporarily unavailable',
      message: error.message,
    });
  }
}