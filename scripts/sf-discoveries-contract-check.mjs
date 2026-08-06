import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

const migrationPath = 'supabase/migrations/20260805010000_create_sf_discoveries.sql';
const extensionPath = 'supabase/migrations/20260805011000_extend_sf_discoveries_editorial_fields.sql';
const triggerPath = 'supabase/migrations/20260805012000_update_sf_discovery_status_trigger.sql';
const triggerRepairPath = 'supabase/migrations/20260805013000_repair_sf_discovery_trigger.sql';
const editorialPath = 'supabase/migrations/20260806012000_add_sf_editorial_articles.sql';
const publishedEditRepairPath = 'supabase/migrations/20260806021000_allow_published_sf_discovery_edits.sql';

test('editing published discoveries preserves publication until an explicit state transition', async () => {
  const { normalizeDiscoveryInput, publishedEditorialWorkflowChanged } = await import('../src/features/sf-discoveries/sfDiscoveryInput.js');
  const base = {
    kind: 'NEW_RELEASE',
    media_type: 'NOVEL',
    publication_status: 'PUBLISHED',
    published_at: '2026-08-06T09:00:00.000Z',
    source_name: '출판사',
    source_url: 'https://example.com/book',
    summary: '소개',
    title: '게시된 작품',
  };

  assert.equal(normalizeDiscoveryInput(base).publication_status, 'DRAFT');
  assert.equal(normalizeDiscoveryInput(base).published_at, null);
  const publishedEdit = normalizeDiscoveryInput(base, { preservePublished: true });
  assert.equal('publication_status' in publishedEdit, false);
  assert.equal('published_at' in publishedEdit, false);
  assert.equal(normalizeDiscoveryInput({ ...base, publication_status: 'ARCHIVED' }, { preservePublished: true }).publication_status, 'ARCHIVED');
  assert.equal(normalizeDiscoveryInput({ ...base, publication_status: 'DRAFT' }, { preservePublished: true }).publication_status, 'DRAFT');

  const publishedRecord = {
    ...base,
    editorial_payload: null,
    editorial_stage: 'NONE',
    selection_approval_ref: null,
    selection_approved_at: null,
  };
  assert.equal(publishedEditorialWorkflowChanged(publishedRecord, { ...publishedRecord, title: '일반 수정' }), false);
  assert.equal(publishedEditorialWorkflowChanged(publishedRecord, { ...publishedRecord, kind: 'EDITOR_PICK', editorial_stage: 'DRAFTING' }), true);
  assert.equal(publishedEditorialWorkflowChanged(
    { ...publishedRecord, kind: 'EDITOR_PICK', editorial_stage: 'APPROVED', editorial_payload: { article: 'before' } },
    { ...publishedRecord, kind: 'EDITOR_PICK', editorial_stage: 'APPROVED', editorial_payload: { article: 'after' } },
  ), true);
  assert.equal(publishedEditorialWorkflowChanged(publishedRecord, { ...publishedRecord, kind: 'EDITOR_PICK', publication_status: 'DRAFT' }), false);
});

test('published editorial workflow changes are guarded and public detail links match detail eligibility', async () => {
  const guardPath = 'supabase/migrations/20260806022000_guard_published_editorial_workflow.sql';
  const guard = await read(guardPath);
  const trigger = guard.match(/create or replace function public\.touch_sf_discovery_updated_at\(\)[\s\S]*?\$\$;/i)?.[0] ?? '';
  const listRpc = guard.match(/create or replace function public\.get_published_sf_discoveries[\s\S]*?\$\$;/i)?.[0] ?? '';

  assert.match(trigger, /old\.publication_status\s*=\s*'PUBLISHED'[\s\S]*new\.publication_status\s*=\s*'PUBLISHED'/i);
  for (const guarded of ['kind', 'editorial_stage', 'editorial_payload', 'selection_approval_ref', 'selection_approved_at']) {
    assert.match(trigger, new RegExp(`new\\.${guarded}\\s+is\\s+distinct\\s+from\\s+old\\.${guarded}`, 'i'));
  }
  assert.match(listRpc, /kind\s*=\s*'EDITOR_PICK'[\s\S]*editorial_stage\s*=\s*'APPROVED'/i);
  assert.match(listRpc, /public\.sf_editorial_payload_is_valid\(d\.editorial_payload\)/i);
});

