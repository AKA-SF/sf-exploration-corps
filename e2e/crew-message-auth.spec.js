import { expect, test } from '@playwright/test';

test('guest crew message route redirects without requesting the crew profile RPC', async ({ page }) => {
  const crewProfileRequests = [];
  page.on('request', request => {
    if (request.url().includes('/rpc/get_public_crew_profile')) crewProfileRequests.push(request.url());
  });

  await page.goto('/crew/SFA-ABC123/message');
  await expect(page).toHaveURL(/\/login$/);
  expect(crewProfileRequests).toEqual([]);
});
