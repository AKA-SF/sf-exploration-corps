import {
  getNotionConfig,
  notionRequest,
  queryNotionDatabaseAll,
  sendNotionError,
} from './_notion.js';

const ALADIN_LOOKUP_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const ALADIN_SEARCH_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';
const WORKS_CACHE_TTL_MS = 10 * 60 * 1000;
const COVER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_COVER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const apiCache = globalThis.__sfWorksApiCache ??= {
  works: null,
  worksExpiresAt: 0,
  coverCache: new Map(),
  pendingCovers: new Map(),
};

function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
  if (value.type === 'multi_select') return value.multi_select.map(tag => tag.name).join(', ');
  if (value.type === 'number') return String(value.number ?? '');
  if (value.type === 'url') return value.url ?? '';
  return '';
}

function multiSelect(value) {
  if (!value || value.type !== 'multi_select') return [];
  return value.multi_select.map(tag => tag.name);
}

function pick(properties, names) {
  return names.map(name => properties[name]).find(Boolean);
}

function pickName(properties, names) {
  return names.find(name => properties[name]);
}

function getAladinItemId(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    return url.searchParams.get('ItemId')
      ?? url.searchParams.get('itemId')
      ?? url.searchParams.get('itemid')
      ?? url.searchParams.get('ItemID')
      ?? url.pathname.match(/\/(\d+)(?:\D*)$/)?.[1]
      ?? '';
  } catch {
    return link.match(/itemid=(\d+)/i)?.[1] ?? link.match(/ItemId=(\d+)/i)?.[1] ?? link.match(/\/(\d+)(?:\D*)$/)?.[1] ?? '';
  }
}

function normalizeCoverUrl(cover) {
  return cover ? cover.replace('coversum', 'cover200') : '';
}

function getCoverCacheKey(work) {
  return [
    getAladinItemId(work.link),
    work.link,
    work.title,
    work.subtitle,
  ].filter(Boolean).join('|').toLowerCase();
}

function getPrimaryAuthor(subtitle = '') {
  return subtitle
    .split(' / ')[0]
    ?.split(',')
    ?.map(part => part.trim())
    ?.filter(Boolean)?.[0] ?? '';
}

async function resolveAladinLink(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    if (!/aladin\.(kr|co\.kr)$/i.test(url.hostname.replace(/^www\./, ''))) return link;

    const upstream = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 SF Exploration Archive Cover Resolver',
      },
    });

    return upstream.url || link;
  } catch {
    return link;
  }
}

async function readAladinJson(endpoint, params) {
  const upstream = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 SF Exploration Archive',
    },
  });
  if (!upstream.ok) return null;
  const text = await upstream.text();
  return JSON.parse(text.trim().replace(/;$/, ''));
}

function scoreAladinMatch(item, work) {
  const title = work.title?.replace(/\s/g, '').toLowerCase() ?? '';
  const itemTitle = item.title?.replace(/\s/g, '').toLowerCase() ?? '';
  const author = getPrimaryAuthor(work.subtitle).toLowerCase();
  const itemAuthor = item.author?.toLowerCase() ?? '';
  const publisher = work.subtitle?.split(' / ')?.[1]?.toLowerCase() ?? '';
  const itemPublisher = item.publisher?.toLowerCase() ?? '';

  let score = 0;
  if (itemTitle === title) score += 80;
  else if (itemTitle.includes(title) || title.includes(itemTitle)) score += 45;
  if (author && (itemAuthor.includes(author) || author.includes(itemAuthor.split(',')[0]?.trim() ?? ''))) score += 30;
  if (publisher && itemPublisher.includes(publisher)) score += 12;
  return score;
}

