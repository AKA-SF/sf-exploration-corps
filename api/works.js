import {
  getNotionConfig,
  queryNotionDatabaseAll,
  sendNotionError,
} from './_notion.js';
import { readJsonBody } from './_notionWrite.js';
import { clearDurableCachePrefix, getDurableCachedJson } from './_persistentCache.js';
import { requireAuthenticatedUser } from './_adminAuth.js';
import { getCachedAladinCover, mapWithConcurrency } from './_worksAladin.js';
import { createNotionWork, mapPageToWork, splitTags } from './_worksNotion.js';

const WORKS_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MEDIA_WORKS_DATABASE_ID = '38298dbef69d80e49ddce149564394b7';
const WORKS_CACHE_VERSION = 'v3-media-works';

const apiCache = globalThis.__sfWorksApiCache ??= {
  worksWithoutCovers: null,
  worksWithoutCoversExpiresAt: 0,
  worksWithCovers: null,
  worksWithCoversExpiresAt: 0,
  pendingWorksWithoutCovers: null,
  pendingWorksWithCovers: null,
};

function clearWorksCache() {
  apiCache.worksWithoutCovers = null;
  apiCache.worksWithoutCoversExpiresAt = 0;
  apiCache.worksWithCovers = null;
  apiCache.worksWithCoversExpiresAt = 0;
  apiCache.pendingWorksWithoutCovers = null;
  apiCache.pendingWorksWithCovers = null;
}

function getWorkCategorySlug(value = '') {
  const normalized = String(value).replace(/\s/g, '').toLowerCase();
  if (normalized.includes('애니') || normalized.includes('animation') || normalized.includes('anime')) return 'animation';
  if (normalized.includes('게임') || normalized.includes('game')) return 'games';
  if (
    normalized.includes('영화')
    || normalized.includes('cinema')
    || normalized.includes('film')
    || normalized.includes('movie')
  ) return 'cinema';
  return 'novels';
}

function normalizeMediaMedium(work) {
  const source = `${work.medium ?? ''} ${work.category ?? ''}`;
  const slug = getWorkCategorySlug(source);
  if (slug === 'animation') return '애니메이션';
  if (slug === 'games') return '게임';
  if (slug === 'cinema') return '영화';
  return work.medium || work.category || '영화';
}

async function queryMediaWorks(token, databaseId) {
  if (!databaseId) return [];

  try {
    return await queryNotionDatabaseAll(token, databaseId);
  } catch {
    return [];
  }
}

async function fetchWorksFromNotion(token, databaseId, mediaWorksDatabaseId) {
  const [bookResults, mediaResults] = await Promise.all([
    queryNotionDatabaseAll(token, databaseId),
    queryMediaWorks(token, mediaWorksDatabaseId),
  ]);

  const bookWorks = bookResults
    .map((page, index) => mapPageToWork(page, index, {
      codePrefix: 'SFA',
      defaultMedium: '소설',
      source: 'books',
    }))
    .filter(work => work.title)
    .map((work, index) => ({
      ...work,
      code: work.code.startsWith('SFA-') ? `SFA-${String(index + 1).padStart(3, '0')}` : work.code,
      cover: '',
      source: 'books',
    }));

  const mediaWorks = mediaResults
    .map((page, index) => mapPageToWork(page, index, {
      codePrefix: 'SFM',
      defaultMedium: '영화',
      source: 'media-works',
    }))
    .filter(work => work.title)
    .map((work, index) => ({
      ...work,
      code: /^SF[AM]-/.test(work.code) ? `SFM-${String(index + 1).padStart(3, '0')}` : work.code,
      medium: normalizeMediaMedium(work),
      source: 'media-works',
    }));

  return [...bookWorks, ...mediaWorks];
}

async function getWorksWithoutCovers(token, databaseId, mediaWorksDatabaseId, shouldRefresh = false) {
  const durableKey = `works:${databaseId}:${mediaWorksDatabaseId || 'no-media'}:base:${WORKS_CACHE_VERSION}`;
  if (!shouldRefresh) {
    const durable = await getDurableCachedJson(durableKey, WORKS_CACHE_TTL_MS, async () => {
      return fetchWorksFromNotion(token, databaseId, mediaWorksDatabaseId);
    });
    apiCache.worksWithoutCovers = durable.value;
    apiCache.worksWithoutCoversExpiresAt = Date.now() + WORKS_CACHE_TTL_MS;
    return { works: durable.value, cache: durable.cache };
  }

  if (!shouldRefresh && apiCache.worksWithoutCovers && apiCache.worksWithoutCoversExpiresAt > Date.now()) {
    return { works: apiCache.worksWithoutCovers, cache: 'HIT' };
  }

  if (!shouldRefresh && apiCache.pendingWorksWithoutCovers) {
    return { works: await apiCache.pendingWorksWithoutCovers, cache: 'PENDING' };
  }

  const promise = getDurableCachedJson(durableKey, WORKS_CACHE_TTL_MS, async () => {
    return fetchWorksFromNotion(token, databaseId, mediaWorksDatabaseId);
  }, { refresh: shouldRefresh })
    .then(({ value }) => value)
    .then(works => {
      apiCache.worksWithoutCovers = works;
      apiCache.worksWithoutCoversExpiresAt = Date.now() + WORKS_CACHE_TTL_MS;
      return works;
    })
    .finally(() => {
      apiCache.pendingWorksWithoutCovers = null;
    });

  apiCache.pendingWorksWithoutCovers = promise;
  return { works: await promise, cache: 'MISS' };
}

