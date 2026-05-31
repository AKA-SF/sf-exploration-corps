import {
  getNotionConfig,
  queryNotionDatabaseAll,
  sendNotionError,
} from './_notion.js';
import { readJsonBody } from './_notionWrite.js';
import { getCachedAladinCover, mapWithConcurrency } from './_worksAladin.js';
import { createNotionWork, mapPageToWork, splitTags } from './_worksNotion.js';

const WORKS_CACHE_TTL_MS = 10 * 60 * 1000;

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

async function getWorksWithoutCovers(token, databaseId, shouldRefresh = false) {
  if (!shouldRefresh && apiCache.worksWithoutCovers && apiCache.worksWithoutCoversExpiresAt > Date.now()) {
    return { works: apiCache.worksWithoutCovers, cache: 'HIT' };
  }

  if (!shouldRefresh && apiCache.pendingWorksWithoutCovers) {
    return { works: await apiCache.pendingWorksWithoutCovers, cache: 'PENDING' };
  }

  const promise = queryNotionDatabaseAll(token, databaseId)
    .then(results => results
      .map(mapPageToWork)
      .filter(work => work.title)
      .map((work, index) => ({
        ...work,
        code: work.code.startsWith('SFA-') ? `SFA-${String(index + 1).padStart(3, '0')}` : work.code,
        cover: '',
      })))
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

async function getWorksWithCovers(token, databaseId, aladinApiKey, shouldRefresh = false) {
  if (!shouldRefresh && apiCache.worksWithCovers && apiCache.worksWithCoversExpiresAt > Date.now()) {
    return { works: apiCache.worksWithCovers, cache: 'HIT' };
  }

  if (!shouldRefresh && apiCache.pendingWorksWithCovers) {
    return { works: await apiCache.pendingWorksWithCovers, cache: 'PENDING' };
  }

  const promise = getWorksWithoutCovers(token, databaseId, shouldRefresh)
    .then(({ works }) => mapWithConcurrency(works, 4, async work => ({
      ...work,
      cover: await getCachedAladinCover(work, aladinApiKey),
    })))
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
  response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { token, databaseId, missing } = getNotionConfig('NOTION_WORKS_DATABASE_ID');
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
    let body;
    try {
      body = await readJsonBody(request);
    } catch {
      return response.status(400).json({ error: 'Invalid JSON body' });
    }

    if (!String(body.title ?? '').trim()) {
      return response.status(400).json({ error: '작품 제목을 입력해주세요.' });
    }

    try {
      const page = await createNotionWork(token, databaseId, body);
      clearWorksCache();
      return response.status(201).json({
        ok: true,
        pageId: page.id,
        work: {
          code: 'NEW',
          medium: body.category || '소설',
          title: body.title,
          subtitle: [body.author, body.publisher].filter(Boolean).join(' / ') || '새로 저장된 작품 신호',
          link: body.link || '',
          recommender: body.recommender || '',
          tags: splitTags(body.tags),
          cover: '',
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
      ? await getWorksWithCovers(token, databaseId, aladinApiKey, shouldRefresh)
      : await getWorksWithoutCovers(token, databaseId, shouldRefresh);
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
