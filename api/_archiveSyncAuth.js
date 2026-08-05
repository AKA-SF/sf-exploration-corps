import { timingSafeEqual } from 'node:crypto';

function getHeader(request, name) {
  const value = request?.headers?.[name] ?? request?.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthorizedArchiveRefresh(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const directSecret = getHeader(request, 'x-sf-sync-secret');
  const authorization = getHeader(request, 'authorization');
  const bearer = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';
  return safeEqual(directSecret || bearer, expected);
}

export function requireAuthorizedArchiveRefresh(request, response) {
  if (isAuthorizedArchiveRefresh(request)) return true;
  response.status(403).json({ error: 'Archive refresh is not authorized' });
  return false;
}
