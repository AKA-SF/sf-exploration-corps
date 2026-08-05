import { getNotionConfig, queryNotionDatabaseAll, sendNotionError } from './_notion.js';
import { getDurableCachedJson } from './_persistentCache.js';
import { requireAuthorizedArchiveRefresh } from './_archiveSyncAuth.js';
import { multiSelect, pick, plainText } from './_notionProperties.js';

const DEFAULT_LOG_DATABASE_ID = '36998dbef69d80dfa4afc27813f25b11';
const LOG_CACHE_TTL_MS = 5 * 60 * 1000;

function mapPageToLog(page, index) {
  const properties = page.properties ?? {};
  const workTitle = plainText(pick(properties, ['작품명', '제목', 'Title', 'Name', '이름']));
  const instagramUrl = plainText(pick(properties, ['인스타URL', '인스타 URL', 'Instagram URL', 'URL', '링크', 'Link']));
  const review = plainText(pick(properties, ['리뷰문구', '리뷰 문구', 'Review', '본문', '설명', 'Description']));
  const category = plainText(pick(properties, ['분류', 'Category', 'Type']));
  const status = plainText(pick(properties, ['상태', 'Status']));
  const date = plainText(pick(properties, ['날짜', 'Date', '작성일']));
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));

  return {
    code: `LOG-${String(index + 1).padStart(3, '0')}`,
    workTitle,
    instagramUrl,
    review,
    category: category || '탐사 로그',
    status,
    date,
    tags: tags.length > 0 ? tags : ['Instagram Review'],
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200');

  const { token, databaseId, missing } = getNotionConfig('NOTION_LOG_DATABASE_ID', DEFAULT_LOG_DATABASE_ID);

  if (missing.length > 0) {
    return response.status(503).json({
      logs: [],
      error: 'Notion log environment variables are not configured',
      missing,
    });
  }

  const requestUrl = new URL(request.url ?? '/api/exploration-log', `https://${request.headers.host ?? 'localhost'}`);
  const shouldRefresh = requestUrl.searchParams.get('refresh') === '1';
  if (shouldRefresh && !requireAuthorizedArchiveRefresh(request, response)) return;
  let cache;
  let logs;
  try {
    const cached = await getDurableCachedJson(`logs:${databaseId}`, LOG_CACHE_TTL_MS, async () => {
      const results = await queryNotionDatabaseAll(token, databaseId);
      return results
        .map(mapPageToLog)
        .filter(log => log.workTitle && log.instagramUrl && (log.status === '' || log.status === '공개'));
    }, { refresh: shouldRefresh });
    cache = cached.cache;
    logs = cached.value;
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion log request failed',
      payload: { logs: [] },
    });
  }

  response.setHeader('X-SF-Archive-Cache', cache);
  return response.status(200).json({ logs });
}
