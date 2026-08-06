import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('내 정보는 탭 없는 개인 홈으로 구성된다', async () => {
  const profile = await read('src/pages/Profile.jsx');
  for (const label of ['작성 중인 기록', '최근 기록', '받은 답신', '계정과 개인정보']) {
    assert.match(profile, new RegExp(label));
  }
  assert.doesNotMatch(profile, /useSearchParams|PROFILE_TABS|role="tab"/);
});

test('진행도·미션·배지·MP 인터페이스를 내 정보에서 제거한다', async () => {
  const profile = await read('src/pages/Profile.jsx');
  assert.doesNotMatch(profile, /ProfileMissionTree|ProfileMileagePanel|ProfileBadge|ProfileStatsGrid/);
  assert.doesNotMatch(profile, /\bMP\b|진행|미션|배지/);
});

test('최근 기록은 실제 exploration_logs 저장소에서 제한해 불러온다', async () => {
  const profile = await read('src/pages/Profile.jsx');
  const hook = await read('src/pages/profile/hooks/useOwnExplorationLogs.js');
  assert.match(profile, /useOwnExplorationLogs\(isPreview \? null : user\)/);
  assert.match(hook, /listOwnExplorationLogs/);
  assert.match(hook, /limit:\s*12/);
  assert.doesNotMatch(profile, /workStatuses|ProfileReadingPanel/);
});

test('completed onboarding is omitted from the overview', async () => {
  const onboarding = await read('src/pages/profile/ProfileOnboardingPanel.jsx');
  assert.match(onboarding, /completedCount === onboardingItems\.length/);
  assert.match(onboarding, /return null/);
});

test('내 정보는 반응형 단일 컬럼 홈을 사용한다', async () => {
  const app = await read('src/App.jsx');
  const css = await read('src/pages/Profile.css');
  assert.match(app, /const isDeviceSurface = false;/);
  assert.match(css, /profile-home-grid/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /grid-template-columns/);
});

test('계정 전환 중에는 이전 사용자의 기록을 노출하지 않는다', async () => {
  const hook = await read('src/pages/profile/hooks/useOwnExplorationLogs.js');
  assert.match(hook, /loadedUserId === user\?\.id/);
  assert.match(hook, /logs: hasCurrentUserData \? state\.logs : \[\]/);
});
