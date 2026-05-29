import { getNotionConfig, notionRequest, queryNotionDatabaseAll, sendNotionError } from './_notion.js';

const DEFAULT_LOG_DATABASE_ID = '36998dbef69d80dfa4afc27813f25b11';

function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
  if (value.type === 'multi_select') return value.multi_select.map(tag => tag.name).join(', ');
  if (value.type === 'date') return value.date?.start ?? '';
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

function normalizeName(value) {
  return value.replace(/\s/g, '').toLowerCase();
}

function findPropertyName(properties, candidates, type) {
  const normalizedCandidates = candidates.map(normalizeName);
  const entries = Object.entries(properties);
  const exactMatch = entries.find(([name, property]) => (
    (!type || property.type === type) && normalizedCandidates.includes(normalizeName(name))
  ));
  if (exactMatch) return exactMatch[0];

  const looseMatch = entries.find(([name, property]) => (
    (!type || property.type === type) && normalizedCandidates.some(candidate => normalizeName(name).includes(candidate))
  ));
  if (looseMatch) return looseMatch[0];

  return entries.find(([, property]) => property.type === type)?.[0] ?? '';
}

function readRequestBody(request) {
  if (request.body && typeof request.body === 'object') return Promise.resolve(request.body);
  if (typeof request.body === 'string') return Promise.resolve(JSON.parse(request.body || '{}'));

  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function richText(value) {
  return {
    rich_text: [{ text: { content: String(value ?? '').slice(0, 1900) } }],
  };
}

function titleText(value) {
  return {
    title: [{ text: { content: String(value ?? '').slice(0, 1900) } }],
  };
}

function createSelect(value) {
  return { select: { name: String(value ?? '').slice(0, 100) } };
}

function createMultiSelect(values) {
  return {
    multi_select: [...new Set(values.filter(Boolean).map(value => String(value).slice(0, 100)))]
      .map(name => ({ name })),
  };
}

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
  response.setHeader('Cache-Control', 'no-store');

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
      payload = await readRequestBody(request);
    } catch {
      return response.status(400).json({ error: 'Invalid JSON body' });
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

    const titleProperty = findPropertyName(schema, ['작품명', '제목', 'Title', 'Name', '이름'], 'title');
    if (titleProperty) properties[titleProperty] = titleText(title);

    const instagramProperty = findPropertyName(schema, ['인스타URL', '인스타 URL', 'Instagram URL', 'URL', '링크', 'Link'], 'url');
    if (instagramProperty) properties[instagramProperty] = { url: instagramUrl };

    const reviewProperty = findPropertyName(schema, ['리뷰문구', '리뷰 문구', 'Review', '본문', '설명', 'Description'], 'rich_text');
    if (reviewProperty) properties[reviewProperty] = richText(`${nodeLabel || 'SF 탐사 좌표'}에서 수집한 인스타 서평 신호입니다.`);

    const categoryProperty = findPropertyName(schema, ['분류', 'Category', 'Type'], 'select');
    if (categoryProperty) properties[categoryProperty] = createSelect('탐사 좌표');

    const statusProperty = findPropertyName(schema, ['상태', 'Status'], 'select');
    if (statusProperty) properties[statusProperty] = createSelect('공개');

    const dateProperty = findPropertyName(schema, ['날짜', 'Date', '작성일'], 'date');
    if (dateProperty) properties[dateProperty] = { date: { start: new Date().toISOString().slice(0, 10) } };

    const tagsProperty = findPropertyName(schema, ['태그', 'Tags', '키워드', 'Keywords'], 'multi_select');
    if (tagsProperty) properties[tagsProperty] = createMultiSelect(['Coordinate Map', nodeLabel, nodeEnglish, nodeId]);

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

  let results;
  try {
    results = await queryNotionDatabaseAll(token, databaseId);
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion log request failed',
      payload: { logs: [] },
    });
  }

  const logs = results
    .map(mapPageToLog)
    .filter(log => log.workTitle && log.instagramUrl && (log.status === '' || log.status === '공개'));

  return response.status(200).json({ logs });
}
