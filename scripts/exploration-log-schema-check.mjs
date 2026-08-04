import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260803002000_create_exploration_logs.sql',
);

const source = readFileSync(migrationPath, 'utf8');

const requiredPatterns = [
  /create table if not exists public\.exploration_logs/i,
  /user_id uuid not null references auth\.users\(id\) on delete cascade/i,
  /visibility text not null default 'PRIVATE_ARCHIVE'/i,
  /check \(visibility in \('PRIVATE_ARCHIVE', 'ANON_NETWORK', 'PUBLIC_SIGNAL'\)\)/i,
  /legacy_source_id text/i,
  /create unique index if not exists exploration_logs_user_legacy_source_unique/i,
  /where legacy_source_id is not null/i,
  /alter table public\.exploration_logs enable row level security/i,
  /create policy "exploration_logs_select_own"/i,
  /create policy "exploration_logs_insert_own"/i,
  /create policy "exploration_logs_update_own"/i,
  /create policy "exploration_logs_delete_own"/i,
];

test('exploration_logs migration defines account ownership and non-public default visibility', () => {
  const missing = requiredPatterns.filter(pattern => !pattern.test(source));
  assert.deepEqual(missing, []);
});