async function searchAladinCover(work, apiKey, query, queryType = 'Title') {
  if (!query) return '';

  const searchParams = new URLSearchParams({
    ttbkey: apiKey,
    Query: query,
    QueryType: queryType,
    MaxResults: '10',
    start: '1',
    SearchTarget: 'Book',
    Cover: 'Big',
    output: 'js',
    Version: '20131101',
  });

  try {
    const data = await readAladinJson(ALADIN_SEARCH_ENDPOINT, searchParams);
    const items = data?.item ?? [];
    const matched = [...items]
      .sort((a, b) => scoreAladinMatch(b, work) - scoreAladinMatch(a, work))[0];
    return normalizeCoverUrl(matched?.cover);
  } catch {
    return '';
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchAladinCover(work, apiKey) {
  const { link, title, subtitle } = work;
  if (!apiKey) return '';
  const resolvedLink = await resolveAladinLink(link);
  const itemId = getAladinItemId(link) || getAladinItemId(resolvedLink);

  if (itemId) {
    const params = new URLSearchParams({
      ttbkey: apiKey,
      ItemId: itemId,
      ItemIdType: 'ItemId',
      Cover: 'Big',
      output: 'js',
      Version: '20131101',
    });

    try {
      const data = await readAladinJson(ALADIN_LOOKUP_ENDPOINT, params);
      const cover = normalizeCoverUrl(data.item?.[0]?.cover);
      if (cover) return cover;
    } catch {
      // Fall through to title search below.
    }
  }

  if (!title || !apiKey) return '';

  const author = getPrimaryAuthor(subtitle);
  return await searchAladinCover(work, apiKey, title, 'Title')
    || await searchAladinCover(work, apiKey, [title, author].filter(Boolean).join(' '), 'Keyword')
    || await searchAladinCover(work, apiKey, title, 'Keyword');
}

async function getCachedAladinCover(work, apiKey) {
  if (!apiKey) return '';

  const cacheKey = getCoverCacheKey(work);
  const cached = apiCache.coverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.cover;

  if (apiCache.pendingCovers.has(cacheKey)) {
    return apiCache.pendingCovers.get(cacheKey);
  }

  const promise = fetchAladinCover(work, apiKey)
    .then(cover => {
      apiCache.coverCache.set(cacheKey, {
        cover,
        expiresAt: Date.now() + (cover ? COVER_CACHE_TTL_MS : EMPTY_COVER_CACHE_TTL_MS),
      });
      return cover;
    })
    .finally(() => {
      apiCache.pendingCovers.delete(cacheKey);
    });

  apiCache.pendingCovers.set(cacheKey, promise);
  return promise;
}

function mapPageToWork(page, index) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['제목', '작품명', 'Title', 'Name', '이름']));
  const author = plainText(pick(properties, ['저자', 'Author', 'Creator']));
  const publisher = plainText(pick(properties, ['출판사', 'Publisher', 'Studio']));
  const medium = plainText(pick(properties, ['매체', '카테고리', 'Medium', 'Type', '분류']));
  const subtitle = plainText(pick(properties, ['설명', '메모', 'Subtitle', 'Description']));
  const code = plainText(pick(properties, ['코드', 'Code', 'Archive Code'])) || `SFA-${String(index + 1).padStart(3, '0')}`;
  const link = plainText(pick(properties, ['링크', 'Link', 'URL', 'Url']));
  const recommender = plainText(pick(properties, ['추천자', 'Recommender', '추천']));
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));
  const description = subtitle || [author, publisher].filter(Boolean).join(' / ');

  return {
    code,
    medium: medium || 'ARCHIVE',
    title,
    subtitle: description || '노션 작품 아카이브에서 동기화된 신호',
    link,
    recommender,
    tags: tags.length > 0 ? tags : ['Notion Sync'],
  };
}

