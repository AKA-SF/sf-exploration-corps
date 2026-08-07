import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Home 상단은 커뮤니티 중복 링크를 제거하고 전역 내비게이션만 유지한다', async () => {
  const [home, navbar] = await Promise.all([
    read('src/pages/HomeV2.jsx'),
    read('src/components/Navbar.jsx'),
  ]);
  const topNavigation = home.slice(
    home.indexOf('<nav className="home-v2-header__nav"'),
    home.indexOf('</nav>', home.indexOf('<nav className="home-v2-header__nav"')),
  );

  assert.doesNotMatch(topNavigation, /to="\/questions">커뮤니티<\/Link>/);
  for (const label of ['탐색', '기록', '네트워크', '커뮤니티', '내 정보']) {
    assert.match(navbar, new RegExp(`nav-label-primary">${label}<`));
  }
  assert.match(navbar, /to="\/questions"/);
});

test('커뮤니티 목록과 상세는 desktop rail과 mobile 하단 5탭을 숨기지 않는다', async () => {
  const [css, appCss] = await Promise.all([
    read('src/pages/Questions.css'),
    read('src/App.css'),
  ]);

  assert.doesNotMatch(css, /\.app-wrapper:has\(\.questions-page\) \.navbar\s*\{\s*display:\s*none/);
  assert.match(css, /@media\s*\(min-width:\s*721px\)[\s\S]*\.desktop-home \.page-container:has\(\.questions-page\)[\s\S]*padding-left:\s*100px/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)[\s\S]*\.app-wrapper:has\(\.questions-page\) \.navbar[\s\S]*position:\s*fixed/);
  assert.match(css, /padding:\s*20px 12px calc\(12px \+ var\(--mobile-nav-height\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)[\s\S]*\.question-write-fab\s*\{[\s\S]*position:\s*static/);
  assert.doesNotMatch(css, /\.questions-header p\s*\{[\s\S]{0,220}word-break:\s*break-all/);
  assert.match(appCss, /--mobile-nav-height:[^;]+env\(safe-area-inset-bottom/);
});
