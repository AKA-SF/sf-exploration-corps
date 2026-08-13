import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createPublicDetailHandler } from '../api/public-detail.js';
import { getSeoMetadata } from '../src/lib/seo.js';

const SHELL = `<!doctype html><html><head>
<title>Home</title>
<meta name="description" content="Home" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="https://www.sf-explorer.net/" />
<meta property="og:title" content="Home" />
<meta property="og:description" content="Home" />
<meta property="og:url" content="https://www.sf-explorer.net/" />
<meta property="og:image" content="https://www.sf-explorer.net/og-image.png" />
<meta property="og:image:type" content="image/png" />
<meta name="twitter:title" content="Home" />
<meta name="twitter:description" content="Home" />
<meta name="twitter:image" content="https://www.sf-explorer.net/og-image.png" />
</head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`;

function createResponse() {
  return {
    body: '',
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

async function render(query, loaders) {
  const response = createResponse();
  const handler = createPublicDetailHandler({
    loadShell: async () => SHELL,
    loaders,
  });
  await handler({ method: 'GET', query }, response);
  return response;
}

const unavailable = async () => { throw Object.assign(new Error('upstream unavailable'), { status: 502 }); };

const validLoaders = {
  discovery: async () => ({
    kind: 'EDITOR_PICK',
    editorial_payload: { intro: 'approved' },
    slug: 'escape-test',
    summary: '요약 & <script>alert("x")</script>',
    title: '제목 </title><script>alert("x")</script>',
  }),
  network: async () => ({
    id: '123e4567-e89b-42d3-a456-426614174000',
    memo: '공개 메모',
    spoiler: 'CLEAR_SIGNAL',
    title: '공개 신호',
    visibility: 'PUBLIC_SIGNAL',
  }),
  question: async () => ({
    body: '공개 질문 본문',
    id: '123e4567-e89b-42d3-a456-426614174001',
    status: 'public',
    title: '공개 질문',
  }),
};

test('approved discovery detail returns escaped raw metadata and a self canonical', async () => {
  const response = await render({ type: 'discover', identifier: 'escape-test' }, validLoaders);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(response.headers['X-Robots-Tag'], undefined);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
  assert.match(response.body, /<title>제목 &lt;\/title&gt;&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; \| SF 탐사단<\/title>/);
  assert.match(response.body, /name="description" content="요약 &amp; &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;"/);
  assert.match(response.body, /rel="canonical" href="https:\/\/www\.sf-explorer\.net\/discover\/escape-test"/);
  assert.match(response.body, /property="og:url" content="https:\/\/www\.sf-explorer\.net\/discover\/escape-test"/);
  assert.doesNotMatch(response.body, /<script>alert\("x"\)<\/script>/);
});

test('question detail is 200 only for a public row', async () => {
  const questionId = '123e4567-e89b-42d3-a456-426614174001';
  const ready = await render({ type: 'questions', identifier: questionId }, validLoaders);
  assert.equal(ready.statusCode, 200);
  assert.match(ready.body, /<title>공개 질문 \| SF 탐사단<\/title>/);
  assert.match(ready.body, /canonical" href="https:\/\/www\.sf-explorer\.net\/questions\/123e4567-e89b-42d3-a456-426614174001"/);

  const hidden = await render({ type: 'questions', identifier: questionId }, {
    ...validLoaders,
    question: async () => ({ id: questionId, status: 'archived', title: '숨김', body: '숨김' }),
  });
  assert.equal(hidden.statusCode, 404);
  assert.equal(hidden.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(hidden.body, /name="robots" content="noindex, nofollow"/);
});

test('network detail uses only the redacted visible-detail projection', async () => {
  const response = await render({ type: 'network', identifier: '123e4567-e89b-42d3-a456-426614174000' }, validLoaders);
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /<title>공개 신호 \| SF 탐사단<\/title>/);
  assert.match(response.body, /name="description" content="공개 메모"/);
  assert.match(response.body, /canonical" href="https:\/\/www\.sf-explorer\.net\/network\/123e4567-e89b-42d3-a456-426614174000"/);
});

test('all dynamic detail HTML responses prohibit shared-cache storage', async () => {
  const success = await render({ type: 'discover', identifier: 'escape-test' }, validLoaders);
  const missing = await render({ type: 'discover', identifier: 'missing-item' }, {
    ...validLoaders,
    discovery: async () => null,
  });
  const failed = await render({ type: 'questions', identifier: '123e4567-e89b-42d3-a456-426614174001' }, {
    ...validLoaders,
    question: unavailable,
  });

  for (const response of [success, missing, failed]) {
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
  }
});

test('missing, invalid, and upstream failures are non-indexable real HTTP errors', async () => {
  const missing = await render({ type: 'discover', identifier: 'missing-item' }, {
    ...validLoaders,
    discovery: async () => null,
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(missing.body, /name="robots" content="noindex, nofollow"/);

  const invalid = await render({ type: 'network', identifier: 'not-a-uuid' }, validLoaders);
  assert.equal(invalid.statusCode, 404);
  assert.equal(invalid.headers['X-Robots-Tag'], 'noindex, nofollow');

  const failed = await render({ type: 'questions', identifier: '123e4567-e89b-42d3-a456-426614174001' }, {
    ...validLoaders,
    question: unavailable,
  });
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(failed.headers['Cache-Control'], /no-store/);
});

test('hosting routes dynamic public details through the Node HTML handler and packages the built shell', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrites = new Map(vercel.rewrites.map(rule => [rule.source, rule.destination]));

  assert.equal(rewrites.get('/discover/:slug'), '/api/public-detail?type=discover&identifier=:slug');
  assert.equal(rewrites.get('/questions/:questionId'), '/api/public-detail?type=questions&identifier=:questionId');
  assert.equal(rewrites.get('/network/:id'), '/api/public-detail?type=network&identifier=:id');
  assert.equal(vercel.functions['api/public-detail.js'].includeFiles, 'dist/index.html');
});

test('private routes keep hydrated robots metadata aligned with raw X-Robots headers', () => {
  for (const route of ['/log', '/log/entry-id', '/result/result-id']) {
    assert.equal(getSeoMetadata(route).robots, 'noindex, nofollow', route);
  }
});

test('published discovery RPC still requires an approved valid editorial detail', async () => {
  const migrations = await readFile(new URL('../supabase/migrations/20260813090000_restore_published_editorial_detail_contract.sql', import.meta.url), 'utf8');
  assert.match(migrations, /d\.kind = 'EDITOR_PICK'/i);
  assert.match(migrations, /d\.editorial_stage = 'APPROVED'/i);
  assert.match(migrations, /sf_editorial_payload_is_valid\(d\.editorial_payload\)/i);
  assert.match(migrations, /publication_status = 'PUBLISHED'/i);
});
