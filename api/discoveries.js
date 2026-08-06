import { supabaseRpcRequest } from './_supabaseRest.js';

const ALLOWED_KINDS = new Set(['NEW_RELEASE', 'UPCOMING', 'EDITOR_PICK']);
const ALLOWED_MEDIA_TYPES = new Set(['NOVEL', 'FILM', 'SERIES', 'GAME', 'ANIMATION', 'OTHER']);
const PUBLIC_CACHE = 'public, s-maxage=300, stale-while-revalidate=3600';
const PRIVATE_NO_STORE = 'private, no-store';

function setPublicCache(response) {
  response.setHeader('Cache-Control', PUBLIC_CACHE);
}

function setNoStore(response) {
  response.setHeader('Cache-Control', PRIVATE_NO_STORE);
}

function optionalFilter(value, allowed) {
  if (!value || value === 'ALL') return null;
  return allowed.has(value) ? value : null;
}

export async function loadPublishedDiscoveries({ limit = 24, offset = 0, kind = null, mediaType = null } = {}) {
  return supabaseRpcRequest('get_published_sf_discoveries', {
    body: {
      p_kind: optionalFilter(kind, ALLOWED_KINDS),
      p_limit: Math.min(Math.max(Number(limit) || 24, 1), 60),
      p_media_type: optionalFilter(mediaType, ALLOWED_MEDIA_TYPES),
      p_offset: Math.max(Number(offset) || 0, 0),
    },
  });
}

export async function loadPublishedDiscovery(slug) {
  const rows = await supabaseRpcRequest('get_published_sf_discovery', {
    body: { p_slug: String(slug ?? '').trim() },
  });
  return Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    setNoStore(response);
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const requestUrl = new URL(request.url ?? '/api/discoveries', 'https://sf-explorer.net');
  const slug = requestUrl.searchParams.get('slug');

  if (slug !== null) {
    if (!/^[a-z0-9][a-z0-9-]{1,119}$/.test(slug)) {
      setNoStore(response);
      return response.status(400).json({ error: 'A valid discovery slug is required' });
    }

    try {
      const discovery = await loadPublishedDiscovery(slug);
      if (!discovery) {
        setNoStore(response);
        return response.status(404).json({ error: 'Published SF discovery not found' });
      }
      setPublicCache(response);
      return response.status(200).json({ discovery });
    } catch (error) {
      setNoStore(response);
      return response.status(error.status || 503).json({
        error: 'Published SF discovery is temporarily unavailable',
      });
    }
  }

  try {
    const discoveries = await loadPublishedDiscoveries({
      kind: requestUrl.searchParams.get('kind'),
      limit: requestUrl.searchParams.get('limit'),
      mediaType: requestUrl.searchParams.get('mediaType'),
      offset: requestUrl.searchParams.get('offset'),
    });
    setPublicCache(response);
    return response.status(200).json({ discoveries: Array.isArray(discoveries) ? discoveries : [] });
  } catch (error) {
    setNoStore(response);
    return response.status(error.status || 503).json({
      error: 'Published SF discoveries are temporarily unavailable',
    });
  }
}
