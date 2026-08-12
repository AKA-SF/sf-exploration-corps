import { expect, test } from '@playwright/test';

const latestSignals = [
  { created_at: '2026-08-11T12:00:00.000Z', emotions: ['경이'], id: 'signal-1', log_type: '감상 기록', title: '낯선 행성의 감각' },
  { created_at: '2026-08-10T12:00:00.000Z', emotions: ['호기심'], id: 'signal-2', log_type: '관찰 기록', title: '궤도 밖의 식물학' },
  { created_at: '2026-08-09T12:00:00.000Z', emotions: ['고요'], id: 'signal-3', log_type: '감상 기록', title: '인공 태양의 그늘' },
  { created_at: '2026-08-08T12:00:00.000Z', emotions: ['기대'], id: 'signal-4', log_type: '탐사 기록', title: '먼 행성의 귀환 신호' },
  { created_at: '2026-08-07T12:00:00.000Z', emotions: ['불안'], id: 'signal-5', log_type: '감상 기록', title: '노출되면 안 되는 다섯 번째 신호' },
];

async function mockHomeFeed(page) {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      counts: { concepts: 0, logs: latestSignals.length, works: 0 },
      featuredConcepts: [],
      featuredWorks: [],
      latestDiscoveries: [],
      latestMedia: [],
      latestSignals,
      sourceStatus: { concepts: 'available', discoveries: 'available', media: 'available', signals: 'available', works: 'available' },
    }),
  }));
}

test('Home limits latest signals to four and keeps the card grid responsive', async ({ page }, testInfo) => {
  await mockHomeFeed(page);
  await page.goto('/');

  const grid = page.locator('.home-v2-signal-grid');
  const cards = grid.locator('.home-v2-signal');
  await expect(cards).toHaveCount(4);
  await expect(page.getByText('노출되면 안 되는 다섯 번째 신호')).toHaveCount(0);

  const geometry = await grid.evaluate(element => {
    const cards = [...element.querySelectorAll('.home-v2-signal')].map(card => card.getBoundingClientRect());
    return {
      columns: new Set(cards.map(card => Math.round(card.left))).size,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(geometry.overflow).toBeLessThanOrEqual(2);
  expect(geometry.columns).toBe(testInfo.project.name.includes('mobile') ? 1 : 4);
  await expect(cards.first()).toHaveAttribute('href', '/network/signal-1');
  await expect(cards.first()).toContainText('SIGNAL 01');
});
