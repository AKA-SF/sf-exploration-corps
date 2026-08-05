import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Home2 is the root route and loads one compact public feed', async () => {
  const app = await read('src/App.jsx');
  const home = await read('src/pages/HomeV2.jsx');

  assert.match(app, /import\('\.\/pages\/HomeV2'\)/);
  assert.match(app, /path="\/" element={<HomeV2\s*\/>}/);
  assert.match(home, /fetch\('\/api\/home-feed'/);
  assert.doesNotMatch(home, /\/api\/(works|media|concepts|exploration-log)/);
});

test('Home2 presents discovery, record and connection as real routes', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  assert.match(home, /발견/);
  assert.match(home, /기록/);
  assert.match(home, /연결/);
  assert.match(home, /to="\/works\/novels"/);
  assert.match(home, /to="\/log"/);
  assert.match(home, /to="\/network"/);
});

test('Home2 has explicit loading, empty and error states', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  assert.match(home, /home-v2-skeleton/);
  assert.match(home, /피드를 불러오지 못했습니다/);
  assert.match(home, /다시 불러오기/);
  assert.match(home, /아직 공개된 탐사 신호가 없습니다/);
  assert.match(home, /sourceStatus\?\.signals === 'unavailable'/);
  assert.match(home, /공개 신호를 불러오지 못했습니다/);
  assert.match(home, /추천 작품 연결이 지연되고 있습니다/);
  assert.match(home, /sourceStatus\?\.concepts === 'unavailable'/);
  assert.match(home, /sourceStatus\?\.media === 'unavailable'/);
  assert.match(home, /개념·미디어 연결이 지연되고 있습니다/);
  assert.match(home, /일부 자료 연결 지연/);
});

test('Home2 radar represents only real public signals', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  assert.match(home, /signals\.slice\(0, RADAR_POSITIONS\.length\)/);
  assert.match(home, /home-v2-radar__signal/);
  assert.doesNotMatch(home, /home-v2-radar__dot--[abc]/);
});

test('Home2 turns an empty radar into a real discovery handoff and exposes the next section', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  const css = await read('src/pages/HomeV2.css');

  assert.match(home, /signals\.length > 0[\s\S]*discoveryItem[\s\S]*home-v2-radar__discovery/);
  assert.match(home, /오늘의 관측/);
  assert.match(home, /href="#home-v2-flow-title"/);
  assert.match(home, /home-v2-scroll-cue/);
  assert.match(css, /\.home-v2-scroll-cue\s*\{/);
  assert.match(css, /\.home-v2-radar__discovery\s*\{/);
});

test('Home2 labels the capped feed metric as recent records rather than a total archive count', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  assert.match(home, /<dt>최근 공개 기록<\/dt><dd>\{feed\?\.counts\?\.logs/);
  assert.doesNotMatch(home, /<dt>공개 기록<\/dt><dd>\{feed\?\.counts\?\.logs/);
});

test('Home2 exposes state-aware continuation and privacy-safe analytics', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  const analytics = await read('src/lib/productAnalytics.js');
  assert.match(home, /home-v2-continuation/);
  assert.match(home, /trackProductEvent/);
  assert.match(analytics, /HOME_EVENT_NAMES/);
  assert.doesNotMatch(analytics, /userId|email|title|memo/);
});

test('global mobile navigation exposes four Korean primary destinations', async () => {
  const navbar = await read('src/components/Navbar.jsx');
  const css = await read('src/App.css');

  for (const label of ['탐색', '기록', '네트워크', '내 정보']) {
    assert.match(navbar, new RegExp(label));
  }
  assert.doesNotMatch(navbar, /to="\/badges"/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /safe-area-inset-bottom/);
});

test('Home and global exploration navigation open the works archive', async () => {
  const app = await read('src/App.jsx');
  const home = await read('src/pages/HomeV2.jsx');
  const navbar = await read('src/components/Navbar.jsx');

  assert.match(home, /to="\/works\/novels">탐색<\/Link>/);
  assert.match(navbar, /to="\/works\/novels"[\s\S]*nav-label-primary">탐색/);
  assert.match(home, /to="\/log">기록<\/Link>/);
  assert.match(home, /to="\/network">네트워크<\/Link>/);
  assert.match(home, /user \? '\/profile' : '\/login'/);
  assert.match(app, /'콘솔 모드'\s*:\s*'읽기 모드'/);
  assert.doesNotMatch(app, />Console Mode<|>Reading Mode</);
});

test('Home keeps display preferences out of its activation flow and prioritizes a daily discovery', async () => {
  const app = await read('src/App.jsx');
  const home = await read('src/pages/HomeV2.jsx');
  const css = await read('src/pages/HomeV2.css');

  assert.doesNotMatch(app, /supportsSiteMode\s*=\s*location\.pathname\s*===\s*'\/'/);
  assert.ok(home.indexOf('id="home-v2-discovery-title"') < home.indexOf('id="home-v2-news-title"'));
  assert.match(home, /공개 여부는 나중에 직접 선택합니다/);
  assert.match(css, /\.home-v2-stats\s*\{\s*display:\s*none;/);
});

test('Home2 responsive CSS avoids fixed device width and supports reduced motion', async () => {
  const css = await read('src/pages/HomeV2.css');
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /word-break:\s*keep-all/);
  assert.doesNotMatch(css, /width:\s*450px/);
});
