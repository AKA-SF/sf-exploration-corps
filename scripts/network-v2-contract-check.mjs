import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Network2 is list-first with separate map and radio tabs', async () => {
  const network = await read('src/pages/Network.jsx');
  for (const label of ['신호 목록', '지도', '무전']) assert.match(network, new RegExp(label));
  assert.match(network, /requestedTab = searchParams\.get\('view'\) \|\| 'signals'/);
  assert.match(network, /activeTab === 'map'[\s\S]*NetworkMapV2/);
  assert.match(network, /activeTab === 'radio'/);
});

test('Network2 consumes only restricted public exploration logs for its discovery feed', async () => {
  const network = await read('src/pages/Network.jsx');
  assert.match(network, /useVisibleExplorationLogs\(36\)/);
  assert.doesNotMatch(network, /fetchCommunityQuestions/);
  assert.doesNotMatch(network, /from\('activity_logs'\)/);
  assert.doesNotMatch(network, /from\('work_comments'\)/);
  assert.doesNotMatch(network, /Math\.max\(7/);
});

test('Network2 distinguishes a public RPC failure from a successful empty network', async () => {
  const hook = await read('src/features/exploration-logs/useVisibleExplorationLogs.js');
  const network = await read('src/pages/Network.jsx');

  assert.match(hook, /status/);
  assert.match(hook, /status: 'unavailable'/);
  assert.match(hook, /status: 'error'/);
  assert.match(hook, /reload/);
  assert.match(network, /networkSourceUnavailable/);
  assert.match(network, /공개 신호 연결을 확인하지 못했습니다/);
  assert.match(network, /다시 수신하기/);
});

test('radio data and map code are loaded only when selected', async () => {
  const network = await read('src/pages/Network.jsx');
  const radio = await read('src/pages/network/useRadioMessages.js');
  assert.match(network, /lazy\(\(\) => import\('\.\/network\/NetworkMapV2'\)\)/);
  assert.match(network, /useRadioMessages\(user, activeTab === 'radio'\)/);
  assert.match(radio, /enabled = true/);
  assert.match(radio, /if \(!enabled\) return/);
});

test('map nodes and tab controls meet touch target requirements', async () => {
  const map = await read('src/pages/network/NetworkMapV2.jsx');
  const css = await read('src/pages/NetworkV2.css');
  assert.doesNotMatch(map, /onMouseEnter|onMouseLeave/);
  assert.match(map, /<button/);
  assert.match(css, /min-(?:width|height): 48px/);
  assert.match(css, /@media \(min-width: 900px\)/);
});

test('Network2 is not constrained to the legacy device surface', async () => {
  const app = await read('src/App.jsx');
  assert.match(app, /const isDeviceSurface = false;/);
  assert.match(app, /location\.pathname\.startsWith\('\/network'\)/);
});

test('Network2 keeps the quiet grid background without animated geometry', async () => {
  const background = await read('src/components/InteractiveBackground.jsx');
  assert.match(background, /const isNetwork = location\.pathname\.startsWith\('\/network'\)/);
  assert.match(background, /const showGeometry = isVisualSurface && !isNetwork/);
});

test('Network2 empty state teaches the exploration loop and public boundary without sample signals', async () => {
  const network = await read('src/pages/Network.jsx');
  const css = await read('src/pages/NetworkV2.css');

  assert.match(network, /network-v2-empty--guided/);
  assert.match(network, /작품을 발견합니다/);
  assert.match(network, /탐사 기록을 남깁니다/);
  assert.match(network, /공개 범위를 직접 선택합니다/);
  assert.match(network, /공개되는 정보/);
  assert.match(network, /비공개로 유지/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.network-v2-empty-steps\s*\{[\s\S]*grid-template-columns:\s*repeat\(3/);
  assert.doesNotMatch(network, /sampleSignal|demoSignal|fakeSignal/);
});

test('classified public signals require consent before spoiler content is rendered', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  const network = await read('src/pages/Network.jsx');
  const detail = await read('src/pages/NetworkDetail.jsx');
  const map = await read('src/pages/network/NetworkMapV2.jsx');

  assert.match(home, /CLASSIFIED_SIGNAL/);
  assert.match(home, /분류된 탐사 신호/);
  assert.match(network, /log\.spoiler === 'CLASSIFIED_SIGNAL'/);
  assert.match(network, /스포일러가 포함된 분류 신호입니다/);
  assert.match(detail, /setSpoilerRevealed/);
  assert.match(detail, /스포일러 신호 보기/);
  assert.match(detail, /contentVisible/);
  assert.match(map, /CLASSIFIED_SIGNAL/);
  assert.match(map, /분류된 탐사 신호/);
});