test('the final trigger permits published content edits without reopening publish transitions', async () => {
  const repair = await read(publishedEditRepairPath);
  const trigger = repair.match(/create or replace function public\.touch_sf_discovery_updated_at\(\)[\s\S]*?\$\$;/i)?.[0] ?? '';

  assert.match(trigger, /old\.publication_status\s*<>\s*'PUBLISHED'/i);
  assert.match(trigger, /SF discoveries must be published through publish_sf_discovery\(\)/);
  assert.doesNotMatch(trigger, /Published SF discoveries are immutable/);
  assert.match(repair, /published edit changed publication_status/i);
  assert.match(repair, /published edit changed published_at/i);
  assert.match(repair, /set summary = 'Migration-only published edit verification\.'/i);
});

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
  assert.match(repository, /deleteDiscovery[\s\S]*\.eq\('updated_at', updatedAt\)/);
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

  assert.match(app, /path="\/admin\/discoveries" element={<AdminAccessBoundary><AdminDiscoveries\s*\/><\/AdminAccessBoundary>}/);
  assert.match(admin, /to="\/admin\/discoveries"/);
  assert.match(editor, /hasAdminRole\(user\)/);
  assert.match(editor, /<Navigate to="\/login" replace/);
  assert.match(editor, /createDiscovery/);
  assert.match(editor, /updateDiscovery/);
  assert.match(editor, /deleteDiscovery/);
  assert.match(editor, /publication_status/);
  assert.match(editor, /ARCHIVED/);
  assert.match(editor, /publication_status:\s*item\.publication_status\s*\?\?\s*'DRAFT'/);
  assert.doesNotMatch(editor, /item\.publication_status\s*===\s*'ARCHIVED'\s*\?\s*'ARCHIVED'\s*:\s*'DRAFT'/);
  assert.match(editor, /selectedItem\?\.publication_status === 'PUBLISHED'[\s\S]*option value="PUBLISHED">게시됨 \(유지\)<\/option>/);
  assert.match(editor, /useRef/);
  assert.match(editor, /editorHeadingRef\.current\?\.focus\(\)/);
  assert.match(editor, /<h2[^>]*ref=\{editorHeadingRef\}[^>]*tabIndex="-1"/);
  assert.match(editor, /setTimeout\([\s\S]+10_000/);
  assert.match(editor, /const updateField[\s\S]+setPendingDeleteId\(''\)[\s\S]+setPendingPublishId\(''\)/);
  assert.match(editor, /isPublishedEdit[\s\S]+공개 수정 저장/);
  assert.match(editor, /게시된 글의 수정 사항은 저장 즉시 공개 화면에 반영됩니다/);
  assert.match(editor, /확인이 만료되었습니다/);
  assert.match(editor, /내용이 변경되어 발행·삭제 확인을 취소했습니다/);
  assert.match(editor, /const startNew[\s\S]+setStatus\('ready'\)/);
  assert.match(editor, /const selectItem[\s\S]+setStatus\('ready'\)/);
  assert.match(editor, /출처 URL/);
  assert.match(editor, /내부 메모/);
  assert.match(editor, /useState\('loading'\)/);
});

