import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

const question = {
  attachmentUrl: '',
  author: '테스트 대원',
  canEdit: false,
  category: '자유글',
  code: 'Q-901',
  commentCount: 0,
  content: '내비게이션 검수용 본문입니다.',
  createdAt: '2026-08-07T00:00:00.000Z',
  date: '2026-08-07',
  id: '99999999-9999-4999-8999-999999999999',
  status: '공개',
  title: '내비게이션 검수 게시글',
  views: 1,
};
const questions = Array.from({ length: 20 }, (_, index) => ({
  ...question,
  code: `Q-${901 + index}`,
  id: `99999999-9999-4999-8999-${String(index + 1).padStart(12, '0')}`,
  title: `내비게이션 검수 게시글 ${index + 1}`,
}));
const labels = ['탐색', '기록', '네트워크', '커뮤니티', '내 정보'];
const destinations = {
  '탐색': '/works/novels',
  '기록': '/log',
  '네트워크': '/network',
  '커뮤니티': '/questions',
  '내 정보': '/profile',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/home-feed**', route => route.fulfill({
    body: JSON.stringify({ concepts: [], counts: {}, latestDiscoveries: [], signals: [], works: [] }),
    contentType: 'application/json',
    status: 200,
  }));
  await page.route('**/api/questions**', async route => {
    const url = new URL(route.request().url());
    await route.fulfill({
      body: JSON.stringify(url.searchParams.has('id')
        ? { comments: [], question }
        : { hasMore: false, nextCursor: '', questions, totalCount: questions.length }),
      contentType: 'application/json',
      status: 200,
    });
  });
});

test('Home 상단에는 별도 커뮤니티 링크가 없다', async ({ page }) => {
  await page.goto('/');

  const topNavigation = page.locator('.home-v2-header__nav');
  await expect(topNavigation).toBeAttached();
  await expect(topNavigation.getByRole('link', { name: '커뮤니티' })).toHaveCount(0);
});

test('커뮤니티 목록과 상세에서 5개 주요 탭과 active 상태를 유지한다', async ({ page }, testInfo) => {
  for (const path of ['/questions', `/questions/${question.id}`]) {
    await page.goto(path);
    await expect(page.locator('.questions-page')).toBeVisible();

    const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
    await expect(navigation).toBeVisible();
    for (const label of labels) {
      const link = navigation.getByRole('link', { name: new RegExp(label) });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', destinations[label]);
    }

    const communityLink = navigation.getByRole('link', { name: /커뮤니티/ });
    await expect(communityLink).toHaveClass(/active/);
    await expect(communityLink).toHaveAttribute('aria-current', 'page');

    const accessibilityScan = await new AxeBuilder({ page }).include('.navbar').analyze();
    expect(accessibilityScan.violations).toEqual([]);

    if (testInfo.project.name === 'mobile-chrome' && path === '/questions') {
      await page.locator('.question-write-fab').evaluate(element => {
        let ancestor = element.parentElement;
        while (ancestor) {
          if (ancestor.scrollHeight > ancestor.clientHeight) ancestor.scrollTop = ancestor.scrollHeight;
          ancestor = ancestor.parentElement;
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForTimeout(50);
    }

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('.navbar');
      const pageElement = document.querySelector('.questions-page');
      const fab = document.querySelector('.question-write-fab');
      const readingToggle = document.querySelector('.question-reading-toggle');
      const detailTitle = document.querySelector('.question-detail h2');
      const navRect = nav.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();
      const toggleRect = readingToggle?.getBoundingClientRect();
      const titleRect = detailTitle?.getBoundingClientRect();
      return {
        bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
        fabBottom: fab ? fab.getBoundingClientRect().bottom : null,
        fabPosition: fab ? getComputedStyle(fab).position : null,
        navBottomGap: window.innerHeight - navRect.bottom,
        navPosition: getComputedStyle(nav).position,
        navRight: navRect.right,
        navTop: navRect.top,
        pageLeft: pageRect.left,
        readingToggleOverlap: toggleRect && titleRect
          ? !(toggleRect.right <= titleRect.left
            || toggleRect.left >= titleRect.right
            || toggleRect.bottom <= titleRect.top
            || toggleRect.top >= titleRect.bottom)
          : false,
      };
    });

    expect(metrics.bodyOverflow).toBeLessThanOrEqual(0);
    if (testInfo.project.name === 'mobile-chrome') {
      expect(metrics.navPosition).toBe('fixed');
      expect(Math.abs(metrics.navBottomGap)).toBeLessThanOrEqual(1);
      if (metrics.fabBottom !== null) {
        expect(metrics.fabPosition).toBe('static');
        expect(metrics.fabBottom).toBeLessThanOrEqual(metrics.navTop);
      }
      expect(metrics.readingToggleOverlap).toBe(false);
    } else {
      expect(metrics.navRight).toBeLessThanOrEqual(metrics.pageLeft);
    }

    await mkdir('.hermes/artifacts', { recursive: true });
    await page.screenshot({
      path: `.hermes/artifacts/questions-navigation-${path === '/questions' ? 'list' : 'detail'}-${testInfo.project.name}.png`,
    });
  }
});
