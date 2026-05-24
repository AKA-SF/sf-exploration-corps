const NOTION_VERSION = '2022-06-28';

function normalizeNotionId(value) {
  const source = value?.trim() ?? '';
  const compactId = source.match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)?.[1];
  const dashedId = source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return (compactId ?? dashedId ?? '').replace(/-/g, '');
}

function findProperty(schema, preferredNames, type) {
  const entries = Object.entries(schema ?? {});
  const preferred = entries.find(([name, property]) => (
    property.type === type && preferredNames.includes(name)
  ));
  return preferred ?? entries.find(([, property]) => property.type === type);
}

function richText(value) {
  return [{ type: 'text', text: { content: value } }];
}

function buildProperty(type, value) {
  if (!value) return null;
  if (type === 'title') return { title: richText(value) };
  if (type === 'rich_text') return { rich_text: richText(value) };
  if (type === 'select') return { select: { name: value } };
  if (type === 'email') return { email: value.includes('@') ? value : null };
  if (type === 'url') return { url: value.startsWith('http') ? value : null };
  if (type === 'date') return { date: { start: value } };
  if (type === 'status') return { status: { name: value } };
  return null;
}

function setIfPresent(properties, schema, names, type, value) {
  const entry = findProperty(schema, names, type);
  if (!entry) return;
  const [name, property] = entry;
  const payload = buildProperty(property.type, value);
  if (payload) properties[name] = payload;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_QUESTIONS_DATABASE_ID || '');

  if (!token || !databaseId) {
    return response.status(503).json({
      error: 'Question database is not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_QUESTIONS_DATABASE_ID' : null,
      ].filter(Boolean),
    });
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body;
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const name = String(body?.name ?? '').trim();
  const contact = String(body?.contact ?? '').trim();
  const category = String(body?.category ?? '').trim() || '토론 질문';

  if (!title || !content) {
    return response.status(400).json({ error: 'Title and content are required' });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  const databaseResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, { headers });

  if (!databaseResponse.ok) {
    const notionError = await databaseResponse.json().catch(() => ({}));
    return response.status(databaseResponse.status).json({
      error: 'Question database request failed',
      notion: {
        code: notionError?.code,
        message: notionError?.message,
      },
    });
  }

  const database = await databaseResponse.json();
  const schema = database.properties ?? {};
  const properties = {};

  setIfPresent(properties, schema, ['질문', '제목', 'Title', 'Name', '이름'], 'title', title);
  setIfPresent(properties, schema, ['내용', '본문', '질문 내용', 'Content', 'Description'], 'rich_text', content);
  setIfPresent(properties, schema, ['작성자', '이름', 'Name', 'Author'], 'rich_text', name || '익명');
  setIfPresent(properties, schema, ['연락처', 'Contact', 'Email', '이메일'], 'rich_text', contact);
  setIfPresent(properties, schema, ['이메일', 'Email'], 'email', contact);
  setIfPresent(properties, schema, ['분류', 'Category', 'Type'], 'select', category);
  setIfPresent(properties, schema, ['상태', 'Status'], 'status', '대기');
  setIfPresent(properties, schema, ['작성일', '날짜', 'Date'], 'date', new Date().toISOString().slice(0, 10));

  if (!Object.values(schema).some(property => property.type === 'title') || Object.keys(properties).length === 0) {
    return response.status(400).json({ error: 'Question database needs a title property' });
  }

  const createResponse = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!createResponse.ok) {
    const notionError = await createResponse.json().catch(() => ({}));
    return response.status(createResponse.status).json({
      error: 'Question submission failed',
      notion: {
        code: notionError?.code,
        message: notionError?.message,
      },
    });
  }

  return response.status(200).json({ ok: true });
}
