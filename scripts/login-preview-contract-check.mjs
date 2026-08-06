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
