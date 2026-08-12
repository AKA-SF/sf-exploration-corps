import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Supabase가 없는 로컬 로그인 화면은 검토 모드로 안내한다', async () => {
  const source = await read('src/pages/Login.jsx');

  assert.match(source, /현재 Preview는 계정 연결 전입니다/);
  assert.match(source, /\/profile\?preview=profile/);
  assert.match(source, /내 정보 화면 검토/);
  assert.match(source, /disabled=\{!isConfigured \|\| status === 'submitting'\}/);
});

test('이메일 로그인과 가입은 모바일 첫 화면에서 명시적인 탭으로 선택한다', async () => {
  const [source, styles] = await Promise.all([
    read('src/pages/Login.jsx'),
    read('src/pages/Login.css'),
  ]);

  assert.match(source, /className="login-mode-tabs" role="tablist" aria-label="계정 접근 방식"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=\{mode === 'signin'\}/);
  assert.match(source, /aria-selected=\{mode === 'signup'\}/);
  assert.match(source, />이메일 로그인<\/button>/);
  assert.match(source, />이메일로 가입<\/button>/);
  assert.ok(source.indexOf('login-mode-tabs') < source.indexOf('login-form'));
  assert.doesNotMatch(source, /login-mode-switch/);
  assert.match(styles, /\.login-mode-tabs/);
  assert.match(styles, /\.login-mode-tab\[aria-selected='true'\]/);
});
