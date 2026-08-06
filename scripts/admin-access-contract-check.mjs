import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path) {
  return readFile(path, 'utf8').catch(() => '');
}

function createResponse() {
  return {
    body: null,
    headers: {},
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

test('admin routes share a server-backed access boundary while Supabase admin role remains required', async () => {
  const [app, boundary, auth, endpoint, questions] = await Promise.all([
    read('src/App.jsx'),
    read('src/components/admin/AdminAccessBoundary.jsx'),
    read('api/_adminAuth.js'),
    read('api/admin-access.js'),
    read('api/questions.js'),
  ]);

  assert.match(app, /AdminAccessBoundary/);
  assert.match(app, /const AdminAccessBoundary\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\/components\/admin\/AdminAccessBoundary'\)\)/);
  assert.doesNotMatch(app, /import AdminAccessBoundary from/);
  assert.match(app, /path="\/admin"/);
  assert.match(app, /path="\/admin\/discoveries"/);
  assert.match(boundary, /hasAdminRole\(user\)/);
  assert.match(boundary, /\/api\/admin-access/);
  assert.match(auth, /requireAdminAccess/);
  const authenticatedBoundary = auth.match(/export async function requireAuthenticatedUser[\s\S]+?\n}/)?.[0] || '';
  assert.doesNotMatch(authenticatedBoundary, /error\.message/);
  assert.match(endpoint, /requireAdminUser/);
  assert.match(endpoint, /request\.method === 'GET'/);
  assert.match(endpoint, /request\.method === 'POST'/);
  assert.match(endpoint, /request\.method === 'PATCH'/);
  assert.match(endpoint, /request\.method === 'DELETE'/);
  assert.match(questions, /wantsAdminList\s*\?\s*await requireAdminAccess/);
  const supabaseErrorBoundary = questions.match(/function sendSupabaseError[\s\S]+?\n}/)?.[0] || '';
  assert.doesNotMatch(supabaseErrorBoundary, /error\.message|error\.details|supabase\/community\.sql/i);
});

test('admin access secrets stay server-only and sessions are signed secure cookies', async () => {
  const [access, endpoint, migration, boundary, admin] = await Promise.all([
    read('api/_adminAccess.js'),
    read('api/admin-access.js'),
    read('supabase/migrations/20260806020000_add_admin_access_gate.sql'),
    read('src/components/admin/AdminAccessBoundary.jsx'),
    read('src/pages/Admin.jsx'),
  ]);

  assert.match(access, /scrypt/);
  assert.match(access, /timingSafeEqual/);
  assert.match(access, /createHmac/);
  assert.match(access, /ADMIN_ACCESS_SESSION_SECRET/);
  assert.match(access, /Buffer\.byteLength\([\s\S]+>= 32/);
  assert.match(endpoint, /ADMIN_ACCESS_BOOTSTRAP_HASH/);
  assert.match(endpoint, /isValidAdminPasswordHash\(passwordHash\)/);
  assert.match(access, /ADMIN_ACCESS_ALLOWED_ORIGINS/);
  assert.match(access, /VERCEL_URL/);
  assert.match(access, /x-vercel-forwarded-for/);
  const originGuard = access.match(/export function verifySameOrigin[\s\S]+?\n}/)?.[0] || '';
  assert.doesNotMatch(originGuard, /x-forwarded-host|x-forwarded-proto/);
  assert.match(endpoint, /createRateLimitKey\(user\.id, 'account'/);
  assert.match(endpoint, /createRateLimitKey\('global', `ip:\$\{getClientIp\(request\)\}`/);
  assert.match(endpoint, /Promise\.all\(rateKeys\.map/);
  assert.match(endpoint, /applyRateLimitAction\(rateKeys, 'attempt'\)/);
  assert.doesNotMatch(endpoint, /applyRateLimitAction\(rateKeys, '(?:check|failure)'\)/);
  assert.match(access, /HttpOnly/);
  assert.match(access, /Secure/);
  assert.match(access, /SameSite=Strict/);
  assert.match(access, /Path=\//);
  assert.doesNotMatch(boundary, /ADMIN_ACCESS_BOOTSTRAP_HASH|VITE_ADMIN|localStorage/);
  assert.doesNotMatch(admin, /ADMIN_ACCESS_BOOTSTRAP_HASH|VITE_ADMIN|localStorage/);
  assert.doesNotMatch(migration, /password_hash\s+text\s+not\s+null\s+default/i);
  const endpointCatch = endpoint.match(/} catch \(error\) \{[\s\S]+?\n  }\n}/)?.[0] || '';
  assert.doesNotMatch(endpointCatch, /error\.message/);
});

test('password rotation and rate limits are persistent and revoke old sessions', async () => {
  const [migration, endpoint, access] = await Promise.all([
    read('supabase/migrations/20260806020000_add_admin_access_gate.sql'),
    read('api/admin-access.js'),
    read('api/_adminAccess.js'),
  ]);

  assert.match(migration, /create table[^;]+admin_access_settings/is);
  assert.match(migration, /password_hash\s+text\s+not null/i);
  assert.match(migration, /session_version\s+bigint\s+not null/i);
  assert.match(migration, /create table[^;]+admin_access_attempts/is);
  assert.match(migration, /admin_access_rate_limit/is);
  assert.match(migration, /p_action not in \('attempt', 'success'\)/);
  assert.match(migration, /on conflict \(attempt_key\)[\s\S]{0,900}failure_count\s*=\s*case[\s\S]{0,900}failure_count\s*\+\s*1[\s\S]{0,900}returning \*/i);
  assert.match(migration, /revoke all[\s\S]+admin_access_settings[\s\S]+anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.admin_access_settings to service_role/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.admin_access_attempts to service_role/i);
  assert.match(endpoint, /currentPassword/);
  assert.match(endpoint, /newPassword/);
  assert.match(endpoint, /session_version/);
  assert.match(endpoint, /verifySameOrigin/);
  assert.match(access, /rpc\/admin_access_rate_limit/);
  const changePasswordFlow = endpoint.match(/async function changePassword[\s\S]+?\n}/)?.[0] || '';
  const currentPasswordCheck = changePasswordFlow.indexOf('verifyAdminPassword(currentPassword');
  const successfulCheckReset = changePasswordFlow.indexOf("applyRateLimitAction(rateKeys, 'success')");
  const newPasswordPolicy = changePasswordFlow.indexOf('isValidNewAdminPassword(newPassword)');
  assert.ok(currentPasswordCheck >= 0 && currentPasswordCheck < successfulCheckReset);
  assert.ok(successfulCheckReset < newPasswordPolicy);
});

test('role and configuration failures resolve before the gate loading screen', async () => {
  const boundary = await read('src/components/admin/AdminAccessBoundary.jsx');
  const roleFailure = boundary.indexOf('if (user && !isAdmin)');
  const configurationFailure = boundary.indexOf('if (!isConfigured || !supabase)');
  const loadingScreen = boundary.indexOf("if (loading || status === 'checking')");

  assert.ok(roleFailure >= 0 && roleFailure < loadingScreen);
  assert.ok(configurationFailure >= 0 && configurationFailure < loadingScreen);
});

test('admin home is reduced to active operations and removes retired game controls', async () => {
  const [admin, discoveries, hook] = await Promise.all([
    read('src/pages/Admin.jsx'),
    read('src/pages/AdminDiscoveries.jsx'),
    read('src/pages/admin/useAdminDashboard.js'),
  ]);

  assert.match(admin, /신작 정보 관리/);
  assert.match(admin, /접속 비밀번호 변경/);
  assert.match(admin, /<details className="admin-security-disclosure">/);
  assert.match(admin, /자동화 후보/);
  assert.doesNotMatch(discoveries, /승인된 첫 초안 불러오기/);
  assert.match(discoveries, /승인 원고 불러오기/);
  assert.doesNotMatch(admin, /admin_grant_mileage|admin_award_badge|admin_set_member_title/);
  assert.doesNotMatch(admin, /회원 권한 \/ MP \/ 히든 배지|커뮤니티 글 \/ 댓글 관리|최근 무전/);
  assert.equal(hook, '');
});

test('password hashes and gate sessions round-trip without exposing plaintext', async () => {
  const {
    createAdminAccessSession,
    createRateLimitKey,
    hashAdminPassword,
    isValidAdminPasswordHash,
    verifyAdminAccessSessionToken,
    verifyAdminPassword,
  } = await import('../api/_adminAccess.js');

  const password = 'sample-passphrase';
  const passwordHash = await hashAdminPassword(password, { salt: Buffer.alloc(16, 7) });
  assert.equal(await verifyAdminPassword(password, passwordHash), true);
  assert.equal(await verifyAdminPassword('wrong-passphrase', passwordHash), false);
  assert.equal(await verifyAdminPassword(password, passwordHash.replace('$16384$', '$2$')), false);
  const nonCanonicalHash = passwordHash.split('$');
  nonCanonicalHash[4] += '!';
  assert.equal(isValidAdminPasswordHash(nonCanonicalHash.join('$')), false);
  assert.doesNotMatch(passwordHash, new RegExp(password));

  const secret = 'test-session-secret-that-is-long-enough';
  const token = createAdminAccessSession({ expiresAt: 2_000_000_000_000, sessionVersion: 4, userId: 'user-1' }, secret);
  assert.deepEqual(verifyAdminAccessSessionToken(token, secret, { now: 1_900_000_000_000 }), {
    expiresAt: 2_000_000_000_000,
    sessionVersion: 4,
    userId: 'user-1',
  });
  assert.equal(verifyAdminAccessSessionToken(`${token}x`, secret, { now: 1_900_000_000_000 }), null);
  assert.throws(() => createAdminAccessSession({ expiresAt: 2_000_000_000_000, sessionVersion: 1, userId: 'user-1' }, 'short'));
  assert.throws(() => createRateLimitKey('user-1', 'account', 'short'));
});

test('admin access endpoint bootstraps and rotates a hash without sending plaintext to storage', async () => {
  const { hashAdminPassword } = await import('../api/_adminAccess.js');
  const { default: handler } = await import('../api/admin-access.js');
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    ADMIN_ACCESS_ALLOWED_ORIGINS: process.env.ADMIN_ACCESS_ALLOWED_ORIGINS,
    ADMIN_ACCESS_BOOTSTRAP_HASH: process.env.ADMIN_ACCESS_BOOTSTRAP_HASH,
    ADMIN_ACCESS_SESSION_SECRET: process.env.ADMIN_ACCESS_SESSION_SECRET,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
  };
  const initialPassword = 'integration-passphrase';
  const nextPassword = 'next-integration-passphrase';
  const storageBodies = [];
  let setting = null;

  process.env.ADMIN_ACCESS_ALLOWED_ORIGINS = 'https://admin.test';
  process.env.ADMIN_ACCESS_BOOTSTRAP_HASH = await hashAdminPassword(initialPassword, { salt: Buffer.alloc(16, 3) });
  process.env.ADMIN_ACCESS_SESSION_SECRET = 'integration-session-secret-with-enough-entropy';
  process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
  process.env.SUPABASE_URL = 'https://project.test';

  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/auth/v1/user')) {
      return Response.json({ app_metadata: { role: 'admin' }, id: 'admin-user' });
    }
    if (target.includes('/rpc/admin_access_rate_limit')) {
      return Response.json([{ allowed: true, retry_after_seconds: 0 }]);
    }
    if (target.includes('/admin_access_settings')) {
      if (options.body) storageBodies.push(JSON.parse(options.body));
      if (options.method === 'POST') {
        setting = { ...JSON.parse(options.body), updated_at: new Date().toISOString() };
        return Response.json([setting]);
      }
      if (options.method === 'PATCH') {
        setting = { ...setting, ...JSON.parse(options.body) };
        return Response.json([setting]);
      }
      return Response.json(setting ? [setting] : []);
    }
    throw new Error(`Unexpected mock request: ${target}`);
  };

  const baseHeaders = {
    authorization: 'Bearer admin-token',
    host: 'admin.test',
    origin: 'https://admin.test',
    'x-forwarded-for': '127.0.0.1',
    'x-forwarded-proto': 'https',
  };

  try {
    const unlockResponse = createResponse();
    await handler({ body: { password: initialPassword }, headers: baseHeaders, method: 'POST' }, unlockResponse);
    assert.equal(unlockResponse.statusCode, 200);
    assert.match(unlockResponse.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict/);
    assert.equal(setting.session_version, 1);
    assert.equal(await import('../api/_adminAccess.js').then(module => module.verifyAdminPassword(initialPassword, setting.password_hash)), true);

    const cookie = unlockResponse.headers['set-cookie'].split(';')[0];
    const sessionResponse = createResponse();
    await handler({ headers: { ...baseHeaders, cookie }, method: 'GET' }, sessionResponse);
    assert.equal(sessionResponse.statusCode, 200);
    assert.equal(sessionResponse.body.unlocked, true);

    const rotateResponse = createResponse();
    await handler({
      body: { currentPassword: initialPassword, newPassword: nextPassword },
      headers: { ...baseHeaders, cookie },
      method: 'PATCH',
    }, rotateResponse);
    assert.equal(rotateResponse.statusCode, 200);
    assert.equal(setting.session_version, 2);
    assert.notEqual(rotateResponse.headers['set-cookie'], unlockResponse.headers['set-cookie']);
    assert.equal(await import('../api/_adminAccess.js').then(module => module.verifyAdminPassword(nextPassword, setting.password_hash)), true);
    assert.equal(storageBodies.some(body => JSON.stringify(body).includes(initialPassword)), false);
    assert.equal(storageBodies.some(body => JSON.stringify(body).includes(nextPassword)), false);
  } finally {
    globalThis.fetch = originalFetch;
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});

