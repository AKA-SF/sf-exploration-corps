import { hasAdminRole } from '../../pages/admin/adminUtils';
import { normalizeDiscoveryInput, publishedEditorialWorkflowChanged } from './sfDiscoveryInput';

export { slugifyDiscoveryTitle } from './sfDiscoveryInput';

export const DISCOVERY_KINDS = ['NEW_RELEASE', 'UPCOMING', 'EDITOR_PICK'];
export const DISCOVERY_MEDIA_TYPES = ['NOVEL', 'FILM', 'SERIES', 'GAME', 'ANIMATION', 'OTHER'];

function requireAdmin(user) {
  if (!hasAdminRole(user)) throw new Error('관리자 권한이 필요합니다.');
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
    .insert(normalizeDiscoveryInput(input))
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateDiscovery({ client, current, id, input, user }) {
  requireAdmin(user);
  if (!input.updated_at) throw new Error('게시물의 최신 버전을 확인할 수 없습니다. 목록을 다시 불러와 주세요.');
  if (publishedEditorialWorkflowChanged(current, input)) {
    throw new Error('게시된 글의 유형·편집 원고·승인 단계는 공개 상태에서 바꿀 수 없습니다. 먼저 저장 상태를 초안으로 바꿔 주세요.');
  }
  const { data, error } = await client
    .from('sf_discoveries')
    .update(normalizeDiscoveryInput(input, { preservePublished: true }))
    .eq('id', id)
    .eq('updated_at', input.updated_at)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('다른 관리자가 먼저 수정했습니다. 최신 목록을 불러온 뒤 다시 반영해 주세요.');
  return data;
}

export async function deleteDiscovery({ client, id, updatedAt, user }) {
  requireAdmin(user);
  if (!updatedAt) throw new Error('삭제할 게시물의 최신 버전을 확인할 수 없습니다.');
  const { data, error } = await client
    .from('sf_discoveries')
    .delete()
    .eq('id', id)
    .eq('updated_at', updatedAt)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('다른 관리자가 먼저 수정했습니다. 최신 목록을 불러온 뒤 다시 확인해 주세요.');
}

export async function publishDiscovery({ client, id, updatedAt, user }) {
  requireAdmin(user);
  if (!id || !updatedAt) throw new Error('발행할 게시물의 최신 버전을 확인할 수 없습니다.');
  const { data, error } = await client.rpc('publish_sf_discovery', {
    p_expected_updated_at: updatedAt,
    p_id: id,
  });
  if (error) throw error;
  const published = Array.isArray(data) ? data[0] : data;
  if (!published) throw new Error('게시물을 발행하지 못했습니다.');
  return published;
}
