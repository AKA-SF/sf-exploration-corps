import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FilePlus2, Newspaper, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContextValue';
import {
  createDiscovery,
  deleteDiscovery,
  DISCOVERY_KINDS,
  DISCOVERY_MEDIA_TYPES,
  listAdminDiscoveries,
  updateDiscovery,
} from '../features/sf-discoveries/sfDiscoveryRepository';
import { supabase } from '../lib/supabaseClient';
import { hasAdminRole } from './admin/adminUtils';
import PageTransition from '../components/PageTransition';
import './Admin.css';
import './AdminDiscoveries.css';

const KIND_LABELS = { EDITOR_PICK: '편집 추천', NEW_RELEASE: '신작', UPCOMING: '공개 예정' };
const MEDIA_LABELS = { ANIMATION: '애니메이션', FILM: '영화', GAME: '게임', NOVEL: '소설', OTHER: '기타', SERIES: '시리즈' };
const PUBLICATION_LABELS = { ARCHIVED: '보관됨', DRAFT: '초안', PUBLISHED: '게시됨' };

const emptyDraft = {
  image_alt: '',
  image_url: '',
  internal_notes: '',
  is_spoiler: false,
  kind: 'NEW_RELEASE',
  media_type: 'NOVEL',
  publication_status: 'DRAFT',
  release_date: '',
  slug: '',
  sort_priority: 0,
  source_name: '',
  source_url: '',
  summary: '',
  title: '',
};

function toDraft(item) {
  return item ? {
    ...emptyDraft,
    ...item,
    image_alt: item.image_alt ?? '',
    image_url: item.image_url ?? '',
    internal_notes: item.internal_notes ?? '',
    release_date: item.release_date ?? '',
  } : { ...emptyDraft };
}

export default function AdminDiscoveries() {
  const { loading, user } = useAuth();
  const isAdmin = hasAdminRole(user);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');

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

  const updateField = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const startNew = () => {
    setSelectedId('');
    setDraft({ ...emptyDraft });
    setPendingDeleteId('');
    setMessage('새 게시물을 작성합니다.');
  };
  const selectItem = item => {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setPendingDeleteId('');
    setMessage('');
  };

  async function saveDiscovery(event) {
    event.preventDefault();
    if (!supabase) return;
    setStatus('saving');
    setMessage('');
    try {
      const saved = selectedId
        ? await updateDiscovery({ client: supabase, id: selectedId, input: draft, user })
        : await createDiscovery({ client: supabase, input: draft, user });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setMessage(saved.publication_status === 'PUBLISHED' ? '게시물을 저장하고 공개했습니다.' : '게시 상태를 저장했습니다.');
      await loadItems();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || '게시물을 저장하지 못했습니다.');
    }
  }

  async function removeDiscovery(id) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      setMessage('한 번 더 누르면 게시물이 삭제됩니다.');
      return;
    }
    setStatus('saving');
    try {
      await deleteDiscovery({ client: supabase, id, user });
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

  return (
    <PageTransition className="admin-page admin-discoveries-page">
      <header className="admin-header panel">
        <div><span className="mono">EDITORIAL CONTROL</span><h1>새로 포착된 SF 관리</h1><p>공식 출처를 확인한 신작·공개 예정·편집 추천만 작성합니다. 초안은 일반 사용자에게 노출되지 않습니다.</p></div>
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
                <small>{item.source_name}</small>
              </button>
            ))}
          </div>
        </aside>

        <form className="admin-discovery-editor panel" onSubmit={saveDiscovery}>
          <div className="admin-section-head"><div><span className="mono">{selectedId ? 'EDIT POST' : 'NEW POST'}</span><strong>{selectedId ? '게시물 수정' : '새 게시물'}</strong></div><Newspaper aria-hidden="true" /></div>
          <div className="admin-discovery-fields two-columns">
            <label><span>정보 유형</span><select onChange={event => updateField('kind', event.target.value)} value={draft.kind}>{DISCOVERY_KINDS.map(value => <option key={value} value={value}>{KIND_LABELS[value]}</option>)}</select></label>
            <label><span>작품 형식</span><select onChange={event => updateField('media_type', event.target.value)} value={draft.media_type}>{DISCOVERY_MEDIA_TYPES.map(value => <option key={value} value={value}>{MEDIA_LABELS[value]}</option>)}</select></label>
          </div>
          <label><span>제목</span><input maxLength="160" onChange={event => updateField('title', event.target.value)} required value={draft.title} /></label>
          <label><span>주소 식별자 <small>영문·숫자·하이픈, 비워두면 자동 생성</small></span><input maxLength="120" onChange={event => updateField('slug', event.target.value)} pattern="[a-z0-9][a-z0-9-]+" value={draft.slug} /></label>
          <label><span>짧은 소개</span><textarea maxLength="500" onChange={event => updateField('summary', event.target.value)} required rows="5" value={draft.summary} /></label>
          <div className="admin-discovery-fields two-columns">
            <label><span>출처명</span><input maxLength="120" onChange={event => updateField('source_name', event.target.value)} required value={draft.source_name} /></label>
            <label><span>출처 URL</span><input onChange={event => updateField('source_url', event.target.value)} pattern="https://.*" required type="url" value={draft.source_url} /></label>
          </div>
          <div className="admin-discovery-fields two-columns">
            <label><span>공개·출시일</span><input onChange={event => updateField('release_date', event.target.value)} type="date" value={draft.release_date} /></label>
            <label><span>정렬 우선순위</span><input max="1000" min="-1000" onChange={event => updateField('sort_priority', event.target.value)} type="number" value={draft.sort_priority} /></label>
          </div>
          <label><span>이미지 URL <small>선택 사항</small></span><input onChange={event => updateField('image_url', event.target.value)} pattern="https://.*" type="url" value={draft.image_url} /></label>
          <label><span>이미지 대체 텍스트 <small>이미지 사용 시 필수</small></span><input maxLength="240" onChange={event => updateField('image_alt', event.target.value)} required={Boolean(draft.image_url)} value={draft.image_alt} /></label>
          <label><span>내부 메모 <small>공개되지 않음</small></span><textarea onChange={event => updateField('internal_notes', event.target.value)} rows="3" value={draft.internal_notes} /></label>
          <div className="admin-discovery-checks">
            <label><input checked={draft.is_spoiler} onChange={event => updateField('is_spoiler', event.target.checked)} type="checkbox" /> 스포일러 포함 표시</label>
            <label><span>게시 상태</span><select onChange={event => updateField('publication_status', event.target.value)} value={draft.publication_status}><option value="DRAFT">초안</option><option value="PUBLISHED">게시</option><option value="ARCHIVED">보관</option></select></label>
          </div>
          <div className="admin-discovery-actions">
            {selectedId && <button className="danger" onClick={() => void removeDiscovery(selectedId)} type="button"><Trash2 aria-hidden="true" />{pendingDeleteId === selectedId ? '삭제 확인' : '삭제'}</button>}
            <button className="primary" disabled={status === 'saving'} type="submit"><Save aria-hidden="true" />{status === 'saving' ? '저장 중' : draft.publication_status === 'PUBLISHED' ? '저장하고 게시' : '게시 상태 저장'}</button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
