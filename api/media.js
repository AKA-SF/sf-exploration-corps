const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_SIZE = 100;
const DEFAULT_MEDIA_DATABASE_ID = '36898dbef69d80fc98caf262593fc53b';

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

function getYouTubeId(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] ?? '';
    return url.searchParams.get('v') ?? url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] ?? '';
  } catch {
    return link.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&?/]+)/)?.[1] ?? '';
  }
}

function mapPageToMedia(page, index) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['제목', 'Title', 'Name', '이름']));
  const category = plainText(pick(properties, ['분류', 'Category', 'Type']));
  const medium = plainText(pick(properties, ['매체', 'Medium']));
  const link = plainText(pick(properties, ['링크', '유튜브링크', 'URL', 'Url', 'Link']));
  const description = plainText(pick(properties, ['설명', 'Description', '메모']));
  const publisher = plainText(pick(properties, ['게시자', 'Publisher', 'Source', '출처', '채널']));
  const year = plainText(pick(properties, ['연도', 'Year']));
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));
  const youtubeId = getYouTubeId(link);

  return {
    code: `MED-${String(index + 1).padStart(3, '0')}`,
    title,
    category: category || '미분류',
    medium: medium || (youtubeId ? 'YouTube' : 'Article'),
    link,
    description,
    publisher,
    year,
    tags: tags.length > 0 ? tags : ['Media'],
    thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_MEDIA_DATABASE_ID || DEFAULT_MEDIA_DATABASE_ID);

  if (!token || !databaseId) {
    return response.status(503).json({
      media: [],
      error: 'Notion media environment variables are not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_MEDIA_DATABASE_ID' : null,
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
        media: [],
        error: 'Notion media request failed',
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

  const media = results
    .map(mapPageToMedia)
    .filter(item => item.title && item.link);

  return response.status(200).json({ media });
}
