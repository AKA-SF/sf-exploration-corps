import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildHomeFeed } from '../api/_homeFeed.js';
import { getHomeFeedSourceStatus, hasUsableArchiveSource } from '../api/home-feed.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('buildHomeFeed returns a compact deterministic homepage snapshot', () => {
  const feed = buildHomeFeed({
    concepts: [
      { code: 'C-1', title: '시간 여행' },
      { code: 'C-2', title: '포스트휴먼' },
    ],
    discoveries: [
      { id: 'D-1', title: '첫 번째 신작' },
      { id: 'D-2', title: '두 번째 신작' },
      { id: 'D-3', title: '세 번째 신작' },
      { id: 'D-4', title: 'Home 범위 밖의 신작' },
    ],
    logs: [{ code: 'L-1' }, { code: 'L-2' }, { code: 'L-3' }, { code: 'L-4' }],
    media: [{ code: 'M-1' }, { code: 'M-2' }, { code: 'M-3' }],
    questions: [{ id: 'Q-1' }, { id: 'Q-2' }, { id: 'Q-3' }],
    syncedAt: '2026-08-04T00:00:00.000Z',
    works: Array.from({ length: 8 }, (_, index) => ({ code: `W-${index + 1}` })),
  });

  assert.equal(feed.syncedAt, '2026-08-04T00:00:00.000Z');
  assert.equal(feed.featuredWorks.length, 4);
  assert.equal(feed.latestSignals.length, 3);
  assert.equal(feed.latestMedia.length, 2);
  assert.equal(feed.featuredConcepts.length, 2);
  assert.deepEqual(feed.latestDiscoveries.map(item => item.id), ['D-1', 'D-2', 'D-3']);
  assert.equal(feed.communityQuestions.length, 2);
  assert.deepEqual(feed.counts, { concepts: 2, logs: 4, media: 3, questions: 3, works: 8 });
});

test('archive reads preserve the last good snapshot instead of blocking on Notion', async () => {
  const cacheSource = await read('api/_persistentCache.js');
  assert.match(cacheSource, /DB-STALE/);
  assert.match(cacheSource, /allowStale:\s*true/);
  assert.match(cacheSource, /preferStale/);
});

test('a signals-only partial refresh cannot overwrite the last good home snapshot', () => {
  const rejected = { status: 'rejected', reason: new Error('Notion unavailable') };
  const signalsOnly = [
    rejected,
    rejected,
    rejected,
    { status: 'fulfilled', value: [{ code: 'PUBLIC-1' }] },
  ];

  assert.equal(hasUsableArchiveSource(signalsOnly), false);
  assert.equal(hasUsableArchiveSource([
    { status: 'fulfilled', value: { works: [{ code: 'W-1' }] } },
    rejected,
    rejected,
    { status: 'fulfilled', value: [] },
  ]), true);
});

test('partial source failures stay distinct from successful empty collections', () => {
  const rejected = { status: 'rejected', reason: new Error('source unavailable') };
  const fulfilled = value => ({ status: 'fulfilled', value });
  const sourceStatus = getHomeFeedSourceStatus([
    fulfilled({ works: [] }),
    fulfilled({ media: [] }),
    fulfilled({ concepts: [] }),
    rejected,
    fulfilled([]),
  ]);
  const feed = buildHomeFeed({ logs: [], sourceStatus });

  assert.deepEqual(sourceStatus, {
    concepts: 'available',
    discoveries: 'available',
    media: 'available',
    signals: 'unavailable',
    works: 'available',
  });
  assert.equal(feed.counts.logs, null);
  assert.equal(feed.sourceStatus.signals, 'unavailable');
});

test('home data requests do not opt out of public HTTP caching', async () => {
  const source = await read('src/pages/home/useHomeData.js');
  assert.doesNotMatch(source, /cache:\s*['"]no-store['"]/);
});

test('archive snapshot storage is deployed as a migration and refresh is scheduled', async () => {
  const migration = await read('supabase/migrations/20260804005000_create_public_archive_cache.sql');
  const vercel = JSON.parse(await read('vercel.json'));
  const githubSync = await read('.github/workflows/archive-snapshot-sync.yml');

  assert.match(migration, /create table if not exists public\.public_archive_cache/i);
  assert.match(migration, /revoke all on public\.public_archive_cache from anon, authenticated/i);
  assert.ok(vercel.crons?.some(item => item.path === '/api/archive-sync'));
  assert.match(githubSync, /\*\/15 \* \* \* \*/);
  assert.match(githubSync, /ARCHIVE_SYNC_SECRET/);
});

test('home-feed and archive-sync endpoints are present', async () => {
  const homeFeed = await read('api/home-feed.js');
  const sync = await read('api/archive-sync.js');

  assert.match(homeFeed, /getDurableCachedJson/);
  assert.match(homeFeed, /buildHomeFeed/);
  assert.match(homeFeed, /get_published_sf_discoveries/);
  assert.match(homeFeed, /discoveries:\s*discoveriesResult\.status === 'fulfilled'/);
  assert.match(sync, /isAuthorizedArchiveRefresh/);
  assert.match(sync, /loadHomeFeedSnapshot/);
});

test('expensive forced refreshes require the private sync secret', async () => {
  const auth = await read('api/_archiveSyncAuth.js');
  assert.match(auth, /timingSafeEqual/);

  for (const path of ['api/works.js', 'api/media.js', 'api/concepts.js', 'api/exploration-log.js']) {
    const source = await read(path);
    assert.match(source, /requireAuthorizedArchiveRefresh/);
  }
});

test('legacy editorial logs are read-only and cannot be created anonymously', async () => {
  const source = await read('api/exploration-log.js');
  assert.match(source, /request\.method\s*!==\s*'GET'/);
  assert.doesNotMatch(source, /request\.method\s*===\s*'POST'/);
  assert.doesNotMatch(source, /notionRequest\('\/pages'/);
});
