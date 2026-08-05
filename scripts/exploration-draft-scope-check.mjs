import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  activatePendingExplorationDraft,
  clearExplorationDraft,
  getExplorationDraftStorageKey,
  readExplorationDraft,
  readPendingExplorationDraft,
  selectExplorationDraft,
  writeExplorationDraft,
} from '../src/features/exploration-logs/explorationDraftStorage.js';

class MemoryStorage {
  #values = new Map();
  #failedKey = null;

  clear() { this.#values.clear(); this.#failedKey = null; }
  allowWrites() { this.#failedKey = null; }
  failWritesFor(key) { this.#failedKey = key; }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  removeItem(key) { this.#values.delete(key); }
  setItem(key, value) {
    if (key === this.#failedKey) throw new Error('quota exceeded');
    this.#values.set(key, String(value));
  }
}

globalThis.window = { localStorage: new MemoryStorage() };

test.beforeEach(() => window.localStorage.clear());

test('an anonymous draft is claimed once by the account that resumes it', () => {
  writeExplorationDraft({ title: '로그인 전 기록' });

  assert.equal(readExplorationDraft('user-a').title, '로그인 전 기록');
  assert.deepEqual(readExplorationDraft('user-b'), {});
  assert.equal(window.localStorage.getItem(getExplorationDraftStorageKey()), null);
});

test('authenticated drafts remain isolated between accounts', () => {
  writeExplorationDraft({ title: 'A의 비공개 초안' }, 'user-a');
  writeExplorationDraft({ title: 'B의 비공개 초안' }, 'user-b');

  assert.equal(readExplorationDraft('user-a').title, 'A의 비공개 초안');
  assert.equal(readExplorationDraft('user-b').title, 'B의 비공개 초안');
  assert.deepEqual(readExplorationDraft(), {});
});

test('an anonymous draft cannot leak when the first account already has a draft', () => {
  writeExplorationDraft({ title: 'A의 기존 초안' }, 'user-a');
  writeExplorationDraft({ title: '로그인 전 새 초안' });

  assert.equal(readExplorationDraft('user-a').title, 'A의 기존 초안');
  assert.equal(readPendingExplorationDraft('user-a').title, '로그인 전 새 초안');
  assert.deepEqual(readExplorationDraft('user-b'), {});

  assert.equal(activatePendingExplorationDraft('user-a').title, '로그인 전 새 초안');
  assert.equal(readPendingExplorationDraft('user-a').title, 'A의 기존 초안');

  clearExplorationDraft('user-a');
  assert.equal(readExplorationDraft('user-a').title, 'A의 기존 초안');
  assert.deepEqual(readPendingExplorationDraft('user-a'), {});
});

test('a failed pending write never deletes the only anonymous draft copy', () => {
  writeExplorationDraft({ title: 'A의 기존 초안' }, 'user-a');
  writeExplorationDraft({ title: '보존할 익명 초안' });
  window.localStorage.failWritesFor(`${getExplorationDraftStorageKey('user-a')}:pending`);

  assert.equal(readExplorationDraft('user-a').title, 'A의 기존 초안');
  assert.equal(readExplorationDraft().title, '보존할 익명 초안');
});

test('a failed queue update cannot lose the current draft during pending activation', () => {
  writeExplorationDraft({ title: 'A current' }, 'user-a');
  writeExplorationDraft({ title: 'B pending' });
  readExplorationDraft('user-a');
  window.localStorage.failWritesFor(`${getExplorationDraftStorageKey('user-a')}:pending`);

  activatePendingExplorationDraft('user-a');
  window.localStorage.allowWrites();

  assert.equal(readExplorationDraft('user-a').title, 'A current');
  assert.equal(readPendingExplorationDraft('user-a').title, 'B pending');
});

test('a failed current write rolls the pending queue back without losing either draft', () => {
  writeExplorationDraft({ title: 'A current' }, 'user-a');
  writeExplorationDraft({ title: 'B pending' });
  readExplorationDraft('user-a');
  window.localStorage.failWritesFor(getExplorationDraftStorageKey('user-a'));

  activatePendingExplorationDraft('user-a');
  window.localStorage.allowWrites();

  assert.equal(readExplorationDraft('user-a').title, 'A current');
  assert.equal(readPendingExplorationDraft('user-a').title, 'B pending');
});

test('a failed transaction journal write aborts pending activation without mutation', () => {
  writeExplorationDraft({ title: 'A current' }, 'user-a');
  writeExplorationDraft({ title: 'B pending' });
  readExplorationDraft('user-a');
  window.localStorage.failWritesFor(`${getExplorationDraftStorageKey('user-a')}:transaction`);

  activatePendingExplorationDraft('user-a');
  window.localStorage.allowWrites();

  assert.equal(readExplorationDraft('user-a').title, 'A current');
  assert.equal(readPendingExplorationDraft('user-a').title, 'B pending');
});

test('submitting one account draft does not delete another account draft', () => {
  writeExplorationDraft({ title: 'A' }, 'user-a');
  writeExplorationDraft({ title: 'B' }, 'user-b');

  clearExplorationDraft('user-a');

  assert.deepEqual(readExplorationDraft('user-a'), {});
  assert.equal(readExplorationDraft('user-b').title, 'B');
});

test('stale login route state cannot expose one account draft to another account', () => {
  const routeDraft = { title: 'A의 로그인 전 초안' };

  assert.deepEqual(selectExplorationDraft({
    routeDraft,
    routeDraftOwnerId: 'user-a',
    userId: 'user-b',
  }), {});
  assert.equal(selectExplorationDraft({
    routeDraft,
    routeDraftOwnerId: 'user-a',
    userId: 'user-a',
  }).title, 'A의 로그인 전 초안');
});

test('the legacy unscoped draft migrates to the anonymous scope', () => {
  window.localStorage.setItem('sf_exploration_log_draft_v1', JSON.stringify({ title: '기존 초안' }));

  assert.equal(readExplorationDraft().title, '기존 초안');
  assert.equal(window.localStorage.getItem('sf_exploration_log_draft_v1'), null);
});

test('LogEntry resolves account ownership before mounting the editor and exposes conflict recovery', async () => {
  const source = await readFile(new URL('../src/pages/LogEntry.jsx', import.meta.url), 'utf8');
  const loginSource = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(source, /<ResolvedLogEntry key=\{user\?\.id \|\| 'anonymous'\}/);
  assert.match(source, /readPendingExplorationDraft\(user\?\.id\)/);
  assert.match(source, /이어갈 초안을 선택하세요/);
  assert.match(source, /selectExplorationDraft\(\{/);
  assert.doesNotMatch(source, /prefilled\.draft \|\| readExplorationDraft/);
  assert.match(loginSource, /scopeReturnState\(returnState, data\.user\?\.id\)/);
});
