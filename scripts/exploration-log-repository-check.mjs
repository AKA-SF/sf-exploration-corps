import assert from 'node:assert/strict';
import test from 'node:test';
import { createExplorationLogRepository } from '../src/features/exploration-logs/explorationLogRepository.js';

const userId = '5a0a2c7d-993a-4d88-9f02-0e8876b0b1c9';

function createFakeClient(rpcData = []) {
  const calls = [];
  const builder = {
    select(columns) {
      calls.push(['select', columns]);
      return this;
    },
    eq(column, value) {
      calls.push(['eq', column, value]);
      return this;
    },
    order(column, options) {
      calls.push(['order', column, options]);
      return this;
    },
    limit(value) {
      calls.push(['limit', value]);
      return Promise.resolve({ data: [], error: null });
    },
  };

  return {
    calls,
    rpc(name, args) {
      calls.push(['rpc', name, args]);
      return Promise.resolve({ data: rpcData, error: null });
    },
    from(table) {
      calls.push(['from', table]);
      return builder;
    },
  };
}

test('개인 탐사 기록 목록은 항상 활성 사용자 ID로 범위를 제한한다', async () => {
  const client = createFakeClient();
  const repository = createExplorationLogRepository(client);

  const result = await repository.listOwnExplorationLogs({ userId, limit: 30 });

  assert.deepEqual(result, []);
  assert.deepEqual(client.calls, [
    ['from', 'exploration_logs'],
    ['select', '*'],
    ['eq', 'user_id', userId],
    ['order', 'created_at', { ascending: false }],
    ['order', 'id', { ascending: false }],
    ['limit', 30],
  ]);
});

test('공개 네트워크는 제한 필드 RPC만 호출한다', async () => {
  const client = createFakeClient();
  const repository = createExplorationLogRepository(client);

  const result = await repository.listVisibleExplorationLogs({ limit: 30 });

  assert.deepEqual(result, []);
  assert.deepEqual(client.calls, [
    ['rpc', 'get_visible_exploration_logs', { p_limit: 30 }],
  ]);
});

test('공개 상세는 제한 필드 RPC로만 한 건을 조회한다', async () => {
  const client = createFakeClient();
  const repository = createExplorationLogRepository(client);
  const id = 'e0545f72-3f3f-4c1a-9186-111111111111';

  const result = await repository.getVisibleExplorationLog({ id });

  assert.equal(result, null);
  assert.deepEqual(client.calls, [
    ['rpc', 'get_visible_exploration_log_detail', { p_id: id }],
  ]);
});

test('공개 신호 모델은 스포일러 분류를 UI까지 전달한다', async () => {
  const client = createFakeClient([{
    created_at: '2026-08-05T00:00:00.000Z',
    emotions: ['경이'],
    experiences: { immersion: 80 },
    id: 'e0545f72-3f3f-4c1a-9186-222222222222',
    ideas: ['정체성'],
    log_type: '감상',
    memo: '숨겨야 할 메모',
    nickname: '탐사자',
    spoiler: 'CLASSIFIED_SIGNAL',
    title: '숨겨야 할 제목',
    visibility: 'PUBLIC_SIGNAL',
  }]);

  const [result] = await createExplorationLogRepository(client).listVisibleExplorationLogs({ limit: 1 });

  assert.equal(result.spoiler, 'CLASSIFIED_SIGNAL');
});
