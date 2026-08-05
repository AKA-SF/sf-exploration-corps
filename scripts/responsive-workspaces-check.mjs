import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('LogEntry uses a wide desktop report workspace instead of a mobile-width form', async () => {
  const app = await read('src/App.jsx');
  const jsx = await read('src/pages/LogEntry.jsx');
  const css = await read('src/pages/LogEntry.css');
  const portal = await read('src/pages/log-entry/MobileLogSubmitPortal.jsx');

  assert.match(app, /location\.pathname === '\/log'/);
  assert.match(jsx, /log-target-panel/);
  assert.match(jsx, /log-metrics-panel/);
  assert.match(jsx, /log-notes-panel/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /\.log-entry-container\s*\{[\s\S]*max-width:\s*1[23]\d{2}px/);
  assert.match(css, /\.log-form\s*\{[\s\S]*grid-template-columns:/);
  assert.match(jsx, /id=\{LOG_FORM_ID\}/);
  assert.match(jsx, /<MobileLogSubmitPortal/);
  assert.match(portal, /createPortal\(/);
  assert.match(app, /id="mobile-action-layer"[\s\S]*<Navbar/);
  assert.match(portal, /useMobileActionLayer\(\)/);
  assert.match(css, /\.desktop-log-submit-bar\.panel\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /\.log-entry-container\s*\{[\s\S]*flex:\s*0 0 auto/);
  assert.match(jsx, /readiness-summary/);
  assert.match(jsx, /항목 완료/);
  assert.doesNotMatch(jsx, /readiness-ring/);
  assert.doesNotMatch(css, /\.readiness-ring/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.uplink-brief\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 104px/);
});

test('Network2 has a desktop navigation rail and a separate content workspace', async () => {
  const jsx = await read('src/pages/Network.jsx');
  const css = await read('src/pages/NetworkV2.css');

  assert.match(jsx, /network-v2-workspace/);
  assert.match(jsx, /network-v2-rail/);
  assert.match(jsx, /network-v2-content/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.network-v2-workspace\s*\{[\s\S]*grid-template-columns:/);
  assert.match(css, /\.network-v2-rail\s*\{[\s\S]*position:\s*sticky/);
});

test('Profile2 combines identity and navigation into a desktop rail', async () => {
  const jsx = await read('src/pages/Profile.jsx');
  const css = await read('src/pages/Profile.css');

  assert.match(jsx, /profile-v2-rail/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.profile-v2-workspace\s*\{[\s\S]*grid-template-columns:/);
  assert.match(css, /\.profile-v2-rail\s*\{[\s\S]*position:\s*sticky/);
});

test('Login uses a desktop workspace and explains account privacy before authentication', async () => {
  const app = await read('src/App.jsx');
  const jsx = await read('src/pages/Login.jsx');
  const css = await read('src/pages/Login.css');

  assert.match(app, /location\.pathname === '\/login'/);
  assert.match(jsx, /login-workspace/);
  assert.match(jsx, /login-brief/);
  assert.match(jsx, /현재 브라우저에 저장된 탐사 기록을 계정별로 이어갑니다/);
  assert.doesNotMatch(jsx, /어느 기기에서든/);
  assert.match(jsx, /기본 저장 범위는 나만 보는 개인 아카이브/);
  assert.match(jsx, /직접 공개한 기록만 네트워크 신호/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.login-workspace\s*\{[\s\S]*grid-template-columns:/);
});

test('all three workspaces explicitly collapse to one column on mobile', async () => {
  const logCss = await read('src/pages/LogEntry.css');
  const networkCss = await read('src/pages/NetworkV2.css');
  const profileCss = await read('src/pages/Profile.css');

  assert.match(logCss, /@media \(max-width: 899px\)[\s\S]*\.log-form\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(logCss, /@media \(max-width: 899px\)[\s\S]*\.mobile-log-submit-bar\.panel\s*\{[\s\S]*position:\s*fixed/);
  assert.match(networkCss, /@media \(max-width: 680px\)[\s\S]*\.network-v2-workspace\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(profileCss, /@media\s*\(max-width:\s*680px\)[\s\S]*\.profile-v2-workspace\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test('desktop uses a navigation rail while mobile preserves the bottom navigation', async () => {
  const appCss = await read('src/App.css');
  assert.match(appCss, /@media\s*\(min-width:\s*721px\)[\s\S]*\.desktop-home \.navbar\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(appCss, /@media\s*\(max-width:\s*720px\)[\s\S]*\.desktop-home \.site-mode-toggle\s*\{[\s\S]*display:\s*none/);
});

test('primary Korean navigation labels stay readable and interactions transition explicit properties', async () => {
  const appCss = await read('src/App.css');
  const homeCss = await read('src/pages/HomeV2.css');
  const networkCss = await read('src/pages/NetworkV2.css');
  const profileCss = await read('src/pages/Profile.css');

  assert.match(appCss, /\.nav-label-primary\s*\{[\s\S]*font-size:\s*12px/);
  assert.doesNotMatch(appCss, /\.nav-item\s*\{[\s\S]{0,500}?transition:\s*all/);
  assert.match(homeCss, /\.home-v2-continuation > span\s*\{[^}]*font-size:\s*11px/);
  assert.match(networkCss, /\.network-v2-tabs button\s*\{[^}]*font-size:\s*12px/);
  assert.match(profileCss, /\.profile-tab-list button\s*\{[^}]*font-size:\s*12px/);
});

test('Home desktop header surface is centered without reserving the hidden global rail', async () => {
  const app = await read('src/App.jsx');
  const css = await read('src/App.css');
  assert.match(app, /home-v2-page-container/);
  assert.match(css, /\.desktop-home \.page-container\.home-v2-page-container\s*\{[^}]*padding-left:\s*0/s);
});
