import { useState } from 'react';
import { KeyRound, Save, UserRound } from 'lucide-react';
import {
  requestPasswordReauthentication,
  supportsPasswordChange,
  updateAccountNickname,
  updateAccountPassword,
} from '../../features/account/accountSettings';
import { getSupabaseClient } from '../../lib/getSupabaseClient';
import { getUserNickname } from '../../lib/userIdentity';

const emptyPasswordForm = { confirmPassword: '', nonce: '', password: '' };

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export default function AccountSettingsPanel({ isPreview, onNicknameChange, user }) {
  const currentNickname = isPreview ? '프리뷰 탐사자' : getUserNickname(user);
  const [nickname, setNickname] = useState(currentNickname);
  const [nameState, setNameState] = useState({ message: '', status: 'idle' });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordPhase, setPasswordPhase] = useState('edit');
  const [passwordState, setPasswordState] = useState({ message: '', status: 'idle' });
  const canChangePassword = !isPreview && supportsPasswordChange(user);


  const handleNicknameSubmit = async event => {
    event.preventDefault();
    if (isPreview) return;
    setNameState({ message: '표시 이름을 저장하고 있습니다.', status: 'saving' });
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('계정 저장소에 연결할 수 없습니다.');
      const result = await updateAccountNickname({ client, nickname, user });
      setNickname(result.nickname);
      onNicknameChange?.(result.nickname);
      setNameState({ message: '표시 이름을 변경했습니다.', status: 'success' });
    } catch (error) {
      setNameState({ message: errorMessage(error, '표시 이름을 변경하지 못했습니다.'), status: 'error' });
    }
  };

  const updatePasswordField = event => {
    const { name, value } = event.target;
    setPasswordForm(current => ({ ...current, [name]: value }));
  };

  const handlePasswordSubmit = async event => {
    event.preventDefault();
    if (!canChangePassword) return;
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordState({ message: '새 비밀번호가 서로 일치하지 않습니다.', status: 'error' });
      return;
    }

    setPasswordState({ message: '비밀번호를 변경하고 있습니다.', status: 'saving' });
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('계정 저장소에 연결할 수 없습니다.');
      const result = await updateAccountPassword({
        client,
        nonce: passwordPhase === 'nonce' ? passwordForm.nonce : '',
        password: passwordForm.password,
      });

      if (result.requiresReauthentication) {
        await requestPasswordReauthentication(client);
        setPasswordPhase('nonce');
        setPasswordState({
          message: '계정 이메일로 인증 코드를 보냈습니다. 코드를 입력해 변경을 마쳐주세요.',
          status: 'reauthentication',
        });
        return;
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordPhase('edit');
      setPasswordState({ message: '비밀번호를 변경했습니다.', status: 'success' });
    } catch (error) {
      setPasswordState({ message: errorMessage(error, '비밀번호를 변경하지 못했습니다.'), status: 'error' });
    }
  };

  return (
    <div className="account-settings-panel">
      <dl className="profile-account-list">
        <div><dt>현재 표시 이름</dt><dd>{currentNickname}</dd></div>
        <div><dt>로그인 이메일</dt><dd>{isPreview ? '로그인 후 실제 계정 정보가 표시됩니다.' : user?.email || '이메일 정보 없음'}</dd></div>
        <div><dt>새 기록</dt><dd>항상 나만 보기로 먼저 저장</dd></div>
        <div><dt>네트워크 공개</dt><dd>저장 후 직접 선택할 때만 공개</dd></div>
      </dl>

      <details className="account-setting-task" open>
        <summary><UserRound aria-hidden="true" /> 표시 이름 변경</summary>
        <form onSubmit={handleNicknameSubmit}>
          <label htmlFor="profile-nickname">새 표시 이름</label>
          <input
            autoComplete="nickname"
            className="sf-input"
            disabled={isPreview || nameState.status === 'saving'}
            id="profile-nickname"
            maxLength={24}
            minLength={2}
            onChange={event => setNickname(event.target.value)}
            value={nickname}
          />
          <small>2~24자. 기록과 공개 신호에서 같은 이름을 사용합니다.</small>
          <button disabled={isPreview || nameState.status === 'saving'} type="submit">
            <Save aria-hidden="true" /> 변경 내용 저장
          </button>
        </form>
        <p className={`account-setting-status ${nameState.status}`} aria-live="polite">
          {isPreview ? '화면 검토 모드에서는 계정 정보를 변경하지 않습니다.' : nameState.message}
        </p>
      </details>

      <details className="account-setting-task">
        <summary><KeyRound aria-hidden="true" /> 비밀번호 설정 또는 변경</summary>
        {isPreview && <p className="account-setting-help">실제 로그인 계정에서만 비밀번호를 변경할 수 있습니다.</p>}
        {!isPreview && !canChangePassword && (
          <p className="account-setting-help">현재 연결된 로그인 방식은 이 화면에서 비밀번호를 사용하지 않습니다.</p>
        )}
        {(isPreview || canChangePassword) && (
          <form onSubmit={handlePasswordSubmit}>
            <label htmlFor="profile-new-password">새 비밀번호</label>
            <input
              autoComplete="new-password"
              className="sf-input"
              disabled={isPreview || passwordState.status === 'saving'}
              id="profile-new-password"
              minLength={8}
              name="password"
              onChange={updatePasswordField}
              type="password"
              value={passwordForm.password}
            />
            <label htmlFor="profile-confirm-password">새 비밀번호 확인</label>
            <input
              autoComplete="new-password"
              className="sf-input"
              disabled={isPreview || passwordState.status === 'saving'}
              id="profile-confirm-password"
              minLength={8}
              name="confirmPassword"
              onChange={updatePasswordField}
              type="password"
              value={passwordForm.confirmPassword}
            />
            {passwordPhase === 'nonce' && (
              <>
                <label htmlFor="profile-password-nonce">이메일 인증 코드</label>
                <input
                  autoComplete="one-time-code"
                  className="sf-input"
                  disabled={passwordState.status === 'saving'}
                  id="profile-password-nonce"
                  inputMode="numeric"
                  name="nonce"
                  onChange={updatePasswordField}
                  required
                  value={passwordForm.nonce}
                />
              </>
            )}
            <small>8자 이상. 비밀번호는 저장하거나 기록하지 않습니다.</small>
            <button disabled={isPreview || passwordState.status === 'saving'} type="submit">
              <KeyRound aria-hidden="true" /> {passwordPhase === 'nonce' ? '인증하고 변경' : '비밀번호 변경'}
            </button>
          </form>
        )}
        <p className={`account-setting-status ${passwordState.status}`} aria-live="polite">{passwordState.message}</p>
      </details>
    </div>
  );
}
