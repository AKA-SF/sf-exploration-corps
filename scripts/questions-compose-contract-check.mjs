import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('새 글 작성 폼은 예시 placeholder 없이 명시적 label만 사용한다', async () => {
  const panel = await read('src/pages/questions/QuestionWritePanel.jsx');

  assert.doesNotMatch(panel, /placeholder=/);
  assert.match(panel, /<span>글 제목<\/span>/);
  assert.match(panel, /<span>글 내용<\/span>/);
  assert.match(panel, /<span>첨부 링크<\/span>/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /to="\/login">로그인하기<\/Link>/);
});

test('새 글 modal은 focus 이동·trap·Escape·복귀와 scroll lock을 제공한다', async () => {
  const questions = await read('src/pages/Questions.jsx');

  assert.match(questions, /useEffect/);
  assert.match(questions, /useRef/);
  assert.match(questions, /event\.key === 'Escape'/);
  assert.match(questions, /event\.key !== 'Tab'/);
  assert.match(questions, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(questions, /composerCloseRef\.current\?\.focus\(\)/);
  assert.match(questions, /const composerTrigger = composerTriggerRef\.current/);
  assert.match(questions, /composerTrigger\?\.focus\(\)/);
  assert.match(questions, /ref=\{composerDialogRef\}/);
  assert.match(questions, /ref=\{composerTriggerRef\}/);
  assert.match(questions, /ref=\{composerCloseRef\}/);
  assert.doesNotMatch(questions, /<button className="question-write-backdrop"/);
});

test('커뮤니티 mutation은 same-origin·인증 작성자명·안전한 첨부 URL을 강제한다', async () => {
  const [api, migration] = await Promise.all([
    read('api/questions.js'),
    read('supabase/migrations/20260807020000_harden_community_authorship.sql'),
  ]);

  assert.match(api, /import \{ verifySameOrigin \} from '\.\/_adminAccess\.js'/);
  assert.match(api, /request\.method !== 'GET' && !verifySameOrigin\(request\)/);
  assert.doesNotMatch(api, /sanitizeText\(body\.name/);
  assert.match(api, /normalizeAttachmentUrl/);
  assert.match(api, /\['http:', 'https:'\]\.includes\(url\.protocol\)/);
  assert.match(api, /private, no-store/);

  assert.match(migration, /auth\.jwt\(\)/);
  assert.match(migration, /community_posts_set_trusted_author_name/);
  assert.match(migration, /community_comments_set_trusted_author_name/);
  assert.match(migration, /community_posts_attachment_url_http/);
  assert.match(migration, /https\?:\/\//);
  assert.match(migration, /auth\.role\(\) = 'service_role'/);

  const handler = api.slice(api.indexOf('export default async function handler'));
  assert.ok(handler.indexOf('!verifySameOrigin(request)') < handler.indexOf('parseJsonBody(request)'));
  assert.ok(handler.indexOf('requireAuthenticatedUser(request, response)') < handler.indexOf('parseJsonBody(request)'));
});
