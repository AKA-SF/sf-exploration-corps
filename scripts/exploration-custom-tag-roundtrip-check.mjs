import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  readExplorationDraft,
  writeExplorationDraft,
} from '../src/features/exploration-logs/explorationDraftStorage.js';
import { normalizeExplorationLogInput } from '../src/features/exploration-logs/explorationLogModel.js';

function createLocalStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('직접 입력 태그는 초안부터 DB payload와 상세까지 손실 없이 왕복한다', async () => {
  global.window = { localStorage: createLocalStorage() };
  const draft = {
    title: '솔라리스',
    memo: '타자를 이해한다는 믿음을 되묻게 했다.',
    emotions: ['경외'],
    ideas: ['정체'],
    spoiler: 'CLASSIFIED_SIGNAL',
  };

  assert.equal(writeExplorationDraft(draft, 'user-a'), true);
  assert.deepEqual(readExplorationDraft('user-a'), draft);

  const normalized = normalizeExplorationLogInput(draft);
  assert.deepEqual(normalized.emotions, ['경외']);
  assert.deepEqual(normalized.ideas, ['정체']);
  assert.equal(normalized.spoiler, 'CLASSIFIED_SIGNAL');

  const repository = await readFile(new URL('../src/features/exploration-logs/explorationLogRepository.js', import.meta.url), 'utf8');
  const detail = await readFile(new URL('../src/pages/LogResult.jsx', import.meta.url), 'utf8');
  assert.match(repository, /emotions:\s*normalized\.emotions/);
  assert.match(repository, /ideas:\s*normalized\.ideas/);
  assert.match(detail, /logData\.emotions\.map/);
  assert.match(detail, /logData\.ideas\.map/);

  delete global.window;
});
