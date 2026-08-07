import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/questions**', route => route.fulfill({
    body: JSON.stringify({ hasMore: false, nextCursor: '', questions: [], totalCount: 0 }),
    contentType: 'application/json',
    status: 200,
  }));
});

test('커뮤니티 새 글 modal은 예시 없이 키보드와 모바일에서 안전하게 동작한다', async ({ page }, testInfo) => {
  await page.goto('/questions');
  const trigger = page.getByRole('button', { name: '새 글 쓰기' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: '새 글 쓰기' });
  const close = dialog.getByRole('button', { name: '닫기', exact: true });
  const title = dialog.getByLabel('글 제목');
  const content = dialog.getByLabel('글 내용');
  const attachment = dialog.getByLabel('첨부 링크');

  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(title).not.toHaveAttribute('placeholder');
  await expect(content).not.toHaveAttribute('placeholder');
  await expect(attachment).not.toHaveAttribute('placeholder');
  await expect(dialog.getByRole('button', { name: '새글 저장' })).toBeDisabled();
  await expect(dialog.getByRole('link', { name: '로그인하기' })).toBeVisible();
  await expect(dialog.locator('.question-status')).toHaveAttribute('aria-live', 'polite');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.keyboard.press('Shift+Tab');
  await expect(attachment).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await mkdir('.hermes/artifacts', { recursive: true });
  await page.screenshot({
    path: `.hermes/artifacts/community-compose-${testInfo.project.name}.png`,
  });

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

  await trigger.click();
  await expect(close).toBeFocused();
  await page.locator('.question-write-backdrop').click({ position: { x: 2, y: 2 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
