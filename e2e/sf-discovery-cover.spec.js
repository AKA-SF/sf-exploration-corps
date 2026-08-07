import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const cover = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <rect width="600" height="900" fill="#07151c"/>
    <circle cx="430" cy="250" r="170" fill="#73eee5" opacity=".8"/>
    <path d="M0 690 600 420V900H0Z" fill="#ffbd59" opacity=".85"/>
    <text x="52" y="110" fill="#edf7f4" font-family="sans-serif" font-size="54" font-weight="700">궤도 밖의 신호</text>
    <text x="55" y="165" fill="#95aaa9" font-family="monospace" font-size="22">SCIENCE FICTION</text>
  </svg>
`)}`;

const discovery = {
  author_text: '한별 외 2명',
  id: '00000000-0000-4000-8000-000000000001',
  image_alt: null,
  image_url: cover,
  is_spoiler: false,
  kind: 'NEW_RELEASE',
  media_type: 'NOVEL',
  release_date: '2026-08-06',
  source_name: '알라딘 SF 신간 API',
  source_url: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=123456',
  publisher_text: '궤도출판사',
  summary: '완전한 책 표지와 공식 출처 링크를 검증하는 SF 신작입니다. 카드 높이를 안정적으로 유지하기 위해 긴 설명은 일부만 표시하고 상세 창에서 전체 내용을 읽을 수 있어야 합니다. 이 문장은 실제 line clamp 동작을 확인하기 위해 충분히 길게 반복되는 관측 기록입니다.',
  title: '궤도 밖의 신호',
  updated_at: '2026-08-06T14:00:00.000Z',
};

const discoveries = Array.from({ length: 4 }, (_, index) => ({
  ...discovery,
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  source_url: `${discovery.source_url}${index + 1}`,
  title: `${discovery.title} ${index + 1}`,
}));

const editorialDiscovery = {
  ...discoveries[0],
  editorial_payload: {
    books: discoveries.slice(0, 3).map(item => ({
      author: '테스트 작가',
      cover: { alt: `${item.title} 표지`, source_url: item.source_url, url: cover },
      isbn13: `978000000000${item.id.at(-1)}`,
      reason: '함께 읽는 이유입니다.',
      standing: 'SF에서의 자리입니다.',
      synopsis: '작품 소개입니다.',
      title: item.title,
      translator: '테스트 번역가',
    })),
    closing: '관측을 이어갑니다.',
    deck: '세 작품을 함께 읽습니다.',
    intro: '표지 전체와 본문을 확인합니다.',
    sources: [],
  },
};

function homeFeed() {
  return {
    counts: { concepts: 0, logs: 0, media: 0, questions: 0, works: 0 },
    discoveriesUnavailable: false,
    featuredConcepts: [],
    featuredWorks: [],
    latestDiscoveries: discoveries,
    latestMedia: [],
    latestSignals: [],
    sourceStatus: { concepts: 'available', discoveries: 'available', media: 'available', signals: 'available', works: 'available' },
    syncedAt: '2026-08-06T14:00:00.000Z',
  };
}

async function assertWholeCovers(page, imageSelector) {
  const images = page.locator(imageSelector);
  await expect(images).toHaveCount(4);
  for (const image of await images.all()) {
    await expect(image).toBeVisible();
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveAttribute('alt', /궤도 밖의 신호 \d 표지/);
  }
}

