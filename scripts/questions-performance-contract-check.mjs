import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('커뮤니티 상세는 목록 preview를 즉시 전달하고 직접 진입만 loading 상태를 사용한다', async () => {
  const [board, questions, hook] = await Promise.all([
    read('src/pages/questions/QuestionsBoard.jsx'),
    read('src/pages/Questions.jsx'),
    read('src/pages/questions/useQuestionsBoard.js'),
  ]);

  assert.match(board, /state=\{\{ question \}\}/);
  assert.match(questions, /useLocation\(\)/);
  assert.match(questions, /questionPreview:\s*questionId && location\.state\?\.question\?\.id === questionId/);
  assert.match(questions, /onQuestionSelect=\{prepareQuestionDetail\}/);
  assert.match(hook, /const prepareQuestionDetail = useCallback/);
  assert.match(hook, /setActiveQuestion\(question\)/);
  assert.match(hook, /detailRequestSequence/);
  assert.match(hook, /requestSequence !== detailRequestSequence\.current/);
  assert.match(hook, /error\?\.status === 404 \? 'not-found' : 'error'/);
  assert.match(hook, /commentsLoadStatus/);
  assert.match(hook, /setLoadStatus\('loading'\)/);
});

test('커뮤니티 상세 API는 조회수와 댓글 요청을 병렬 처리한다', async () => {
  const api = await read('api/questions.js');
  const detail = api.slice(api.indexOf('async function showQuestionDetail'), api.indexOf('async function createQuestion'));

  assert.match(detail, /Promise\.all\(/);
  assert.match(detail, /increment_community_post_view/);
  assert.match(detail, /fetchCommentsForPost/);
  assert.match(detail, /nextCount !== null && Number\.isFinite\(Number\(nextCount\)\)/);
});

test('전역 회전 geometry는 App 렌더 경로에서 제거한다', async () => {
  const app = await read('src/App.jsx');

  assert.doesNotMatch(app, /InteractiveBackground/);
});
