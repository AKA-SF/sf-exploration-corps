import {
  getNotionConfig,
  notionRequest,
  queryNotionDatabaseAll,
  queryNotionDatabasePage,
  sendNotionError,
} from './_notion.js';
import { clearApiCachePrefix, getCachedJson } from './_apiCache.js';
import { getOptionalUser, requireAdminUser, requireAuthenticatedUser } from './_adminAuth.js';
import { pick, plainText } from './_notionProperties.js';
import { findPropertyEntry, readJsonBody, richTextPayload } from './_notionWrite.js';

const DEFAULT_QUESTIONS_DATABASE_ID = '36a98dbef69d803abd53c09b6ff7f2e3';
const OWNER_PREFIX = 'SFA_OWNER:';
const COMMENT_PREFIX = 'SFA_COMMENT:';
const DEFAULT_QUESTIONS_PAGE_SIZE = 40;
const QUESTIONS_DATABASE_CACHE_TTL_MS = 5 * 60 * 1000;
const QUESTIONS_LIST_CACHE_TTL_MS = 45 * 1000;
const QUESTIONS_ADMIN_CACHE_TTL_MS = 20 * 1000;
const VIEW_WRITE_TTL_MS = 90 * 1000;
const CATEGORY_PROPERTY_NAMES = ['말머리', '분류', '카테고리', 'Category', 'Type'];
const viewWriteState = globalThis.__sfQuestionViewWriteState ??= new Map();

function clearQuestionCaches() {
  clearApiCachePrefix('questions:');
}

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
  const category = plainText(pick(properties, CATEGORY_PROPERTY_NAMES));
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
    category: normalizeCommunityCategory(category),
    status,
    date,
    views,
  };
}

function parseCommentBlock(block) {
  if (block.type !== 'paragraph') return null;
  const text = block.paragraph?.rich_text?.map(part => part.plain_text).join('') ?? '';
  if (!text.startsWith(COMMENT_PREFIX)) return null;

  try {
    return {
      id: block.id,
      ...JSON.parse(text.replace(COMMENT_PREFIX, '')),
    };
  } catch {
    return null;
  }
}

function parseOwnerBlock(block) {
  if (block.type !== 'paragraph') return '';
  const text = block.paragraph?.rich_text?.map(part => part.plain_text).join('') ?? '';
  return text.startsWith(OWNER_PREFIX) ? text.replace(OWNER_PREFIX, '').trim() : '';
}

function sanitizeOwnerToken(value) {
  return String(value ?? '').trim().slice(0, 96);
}

function getUserOwnerToken(user) {
  return user?.id ? `user:${user.id}` : '';
}

function getUserAuthorName(user) {
  return (
    user?.user_metadata?.nickname
    || user?.user_metadata?.display_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || '탐사자'
  );
}

function getPaginationParams(query) {
  return {
    pageSize: Math.min(Math.max(Number(query?.pageSize) || DEFAULT_QUESTIONS_PAGE_SIZE, 1), 80),
    startCursor: String(query?.cursor ?? '').trim(),
  };
}

function sanitizeComment(comment, ownerToken) {
  if (!comment) return null;
  const { ownerToken: commentOwnerToken, ...rest } = comment;
  return {
    ...rest,
    canEdit: Boolean(ownerToken && commentOwnerToken && ownerToken === commentOwnerToken),
  };
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
  return options.find(option => option.name === preferredName)?.name ?? preferredName;
}

