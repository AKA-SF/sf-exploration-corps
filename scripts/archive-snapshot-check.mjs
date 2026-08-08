import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildHomeFeed, getKoreanDiscoveryDate } from '../api/_homeFeed.js';
import { getHomeFeedSourceStatus, hasUsableArchiveSource } from '../api/home-feed.js';
import { shouldResolveWorkCover } from '../api/works.js';

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
      { id: 'D-4', title: '네 번째 신작' },
      { id: 'D-5', title: 'Home 범위 밖의 신작' },
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
  assert.equal(feed.featuredConcepts.length, 1);
  assert.deepEqual(feed.latestDiscoveries.map(item => item.id), ['D-1', 'D-2', 'D-3', 'D-4']);
  assert.equal(feed.communityQuestions.length, 2);
  assert.deepEqual(feed.counts, { concepts: 2, logs: 4, media: 3, questions: 3, works: 8 });
});

test('오늘의 발견은 한국 날짜별로 네 작품을 고정해 선택한다', () => {
  const works = Array.from({ length: 20 }, (_, index) => ({ code: `W-${index + 1}` }));
  const buildFor = discoveryDate => buildHomeFeed({ discoveryDate, works });

  const first = buildFor('2026-08-06');
  const repeated = buildFor('2026-08-06');
  const nextDay = buildFor('2026-08-07');

  assert.equal(first.dailyDiscoveryDate, '2026-08-06');
  assert.equal(first.featuredWorks.length, 4);
  assert.deepEqual(first.featuredWorks, repeated.featuredWorks);
  assert.notDeepEqual(first.featuredWorks, works.slice(0, 4));
  assert.notDeepEqual(first.featuredWorks, nextDay.featuredWorks);
});

test('개념 신호는 한국 날짜별로 하나를 무작위 고정해 선택한다', () => {
  const concepts = Array.from({ length: 20 }, (_, index) => ({ code: `C-${index + 1}` }));
  const buildFor = discoveryDate => buildHomeFeed({ concepts, discoveryDate });

  const first = buildFor('2026-08-06');
  const repeated = buildFor('2026-08-06');
  const nextDay = buildFor('2026-08-07');

  assert.equal(first.featuredConcepts.length, 1);
  assert.deepEqual(first.featuredConcepts, repeated.featuredConcepts);
  assert.notDeepEqual(first.featuredConcepts, concepts.slice(0, 1));
  assert.notDeepEqual(first.featuredConcepts, nextDay.featuredConcepts);
});

test('오늘의 발견 날짜는 한국 자정에 바뀐다', () => {
  assert.equal(getKoreanDiscoveryDate(new Date('2026-08-06T14:59:59.999Z')), '2026-08-06');
  assert.equal(getKoreanDiscoveryDate(new Date('2026-08-06T15:00:00.000Z')), '2026-08-07');
});

test('오늘의 발견은 후보가 네 개보다 적으면 중복 없이 있는 만큼만 보여준다', () => {
  const works = [{ code: 'W-1' }, { code: 'W-2' }, { code: 'W-3' }];
  const feed = buildHomeFeed({ discoveryDate: '2026-08-06', works });

  assert.equal(feed.featuredWorks.length, 3);
  assert.equal(new Set(feed.featuredWorks.map(work => work.code)).size, 3);
});

test('오늘의 발견은 전체 작품 수와 별개로 표지를 보강한 네 작품을 사용한다', () => {
  const works = Array.from({ length: 20 }, (_, index) => ({ code: `W-${index + 1}` }));
  const featuredWorks = works.slice(8, 12).map(work => ({ ...work, cover: `${work.code}.jpg` }));
  const feed = buildHomeFeed({ discoveryDate: '2026-08-06', featuredWorks, works });

  assert.deepEqual(feed.featuredWorks, featuredWorks);
  assert.equal(feed.counts.works, 20);
});

test('archive reads preserve the last good snapshot instead of blocking on Notion', async () => {
  const cacheSource = await read('api/_persistentCache.js');
  assert.match(cacheSource, /DB-STALE/);
  assert.match(cacheSource, /allowStale:\s*true/);
  assert.match(cacheSource, /preferStale/);
});

