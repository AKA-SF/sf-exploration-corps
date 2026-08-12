import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('owner record management exposes explicit update, visibility, and delete commands', async () => {
  const source = await read('src/features/exploration-logs/explorationLogRepository.js');
  assert.match(source, /updateOwnExplorationLog/);
  assert.match(source, /setOwnExplorationLogVisibility/);
  assert.match(source, /deleteOwnExplorationLog/);
  assert.match(source, /\.eq\('user_id', safeUserId\)/);
  assert.match(source, /updateOwnExplorationLog[\s\S]*visibility: 'PRIVATE_ARCHIVE'/);
});

test('database keeps creation private and provides owner-scoped publish lifecycle RPCs', async () => {
  const source = await read('supabase/migrations/20260812090000_manage_exploration_log_visibility.sql');
  assert.match(source, /force_exploration_log_private_on_insert/);
  assert.match(source, /set_own_exploration_log_visibility/);
  assert.match(source, /user_id = auth\.uid\(\)/);
  assert.match(source, /ANON_NETWORK/);
  assert.match(source, /PUBLIC_SIGNAL/);
  assert.match(source, /new\.updated_at := now\(\)/);
  assert.match(source, /new\.visibility <> 'PRIVATE_ARCHIVE'/);
  assert.match(source, /clear_exploration_log_public_cache/);
  assert.match(source, /cache_key like 'home-feed:%'/);
  assert.match(source, /case when logs\.spoiler = 'CLASSIFIED_SIGNAL' then null else logs\.title end/);
});

test('result and profile provide accessible publish, edit, and confirmed delete management', async () => {
  const [result, profile, logEntry] = await Promise.all([
    read('src/pages/LogResult.jsx'),
    read('src/pages/Profile.jsx'),
    read('src/pages/LogEntry.jsx'),
  ]);
  assert.match(result, /공개 범위 선택/);
  assert.match(result, /익명으로 공개/);
  assert.match(result, /닉네임과 함께 공개/);
  assert.match(profile, /기록 수정/);
  assert.match(profile, /삭제 확인/);
  assert.match(profile, /나만 보기/);
  assert.match(profile, /getFocusableElements/);
  assert.match(profile, /event\.key === 'Tab'/);
  assert.match(profile, /deleteTriggerRef\.current\?\.focus\(\)/);
  assert.match(logEntry, /수정한 공개 기록을 저장하면 네트워크 공개가 해제되고 나만 보기로 전환됩니다/);
});
