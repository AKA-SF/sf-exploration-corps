import { hasAdminRole } from '../../pages/admin/adminUtils';

export const DISCOVERY_KINDS = ['NEW_RELEASE', 'UPCOMING', 'EDITOR_PICK'];
export const DISCOVERY_MEDIA_TYPES = ['NOVEL', 'FILM', 'SERIES', 'GAME', 'ANIMATION', 'OTHER'];

export function slugifyDiscoveryTitle(value) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `sf-signal-${Date.now()}`;
}

function requireAdmin(user) {
  if (!hasAdminRole(user)) throw new Error('관리자 권한이 필요합니다.');
}

function normalizeInput(input) {
  const publicationStatus = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(input.publication_status)
    ? input.publication_status
    : 'DRAFT';
  return {
    image_alt: String(input.image_alt ?? '').trim() || null,
    image_url: String(input.image_url ?? '').trim() || null,
    internal_notes: String(input.internal_notes ?? '').trim(),
    is_spoiler: Boolean(input.is_spoiler),
    kind: input.kind,
    media_type: input.media_type,
    publication_status: publicationStatus,
    published_at: publicationStatus === 'PUBLISHED' ? input.published_at || new Date().toISOString() : null,
    release_date: input.release_date || null,
    slug: String(input.slug || slugifyDiscoveryTitle(input.title)).trim(),
    sort_priority: Number(input.sort_priority) || 0,
    source_name: String(input.source_name ?? '').trim(),
    source_url: String(input.source_url ?? '').trim(),
    summary: String(input.summary ?? '').trim(),
    title: String(input.title ?? '').trim(),
  };
}

export async function listAdminDiscoveries({ client, user }) {
  requireAdmin(user);
  const { data, error } = await client
    .from('sf_discoveries')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDiscovery({ client, input, user }) {
  requireAdmin(user);
  const { data, error } = await client
    .from('sf_discoveries')
    .insert(normalizeInput(input))
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateDiscovery({ client, id, input, user }) {
  requireAdmin(user);
  if (!input.updated_at) throw new Error('게시물의 최신 버전을 확인할 수 없습니다. 목록을 다시 불러와 주세요.');
  const { data, error } = await client
    .from('sf_discoveries')
    .update(normalizeInput(input))
    .eq('id', id)
    .eq('updated_at', input.updated_at)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('다른 관리자가 먼저 수정했습니다. 최신 목록을 불러온 뒤 다시 반영해 주세요.');
  return data;
}

export async function deleteDiscovery({ client, id, user }) {
  requireAdmin(user);
  const { error } = await client.from('sf_discoveries').delete().eq('id', id);
  if (error) throw error;
}
