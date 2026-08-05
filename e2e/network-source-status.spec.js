import { expect, test } from '@playwright/test';

test('Network keeps RPC failure distinct from a successful empty archive in list and map views', async ({ page }) => {
  await page.route('**/src/lib/getSupabaseClient.js*', route => route.fulfill({
    body: "export async function getSupabaseClient() { return { rpc: async () => ({ data: null, error: { message: 'temporary RPC failure' } }) }; }",
    contentType: 'application/javascript',
  }));

  await page.goto('/network');

  await expect(page.getByText('공개 신호 연결을 확인하지 못했습니다.')).toBeVisible();
  await expect(page.getByText('아직 수신된 공개 신호가 없습니다.')).toHaveCount(0);
  await expect(page.locator('.network-v2-count strong')).toHaveText('—');

  await page.getByRole('tab', { name: '지도' }).click();
  await expect(page.getByText('공개 신호 연결을 확인하지 못했습니다.')).toBeVisible();
  await expect(page.getByText('표시할 공개 신호가 없습니다.')).toHaveCount(0);
});
