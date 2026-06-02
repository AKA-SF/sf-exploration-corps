const cacheStore = globalThis.__sfApiCacheStore ??= new Map();

export function clearApiCache(key) {
  if (key) {
    cacheStore.delete(key);
    return;
  }
  cacheStore.clear();
}

export async function getCachedJson(key, ttlMs, loader, { refresh = false } = {}) {
  const now = Date.now();
  const current = cacheStore.get(key);

  if (!refresh && current?.value && current.expiresAt > now) {
    return { cache: 'HIT', value: current.value };
  }

  if (!refresh && current?.pending) {
    return { cache: 'PENDING', value: await current.pending };
  }

  const pending = Promise.resolve()
    .then(loader)
    .then(value => {
      cacheStore.set(key, {
        expiresAt: Date.now() + ttlMs,
        pending: null,
        value,
      });
      return value;
    })
    .catch(error => {
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    expiresAt: 0,
    pending,
    value: current?.value ?? null,
  });

  return { cache: 'MISS', value: await pending };
}
