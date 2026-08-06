import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('기록 상세는 감정과 생각을 구분하고 스포일러 상태를 표시한다', async () => {
  const detail = await read('src/pages/LogResult.jsx');
  for (const label of ['느낀 감정', '남은 생각', '스포일러 포함']) {
    assert.match(detail, new RegExp(label));
  }
  assert.match(detail, /logData\.emotions\.map/);
  assert.match(detail, /logData\.ideas\.map/);
  assert.match(detail, /CLASSIFIED_SIGNAL/);
});
