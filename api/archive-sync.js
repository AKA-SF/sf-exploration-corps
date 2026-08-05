import { isAuthorizedArchiveRefresh } from './_archiveSyncAuth.js';
import { loadHomeFeedSnapshot } from './home-feed.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorizedArchiveRefresh(request)) {
    return response.status(401).json({ error: 'Unauthorized archive sync' });
  }

  try {
    const snapshot = await loadHomeFeedSnapshot({ refresh: true });
    return response.status(200).json({
      ok: true,
      cache: snapshot.cache,
      counts: snapshot.value.counts,
      syncedAt: snapshot.value.syncedAt,
    });
  } catch (error) {
    return response.status(503).json({
      ok: false,
      error: 'Archive snapshot refresh failed',
      message: error.message,
    });
  }
}