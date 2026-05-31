const ALADIN_LOOKUP_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const ALADIN_SEARCH_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';
const COVER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_COVER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const coverState = globalThis.__sfWorksAladinCoverCache ??= {
  coverCache: new Map(),
  pendingCovers: new Map(),
};

function getAladinItemId(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    return url.searchParams.get('ItemId')
      ?? url.searchParams.get('itemId')
      ?? url.searchParams.get('itemid')
      ?? url.searchParams.get('ItemID')
      ?? url.pathname.match(/\/(\d+)(?:\D*)$/)?.[1]
      ?? '';
  } catch {
    return link.match(/itemid=(\d+)/i)?.[1] ?? link.match(/ItemId=(\d+)/i)?.[1] ?? link.match(/\/(\d+)(?:\D*)$/)?.[1] ?? '';
  }
}

function normalizeCoverUrl(cover) {
  return cover ? cover.replace('coversum', 'cover200') : '';
}

function getCoverCacheKey(work) {
  return [
    getAladinItemId(work.link),
    work.link,
    work.title,
    work.subtitle,
  ].filter(Boolean).join('|').toLowerCase();
}

function getPrimaryAuthor(subtitle = '') {
  return subtitle
    .split(' / ')[0]
    ?.split(',')
    ?.map(part => part.trim())
    ?.filter(Boolean)?.[0] ?? '';
}

async function resolveAladinLink(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    if (!/aladin\.(kr|co\.kr)$/i.test(url.hostname.replace(/^www\./, ''))) return link;

    const upstream = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 SF Exploration Archive Cover Resolver',
      },
    });

    return upstream.url || link;
  } catch {
    return link;
  }
}

async function readAladinJson(endpoint, params) {
  const upstream = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 SF Exploration Archive',
    },
  });
  if (!upstream.ok) return null;
  const text = await upstream.text();
  return JSON.parse(text.trim().replace(/;$/, ''));
}

function scoreAladinMatch(item, work) {
  const title = work.title?.replace(/\s/g, '').toLowerCase() ?? '';
  const itemTitle = item.title?.replace(/\s/g, '').toLowerCase() ?? '';
  const author = getPrimaryAuthor(work.subtitle).toLowerCase();
  const itemAuthor = item.author?.toLowerCase() ?? '';
  const publisher = work.subtitle?.split(' / ')?.[1]?.toLowerCase() ?? '';
  const itemPublisher = item.publisher?.toLowerCase() ?? '';

  let score = 0;
  if (itemTitle === title) score += 80;
  else if (itemTitle.includes(title) || title.includes(itemTitle)) score += 45;
  if (author && (itemAuthor.includes(author) || author.includes(itemAuthor.split(',')[0]?.trim() ?? ''))) score += 30;
  if (publisher && itemPublisher.includes(publisher)) score += 12;
  return score;
}

async function searchAladinCover(work, apiKey, query, queryType = 'Title') {
  if (!query) return '';

  const searchParams = new URLSearchParams({
    ttbkey: apiKey,
    Query: query,
    QueryType: queryType,
    MaxResults: '10',
    start: '1',
    SearchTarget: 'Book',
    Cover: 'Big',
    output: 'js',
    Version: '20131101',
  });

  try {
    const data = await readAladinJson(ALADIN_SEARCH_ENDPOINT, searchParams);
    const items = data?.item ?? [];
    const matched = [...items]
      .sort((a, b) => scoreAladinMatch(b, work) - scoreAladinMatch(a, work))[0];
    return normalizeCoverUrl(matched?.cover);
  } catch {
    return '';
  }
}

async function fetchAladinCover(work, apiKey) {
  const { link, title, subtitle } = work;
  if (!apiKey) return '';
  const resolvedLink = await resolveAladinLink(link);
  const itemId = getAladinItemId(link) || getAladinItemId(resolvedLink);

  if (itemId) {
    const params = new URLSearchParams({
      ttbkey: apiKey,
      ItemId: itemId,
      ItemIdType: 'ItemId',
      Cover: 'Big',
      output: 'js',
      Version: '20131101',
    });

    try {
      const data = await readAladinJson(ALADIN_LOOKUP_ENDPOINT, params);
      const cover = normalizeCoverUrl(data.item?.[0]?.cover);
      if (cover) return cover;
    } catch {
      // Fall through to title search below.
    }
  }

  if (!title || !apiKey) return '';

  const author = getPrimaryAuthor(subtitle);
  return await searchAladinCover(work, apiKey, title, 'Title')
    || await searchAladinCover(work, apiKey, [title, author].filter(Boolean).join(' '), 'Keyword')
    || await searchAladinCover(work, apiKey, title, 'Keyword');
}

export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function getCachedAladinCover(work, apiKey) {
  if (!apiKey) return '';

  const cacheKey = getCoverCacheKey(work);
  const cached = coverState.coverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.cover;

  if (coverState.pendingCovers.has(cacheKey)) {
    return coverState.pendingCovers.get(cacheKey);
  }

  const promise = fetchAladinCover(work, apiKey)
    .then(cover => {
      coverState.coverCache.set(cacheKey, {
        cover,
        expiresAt: Date.now() + (cover ? COVER_CACHE_TTL_MS : EMPTY_COVER_CACHE_TTL_MS),
      });
      return cover;
    })
    .finally(() => {
      coverState.pendingCovers.delete(cacheKey);
    });

  coverState.pendingCovers.set(cacheKey, promise);
  return promise;
}
