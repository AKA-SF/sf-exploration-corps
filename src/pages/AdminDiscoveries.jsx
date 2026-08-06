import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, FilePlus2, Newspaper, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import EditorialArticle from '../components/editorial/EditorialArticle';
import EditorialArticleFields from '../components/editorial/EditorialArticleFields';
import { useAuth } from '../context/authContextValue';
import { createEmptyEditorialPayload, validateEditorialPayload } from '../features/sf-discoveries/editorialDraft';
import {
  createDiscovery,
  deleteDiscovery,
  DISCOVERY_KINDS,
  DISCOVERY_MEDIA_TYPES,
  listAdminDiscoveries,
  publishDiscovery,
  updateDiscovery,
} from '../features/sf-discoveries/sfDiscoveryRepository';
import { supabase } from '../lib/supabaseClient';
import PageTransition from '../components/PageTransition';
import { hasAdminRole } from './admin/adminUtils';
import './Admin.css';
import './AdminDiscoveries.css';

const KIND_LABELS = { EDITOR_PICK: '편집 추천', NEW_RELEASE: '신작', UPCOMING: '공개 예정' };
const MEDIA_LABELS = { ANIMATION: '애니메이션', FILM: '영화', GAME: '게임', NOVEL: '소설', OTHER: '기타', SERIES: '시리즈' };
const PUBLICATION_LABELS = { ARCHIVED: '보관됨', DRAFT: '초안', PUBLISHED: '게시됨' };
const STAGE_LABELS = { APPROVED: '발행 준비 완료', DRAFTING: '원고 작성', NONE: '일반 게시물', REVIEW_READY: '보라 검수 대기', SELECTION_APPROVED: '3권 선정 승인' };

const emptyDraft = {
  editorial_payload: createEmptyEditorialPayload(),
  editorial_stage: 'NONE',
  image_alt: '',
  image_url: '',
  internal_notes: '',
  is_spoiler: false,
  kind: 'NEW_RELEASE',
  media_type: 'NOVEL',
  publication_status: 'DRAFT',
  release_date: '',
  selection_approval_ref: '',
  selection_approved_at: null,
  slug: '',
  sort_priority: 0,
  source_name: '',
  source_url: '',
  summary: '',
  title: '',
};

const freshEmptyDraft = () => structuredClone(emptyDraft);

function toDraft(item) {
  return item ? {
    ...freshEmptyDraft(),
    ...item,
    editorial_payload: item.editorial_payload ?? createEmptyEditorialPayload(),
    editorial_stage: item.editorial_stage ?? 'NONE',
    image_alt: item.image_alt ?? '',
    image_url: item.image_url ?? '',
    internal_notes: item.internal_notes ?? '',
    publication_status: item.publication_status ?? 'DRAFT',
    release_date: item.release_date ?? '',
    selection_approval_ref: item.selection_approval_ref ?? '',
  } : freshEmptyDraft();
}

