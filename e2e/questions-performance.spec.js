import { expect, test } from '@playwright/test';

const question = {
  attachmentUrl: '',
  author: '테스트 대원',
  canEdit: false,
  category: '자유글',
  code: 'Q-001',
  commentCount: 0,
  content: '목록에서 이미 받은 본문입니다.',
  createdAt: '2026-08-07T00:00:00.000Z',
  date: '2026-08-07',
  id: '11111111-1111-4111-8111-111111111111',
  status: '공개',
  title: '즉시 표시할 게시글',
  views: 7,
};

const secondQuestion = {
  ...question,
  content: '두 번째 게시글 본문입니다.',
  id: '33333333-3333-4333-8333-333333333333',
  title: '두 번째 게시글',
};
const missingQuestionId = '44444444-4444-4444-8444-444444444444';

const delayedDetail = async route => {
  await new Promise(resolve => setTimeout(resolve, 1_200));
  await route.fulfill({
    body: JSON.stringify({
      comments: [{
        canEdit: false,
        content: '지연 후 도착한 댓글',
        date: '2026-08-07',
        id: '22222222-2222-4222-8222-222222222222',
        name: '댓글 대원',
      }],
      question: { ...question, commentCount: 1, views: 8 },
    }),
    contentType: 'application/json',
    status: 200,
  });
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/questions**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('id')) {
      if (url.searchParams.get('id') === missingQuestionId) {
        await route.fulfill({
          body: JSON.stringify({ error: 'Question not found' }),
          contentType: 'application/json',
          status: 404,
        });
        return;
      }
      if (url.searchParams.get('id') === secondQuestion.id) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.fulfill({
          body: JSON.stringify({ comments: [], question: secondQuestion }),
          contentType: 'application/json',
          status: 200,
        });
        return;
      }
      await delayedDetail(route);
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ hasMore: false, nextCursor: '', questions: [question, secondQuestion], totalCount: 2 }),
      contentType: 'application/json',
      status: 200,
    });
  });
});

test('목록에서 게시글을 누르면 API를 기다리지 않고 본문을 표시한다', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('link', { name: new RegExp(question.title) }).click();

  await expect(page.getByRole('heading', { name: question.title })).toBeVisible({ timeout: 500 });
  await expect(page.getByText(question.content)).toBeVisible({ timeout: 500 });
  await expect(page.getByText('게시글을 찾을 수 없습니다')).toHaveCount(0);
  await expect(page.getByText('댓글을 불러오는 중입니다.')).toBeVisible({ timeout: 500 });
  await expect(page.getByText('아직 댓글이 없습니다.')).toHaveCount(0);
  await expect(page.getByText('지연 후 도착한 댓글')).toBeVisible({ timeout: 2_000 });
});

test('상세 직접 진입은 잘못된 not-found 대신 loading을 표시한다', async ({ page }) => {
  await page.goto(`/questions/${question.id}`);

  await expect(page.getByText('게시글을 불러오는 중입니다')).toBeVisible({ timeout: 500 });
  await expect(page.getByText('게시글을 찾을 수 없습니다')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: question.title })).toBeVisible({ timeout: 2_000 });
});

test('늦게 도착한 이전 상세 응답은 현재 게시글을 덮어쓰지 않는다', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('link', { name: new RegExp(question.title) }).click();
  await page.goBack();
  await page.getByRole('link', { name: new RegExp(secondQuestion.title) }).click();

  await expect(page.getByRole('heading', { name: secondQuestion.title })).toBeVisible({ timeout: 500 });
  await page.waitForTimeout(1_400);
  await expect(page.getByRole('heading', { name: secondQuestion.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: question.title })).toHaveCount(0);
});

test('존재하지 않는 상세는 연결 오류가 아니라 not-found로 안내한다', async ({ page }) => {
  await page.goto(`/questions/${missingQuestionId}`);

  await expect(page.getByText('게시글을 찾을 수 없습니다')).toBeVisible();
  await expect(page.getByText('게시글 연결이 지연되고 있습니다')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '댓글 저장' })).toHaveCount(0);
});

test('다른 route ID의 history preview는 상세 본문으로 사용하지 않는다', async ({ page }) => {
  await page.route('**/api/questions**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('id') !== secondQuestion.id) {
      await route.fallback();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1_200));
    await route.fulfill({
      body: JSON.stringify({ comments: [], question: secondQuestion }),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.goto('/questions');
  await page.evaluate(({ preview, routeId }) => {
    window.history.replaceState(
      { ...window.history.state, usr: { question: preview } },
      '',
      `/questions/${routeId}`,
    );
  }, { preview: question, routeId: secondQuestion.id });
  await page.reload();

  await expect(page.getByText('게시글을 불러오는 중입니다')).toBeVisible({ timeout: 500 });
  await expect(page.getByRole('heading', { name: question.title })).toHaveCount(0);
});

test('커뮤니티 새로고침에는 회전 geometry가 렌더되지 않는다', async ({ page }) => {
  await page.goto('/questions');
  await expect(page.locator('.questions-page')).toBeVisible();
  await expect(page.locator('.bg-geometry, .geo-triangle, .geo-spin, .geo-spin-reverse')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.questions-page')).toBeVisible();
  await expect(page.locator('.bg-geometry, .geo-triangle, .geo-spin, .geo-spin-reverse')).toHaveCount(0);
});

test('기존 geometry 대상 화면에도 회전 장식이 다시 나타나지 않는다', async ({ page }) => {
  for (const path of ['/works', '/media', '/exploration-log']) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.bg-geometry, .geo-triangle, .geo-spin, .geo-spin-reverse')).toHaveCount(0);
  }
});