test('editorial articles keep workflow state separate and publish through one guarded RPC', async () => {
  const sql = await read(editorialPath);
  const repository = await read('src/features/sf-discoveries/sfDiscoveryRepository.js');
  const editor = await read('src/pages/AdminDiscoveries.jsx');

  assert.match(sql, /editorial_payload\s+jsonb/i);
  assert.match(sql, /editorial_stage\s+text/i);
  assert.match(sql, /SELECTION_APPROVED[\s\S]*REVIEW_READY[\s\S]*APPROVED/i);
  assert.match(sql, /jsonb_array_length\(p_payload\s*->\s*'books'\)\s*=\s*3/i);
  assert.match(sql, /count\(distinct book\s*->>\s*'isbn13'\)[\s\S]{0,120}=\s*3/i);
  assert.match(sql, /book\s*->>\s*'translator'/i);
  assert.match(sql, /cover,source_url/i);
  assert.match(sql, /cover,rights_note/i);
  assert.match(sql, /count\(distinct source\s*->>\s*'url'\)/i);
  assert.match(sql, /create or replace function public\.publish_sf_discovery/i);
  assert.match(sql, /public\.current_user_is_admin\(\)/i);
  assert.match(sql, /p_expected_updated_at\s+is\s+null/i);
  assert.match(sql, /target\.updated_at\s+is\s+distinct\s+from\s+p_expected_updated_at/i);
  assert.match(sql, /tg_op\s*=\s*'INSERT'[\s\S]*tg_op\s*=\s*'UPDATE'/i);
  assert.match(sql, /old\.publication_status\s*=\s*'PUBLISHED'[\s\S]*new\.publication_status\s*=\s*'PUBLISHED'/i);
  assert.match(sql, /published_by\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /editorial_stage\s*<>\s*'APPROVED'/i);
  assert.match(sql, /rights_status/i);
  assert.match(sql, /publication_status\s*=\s*'PUBLISHED'/i);
  assert.match(repository, /publishDiscovery/);
  assert.match(repository, /\.rpc\('publish_sf_discovery'/);
  assert.match(editor, /임시저장/);
  assert.match(editor, /발행 준비 완료/);
  assert.match(editor, /hasUnsavedChanges/);
  assert.match(editor, /disabled=\{status === 'saving' \|\| hasUnsavedChanges\}/);
  assert.match(editor, /최종 발행/);
});

test('published editorial detail has a dedicated public projection and route', async () => {
  const sql = await read(publishedEditRepairPath);
  const api = await read('api/discoveries.js');
  const app = await read('src/App.jsx');
  const archive = await read('src/pages/SfDiscoveries.jsx');
  const detail = await read('src/pages/SfDiscoveryDetail.jsx');
  const article = await read('src/components/editorial/EditorialArticle.jsx');

  const rpcBlock = sql.match(/create or replace function public\.get_published_sf_discovery[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(rpcBlock, /publication_status\s*=\s*'PUBLISHED'/i);
  assert.match(rpcBlock, /kind\s*=\s*'EDITOR_PICK'/i);
  assert.match(rpcBlock, /editorial_stage\s*=\s*'APPROVED'/i);
  assert.match(rpcBlock, /public\.sf_editorial_payload_is_valid\(d\.editorial_payload\)/i);
  assert.doesNotMatch(rpcBlock, /internal_notes/i);
  assert.doesNotMatch(rpcBlock, /selection_approval_ref/i);
  assert.doesNotMatch(rpcBlock, /published_by/i);
  assert.match(rpcBlock, /rights_note/i);
  assert.match(rpcBlock, /rights_status/i);
  assert.match(rpcBlock, /#-/i);
  assert.match(api, /get_published_sf_discovery/);
  assert.doesNotMatch(api, /message:\s*error\.message/);
  assert.match(api, /request\.method !== 'GET'/);
  assert.match(app, /path="\/discover\/:slug" element={<SfDiscoveryDetail\s*\/>}/);
  assert.match(archive, /to={`\/discover\/\$\{item\.slug\}`}/);
  assert.match(detail, /editorial_payload/);
  assert.match(detail, /EditorialArticle/);
  assert.match(detail, /if \(!item\?\.editorial_payload\) throw new Error/i);
  assert.match(article, /출처와 더 읽을 곳/);
});

test('the approved draft is loaded only through an authenticated no-store admin endpoint', async () => {
  const endpoint = await read('api/editorial-draft.js');
  const editor = await read('src/pages/AdminDiscoveries.jsx');

  assert.match(endpoint, /requireAdminAccess/);
  assert.match(endpoint, /request\.method !== 'GET'/);
  assert.match(endpoint, /Cache-Control', 'private, no-store'/);
  assert.match(editor, /\/api\/editorial-draft/);
  assert.match(editor, /Authorization/);
  assert.doesNotMatch(editor, /import \{ summerClimateEditorialDraft \}/);
});
