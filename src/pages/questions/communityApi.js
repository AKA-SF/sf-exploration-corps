import { getSupabaseClient } from '../../lib/getSupabaseClient';

const COMMUNITY_API_PATH = '/api/questions';

export async function getCommunityAuthHeaders() {
  const supabase = await getSupabaseClient();
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toQueryString(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseCommunityResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.notion?.message || data?.error || fallbackMessage);
  }
  return data;
}

export async function requestCommunityApi({
  auth = false,
  body,
  errorMessage = '커뮤니티 요청에 실패했습니다.',
  method = 'GET',
  query,
} = {}) {
  const authHeaders = auth ? await getCommunityAuthHeaders() : {};
  const hasBody = body !== undefined;
  const response = await fetch(`${COMMUNITY_API_PATH}${toQueryString(query)}`, {
    cache: 'no-store',
    method,
    headers: hasBody
      ? { 'Content-Type': 'application/json', ...authHeaders }
      : authHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  return parseCommunityResponse(response, errorMessage);
}

export function fetchCommunityQuestions({ auth = false, cursor = '', pageSize = 40, ...query } = {}) {
  return requestCommunityApi({
    auth,
    errorMessage: 'Question archive unavailable',
    query: { ...query, cursor, pageSize },
  });
}

export function fetchCommunityQuestionDetail({ id, ownerToken = '' }) {
  return requestCommunityApi({
    auth: true,
    errorMessage: 'Question detail unavailable',
    query: { id, ownerToken },
  });
}

export function createCommunityQuestion(body) {
  return requestCommunityApi({
    auth: true,
    body,
    errorMessage: '저장에 실패했습니다.',
    method: 'POST',
  });
}

export function createCommunityComment(body) {
  return requestCommunityApi({
    auth: true,
    body: { mode: 'comment', ...body },
    errorMessage: '댓글 저장에 실패했습니다.',
    method: 'POST',
  });
}

export function updateCommunityQuestion(body) {
  return requestCommunityApi({
    auth: true,
    body: { mode: 'post', ...body },
    errorMessage: '글 수정에 실패했습니다.',
    method: 'PATCH',
  });
}

export function deleteCommunityQuestion(body) {
  return requestCommunityApi({
    auth: true,
    body: { mode: 'post', ...body },
    errorMessage: '글 삭제에 실패했습니다.',
    method: 'DELETE',
  });
}

export function updateCommunityComment(body) {
  return requestCommunityApi({
    auth: true,
    body: { mode: 'comment', ...body },
    errorMessage: '댓글 수정에 실패했습니다.',
    method: 'PATCH',
  });
}

export function deleteCommunityComment(body) {
  return requestCommunityApi({
    auth: true,
    body: { mode: 'comment', ...body },
    errorMessage: '댓글 삭제에 실패했습니다.',
    method: 'DELETE',
  });
}
