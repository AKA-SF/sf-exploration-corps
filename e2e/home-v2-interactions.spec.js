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

const latestMedia = [
  {
    category: 'SF 관련 미디어',
    code: 'MED-001',
    description: '새로운 SF 작품을 소개하는 관측 영상입니다.',
    link: 'https://example.com/media-one',
    medium: 'YouTube',
    publisher: '관측 채널',
    tags: ['SF'],
    thumbnail: 'https://example.com/media-one.jpg',
    title: '첫 번째 미디어 신호',
    year: '2026',
  },
  {
    category: 'SF 고전 영화',
    code: 'MED-002',
    description: 'SF 고전 영화의 맥락을 살펴보는 영상입니다.',
    link: 'https://example.com/media-two',
    medium: 'YouTube',
    publisher: '고전 영화 채널',
    tags: ['고전 SF'],
    thumbnail: '',
    title: '두 번째 미디어 신호',
    year: '1979',
  },
  {
    category: 'SF 관련 미디어',
    code: 'MED-003',
    description: 'Home 최대 노출 수를 검증하기 위한 세 번째 신호입니다.',
    link: 'https://example.com/media-three',
    medium: 'Article',
    publisher: '인터뷰 채널',
    tags: ['인터뷰'],
    thumbnail: '',
    title: '세 번째 미디어 신호',
    year: '2025',
  },
];

function homeFeed() {
  return {
    counts: { concepts: 1, logs: 1, media: 1, works: 1 },
    discoveriesUnavailable: false,
    featuredConcepts: [],
    featuredWorks: [featuredWork],
    latestDiscoveries: [],
    latestMedia,
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

test('미디어 신호와 Contact를 가볍고 안전한 마지막 흐름으로 제공한다', async ({ page }, testInfo) => {
  await page.goto('/');

  const news = page.getByRole('heading', { name: '새로 포착된 SF' });
  const media = page.getByRole('region', { name: '미디어 아카이브' });
  const network = page.getByRole('heading', { name: '최근 탐사 신호' });
  const contentInfo = page.getByRole('contentinfo');

  await expect(media).toBeVisible();
  const order = await page.evaluate(() => ({
    contact: document.querySelector('.home-v2-contact')?.getBoundingClientRect().top,
    media: document.querySelector('.home-v2-media')?.getBoundingClientRect().top,
    network: document.querySelector('.home-v2-network')?.getBoundingClientRect().top,
    news: document.querySelector('.home-v2-news')?.getBoundingClientRect().top,
  }));
  expect(order.news).toBeLessThan(order.media);
  expect(order.media).toBeLessThan(order.network);
  expect(order.network).toBeLessThan(order.contact);

  const mediaCards = media.locator('.home-v2-media__card');
  await expect(mediaCards).toHaveCount(2);
  await expect(mediaCards.nth(0)).toHaveAttribute('href', latestMedia[0].link);
  await expect(mediaCards.nth(0)).toHaveAttribute('target', '_blank');
  await expect(mediaCards.nth(0)).toHaveAttribute('rel', /noopener/);
  await expect(mediaCards.nth(0)).toHaveAttribute('rel', /noreferrer/);
  await expect(mediaCards.first().locator('img')).toHaveAttribute('loading', 'lazy');
  await expect(mediaCards.first().locator('img')).toHaveAttribute('decoding', 'async');
  await expect(mediaCards.first().locator('img')).toHaveAttribute('fetchpriority', 'low');
  await expect(mediaCards.first().locator('img')).toHaveAttribute('srcset', /320w.*480w.*640w/);
  await expect(mediaCards.first().locator('img')).toHaveAttribute('sizes', /max-width: 360px/);
  await expect(page.getByText('세 번째 미디어 신호')).toHaveCount(0);
  await expect(media.getByRole('link', { name: /미디어 아카이브 전체 보기/ })).toHaveAttribute('href', '/media/media');

  const openChat = contentInfo.getByRole('link', { name: /SF 탐사단 오픈채팅방 참여하기/ });
  await expect(openChat).toHaveAttribute('href', 'https://open.kakao.com/o/goYpZVui');
  await expect(openChat).toHaveAttribute('target', '_blank');
  await expect(openChat).toHaveAttribute('rel', /noopener/);
  await expect(openChat).toHaveAttribute('rel', /noreferrer/);
  await expect(contentInfo.getByRole('link', { name: /axismusic@naver.com/ })).toHaveAttribute('href', 'mailto:axismusic@naver.com');
  await expect(page.getByText(/당신이 읽은 SF는/)).toHaveCount(0);

  await media.scrollIntoViewIfNeeded();
  const geometry = await page.evaluate(() => ({
    contactLinkHeights: [...document.querySelectorAll('.home-v2-contact__link')].map(link => link.getBoundingClientRect().height),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(geometry.contactLinkHeights.every(height => height >= 44)).toBe(true);
  expect(geometry.overflow).toBeLessThanOrEqual(1);

  if (testInfo.project.name.includes('mobile')) {
    const utility = page.locator('.home-v2-contact__utility');
    await utility.evaluate(element => element.scrollIntoView({ block: 'end' }));
    const overlap = await page.evaluate(() => {
      const utilityBox = document.querySelector('.home-v2-contact__utility')?.getBoundingClientRect();
      const navbarBox = document.querySelector('.navbar')?.getBoundingClientRect();
      if (!utilityBox || !navbarBox) return 0;
      return Math.max(0, utilityBox.bottom - navbarBox.top);
    });
    expect(overlap).toBeLessThanOrEqual(1);
  }

  await expect(news).toBeAttached();
  await expect(network).toBeAttached();
  const accessibility = await new AxeBuilder({ page })
    .include('.home-v2-media')
    .include('.home-v2-contact')
    .analyze();
  expect(accessibility.violations.filter(violation => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ))).toEqual([]);
});
