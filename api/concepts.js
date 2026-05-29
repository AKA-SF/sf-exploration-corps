import { getNotionConfig, queryNotionDatabaseAll, sendNotionError } from './_notion.js';

function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
  if (value.type === 'multi_select') return value.multi_select.map(tag => tag.name).join(', ');
  if (value.type === 'number') return String(value.number ?? '');
  if (value.type === 'url') return value.url ?? '';
  if (value.type === 'relation') return value.relation?.length ? `${value.relation.length}개 연결` : '';
  return '';
}

function multiSelect(value) {
  if (!value || value.type !== 'multi_select') return [];
  return value.multi_select.map(tag => tag.name);
}

function textList(value) {
  if (!value) return [];
  if (value.type === 'multi_select') return value.multi_select.map(tag => tag.name);
  const text = plainText(value);
  return text
    .split(/[,/、|]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function pick(properties, names) {
  return names.map(name => properties[name]).find(Boolean);
}

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
  response.setHeader('Cache-Control', 'no-store');

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

  let results;
  try {
    results = await queryNotionDatabaseAll(token, databaseId);
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Notion concept request failed',
      payload: { concepts: [] },
    });
  }

  const concepts = results
    .map(mapPageToConcept)
    .filter(concept => concept.term);

  return response.status(200).json({ concepts });
}
