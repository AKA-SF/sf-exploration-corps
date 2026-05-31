export function getRandomWorks(items, count) {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
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
