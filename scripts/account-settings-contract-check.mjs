import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  requestPasswordReauthentication,
  supportsPasswordChange,
  updateAccountNickname,
  updateAccountPassword,
} from '../src/features/account/accountSettings.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function createClient({ authError = null } = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      async reauthenticate() {
        calls.push(['reauthenticate']);
        return { error: authError };
      },
      async updateUser(payload) {
        calls.push(['updateUser', payload]);
        return {
          data: { user: { id: 'user-1', user_metadata: payload.data ?? {} } },
          error: authError,
        };
      },
    },
  };
}

test('표시 이름은 auth metadata 한 번 쓰기로 저장한다', async () => {
  const client = createClient();
  const result = await updateAccountNickname({
    client,
    nickname: '  보라  탐사자 ',
    user: { id: 'user-1', user_metadata: { locale: 'ko' } },
  });

  assert.equal(result.nickname, '보라 탐사자');
  assert.deepEqual(client.calls, [['updateUser', {
    data: { locale: 'ko', nickname: '보라 탐사자', display_name: '보라 탐사자' },
  }]]);
});

test('DB 트리거가 auth metadata와 profile nickname을 한 트랜잭션에서 동기화한다', async () => {
  const migration = await read('supabase/migrations/20260806011000_repair_profile_nickname_sync.sql');
  assert.match(migration, /security definer/i);
  assert.match(migration, /insert into public\.profiles/i);
  assert.match(migration, /on conflict \(id\) do update/i);
  assert.match(migration, /raise exception/i);
  assert.doesNotMatch(migration, /public_code/i);
});

test('동기화 트랜잭션 오류는 성공으로 처리하지 않는다', async () => {
  const client = createClient({ authError: new Error('profile sync transaction failed') });
  await assert.rejects(() => updateAccountNickname({
    client,
    nickname: '보라',
    user: { id: 'user-1', user_metadata: {} },
  }), /profile sync transaction failed/);
  assert.equal(client.calls.length, 1);
});

test('표시 이름은 2자에서 24자만 허용한다', async () => {
  const client = createClient();
  await assert.rejects(() => updateAccountNickname({ client, nickname: '가', user: { id: 'user-1' } }), /2자/);
  await assert.rejects(() => updateAccountNickname({ client, nickname: '가'.repeat(25), user: { id: 'user-1' } }), /24자/);
});

test('email identity가 있는 계정만 비밀번호 설정 변경을 제공한다', () => {
  assert.equal(supportsPasswordChange({ identities: [{ provider: 'email' }] }), true);
  assert.equal(supportsPasswordChange({ identities: [{ provider: 'google' }] }), false);
  assert.equal(supportsPasswordChange(null), false);
});

test('비밀번호는 8자 이상이며 nonce가 있을 때만 update payload에 포함한다', async () => {
  const client = createClient();
  await assert.rejects(() => updateAccountPassword({ client, password: 'short' }), /8자/);
  await updateAccountPassword({ client, nonce: '123456', password: 'new-password' });
  assert.deepEqual(client.calls[0], ['updateUser', { password: 'new-password', nonce: '123456' }]);
});

test('재인증 요구는 오류로 뭉개지 않고 인증 코드 단계로 전달한다', async () => {
  const error = Object.assign(new Error('reauthentication needed'), { code: 'reauthentication_needed' });
  const client = createClient({ authError: error });
  const result = await updateAccountPassword({ client, password: 'new-password' });
  assert.equal(result.requiresReauthentication, true);
  await assert.rejects(() => requestPasswordReauthentication(client), /reauthentication needed/);
});

test('내 정보 화면은 이름과 비밀번호 변경 상태를 접근 가능하게 제공한다', async () => {
  const profile = await read('src/pages/Profile.jsx');
  const panel = await read('src/pages/profile/AccountSettingsPanel.jsx');
  assert.match(profile, /AccountSettingsPanel/);
  for (const label of ['현재 표시 이름', '표시 이름 변경', '비밀번호 설정 또는 변경', '변경 내용 저장']) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /isPreview/);
  assert.match(panel, /supportsPasswordChange/);
  assert.doesNotMatch(panel, /result\.partial/);
});
