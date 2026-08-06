const MIN_NICKNAME_LENGTH = 2;
const MAX_NICKNAME_LENGTH = 24;
const MIN_PASSWORD_LENGTH = 8;

function requireClient(client) {
  if (!client?.auth?.updateUser) {
    throw new Error('계정 저장소에 연결할 수 없습니다.');
  }
  return client;
}

export function normalizeAccountNickname(value) {
  const nickname = String(value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');

  if (nickname.length < MIN_NICKNAME_LENGTH) {
    throw new Error('표시 이름은 2자 이상 입력해주세요.');
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    throw new Error('표시 이름은 24자 이하로 입력해주세요.');
  }
  return nickname;
}

export function supportsPasswordChange(user) {
  if (!user) return false;
  if (user?.app_metadata?.provider === 'email') return true;
  return user.identities?.some(identity => identity?.provider === 'email') ?? false;
}

export async function updateAccountNickname({ client, nickname: value, user }) {
  requireClient(client);
  if (!user?.id) throw new Error('로그인한 계정을 확인할 수 없습니다.');

  const nickname = normalizeAccountNickname(value);
  const metadata = {
    ...(user.user_metadata ?? {}),
    nickname,
    display_name: nickname,
  };
  const { data, error: authError } = await client.auth.updateUser({ data: metadata });
  if (authError) throw authError;

  return {
    nickname,
    ok: true,
    user: data?.user ?? null,
  };
}

function isReauthenticationError(error) {
  return error?.code === 'reauthentication_needed'
    || /reauthentication|reauthenticate/i.test(error?.message ?? '');
}

export async function updateAccountPassword({ client, nonce = '', password }) {
  requireClient(client);
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('새 비밀번호는 8자 이상 입력해주세요.');
  }

  const normalizedNonce = String(nonce ?? '').trim();
  const payload = normalizedNonce ? { password, nonce: normalizedNonce } : { password };
  const { error } = await client.auth.updateUser(payload);

  if (error && isReauthenticationError(error)) {
    return { error, ok: false, requiresReauthentication: true };
  }
  if (error) throw error;
  return { ok: true, requiresReauthentication: false };
}

export async function requestPasswordReauthentication(client) {
  requireClient(client);
  if (typeof client.auth.reauthenticate !== 'function') {
    throw new Error('계정 재인증을 시작할 수 없습니다.');
  }
  const { error } = await client.auth.reauthenticate();
  if (error) throw error;
  return { ok: true };
}
