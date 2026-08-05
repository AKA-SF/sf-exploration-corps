import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus, Target, Brain, Activity, Lightbulb, HeartPulse, RadioTower, CheckCircle2 } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import { useAuth } from '../context/authContextValue';
import { getSupabaseClient } from '../lib/getSupabaseClient';
import {
  activatePendingExplorationDraft,
  clearExplorationDraft,
  readExplorationDraft,
  readPendingExplorationDraft,
  selectExplorationDraft,
  writeExplorationDraft,
} from '../features/exploration-logs/explorationDraftStorage';
import { createExplorationLogRepository } from '../features/exploration-logs/explorationLogRepository';
import { submitExplorationLog } from '../features/exploration-logs/explorationLogSubmission';
import PageTransition from '../components/PageTransition';
import LogSubmitActionBar from './log-entry/LogSubmitActionBar';
import MobileLogSubmitPortal from './log-entry/MobileLogSubmitPortal';
import './LogEntry.css';
import '../styles/MobileExperience.css';

const EMOTION_TAGS = ['우울함', '압도감', '외로움', '희망', '공포감', '기괴함'];
const IDEA_TAGS = ['아이디어 충격', '미래 상상력', '기술 공포', '인간성 질문', '여운'];
const LOG_FORM_ID = 'exploration-log-form';

