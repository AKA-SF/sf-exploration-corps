import { expect, test } from '@playwright/test';

const brokenImage = 'http://127.0.0.1:4190/broken-image.jpg';
const discovery = {
  id: '00000000-0000-4000-8000-000000000099',
  image_alt: '깨진 표지를 대체하는 안내',
  image_url: brokenImage,
  is_spoiler: false,
  kind: 'NEW_RELEASE',
  media_type: 'NOVEL',
  release_date: '2026-08-11',
  source_url: 'https://example.com/source',
  summary: '이미지 연결이 끊긴 상태를 점검합니다.',
  title: '대체 표지 신호',
};

function homeFeed() {
  return {
    counts: { concepts: 0, logs: 0, media: 0, questions: 0, works: 0 },
    discoveriesUnavailable: false,
    featuredConcepts: [],
    featuredWorks: [{ code: 'broken-work', cover: brokenImage, title: '대체 작품 신호' }],
    latestDiscoveries: [discovery],
    latestMedia: [{ category: 'SF 관련 미디어', code: 'MEDIA-404', link: 'https://example.com/media', medium: 'YouTube', thumbnail: brokenImage, title: '대체 미디어 신호' }],
    latestSignals: [],
    sourceStatus: { concepts: 'available', discoveries: 'available', media: 'available', signals: 'available', works: 'available' },
  };
}

test('브랜드 404는 홈과 작품 탐색의 복구 경로를 제공한다', async ({ page }) => {
  await page.goto('/unknown-signal-path');

  await expect(page.getByText('SIGNAL NOT FOUND')).toBeVisible();
  await expect(page.getByRole('heading', { name: '찾으시는 탐사 경로를 찾지 못했습니다.' })).toBeVisible();
  await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: '작품 탐색으로' })).toHaveAttribute('href', '/works/novels');
});

test('잘못된 상세 주소와 존재하지 않는 상세를 서로 다르게 안내한다', async ({ page }) => {
  let invalidSlugRequests = 0;
  await page.route('**/api/discoveries**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('slug') === 'missing-editorial') {
      return route.fulfill({ body: JSON.stringify({ error: 'Published SF discovery not found' }), contentType: 'application/json', status: 404 });
    }
    invalidSlugRequests += 1;
    return route.abort();
  });

  await page.goto('/discover/INVALID');
  await expect(page.getByText('이 주소는 편집 추천 상세 주소가 아닙니다.')).toBeVisible();
  expect(invalidSlugRequests).toBe(0);

  await page.goto('/discover/missing-editorial');
  await expect(page.getByText('이 편집 추천을 찾을 수 없습니다.')).toBeVisible();
  await expect(page.getByText('편집 추천 연결이 지연되고 있습니다.')).toHaveCount(0);
});

test('잘못된 네트워크 상세 주소는 조회하지 않고 복구 경로를 표시한다', async ({ page }) => {
  let requestedPublicSignal = false;
  await page.route('**/rest/v1/rpc/*', route => {
    requestedPublicSignal = true;
    return route.fulfill({ body: '{}' });
  });

  await page.goto('/network/not-a-uuid');

  await expect(page.getByText('잘못된 탐사 신호 주소입니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ABORT_CONNECTION' })).toBeVisible();
  expect(requestedPublicSignal).toBe(false);
});

test('홈 CTA, 미디어 활성 탭, 깨진 이미지는 기능을 잃지 않는다', async ({ page }) => {
  await page.route('**/api/home-feed', route => route.fulfill({ body: JSON.stringify(homeFeed()), contentType: 'application/json' }));
  await page.route(brokenImage, route => route.abort());
  await page.goto('/');

  const primaryCta = page.getByRole('link', { name: /첫 작품 발견하기/ });
  await expect(primaryCta).toBeVisible();
  await primaryCta.focus();
  await expect(primaryCta).toHaveCSS('outline-width', '3px');
  await expect(page.locator('.home-v2-work__cover img')).toHaveCount(0);
  await expect(page.locator('.home-v2-work__cover svg')).toBeVisible();
  await page.locator('.home-v2-news').scrollIntoViewIfNeeded();
  await expect(page.locator('.home-v2-news__cover img')).toHaveCount(0);
  await expect(page.locator('.home-v2-news__cover svg')).toBeVisible();
  await page.locator('.home-v2-media').scrollIntoViewIfNeeded();
  await expect(page.locator('.home-v2-media__thumb img')).toHaveCount(0);
  await expect(page.locator('.home-v2-media__thumb svg')).toBeVisible();

  await page.route('**/api/media', route => route.fulfill({
    body: JSON.stringify({ media: [{ category: 'SF 고전 영화', code: 'CLASSIC-1', link: 'https://example.com/classic', medium: 'Article', tags: [], thumbnail: '', title: '고전 영화 신호', year: '1979' }] }),
    contentType: 'application/json',
  }));
  await page.goto('/media/classic-films');
  const activeTab = page.getByRole('link', { exact: true, name: 'SF 고전 영화' });
  await expect(activeTab).toHaveAttribute('aria-current', 'page');
  await expect(activeTab).toHaveCSS('background-color', 'rgb(25, 247, 241)');
  await expect(activeTab).toHaveCSS('align-items', 'center');
});
