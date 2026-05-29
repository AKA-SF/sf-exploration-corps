import { getNotionConfig, queryNotionDatabaseAll, sendNotionError } from './_notion.js';

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
  if (value.type === 'date') return value.date?.start ?? '';
  if (value.type === 'created_time') return value.created_time ?? '';
  if (value.type === 'last_edited_time') return value.last_edited_time ?? '';
  return '';
}

function multiSelect(value) {
  if (!value || value.type !== 'multi_select') return [];
  return value.multi_select.map(tag => tag.name);
}

function pick(properties, names) {
  return names.map(name => properties[name]).find(Boolean);
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

function normalizeMediaCategory(category = '') {
  const normalized = category.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('작가') || normalized.includes('인터뷰')) return 'SF 작가 인터뷰';
  if (normalized.includes('미디어') || normalized.includes('media') || normalized.includes('콘텐츠') || normalized.includes('자료')) return 'SF 관련 미디어';
  if (normalized.includes('기사') || normalized.includes('article') || normalized.includes('news')) return 'SF 관련 미디어';
  if (normalized.includes('고전') && (normalized.includes('영화') || normalized.includes('sf'))) return '고전 SF 영화';
  return category;
}

function getMediaSortTime(item) {
  if (item.date) {
    const timestamp = Date.parse(item.date);
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  const year = String(item.year ?? '').match(/\d{4}/)?.[0];
  return year ? Date.UTC(Number(year), 11, 31) : 0;
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
  const date = plainText(pick(properties, [
    '날짜',
    '게시일',
    '발행일',
    '업로드일',
    '생성일',
    'Date',
    'Published',
    'Published At',
    'Created',
    'Created time',
  ]));
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));
  const youtubeId = getYouTubeId(link);

  return {
    code: `MED-${String(index + 1).padStart(3, '0')}`,
    title,
    category: normalizeMediaCategory(category || '미분류'),
    medium: medium || (youtubeId ? 'YouTube' : 'Article'),
    link,
    description,
    publisher,
    year,
    date,
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

  const { token, databaseId, missing } = getNotionConfig('NOTION_MEDIA_DATABASE_ID', DEFAULT_MEDIA_DATABASE_ID);

  if (missing.length > 0) {
    return response.status(503).json({
      media: [],
      error: 'Notion media environment variables are not configured',
      missing,
    });
  }

  let results;
  try {
    results = await queryNotionDatabaseAll(token, databaseId);
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion media request failed',
      payload: { media: [] },
    });
  }

  const media = results
    .map(mapPageToMedia)
    .filter(item => item.title && item.link)
    .sort((a, b) => getMediaSortTime(b) - getMediaSortTime(a));

  return response.status(200).json({ media });
}