export default function AdminDiscoveries() {
  const { loading, user } = useAuth();
  const isAdmin = hasAdminRole(user);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(freshEmptyDraft);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [pendingPublishId, setPendingPublishId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const editorHeadingRef = useRef(null);
  const editorialValidation = validateEditorialPayload(draft.editorial_payload);
  const selectedItem = items.find(item => item.id === selectedId) ?? null;
  const persistedDraft = selectedItem ? toDraft(selectedItem) : null;
  const hasUnsavedChanges = !persistedDraft || JSON.stringify(draft) !== JSON.stringify(persistedDraft);
  const isPublishedEdit = selectedItem?.publication_status === 'PUBLISHED'
    && draft.publication_status === 'PUBLISHED';

  const loadItems = useCallback(async () => {
    if (!isAdmin || !supabase) return;
    try {
      setStatus('loading');
      const nextItems = await listAdminDiscoveries({ client: supabase, user });
      setItems(nextItems);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '게시물 목록을 불러오지 못했습니다.');
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (!isAdmin || !supabase) return undefined;
    let active = true;
    listAdminDiscoveries({ client: supabase, user })
      .then(nextItems => {
        if (!active) return;
        setItems(nextItems);
        setStatus('ready');
      })
      .catch(error => {
        if (!active) return;
        setStatus('error');
        setMessage(error.message || '게시물 목록을 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!pendingDeleteId && !pendingPublishId) return undefined;
    const timeoutId = window.setTimeout(() => {
      setPendingDeleteId('');
      setPendingPublishId('');
      setStatus('ready');
      setMessage('발행·삭제 확인이 만료되었습니다. 다시 눌러 확인해 주세요.');
    }, 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [pendingDeleteId, pendingPublishId]);

  const focusEditor = () => requestAnimationFrame(() => editorHeadingRef.current?.focus());
  const updateField = (key, value) => {
    const hadPendingConfirmation = Boolean(pendingDeleteId || pendingPublishId);
    setDraft(current => ({ ...current, [key]: value }));
    setPendingDeleteId('');
    setPendingPublishId('');
    if (hadPendingConfirmation) {
      setStatus('ready');
      setMessage('내용이 변경되어 발행·삭제 확인을 취소했습니다.');
    }
  };
  const startNew = () => {
    setSelectedId('');
    setDraft(freshEmptyDraft());
    setPendingDeleteId('');
    setPendingPublishId('');
    setShowPreview(false);
    setStatus('ready');
    setMessage('새 게시물을 작성합니다.');
    focusEditor();
  };
  const selectItem = item => {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setPendingDeleteId('');
    setPendingPublishId('');
    setShowPreview(false);
    setStatus('ready');
    setMessage(`${item.title || '선택한 게시물'} 편집 화면을 열었습니다.`);
    focusEditor();
  };
  const loadApprovedDraft = async () => {
    if (!supabase) return;
    setStatus('loading');
    setMessage('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw error || new Error('관리자 로그인 세션이 필요합니다.');
      const response = await fetch('/api/editorial-draft', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.draft) throw new Error(result.error || '승인된 초안을 불러오지 못했습니다.');
      setSelectedId('');
      setDraft(structuredClone(result.draft));
      setPendingDeleteId('');
      setPendingPublishId('');
      setShowPreview(true);
      setStatus('ready');
      setMessage('승인된 3권과 원고를 불러왔습니다. 아직 저장하거나 공개하지 않았습니다.');
      focusEditor();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '승인된 초안을 불러오지 못했습니다.');
    }
  };
  const markEditorialApproved = () => {
    if (!editorialValidation.valid) {
      setMessage(editorialValidation.errors[0]);
      return;
    }
    updateField('editorial_stage', 'APPROVED');
    setMessage('발행 준비 완료 상태로 바꿨습니다. 임시저장 후에도 최종 발행 버튼을 눌러야 공개됩니다.');
  };

  async function saveDiscovery(event) {
    event.preventDefault();
    if (!supabase) return;
    setStatus('saving');
    setMessage('');
    try {
      const saved = selectedId
        ? await updateDiscovery({ client: supabase, current: selectedItem, id: selectedId, input: draft, user })
        : await createDiscovery({ client: supabase, input: draft, user });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setPendingPublishId('');
      setMessage(saved.publication_status === 'PUBLISHED'
        ? '수정 사항을 저장했습니다. 게시 상태는 유지됩니다.'
        : '임시저장했습니다. 일반 사용자에게는 공개되지 않습니다.');
      await loadItems();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '게시물을 저장하지 못했습니다.');
    }
  }

  async function publishSelected() {
    if (!selectedId || !draft.updated_at || !supabase || hasUnsavedChanges) return;
    if (pendingPublishId !== selectedId) {
      setPendingDeleteId('');
      setPendingPublishId(selectedId);
      setMessage('한 번 더 누르면 이 게시물이 최종 발행됩니다.');
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const published = await publishDiscovery({ client: supabase, id: selectedId, updatedAt: draft.updated_at, user });
      setDraft(toDraft(published));
      setPendingPublishId('');
      setMessage('최종 발행했습니다. 공개 화면에서 확인해 주세요.');
      await loadItems();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '게시물을 발행하지 못했습니다.');
    }
  }

  async function removeDiscovery(id) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      setPendingPublishId('');
      setMessage('한 번 더 누르면 게시물이 삭제됩니다.');
      return;
    }
    setStatus('saving');
    try {
      await deleteDiscovery({ client: supabase, id, updatedAt: draft.updated_at, user });
      startNew();
      setMessage('게시물을 삭제했습니다.');
      await loadItems();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '게시물을 삭제하지 못했습니다.');
    }
  }

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (loading) return <PageTransition className="admin-page"><section className="admin-locked panel"><ShieldCheck /><h2>관리자 권한 확인 중</h2></section></PageTransition>;
  if (!isAdmin) return <PageTransition className="admin-page"><section className="admin-locked panel"><ShieldCheck /><h2>관리자 권한이 필요합니다</h2><Link to="/profile">내 정보로 돌아가기</Link></section></PageTransition>;
  if (!supabase) return <PageTransition className="admin-page"><section className="admin-locked panel"><ShieldCheck /><h2>콘텐츠 저장소가 연결되지 않았습니다</h2><p>Supabase 환경 구성을 확인해 주세요.</p><Link to="/admin">대시보드로 돌아가기</Link></section></PageTransition>;

  const publishEligible = selectedId
    && selectedItem?.publication_status !== 'PUBLISHED'
    && (draft.kind !== 'EDITOR_PICK' || draft.editorial_stage === 'APPROVED');
  const canPublish = publishEligible && !hasUnsavedChanges;

  return (
    <PageTransition className="admin-page admin-discoveries-page">
      <header className="admin-header panel">
        <div><span className="mono">EDITORIAL CONTROL</span><h1>새로 포착된 SF 관리</h1><p>초안 저장과 최종 발행을 분리합니다. 게시된 글의 수정 사항은 저장 즉시 공개 화면에 반영됩니다.</p></div>
        <div className="admin-header-actions"><Link className="admin-header-link" to="/admin"><ArrowLeft aria-hidden="true" /> 대시보드</Link><Link className="admin-header-link" to="/discover">공개 화면</Link></div>
      </header>

      {message && <div className={`admin-alert panel ${status === 'error' ? '' : 'is-success'}`} role={status === 'error' ? 'alert' : 'status'}><p>{message}</p></div>}

      <div className="admin-discovery-layout">
        <aside className="admin-discovery-list panel">
          <div className="admin-section-head"><div><span className="mono">POSTS</span><strong>게시물</strong></div><button onClick={startNew} type="button"><FilePlus2 aria-hidden="true" /> 새 글</button></div>
          {status === 'loading' && <p>목록을 불러오는 중입니다.</p>}
          {status !== 'loading' && items.length === 0 && <p>아직 작성된 게시물이 없습니다.</p>}
          <div className="admin-discovery-list__items">
            {items.map(item => (
              <button className={selectedId === item.id ? 'is-active' : ''} key={item.id} onClick={() => selectItem(item)} type="button">
                <span>{PUBLICATION_LABELS[item.publication_status] || '초안'} · {KIND_LABELS[item.kind]}</span>
                <strong>{item.title}</strong>
                <small>{item.kind === 'EDITOR_PICK' ? STAGE_LABELS[item.editorial_stage] : item.source_name}</small>
              </button>
            ))}
          </div>
        </aside>

        <form className="admin-discovery-editor panel" onSubmit={saveDiscovery}>
          <div className="admin-section-head"><div><span className="mono">{selectedId ? 'EDIT POST' : 'NEW POST'}</span><h2 ref={editorHeadingRef} tabIndex="-1">{selectedId ? '게시물 수정' : '새 게시물'}</h2></div><Newspaper aria-hidden="true" /></div>
          <div className="admin-discovery-fields two-columns">
            <label><span>정보 유형</span><select onChange={event => updateField('kind', event.target.value)} value={draft.kind}>{DISCOVERY_KINDS.map(value => <option key={value} value={value}>{KIND_LABELS[value]}</option>)}</select></label>
            <label><span>작품 형식</span><select onChange={event => updateField('media_type', event.target.value)} value={draft.media_type}>{DISCOVERY_MEDIA_TYPES.map(value => <option key={value} value={value}>{MEDIA_LABELS[value]}</option>)}</select></label>
          </div>
          {draft.kind === 'EDITOR_PICK' && (
            <div className="admin-editorial-import">
              <div><strong>승인 원고</strong><span>검수를 마친 구조화 원고를 현재 편집 폼에 채웁니다.</span></div>
              <button onClick={() => void loadApprovedDraft()} type="button">승인 원고 불러오기</button>
            </div>
          )}
          <label><span>제목</span><input maxLength="160" onChange={event => updateField('title', event.target.value)} required value={draft.title} /></label>
          <label><span>주소 식별자 <small>영문·숫자·하이픈, 비워두면 자동 생성</small></span><input maxLength="120" onChange={event => updateField('slug', event.target.value)} pattern="[a-z0-9][a-z0-9-]+" value={draft.slug} /></label>
          <label><span>짧은 소개</span><textarea maxLength="500" onChange={event => updateField('summary', event.target.value)} required rows="5" value={draft.summary} /></label>

          {draft.kind === 'EDITOR_PICK' && <EditorialArticleFields onChange={value => updateField('editorial_payload', value)} payload={draft.editorial_payload} validation={editorialValidation} />}

          <div className="admin-discovery-fields two-columns">
            <label><span>대표 출처명</span><input maxLength="120" onChange={event => updateField('source_name', event.target.value)} required value={draft.source_name} /></label>
            <label><span>대표 출처 URL</span><input onChange={event => updateField('source_url', event.target.value)} pattern="https://.*" required type="url" value={draft.source_url} /></label>
          </div>
          <div className="admin-discovery-fields two-columns">
            <label><span>공개·출시일</span><input onChange={event => updateField('release_date', event.target.value)} type="date" value={draft.release_date} /></label>
            <label><span>정렬 우선순위</span><input max="1000" min="-1000" onChange={event => updateField('sort_priority', event.target.value)} type="number" value={draft.sort_priority} /></label>
          </div>
          <label><span>대표 이미지 URL <small>선택 사항</small></span><input onChange={event => updateField('image_url', event.target.value)} pattern="https://.*" type="url" value={draft.image_url} /></label>
          <label><span>대표 이미지 대체 텍스트 <small>이미지 사용 시 필수</small></span><input maxLength="240" onChange={event => updateField('image_alt', event.target.value)} required={Boolean(draft.image_url)} value={draft.image_alt} /></label>
          <label><span>내부 메모 <small>공개되지 않음</small></span><textarea onChange={event => updateField('internal_notes', event.target.value)} rows="4" value={draft.internal_notes} /></label>

          <div className="admin-discovery-checks">
            <label><input checked={draft.is_spoiler} onChange={event => updateField('is_spoiler', event.target.checked)} type="checkbox" /> 스포일러 포함 표시</label>
            <label><span>저장 상태</span><select onChange={event => updateField('publication_status', event.target.value)} value={draft.publication_status}>{selectedItem?.publication_status === 'PUBLISHED' && <option value="PUBLISHED">게시됨 (유지)</option>}<option value="DRAFT">초안</option><option value="ARCHIVED">보관</option></select></label>
            {draft.kind === 'EDITOR_PICK' && <span className="admin-editorial-stage">작업 단계: {STAGE_LABELS[draft.editorial_stage] || draft.editorial_stage}</span>}
          </div>

          <div className="admin-discovery-actions">
            {selectedId && <button className="danger" onClick={() => void removeDiscovery(selectedId)} type="button"><Trash2 aria-hidden="true" />{pendingDeleteId === selectedId ? '삭제 확인' : '삭제'}</button>}
            {draft.kind === 'EDITOR_PICK' && <button onClick={() => setShowPreview(current => !current)} type="button"><Eye aria-hidden="true" />{showPreview ? '미리보기 닫기' : '기사 미리보기'}</button>}
            {draft.kind === 'EDITOR_PICK' && <button disabled={!editorialValidation.valid} onClick={markEditorialApproved} type="button"><CheckCircle2 aria-hidden="true" />발행 준비 완료</button>}
            <button className="primary" disabled={status === 'saving'} type="submit"><Save aria-hidden="true" />{status === 'saving' ? '저장 중' : isPublishedEdit ? '공개 수정 저장' : '임시저장'}</button>
            {publishEligible && <button className="publish" disabled={status === 'saving' || hasUnsavedChanges} onClick={() => void publishSelected()} type="button"><Send aria-hidden="true" />{pendingPublishId === selectedId ? '최종 발행 확인' : '최종 발행'}</button>}
          </div>

          {isPublishedEdit && <p className="admin-publish-warning" role="note">게시된 글의 수정 사항은 저장 즉시 공개 화면에 반영됩니다. 공개 전 검토가 필요하면 저장 상태를 초안으로 바꾸세요.</p>}

          {publishEligible && !canPublish && <p className="admin-publish-hint" role="status">최종 발행 전에 현재 변경 사항을 임시저장해 주세요.</p>}

          {showPreview && draft.kind === 'EDITOR_PICK' && <div className="admin-editorial-preview"><EditorialArticle payload={draft.editorial_payload} title={draft.title || '제목 없음'} /></div>}
        </form>
      </div>
    </PageTransition>
  );
}
