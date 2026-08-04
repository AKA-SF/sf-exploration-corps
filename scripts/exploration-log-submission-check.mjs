import assert from 'node:assert/strict';
import test from 'node:test';
import { submitExplorationLog } from '../src/features/exploration-logs/explorationLogSubmission.js';

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
  emotions: ['낯섦'],
  ideas: ['타자성'],
  memo: '바다와 접촉하는 방식에 대한 기록',
  visibility: 'PRIVATE_ARCHIVE',
};

test('로그아웃 상태에서는 탐사 기록을 저장하지 않는다', async () => {
  let createCalls = 0;
  const repository = {
    async createExplorationLog() {
      createCalls += 1;
      return { id: 'should-not-exist' };
    },
  };

  await assert.rejects(
    submitExplorationLog({ repository, userId: null, input: validInput }),
    /sign in/i,
  );
  assert.equal(createCalls, 0);
});

test('인증된 사용자는 정규화 전 입력을 자신의 계정으로 한 번 저장한다', async () => {
  const calls = [];
  const repository = {
    async createExplorationLog(payload) {
      calls.push(payload);
      return { id: 'e0545f72-3f3f-4c1a-9186-111111111111', ...payload.input };
    },
  };

  const result = await submitExplorationLog({
    repository,
    userId: '5a0a2c7d-993a-4d88-9f02-0e8876b0b1c9',
    submissionId: '7f5e871d-535e-45d4-9e88-222222222222',
    input: validInput,
  });

  assert.equal(result.id, 'e0545f72-3f3f-4c1a-9186-111111111111');
  assert.deepEqual(calls, [{
    userId: '5a0a2c7d-993a-4d88-9f02-0e8876b0b1c9',
    submissionId: '7f5e871d-535e-45d4-9e88-222222222222',
    input: validInput,
  }]);
});

test('제출 식별자가 없으면 저장소를 호출하지 않는다', async () => {
  let createCalls = 0;
  const repository = { async createExplorationLog() { createCalls += 1; } };
  await assert.rejects(
    submitExplorationLog({ repository, userId: 'user-1', input: validInput }),
    /submissionId/i,
  );
  assert.equal(createCalls, 0);
});
