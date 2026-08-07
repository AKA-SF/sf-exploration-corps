import { timingSafeEqual } from 'node:crypto';

const ALADIN_PROVIDER = 'ALADIN';
const MAX_BATCH_SIZE = 50;
const ALADIN_LIST_ENDPOINT = 'https://www.aladin.co.kr/ttb/api/ItemList.aspx';

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function httpsUrl(value) {
  const text = cleanText(value);
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function validDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function validIsbn13(value) {
  const digits = cleanText(value).replace(/-/g, '');
  return /^\d{13}$/.test(digits) ? digits : null;
}

export function normalizeAladinNewRelease(item, { fetchedAt = new Date().toISOString() } = {}) {
  const sourceExternalId = String(item?.itemId ?? '').trim();
  const title = cleanText(item?.title);
  const author = cleanText(item?.author);
  const publisher = cleanText(item?.publisher);
  const releaseDate = validDate(item?.pubDate);
  const sourceUrl = httpsUrl(item?.link);
  const imageUrl = httpsUrl(item?.cover);
  const description = cleanText(item?.description).slice(0, 500);

  if (!sourceExternalId) throw new Error('itemId is required');
  if (!title) throw new Error('title is required');
  if (!author) throw new Error('author is required');
  if (!publisher) throw new Error('publisher is required');
  if (!releaseDate) throw new Error('pubDate is required');
  if (!sourceUrl) throw new Error('link is required');
  if (!description) throw new Error('description is required');

  return {
    source_provider: ALADIN_PROVIDER,
    source_external_id: sourceExternalId,
    isbn13: validIsbn13(item?.isbn13),
    title,
    author_text: author,
    publisher_text: publisher,
    kind: releaseDate > fetchedAt.slice(0, 10) ? 'UPCOMING' : 'NEW_RELEASE',
    media_type: 'NOVEL',
    summary: description,
    source_name: '알라딘 SF 신간 API',
    source_url: sourceUrl,
    image_url: imageUrl,
    image_alt: `${title} 표지`,
    cover_rights_status: 'UNVERIFIED',
    release_date: releaseDate,
    publication_status: 'DRAFT',
    published_at: null,
    automation_first_seen_at: fetchedAt,
    automation_last_seen_at: fetchedAt,
    source_snapshot: {
      category_name: cleanText(item?.categoryName),
      description,
      fetched_at: fetchedAt,
    },
  };
}

export function normalizeAladinNewReleaseBatch(items, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), MAX_BATCH_SIZE);
  const drafts = [];
  const rejected = [];

  for (const item of Array.isArray(items) ? items.slice(0, limit) : []) {
    try {
      drafts.push(normalizeAladinNewRelease(item, options));
    } catch (error) {
      rejected.push({ itemId: item?.itemId ?? null, reason: error.message });
    }
  }

  return { drafts, rejected };
}

export function isAuthorizedCronRequest(request, secret) {
  if (!secret) return false;
  const actual = request?.headers?.authorization || request?.headers?.Authorization || '';
  const expected = `Bearer ${secret}`;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function fetchAladinNewReleases({ apiKey, limit = 20, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('Aladin API is not configured');
  const maxResults = Math.min(Math.max(Number(limit) || 20, 1), MAX_BATCH_SIZE);
  const params = new URLSearchParams({
    ttbkey: apiKey,
    QueryType: 'ItemNewAll',
    MaxResults: String(maxResults),
    start: '1',
    SearchTarget: 'Book',
    CategoryId: '50930',
    Cover: 'Big',
    output: 'js',
    Version: '20131101',
  });
  const upstream = await fetchImpl(`${ALADIN_LIST_ENDPOINT}?${params.toString()}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!upstream.ok) throw new Error('Aladin new-release lookup failed');
  const text = (await upstream.text()).trim().replace(/;$/, '');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Aladin returned an invalid response');
  }
  if (data?.errorCode != null || data?.errorMessage) {
    throw new Error('Aladin upstream rejected the request');
  }
  const totalValue = data?.totalResults;
  const totalResults = typeof totalValue === 'number'
    ? totalValue
    : (typeof totalValue === 'string' && /^\d+$/.test(totalValue) ? Number(totalValue) : Number.NaN);
  if (
    !data
    || Array.isArray(data)
    || !Array.isArray(data.item)
    || !Number.isSafeInteger(totalResults)
    || totalResults < 0
  ) {
    throw new Error('Aladin upstream returned an invalid payload');
  }
  return {
    items: data.item,
    totalResults,
  };
}

export async function importAladinNewReleaseDrafts({
  supabaseUrl,
  serviceRoleKey,
  drafts,
  fetchImpl = fetch,
}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Draft import is not configured');
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { created: 0, duplicates: 0, received: 0 };
  }
  const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/import_aladin_sf_discovery_drafts`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_items: drafts }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Draft import failed');
  return response.json();
}
