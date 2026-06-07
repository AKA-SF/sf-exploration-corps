import { getNotionConfig, queryNotionDatabaseAll, sendNotionError } from './_notion.js';
import { getDurableCachedJson } from './_persistentCache.js';
import { multiSelect, pick, plainText } from './_notionProperties.js';

const DEFAULT_MEDIA_DATABASE_ID = '36898dbef69d80fc98caf262593fc53b';
const MEDIA_CACHE_TTL_MS = 10 * 60 * 1000;

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
  response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');

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

  const requestUrl = new URL(request.url ?? '/api/media', `https://${request.headers.host ?? 'localhost'}`);
  const shouldRefresh = requestUrl.searchParams.get('refresh') === '1';

  let cache;
  let media;
  try {
    const cached = await getDurableCachedJson(`media:${databaseId}`, MEDIA_CACHE_TTL_MS, async () => {
      const results = await queryNotionDatabaseAll(token, databaseId);
      return results
        .map(mapPageToMedia)
        .filter(item => item.title && item.link)
        .sort((a, b) => getMediaSortTime(b) - getMediaSortTime(a));
    }, { refresh: shouldRefresh });
    cache = cached.cache;
    media = cached.value;
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion media request failed',
      payload: { media: [] },
    });
  }

  response.setHeader('X-SF-Archive-Cache', cache);
  return response.status(200).json({ media });
}
