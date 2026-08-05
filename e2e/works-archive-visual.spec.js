import { expect, test } from '@playwright/test';

const expectedConsoleTokens = {
  bg: '#05090d',
  panel: 'rgba(10, 20, 27, 0.78)',
  line: 'rgba(117, 233, 225, 0.18)',
  cyan: '#73eee5',
  amber: '#ffbd59',
};

const expectedReadingTokens = {
  bg: '#eaf0ef',
  panel: '#f7faf9',
  cyan: '#27656d',
  link: '#195862',
  text: '#172326',
  muted: '#405357',
  focus: '#8a4f13',
  line: '#718f92',
  placeholder: '#5d6f72',
};

async function readCssTokens(page, selector, tokenMap) {
  return page.locator(selector).evaluate((element, entries) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(entries.map(([key, token]) => [key, style.getPropertyValue(token).trim()]));
  }, Object.entries(tokenMap));
}

test('works archive uses the HomeV2 observatory palette and responsive controls', async ({ page }, testInfo) => {
  await page.goto('/works/novels');

  await expect(page.getByRole('heading', { name: '소설', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '작품 제보하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '읽기 모드' })).toBeVisible();

  const tokens = await readCssTokens(page, '.works-full-page', {
    bg: '--works-bg',
    panel: '--works-panel',
    line: '--works-line',
    cyan: '--works-cyan',
    amber: '--works-amber',
  });
  expect(tokens).toEqual(expectedConsoleTokens);

  const geometry = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('.works-full-tabs a, .works-full-search, .works-full-submit-button')]
      .filter(element => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && Number(style.opacity) > 0.03;
      })
      .map(element => element.getBoundingClientRect().height);
    return {
      minimumControlHeight: Math.min(...controls),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(geometry.minimumControlHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.overflow).toBeLessThanOrEqual(1);

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.page-container').evaluate(scrollContainer => {
      scrollContainer.style.scrollBehavior = 'auto';
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
    await page.waitForTimeout(100);
    const maxScrollGeometry = await page.evaluate(() => {
      const lastCard = document.querySelector('.works-full-card:last-child').getBoundingClientRect();
      const modeToggle = document.querySelector('.site-mode-toggle').getBoundingClientRect();
      return { cardBottom: lastCard.bottom, toggleTop: modeToggle.top };
    });
    expect(maxScrollGeometry.cardBottom).toBeLessThanOrEqual(maxScrollGeometry.toggleTop - 8);
  }
});

test('works archive reading mode uses the cool mineral palette with a visible focus state', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sf-site-mode', 'reading'));
  await page.goto('/works/novels');

  const tokens = await readCssTokens(page, 'html', {
    bg: '--mode-reading-bg',
    panel: '--mode-reading-panel',
    cyan: '--mode-reading-cyan',
    link: '--mode-reading-link',
    text: '--mode-reading-text',
    muted: '--mode-reading-muted',
    focus: '--mode-reading-focus',
    line: '--mode-reading-line',
    placeholder: '--mode-reading-placeholder',
  });
  expect(tokens).toEqual(expectedReadingTokens);

  const card = page.locator('.works-full-card').first();
  await expect(card).toHaveCSS('background-color', 'rgb(247, 250, 249)');

  const search = page.getByRole('searchbox', { name: '작품 아카이브 검색' });
  await search.focus();
  await expect(search).toBeFocused();
  const focusStyle = await search.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineColor: style.outlineColor, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineColor).toBe('rgb(138, 79, 19)');
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
});
