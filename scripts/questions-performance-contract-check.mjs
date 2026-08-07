import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { supabaseRestRequest } from '../api/_supabaseRest.js';
import * as questionsApi from '../api/questions.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Supabase REST adapter는 목록 데이터와 전체 개수 metadata를 한 응답에서 반환한다', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousAnonKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-test-key';
  globalThis.fetch = async () => new Response(
    JSON.stringify([{ id: 'question-1' }]),
    {
      headers: { 'Content-Range': '0-0/12' },
      status: 200,
    },
  );

  try {
    const result = await supabaseRestRequest('community_posts?select=id', {
      includeResponseMetadata: true,
      prefer: 'count=exact',
    });
    assert.deepEqual(result, {
      contentRange: '0-0/12',
      data: [{ id: 'question-1' }],
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousAnonKey;
  }
});

test('익명 커뮤니티 목록은 게시글·댓글 수·전체 개수를 한 Supabase 요청으로 읽는다', async () => {
  assert.equal(typeof questionsApi.fetchPublicQuestionPage, 'function');
  const requests = [];
  const payload = await questionsApi.fetchPublicQuestionPage({
    includeCommentCounts: true,
    offset: 0,
    pageSize: 40,
    requestRest: async (path, options) => {
      requests.push({ options, path });
      return {
        contentRange: '0-0/12',
        data: [{
          attachment_url: null,
          author_name: '테스트 대원',
          body: '본문',
          category: '자유글',
          community_comments: [{ count: 3 }],
          created_at: '2026-08-07T00:00:00.000Z',
          id: '11111111-1111-4111-8111-111111111111',
          status: 'public',
          title: '단일 요청 게시글',
          updated_at: '2026-08-07T00:00:00.000Z',
          user_id: '22222222-2222-4222-8222-222222222222',
          view_count: 7,
        }],
      };
    },
  });

  assert.equal(requests.length, 1);
  const requestUrl = new URL(requests[0].path, 'https://example.test');
  assert.match(requestUrl.searchParams.get('select'), /community_comments\(count\)/);
  assert.equal(requests[0].options.includeResponseMetadata, true);
  assert.equal(requests[0].options.prefer, 'count=exact');
  assert.equal(payload.questions[0].commentCount, 3);
  assert.equal(payload.totalCount, 12);
  assert.equal(payload.hasMore, true);
});

test('커뮤니티 목록 prefetch와 실제 진입은 같은 in-flight 요청을 재사용한다', async () => {
  const communityCache = await import('../src/pages/questions/communityQuestionsCache.js').catch(() => ({}));
  assert.equal(typeof communityCache.fetchCachedCommunityQuestions, 'function');
  assert.equal(typeof communityCache.clearCommunityQuestionsCache, 'function');
  const previousFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return new Response(JSON.stringify({
      hasMore: false,
      nextCursor: '',
      questions: [],
      totalCount: 0,
    }), { status: 200 });
  };

  try {
    communityCache.clearCommunityQuestionsCache();
    const loader = () => fetch('/api/questions?includeCommentCounts=1&pageSize=40').then(response => response.json());
    const prefetch = communityCache.fetchCachedCommunityQuestions('default', loader);
    const navigation = communityCache.fetchCachedCommunityQuestions('default', loader);
    const [prefetched, loaded] = await Promise.all([prefetch, navigation]);
    assert.deepEqual(prefetched, loaded);
    await communityCache.fetchCachedCommunityQuestions('default', loader);
    assert.equal(requestCount, 1);
  } finally {
    communityCache.clearCommunityQuestionsCache?.();
    globalThis.fetch = previousFetch;
  }
});

test('cache 무효화 전 pending 응답은 최신 목록 cache를 되살리지 않는다', async () => {
  const communityCache = await import('../src/pages/questions/communityQuestionsCache.js');
  let resolveStale;
  let fallbackLoads = 0;
  communityCache.clearCommunityQuestionsCache();

  const staleRequest = communityCache.fetchCachedCommunityQuestions(
    'race',
    () => new Promise(resolve => { resolveStale = resolve; }),
  );
  communityCache.clearCommunityQuestionsCache();
  await communityCache.fetchCachedCommunityQuestions('race', async () => 'FRESH');
  resolveStale('STALE');
  await staleRequest;

  const cached = await communityCache.fetchCachedCommunityQuestions('race', async () => {
    fallbackLoads += 1;
    return 'FALLBACK';
  });
  assert.equal(cached, 'FRESH');
  assert.equal(fallbackLoads, 0);
  communityCache.clearCommunityQuestionsCache();
});

test('전역 내비게이션은 idle과 사용자 intent에서 커뮤니티 목록을 미리 불러온다', async () => {
  const navbar = await read('src/components/Navbar.jsx');
  assert.match(navbar, /requestIdleCallback/);
  assert.match(navbar, /import\('\.\.\/pages\/questions\/communityApi'\)/);
  assert.match(navbar, /prefetchCommunityQuestions/);
  assert.match(navbar, /onFocus=\{prefetchCommunity\}/);
  assert.match(navbar, /onPointerEnter=\{prefetchCommunity\}/);
  assert.match(navbar, /saveData/);
  assert.match(navbar, /effectiveType/);
});

test('커뮤니티 상세는 목록 preview를 즉시 전달하고 직접 진입만 loading 상태를 사용한다', async () => {
  const [board, questions, hook] = await Promise.all([
    read('src/pages/questions/QuestionsBoard.jsx'),
    read('src/pages/Questions.jsx'),
    read('src/pages/questions/useQuestionsBoard.js'),
  ]);

  assert.match(board, /state=\{\{ question \}\}/);
  assert.match(questions, /useLocation\(\)/);
  assert.match(questions, /questionPreview:\s*questionId && location\.state\?\.question\?\.id === questionId/);
  assert.match(questions, /onQuestionSelect=\{prepareQuestionDetail\}/);
  assert.match(hook, /const prepareQuestionDetail = useCallback/);
  assert.match(hook, /setActiveQuestion\(question\)/);
  assert.match(hook, /detailRequestSequence/);
  assert.match(hook, /requestSequence !== detailRequestSequence\.current/);
  assert.match(hook, /error\?\.status === 404 \? 'not-found' : 'error'/);
  assert.match(hook, /commentsLoadStatus/);
  assert.match(hook, /setLoadStatus\('loading'\)/);
});

test('커뮤니티 상세 API는 조회수와 댓글 요청을 병렬 처리한다', async () => {
  const api = await read('api/questions.js');
  const detail = api.slice(api.indexOf('async function showQuestionDetail'), api.indexOf('async function createQuestion'));

  assert.match(detail, /Promise\.all\(/);
  assert.match(detail, /increment_community_post_view/);
  assert.match(detail, /fetchCommentsForPost/);
  assert.match(detail, /nextCount !== null && Number\.isFinite\(Number\(nextCount\)\)/);
});

test('전역 회전 geometry는 App 렌더 경로에서 제거한다', async () => {
  const app = await read('src/App.jsx');

  assert.doesNotMatch(app, /InteractiveBackground/);
});
