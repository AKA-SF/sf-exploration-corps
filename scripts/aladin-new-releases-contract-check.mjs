import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  fetchAladinNewReleases,
  importAladinNewReleaseDrafts,
  isAuthorizedCronRequest,
  normalizeAladinNewRelease,
  normalizeAladinNewReleaseBatch,
} from '../api/_aladinNewReleases.js';

const validItem = {
  itemId: 123456,
  isbn13: '9788930000001',
  title: '테스트 우주 신작',
  author: '김작가 (지은이), 이역자 (옮긴이)',
  publisher: '테스트출판사',
  pubDate: '2026-08-03',
  description: '먼 우주의 탐사대가 미지의 신호를 발견하는 과학소설.',
  link: 'http://www.aladin.co.kr/shop/wproduct.aspx?ItemId=123456',
  cover: 'http://image.aladin.co.kr/product/1/1/cover200/test.jpg',
  categoryName: '국내도서>소설/시/희곡>과학소설(SF)',
};

test('Aladin item becomes a provenance-rich unpublished draft input', () => {
  const draft = normalizeAladinNewRelease(validItem, { fetchedAt: '2026-08-06T12:00:00.000Z' });
  assert.deepEqual(draft, {
    source_provider: 'ALADIN',
    source_external_id: '123456',
    isbn13: '9788930000001',
    title: '테스트 우주 신작',
    author_text: '김작가 (지은이), 이역자 (옮긴이)',
    publisher_text: '테스트출판사',
    kind: 'NEW_RELEASE',
    media_type: 'NOVEL',
    summary: '먼 우주의 탐사대가 미지의 신호를 발견하는 과학소설.',
    source_name: '알라딘 SF 신간 API',
    source_url: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=123456',
    image_url: 'https://image.aladin.co.kr/product/1/1/cover200/test.jpg',
    image_alt: '테스트 우주 신작 표지',
    cover_rights_status: 'UNVERIFIED',
    release_date: '2026-08-03',
    publication_status: 'DRAFT',
    published_at: null,
    automation_first_seen_at: '2026-08-06T12:00:00.000Z',
    automation_last_seen_at: '2026-08-06T12:00:00.000Z',
    source_snapshot: {
      category_name: '국내도서>소설/시/희곡>과학소설(SF)',
      description: '먼 우주의 탐사대가 미지의 신호를 발견하는 과학소설.',
      fetched_at: '2026-08-06T12:00:00.000Z',
    },
  });
});

test('future releases become UPCOMING without approving cover rights', () => {
  const draft = normalizeAladinNewRelease(
    { ...validItem, itemId: 123458, pubDate: '2026-08-20' },
    { fetchedAt: '2026-08-06T12:00:00.000Z' },
  );
  assert.equal(draft.kind, 'UPCOMING');
  assert.equal(draft.cover_rights_status, 'UNVERIFIED');
});

test('batch normalization rejects malformed records and caps work without inventing content', () => {
  const items = [validItem, { ...validItem, itemId: 123457, title: '', description: '' }];
  const result = normalizeAladinNewReleaseBatch(items, { fetchedAt: '2026-08-06T12:00:00.000Z', limit: 10 });
  assert.equal(result.drafts.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reason, /title/i);
});

test('server and client never fall back to a VITE Aladin credential', async () => {
  const [apiSource, clientSource, worksSource, readme, envExample] = await Promise.all([
    readFile(new URL('../api/aladin.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/aladinService.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/works.js', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(apiSource, /VITE_ALADIN_TTB_KEY/);
  assert.doesNotMatch(clientSource, /VITE_ALADIN_TTB_KEY/);
  assert.doesNotMatch(worksSource, /VITE_ALADIN_TTB_KEY/);
  assert.doesNotMatch(readme, /VITE_ALADIN_TTB_KEY/);
  assert.doesNotMatch(envExample, /VITE_ALADIN_TTB_KEY/);
});

test('database import is service-only, idempotent and hard-codes DRAFT visibility', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260806023000_add_aladin_new_release_drafts.sql', import.meta.url), 'utf8');
  assert.match(sql, /unique\s*\(source_provider,\s*source_external_id\)/i);
  assert.match(sql, /auth\.role\(\)\s*<>\s*'service_role'/i);
  assert.match(sql, /cover_rights_status[\s\S]*UNVERIFIED/i);
  assert.match(sql, /item ->> 'kind'/);
  assert.match(sql, /'DRAFT'/);
  assert.match(sql, /published_at[\s\S]*null/i);
  assert.match(sql, /on conflict\s*\(source_provider,\s*source_external_id\)\s*do nothing/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/i);
});

test('daily cron reuses the existing Aladin function', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(vercel.crons.some(job => job.path === '/api/aladin?mode=sync-new-releases&limit=20' && job.schedule === '15 0 * * *'));
});

test('the Aladin contract is part of the canonical release gate', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(packageJson.scripts['test:release'], /test:aladin-new-releases/);
});

test('cron authorization requires an exact server secret', () => {
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'Bearer cron-secret-value' } }, 'cron-secret-value'), true);
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'Bearer wrong' } }, 'cron-secret-value'), false);
  assert.equal(isAuthorizedCronRequest({ headers: {} }, ''), false);
});

