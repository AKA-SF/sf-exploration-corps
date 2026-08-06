import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('LogEntry uses a focused responsive writing workspace with a separate mobile action layer', async () => {
  const app = await read('src/App.jsx');
  const jsx = await read('src/pages/LogEntry.jsx');
  const css = await read('src/pages/LogEntry.css');
  const portal = await read('src/pages/log-entry/MobileLogSubmitPortal.jsx');

  assert.match(app, /location\.pathname === '\/log'/);
  assert.match(jsx, /log-essential-fields/);
  assert.match(jsx, /log-optional-fields/);
  assert.match(jsx, /새 기록은 항상 나만 보기로 저장/);
  assert.match(css, /\.log-entry-container\s*\{[^}]*width:\s*min\(840px, 100%\)/);
  assert.match(css, /\.log-form\s*\{[^}]*display:\s*grid/);
  assert.match(jsx, /id=\{LOG_FORM_ID\}/);
  assert.match(jsx, /<MobileLogSubmitPortal/);
  assert.match(portal, /createPortal\(/);
  assert.match(app, /id="mobile-action-layer"[\s\S]*<Navbar/);
  assert.match(portal, /useMobileActionLayer\(\)/);
  assert.match(css, /@media \(min-width: 721px\)[^}]*\.desktop-log-submit-bar[^}]*position:\s*sticky/);
  assert.match(css, /\.log-entry-container\s*\{[\s\S]*flex:\s*0 0 auto/);
  assert.match(jsx, /작품/);
  assert.match(jsx, /한 줄 감상/);
  assert.doesNotMatch(jsx, /readiness-summary|readiness-ring/);
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

test('Profile uses a tabless two-column personal home on desktop', async () => {
  const jsx = await read('src/pages/Profile.jsx');
  const css = await read('src/pages/Profile.css');

  assert.match(jsx, /profile-home-grid/);
  assert.doesNotMatch(jsx, /role="tab"|profile-v2-rail/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.profile-home-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
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

test('all three workspaces preserve one-column reading and reachable actions on mobile', async () => {
  const logCss = await read('src/pages/LogEntry.css');
  const networkCss = await read('src/pages/NetworkV2.css');
  const profileCss = await read('src/pages/Profile.css');

  assert.match(logCss, /\.log-entry-container\s*\{[^}]*flex-direction:\s*column/);
  assert.match(logCss, /@media \(max-width: 720px\)[\s\S]*\.mobile-log-submit-bar\s*\{[^}]*position:\s*fixed/);
  assert.match(networkCss, /@media \(max-width: 680px\)[\s\S]*\.network-v2-workspace\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(profileCss, /\.profile-home-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
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
  assert.match(profileCss, /\.profile-section-heading h2\s*\{[^}]*font-size:\s*20px/);
  assert.match(profileCss, /\.profile-empty-action a\s*\{[^}]*min-height:\s*44px/);
});

test('Home desktop header surface is centered without reserving the hidden global rail', async () => {
  const app = await read('src/App.jsx');
  const css = await read('src/App.css');
  assert.match(app, /home-v2-page-container/);
  assert.match(css, /\.desktop-home \.page-container\.home-v2-page-container\s*\{[^}]*padding-left:\s*0/s);
});
