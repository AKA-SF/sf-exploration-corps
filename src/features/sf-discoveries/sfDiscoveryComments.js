import { getSupabaseClient } from '../../lib/getSupabaseClient';

async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallbackMessage);
  return data;
}

export async function fetchDiscoveryComments(discoveryId, { signal } = {}) {
  const response = await fetch(`/api/discoveries?commentsFor=${encodeURIComponent(discoveryId)}`, {
    cache: 'no-store',
    signal,
  });
  const data = await parseResponse(response, '댓글을 불러오지 못했습니다.');
  return Array.isArray(data.comments) ? data.comments : [];
}

export async function createDiscoveryComment({ content, discoveryId }) {
  const supabase = await getSupabaseClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: {} };
  const token = data.session?.access_token;
  if (!token) throw new Error('로그인 후 댓글을 남길 수 있습니다.');

  const response = await fetch('/api/discoveries', {
    body: JSON.stringify({ content, discoveryId }),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const payload = await parseResponse(response, '댓글을 저장하지 못했습니다.');
  return payload.comment;
}
