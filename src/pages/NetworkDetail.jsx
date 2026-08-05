import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, BarChart2, ChevronLeft, RadioReceiver } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { getSupabaseClient } from '../lib/getSupabaseClient';
import { createExplorationLogRepository } from '../features/exploration-logs/explorationLogRepository';
import './NetworkDetail.css';
import '../styles/MobileExperience.css';

const EXPERIENCE_LABELS = {
  immersion: '몰입감',
  addiction: '중독성',
  complexity: '난해함',
  visual: '영상화',
  derealization: '현실감 상실',
  scale: '세계관 규모',
};

const NetworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [status, setStatus] = useState('loading');
  const [spoilerRevealedId, setSpoilerRevealedId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicLog() {
      try {
        const client = await getSupabaseClient();
        const record = client
          ? await createExplorationLogRepository(client).getVisibleExplorationLog({ id })
          : null;
        if (!isMounted) return;
        setLog(record);
        setStatus(record ? 'ready' : 'not-found');
      } catch {
        if (isMounted) setStatus('error');
      }
    }

    void loadPublicLog();
    return () => { isMounted = false; };
  }, [id]);

  const metrics = useMemo(() => (
    log
      ? Object.entries(EXPERIENCE_LABELS).map(([key, label]) => ({
        key,
        label,
        value: Number(log.experiences?.[key] ?? 0),
      }))
      : []
  ), [log]);

  if (status !== 'ready') {
    const message = status === 'loading'
      ? 'PUBLIC_SIGNAL_LOADING'
      : status === 'not-found'
        ? '공개되지 않았거나 존재하지 않는 탐사 신호입니다.'
        : '공개 신호를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    return (
      <PageTransition className="network-detail-container">
        <div className="error-panel mono" role="status">
          <span className={status === 'loading' ? 'text-cyan' : 'text-amber'}>{message}</span>
          {status !== 'loading' && (
            <button onClick={() => navigate('/network')} className="btn-secondary">ABORT_CONNECTION</button>
          )}
        </div>
      </PageTransition>
    );
  }

  const sender = log.visibility === 'PUBLIC_SIGNAL' ? (log.nickname || 'PUBLIC_EXPLORER') : 'ANONYMOUS_SIGNAL';
  const contentVisible = log.spoiler !== 'CLASSIFIED_SIGNAL' || spoilerRevealedId === id;

  return (
    <PageTransition className="network-detail-container">
      <header className="detail-header">
        <button onClick={() => navigate('/network')} className="btn-icon" aria-label="네트워크로 돌아가기">
          <ChevronLeft size={24} />
        </button>
        <h2 className="mono title-glitch text-sm">PUBLIC_SIGNAL: {log.id}</h2>
      </header>

      <div className="log-data-panel panel panel-accent">
        <div className="log-data-header">
          <h1 className="mono">{contentVisible ? log.title : '분류된 탐사 신호'}</h1>
          <span className="mono text-xs text-cyan">SENDER: {sender}</span>
        </div>

        <div className="log-metrics mono text-xs">
          <div className="metric">
            <span className="text-muted">SECTOR</span>
            <span>{log.logType}</span>
          </div>
          <div className="metric">
            <span className="text-muted">TIME</span>
            <span>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
          </div>
          <div className="metric">
            <span className="text-muted">VISIBILITY</span>
            <span>{log.visibility}</span>
          </div>
        </div>

        {!contentVisible && (
          <div className="memo-box" role="status">
            <Activity size={16} className="text-amber" />
            <div>
              <p className="mono">스포일러가 포함된 신호입니다.</p>
              <button className="btn-secondary" onClick={() => setSpoilerRevealedId(id)} type="button">스포일러 신호 보기</button>
            </div>
          </div>
        )}

        {contentVisible && log.memo && (
          <div className="memo-box">
            <Activity size={16} className="text-cyan" />
            <p className="mono">“{log.memo}”</p>
          </div>
        )}
      </div>

      {contentVisible && (
        <div className="collective-analysis panel">
          <h3 className="mono text-xs text-muted section-title">
            <BarChart2 size={14} /> 경험 신호 <span className="text-cyan">/ EXPERIENCE_SIGNAL</span>
          </h3>
          <div className="analysis-bars">
            {metrics.map((metric, index) => (
              <div key={metric.key} className="bar-container mono text-xs">
                <div className="bar-labels">
                  <span>{metric.label}</span>
                  <span className="text-cyan">{metric.value}%</span>
                </div>
                <div className="bar-bg">
                  <motion.div
                    className="bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 0.8, delay: index * 0.08 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contentVisible && (
        <div className="response-signals panel">
          <h3 className="mono text-xs text-muted section-title">
            <RadioReceiver size={14} /> 감정·아이디어 태그 <span className="text-cyan">/ SIGNAL_TAGS</span>
          </h3>
          <div className="signals-list">
            {[...(log.emotions || []), ...(log.ideas || [])].map(tag => (
              <span key={tag} className="signal-item mono text-sm">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default NetworkDetail;
