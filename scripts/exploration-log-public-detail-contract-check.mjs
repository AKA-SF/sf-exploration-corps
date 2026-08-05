import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260805014000_expose_exploration_log_spoiler_classification.sql'), 'utf8');

test('공개 신호 상세 RPC는 허용된 공개 범위만 반환한다', () => {
  assert.match(source, /create (?:or replace )?function public\.get_visible_exploration_log_detail/i);
  assert.match(source, /where logs\.id = p_id/i);
  assert.match(source, /and logs\.visibility in \('ANON_NETWORK', 'PUBLIC_SIGNAL'\)/i);
  assert.match(source, /case when logs\.visibility = 'PUBLIC_SIGNAL' then logs\.memo else null end as memo/i);
  assert.match(source, /returns table \([\s\S]*spoiler text[\s\S]*\)/i);
  assert.match(source, /logs\.spoiler/i);
});
