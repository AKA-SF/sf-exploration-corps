import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole, PenLine, Radio } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getCurrentExplorationLogLoadState, getExplorationLogRecordKey } from '../features/exploration-logs/explorationLogLoadState';
import { createExplorationLogRepository } from '../features/exploration-logs/explorationLogRepository';
import { getSupabaseClient } from '../lib/getSupabaseClient';
import './LogResult.css';
import '../styles/MobileExperience.css';

function formatSavedDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function LogResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [logData, setLogData] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [loadedKey, setLoadedKey] = useState('');
  const [publishChoice, setPublishChoice] = useState('');
  const [publishStatus, setPublishStatus] = useState('');
  const recordKey = getExplorationLogRecordKey(user?.id, id);

  useEffect(() => {
    if (loading || !user) return undefined;
    let isMounted = true;

    async function loadExplorationLog() {
      try {
        const client = await getSupabaseClient();
        if (!client) throw new Error('개인 기록 저장소에 연결할 수 없습니다.');
        const record = await createExplorationLogRepository(client).getOwnExplorationLog({
          id,
          userId: user.id,
        });
        if (!isMounted) return;
        setLoadedKey(recordKey);
        if (!record) {
          setLoadState('not-found');
          return;
        }
        setLogData(record);
        setLoadState('ready');
      } catch {
        if (isMounted) {
          setLoadedKey(recordKey);
          setLoadState('error');
        }
      }
    }

    void loadExplorationLog();
    return () => {
      isMounted = false;
    };
  }, [id, loading, recordKey, user]);

  const effectiveLoadState = getCurrentExplorationLogLoadState({
    authLoading: loading,
    loadedKey,
    loadState,
    recordId: id,
    userId: user?.id,
  });

  const setVisibility = async visibility => {
    if (!user || !logData) return;
    setPublishStatus('saving');
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('개인 기록 저장소에 연결할 수 없습니다.');
      const updated = await createExplorationLogRepository(client).setOwnExplorationLogVisibility({ id: logData.id, userId: user.id, visibility });
      setLogData(updated);
      setPublishChoice('');
      setPublishStatus('success');
    } catch {
      setPublishStatus('error');
    }
  };

  if (effectiveLoadState === 'loading') {
    return <PageTransition className="result-container"><section className="result-state panel" role="status">저장한 기록을 확인하고 있습니다.</section></PageTransition>;
  }

  if (effectiveLoadState !== 'ready') {
    const message = effectiveLoadState === 'unauthorized'
      ? '로그인한 사용자만 자신의 기록을 열 수 있습니다.'
      : effectiveLoadState === 'not-found'
        ? '이 기록을 찾을 수 없거나 접근 권한이 없습니다.'
        : '기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    return (
      <PageTransition className="result-container">
        <section className="result-state panel" role="alert">
          <h1>기록을 열 수 없습니다</h1>
          <p>{message}</p>
          <button onClick={() => navigate(effectiveLoadState === 'unauthorized' ? '/login' : '/profile')} type="button">돌아가기</button>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="result-container result-saved">
      <header className="result-saved-header">
        <span className="result-check"><CheckCircle2 aria-hidden="true" /></span>
        <div>
          <span className="mono">SAVED TO PRIVATE ARCHIVE</span>
          <h1>기록을 남겼습니다</h1>
          <p>지금은 나만 볼 수 있게 저장되어 있습니다.</p>
        </div>
      </header>

      <article className="result-record panel">
        <div className="result-record-meta">
          <span><LockKeyhole aria-hidden="true" /> {logData.visibility === 'ANON_NETWORK' ? '익명 네트워크' : logData.visibility === 'PUBLIC_SIGNAL' ? '공개 신호' : '나만 보기'}</span>
          <time dateTime={logData.createdAt}>{formatSavedDate(logData.createdAt)}</time>
        </div>
        <h2>{logData.title}</h2>
        <p>{logData.memo}</p>
        {logData.emotions.length > 0 && (
          <section className="result-tag-group" aria-labelledby="result-emotions-title">
            <h3 id="result-emotions-title">느낀 감정</h3>
            <div className="result-record-tags">{logData.emotions.map(tag => <span key={tag}>{tag}</span>)}</div>
          </section>
        )}
        {logData.ideas.length > 0 && (
          <section className="result-tag-group" aria-labelledby="result-ideas-title">
            <h3 id="result-ideas-title">남은 생각</h3>
            <div className="result-record-tags">{logData.ideas.map(tag => <span key={tag}>{tag}</span>)}</div>
          </section>
        )}
        {logData.spoiler === 'CLASSIFIED_SIGNAL' && (
          <p className="result-spoiler-label"><LockKeyhole aria-hidden="true" /> 스포일러 포함 · 주요 설정이나 결말에 관한 내용이 있습니다.</p>
        )}
      </article>

      <section className="result-publish panel" aria-labelledby="result-publish-title">
        <Radio aria-hidden="true" />
        <div>
          <h2 id="result-publish-title">네트워크에 공개</h2>
          <p>{logData.visibility === 'PRIVATE_ARCHIVE' ? '공개 범위를 선택한 뒤 네트워크에 보낼 수 있습니다. 닉네임 공개를 선택하면 내 정보의 표시 이름이 함께 보입니다.' : '현재 네트워크에 공개되어 있습니다. 필요하면 나만 보기로 전환할 수 있습니다.'}</p>
        </div>
        {logData.visibility === 'PRIVATE_ARCHIVE' ? <button aria-expanded={Boolean(publishChoice)} onClick={() => setPublishChoice(publishChoice ? '' : 'choose')} type="button">공개 범위 선택</button> : <button disabled={publishStatus === 'saving'} onClick={() => void setVisibility('PRIVATE_ARCHIVE')} type="button">나만 보기로 전환</button>}
        {logData.visibility === 'PRIVATE_ARCHIVE' && publishChoice && <div className="result-publish-options" role="radiogroup" aria-label="이 기록의 공개 범위">
          <label><input checked={publishChoice === 'ANON_NETWORK'} name="visibility" onChange={() => setPublishChoice('ANON_NETWORK')} type="radio" /> 익명으로 공개</label>
          <label><input checked={publishChoice === 'PUBLIC_SIGNAL'} name="visibility" onChange={() => setPublishChoice('PUBLIC_SIGNAL')} type="radio" /> 닉네임과 함께 공개</label>
          <p>공개 후에는 다른 사람이 기록을 볼 수 있습니다. 개인정보와 스포일러를 다시 확인하세요.</p>
          <button disabled={publishChoice === 'choose' || publishStatus === 'saving'} onClick={() => void setVisibility(publishChoice)} type="button">{publishChoice === 'ANON_NETWORK' ? '익명으로 공개' : '닉네임과 함께 공개'}</button>
        </div>}
        <p role={publishStatus === 'error' ? 'alert' : 'status'}>{publishStatus === 'success' ? '공개 상태를 변경했습니다.' : publishStatus === 'error' ? '공개 상태를 변경하지 못했습니다. 기존 상태는 유지됩니다.' : ''}</p>
      </section>

      <nav className="result-actions" aria-label="기록 저장 후 이동">
        <Link to="/log"><PenLine aria-hidden="true" /> 다른 기록 쓰기</Link>
        <Link className="result-primary-action" to="/profile">내 기록 보기 <ArrowRight aria-hidden="true" /></Link>
      </nav>
    </PageTransition>
  );
}