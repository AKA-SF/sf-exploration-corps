import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const crewMessageSource = await read('src/pages/CrewMessage.jsx');
const migrationSource = await read('supabase/migrations/20260813100000_secure_crew_profile_rpc.sql');
const schemaSource = await read('supabase/schema.sql');
const operationsSource = await read('docs/operations-plan.md');
const roadmapSource = await read('docs/product-roadmap.md');

test('crew profile lookup waits for configured authenticated state and a valid normalized code', () => {
  assert.match(crewMessageSource, /if \(loading \|\| !isConfigured \|\| !user \|\| !supabase\) return/);
  assert.match(crewMessageSource, /\^SFA-\[A-Z0-9\]\{6\}\$/);
  assert.match(crewMessageSource, /supabase\.rpc\('get_public_crew_profile'/);
  assert.match(crewMessageSource, /\[isConfigured, loading, normalizedCode, user\]/);
});

test('canonical schema baseline defines crew profile prerequisites', () => {
  assert.match(schemaSource, /create table if not exists public\.profiles\s*\([\s\S]*?id uuid[\s\S]*?nickname text[\s\S]*?public_code text[\s\S]*?title text/i);
  assert.match(schemaSource, /create or replace function public\.generate_profile_public_code\(p_user_id uuid\)/i);
});

test('secure crew RPC migration fails fast on every baseline prerequisite before function creation', () => {
  const functionOffset = migrationSource.search(/create or replace function public\.get_public_crew_profile/i);
  const guardOffset = migrationSource.search(/do\s*\$\$/i);

  assert.ok(guardOffset >= 0 && guardOffset < functionOffset, 'prerequisite guard must precede the SECURITY DEFINER RPC');
  assert.match(migrationSource, /to_regclass\('public\.profiles'\) is null/i);
  assert.match(migrationSource, /raise exception[^;]*public\.profiles/i);
  for (const column of ['id', 'nickname', 'public_code', 'title']) {
    assert.match(migrationSource, new RegExp(`column_name\\s*=\\s*'${column}'`, 'i'));
    assert.match(migrationSource, new RegExp(`raise exception[^;]*profiles\\.${column}`, 'i'));
  }
  assert.match(migrationSource, /to_regprocedure\('public\.generate_profile_public_code\(uuid\)'\) is null/i);
  assert.match(migrationSource, /raise exception[^;]*generate_profile_public_code\(uuid\)/i);
});

test('operations runbook fixes schema baseline and migrations as the canonical Supabase release order', () => {
  const baselineOffset = operationsSource.indexOf('`supabase/schema.sql`');
  const migrationsOffset = operationsSource.indexOf('`supabase/migrations`', baselineOffset);
  const preflightOffset = operationsSource.indexOf('profiles.public_code', migrationsOffset);
  const grantsOffset = operationsSource.indexOf('grant', preflightOffset);
  const smokeOffset = operationsSource.indexOf('anon/authenticated', grantsOffset);

  assert.ok(baselineOffset >= 0 && migrationsOffset > baselineOffset, 'new environments must apply schema.sql before migrations');
  assert.match(operationsSource, /새 환경[^\n]*`supabase\/schema\.sql`[^\n]*`supabase\/migrations`/);
  assert.match(operationsSource, /기존 환경[^\n]*migration 상태[^\n]*새 migration/);
  assert.match(operationsSource, /profiles\.public_code[^\n]*profiles\.title[^\n]*generate_profile_public_code\(uuid\)/);
  assert.ok(preflightOffset > migrationsOffset && grantsOffset > preflightOffset && smokeOffset > grantsOffset, 'preflight, grants, and role smoke checks must follow canonical apply order');
  assert.match(operationsSource, /Dashboard SQL dump 수동 실행을 bootstrap 대안으로 사용하지 않는다/);
});

test('product roadmap keeps crew messaging behind migration and role smoke release gates', () => {
  assert.match(roadmapSource, /대원 교신 프로필 조회[^\n]*authenticated-only[^\n]*canonical migration/);
  assert.match(roadmapSource, /원격 migration[^\n]*역할별 smoke test[^\n]*Preview 검증[^\n]*출시 완료로 판정하지 않는다/);
});

test('canonical crew profile RPC migration is idempotent and authenticated-only', () => {
  assert.match(migrationSource, /create or replace function public\.get_public_crew_profile\(p_public_code text\)/i);
  assert.match(migrationSource, /returns table\s*\(\s*id uuid,\s*nickname text,\s*public_code text,\s*title text\s*\)/i);
  assert.match(migrationSource, /security definer/i);
  assert.match(migrationSource, /set search_path = public, pg_temp/i);
  assert.match(migrationSource, /auth\.uid\(\) is not null/i);
  assert.match(migrationSource, /upper\(trim\(p_public_code\)\)/i);
  assert.match(migrationSource, /\^SFA-\[A-Z0-9\]\{6\}\$/i);
  assert.match(migrationSource, /revoke all on function public\.get_public_crew_profile\(text\) from public/i);
  assert.match(migrationSource, /revoke all on function public\.get_public_crew_profile\(text\) from anon/i);
  assert.match(migrationSource, /grant execute on function public\.get_public_crew_profile\(text\) to authenticated/i);
  assert.doesNotMatch(migrationSource, /\b(email|contact|mileage|is_admin|admin)\b/i);
  assert.doesNotMatch(migrationSource, /create table|alter table/i);
});

test('missing RPC setup copy points operators to the deployed migration prerequisite', () => {
  assert.match(crewMessageSource, /대원 프로필 조회 기능이 아직 준비되지 않았습니다\. 배포된 데이터베이스 마이그레이션을 확인해주세요/);
});
