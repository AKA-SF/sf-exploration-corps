export const initialCounts = {
  activityLogs: 0,
  adminActions: 0,
  memberNotes: 0,
  members: 0,
  radioMessages: 0,
  userBadges: 0,
  workComments: 0,
  workStatuses: 0,
};

export const initialMemberAction = {
  badgeDescription: '',
  badgeId: '',
  badgeTitle: '',
  mp: 10,
  reason: '관리자 MP 부여',
  title: '',
};

export const initialMemberFilters = {
  maxMp: '',
  minMp: '',
  query: '',
  sort: 'recent',
  title: 'all',
};

export const endpointChecks = [
  { key: 'works', label: '작품 아카이브', path: '/api/works?covers=0', pick: data => data.works?.length ?? 0 },
  { key: 'media', label: '미디어 아카이브', path: '/api/media', pick: data => data.media?.length ?? 0 },
  { key: 'concepts', label: 'SF 개념 사전', path: '/api/concepts', pick: data => data.concepts?.length ?? 0 },
  { key: 'questions', label: '커뮤니티 게시판', path: '/api/questions', pick: data => data.questions?.length ?? 0 },
];

export function hasAdminRole(user) {
  const appMetadata = user?.app_metadata ?? {};
  return appMetadata.role === 'admin' || appMetadata.roles?.includes?.('admin');
}

export function formatDate(value) {
  if (!value) return 'UNKNOWN';
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortId(value) {
  return String(value ?? '').slice(0, 8);
}

export function errorMessage(error) {
  return error?.message || '요청 처리 중 문제가 생겼습니다.';
}

export async function getCount(supabase, table, column = 'id') {
  const { count, error } = await supabase
    .from(table)
    .select(column, { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getOptionalCount(supabase, table, column = 'id') {
  const result = await getCount(supabase, table, column).catch(() => 0);
  return result;
}

export async function checkEndpoint({ key, label, path, pick }) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} 연결 실패`);
  const data = await response.json();
  return {
    count: pick(data),
    key,
    label,
    ok: true,
  };
}

export async function getAdminAccessToken(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('관리자 세션을 다시 확인해주세요.');
  return token;
}

function numericFilterPass(value, min, max) {
  const number = Number(value ?? 0);
  const minNumber = min === '' ? null : Number(min);
  const maxNumber = max === '' ? null : Number(max);

  if (minNumber !== null && number < minNumber) return false;
  if (maxNumber !== null && number > maxNumber) return false;
  return true;
}

export function filterMembers(members, filters) {
  const query = filters.query.trim().toLowerCase();
  const filtered = members.filter(member => {
    const text = [
      member.nickname,
      member.title,
      member.id,
    ].filter(Boolean).join(' ').toLowerCase();

    return (!query || text.includes(query))
      && (filters.title === 'all' || member.title === filters.title)
      && numericFilterPass(member.mileage, filters.minMp, filters.maxMp);
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'mp-desc') return (b.mileage ?? 0) - (a.mileage ?? 0);
    if (filters.sort === 'mp-asc') return (a.mileage ?? 0) - (b.mileage ?? 0);
    if (filters.sort === 'name') return String(a.nickname ?? '').localeCompare(String(b.nickname ?? ''), 'ko');
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}
