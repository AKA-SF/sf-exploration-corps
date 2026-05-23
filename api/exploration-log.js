const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_SIZE = 100;
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

function normalizeNotionId(value) {
  const source = value?.trim() ?? '';
  const compactId = source.match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)?.[1];
  const dashedId = source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return (compactId ?? dashedId ?? '').replace(/-/g, '');
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

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_LOG_DATABASE_ID || DEFAULT_LOG_DATABASE_ID);

  if (!token || !databaseId) {
    return response.status(503).json({
      logs: [],
      error: 'Notion log environment variables are not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_LOG_DATABASE_ID' : null,
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
        logs: [],
        error: 'Notion log request failed',
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

  const logs = results
    .map(mapPageToLog)
    .filter(log => log.workTitle && log.instagramUrl && (log.status === '' || log.status === '공개'));

  return response.status(200).json({ logs });
}
