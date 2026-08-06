import { requireAdminUser } from './_adminAuth.js';
import {
  clearAdminAccessCookie,
  createAdminAccessSetting,
  createRateLimitKey,
  createSessionForUser,
  getAdminAccessSessionSecret,
  getClientIp,
  hashAdminPassword,
  isValidAdminPasswordHash,
  isValidNewAdminPassword,
  loadAdminAccessSetting,
  rotateAdminAccessPassword,
  runAdminAccessRateLimit,
  serializeAdminAccessCookie,
  verifyAdminPassword,
  verifyRequestAdminAccess,
  verifySameOrigin,
} from './_adminAccess.js';

function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  try {
    return JSON.parse(request.body);
  } catch {
    return {};
  }
}

function sendError(response, status, message, extra = {}) {
  response.status(status).json({ error: message, ...extra });
}

function setSessionCookie(response, userId, sessionVersion) {
  const session = createSessionForUser(userId, sessionVersion);
  response.setHeader('Set-Cookie', serializeAdminAccessCookie(session.token));
  return session.expiresAt;
}

function getRateLimitKeys(request, user) {
  return [
    createRateLimitKey(user.id, 'account'),
    createRateLimitKey('global', `ip:${getClientIp(request)}`),
  ];
}

async function applyRateLimitAction(rateKeys, action) {
  const results = await Promise.all(rateKeys.map(key => runAdminAccessRateLimit(key, action)));
  return results.find(result => !result.allowed) || results[0];
}

async function requireRateLimit(request, response, user) {
  const rateKeys = getRateLimitKeys(request, user);
  const result = await applyRateLimitAction(rateKeys, 'attempt');
  if (!result.allowed) {
    sendError(response, 429, '잠시 후 다시 시도해 주세요.', { retryAfter: result.retry_after_seconds });
    return null;
  }
  return rateKeys;
}

async function unlock(request, response, user) {
  if (!verifySameOrigin(request)) {
    sendError(response, 403, '요청 출처를 확인할 수 없습니다.');
    return;
  }

  const rateKeys = await requireRateLimit(request, response, user);
  if (!rateKeys) return;

  const { password } = readBody(request);
  if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
    sendError(response, 400, '접속 비밀번호를 확인해 주세요.');
    return;
  }

  let setting = await loadAdminAccessSetting();
  const bootstrapHash = process.env.ADMIN_ACCESS_BOOTSTRAP_HASH || '';
  const passwordHash = setting?.password_hash || bootstrapHash;
  if (!passwordHash) {
    sendError(response, 503, '관리자 접속 비밀번호가 아직 준비되지 않았습니다.');
    return;
  }
  if (!isValidAdminPasswordHash(passwordHash)) {
    sendError(response, 503, '관리자 접속 비밀번호 설정을 확인해 주세요.');
    return;
  }

  const valid = await verifyAdminPassword(password, passwordHash);
  if (!valid) {
    sendError(response, 401, '접속 비밀번호가 올바르지 않습니다.');
    return;
  }

  if (!setting) {
    try {
      setting = await createAdminAccessSetting(bootstrapHash, user.id);
    } catch (error) {
      if (error.status !== 409) throw error;
      setting = await loadAdminAccessSetting();
      const stillValid = setting && await verifyAdminPassword(password, setting.password_hash);
      if (!stillValid) {
        sendError(response, 401, '접속 비밀번호가 올바르지 않습니다.');
        return;
      }
    }
  }
  if (!setting) throw new Error('Admin access setting could not be initialized');

  await applyRateLimitAction(rateKeys, 'success');
  const expiresAt = setSessionCookie(response, user.id, setting.session_version);
  response.status(200).json({ expiresAt, unlocked: true });
}

async function readSession(request, response, user) {
  const access = await verifyRequestAdminAccess(request, user);
  if (!access) {
    sendError(response, 401, '관리자 접속 비밀번호가 필요합니다.');
    return;
  }
  response.status(200).json({ expiresAt: access.session.expiresAt, unlocked: true });
}

async function changePassword(request, response, user) {
  if (!verifySameOrigin(request)) {
    sendError(response, 403, '요청 출처를 확인할 수 없습니다.');
    return;
  }

  const access = await verifyRequestAdminAccess(request, user);
  if (!access) {
    sendError(response, 401, '관리자 접속을 다시 확인해 주세요.');
    return;
  }

  const rateKeys = await requireRateLimit(request, response, user);
  if (!rateKeys) return;
  const { currentPassword, newPassword } = readBody(request);
  if (!await verifyAdminPassword(currentPassword, access.setting.password_hash)) {
    sendError(response, 401, '현재 접속 비밀번호가 올바르지 않습니다.');
    return;
  }
  await applyRateLimitAction(rateKeys, 'success');
  if (!isValidNewAdminPassword(newPassword)) {
    sendError(response, 400, '새 접속 비밀번호는 8자 이상 128자 이하로 입력해 주세요.');
    return;
  }
  if (await verifyAdminPassword(newPassword, access.setting.password_hash)) {
    sendError(response, 400, '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.');
    return;
  }

  const passwordHash = await hashAdminPassword(newPassword);
  const setting = await rotateAdminAccessPassword({
    expectedVersion: access.setting.session_version,
    passwordHash,
    userId: user.id,
  });
  const expiresAt = setSessionCookie(response, user.id, setting.session_version);
  response.status(200).json({ expiresAt, passwordChanged: true, unlocked: true });
}

function lock(response) {
  response.setHeader('Set-Cookie', clearAdminAccessCookie());
  response.status(200).json({ unlocked: false });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store');
  const user = await requireAdminUser(request, response);
  if (!user) return;
  if (!getAdminAccessSessionSecret()) {
    sendError(response, 503, '관리자 접속 보안 설정이 아직 준비되지 않았습니다.');
    return;
  }

  try {
    if (request.method === 'GET') {
      await readSession(request, response, user);
      return;
    }
    if (request.method === 'POST') {
      await unlock(request, response, user);
      return;
    }
    if (request.method === 'PATCH') {
      await changePassword(request, response, user);
      return;
    }
    if (request.method === 'DELETE') {
      if (!verifySameOrigin(request)) {
        sendError(response, 403, '요청 출처를 확인할 수 없습니다.');
        return;
      }
      lock(response);
      return;
    }
    response.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    sendError(response, 405, 'Method not allowed');
  } catch (error) {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    sendError(response, status, status === 409
      ? '관리자 접속 설정이 변경되었습니다. 다시 시도해 주세요.'
      : '관리자 접속 설정을 처리하지 못했습니다.');
  }
}