function richTextValue(text) {
  return text ? [{ type: 'text', text: { content: String(text).slice(0, 2000) } }] : [];
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map(tag => String(tag).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function notionPropertyValue(schema, value, fallbackType = 'rich_text') {
  const type = schema?.type ?? fallbackType;
  if (type === 'title') return { title: richTextValue(value) };
  if (type === 'rich_text') return { rich_text: richTextValue(value) };
  if (type === 'url') return { url: value || null };
  if (type === 'select') return { select: value ? { name: String(value) } : null };
  if (type === 'multi_select') return { multi_select: splitTags(value).map(name => ({ name })) };
  if (type === 'number') {
    const number = Number(value);
    return { number: Number.isFinite(number) ? number : null };
  }
  return { rich_text: richTextValue(value) };
}

function assignNotionProperty(properties, databaseProperties, names, value, fallbackType) {
  const propertyName = pickName(databaseProperties, names);
  if (!propertyName) return;
  properties[propertyName] = notionPropertyValue(databaseProperties[propertyName], value, fallbackType);
}

async function getNotionDatabase(token, databaseId) {
  return notionRequest(`/databases/${databaseId}`, { token });
}

async function createNotionWork(token, databaseId, body) {
  const database = await getNotionDatabase(token, databaseId);
  const databaseProperties = database.properties ?? {};
  const properties = {};
  const title = String(body.title ?? '').trim();
  const author = String(body.author ?? '').trim();
  const publisher = String(body.publisher ?? '').trim();
  const category = String(body.category ?? '소설').trim();
  const link = String(body.link ?? '').trim();
  const recommender = String(body.recommender ?? '').trim();
  const tags = splitTags(body.tags);

  assignNotionProperty(properties, databaseProperties, ['제목', '작품명', 'Title', 'Name', '이름'], title, 'title');
  assignNotionProperty(properties, databaseProperties, ['저자', 'Author', 'Creator'], author, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['출판사', 'Publisher', 'Studio'], publisher, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['카테고리', '매체', 'Medium', 'Type', '분류'], category, 'select');
  assignNotionProperty(properties, databaseProperties, ['링크', 'Link', 'URL', 'Url'], link, 'url');
  assignNotionProperty(properties, databaseProperties, ['태그', 'Tags', '키워드', 'Keywords'], tags, 'multi_select');
  assignNotionProperty(properties, databaseProperties, ['추천자', 'Recommender', '추천'], recommender, 'rich_text');

  return notionRequest('/pages', {
    token,
    method: 'POST',
    body: {
      parent: { database_id: databaseId },
      properties,
    },
  });
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

  if (missing.length > 0) {
    return response.status(503).json({
      works: [],
      error: 'Notion environment variables are not configured',
      missing,
    });
  }

  if (request.method === 'POST') {
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body ?? {});
    if (!String(body.title ?? '').trim()) {
      return response.status(400).json({ error: '작품 제목을 입력해주세요.' });
    }

    try {
      const page = await createNotionWork(token, databaseId, body);
      apiCache.works = null;
      apiCache.worksExpiresAt = 0;
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

  if (!shouldRefresh && apiCache.works && apiCache.worksExpiresAt > Date.now()) {
    response.setHeader('X-SF-Archive-Cache', 'HIT');
    return response.status(200).json({ works: apiCache.works });
  }

  let results;
  try {
    results = await queryNotionDatabaseAll(token, databaseId);
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion request failed',
      payload: { works: [] },
    });
  }

  const worksWithoutCovers = results
    .map(mapPageToWork)
    .filter(work => work.title)
    .map((work, index) => ({
      ...work,
      code: work.code.startsWith('SFA-') ? `SFA-${String(index + 1).padStart(3, '0')}` : work.code,
    }));
  const works = await mapWithConcurrency(worksWithoutCovers, 4, async work => ({
    ...work,
    cover: await getCachedAladinCover(work, aladinApiKey),
  }));

  apiCache.works = works;
  apiCache.worksExpiresAt = Date.now() + WORKS_CACHE_TTL_MS;
  response.setHeader('X-SF-Archive-Cache', 'MISS');

  return response.status(200).json({ works });
}
