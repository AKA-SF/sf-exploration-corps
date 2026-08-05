import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile2 exposes overview, records, progress and inbox tabs', async () => {
  const profile = await read('src/pages/Profile.jsx');
  for (const label of ['개요', '내 기록', '진행', '수신함']) {
    assert.match(profile, new RegExp(label));
  }
  assert.match(profile, /useSearchParams/);
  assert.match(profile, /useProfileData\(user, activeTab\)/);
});

test('heavy profile panels mount only for their selected tab', async () => {
  const profile = await read('src/pages/Profile.jsx');
  assert.match(profile, /activeTab === 'progress'[\s\S]*ProfileMissionTree/);
  assert.match(profile, /activeTab === 'inbox'[\s\S]*ProfileMessagesPanel/);
  assert.match(profile, /activeTab === 'records'[\s\S]*ProfileReadingPanel/);
});

test('profile initial request limits are compact and full limits are tab-scoped', async () => {
  const hook = await read('src/pages/profile/hooks/useProfileData.js');
  assert.doesNotMatch(hook, /PROFILE_ACTIVITY_LIMIT\s*=\s*180/);
  assert.doesNotMatch(hook, /PROFILE_WORK_STATUS_LIMIT\s*=\s*160/);
  assert.match(hook, /activeTab === 'inbox'/);
  assert.match(hook, /activeTab === 'records'/);
  assert.match(hook, /activeTab === 'progress'/);
  assert.match(hook, /PROFILE_OVERVIEW_ACTIVITY_LIMIT\s*=\s*(?:[1-9]|1[0-2]);/);
});

test('completed onboarding is omitted from the overview', async () => {
  const onboarding = await read('src/pages/profile/ProfileOnboardingPanel.jsx');
  assert.match(onboarding, /completedCount === onboardingItems\.length/);
  assert.match(onboarding, /return null/);
});

test('Profile2 uses a responsive workspace instead of the 450px device shell', async () => {
  const app = await read('src/App.jsx');
  const css = await read('src/pages/Profile.css');
  assert.match(app, /const isDeviceSurface = false;/);
  assert.match(css, /profile-tab-list/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /grid-template-columns/);
});

test('account changes hide the previous profile until the new owner data is ready', async () => {
  const hook = await read('src/pages/profile/hooks/useProfileData.js');

  assert.match(hook, /dataOwnerId === user\.id/);
  assert.match(hook, /profile: hasCurrentUserData \? profile : null/);
  assert.match(hook, /activities: hasCurrentUserData \? activities : \[\]/);
});
