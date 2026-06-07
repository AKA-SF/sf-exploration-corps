import { getNotionConfig, notionRequest, queryNotionDatabaseAll, sendNotionError } from './_notion.js';
import { clearDurableCache, getDurableCachedJson } from './_persistentCache.js';
import { multiSelect, pick, plainText } from './_notionProperties.js';
import {
  findPropertyName,
  multiSelectProperty,
  readJsonBody,
  richTextProperty,
  selectProperty,
  titleProperty,
} from './_notionWrite.js';

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
  response.setHeader('Cache-Control', request.method === 'GET'
    ? 'public, s-maxage=300, stale-while-revalidate=1200'
    : 'no-store');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { token, databaseId, missing } = getNotionConfig('NOTION_LOG_DATABASE_ID', DEFAULT_LOG_DATABASE_ID);

  if (missing.length > 0) {
    return response.status(503).json({
      logs: [],
      error: 'Notion log environment variables are not configured',
      missing,
    });
  }

  if (request.method === 'POST') {
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      return response.status(error.status || 400).json({ error: error.message || 'Invalid JSON body' });
    }

    const instagramUrl = String(payload.instagramUrl ?? payload.url ?? '').trim();
    const nodeLabel = String(payload.nodeLabel ?? '').trim();
    const nodeEnglish = String(payload.nodeEnglish ?? '').trim();
    const nodeId = String(payload.nodeId ?? '').trim();
    const title = String(payload.workTitle ?? nodeLabel ?? '탐사 좌표 로그').trim();

    if (!instagramUrl || !/^https?:\/\/(www\.)?instagram\.com\//i.test(instagramUrl)) {
      return response.status(400).json({ error: '인스타그램 주소를 입력해주세요.' });
    }

    let database;
    try {
      database = await notionRequest(`/databases/${databaseId}`, { token });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Notion log database request failed',
      });
    }

    const schema = database.properties ?? {};
    const properties = {};

    const titlePropertyName = findPropertyName(schema, ['작품명', '제목', 'Title', 'Name', '이름'], 'title', { loose: true });
    if (titlePropertyName) properties[titlePropertyName] = titleProperty(title);

    const instagramProperty = findPropertyName(schema, ['인스타URL', '인스타 URL', 'Instagram URL', 'URL', '링크', 'Link'], 'url', { loose: true });
    if (instagramProperty) properties[instagramProperty] = { url: instagramUrl };

    const reviewProperty = findPropertyName(schema, ['리뷰문구', '리뷰 문구', 'Review', '본문', '설명', 'Description'], 'rich_text', { loose: true });
    if (reviewProperty) properties[reviewProperty] = richTextProperty(`${nodeLabel || 'SF 탐사 좌표'}에서 수집한 인스타 서평 신호입니다.`);

    const categoryProperty = findPropertyName(schema, ['분류', 'Category', 'Type'], 'select', { loose: true });
    if (categoryProperty) properties[categoryProperty] = selectProperty('탐사 좌표');

    const statusProperty = findPropertyName(schema, ['상태', 'Status'], 'select', { loose: true });
    if (statusProperty) properties[statusProperty] = selectProperty('공개');

    const dateProperty = findPropertyName(schema, ['날짜', 'Date', '작성일'], 'date', { loose: true });
    if (dateProperty) properties[dateProperty] = { date: { start: new Date().toISOString().slice(0, 10) } };

    const tagsProperty = findPropertyName(schema, ['태그', 'Tags', '키워드', 'Keywords'], 'multi_select', { loose: true });
    if (tagsProperty) properties[tagsProperty] = multiSelectProperty(['Coordinate Map', nodeLabel, nodeEnglish, nodeId]);

    let createdPage;
    try {
      createdPage = await notionRequest('/pages', {
        token,
        method: 'POST',
        body: {
          parent: { database_id: databaseId },
          properties,
        },
      });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Notion log create request failed',
      });
    }

    await clearDurableCache(`logs:${databaseId}`);
    return response.status(201).json({
      ok: true,
      id: createdPage.id,
      log: {
        workTitle: title,
        instagramUrl,
        category: '탐사 좌표',
        status: '공개',
        date: new Date().toISOString().slice(0, 10),
      },
    });
  }

  const requestUrl = new URL(request.url ?? '/api/exploration-log', `https://${request.headers.host ?? 'localhost'}`);
  const shouldRefresh = requestUrl.searchParams.get('refresh') === '1';
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
