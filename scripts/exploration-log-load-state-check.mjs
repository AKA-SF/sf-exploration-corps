import assert from 'node:assert/strict';
import test from 'node:test';
import { getCurrentExplorationLogLoadState } from '../src/features/exploration-logs/explorationLogLoadState.js';

test('다른 계정 또는 다른 URL의 이전 기록은 새 조회가 끝날 때까지 로딩 상태로 숨긴다', () => {
  assert.equal(getCurrentExplorationLogLoadState({
    authLoading: false,
    userId: 'user-b',
    recordId: 'record-b',
    loadedKey: 'user-a:record-a',
    loadState: 'ready',
  }), 'loading');
});

test('현재 계정과 URL에 대해 확인된 기록만 준비 상태로 표시한다', () => {
  assert.equal(getCurrentExplorationLogLoadState({
    authLoading: false,
    userId: 'user-a',
    recordId: 'record-a',
    loadedKey: 'user-a:record-a',
    loadState: 'ready',
  }), 'ready');
});
