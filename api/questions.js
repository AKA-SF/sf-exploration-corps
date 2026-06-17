import { clearApiCachePrefix, getCachedJson } from './_apiCache.js';
import { getOptionalUser, requireAdminUser, requireAuthenticatedUser } from './_adminAuth.js';
import { supabaseRestRequest, supabaseRpcRequest } from './_supabaseRest.js';

const DEFAULT_QUESTIONS_PAGE_SIZE = 40;
const COMMUNITY_BODY_MAX_BYTES = 128 * 1024;
const QUESTIONS_LIST_CACHE_TTL_MS = 20 * 1000;
const COMMUNITY_CATEGORIES = ['자유글', '작품추천', '질문', '토론'];

function clearQuestionCaches() {
  clearApiCachePrefix('questions:');
}

function normalizeCommunityCategory(value) {
  const source = String(value ?? '').trim().replace(/\s+/g, '');
  if (!source) return '자유글';
  if (['작품추천', '작품추천글', '추천', '추천글', '작품', '작품추천'].includes(source)) return '작품추천';
  if (['질문', '토론질문', '문의'].includes(source)) return '질문';
  if (['토론', '토론글', '논의'].includes(source)) return '토론';
  if (['자유글', '자유', '커뮤니티', '아카이브제안', '강의/워크숍주제'].includes(source)) return '자유글';
  return COMMUNITY_CATEGORIES.includes(value) ? value : '자유글';
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
  const pageSize = Math.min(Math.max(Number(query?.pageSize) || DEFAULT_QUESTIONS_PAGE_SIZE, 1), 80);
  const offset = Math.max(Number(query?.cursor) || 0, 0);
  return { offset, pageSize };
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function mapPostToQuestion(post, {
  canEdit = false,
  commentCount = 0,
  displayNumber,
  index = 0,
  offset = 0,
} = {}) {
  const fallbackNumber = offset + index + 1;
  const questionNumber = Number.isFinite(Number(displayNumber)) ? Number(displayNumber) : fallbackNumber;
  return {
    id: post.id,
    code: `Q-${String(Math.max(questionNumber, 1)).padStart(3, '0')}`,
    title: post.title || '제목 없음',
    content: post.body || '',
    author: post.author_name || '탐사자',
    contact: '',
    category: normalizeCommunityCategory(post.category),
    status: post.status === 'archived' ? '삭제됨' : '공개',
    date: formatDate(post.created_at),
    attachmentUrl: post.attachment_url || '',
    commentCount,
    views: Number(post.view_count) || 0,
    canEdit,
    createdAt: post.created_at,
  };
}

function mapComment(row, user) {
  return {
    id: row.id,
    name: row.author_name || '탐사자',
    content: row.body || '',
    date: formatDate(row.created_at),
    canEdit: Boolean(user?.id && row.user_id === user.id),
  };
}

function parseJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > COMMUNITY_BODY_MAX_BYTES) {
      const error = new Error('요청 본문이 너무 큽니다.');
      error.status = 413;
      return Promise.reject(error);
    }
    return Promise.resolve(request.body);
  }
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body, 'utf8') > COMMUNITY_BODY_MAX_BYTES) {
      const error = new Error('요청 본문이 너무 큽니다.');
      error.status = 413;
      return Promise.reject(error);
    }
    try {
      return Promise.resolve(JSON.parse(request.body));
    } catch (error) {
      error.status = 400;
      return Promise.reject(error);
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    let rejected = false;
    request.on('data', chunk => {
      if (rejected) return;
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > COMMUNITY_BODY_MAX_BYTES) {
        rejected = true;
        const error = new Error('요청 본문이 너무 큽니다.');
        error.status = 413;
        reject(error);
        request.destroy?.();
      }
    });
    request.on('end', () => {
      if (rejected) return;
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.status = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sanitizeText(value, maxLength = 8000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function isMissingCommunityTable(error) {
  const message = `${error?.message ?? ''} ${error?.details?.message ?? ''} ${error?.details?.code ?? ''}`;
  return /community_posts|community_comments|schema cache|relation .* does not exist|42P01|PGRST/i.test(message);
}

function getCommunitySetupPayload() {
  return {
    error: 'Supabase community tables are not ready. Run supabase/community.sql in Supabase SQL Editor.',
    hasMore: false,
    nextCursor: '',
    questions: [],
    setupRequired: true,
    totalCount: 0,
  };
}

function buildPostQuery({
  admin = false,
  category = '',
  mineOnly = false,
  offset = 0,
  pageSize = DEFAULT_QUESTIONS_PAGE_SIZE,
  user,
} = {}) {
  const params = new URLSearchParams();
  params.set('select', 'id,user_id,author_name,category,title,body,attachment_url,view_count,status,created_at,updated_at');
  params.set('order', 'created_at.desc');
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));

  if (!admin) params.set('status', 'eq.public');
  if (mineOnly && user?.id) params.set('user_id', `eq.${user.id}`);

  const normalizedCategory = normalizeCommunityCategory(category);
  if (category && category !== '전체' && COMMUNITY_CATEGORIES.includes(normalizedCategory)) {
    params.set('category', `eq.${normalizedCategory}`);
  }

  return `community_posts?${params.toString()}`;
}

function buildPostCountQuery({
  admin = false,
  category = '',
  mineOnly = false,
  user,
} = {}) {
  const params = new URLSearchParams();
  params.set('select', 'id');

  if (!admin) params.set('status', 'eq.public');
  if (mineOnly && user?.id) params.set('user_id', `eq.${user.id}`);

  const normalizedCategory = normalizeCommunityCategory(category);
  if (category && category !== '전체' && COMMUNITY_CATEGORIES.includes(normalizedCategory)) {
    params.set('category', `eq.${normalizedCategory}`);
  }

  return `community_posts?${params.toString()}`;
}

async function fetchPostTotalCount(options, request) {
  const rows = await supabaseRestRequest(buildPostCountQuery(options), { request });
  return Array.isArray(rows) ? rows.length : 0;
}

async function fetchCommentCounts(postIds, request) {
  if (!postIds.length) return new Map();

  const params = new URLSearchParams();
  params.set('select', 'post_id');
  params.set('status', 'eq.public');
  params.set('post_id', `in.(${postIds.join(',')})`);

  const comments = await supabaseRestRequest(`community_comments?${params.toString()}`, { request });
  const counts = new Map();
  (comments ?? []).forEach(comment => {
    counts.set(comment.post_id, (counts.get(comment.post_id) || 0) + 1);
  });
  return counts;
}

async function listQuestions(request, response, query) {
  const { offset, pageSize } = getPaginationParams(query);
  const wantsAdminList = query.admin === '1';
  const includeCommentCounts = query.includeCommentCounts === '1';
  const wantsMineOnly = query.mineOnly === '1';

  const adminUser = wantsAdminList ? await requireAdminUser(request, response) : null;
  if (wantsAdminList && !adminUser) return;

  let user = null;
  if (wantsMineOnly) {
    user = await requireAuthenticatedUser(request, response);
    if (!user) return;
  } else if (request.headers.authorization || request.headers.Authorization) {
    user = await getOptionalUser(request);
  }

  const cacheKey = `questions:list:${JSON.stringify({
    admin: wantsAdminList,
    category: query.category || '',
    includeCommentCounts,
    mineOnly: wantsMineOnly,
    offset,
    pageSize,
    userId: wantsMineOnly ? user?.id || '' : '',
  })}`;

  const loader = async () => {
    const listOptions = {
      admin: wantsAdminList,
      category: query.category,
      mineOnly: wantsMineOnly,
      user,
    };
    const [posts, totalCount] = await Promise.all([
      supabaseRestRequest(
        buildPostQuery({
          ...listOptions,
          offset,
          pageSize,
        }),
        { request },
      ),
      fetchPostTotalCount(listOptions, request),
    ]);
    const postIds = (posts ?? []).map(post => post.id);
    const counts = includeCommentCounts || wantsAdminList
      ? await fetchCommentCounts(postIds, request)
      : new Map();
    const questions = (posts ?? []).map((post, index) => mapPostToQuestion(post, {
      canEdit: Boolean(user?.id && post.user_id === user.id),
      commentCount: counts.get(post.id) || 0,
      displayNumber: totalCount - offset - index,
      index,
      offset,
    }));
    const pageLength = (posts ?? []).length;
    const nextOffset = offset + pageLength;
    const hasMore = pageLength > 0 && nextOffset < totalCount;

    return {
      hasMore,
      nextCursor: hasMore ? String(nextOffset) : '',
      questions,
      totalCount,
    };
  };

  const shouldCache = !wantsAdminList
    && !wantsMineOnly
    && !request.headers.authorization
    && !request.headers.Authorization;
  let payload;
  try {
    payload = shouldCache
      ? (await getCachedJson(cacheKey, QUESTIONS_LIST_CACHE_TTL_MS, loader)).value
      : await loader();
  } catch (error) {
    if (isMissingCommunityTable(error)) {
      response.status(200).json(getCommunitySetupPayload());
      return;
    }
    throw error;
  }

  response.status(200).json(payload);
}

async function fetchPostById(id, request) {
  const params = new URLSearchParams();
  params.set('select', 'id,user_id,author_name,category,title,body,attachment_url,view_count,status,created_at,updated_at');
  params.set('id', `eq.${id}`);
  params.set('limit', '1');
  const rows = await supabaseRestRequest(`community_posts?${params.toString()}`, { request });
  return rows?.[0] ?? null;
}

async function fetchCommentsForPost(id, request) {
  const params = new URLSearchParams();
  params.set('select', 'id,post_id,user_id,author_name,body,status,created_at,updated_at');
  params.set('post_id', `eq.${id}`);
  params.set('status', 'eq.public');
  params.set('order', 'created_at.asc');
  return supabaseRestRequest(`community_comments?${params.toString()}`, { request });
}

async function showQuestionDetail(request, response, query) {
  const user = await getOptionalUser(request);
  const post = await fetchPostById(query.id, request);
  if (!post || post.status === 'archived') {
    response.status(404).json({ error: '글을 찾을 수 없습니다.' });
    return;
  }

  try {
    const nextCount = await supabaseRpcRequest('increment_community_post_view', {
      body: { p_post_id: post.id },
      request,
    });
    if (Number.isFinite(Number(nextCount))) post.view_count = Number(nextCount);
  } catch {
    // 조회수 기록은 부가 기능이라 실패해도 글 읽기는 유지합니다.
  }

  const comments = await fetchCommentsForPost(post.id, request);
  const canEdit = Boolean(user?.id && post.user_id === user.id);
  response.status(200).json({
    comments: (comments ?? []).map(comment => mapComment(comment, user)),
    question: mapPostToQuestion(post, {
      canEdit,
      commentCount: comments?.length || 0,
    }),
  });
}

async function createQuestion(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const title = sanitizeText(body.title, 140);
  const content = sanitizeText(body.content, 8000);
  if (!title || !content) {
    response.status(400).json({ error: '글 제목과 글 내용을 입력해주세요.' });
    return;
  }

  const rows = await supabaseRestRequest('community_posts', {
    body: {
      attachment_url: sanitizeText(body.attachmentUrl, 1200) || null,
      author_name: sanitizeText(body.name, 40) || getUserAuthorName(user),
      body: content,
      category: normalizeCommunityCategory(body.category),
      title,
      user_id: user.id,
    },
    method: 'POST',
    prefer: 'return=representation',
    request,
  });

  clearQuestionCaches();
  response.status(201).json({
    ok: true,
    question: mapPostToQuestion(rows?.[0], { canEdit: true }),
  });
}

async function createComment(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const questionId = sanitizeText(body.questionId, 80);
  const content = sanitizeText(body.content, 2000);
  if (!questionId || !content) {
    response.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    return;
  }

  const rows = await supabaseRestRequest('community_comments', {
    body: {
      author_name: sanitizeText(body.name, 40) || getUserAuthorName(user),
      body: content,
      post_id: questionId,
      user_id: user.id,
    },
    method: 'POST',
    prefer: 'return=representation',
    request,
  });

  clearQuestionCaches();
  response.status(201).json({
    comment: mapComment(rows?.[0], user),
    ok: true,
  });
}

async function updateQuestion(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const id = sanitizeText(body.questionId || body.id, 80);
  const title = sanitizeText(body.title, 140);
  const content = sanitizeText(body.content, 8000);
  if (!id || !title || !content) {
    response.status(400).json({ error: '수정할 글 제목과 내용을 입력해주세요.' });
    return;
  }

  const rows = await supabaseRestRequest(`community_posts?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, {
    body: {
      attachment_url: sanitizeText(body.attachmentUrl, 1200) || null,
      body: content,
      category: normalizeCommunityCategory(body.category),
      title,
    },
    method: 'PATCH',
    prefer: 'return=representation',
    request,
  });

  if (!rows?.[0]) {
    response.status(403).json({ error: '수정 권한이 없거나 글을 찾을 수 없습니다.' });
    return;
  }

  clearQuestionCaches();
  response.status(200).json({
    ok: true,
    question: mapPostToQuestion(rows[0], { canEdit: rows[0].user_id === user.id }),
  });
}

async function updateComment(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const id = sanitizeText(body.commentId || body.id, 80);
  const content = sanitizeText(body.content, 2000);
  if (!id || !content) {
    response.status(400).json({ error: '수정할 댓글 내용을 입력해주세요.' });
    return;
  }

  const rows = await supabaseRestRequest(`community_comments?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, {
    body: { body: content },
    method: 'PATCH',
    prefer: 'return=representation',
    request,
  });

  if (!rows?.[0]) {
    response.status(403).json({ error: '수정 권한이 없거나 댓글을 찾을 수 없습니다.' });
    return;
  }

  clearQuestionCaches();
  response.status(200).json({
    comment: mapComment(rows[0], user),
    ok: true,
  });
}

async function archiveQuestion(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const id = sanitizeText(body.questionId || body.id, 80);
  if (!id) {
    response.status(400).json({ error: '삭제할 글을 찾을 수 없습니다.' });
    return;
  }

  const rows = await supabaseRestRequest(`community_posts?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, {
    body: { status: 'archived' },
    method: 'PATCH',
    prefer: 'return=representation',
    request,
  });

  if (!rows?.[0]) {
    response.status(403).json({ error: '삭제 권한이 없거나 글을 찾을 수 없습니다.' });
    return;
  }

  clearQuestionCaches();
  response.status(200).json({ ok: true });
}

async function archiveComment(request, response, body) {
  const user = await requireAuthenticatedUser(request, response);
  if (!user) return;

  const id = sanitizeText(body.commentId || body.id, 80);
  if (!id) {
    response.status(400).json({ error: '삭제할 댓글을 찾을 수 없습니다.' });
    return;
  }

  const rows = await supabaseRestRequest(`community_comments?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, {
    body: { status: 'archived' },
    method: 'PATCH',
    prefer: 'return=representation',
    request,
  });

  if (!rows?.[0]) {
    response.status(403).json({ error: '삭제 권한이 없거나 댓글을 찾을 수 없습니다.' });
    return;
  }

  clearQuestionCaches();
  response.status(200).json({ ok: true });
}

function sendSupabaseError(response, error) {
  if (isMissingCommunityTable(error)) {
    response.status(503).json({
      error: '커뮤니티 Supabase 테이블이 아직 준비되지 않았습니다. supabase/community.sql을 Supabase SQL Editor에서 실행해주세요.',
      setupRequired: true,
    });
    return;
  }

  response.status(error.status || 500).json({
    details: error.details,
    error: error.message || '커뮤니티 요청에 실패했습니다.',
  });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const query = request.query ?? {};

  try {
    if (request.method === 'GET') {
      if (query.id) {
        await showQuestionDetail(request, response, query);
        return;
      }
      await listQuestions(request, response, query);
      return;
    }

    const body = await parseJsonBody(request);
    const mode = body.mode || 'post';

    if (request.method === 'POST') {
      if (mode === 'comment') {
        await createComment(request, response, body);
        return;
      }
      await createQuestion(request, response, body);
      return;
    }

    if (request.method === 'PATCH') {
      if (mode === 'comment') {
        await updateComment(request, response, body);
        return;
      }
      await updateQuestion(request, response, body);
      return;
    }

    if (request.method === 'DELETE') {
      if (mode === 'comment') {
        await archiveComment(request, response, body);
        return;
      }
      await archiveQuestion(request, response, body);
      return;
    }

    response.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    sendSupabaseError(response, error);
  }
}
