import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const featuredWork = {
  author: '김보라',
  category: '소설',
  code: 'home-featured-work',
  cover: '',
  medium: '소설',
  subtitle: '한 번에 닫혀야 하는 작품 상세',
  tags: ['시간', '기억'],
  title: '한 번의 닫기',
};

function homeFeed() {
  return {
    counts: { concepts: 1, logs: 1, media: 1, works: 1 },
    discoveriesUnavailable: false,
    featuredConcepts: [],
    featuredWorks: [featuredWork],
    latestDiscoveries: [],
    latestMedia: [],
    latestSignals: [],
    sourceStatus: {
      concepts: 'available',
      discoveries: 'available',
      media: 'available',
      signals: 'available',
      works: 'available',
    },
    syncedAt: '2026-08-07T09:00:00.000Z',
  };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({
    body: JSON.stringify(homeFeed()),
    contentType: 'application/json',
  }));
  await page.route('**/api/works', route => route.fulfill({
    body: JSON.stringify({ works: [featuredWork] }),
    contentType: 'application/json',
  }));
});

test('오늘의 발견 작품 상세는 X 한 번으로 닫히고 route query를 제거한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-v2-work').click();

  const dialog = page.getByRole('dialog', { name: /한 번의 닫기/ });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/works\/novels\?work=home-featured-work$/);

  await dialog.getByRole('button', { name: '작품 상세 닫기' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/works\/novels$/);
  await page.waitForTimeout(100);
  await expect(page.getByRole('dialog', { name: /한 번의 닫기/ })).toHaveCount(0);
});

test('탐사 3단계 카드는 절반 높이의 전체 클릭 링크로 동작한다', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.home-v2-flow li');
  await expect(cards).toHaveCount(3);

  const geometry = await cards.evaluateAll(items => items.map(item => {
    const link = item.querySelector('a');
    const cardBox = item.getBoundingClientRect();
    const linkBox = link?.getBoundingClientRect();
    return {
      cardHeight: cardBox.height,
      linkHeight: linkBox?.height ?? 0,
      linkWidth: linkBox?.width ?? 0,
      cardWidth: cardBox.width,
    };
  }));

  for (const card of geometry) {
    expect(card.cardHeight).toBeLessThanOrEqual(160);
    expect(Math.abs(card.linkHeight - card.cardHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(card.linkWidth - card.cardWidth)).toBeLessThanOrEqual(1);
  }

  await page.getByText('소설, 영화, 게임과 새로운 SF 개념을 만납니다.').click();
  await expect(page).toHaveURL(/\/works\/novels$/);
});

test('작품 제보 modal은 본문과 최종 저장 버튼을 명확하게 표시한다', async ({ page }) => {
  await page.goto('/works/novels');
  await page.getByRole('button', { name: '작품 제보하기' }).click();

  const dialog = page.getByRole('dialog', { name: '작품 제보하기' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '작품 제보하기' })).toBeVisible();

  const titleLabel = dialog.getByText('제목', { exact: true });
  await expect(titleLabel).toHaveCSS('color', 'rgb(115, 238, 229)');

  const saveButton = dialog.getByRole('button', { name: '작품 제보 저장' });
  await saveButton.scrollIntoViewIfNeeded();
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toHaveCSS('background-color', 'rgb(115, 238, 229)');
  await expect(saveButton).toHaveCSS('color', 'rgb(0, 22, 26)');
  await expect(saveButton).toHaveCSS('opacity', '1');

  const geometry = await saveButton.evaluate(button => {
    const box = button.getBoundingClientRect();
    return {
      height: box.height,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.overflow).toBeLessThanOrEqual(1);

  const accessibility = await new AxeBuilder({ page })
    .include('.work-submit-modal')
    .analyze();
  expect(accessibility.violations.filter(violation => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ))).toEqual([]);
});
