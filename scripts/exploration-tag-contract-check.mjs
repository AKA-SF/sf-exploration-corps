import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeExplorationLogInput } from '../src/features/exploration-logs/explorationLogModel.js';
import {
  addExplorationTag,
  EMOTION_TAGS,
  IDEA_TAGS,
  normalizeCustomExplorationTag,
} from '../src/features/exploration-logs/explorationTagModel.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const expectedEmotions = ['경이로움', '낯섦', '불안함', '먹먹함', '쓸쓸함', '압도감', '섬뜩함', '희망'];
const expectedIdeas = ['인간다움', '기술과 윤리', '기억과 정체성', '타자와 공존', '사회와 권력', '생태와 미래', '세계의 규칙', '미래의 일상'];

test('보라·선영이 확정한 감정과 생각 추천어를 분리한다', () => {
  assert.deepEqual(EMOTION_TAGS, expectedEmotions);
  assert.deepEqual(IDEA_TAGS, expectedIdeas);
});

test('직접 입력은 짧은 한 단어만 허용한다', () => {
  assert.equal(normalizeCustomExplorationTag('  경외  '), '경외');
  assert.throws(() => normalizeCustomExplorationTag('기술 윤리'), /한 단어/);
  assert.throws(() => normalizeCustomExplorationTag('가'.repeat(13)), /12자/);
});

test('추천과 직접 입력을 합쳐 그룹당 세 개이며 중복은 추가하지 않는다', () => {
  assert.deepEqual(addExplorationTag(['낯섦'], ' 낯섦 ', { custom: true }), {
    reason: 'duplicate',
    values: ['낯섦'],
  });
  assert.deepEqual(addExplorationTag(['낯섦', '희망', '불안함'], '경외', { custom: true }), {
    reason: 'limit',
    values: ['낯섦', '희망', '불안함'],
  });
  assert.deepEqual(addExplorationTag(['낯섦'], '경외', { custom: true }), {
    reason: 'added',
    values: ['낯섦', '경외'],
  });
});

test('저장 모델도 공백과 대소문자 중복·개수·길이를 방어한다', () => {
  const normalized = normalizeExplorationLogInput({
    title: '솔라리스',
    memo: '낯선 지성과 마주한다.',
    emotions: [' 낯섦 ', '낯섦', 'AWE', 'awe'],
    ideas: ['인간다움'],
  });
  assert.deepEqual(normalized.emotions, ['낯섦', 'AWE']);
  assert.throws(() => normalizeExplorationLogInput({
    title: '솔라리스', memo: '기록', emotions: ['하나', '둘', '셋', '넷'],
  }), /3개/);
  assert.throws(() => normalizeExplorationLogInput({
    title: '솔라리스', memo: '기록', ideas: ['가'.repeat(13)],
  }), /12자/);
});

test('기록 화면은 추천 선택과 한 단어 직접 입력을 모두 제공하고 스포일러를 유지한다', async () => {
  const page = await read('src/pages/LogEntry.jsx');
  for (const label of ['느낀 감정', '남은 생각', '직접 한 단어 추가', '주요 설정이나 결말', '스포일러 포함']) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /addExplorationTag/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /maxLength=\{12\}/);
});
