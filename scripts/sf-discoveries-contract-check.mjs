import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

const migrationPath = 'supabase/migrations/20260805010000_create_sf_discoveries.sql';
const extensionPath = 'supabase/migrations/20260805011000_extend_sf_discoveries_editorial_fields.sql';
const triggerPath = 'supabase/migrations/20260805012000_update_sf_discovery_status_trigger.sql';
const triggerRepairPath = 'supabase/migrations/20260805013000_repair_sf_discovery_trigger.sql';

test('SF discovery records are admin-owned and the canonical table is never publicly selectable', async () => {
  const sql = await read(migrationPath);
  const extension = await read(extensionPath);

  assert.match(sql, /create table if not exists public\.sf_discoveries/i);
  assert.match(sql, /alter table public\.sf_discoveries enable row level security/i);
  assert.match(sql, /revoke all on public\.sf_discoveries from anon/i);
  assert.match(sql, /for (select|all)[\s\S]*public\.current_user_is_admin\(\)/i);
  assert.match(sql, /for insert[\s\S]*with check \(public\.current_user_is_admin\(\)\)/i);
  assert.match(sql, /for update[\s\S]*using \(public\.current_user_is_admin\(\)\)[\s\S]*with check \(public\.current_user_is_admin\(\)\)/i);
  assert.match(sql, /for delete[\s\S]*using \(public\.current_user_is_admin\(\)\)/i);
  assert.match(extension, /image_alt\s+text/i);
  assert.match(extension, /publication_status\s+text/i);
  assert.match(extension, /DRAFT[\s\S]*PUBLISHED[\s\S]*ARCHIVED/i);
});

test('public SF discovery RPC returns only published, scheduled and reviewed fields', async () => {
  const sql = await read(migrationPath);
  const extension = await read(extensionPath);
  const rpcBlock = extension.match(/create or replace function public\.get_published_sf_discoveries[\s\S]*?\$\$;/i)?.[0] ?? '';
  const returnsBlock = rpcBlock.match(/returns table\s*\(([^)]+)\)/is)?.[1] ?? '';

  assert.match(sql, /get_published_sf_discoveries/i);
  assert.match(sql, /where d\.is_published = true/i);
  assert.match(sql, /d\.published_at <= now\(\)/i);
  assert.match(sql, /least\(greatest\(coalesce\(p_limit, 24\), 1\), 60\)/i);
  assert.match(sql, /revoke all on function public\.get_published_sf_discoveries/i);
  assert.match(sql, /grant execute on function public\.get_published_sf_discoveries[\s\S]*to anon, authenticated/i);
  assert.match(rpcBlock, /publication_status\s*=\s*'PUBLISHED'/i);
  assert.match(returnsBlock, /image_alt/i);
  for (const forbidden of ['created_by', 'updated_by', 'internal_notes']) {
    const returnsBlock = sql.match(/returns table\s*\(([^)]+)\)/is)?.[1] ?? '';
    assert.doesNotMatch(returnsBlock, new RegExp(forbidden, 'i'));
  }
});

test('publication status trigger remains valid after the legacy boolean column is removed', async () => {
  const obsoleteTrigger = await read(triggerPath);
  const trigger = await read(triggerRepairPath);

  assert.match(obsoleteTrigger, /create or replace function public\.set_sf_discovery_updated_at/i);
  assert.match(trigger, /drop trigger if exists touch_sf_discovery_updated_at/i);
  assert.match(trigger, /create or replace function public\.touch_sf_discovery_updated_at/i);
  assert.match(trigger, /create trigger touch_sf_discovery_updated_at[\s\S]*execute function public\.touch_sf_discovery_updated_at\(\)/i);
  assert.match(trigger, /new\.publication_status\s*=\s*'PUBLISHED'/i);
  assert.match(trigger, /new\.published_at\s*:=\s*null/i);
  assert.match(trigger, /insert into public\.sf_discoveries/i);
  assert.match(trigger, /publication_status = 'PUBLISHED'/i);
  assert.match(trigger, /publication_status = 'ARCHIVED'/i);
  assert.match(trigger, /delete from public\.sf_discoveries/i);
  assert.doesNotMatch(trigger, /new\.is_published/i);
});

test('public API is read-only and admin writes stay behind the authenticated Supabase repository', async () => {
  const api = await read('api/discoveries.js');
  const repository = await read('src/features/sf-discoveries/sfDiscoveryRepository.js');

  assert.match(api, /request\.method !== 'GET'/);
  assert.match(api, /get_published_sf_discoveries/);
  assert.match(repository, /hasAdminRole/);
  assert.match(repository, /\.from\('sf_discoveries'\)/);
  assert.match(repository, /createDiscovery/);
  assert.match(repository, /updateDiscovery/);
  assert.match(repository, /\.eq\('updated_at', input\.updated_at\)/);
  assert.match(repository, /deleteDiscovery/);
});

test('Home and the discovery archive expose only real sourced items with loading, empty and error states', async () => {
  const app = await read('src/App.jsx');
  const home = await read('src/pages/HomeV2.jsx');
  const page = await read('src/pages/SfDiscoveries.jsx');
  const homeApi = await read('api/home-feed.js');

  assert.match(app, /import\('\.\/pages\/SfDiscoveries'\)/);
  assert.match(app, /path="\/discover" element={<SfDiscoveries\s*\/>}/);
  assert.match(home, /feed\?\.latestDiscoveries/);
  assert.match(home, /discoveriesUnavailable/);
  assert.match(home, /새로 포착된 SF/);
  assert.match(home, /to="\/discover"/);
  assert.match(page, /\/api\/discoveries/);
  assert.match(page, /정보를 불러오는 중/);
  assert.match(page, /현재 공개된 관측 정보가 없습니다/);
  assert.match(page, /정보를 불러오지 못했습니다/);
  assert.match(page, /source_url/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer"/);
  assert.match(page, /스포일러 보호를 위해 요약을 숨겼습니다/);
  assert.match(homeApi, /discoveriesUnavailable:\s*discoveriesResult\.status !== 'fulfilled'/);
  assert.match(homeApi, /preferStale:\s*false/);
  assert.match(homeApi, /Cache-Control', 'no-store'/);
});

test('admin discovery editor is a role-gated route with draft, publish and delete controls', async () => {
  const app = await read('src/App.jsx');
  const admin = await read('src/pages/Admin.jsx');
  const editor = await read('src/pages/AdminDiscoveries.jsx');

  assert.match(app, /path="\/admin\/discoveries" element={<AdminDiscoveries\s*\/>}/);
  assert.match(admin, /to="\/admin\/discoveries"/);
  assert.match(editor, /hasAdminRole\(user\)/);
  assert.match(editor, /<Navigate to="\/login" replace/);
  assert.match(editor, /createDiscovery/);
  assert.match(editor, /updateDiscovery/);
  assert.match(editor, /deleteDiscovery/);
  assert.match(editor, /publication_status/);
  assert.match(editor, /ARCHIVED/);
  assert.match(editor, /출처 URL/);
  assert.match(editor, /내부 메모/);
  assert.match(editor, /useState\('loading'\)/);
});
