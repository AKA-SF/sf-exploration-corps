import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/discoveries.js';

function responseMock() {
  return {
    headers: {},
    payload: null,
    statusCode: 200,
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

function request({ body, headers = {}, method = 'GET', url = '/api/discoveries' } = {}) {
  return { body, headers, method, url };
}

async function withApiEnvironment(run) {
  const previous = {
    anonKey: process.env.SUPABASE_ANON_KEY,
    fetch: global.fetch,
    url: process.env.SUPABASE_URL,
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  try {
    await run();
  } finally {
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.anonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previous.anonKey;
    global.fetch = previous.fetch;
  }
}

test('discovery comment mutations reject cross-origin requests before authentication', async () => {
  const response = responseMock();
  await handler(request({
    body: { content: '의견', discoveryId: '00000000-0000-4000-8000-000000000001' },
    headers: { origin: 'https://attacker.example' },
    method: 'POST',
  }), response);
  assert.equal(response.statusCode, 403);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});

test('discovery comment mutations require a login session', async () => {
  await withApiEnvironment(async () => {
    const response = responseMock();
    await handler(request({
      body: { content: '의견', discoveryId: '00000000-0000-4000-8000-000000000001' },
      headers: { origin: 'http://localhost:5173' },
      method: 'POST',
    }), response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.payload.error, 'Login session is required');
  });
});

test('authenticated discovery comment mutations reject invalid IDs and content', async () => {
  await withApiEnvironment(async () => {
    global.fetch = async url => {
      assert.match(String(url), /\/auth\/v1\/user$/);
      return new Response(JSON.stringify({ email: 'reader@example.com', id: 'user-1', user_metadata: { nickname: '탐사자' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const response = responseMock();
    await handler(request({
      body: { content: '', discoveryId: 'not-a-uuid' },
      headers: { authorization: 'Bearer test-session', origin: 'http://localhost:5173' },
      method: 'POST',
    }), response);
    assert.equal(response.statusCode, 400);
    assert.match(response.payload.error, /1자 이상 1000자 이하/);
  });
});

test('authenticated discovery comment mutations return only display-safe fields', async () => {
  await withApiEnvironment(async () => {
    global.fetch = async (url, options = {}) => {
      if (String(url).endsWith('/auth/v1/user')) {
        return new Response(JSON.stringify({ email: 'reader@example.com', id: 'user-1', user_metadata: { nickname: '별빛탐사자' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      assert.match(String(url), /\/rest\/v1\/rpc\/create_sf_discovery_comment$/);
      assert.equal(options.headers.Authorization, 'Bearer test-session');
      assert.deepEqual(JSON.parse(options.body), {
        p_body: '차분하게 읽어보고 싶습니다.',
        p_discovery_id: '00000000-0000-4000-8000-000000000001',
      });
      return new Response(JSON.stringify([{
        author_name: '별빛탐사자',
        body: '차분하게 읽어보고 싶습니다.',
        created_at: '2026-08-07T00:00:00.000Z',
        id: 'comment-2',
      }]), { headers: { 'Content-Type': 'application/json' }, status: 200 });
    };
    const response = responseMock();
    await handler(request({
      body: {
        content: '차분하게 읽어보고 싶습니다.',
        discoveryId: '00000000-0000-4000-8000-000000000001',
      },
      headers: { authorization: 'Bearer test-session', origin: 'http://localhost:5173' },
      method: 'POST',
    }), response);
    assert.equal(response.statusCode, 201);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
    assert.deepEqual(Object.keys(response.payload.comment).sort(), ['author_name', 'body', 'created_at', 'id']);
  });
});

test('comment reads are no-store and return only the RPC projection', async () => {
  await withApiEnvironment(async () => {
    global.fetch = async url => {
      assert.match(String(url), /\/rest\/v1\/rpc\/get_sf_discovery_comments$/);
      return new Response(JSON.stringify([{
        author_name: '윤경',
        body: '좋은 작품입니다.',
        created_at: '2026-08-07T00:00:00.000Z',
        id: 'comment-1',
      }]), { headers: { 'Content-Type': 'application/json' }, status: 200 });
    };
    const response = responseMock();
    await handler(request({ url: '/api/discoveries?commentsFor=00000000-0000-4000-8000-000000000001' }), response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
    assert.deepEqual(Object.keys(response.payload.comments[0]).sort(), ['author_name', 'body', 'created_at', 'id']);
  });
});

test('unsupported discovery API methods advertise only GET and POST', async () => {
  const response = responseMock();
  await handler(request({ method: 'DELETE' }), response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET, POST');
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});