test('a delayed bootstrap request cannot inherit a newer rotated session', async () => {
  const { hashAdminPassword } = await import('../api/_adminAccess.js');
  const { default: handler } = await import('../api/admin-access.js');
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    ADMIN_ACCESS_ALLOWED_ORIGINS: process.env.ADMIN_ACCESS_ALLOWED_ORIGINS,
    ADMIN_ACCESS_BOOTSTRAP_HASH: process.env.ADMIN_ACCESS_BOOTSTRAP_HASH,
    ADMIN_ACCESS_SESSION_SECRET: process.env.ADMIN_ACCESS_SESSION_SECRET,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
  };
  const bootstrapPassword = 'bootstrap-fixture';
  const rotatedPasswordHash = await hashAdminPassword('rotated-fixture');
  let settingsReads = 0;

  process.env.ADMIN_ACCESS_ALLOWED_ORIGINS = 'https://admin.test';
  process.env.ADMIN_ACCESS_BOOTSTRAP_HASH = await hashAdminPassword(bootstrapPassword);
  process.env.ADMIN_ACCESS_SESSION_SECRET = 'integration-session-secret-with-enough-entropy';
  process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
  process.env.SUPABASE_URL = 'https://project.test';

  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/auth/v1/user')) {
      return Response.json({ app_metadata: { role: 'admin' }, id: 'admin-user' });
    }
    if (target.includes('/rpc/admin_access_rate_limit')) {
      return Response.json([{ allowed: true, retry_after_seconds: 0 }]);
    }
    if (target.includes('/admin_access_settings?')) {
      settingsReads += 1;
      return Response.json(settingsReads === 1 ? [] : [{
        password_hash: rotatedPasswordHash,
        session_version: 2,
        updated_at: new Date().toISOString(),
      }]);
    }
    if (target.endsWith('/admin_access_settings') && options.method === 'POST') {
      return Response.json({ message: 'already initialized' }, { status: 409 });
    }
    throw new Error(`Unexpected mock request: ${options.method || 'GET'} ${target}`);
  };

  try {
    const response = createResponse();
    await handler({
      body: { password: bootstrapPassword },
      headers: {
        authorization: 'Bearer admin-token',
        host: 'admin.test',
        origin: 'https://admin.test',
        'x-forwarded-for': '203.0.113.7',
        'x-forwarded-proto': 'https',
      },
      method: 'POST',
    }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers['set-cookie'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
