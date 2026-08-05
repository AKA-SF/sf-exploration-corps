import { expect, test } from '@playwright/test';

const homeFeed = {
  counts: { concepts: 1, logs: 1, works: 1 },
  featuredConcepts: [{ term: '인지적 낯설게 하기' }],
  featuredWorks: [{ code: 'W-001', title: '듄', subtitle: '사막 행성에서 발견한 생태와 권력의 신호' }],
  latestDiscoveries: [{
    id: 'discovery-1',
    kind: 'UPCOMING',
    media_type: 'FILM',
    source_name: '공식 배급사',
    source_url: 'https://example.com/official-release',
    summary: '공식 출처로 확인한 공개 예정 SF 작품입니다.',
    title: '새로운 궤도',
  }],
  latestMedia: [],
  latestSignals: [{ id: 'signal-1', title: '낯선 행성의 감각', emotions: [] }],
};

async function mockHomeFeed(page) {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(homeFeed),
  }));
}

test('Home prioritizes activation over display preferences', async ({ page }, testInfo) => {
  await mockHomeFeed(page);
  await page.goto('/');

  await expect(page.locator('.site-mode-toggle')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /첫 작품 발견하기/ })).toBeVisible();
  await expect(page.getByText('공개 여부는 나중에 직접 선택합니다.')).toBeVisible();

  const sectionOrder = await page.locator('main > section').evaluateAll(sections => sections
    .map(section => section.querySelector('h2')?.id));
  expect(sectionOrder.indexOf('home-v2-discovery-title'))
    .toBeLessThan(sectionOrder.indexOf('home-v2-news-title'));

  if (testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.home-v2-stats')).toBeHidden();
    const actionHeights = await page.locator('.home-v2-actions .home-v2-button')
      .evaluateAll(actions => actions.map(action => Math.round(action.getBoundingClientRect().height)));
    expect(actionHeights).toEqual([52, 48]);
  } else {
    await expect(page.locator('.home-v2-stats')).toBeVisible();
  }
});

test('Home distinguishes partial source failures from empty archives', async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      ...homeFeed,
      counts: { ...homeFeed.counts, logs: null, works: null },
      featuredWorks: [],
      latestSignals: [],
      sourceStatus: {
        concepts: 'available',
        discoveries: 'available',
        media: 'available',
        signals: 'unavailable',
        works: 'unavailable',
      },
    }),
  }));

  await page.goto('/');

  await expect(page.getByText('공개 신호를 불러오지 못했습니다.')).toBeVisible();
  await expect(page.getByText('추천 작품 연결이 지연되고 있습니다.')).toBeVisible();
  await expect(page.getByText('아직 공개된 탐사 신호가 없습니다.')).toHaveCount(0);
  await expect(page.getByText('추천 작품을 준비하고 있습니다.')).toHaveCount(0);
});

test('Home does not expose classified signal content', async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      ...homeFeed,
      latestSignals: [{
        emotions: ['숨겨야 할 감정'],
        id: 'classified-signal',
        spoiler: 'CLASSIFIED_SIGNAL',
        title: '숨겨야 할 제목',
      }],
      sourceStatus: { signals: 'available', works: 'available' },
    }),
  }));

  await page.goto('/');

  await expect(page.getByText('숨겨야 할 제목')).toHaveCount(0);
  await expect(page.getByText('#숨겨야 할 감정')).toHaveCount(0);
  await expect(page.getByText('분류된 탐사 신호')).toBeVisible();
});

test('Home reports concept and media source failures in the section and freshness label', async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      ...homeFeed,
      featuredConcepts: [],
      latestMedia: [],
      sourceStatus: {
        concepts: 'unavailable',
        discoveries: 'available',
        media: 'unavailable',
        signals: 'available',
        works: 'available',
      },
      syncedAt: '2026-08-05T00:00:00.000Z',
    }),
  }));

  await page.goto('/');

  await expect(page.getByText('개념·미디어 연결이 지연되고 있습니다.')).toBeVisible();
  await expect(page.getByText(/일부 자료 연결 지연/)).toBeVisible();
});
