import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const signalId = '11111111-1111-4111-8111-111111111111';

const publicSignal = {
  id: signalId,
  title: '키보드 접근성 탐사 신호',
  log_type: 'READING',
  experiences: {
    immersion: 82,
    addiction: 71,
    complexity: 64,
    visual: 58,
    derealization: 49,
    scale: 76,
  },
  emotions: Array.from({ length: 18 }, (_, index) => `감정 신호 ${String(index + 1).padStart(2, '0')}`),
  ideas: Array.from({ length: 18 }, (_, index) => `아이디어 신호 ${String(index + 1).padStart(2, '0')}`),
  memo: '공개 상세 RPC fixture로 렌더한 탐사 기록입니다.',
  visibility: 'PUBLIC_SIGNAL',
  nickname: '리아',
  spoiler: 'CLEAR_SIGNAL',
  created_at: '2026-08-14T03:00:00.000Z',
};

async function mockPublicSignalDetail(page, signal = publicSignal) {
  await page.route('**/src/lib/getSupabaseClient.js*', route => route.fulfill({
    body: `export async function getSupabaseClient() {
      return {
        from() {},
        async rpc(name, params) {
          const response = await fetch('/rest/v1/rpc/' + name, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(params),
          });
          return { data: await response.json(), error: null };
        },
      };
    }`,
    contentType: 'application/javascript',
  }));
  await page.route('**/rest/v1/rpc/get_visible_exploration_log_detail', async route => {
    expect(route.request().method()).toBe('POST');
    expect(await route.request().postDataJSON()).toEqual({ p_id: signalId });
    await route.fulfill({
      body: JSON.stringify([signal]),
      contentType: 'application/json',
      status: 200,
    });
  });
}

const seriousOrCritical = result => result.violations.filter(
  violation => violation.impact === 'serious' || violation.impact === 'critical',
);

test('공개 Network 상세의 넘치는 감정·아이디어 태그를 키보드로 탐색한다', async ({ page }) => {
  await mockPublicSignalDetail(page);
  await page.goto(`/network/${signalId}`);

  const renderedScroller = page.locator('.signals-list');
  await expect(renderedScroller).toBeVisible();
  await expect.poll(() => renderedScroller.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);

  const scroller = page.getByRole('region', { name: '감정·아이디어 태그' });
  await expect(scroller).toHaveAttribute('tabindex', '0');

  const accessibility = await new AxeBuilder({ page }).include('.response-signals').analyze();
  const blockers = seriousOrCritical(accessibility);
  expect(blockers).toEqual([]);

  await scroller.focus();
  await expect(scroller).toBeFocused();
  await expect.poll(() => scroller.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');

  const initialScrollTop = await scroller.evaluate(element => element.scrollTop);
  await page.keyboard.press('End');
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(initialScrollTop);
});

test('넘치지 않는 짧은 태그 목록에는 불필요한 tab stop을 만들지 않는다', async ({ page }) => {
  await mockPublicSignalDetail(page, {
    ...publicSignal,
    emotions: ['경이'],
    ideas: ['생태'],
  });
  await page.goto(`/network/${signalId}`);

  const scroller = page.locator('.signals-list');
  await expect(scroller).toContainText('경이');
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
  await expect(scroller).not.toHaveAttribute('tabindex', '0');
  await expect(scroller).not.toHaveAttribute('role', 'region');

  const accessibility = await new AxeBuilder({ page }).include('.response-signals').analyze();
  expect(seriousOrCritical(accessibility)).toEqual([]);
});
