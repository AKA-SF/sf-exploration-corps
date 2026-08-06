import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appCss = await readFile(new URL('../src/App.css', import.meta.url), 'utf8');
const profileCss = await readFile(new URL('../src/pages/Profile.css', import.meta.url), 'utf8');

test('모바일 계정 작업은 하단 내비게이션 위로 스크롤된다', () => {
  assert.match(appCss, /\.page-container[^}]*scroll-padding-bottom:\s*calc\([^;]*--mobile-nav-height/s);
  assert.match(appCss, /@media \(max-width:\s*720px\)[\s\S]*?\.page-container\s*\{[^}]*margin-bottom:\s*var\(--mobile-nav-height\)/);
  assert.match(profileCss, /\.account-setting-task summary[^}]*scroll-margin-bottom/s);
});
