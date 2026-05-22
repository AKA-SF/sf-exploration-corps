const NOTION_VERSION = '2022-06-28';

function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
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

function mapPageToWork(page, index) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['작품명', 'Title', 'Name', '이름']));
  const medium = plainText(pick(properties, ['매체', 'Medium', 'Type', '분류']));
  const subtitle = plainText(pick(properties, ['설명', 'Subtitle', 'Description', '메모']));
  const code = plainText(pick(properties, ['코드', 'Code', 'Archive Code'])) || `SFA-${String(index + 1).padStart(3, '0')}`;
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));

  return {
    code,
    medium: medium || 'ARCHIVE',
    title: title || '제목 미정',
    subtitle: subtitle || '노션 작품 아카이브에서 동기화된 신호',
    tags: tags.length > 0 ? tags : ['Notion Sync'],
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_WORKS_DATABASE_ID);

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

  const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      page_size: 12,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
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
  const works = data.results.map(mapPageToWork);

  return response.status(200).json({ works });
}
