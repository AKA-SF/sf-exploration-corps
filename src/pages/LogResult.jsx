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
          <span><LockKeyhole aria-hidden="true" /> 나만 보기</span>
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
          <p>공개할 때는 표시할 이름과 스포일러 범위를 다시 확인하게 됩니다. 공개 기능은 다음 개편 단계에서 연결됩니다.</p>
        </div>
        <button disabled type="button">공개 준비 중</button>
      </section>

      <nav className="result-actions" aria-label="기록 저장 후 이동">
        <Link to="/log"><PenLine aria-hidden="true" /> 다른 기록 쓰기</Link>
        <Link className="result-primary-action" to="/profile">내 기록 보기 <ArrowRight aria-hidden="true" /></Link>
      </nav>
    </PageTransition>
  );
}