test('동시 첫 요청은 날짜별 cache에서 먼저 확정된 한 선택을 공유한다', async () => {
  const cacheModule = await import('../api/_persistentCache.js');
  assert.equal(typeof cacheModule.getOrCreateDurableCachedJson, 'function');

  const candidate = [{ code: 'CANDIDATE' }];
  const winner = [{ code: 'WINNER' }];
  let reads = 0;
  let inserted;
  const result = await cacheModule.getOrCreateDurableCachedJson(
    'daily-discovery:test',
    1000,
    async () => candidate,
    {
      insertIfAbsent: async (_key, value) => { inserted = value; },
      read: async () => {
        reads += 1;
        return reads === 1 ? null : { expired: false, payload: winner, updatedAt: 'now' };
      },
    },
  );

  assert.deepEqual(inserted, candidate);
  assert.deepEqual(result.value, winner);
  assert.equal(result.cache, 'DB-HIT');

  const cacheSource = await read('api/_persistentCache.js');
  assert.match(cacheSource, /resolution=ignore-duplicates/);
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

test('홈 피드는 CDN에 전날 응답을 남기지 않고 열린 화면도 한국 자정에 갱신한다', async () => {
  const dailyRefresh = await import('../src/pages/home/dailyDiscoveryRefresh.js').catch(() => ({}));
  assert.equal(typeof dailyRefresh.millisecondsUntilNextKoreanDay, 'function');
  assert.equal(
    dailyRefresh.millisecondsUntilNextKoreanDay(new Date('2026-08-06T14:59:59.000Z')),
    1000,
  );
  assert.equal(
    dailyRefresh.millisecondsUntilNextKoreanDay(new Date('2026-08-06T15:00:00.000Z')),
    24 * 60 * 60 * 1000,
  );

  const homeFeed = await read('api/home-feed.js');
  const home = await read('src/pages/HomeV2.jsx');
  assert.match(homeFeed, /Cache-Control', 'no-store'/);
  assert.match(home, /millisecondsUntilNextKoreanDay/);
  assert.match(home, /setTimeout/);
});

test('archive snapshot storage is deployed as a migration and refresh is manually dispatched', async () => {
  const migration = await read('supabase/migrations/20260804005000_create_public_archive_cache.sql');
  const vercel = JSON.parse(await read('vercel.json'));
  const githubSync = await read('.github/workflows/archive-snapshot-sync.yml');

  assert.match(migration, /create table if not exists public\.public_archive_cache/i);
  assert.match(migration, /revoke all on public\.public_archive_cache from anon, authenticated/i);
  assert.ok(!vercel.crons?.some(item => item.path === '/api/archive-sync'));
  assert.match(githubSync, /workflow_dispatch/);
  assert.doesNotMatch(githubSync, /schedule:/);
  assert.match(githubSync, /ARCHIVE_SYNC_SECRET/);
});

test('home-feed and archive-sync endpoints are present', async () => {
  const homeFeed = await read('api/home-feed.js');
  const media = await read('api/media.js');
  const home = await read('src/pages/HomeV2.jsx');
  const sync = await read('api/archive-sync.js');

  assert.match(homeFeed, /getDurableCachedJson/);
  assert.match(media, /Cache-Control', 'no-store'/);
  assert.match(media, /\['이미지', 'Image', 'Thumbnail', '썸네일'\]/);
  assert.match(media, /v3-article-images/);
  assert.match(homeFeed, /buildHomeFeed/);
  assert.match(homeFeed, /get_published_sf_discoveries/);
  assert.match(homeFeed, /discoveries:\s*discoveriesResult\.status === 'fulfilled'/);
  assert.match(homeFeed, /loadWorksSnapshot\(\{ refresh \}\)/);
  assert.match(homeFeed, /daily-discovery:v1:\$\{discoveryDate\}/);
  assert.match(homeFeed, /daily-concept:v1:\$\{discoveryDate\}/);
  assert.match(homeFeed, /`\$\{HOME_FEED_CACHE_KEY\}:\$\{discoveryDate\}`/);
  assert.match(homeFeed, /loadDailyFeaturedConcepts/);
  assert.match(homeFeed, /loadDailyFeaturedWorks/);
  assert.match(homeFeed, /worksResult\.status === 'fulfilled' && works\.length > 0/);
  assert.match(homeFeed, /selectDailyFeaturedWorks/);
  assert.match(homeFeed, /hydrateSelectedWorkCovers/);
  assert.match(home, /src=\{work\.image \|\| work\.cover\}/);
  assert.match(sync, /isAuthorizedArchiveRefresh/);
  assert.match(sync, /loadHomeFeedSnapshot/);
});

test('homepage cover hydration is limited to the four featured works', () => {
  assert.equal(shouldResolveWorkCover(0, 4), true);
  assert.equal(shouldResolveWorkCover(3, 4), true);
  assert.equal(shouldResolveWorkCover(4, 4), false);
  assert.equal(shouldResolveWorkCover(114, 4), false);
  assert.equal(shouldResolveWorkCover(114), true);
});

test('선택된 오늘의 발견만 필요한 책 표지를 보강한다', async () => {
  const worksModule = await import('../api/works.js');
  assert.equal(typeof worksModule.hydrateSelectedWorkCovers, 'function');

  const calls = [];
  const works = [
    { code: 'BOOK-1', cover: '', source: 'books' },
    { code: 'BOOK-2', cover: 'existing.jpg', source: 'books' },
    { code: 'MEDIA-1', cover: '', source: 'media-works' },
  ];
  const hydrated = await worksModule.hydrateSelectedWorkCovers(works, {
    aladinApiKey: 'test-key',
    resolveCover: async work => {
      calls.push(work.code);
      return `${work.code}.jpg`;
    },
  });

  assert.deepEqual(calls, ['BOOK-1']);
  assert.deepEqual(hydrated.map(work => work.cover), ['BOOK-1.jpg', 'existing.jpg', '']);
});

test('Aladin 표지 조회는 API 키를 HTTPS로만 전송한다', async () => {
  const source = await read('api/_worksAladin.js');
  assert.match(source, /https:\/\/www\.aladin\.co\.kr\/ttb\/api\//);
  assert.doesNotMatch(source, /['"]http:\/\/www\.aladin\.co\.kr\/ttb\/api\//);
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