async function getWorksWithCovers(token, databaseId, mediaWorksDatabaseId, aladinApiKey, shouldRefresh = false) {
  const durableKey = `works:${databaseId}:${mediaWorksDatabaseId || 'no-media'}:covers:${aladinApiKey ? 'enabled' : 'disabled'}:${WORKS_CACHE_VERSION}`;
  if (!shouldRefresh) {
    const durable = await getDurableCachedJson(durableKey, WORKS_CACHE_TTL_MS, async () => {
      const { works } = await getWorksWithoutCovers(token, databaseId, mediaWorksDatabaseId, shouldRefresh);
      return mapWithConcurrency(works, 4, async work => ({
        ...work,
        cover: work.cover || (work.source === 'books' ? await getCachedAladinCover(work, aladinApiKey) : ''),
      }));
    });
    apiCache.worksWithCovers = durable.value;
    apiCache.worksWithCoversExpiresAt = Date.now() + WORKS_CACHE_TTL_MS;
    return { works: durable.value, cache: durable.cache };
  }

  if (!shouldRefresh && apiCache.worksWithCovers && apiCache.worksWithCoversExpiresAt > Date.now()) {
    return { works: apiCache.worksWithCovers, cache: 'HIT' };
  }

  if (!shouldRefresh && apiCache.pendingWorksWithCovers) {
    return { works: await apiCache.pendingWorksWithCovers, cache: 'PENDING' };
  }

  const promise = getDurableCachedJson(durableKey, WORKS_CACHE_TTL_MS, async () => {
    const { works } = await getWorksWithoutCovers(token, databaseId, mediaWorksDatabaseId, shouldRefresh);
    return mapWithConcurrency(works, 4, async work => ({
      ...work,
      cover: work.cover || (work.source === 'books' ? await getCachedAladinCover(work, aladinApiKey) : ''),
    }));
  }, { refresh: shouldRefresh })
    .then(({ value }) => value)
    .then(works => {
      apiCache.worksWithCovers = works;
      apiCache.worksWithCoversExpiresAt = Date.now() + WORKS_CACHE_TTL_MS;
      return works;
    })
    .finally(() => {
      apiCache.pendingWorksWithCovers = null;
    });

  apiCache.pendingWorksWithCovers = promise;
  return { works: await promise, cache: 'MISS' };
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  response.setHeader(
    'Cache-Control',
    request.method === 'POST' ? 'no-store' : 'public, s-maxage=600, stale-while-revalidate=3600',
  );

  const { token, databaseId, missing } = getNotionConfig('NOTION_WORKS_DATABASE_ID');
  const {
    databaseId: mediaWorksDatabaseId,
  } = getNotionConfig('NOTION_MEDIA_WORKS_DATABASE_ID', DEFAULT_MEDIA_WORKS_DATABASE_ID);
  const aladinApiKey = process.env.ALADIN_TTB_KEY || process.env.VITE_ALADIN_TTB_KEY;
  const requestUrl = new URL(request.url ?? '/api/works', `https://${request.headers.host ?? 'localhost'}`);
  const shouldRefresh = requestUrl.searchParams.get('refresh') === '1';
  const shouldIncludeCovers = requestUrl.searchParams.get('covers') !== '0';

  if (missing.length > 0) {
    return response.status(503).json({
      works: [],
      error: 'Notion environment variables are not configured',
      missing,
    });
  }

  if (request.method === 'POST') {
    const user = await requireAuthenticatedUser(request, response);
    if (!user) return;

    let body;
    try {
      body = await readJsonBody(request);
    } catch (error) {
      return response.status(error.status || 400).json({ error: error.message || 'Invalid JSON body' });
    }

    if (!String(body.title ?? '').trim()) {
      return response.status(400).json({ error: '작품 제목을 입력해주세요.' });
    }

    try {
      const categorySlug = getWorkCategorySlug(body.category);
      const targetDatabaseId = categorySlug === 'novels' ? databaseId : mediaWorksDatabaseId;
      const page = await createNotionWork(token, targetDatabaseId, body);
      clearWorksCache();
      await clearDurableCachePrefix(`works:${databaseId}:`);
      return response.status(201).json({
        ok: true,
        pageId: page.id,
        work: {
          code: categorySlug === 'novels' ? 'NEW' : 'SFM-NEW',
          medium: body.category || '소설',
          title: body.title,
          subtitle: body.description || [body.author, body.publisher, body.year].filter(Boolean).join(' / ') || '새로 저장된 작품 신호',
          link: body.link || '',
          recommender: body.recommender || '',
          tags: splitTags(body.tags),
          cover: body.image || '',
          source: categorySlug === 'novels' ? 'books' : 'media-works',
        },
      });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Notion work create failed',
      });
    }
  }

  try {
    const { works, cache } = shouldIncludeCovers
      ? await getWorksWithCovers(token, databaseId, mediaWorksDatabaseId, aladinApiKey, shouldRefresh)
      : await getWorksWithoutCovers(token, databaseId, mediaWorksDatabaseId, shouldRefresh);
    response.setHeader('X-SF-Archive-Cache', cache);
    response.setHeader('X-SF-Archive-Covers', shouldIncludeCovers ? '1' : '0');
    return response.status(200).json({ works });
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion request failed',
      payload: { works: [] },
    });
  }
}
