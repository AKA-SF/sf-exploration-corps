import { supabaseRpcRequest } from './_supabaseRest.js';

const ALLOWED_KINDS = new Set(['NEW_RELEASE', 'UPCOMING', 'EDITOR_PICK']);
const ALLOWED_MEDIA_TYPES = new Set(['NOVEL', 'FILM', 'SERIES', 'GAME', 'ANIMATION', 'OTHER']);

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

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const requestUrl = new URL(request.url ?? '/api/discoveries', 'https://sf-explorer.net');
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  try {
    const discoveries = await loadPublishedDiscoveries({
      kind: requestUrl.searchParams.get('kind'),
      limit: requestUrl.searchParams.get('limit'),
      mediaType: requestUrl.searchParams.get('mediaType'),
      offset: requestUrl.searchParams.get('offset'),
    });
    return response.status(200).json({ discoveries: Array.isArray(discoveries) ? discoveries : [] });
  } catch (error) {
    return response.status(error.status || 503).json({
      error: 'Published SF discoveries are temporarily unavailable',
      message: error.message,
    });
  }
}
