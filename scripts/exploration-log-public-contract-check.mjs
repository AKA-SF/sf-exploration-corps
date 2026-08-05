import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const schemaSource = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260804003000_harden_exploration_log_public_contract.sql'), 'utf8');
const projectionSource = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260805014000_expose_exploration_log_spoiler_classification.sql'), 'utf8');

test('공개 탐사 신호 RPC는 익명 신호의 작성자와 메모를 반환하지 않는다', () => {
  assert.match(projectionSource, /create (?:or replace )?function public\.get_visible_exploration_logs/i);
  assert.match(projectionSource, /case when logs\.visibility = 'PUBLIC_SIGNAL' then profiles\.nickname else null end as nickname/i);
  assert.match(projectionSource, /case when logs\.visibility = 'PUBLIC_SIGNAL' then logs\.memo else null end as memo/i);
  assert.match(projectionSource, /where logs\.visibility in \('ANON_NETWORK', 'PUBLIC_SIGNAL'\)/i);
  assert.match(projectionSource, /returns table \([\s\S]*spoiler text[\s\S]*\)/i);
  assert.match(projectionSource, /logs\.spoiler/i);
  assert.doesNotMatch(projectionSource, /user_id uuid[\s\S]*get_visible_exploration_logs/i);
});

test('탐사 로그의 스포일러와 클라이언트 저장 식별자는 DB 제약으로 보호한다', () => {
  assert.match(schemaSource, /add column if not exists spoiler text not null default 'CLEAR_SIGNAL'/i);
  assert.match(schemaSource, /add column if not exists client_submission_id uuid/i);
  assert.match(schemaSource, /create unique index if not exists exploration_logs_user_submission_unique/i);
});