function normalizeCommunityCategory(value) {
  const source = String(value ?? '').trim().replace(/\s+/g, '');
  if (!source) return '자유글';
  if (['작품추천', '작품추천글', '추천', '추천글', '작품'].includes(source)) return '작품추천';
  if (['질문', '토론질문', '문의'].includes(source)) return '질문';
  if (['토론', '토론글', '논의'].includes(source)) return '토론';
  if (['자유글', '자유', '커뮤니티', '아카이브제안', '강의/워크숍주제'].includes(source)) return '자유글';
  return value || '자유글';
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

function buildQuestionProperties(schema, {
  category,
  contact,
  content,
  name,
  title,
}, { includeDate = false } = {}) {
  const properties = {};

  setIfPresent(properties, schema, ['질문', '제목', 'Title', 'Name', '이름'], 'title', title);
  setIfPresent(properties, schema, ['내용', '본문', '질문 내용', 'Content', 'Description'], 'rich_text', content);
  setIfPresent(properties, schema, ['작성자', '이름', 'Name', 'Author'], 'rich_text', name || '익명');
  setIfPresent(properties, schema, ['연락처', 'Contact', 'Email', '이메일'], 'rich_text', contact);
  setIfPresent(properties, schema, ['이메일', 'Email'], 'email', contact);
  setIfPresent(properties, schema, CATEGORY_PROPERTY_NAMES, 'select', normalizeCommunityCategory(category));
  setIfPresent(properties, schema, ['상태', 'Status'], 'status', '공개');
  if (includeDate) {
    setIfPresent(properties, schema, ['작성일', '날짜', 'Date'], 'date', new Date().toISOString().slice(0, 10));
  }

  return properties;
}

async function loadPageBlocks({ pageId, token }) {
  return notionRequest(`/blocks/${pageId}/children?page_size=100`, { token })
    .catch(() => ({ results: [] }));
}

function pageCanEdit(blocks, ownerToken) {
  if (!ownerToken) return false;
  return (blocks.results ?? []).some(block => parseOwnerBlock(block) === ownerToken);
}

async function incrementViewCount({ page, schema, token }) {
  const entry = findProperty(schema, ['조회수', '조회', 'Views', 'View Count'], 'number');
  if (!entry) return page;

  const [name] = entry;
  const lastWriteAt = viewWriteState.get(page.id) ?? 0;
  if (Date.now() - lastWriteAt < VIEW_WRITE_TTL_MS) return page;

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
    viewWriteState.set(page.id, Date.now());
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

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, PATCH, DELETE');
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
  let databaseCache;
  try {
    const cachedDatabase = await getCachedJson(
      `questions:database:${databaseId}`,
      QUESTIONS_DATABASE_CACHE_TTL_MS,
      () => notionRequest(`/databases/${databaseId}`, { token }),
    );
    database = cachedDatabase.value;
    databaseCache = cachedDatabase.cache;
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Question database request failed',
    });
  }

  const schema = database.properties ?? {};
  response.setHeader('X-SF-Question-Schema-Cache', databaseCache);

  if (request.method === 'GET') {
    const questionId = String(request.query?.id ?? '').trim();

    if (questionId) {
      const authenticatedUser = await getOptionalUser(request);
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

      const ownerToken = getUserOwnerToken(authenticatedUser) || sanitizeOwnerToken(request.query?.ownerToken);
      const blocks = await loadPageBlocks({ pageId: questionId, token });
      const comments = (blocks.results ?? [])
        .map(parseCommentBlock)
        .filter(Boolean)
        .map(comment => sanitizeComment(comment, ownerToken));

      return response.status(200).json({
        question: {
          ...mapPageToQuestion(page, 0),
          canEdit: pageCanEdit(blocks, ownerToken),
        },
        comments,
      });
    }

    if (String(request.query?.admin ?? '') === '1') {
      const adminUser = await requireAdminUser(request, response);
      if (!adminUser) return null;

      let cached;
      try {
        cached = await getCachedJson(
          `questions:admin-list:${databaseId}`,
          QUESTIONS_ADMIN_CACHE_TTL_MS,
          () => queryNotionDatabaseAll(token, databaseId),
          { refresh: String(request.query?.refresh ?? '') === '1' },
        );
      } catch (error) {
        return sendNotionError(response, {
          error,
          fallbackMessage: 'Question list request failed',
          payload: { questions: [], totalCount: 0 },
        });
      }

      const questions = cached.value
        .map(mapPageToQuestion)
        .filter(question => question.title);

      response.setHeader('X-SF-Archive-Cache', cached.cache);
      return response.status(200).json({
        admin: true,
        hasMore: false,
        nextCursor: '',
        questions,
        totalCount: questions.length,
      });
    }

    const paginationParams = getPaginationParams(request.query);
    const listCacheKey = `questions:list:${databaseId}:${paginationParams.pageSize}:${paginationParams.startCursor || 'first'}`;
    let cached;
    try {
      cached = await getCachedJson(
        listCacheKey,
        QUESTIONS_LIST_CACHE_TTL_MS,
        () => queryNotionDatabasePage(token, databaseId, paginationParams),
        { refresh: String(request.query?.refresh ?? '') === '1' },
      );
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Question list request failed',
        payload: { questions: [] },
      });
    }

    const data = cached.value;
    const questions = (data.results ?? [])
      .map(mapPageToQuestion)
      .filter(question => question.title);

    response.setHeader('X-SF-Archive-Cache', cached.cache);
    return response.status(200).json({
      hasMore: Boolean(data.has_more),
      nextCursor: data.next_cursor ?? '',
      questions,
    });
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return response.status(error.status || 400).json({ error: error.message || 'Invalid JSON body' });
  }

  const authenticatedUser = await requireAuthenticatedUser(request, response);
  if (!authenticatedUser) return null;
  const authenticatedOwnerToken = getUserOwnerToken(authenticatedUser);
  const authenticatedAuthorName = getUserAuthorName(authenticatedUser);

  if (request.method === 'PATCH') {
    const mode = String(body?.mode ?? 'post').trim();
    const ownerToken = authenticatedOwnerToken;

    try {
      if (mode === 'comment') {
        const commentId = String(body?.commentId ?? '').trim();
        const name = authenticatedAuthorName;
        const content = String(body?.content ?? '').trim();
        if (!commentId || !content) {
          return response.status(400).json({ error: 'Comment ID and content are required' });
        }

        const block = await notionRequest(`/blocks/${commentId}`, { token });
        const currentComment = parseCommentBlock(block);
        if (!currentComment?.ownerToken || currentComment.ownerToken !== ownerToken) {
          return response.status(403).json({ error: 'Only the original writer can edit this comment' });
        }

        const updatedComment = {
          ...currentComment,
          name,
          content,
        };

        await notionRequest(`/blocks/${commentId}`, {
          token,
          method: 'PATCH',
          body: {
            paragraph: {
              rich_text: richTextPayload(`${COMMENT_PREFIX}${JSON.stringify(updatedComment)}`),
            },
          },
        });
        clearQuestionCaches();

        return response.status(200).json({
          ok: true,
          comment: sanitizeComment(updatedComment, ownerToken),
        });
      }

      const questionId = String(body?.questionId ?? '').trim();
      const title = String(body?.title ?? '').trim();
      const content = String(body?.content ?? '').trim();
      const name = authenticatedAuthorName;
      const contact = String(body?.contact ?? '').trim();
      const category = String(body?.category ?? '').trim() || '자유글';

      if (!questionId || !title || !content) {
        return response.status(400).json({ error: 'Question ID, title, and content are required' });
      }

      const blocks = await loadPageBlocks({ pageId: questionId, token });
      if (!pageCanEdit(blocks, ownerToken)) {
        return response.status(403).json({ error: 'Only the original writer can edit this post' });
      }

      const properties = buildQuestionProperties(schema, {
        category,
        contact,
        content,
        name,
        title,
      });

      await notionRequest(`/pages/${questionId}`, {
        token,
        method: 'PATCH',
        body: { properties },
      });
      clearQuestionCaches();

      const updatedPage = await notionRequest(`/pages/${questionId}`, { token });

      return response.status(200).json({
        ok: true,
        question: {
          ...mapPageToQuestion(updatedPage, 0),
          canEdit: true,
        },
      });
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Community update failed',
      });
    }
  }

  if (request.method === 'DELETE') {
    const mode = String(body?.mode ?? 'post').trim();
    const ownerToken = authenticatedOwnerToken;

    try {
      if (mode === 'comment') {
        const commentId = String(body?.commentId ?? '').trim();
        if (!commentId) return response.status(400).json({ error: 'Comment ID is required' });

        if (ownerToken) {
          const block = await notionRequest(`/blocks/${commentId}`, { token });
          const comment = parseCommentBlock(block);
          if (comment?.ownerToken === ownerToken) {
            await notionRequest(`/blocks/${commentId}`, {
              token,
              method: 'PATCH',
              body: { archived: true },
            });
            clearQuestionCaches();
            return response.status(200).json({ ok: true });
          }
        }

        const adminUser = await requireAdminUser(request, response);
        if (!adminUser) return null;

        await notionRequest(`/blocks/${commentId}`, {
          token,
          method: 'PATCH',
          body: { archived: true },
        });
        clearQuestionCaches();
        return response.status(200).json({ ok: true });
      }

      const questionId = String(body?.questionId ?? '').trim();
      if (!questionId) return response.status(400).json({ error: 'Question ID is required' });

      if (ownerToken) {
        const blocks = await loadPageBlocks({ pageId: questionId, token });
        if (pageCanEdit(blocks, ownerToken)) {
          await notionRequest(`/pages/${questionId}`, {
            token,
            method: 'PATCH',
            body: { archived: true },
          });
          clearQuestionCaches();
          return response.status(200).json({ ok: true });
        }
      }

      const adminUser = await requireAdminUser(request, response);
      if (!adminUser) return null;

      await notionRequest(`/pages/${questionId}`, {
        token,
        method: 'PATCH',
        body: { archived: true },
      });
      clearQuestionCaches();
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
    const name = authenticatedAuthorName;
    const content = String(body?.content ?? '').trim();
    const ownerToken = authenticatedOwnerToken;

    if (!questionId || !content) {
      return response.status(400).json({ error: 'Question ID and comment content are required' });
    }

    const comment = {
      name,
      content,
      date: new Date().toISOString().slice(0, 10),
      ownerToken,
    };

    try {
      const appended = await notionRequest(`/blocks/${questionId}/children`, {
        token,
        method: 'PATCH',
        body: {
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: richTextPayload(`${COMMENT_PREFIX}${JSON.stringify(comment)}`),
              },
            },
          ],
        },
      });
      comment.id = appended?.results?.[0]?.id;
      clearQuestionCaches();
    } catch (error) {
      return sendNotionError(response, {
        error,
        fallbackMessage: 'Comment submission failed',
      });
    }

    return response.status(200).json({ ok: true, comment: sanitizeComment(comment, ownerToken) });
  }

  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const name = authenticatedAuthorName;
  const contact = String(body?.contact ?? '').trim();
  const category = String(body?.category ?? '').trim() || '자유글';
  const ownerToken = authenticatedOwnerToken;

  if (!title || !content) {
    return response.status(400).json({ error: 'Title and content are required' });
  }

  const properties = buildQuestionProperties(schema, {
    category,
    contact,
    content,
    name,
    title,
  }, { includeDate: true });

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
        children: ownerToken ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: richTextPayload(`${OWNER_PREFIX}${ownerToken}`),
            },
          },
        ] : [],
      },
    });
    clearQuestionCaches();
  } catch (error) {
    return sendNotionError(response, {
      error,
      fallbackMessage: 'Question submission failed',
    });
  }

  return response.status(200).json({ ok: true });
}
