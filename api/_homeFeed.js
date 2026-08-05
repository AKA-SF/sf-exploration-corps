function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildHomeFeed({
  concepts = [],
  discoveries = [],
  discoveriesUnavailable = false,
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
    featuredConcepts: normalizedConcepts.slice(0, 2),
    featuredWorks: normalizedWorks.slice(0, 4),
    discoveriesUnavailable: Boolean(discoveriesUnavailable),
    latestMedia: normalizedMedia.slice(0, 2),
    latestDiscoveries: normalizedDiscoveries.slice(0, 3),
    latestSignals: normalizedLogs.slice(0, 3),
    sourceStatus: normalizedSourceStatus,
    syncedAt,
  };
}
