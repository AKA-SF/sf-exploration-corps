const cacheStore = globalThis.__sfApiCacheStore ??= new Map();

export function clearApiCache(key) {
  if (key) {
    cacheStore.delete(key);
    return;
  }
  cacheStore.clear();
}

export function clearApiCachePrefix(prefix) {
  if (!prefix) return;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) cacheStore.delete(key);
  }
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
      if (current?.value) {
        cacheStore.set(key, {
          expiresAt: Date.now() + Math.min(ttlMs, 30 * 1000),
          pending: null,
          stale: true,
          value: current.value,
        });
        return current.value;
      }
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    expiresAt: 0,
    pending,
    value: current?.value ?? null,
  });

  const value = await pending;
  const updated = cacheStore.get(key);
  return { cache: updated?.stale ? 'STALE' : 'MISS', value };
}
