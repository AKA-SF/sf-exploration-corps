function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hashDailyWork(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getKoreanDiscoveryDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function selectDailyFeaturedWorks(works, discoveryDate, limit = 4) {
  return asArray(works)
    .map((work, index) => {
      const identity = work?.code || work?.id || work?.title || `work-${index}`;
      return {
        identity: String(identity),
        score: hashDailyWork(`${discoveryDate}:${identity}`),
        work,
      };
    })
    .sort((left, right) => left.score - right.score || left.identity.localeCompare(right.identity))
    .slice(0, Math.max(0, limit))
    .map(item => item.work);
}

export function buildHomeFeed({
  concepts = [],
  discoveryDate = getKoreanDiscoveryDate(),
  discoveries = [],
  discoveriesUnavailable = false,
  featuredWorks = null,
  logs = [],
  media = [],
  questions = [],
  sourceStatus = {},
  syncedAt = new Date().toISOString(),
  works = [],
} = {}) {
  const normalizedWorks = asArray(works);
  const normalizedMedia = asArray(media);
  const normalizedConcepts = asArray(concepts);
  const normalizedDiscoveries = asArray(discoveries);
  const normalizedLogs = asArray(logs);
  const normalizedQuestions = asArray(questions);
  const normalizedSourceStatus = {
    concepts: sourceStatus.concepts ?? 'available',
    discoveries: sourceStatus.discoveries ?? (discoveriesUnavailable ? 'unavailable' : 'available'),
    media: sourceStatus.media ?? 'available',
    signals: sourceStatus.signals ?? 'available',
    works: sourceStatus.works ?? 'available',
  };

  return {
    communityQuestions: normalizedQuestions.slice(0, 2),
    counts: {
      concepts: normalizedSourceStatus.concepts === 'available' ? normalizedConcepts.length : null,
      logs: normalizedSourceStatus.signals === 'available' ? normalizedLogs.length : null,
      media: normalizedSourceStatus.media === 'available' ? normalizedMedia.length : null,
      questions: normalizedQuestions.length,
      works: normalizedSourceStatus.works === 'available' ? normalizedWorks.length : null,
    },
    dailyDiscoveryDate: discoveryDate,
    featuredConcepts: normalizedConcepts.slice(0, 2),
    featuredWorks: featuredWorks == null
      ? selectDailyFeaturedWorks(normalizedWorks, discoveryDate)
      : asArray(featuredWorks).slice(0, 4),
    discoveriesUnavailable: Boolean(discoveriesUnavailable),
    latestMedia: normalizedMedia.slice(0, 2),
    latestDiscoveries: normalizedDiscoveries.slice(0, 4),
    latestSignals: normalizedLogs.slice(0, 3),
    sourceStatus: normalizedSourceStatus,
    syncedAt,
  };
}