const LogEntryEditor = ({ initialDraft, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentSystemState } = useLogs();
  const prefilled = location.state || {};
  const draft = initialDraft || readExplorationDraft(user?.id);

  const [formData, setFormData] = useState({
    title: draft.title ?? prefilled.prefilledTitle ?? '',
    type: draft.type ?? prefilled.prefilledType ?? '',
    experiences: draft.experiences ?? prefilled.prefilledExperiences ?? {
      immersion: 50,
      addiction: 50,
      complexity: 50,
      visual: 50,
      derealization: 50,
      scale: 50
    },
    emotions: draft.emotions ?? prefilled.prefilledEmotions ?? [],
    ideas: draft.ideas ?? prefilled.prefilledIdeas ?? [],
    memo: draft.memo ?? '',
    visibility: draft.visibility ?? 'PRIVATE_ARCHIVE',
    spoiler: draft.spoiler ?? 'CLEAR_SIGNAL',
  });
  const [submissionId] = useState(() => draft.submissionId ?? crypto.randomUUID());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reportMode, setReportMode] = useState('quick');
  const coords = useMemo(() => {
    const x = (formData.experiences.immersion * 0.45).toFixed(3);
    const y = (formData.experiences.scale * 0.81).toFixed(3);
    const zSeed = (formData.title.length * 13 + formData.memo.length * 7 + formData.experiences.complexity) % 997;
    const z = (zSeed / 997).toFixed(3);
    return `X: ${x} Y: ${y} Z: ${z}`;
  }, [formData.experiences.immersion, formData.experiences.scale, formData.experiences.complexity, formData.title.length, formData.memo.length]);

  useEffect(() => {
    writeExplorationDraft({ ...formData, submissionId }, user?.id);
  }, [formData, submissionId, user?.id]);

  useEffect(() => {
    // Calculate aggregate risk based on derealization and complexity
    const aggRisk = (formData.experiences.derealization + formData.experiences.complexity) / 2;
    
    setCurrentSystemState({
      riskLevel: aggRisk,
      isTyping: formData.title.length > 0 || formData.memo.length > 0,
      selectedGenre: formData.type
    });
    
  }, [formData, setCurrentSystemState]);

  useEffect(() => {
    return () => setCurrentSystemState({ riskLevel: 0, isTyping: false, selectedGenre: null });
  }, [setCurrentSystemState]);

  const toggleTag = (category, tag) => {
    setFormData(prev => {
      const list = prev[category];
      if (list.includes(tag)) return { ...prev, [category]: list.filter(t => t !== tag) };
      if (list.length >= 3) return prev; // max 3 tags
      return { ...prev, [category]: [...list, tag] };
    });
  };

  const handleSlider = (key, val) => {
    setFormData(prev => ({ ...prev, experiences: { ...prev.experiences, [key]: parseInt(val) } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return;

    if (!user) {
      navigate('/login', {
        state: {
          notice: '탐사 기록은 로그인 후 개인 아카이브에 저장됩니다.',
          returnTo: '/log',
          returnState: { draft: formData },
        },
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Supabase 환경 변수가 아직 연결되지 않았습니다.');

      const savedLog = await submitExplorationLog({
        repository: createExplorationLogRepository(client),
        userId: user.id,
        submissionId,
        input: formData,
      });
      clearExplorationDraft(user.id);
      navigate(`/result/${savedLog.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '탐사 기록을 저장하지 못했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  const Sliders = [
    { key: 'immersion', labelKr: '몰입감', labelEn: 'IMMERSION', color: 'cyan' },
    { key: 'addiction', labelKr: '중독성', labelEn: 'ADDICTION', color: 'cyan' },
    { key: 'complexity', labelKr: '난해함', labelEn: 'COMPLEXITY', color: 'amber' },
    { key: 'visual', labelKr: '영상화됨', labelEn: 'VISUALIZATION', color: 'blue' },
    { key: 'derealization', labelKr: '현실감 상실', labelEn: 'DEREALIZATION', color: 'amber' },
    { key: 'scale', labelKr: '세계관 규모감', labelEn: 'WORLD_SCALE', color: 'cyan' }
  ];

  const reportChecklist = useMemo(() => [
    { id: 'target', label: '탐사 대상', done: formData.title.trim().length > 0 },
    { id: 'emotion', label: '감정 신호', done: formData.emotions.length > 0 },
    { id: 'immersion', label: '몰입값', done: formData.experiences.immersion > 0 },
    { id: 'memo', label: '한 줄 메모', done: formData.memo.trim().length > 0 },
  ], [formData.emotions.length, formData.experiences.immersion, formData.memo, formData.title]);

  const completedReportItems = useMemo(
    () => reportChecklist.filter(item => item.done).length,
    [reportChecklist],
  );
  const reportReadiness = Math.round((completedReportItems / reportChecklist.length) * 100);

  const canSubmit = formData.title.trim().length > 0 && !isSubmitting;
  const submitStatus = isSubmitting
    ? 'UPLINKING_SIGNAL...'
    : !user
      ? '로그인 후 개인 아카이브에 안전하게 저장됩니다.'
    : formData.title.trim().length === 0
      ? '작품명을 입력하면 제출 가능'
      : reportReadiness < 75
        ? '빠른 로그 제출 가능 / 감정과 메모를 추가하면 분석 정확도 상승'
        : '송신 준비 완료 / SIGNAL_READY';

  return (
    <>
      <PageTransition className={`log-entry-container ${isSubmitting ? 'submitting' : ''}`}>
      <header className="page-header">
        <h2 className="mono title-glitch"><FilePlus size={20} /> 탐사 로그 <span className="text-muted text-xs">/ EXPLORATION LOG</span></h2>
        <div className="terminal-decor">
          <span className="mono text-cyan text-xs">{coords}</span>
        </div>
      </header>

      <section className="uplink-brief panel panel-accent">
        <div>
          <span className="mono brief-kicker"><RadioTower size={12} /> REPORT_UPLINK</span>
          <h3>{prefilled.prefilledTitle ? '선택한 작품 신호를 기록 중' : '빠른 탐사 보고서 작성'}</h3>
          <p>첫 기록은 가볍게 남기고, 상세 분석은 필요할 때만 확장하세요. 제출하면 DOSSIER와 LIVE_SIGNAL_NET에 반영됩니다.</p>
        </div>
        <div
          aria-label={`작성 항목 ${reportChecklist.length}개 중 ${completedReportItems}개 완료`}
          className="readiness-summary mono"
        >
          <span>작성 상태</span>
          <strong>{completedReportItems}<small> / {reportChecklist.length}</small></strong>
          <small>항목 완료</small>
        </div>
      </section>

      <section className="quick-log-console panel">
        <div className="mode-tabs mono">
          <button className={reportMode === 'quick' ? 'active' : ''} onClick={() => setReportMode('quick')} type="button">QUICK_LOG</button>
          <button className={reportMode === 'detail' ? 'active' : ''} onClick={() => setReportMode('detail')} type="button">DEEP_ANALYSIS</button>
        </div>
        <div className="quick-checklist mono">
          {reportChecklist.map(item => (
            <span key={item.id} className={item.done ? 'done' : ''}>
              <CheckCircle2 size={11} />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <form id={LOG_FORM_ID} className="log-form" onSubmit={handleSubmit}>
        <div className="form-group panel log-target-panel">
          <label className="mono text-cyan"><Target size={14} /> 탐사 대상 <span className="text-muted">/ TARGET_IDENTIFIER</span></label>
          <input 
            type="text" 
            placeholder="작품명을 입력하세요..." 
            className="sf-input mono"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group panel log-sector-panel">
          <label className="mono text-cyan"><Brain size={14} /> 탐사 구역 <span className="text-muted">/ SECTOR (TYPE)</span></label>
          <input 
            type="text" 
            className="sf-input mono"
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value})}
            placeholder="장르 (예: 사이버펑크)"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group panel log-metrics-panel">
          <label className="mono text-cyan"><Activity size={14} /> 경험 수치 <span className="text-muted">/ EXPERIENTIAL_METRICS</span></label>
          <div className="sliders-grid">
            {(reportMode === 'quick' ? Sliders.filter(s => ['immersion', 'derealization', 'scale'].includes(s.key)) : Sliders).map(s => (
              <div key={s.key} className="slider-item">
                <div id={`experience-${s.key}-label`} className="slider-labels">
                  <span className="kr-label">{s.labelKr}</span>
                  <span className="en-label mono text-muted">{s.labelEn}</span>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" min="0" max="100" 
                    className={`sf-slider ${s.color}-slider`}
                    aria-labelledby={`experience-${s.key}-label`}
                    aria-valuetext={`${formData.experiences[s.key]}%`}
                    value={formData.experiences[s.key]}
                    onChange={e => handleSlider(s.key, e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span className={`mono slider-val text-${s.color}`}>{formData.experiences[s.key]}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group panel log-emotions-panel">
          <label className="mono text-cyan"><HeartPulse size={14} /> 감정 잔류물 <span className="text-muted">/ EMOTIONAL_RESIDUE</span></label>
          <div className="tag-grid small">
            {EMOTION_TAGS.map(tag => (
              <button 
                key={tag} type="button"
                className={`sf-tag mono outline ${formData.emotions.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag('emotions', tag)}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {reportMode === 'detail' && (
        <div className="form-group panel log-ideas-panel">
          <label className="mono text-cyan"><Lightbulb size={14} /> 획득 이데아 <span className="text-muted">/ ACQUIRED_IDEAS</span></label>
          <div className="tag-grid small">
            {IDEA_TAGS.map(tag => (
              <button 
                key={tag} type="button"
                className={`sf-tag mono outline ${formData.ideas.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag('ideas', tag)}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        )}

        <div className="form-group panel log-notes-panel">
          <label className="mono text-cyan">탐사 노트 <span className="text-muted">/ FIELD_NOTES</span></label>
          <textarea 
            placeholder={reportMode === 'quick' ? '한 줄만 남겨도 송신할 수 있습니다...' : '세부 감상, 세계관 해석, 스포일러 주의 내용을 기록하세요...'} 
            className="sf-textarea mono"
            value={formData.memo}
            onChange={e => setFormData({...formData, memo: e.target.value})}
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div className="log-control-grid">
          <div className="form-group panel compact-control">
            <label className="mono text-cyan">공개 범위 <span className="text-muted">/ VISIBILITY</span></label>
            <div className="segmented mono">
              {['PRIVATE_ARCHIVE', 'ANON_NETWORK', 'PUBLIC_SIGNAL'].map(option => (
                <button
                  key={option}
                  type="button"
                  className={formData.visibility === option ? 'active' : ''}
                  onClick={() => setFormData({ ...formData, visibility: option })}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group panel compact-control">
            <label className="mono text-cyan">스포일러 <span className="text-muted">/ SIGNAL_CLASS</span></label>
            <div className="segmented mono">
              {['CLEAR_SIGNAL', 'CLASSIFIED_SIGNAL'].map(option => (
                <button
                  key={option}
                  type="button"
                  className={formData.spoiler === option ? 'active' : ''}
                  onClick={() => setFormData({ ...formData, spoiler: option })}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="log-submit-feedback" aria-live="polite">
          {submitError && <p className="mono text-amber" role="alert">{submitError}</p>}
        </div>

        <LogSubmitActionBar
          canSubmit={canSubmit}
          className="desktop-log-submit-bar"
          isSubmitting={isSubmitting}
          submitStatus={submitStatus}
          title={formData.title}
        />
      </form>
      </PageTransition>
      <MobileLogSubmitPortal
        canSubmit={canSubmit}
        formId={LOG_FORM_ID}
        isSubmitting={isSubmitting}
        submitStatus={submitStatus}
        title={formData.title}
      />
    </>
  );
};

const LogEntry = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <PageTransition className="log-entry-container">
        <section className="panel" role="status">계정 상태를 확인하고 있습니다...</section>
      </PageTransition>
    );
  }

  return <ResolvedLogEntry key={user?.id || 'anonymous'} user={user} />;
};

const ResolvedLogEntry = ({ user }) => {
  const location = useLocation();
  const [draft, setDraft] = useState(() => {
    const storedDraft = readExplorationDraft(user?.id);
    return selectExplorationDraft({
      routeDraft: location.state?.draft,
      routeDraftOwnerId: location.state?.draftOwnerId,
      storedDraft,
      userId: user?.id,
    });
  });
  const [pendingDraft, setPendingDraft] = useState(() => readPendingExplorationDraft(user?.id));
  const [conflictResolved, setConflictResolved] = useState(false);

  if (user && Object.keys(pendingDraft).length > 0 && !conflictResolved) {
    return (
      <PageTransition className="log-entry-container">
        <section className="panel" aria-labelledby="draft-conflict-title">
          <span className="mono text-cyan">DRAFT_RECOVERY</span>
          <h2 id="draft-conflict-title">이어갈 초안을 선택하세요</h2>
          <p>계정에 저장된 초안과 로그인 전에 작성한 초안을 모두 안전하게 보관했습니다.</p>
          <div className="mode-tabs">
            <button type="button" onClick={() => setConflictResolved(true)}>
              계정 초안: {draft.title || '제목 없음'}
            </button>
            <button
              type="button"
              onClick={() => {
                const activatedDraft = activatePendingExplorationDraft(user.id);
                setDraft(activatedDraft);
                setPendingDraft(readPendingExplorationDraft(user.id));
                setConflictResolved(true);
              }}
            >
              로그인 전 초안: {pendingDraft.title || '제목 없음'}
            </button>
          </div>
        </section>
      </PageTransition>
    );
  }

  return <LogEntryEditor initialDraft={draft} user={user} />;
};

export default LogEntry;
