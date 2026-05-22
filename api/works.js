const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_SIZE = 100;
const ALADIN_LOOKUP_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

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

function normalizeNotionId(value) {
  const source = value?.trim() ?? '';
  const compactId = source.match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)?.[1];
  const dashedId = source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return (compactId ?? dashedId ?? '').replace(/-/g, '');
}

function getAladinItemId(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    return url.searchParams.get('ItemId') ?? '';
  } catch {
    return link.match(/ItemId=(\d+)/i)?.[1] ?? '';
  }
}

async function fetchAladinCover(link, apiKey) {
  const itemId = getAladinItemId(link);
  if (!itemId || !apiKey) return '';

  const params = new URLSearchParams({
    ttbkey: apiKey,
    ItemId: itemId,
    ItemIdType: 'ItemId',
    Cover: 'Big',
    output: 'js',
    Version: '20131101',
  });

  try {
    const upstream = await fetch(`${ALADIN_LOOKUP_ENDPOINT}?${params.toString()}`);
    if (!upstream.ok) return '';
    const text = await upstream.text();
    const data = JSON.parse(text.trim().replace(/;$/, ''));
    return data.item?.[0]?.cover ?? '';
  } catch {
    return '';
  }
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

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_WORKS_DATABASE_ID);
  const aladinApiKey = process.env.ALADIN_TTB_KEY || process.env.VITE_ALADIN_TTB_KEY;

  if (!token || !databaseId) {
    return response.status(503).json({
      works: [],
      error: 'Notion environment variables are not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_WORKS_DATABASE_ID' : null,
      ].filter(Boolean),
    });
  }

  const results = [];
  let startCursor;

  do {
    const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        page_size: NOTION_PAGE_SIZE,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
    });

    if (!notionResponse.ok) {
      let notionError;
      try {
        notionError = await notionResponse.json();
      } catch {
        notionError = { message: await notionResponse.text() };
      }

      return response.status(notionResponse.status).json({
        works: [],
        error: 'Notion request failed',
        status: notionResponse.status,
        notion: {
          code: notionError?.code,
          message: notionError?.message,
        },
      });
    }

    const data = await notionResponse.json();
    results.push(...data.results);
    startCursor = data.has_more ? data.next_cursor : null;
  } while (startCursor);

  const worksWithoutCovers = results
    .map(mapPageToWork)
    .filter(work => work.title)
    .map((work, index) => ({
      ...work,
      code: work.code.startsWith('SFA-') ? `SFA-${String(index + 1).padStart(3, '0')}` : work.code,
    }));
  const works = await Promise.all(worksWithoutCovers.map(async work => ({
    ...work,
    cover: await fetchAladinCover(work.link, aladinApiKey),
  })));

  return response.status(200).json({ works });
}
