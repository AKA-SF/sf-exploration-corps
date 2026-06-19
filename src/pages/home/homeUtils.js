const DAILY_SIGNAL_RESET_OFFSET_HOURS = 2; // UTC date after +2h equals KST day starting at 07:00.

export function getDailySignalKey(date = new Date()) {
  return new Date(date.getTime() + DAILY_SIGNAL_RESET_OFFSET_HOURS * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function getNextDailySignalResetDelay(date = new Date()) {
  const kstNow = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const nextResetKst = new Date(kstNow);
  nextResetKst.setUTCHours(7, 0, 0, 0);
  if (kstNow >= nextResetKst) {
    nextResetKst.setUTCDate(nextResetKst.getUTCDate() + 1);
  }
  const nextResetUtc = nextResetKst.getTime() - 9 * 60 * 60 * 1000;
  return Math.max(nextResetUtc - date.getTime(), 1000);
}

function hashString(value) {
  return String(value ?? '').split('').reduce((hash, char) => (
    ((hash << 5) - hash + char.charCodeAt(0)) | 0
  ), 0);
}

function seededScore(seed, value) {
  return Math.abs(hashString(`${seed}:${value}`));
}

export function getDailyShuffledItems(items, seed, identity = item => item?.code ?? item?.id ?? item?.title ?? '') {
  return [...items]
    .map((item, index) => ({
      item,
      score: seededScore(seed, `${identity(item) || index}:${index}`),
    }))
    .sort((a, b) => a.score - b.score)
    .map(entry => entry.item);
}

export function getRandomWorks(items, count, seed = '') {
  const source = seed ? getDailyShuffledItems(items, seed) : [...items].sort(() => Math.random() - 0.5);
  return source.slice(0, count);
}

export function getDailyItem(items, seed, identity) {
  let selected = null;
  let selectedScore = Infinity;

  items.forEach((item, index) => {
    const itemIdentity = identity?.(item) ?? item?.code ?? item?.id ?? item?.title ?? '';
    const score = seededScore(seed, `${itemIdentity || index}:${index}`);
    if (score < selectedScore) {
      selected = item;
      selectedScore = score;
    }
  });

  return selected;
}

export function mergeWorksByCode(currentWorks, incomingWorks) {
  const currentByCode = new Map(currentWorks.map(work => [work.code, work]));
  return incomingWorks.map(work => ({
    ...(currentByCode.get(work.code) ?? {}),
    ...work,
  }));
}

export function formatTimestamp(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\s/g, ' ');
}

export function normalizeMediaCategory(category = '') {
  const normalized = category.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('작가') || normalized.includes('인터뷰')) return 'SF 작가 인터뷰';
  if (normalized.includes('미디어') || normalized.includes('media') || normalized.includes('콘텐츠') || normalized.includes('자료')) return 'SF 관련 미디어';
  if (normalized.includes('기사') || normalized.includes('article') || normalized.includes('news')) return 'SF 관련 미디어';
  if (normalized.includes('고전') && (normalized.includes('영화') || normalized.includes('sf'))) return '고전 SF 영화';
  return category;
}

function getMediaSortTime(item) {
  if (item.date) {
    const timestamp = Date.parse(item.date);
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  const year = String(item.year ?? '').match(/\d{4}/)?.[0];
  return year ? Date.UTC(Number(year), 11, 31) : 0;
}

export function sortMediaByLatest(items) {
  return [...items].sort((a, b) => getMediaSortTime(b) - getMediaSortTime(a));
}

function formatSourceDomain(hostname) {
  const cleanHost = hostname.replace(/^www\./, '');
  if (cleanHost.includes('wikipedia.org')) return 'Wikipedia';
  if (cleanHost.includes('britannica.com')) return 'Britannica';
  if (cleanHost.includes('sf-encyclopedia.com')) return 'The Encyclopedia of Science Fiction';
  if (cleanHost.includes('namu.wiki')) return 'Namu Wiki';
  if (cleanHost.includes('terms.naver.com')) return 'Naver 지식백과';
  return cleanHost
    .split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function getConceptSource(source, concept) {
  const sourceText = source?.trim() ?? '';
  const url = sourceText.match(/https?:\/\/[^\s)]+/)?.[0];

  if (!url) {
    return {
      href: '',
      label: sourceText,
    };
  }

  try {
    const parsedUrl = new URL(url);
    const domain = formatSourceDomain(parsedUrl.hostname);
    const conceptName = concept.english || concept.term;

    return {
      href: url,
      label: conceptName ? `${domain} - ${conceptName}` : domain,
    };
  } catch {
    return {
      href: '',
      label: sourceText,
    };
  }
}