test('홈과 전체 관측 화면은 Aladin 책 표지 전체와 간결한 링크를 표시한다', async ({ page }, testInfo) => {
  const commentRequestCounts = new Map();
  await page.route('**/api/home-feed', route => route.fulfill({
    body: JSON.stringify(homeFeed()),
    contentType: 'application/json',
  }));
  await page.route('**/api/discoveries**', route => {
    const searchParams = new URL(route.request().url()).searchParams;
    if (searchParams.has('commentsFor')) {
      const discoveryId = searchParams.get('commentsFor');
      const requestCount = (commentRequestCounts.get(discoveryId) ?? 0) + 1;
      commentRequestCounts.set(discoveryId, requestCount);
      if (discoveryId === discoveries[1].id && requestCount <= 2) {
        return route.fulfill({
          body: JSON.stringify({ error: '댓글 조회 실패 fixture' }),
          contentType: 'application/json',
          status: 503,
        });
      }
      return route.fulfill({
        body: JSON.stringify({ comments: [{ author_name: '윤경', body: '조용히 오래 남는 작품이네요.', created_at: '2026-08-07T04:30:00.000Z', id: 'comment-1' }] }),
        contentType: 'application/json',
      });
    }
    const isDetail = searchParams.has('slug');
    return route.fulfill({
      body: JSON.stringify(isDetail ? { discovery: editorialDiscovery } : { discoveries }),
      contentType: 'application/json',
    });
  });

  await page.goto('/');
  const homeSection = page.locator('.home-v2-news');
  await homeSection.scrollIntoViewIfNeeded();
  await assertWholeCovers(page, '.home-v2-news__cover img');
  await expect(page.locator('.home-v2-news__bibliography').first()).toContainText('한별 외 2명');
  await expect(page.locator('.home-v2-news__bibliography').first()).toContainText('궤도출판사');
  await expect(page.locator('.home-v2-news__summary').first()).toHaveCSS(
    '-webkit-line-clamp',
    (page.viewportSize()?.width ?? 0) <= 720 ? '3' : '4',
  );
  const coverGeometry = await page.locator('.home-v2-news__cover').first().evaluate(frame => {
    const image = frame.querySelector('img');
    const frameBox = frame.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    return {
      frameRatio: frameBox.height / frameBox.width,
      imageInside: imageBox.width <= frameBox.width && imageBox.height <= frameBox.height,
    };
  });
  expect(coverGeometry.frameRatio).toBeGreaterThan(1.45);
  expect(coverGeometry.frameRatio).toBeLessThan(1.55);
  expect(coverGeometry.imageInside).toBe(true);
  await expect(page.getByRole('link', { exact: true, name: '알라딘 링크' })).toHaveCount(4);
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await expect(page.locator('.navbar').getByRole('link', { name: /커뮤니티/ })).toBeVisible();
  } else {
    await expect(page.locator('.home-v2-header__nav').getByRole('link', { name: '커뮤니티' })).toHaveCount(0);
    await expect(page.locator('.home-v2-footer').getByRole('link', { name: '커뮤니티' })).toBeAttached();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await mkdir('.hermes/artifacts', { recursive: true });
  await homeSection.screenshot({ path: `.hermes/artifacts/home-sf-cover-${testInfo.project.name}.png` });
  const homeCards = page.locator('.home-v2-news__card');
  await homeCards.last().scrollIntoViewIfNeeded();
  await expect(homeCards.last()).toBeInViewport();
  await homeCards.last().screenshot({ path: `.hermes/artifacts/home-sf-cover-last-${testInfo.project.name}.png` });

  const firstOpenButton = page.locator('.home-v2-news__open').first();
  await firstOpenButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '궤도 밖의 신호 1' })).toBeVisible();
  await expect(dialog.getByText('조용히 오래 남는 작품이네요.')).toBeVisible();
  await expect(dialog.getByText('댓글은 로그인 후 작성할 수 있습니다.')).toBeVisible();
  await expect(dialog.locator('.sf-discovery-dialog__cover img')).toHaveCSS('object-fit', 'contain');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await page.evaluate(() => {
    const backdrop = document.querySelector('.sf-discovery-dialog-backdrop');
    const bottomLayer = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 8);
    return backdrop?.parentElement === document.body && Boolean(bottomLayer?.closest('.sf-discovery-dialog-backdrop'));
  })).toBe(true);
  await expect(dialog.getByRole('button', { name: '상세 창 닫기' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await dialog.screenshot({ path: `.hermes/artifacts/home-sf-dialog-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(firstOpenButton).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

  const secondOpenButton = page.locator('.home-v2-news__open').nth(1);
  await secondOpenButton.click();
  await expect(page.getByRole('alert')).toContainText('댓글을 불러오지 못했습니다.');
  await expect(page.getByText('아직 댓글이 없습니다. 첫 의견을 남겨보세요.')).toBeHidden();
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByText('조용히 오래 남는 작품이네요.')).toBeVisible();
  await page.getByRole('button', { name: '상세 창 닫기' }).click();

  await page.goto('/discover');
  await assertWholeCovers(page, '.sf-discovery-card__image');
  await expect(page.getByRole('link', { exact: true, name: '알라딘 링크' })).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.locator('.sf-discoveries-grid').screenshot({ path: `.hermes/artifacts/discover-sf-cover-${testInfo.project.name}.png` });
  const discoveryCards = page.locator('.sf-discovery-card');
  await discoveryCards.last().scrollIntoViewIfNeeded();
  await expect(discoveryCards.last()).toBeInViewport();
  await discoveryCards.last().screenshot({ path: `.hermes/artifacts/discover-sf-cover-last-${testInfo.project.name}.png` });

  await page.goto('/discover/editorial-signal');
  const detailCovers = page.locator('.editorial-book__cover');
  await expect(detailCovers).toHaveCount(3);
  for (const detailCover of await detailCovers.all()) {
    await expect(detailCover).toHaveCSS('object-fit', 'contain');
  }
  await detailCovers.last().scrollIntoViewIfNeeded();
  await expect(detailCovers.last()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await detailCovers.last().screenshot({ path: `.hermes/artifacts/discover-detail-cover-last-${testInfo.project.name}.png` });
});
