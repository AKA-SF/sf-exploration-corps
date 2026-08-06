import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeExplorationLogInput,
  stableLegacySourceId,
} from '../src/features/exploration-logs/explorationLogModel.js';

const validInput = {
  title: '솔라리스',
  type: '심리 SF',
  experiences: {
    immersion: 82,
    addiction: 45,
    complexity: 88,
    visual: 61,
    derealization: 91,
    scale: 54,
  },
  emotions: ['낯섦', '불안'],
  ideas: ['타자성'],
  memo: '바다와 접촉하는 방식에 대한 기록',
  visibility: 'PRIVATE_ARCHIVE',
  spoiler: 'CLASSIFIED_SIGNAL',
};

test('정상 탐사 기록을 계정 소유 저장 형태로 정규화한다', () => {
  const result = normalizeExplorationLogInput(validInput);

  assert.deepEqual(result, {
    title: '솔라리스',
    logType: '심리 SF',
    experiences: validInput.experiences,
    emotions: ['낯섦', '불안'],
    ideas: ['타자성'],
    memo: '바다와 접촉하는 방식에 대한 기록',
    visibility: 'PRIVATE_ARCHIVE',
    spoiler: 'CLASSIFIED_SIGNAL',
  });
});

test('작품과 한 줄 감상만으로 비공개 기록을 만들 수 있다', () => {
  const result = normalizeExplorationLogInput({
    title: '솔라리스',
    type: '',
    memo: '타자를 이해한다는 믿음 자체를 되묻게 한다.',
  });

  assert.deepEqual(result, {
    title: '솔라리스',
    logType: '감상 기록',
    experiences: {},
    emotions: [],
    ideas: [],
    memo: '타자를 이해한다는 믿음 자체를 되묻게 한다.',
    visibility: 'PRIVATE_ARCHIVE',
    spoiler: 'CLEAR_SIGNAL',
  });
});

test('새 기록은 공개값이 전달되어도 먼저 비공개로 정규화한다', () => {
  const result = normalizeExplorationLogInput({
    ...validInput,
    visibility: 'PUBLIC_SIGNAL',
  });

  assert.equal(result.visibility, 'PRIVATE_ARCHIVE');
});

test('한 줄 감상이 비어 있으면 기록을 만들지 않는다', () => {
  assert.throws(
    () => normalizeExplorationLogInput({ title: '솔라리스', memo: '   ' }),
    /memo/i,
  );
});

test('허용하지 않은 공개 범위는 거부한다', () => {
  assert.throws(
    () => normalizeExplorationLogInput({ ...validInput, visibility: 'EVERYONE' }),
    /visibility/i,
  );
});

test('허용하지 않은 스포일러 분류는 거부한다', () => {
  assert.throws(
    () => normalizeExplorationLogInput({ ...validInput, spoiler: 'LEAK_EVERYTHING' }),
    /spoiler/i,
  );
});

test('레거시 탐사 기록은 사용자별 중복 없는 안정 ID를 만든다', () => {
  const legacyLog = {
    id: 'LOG-A92',
    title: 'Blade Runner 2049',
    memo: '인간보다 더 인간적인...',
  };

  assert.equal(
    stableLegacySourceId('sf_exploration_logs_v3', legacyLog),
    stableLegacySourceId('sf_exploration_logs_v3', legacyLog),
  );
  assert.notEqual(
    stableLegacySourceId('sf_exploration_logs_v3', legacyLog),
    stableLegacySourceId('sf_network_logs_v1', legacyLog),
  );
});
