import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260804003000_harden_exploration_log_public_contract.sql');
const source = readFileSync(migrationPath, 'utf8');

test('공개 탐사 신호 RPC는 익명 신호의 작성자와 메모를 반환하지 않는다', () => {
  assert.match(source, /create or replace function public\.get_visible_exploration_logs/i);
  assert.match(source, /case when logs\.visibility = 'PUBLIC_SIGNAL' then profiles\.nickname else null end as nickname/i);
  assert.match(source, /case when logs\.visibility = 'PUBLIC_SIGNAL' then logs\.memo else null end as memo/i);
  assert.match(source, /where logs\.visibility in \('ANON_NETWORK', 'PUBLIC_SIGNAL'\)/i);
  assert.doesNotMatch(source, /user_id uuid[\s\S]*get_visible_exploration_logs/i);
});

test('탐사 로그의 스포일러와 클라이언트 저장 식별자는 DB 제약으로 보호한다', () => {
  assert.match(source, /add column if not exists spoiler text not null default 'CLEAR_SIGNAL'/i);
  assert.match(source, /add column if not exists client_submission_id uuid/i);
  assert.match(source, /create unique index if not exists exploration_logs_user_submission_unique/i);
});
