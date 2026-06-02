import { getNotionConfig, queryNotionDatabaseAll, sendNotionError } from './_notion.js';
import { getCachedJson } from './_apiCache.js';
import { multiSelect, pick, plainText, textList } from './_notionProperties.js';

const CONCEPTS_CACHE_TTL_MS = 10 * 60 * 1000;

function mapPageToConcept(page, index) {
  const properties = page.properties ?? {};
  const term = plainText(pick(properties, ['용어', '개념명', '제목', 'Title', 'Name', '이름']));
  const english = plainText(pick(properties, ['영문명', '영어', 'English', '영문']));
  const category = plainText(pick(properties, ['분류', 'Category', 'Type']));
  const summary = plainText(pick(properties, ['설명', '정의', '요약', 'Description', 'Summary']));
  const relatedWorks = textList(pick(properties, ['관련 작품', '관련작품', 'Related Works', 'Works']));
  const source = plainText(pick(properties, ['출처', 'Source', 'Reference', '참고']));
  const code = plainText(pick(properties, ['코드', 'Code'])) || `CON-${String(index + 1).padStart(3, '0')}`;
  const keywords = multiSelect(pick(properties, ['키워드', '태그', 'Keywords', 'Tags']));

  return {
    code,
    term,
    english,
    category: category || 'SF 개념',
    summary: summary || '노션 SF 개념 사전에서 동기화된 개념 신호입니다.',
    relatedWorks,
    source,
    keywords: keywords.length > 0 ? keywords : relatedWorks.slice(0, 3),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { token, databaseId, missing } = getNotionConfig('NOTION_CONCEPTS_DATABASE_ID');

  if (missing.length > 0) {
    return response.status(503).json({
      concepts: [],
      error: 'Notion concept environment variables are not configured',
      missing,
    });
  }

  const requestUrl = new URL(request.url ?? '/api/concepts', `https://${request.headers.host ?? 'localhost'}`);
  const shouldRefresh = requestUrl.searchParams.get('refresh') === '1';
  let cache;
  let concepts;
  try {
    const cached = await getCachedJson(`concepts:${databaseId}`, CONCEPTS_CACHE_TTL_MS, async () => {
      const results = await queryNotionDatabaseAll(token, databaseId);
      return results
        .map(mapPageToConcept)
        .filter(concept => concept.term);
    }, { refresh: shouldRefresh });
    cache = cached.cache;
    concepts = cached.value;
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion concept request failed',
      payload: { concepts: [] },
    });
  }

  response.setHeader('X-SF-Archive-Cache', cache);
  return response.status(200).json({ concepts });
}
