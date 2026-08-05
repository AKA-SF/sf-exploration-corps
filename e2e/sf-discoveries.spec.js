import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const discovery = {
  id: 'accessibility-discovery',
  kind: 'UPCOMING',
  media_type: 'FILM',
  release_date: '2026-10-01',
  source_name: '공식 배급사',
  source_url: 'https://example.com/official-release',
  summary: '공식 출처로 확인한 공개 예정 SF 작품입니다.',
  title: '새로운 궤도',
  updated_at: '2026-08-05T02:00:00.000Z',
};

test('Home은 새 SF source 장애를 공개 항목 없음으로 오인하지 않는다', async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      counts: { concepts: 0, logs: 0, media: 0, questions: 0, works: 0 },
      discoveriesUnavailable: true,
      featuredConcepts: [],
      featuredWorks: [],
      latestDiscoveries: [],
      latestMedia: [],
      latestSignals: [],
    }),
  }));
  await page.goto('/');
  await expect(page.getByText('새 관측 정보를 확인하지 못했습니다.')).toBeVisible();
  await expect(page.getByText('현재 공개된 새 관측 정보가 없습니다.')).toHaveCount(0);
});

test('새 SF 전체 페이지에 serious/critical 접근성 위반이 없다', async ({ page }) => {
  await page.route('**/api/discoveries**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ discoveries: [discovery] }),
  }));
  await page.goto('/discover');
  await expect(page.locator('.sf-discovery-card')).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  const blockers = results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
  expect(blockers).toEqual([]);
});

test('비로그인 사용자는 관리자 SF 편집 화면에서 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/admin/discoveries');
  await expect(page).toHaveURL(/\/login$/);
});

test('스포일러 게시물은 요약 본문을 공개하지 않는다', async ({ page }) => {
  const spoiler = { ...discovery, is_spoiler: true, summary: '범인의 정체와 결말이 포함된 내용' };
  await page.route('**/api/discoveries**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ discoveries: [spoiler] }),
  }));
  await page.goto('/discover');
  await expect(page.getByText('스포일러 포함')).toBeVisible();
  await expect(page.getByText('스포일러 보호를 위해 요약을 숨겼습니다.')).toBeVisible();
  await expect(page.getByText(spoiler.summary)).toHaveCount(0);
});
