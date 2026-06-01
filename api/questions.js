import { getNotionConfig, notionRequest, queryNotionDatabaseAll, sendNotionError } from './_notion.js';
import { requireAdminUser } from './_adminAuth.js';
import { pick, plainText } from './_notionProperties.js';
import { findPropertyEntry, readJsonBody, richTextPayload } from './_notionWrite.js';

const DEFAULT_QUESTIONS_DATABASE_ID = '36a98dbef69d803abd53c09b6ff7f2e3';

function findProperty(schema, preferredNames, type) {
  return findPropertyEntry(schema, preferredNames, type)
    ?? Object.entries(schema ?? {}).find(([, property]) => property.type === type);
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
  const views = Number(plainText(pick(properties, ['조회수', '조회', 'Views', 'View Count']))) || 0;

  return {
    id: page.id,
    code: `Q-${String(index + 1).padStart(3, '0')}`,
    title,
    content,
    author: author || '익명',
    contact,
    category: category || '토론 질문',
    status,
    date,
    views,
  };
}

function parseCommentBlock(block) {
  if (block.type !== 'paragraph') return null;
  const text = block.paragraph?.rich_text?.map(part => part.plain_text).join('') ?? '';
  if (!text.startsWith('SFA_COMMENT:')) return null;

  try {
    return {
      id: block.id,
      ...JSON.parse(text.replace('SFA_COMMENT:', '')),
    };
  } catch {
    return null;
  }
}

function getStatusName(property, preferredName) {
  const options = property?.status?.options ?? [];
  return options.find(option => option.name === preferredName)?.name
    ?? options.find(option => ['대기', '접수', '검토 중', 'Not started', 'To do'].includes(option.name))?.name
    ?? options[0]?.name
    ?? '';
}

function getSelectName(property, preferredName) {
  const options = property?.select?.options ?? [];
  if (options.length === 0) return preferredName;
  return options.find(option => option.name === preferredName)?.name
    ?? options[0]?.name
    ?? '';
}

function buildProperty(property, value) {
  if (!value) return null;
  const { type } = property;
  if (type === 'title') return { title: richTextPayload(value) };
  if (type === 'rich_text') return { rich_text: richTextPayload(value) };
  if (type === 'select') {
    const selectName = getSelectName(property, value);
    return selectName ? { select: { name: selectName } } : null;
  }
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

async function incrementViewCount({ page, schema, token }) {
  const entry = findProperty(schema, ['조회수', '조회', 'Views', 'View Count'], 'number');
  if (!entry) return page;

  const [name] = entry;
  const current = Number(plainText(page.properties?.[name])) || 0;
  const next = current + 1;

  try {
    await notionRequest(`/pages/${page.id}`, {
      token,
      method: 'PATCH',
      body: {
        properties: {
          [name]: { number: next },
        },
      },
    });
    return {
      ...page,
      properties: {
        ...page.properties,
        [name]: {
          ...page.properties?.[name],
          number: next,
        },
      },
    };
  } catch {
    return page;
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, DELETE');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { token, databaseId, missing } = getNotionConfig('NOTION_QUESTIONS_DATABASE_ID', DEFAULT_QUESTIONS_DATABASE_ID);

  if (missing.length > 0) {
    return response.status(503).json({
      error: 'Question database is not configured',
      missing,
    });
  }

  let database;
  try {
    database = await notionRequest(`/databases/${databaseId}`, { token });
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Question database request failed',
    });
  }

  const schema = database.properties ?? {};

  if (request.method === 'GET') {
    const questionId = String(request.query?.id ?? '').trim();

    if (questionId) {
      let page;
      try {
        page = await notionRequest(`/pages/${questionId}`, { token });
      } catch (error) {
        return sendNotionError(response, {
          error,
          fallbackMessage: 'Question detail request failed',
          payload: { question: null, comments: [] },
        });
      }

      page = await incrementViewCount({ page, schema, token });

      const blocks = await notionRequest(`/blocks/${questionId}/children?page_size=100`, { token })
        .catch(() => ({ results: [] }));
      const comments = (blocks.results ?? [])
        .map(parseCommentBlock)
        .filter(Boolean);

      return response.status(200).json({
        question: mapPageToQuestion(page, 0),
        comments,
      });
    }

    let results;
    try {
      results = await queryNotionDatabaseAll(token, databaseId);
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Question list request failed',
        payload: { questions: [] },
      });
    }

    const questions = results
      .map(mapPageToQuestion)
      .filter(question => question.title);

    return response.status(200).json({ questions });
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  if (request.method === 'DELETE') {
    const adminUser = await requireAdminUser(request, response);
    if (!adminUser) return null;

    const mode = String(body?.mode ?? 'post').trim();

    try {
      if (mode === 'comment') {
        const commentId = String(body?.commentId ?? '').trim();
        if (!commentId) return response.status(400).json({ error: 'Comment ID is required' });

        await notionRequest(`/blocks/${commentId}`, {
          token,
          method: 'PATCH',
          body: { archived: true },
        });
        return response.status(200).json({ ok: true });
      }

      const questionId = String(body?.questionId ?? '').trim();
      if (!questionId) return response.status(400).json({ error: 'Question ID is required' });

      await notionRequest(`/pages/${questionId}`, {
        token,
        method: 'PATCH',
        body: { archived: true },
      });
      return response.status(200).json({ ok: true });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Community deletion failed',
      });
    }
  }

  const mode = String(body?.mode ?? 'post').trim();

  if (mode === 'comment') {
    const questionId = String(body?.questionId ?? '').trim();
    const name = String(body?.name ?? '').trim() || '익명';
    const content = String(body?.content ?? '').trim();

    if (!questionId || !content) {
      return response.status(400).json({ error: 'Question ID and comment content are required' });
    }

    const comment = {
      name,
      content,
      date: new Date().toISOString().slice(0, 10),
    };

    try {
      await notionRequest(`/blocks/${questionId}/children`, {
        token,
        method: 'PATCH',
        body: {
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: richTextPayload(`SFA_COMMENT:${JSON.stringify(comment)}`),
              },
            },
          ],
        },
      });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Comment submission failed',
      });
    }

    return response.status(200).json({ ok: true, comment });
  }

  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const name = String(body?.name ?? '').trim();
  const contact = String(body?.contact ?? '').trim();
  const category = String(body?.category ?? '').trim() || '커뮤니티';

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

  try {
    await notionRequest('/pages', {
      token,
      method: 'POST',
      body: {
        parent: { database_id: databaseId },
        properties,
      },
    });
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Question submission failed',
    });
  }

  return response.status(200).json({ ok: true });
}
