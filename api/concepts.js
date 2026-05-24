const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_SIZE = 100;

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

function normalizeNotionId(value) {
  const source = value?.trim() ?? '';
  const compactId = source.match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)?.[1];
  const dashedId = source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return (compactId ?? dashedId ?? '').replace(/-/g, '');
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

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_CONCEPTS_DATABASE_ID || '');

  if (!token || !databaseId) {
    return response.status(503).json({
      concepts: [],
      error: 'Notion concept environment variables are not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_CONCEPTS_DATABASE_ID' : null,
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
      const notionError = await notionResponse.json().catch(async () => ({ message: await notionResponse.text() }));

      return response.status(notionResponse.status).json({
        concepts: [],
        error: 'Notion concept request failed',
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

  const concepts = results
    .map(mapPageToConcept)
    .filter(concept => concept.term);

  return response.status(200).json({ concepts });
}
