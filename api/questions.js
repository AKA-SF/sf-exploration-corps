const NOTION_VERSION = '2022-06-28';
const DEFAULT_QUESTIONS_DATABASE_ID = '36a98dbef69d803abd53c09b6ff7f2e3';
const NOTION_PAGE_SIZE = 100;
const DEFAULT_BOARD_PASSWORD = 'sf';

function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
  if (value.type === 'status') return value.status?.name ?? '';
  if (value.type === 'date') return value.date?.start ?? '';
  if (value.type === 'email') return value.email ?? '';
  if (value.type === 'url') return value.url ?? '';
  return '';
}

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

function pick(properties, names) {
  return names.map(name => properties[name]).find(Boolean);
}

function mapPageToQuestion(page, index) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['질문', '제목', 'Title', 'Name', '이름']));
  const content = plainText(pick(properties, ['내용', '본문', '질문 내용', 'Content', 'Description']));
  const author = plainText(pick(properties, ['작성자', '이름', 'Author']));
  const contact = plainText(pick(properties, ['연락처', 'Contact', 'Email', '이메일']));
  const category = plainText(pick(properties, ['분류', 'Category', 'Type']));
  const status = plainText(pick(properties, ['상태', 'Status']));
  const date = plainText(pick(properties, ['작성일', '날짜', 'Date']));

  return {
    code: `Q-${String(index + 1).padStart(3, '0')}`,
    title,
    content,
    author: author || '익명',
    contact,
    category: category || '토론 질문',
    status,
    date,
  };
}

function richText(value) {
  return [{ type: 'text', text: { content: value } }];
}

function getStatusName(property, preferredName) {
  const options = property?.status?.options ?? [];
  return options.find(option => option.name === preferredName)?.name
    ?? options.find(option => ['대기', '접수', '검토 중', 'Not started', 'To do'].includes(option.name))?.name
    ?? options[0]?.name
    ?? '';
}

function buildProperty(property, value) {
  if (!value) return null;
  const { type } = property;
  if (type === 'title') return { title: richText(value) };
  if (type === 'rich_text') return { rich_text: richText(value) };
  if (type === 'select') return { select: { name: value } };
  if (type === 'email') return value.includes('@') ? { email: value } : null;
  if (type === 'url') return value.startsWith('http') ? { url: value } : null;
  if (type === 'date') return { date: { start: value } };
  if (type === 'status') {
    const statusName = getStatusName(property, value);
    return statusName ? { status: { name: statusName } } : null;
  }
  return null;
}

function setIfPresent(properties, schema, names, type, value) {
  const entry = findProperty(schema, names, type);
  if (!entry) return;
  const [name, property] = entry;
  const payload = buildProperty(property, value);
  if (payload) properties[name] = payload;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env.NOTION_QUESTIONS_DATABASE_ID || DEFAULT_QUESTIONS_DATABASE_ID);

  if (!token || !databaseId) {
    return response.status(503).json({
      error: 'Question database is not configured',
      missing: [
        !token ? 'NOTION_TOKEN' : null,
        !databaseId ? 'NOTION_QUESTIONS_DATABASE_ID' : null,
      ].filter(Boolean),
    });
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

  if (request.method === 'GET') {
    const results = [];
    let startCursor;

    do {
      const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          page_size: NOTION_PAGE_SIZE,
          ...(startCursor ? { start_cursor: startCursor } : {}),
        }),
      });

      if (!notionResponse.ok) {
        const notionError = await notionResponse.json().catch(() => ({}));
        return response.status(notionResponse.status).json({
          questions: [],
          error: 'Question list request failed',
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

    const questions = results
      .map(mapPageToQuestion)
      .filter(question => question.title);

    return response.status(200).json({ questions });
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body;
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const name = String(body?.name ?? '').trim();
  const contact = String(body?.contact ?? '').trim();
  const category = String(body?.category ?? '').trim() || '커뮤니티';
  const password = String(body?.password ?? '').trim();
  const boardPassword = process.env.COMMUNITY_BOARD_PASSWORD || DEFAULT_BOARD_PASSWORD;

  if (password !== boardPassword) {
    return response.status(401).json({ error: 'Invalid board password' });
  }

  if (!title || !content) {
    return response.status(400).json({ error: 'Title and content are required' });
  }

  const properties = {};

  setIfPresent(properties, schema, ['질문', '제목', 'Title', 'Name', '이름'], 'title', title);
  setIfPresent(properties, schema, ['내용', '본문', '질문 내용', 'Content', 'Description'], 'rich_text', content);
  setIfPresent(properties, schema, ['작성자', '이름', 'Name', 'Author'], 'rich_text', name || '익명');
  setIfPresent(properties, schema, ['연락처', 'Contact', 'Email', '이메일'], 'rich_text', contact);
  setIfPresent(properties, schema, ['이메일', 'Email'], 'email', contact);
  setIfPresent(properties, schema, ['분류', 'Category', 'Type'], 'select', category);
  setIfPresent(properties, schema, ['상태', 'Status'], 'status', '공개');
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
