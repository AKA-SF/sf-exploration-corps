const COMMUNITY_QUESTIONS_CACHE_TTL_MS = 20 * 1000;
const communityQuestionsCache = new Map();

export function clearCommunityQuestionsCache() {
  communityQuestionsCache.clear();
}

export function fetchCachedCommunityQuestions(
  key,
  loader,
  ttlMs = COMMUNITY_QUESTIONS_CACHE_TTL_MS,
) {
  const now = Date.now();
  const current = communityQuestionsCache.get(key);
  if (current?.value !== undefined && current.expiresAt > now) {
    return Promise.resolve(current.value);
  }
  if (current?.pending) return current.pending;

  const pending = Promise.resolve()
    .then(loader)
    .then(value => {
      if (communityQuestionsCache.get(key)?.pending === pending) {
        communityQuestionsCache.set(key, {
          expiresAt: Date.now() + ttlMs,
          pending: null,
          value,
        });
      }
      return value;
    })
    .catch(error => {
      if (communityQuestionsCache.get(key)?.pending === pending) {
        communityQuestionsCache.delete(key);
      }
      throw error;
    });

  communityQuestionsCache.set(key, {
    expiresAt: 0,
    pending,
    value: current?.value,
  });
  return pending;
}
