import { useEffect, useState } from 'react';
import { FilePlus, Heart, Lightbulb, LockKeyhole, Tag, Target } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
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
import {
  addExplorationTag,
  EMOTION_TAGS,
  IDEA_TAGS,
} from '../features/exploration-logs/explorationTagModel';
import { getSupabaseClient } from '../lib/getSupabaseClient';
import LogSubmitActionBar from './log-entry/LogSubmitActionBar';
import MobileLogSubmitPortal from './log-entry/MobileLogSubmitPortal';
import './LogEntry.css';
import '../styles/MobileExperience.css';

const LOG_FORM_ID = 'exploration-log-form';

function TagSelectionField({
  category,
  customValue,
  disabled,
  icon: Icon,
  label,
  message,
  onAddCustom,
  onCustomChange,
  onToggle,
  recommended,
  values,
}) {
  const visibleTags = [...recommended, ...values.filter(value => !recommended.includes(value))];
  const helpId = `${category}-tag-help`;

  return (
    <fieldset className="log-tag-field">
      <legend><Icon aria-hidden="true" /> {label} <small>{values.length}/3</small></legend>
      <p className="log-tag-help" id={helpId}>
        {category === 'emotions'
          ? '작품을 보며 즉각 느낀 감정을 골라보세요.'
          : '작품이 남긴 해석이나 질문의 갈래를 골라보세요.'}
      </p>
      <div className="tag-grid small">
        {visibleTags.map(tag => (
          <button
            aria-pressed={values.includes(tag)}
            className={`sf-tag ${values.includes(tag) ? 'active' : ''}`}
            disabled={disabled}
            key={tag}
            onClick={() => onToggle(category, tag)}
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="custom-tag-control">
        <label htmlFor={`${category}-custom-tag`}>직접 한 단어 추가</label>
        <div>
          <input
            aria-describedby={helpId}
            className="sf-input"
            disabled={disabled || values.length >= 3}
            id={`${category}-custom-tag`}
            maxLength={12}
            onChange={event => onCustomChange(category, event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onAddCustom(category);
            }}
            placeholder="예: 경외"
            type="text"
            value={customValue}
          />
          <button disabled={disabled || !customValue.trim() || values.length >= 3} onClick={() => onAddCustom(category)} type="button">추가</button>
        </div>
        <p className="custom-tag-message" aria-live="polite">{message}</p>
      </div>
    </fieldset>
  );
}

function LogEntryEditor({ initialDraft, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilled = location.state || {};
  const draft = initialDraft || readExplorationDraft(user?.id);
  const [formData, setFormData] = useState({
    emotions: draft.emotions ?? [],
    experiences: draft.experiences ?? {},
    ideas: draft.ideas ?? [],
    memo: draft.memo ?? '',
    spoiler: draft.spoiler ?? 'CLEAR_SIGNAL',
    title: draft.title ?? prefilled.prefilledTitle ?? '',
    type: draft.type ?? prefilled.prefilledType ?? '',
    visibility: 'PRIVATE_ARCHIVE',
  });
  const [submissionId] = useState(() => draft.submissionId ?? crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customTags, setCustomTags] = useState({ emotions: '', ideas: '' });
  const [tagMessages, setTagMessages] = useState({ emotions: '', ideas: '' });

  useEffect(() => {
    writeExplorationDraft({ ...formData, submissionId }, user?.id);
  }, [formData, submissionId, user?.id]);

  const toggleTag = (category, tag) => {
    const values = formData[category];
    if (values.includes(tag)) {
      setFormData(current => ({ ...current, [category]: values.filter(value => value !== tag) }));
      setTagMessages(messages => ({ ...messages, [category]: `‘${tag}’ 선택을 해제했습니다.` }));
      return;
    }

    const result = addExplorationTag(values, tag);
    setFormData(current => ({ ...current, [category]: result.values }));
    setTagMessages(messages => ({
      ...messages,
      [category]: result.reason === 'limit' ? '각 항목은 최대 3개까지 선택할 수 있습니다.' : '',
    }));
  };

  const addCustomTag = category => {
    try {
      const result = addExplorationTag(formData[category], customTags[category], { custom: true });
      const messages = {
        added: `‘${customTags[category].trim()}’ 태그를 추가했습니다.`,
        duplicate: '이미 선택한 단어입니다.',
        limit: '각 항목은 최대 3개까지 선택할 수 있습니다.',
      };
      setFormData(current => ({ ...current, [category]: result.values }));
      setTagMessages(current => ({ ...current, [category]: messages[result.reason] }));
      if (result.reason === 'added') setCustomTags(current => ({ ...current, [category]: '' }));
    } catch (error) {
      setTagMessages(current => ({
        ...current,
        [category]: error instanceof Error ? error.message : '단어를 추가하지 못했습니다.',
      }));
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.memo.trim()) return;

    if (!user) {
      navigate('/login', {
        state: {
          notice: '탐사 기록은 로그인 후 나만 볼 수 있게 저장됩니다.',
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
      if (!client) throw new Error('개인 기록 저장소에 연결할 수 없습니다.');
      const savedLog = await submitExplorationLog({
        input: { ...formData, visibility: 'PRIVATE_ARCHIVE' },
        repository: createExplorationLogRepository(client),
        submissionId,
        userId: user.id,
      });
      clearExplorationDraft(user.id);
      navigate(`/result/${savedLog.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '기록을 저장하지 못했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(formData.title.trim() && formData.memo.trim() && !isSubmitting);
  const submitStatus = isSubmitting
    ? '비공개 기록을 저장하고 있습니다.'
    : !user
      ? '로그인하면 이 초안을 이어서 비공개로 저장합니다.'
      : canSubmit
        ? '나만 보기로 저장할 준비가 됐습니다.'
        : '작품과 한 줄 감상을 입력해주세요.';

  return (
    <>
      <PageTransition className={`log-entry-container ${isSubmitting ? 'submitting' : ''}`}>
        <header className="log-entry-header">
          <span className="mono"><FilePlus aria-hidden="true" /> PRIVATE FIELD NOTE</span>
          <h1>30초 기록</h1>
          <p>작품에서 남은 한 가지를 적어두세요. 자세한 분류는 나중에 덧붙여도 됩니다.</p>
        </header>

        <aside className="log-privacy-note" aria-label="저장 공개 범위">
          <LockKeyhole aria-hidden="true" />
          <div><strong>새 기록은 항상 나만 보기로 저장됩니다.</strong><p>네트워크 공개는 저장이 끝난 뒤 별도 단계에서 직접 선택합니다.</p></div>
        </aside>

        <form id={LOG_FORM_ID} className="log-form" onSubmit={handleSubmit}>
          <section className="log-essential-fields panel" aria-labelledby="log-essential-title">
            <div className="log-section-heading">
              <span className="mono">REQUIRED · 2</span>
              <h2 id="log-essential-title">지금 남길 것</h2>
            </div>
            <label className="log-field">
              <span><Target aria-hidden="true" /> 작품</span>
              <input
                autoComplete="off"
                className="sf-input"
                disabled={isSubmitting}
                maxLength={240}
                onChange={event => setFormData(current => ({ ...current, title: event.target.value }))}
                placeholder="작품명을 입력하세요"
                required
                type="text"
                value={formData.title}
              />
            </label>
            <label className="log-field">
              <span><Heart aria-hidden="true" /> 한 줄 감상</span>
              <textarea
                className="sf-textarea"
                disabled={isSubmitting}
                maxLength={10000}
                onChange={event => setFormData(current => ({ ...current, memo: event.target.value }))}
                placeholder="이 작품에서 아직 남아 있는 생각이나 감정을 적어보세요"
                required
                value={formData.memo}
              />
            </label>
          </section>

          <details className="log-optional-fields panel">
            <summary><span><Tag aria-hidden="true" /> 느낌과 분류 덧붙이기</span><small>선택</small></summary>
            <div className="log-optional-content">
              <label className="log-field">
                <span>장르 또는 형식</span>
                <input className="sf-input" disabled={isSubmitting} onChange={event => setFormData(current => ({ ...current, type: event.target.value }))} placeholder="예: 심리 SF, 영화" type="text" value={formData.type} />
              </label>
              <TagSelectionField category="emotions" customValue={customTags.emotions} disabled={isSubmitting} icon={Heart} label="느낀 감정" message={tagMessages.emotions} onAddCustom={addCustomTag} onCustomChange={(category, value) => setCustomTags(current => ({ ...current, [category]: value }))} onToggle={toggleTag} recommended={EMOTION_TAGS} values={formData.emotions} />
              <TagSelectionField category="ideas" customValue={customTags.ideas} disabled={isSubmitting} icon={Lightbulb} label="남은 생각" message={tagMessages.ideas} onAddCustom={addCustomTag} onCustomChange={(category, value) => setCustomTags(current => ({ ...current, [category]: value }))} onToggle={toggleTag} recommended={IDEA_TAGS} values={formData.ideas} />
              <label className="log-spoiler-choice">
                <input checked={formData.spoiler === 'CLASSIFIED_SIGNAL'} disabled={isSubmitting} onChange={event => setFormData(current => ({ ...current, spoiler: event.target.checked ? 'CLASSIFIED_SIGNAL' : 'CLEAR_SIGNAL' }))} type="checkbox" />
                <span><strong>스포일러 포함</strong><small>주요 설정이나 결말이 포함되면 켜주세요. 공개를 선택할 때 감상 내용을 먼저 가립니다.</small></span>
              </label>
            </div>
          </details>

          <div className="log-submit-feedback" aria-live="polite">{submitError && <p role="alert">{submitError}</p>}</div>
          <LogSubmitActionBar canSubmit={canSubmit} className="desktop-log-submit-bar" isSubmitting={isSubmitting} submitStatus={submitStatus} title={formData.title} />
        </form>
      </PageTransition>
      <MobileLogSubmitPortal canSubmit={canSubmit} formId={LOG_FORM_ID} isSubmitting={isSubmitting} submitStatus={submitStatus} title={formData.title} />
    </>
  );
}

function LogEntry() {
  const { loading, user } = useAuth();
  if (loading) return <PageTransition className="log-entry-container"><section className="panel" role="status">계정 상태를 확인하고 있습니다.</section></PageTransition>;
  return <ResolvedLogEntry key={user?.id || 'anonymous'} user={user} />;
}

function ResolvedLogEntry({ user }) {
  const location = useLocation();
  const [draft, setDraft] = useState(() => selectExplorationDraft({
    routeDraft: location.state?.draft,
    routeDraftOwnerId: location.state?.draftOwnerId,
    storedDraft: readExplorationDraft(user?.id),
    userId: user?.id,
  }));
  const [pendingDraft, setPendingDraft] = useState(() => readPendingExplorationDraft(user?.id));
  const [conflictResolved, setConflictResolved] = useState(false);

  if (user && Object.keys(pendingDraft).length > 0 && !conflictResolved) {
    return (
      <PageTransition className="log-entry-container">
        <section className="panel log-draft-choice" aria-labelledby="draft-conflict-title">
          <h2 id="draft-conflict-title">이어갈 초안을 선택하세요</h2>
          <p>계정 초안과 로그인 전에 작성한 초안을 모두 보관했습니다.</p>
          <div>
            <button type="button" onClick={() => setConflictResolved(true)}>계정 초안: {draft.title || '제목 없음'}</button>
            <button type="button" onClick={() => {
              const activatedDraft = activatePendingExplorationDraft(user.id);
              setDraft(activatedDraft);
              setPendingDraft(readPendingExplorationDraft(user.id));
              setConflictResolved(true);
            }}>로그인 전 초안: {pendingDraft.title || '제목 없음'}</button>
          </div>
        </section>
      </PageTransition>
    );
  }

  return <LogEntryEditor initialDraft={draft} user={user} />;
}

export default LogEntry;