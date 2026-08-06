import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const ADMIN_ACCESS_COOKIE = '__Host-sf_admin_gate';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url');
}

export async function hashAdminPassword(password, { salt = randomBytes(16) } = {}) {
  const derived = await scrypt(String(password), salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    p: SCRYPT_P,
    r: SCRYPT_R,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, encode(salt), encode(derived)].join('$');
}

function parseAdminPasswordHash(encodedHash) {
  const segments = String(encodedHash ?? '').split('$');
  if (segments.length !== 6) return null;
  const [algorithm, n, r, p, saltValue, digestValue] = segments;
  if (algorithm !== 'scrypt' || !saltValue || !digestValue) return null;

  const costN = Number(n);
  const blockSize = Number(r);
  const parallelization = Number(p);
  if (costN !== SCRYPT_N || blockSize !== SCRYPT_R || parallelization !== SCRYPT_P) return null;

  try {
    const salt = decode(saltValue);
    const expected = decode(digestValue);
    if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return null;
    if (encode(salt) !== saltValue || encode(expected) !== digestValue) return null;
    return { blockSize, costN, expected, parallelization, salt };
  } catch {
    return null;
  }
}

export function isValidAdminPasswordHash(encodedHash) {
  return Boolean(parseAdminPasswordHash(encodedHash));
}

export async function verifyAdminPassword(password, encodedHash) {
  const parsed = parseAdminPasswordHash(encodedHash);
  if (!parsed) return false;

  try {
    const actual = await scrypt(String(password), parsed.salt, parsed.expected.length, {
      N: parsed.costN,
      p: parsed.parallelization,
      r: parsed.blockSize,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, parsed.expected);
  } catch {
    return false;
  }
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function isValidSessionSecret(secret) {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

function sessionConfigurationError() {
  const error = new Error('Admin access session secret is not configured securely');
  error.status = 503;
  return error;
}

export function createAdminAccessSession({ expiresAt, sessionVersion, userId }, secret) {
  if (!isValidSessionSecret(secret)) throw sessionConfigurationError();
  const payload = encode(JSON.stringify({ expiresAt, sessionVersion, userId }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminAccessSessionToken(token, secret, { now = Date.now() } = {}) {
  if (!token || !isValidSessionSecret(secret)) return null;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(decode(payload).toString('utf8'));
    if (!parsed.userId || !Number.isSafeInteger(parsed.sessionVersion) || parsed.expiresAt <= now) return null;
    return {
      expiresAt: parsed.expiresAt,
      sessionVersion: parsed.sessionVersion,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}

export function getAdminAccessSessionSecret() {
  const secret = process.env.ADMIN_ACCESS_SESSION_SECRET || '';
  return isValidSessionSecret(secret) ? secret : '';
}

export function createSessionForUser(userId, sessionVersion, secret = getAdminAccessSessionSecret()) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  return {
    expiresAt,
    token: createAdminAccessSession({ expiresAt, sessionVersion, userId }, secret),
  };
}

export function serializeAdminAccessCookie(token, maxAgeSeconds = SESSION_DURATION_MS / 1000) {
  return `${ADMIN_ACCESS_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeSeconds)}`;
}

export function clearAdminAccessCookie() {
  return `${ADMIN_ACCESS_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function readAdminAccessCookie(request) {
  const cookieHeader = request.headers.cookie || request.headers.Cookie || '';
  const value = cookieHeader
    .split(';')
    .map(part => part.trim().split('='))
    .find(([key]) => key === ADMIN_ACCESS_COOKIE)?.slice(1).join('=');
  return value ? decodeURIComponent(value) : '';
}

function normalizeOrigin(value, defaultProtocol = '') {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const url = new URL(candidate.includes('://') ? candidate : `${defaultProtocol}${candidate}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

export function getAllowedAdminAccessOrigins() {
  const configured = String(process.env.ADMIN_ACCESS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => normalizeOrigin(value))
    .filter(Boolean);
  const vercelOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].map(value => normalizeOrigin(value, 'https://')).filter(Boolean);
  const localOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return new Set([...configured, ...vercelOrigins, ...localOrigins]);
}

export function verifySameOrigin(request) {
  const origin = normalizeOrigin(request.headers.origin || request.headers.Origin || '');
  return Boolean(origin && getAllowedAdminAccessOrigins().has(origin));
}

function getServiceConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    const error = new Error('Admin access storage is not configured');
    error.status = 503;
    throw error;
  }
  return { restUrl: `${url.replace(/\/$/, '')}/rest/v1`, serviceRoleKey };
}

async function serviceRequest(path, { body, method = 'GET', prefer = '' } = {}) {
  const { restUrl, serviceRoleKey } = getServiceConfig();
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${restUrl}/${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || 'Admin access storage request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function loadAdminAccessSetting() {
  const rows = await serviceRequest('admin_access_settings?singleton=eq.true&select=password_hash,session_version,updated_at');
  return rows?.[0] ?? null;
}

export async function createAdminAccessSetting(passwordHash, userId) {
  const rows = await serviceRequest('admin_access_settings', {
    body: {
      password_hash: passwordHash,
      session_version: 1,
      singleton: true,
      updated_by: userId,
    },
    method: 'POST',
    prefer: 'return=representation',
  });
  return rows?.[0] ?? loadAdminAccessSetting();
}

export async function rotateAdminAccessPassword({ expectedVersion, passwordHash, userId }) {
  const rows = await serviceRequest(`admin_access_settings?singleton=eq.true&session_version=eq.${expectedVersion}`, {
    body: {
      password_hash: passwordHash,
      session_version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    method: 'PATCH',
    prefer: 'return=representation',
  });
  if (!rows?.[0]) {
    const error = new Error('Admin access setting changed; reload and try again');
    error.status = 409;
    throw error;
  }
  return rows[0];
}

export async function runAdminAccessRateLimit(key, action) {
  return serviceRequest('rpc/admin_access_rate_limit', {
    body: { p_action: action, p_key: key },
    method: 'POST',
  }).then(rows => rows?.[0] ?? { allowed: false, retry_after_seconds: 900 });
}

export function getClientIp(request) {
  const vercelForwardedFor = String(request.headers['x-vercel-forwarded-for'] || '').split(',')[0].trim();
  if (process.env.VERCEL) return (vercelForwardedFor || 'unknown').slice(0, 128);

  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (request.socket?.remoteAddress || forwardedFor || 'unknown').slice(0, 128);
}

export function createRateLimitKey(userId, scope, secret = getAdminAccessSessionSecret()) {
  if (!isValidSessionSecret(secret)) throw sessionConfigurationError();
  return createHash('sha256').update(`${secret}:${userId}:${scope}`).digest('hex');
}

export function isValidNewAdminPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

export async function verifyRequestAdminAccess(request, user, setting = null) {
  const resolvedSetting = setting ?? await loadAdminAccessSetting();
  if (!resolvedSetting) return null;
  const session = verifyAdminAccessSessionToken(
    readAdminAccessCookie(request),
    getAdminAccessSessionSecret(),
  );
  if (!session || session.userId !== user.id || session.sessionVersion !== resolvedSetting.session_version) return null;
  return { session, setting: resolvedSetting };
}