test('new release fetch uses the official category list endpoint and clamps its limit', async () => {
  let requestedUrl = '';
  const result = await fetchAladinNewReleases({
    apiKey: 'server-only-test-key',
    limit: 999,
    fetchImpl: async url => {
      requestedUrl = String(url);
      return { ok: true, text: async () => JSON.stringify({ item: [validItem], totalResults: 1 }) };
    },
  });
  const url = new URL(requestedUrl);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.pathname, '/ttb/api/ItemList.aspx');
  assert.equal(url.searchParams.get('QueryType'), 'ItemNewAll');
  assert.equal(url.searchParams.get('CategoryId'), '50930');
  assert.equal(url.searchParams.get('SearchTarget'), 'Book');
  assert.equal(url.searchParams.get('MaxResults'), '50');
  assert.equal(url.searchParams.get('ttbkey'), 'server-only-test-key');
  assert.equal(result.items.length, 1);
});

test('Aladin application errors never masquerade as a successful empty sync', async () => {
  await assert.rejects(
    fetchAladinNewReleases({
      apiKey: 'server-only-test-key',
      fetchImpl: async () => ({
        ok: true,
        text: async () => JSON.stringify({ errorCode: 8, errorMessage: 'Invalid TTB key' }),
      }),
    }),
    /upstream rejected/i,
  );
});

test('structurally malformed Aladin payloads never masquerade as an empty sync', async () => {
  for (const payload of [
    { unexpected: true },
    { totalResults: 0, item: 'not-an-array' },
    { totalResults: 'not-a-number', item: [] },
  ]) {
    await assert.rejects(
      fetchAladinNewReleases({
        apiKey: 'server-only-test-key',
        fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify(payload) }),
      }),
      /invalid payload/i,
    );
  }
});

test('draft import calls only the service-role RPC and returns aggregate counts', async () => {
  let request;
  const result = await importAladinNewReleaseDrafts({
    supabaseUrl: 'https://project.supabase.co',
    serviceRoleKey: 'service-role-test-key',
    drafts: [normalizeAladinNewRelease(validItem)],
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return { ok: true, json: async () => ({ created: 1, duplicates: 0, received: 1 }) };
    },
  });
  assert.equal(request.url, 'https://project.supabase.co/rest/v1/rpc/import_aladin_sf_discovery_drafts');
  assert.equal(request.options.headers.apikey, 'service-role-test-key');
  assert.deepEqual(result, { created: 1, duplicates: 0, received: 1 });
  assert.doesNotMatch(JSON.stringify(result), /service-role-test-key/);
});

test('sync API is fail-closed and no-store without changing the public search contract', async () => {
  const source = await readFile(new URL('../api/aladin.js', import.meta.url), 'utf8');
  assert.match(source, /requireAdminAccess/);
  assert.match(source, /isAuthorizedCronRequest/);
  assert.match(source, /sync-new-releases/);
  assert.match(source, /private, no-store/);
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
});

test('Admin can trigger an authenticated ten-item sync and see aggregate results', async () => {
  const source = await readFile(new URL('../src/pages/AdminDiscoveries.jsx', import.meta.url), 'utf8');
  assert.match(source, /fetch\('\/api\/aladin'/);
  assert.match(source, /action:\s*'sync-new-releases'/);
  assert.match(source, /limit:\s*10/);
  assert.match(source, /method:\s*'POST'/);
  assert.match(source, /credentials:\s*'same-origin'/);
  assert.match(source, /Authorization:\s*`Bearer \$\{data\.session\.access_token\}`/);
  assert.match(source, /알라딘 최신 10권 조사/);
  assert.match(source, /신규 초안.*중복.*검토 필요/);
});
