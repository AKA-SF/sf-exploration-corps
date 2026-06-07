import { clearApiCache, clearApiCachePrefix, getCachedJson } from './_apiCache.js';
import { supabaseRestRequest } from './_supabaseRest.js';

const CACHE_TABLE = 'public_archive_cache';

function hasServerSupabaseCache() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function isCacheTableMissing(error) {
  const message = `${error?.message ?? ''} ${error?.details?.message ?? ''} ${error?.details?.code ?? ''}`;
  return /public_archive_cache|schema cache|relation .* does not exist|42P01|PGRST/i.test(message);
}

async function readPersistentCache(key, { allowStale = false } = {}) {
  if (!hasServerSupabaseCache()) return null;

  const params = new URLSearchParams();
  params.set('select', 'cache_key,payload,expires_at,updated_at');
  params.set('cache_key', `eq.${key}`);
  params.set('limit', '1');

  try {
    const rows = await supabaseRestRequest(`${CACHE_TABLE}?${params.toString()}`, { service: true });
    const row = rows?.[0];
    if (!row) return null;
    const expiresAt = Date.parse(row.expires_at);
    const isExpired = Number.isNaN(expiresAt) || expiresAt <= Date.now();
    if (isExpired && !allowStale) return null;
    return {
      expired: isExpired,
      payload: row.payload,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    if (isCacheTableMissing(error)) return null;
    return null;
  }
}

async function writePersistentCache(key, value, ttlMs) {
  if (!hasServerSupabaseCache()) return;

  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  try {
    await supabaseRestRequest(CACHE_TABLE, {
      body: {
        cache_key: key,
        expires_at: expiresAt,
        payload: value,
      },
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      service: true,
    });
  } catch {
    // Persistent cache is an optimization only. The API must keep serving data.
  }
}

export async function clearDurableCachePrefix(prefix) {
  clearApiCachePrefix(prefix);
  if (!prefix || !hasServerSupabaseCache()) return;

  const params = new URLSearchParams();
  params.set('cache_key', `like.${prefix}%`);
  try {
    await supabaseRestRequest(`${CACHE_TABLE}?${params.toString()}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
      service: true,
    });
  } catch {
    // Optional cache cleanup. In-memory cache is already cleared.
  }
}

export async function clearDurableCache(key) {
  clearApiCache(key);
  if (!key || !hasServerSupabaseCache()) return;

  const params = new URLSearchParams();
  params.set('cache_key', `eq.${key}`);
  try {
    await supabaseRestRequest(`${CACHE_TABLE}?${params.toString()}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
      service: true,
    });
  } catch {
    // Optional cache cleanup. In-memory cache is already cleared.
  }
}

export async function getDurableCachedJson(key, ttlMs, loader, { refresh = false } = {}) {
  if (!refresh) {
    const persistent = await readPersistentCache(key);
    if (persistent) {
      return { cache: 'DB-HIT', updatedAt: persistent.updatedAt, value: persistent.payload };
    }
  }

  const cached = await getCachedJson(key, ttlMs, async () => {
    try {
      const value = await loader();
      await writePersistentCache(key, value, ttlMs);
      return value;
    } catch (error) {
      const stale = await readPersistentCache(key, { allowStale: true });
      if (stale?.payload) {
        return stale.payload;
      }
      throw error;
    }
  }, { refresh });

  return cached;
}
