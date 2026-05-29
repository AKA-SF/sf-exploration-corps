import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, ChevronRight, Database, ExternalLink, Search, Send, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { getWorkCategorySlug, workCategories } from '../data/workArchive';
import { recordUserActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import './WorksArchive.css';

const fallbackWorks = [
  {
    code: 'SFA-001',
    medium: 'NOVEL',
    title: '듄',
    subtitle: '생태, 제국, 예언, 행성 규모의 정치학',
    tags: ['생태 SF', '제국', '메시아'],
  },
  {
    code: 'SFA-014',
    medium: 'CINEMA',
    title: '블레이드 러너',
    subtitle: '기억과 신체, 인공 생명의 권리를 묻는 도시 신호',
    tags: ['안드로이드', '기억', '느와르'],
  },
  {
    code: 'SFA-027',
    medium: 'GAME',
    title: '시그널리스',
    subtitle: '반복되는 꿈과 우주적 고립 속에서 흔들리는 정체성',
    tags: ['우주 공포', '기억', '루프'],
  },
  {
    code: 'SFA-039',
    medium: 'ANIMATION',
    title: '공각기동대',
    subtitle: '네트워크, 의식, 사이버네틱 신체의 경계 탐사',
    tags: ['사이버펑크', '정체성', '네트워크'],
  },
];

function getWorkSearchText(work) {
  return [
    work.code,
    work.medium,
    work.title,
    work.subtitle,
    work.recommender,
    work.link,
    ...(Array.isArray(work.tags) ? work.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function WorkDetailPanel({
  commentMessage,
  commentStatus,
  comments,
  commentText,
  onClose,
  onCommentSubmit,
  onCommentTextChange,
  onWorkStatusChange,
  user,
  work,
  workStatus,
  workStatusSaving,
}) {
  if (!work) return null;

  const statusOptions = [
    { value: 'want', label: '읽고 싶어요' },
    { value: 'reading', label: '읽는 중' },
    { value: 'done', label: '읽었어요' },
  ];

  const panel = (
    <div className="work-detail-modal" role="dialog" aria-modal="true" aria-label={`${work.title} 댓글`}>
      <article className={`work-detail-panel ${work.cover ? 'has-cover' : ''}`}>
        <header className="work-detail-head">
          <div>
            <span>{work.code}</span>
            <h3>{work.title}</h3>
            <p>{work.subtitle}</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 상세 닫기">×</button>
        </header>

        <div className="work-detail-body">
          {work.cover && (
            <figure className="work-detail-cover">
              <img src={work.cover} alt={`${work.title} 표지`} />
            </figure>
          )}
          <div className="work-detail-meta">
            <dl>
              <div>
                <dt>MEDIUM</dt>
                <dd>{work.medium}</dd>
              </div>
              {work.recommender && (
                <div>
                  <dt>RECOMMENDER</dt>
                  <dd>{work.recommender}</dd>
                </div>
              )}
            </dl>
            <div className="work-tags">
              {(work.tags ?? []).map(tag => <span key={tag}>{tag}</span>)}
            </div>
            {work.link && (
              <a className="work-archive-link" href={work.link} target="_blank" rel="noreferrer">
                알라딘 링크 열기 <ChevronRight aria-hidden="true" />
              </a>
            )}
            <div className="work-status-control" aria-label="작품 독서 상태">
              <span>READING STATUS</span>
              <div>
                {statusOptions.map(option => (
                  <button
                    className={workStatus === option.value ? 'is-active' : ''}
                    disabled={!user || workStatusSaving}
                    key={option.value}
                    onClick={() => onWorkStatusChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!user && <em>로그인하면 독서 상태를 저장할 수 있습니다.</em>}
            </div>
          </div>
        </div>

        <section className="work-comment-section">
          <div className="work-comment-head">
            <span>COMMENT SIGNALS</span>
            <strong>{comments.length} COMMENTS</strong>
          </div>
          <div className="work-comment-list">
            {comments.length > 0 ? comments.map(comment => (
              <article className="work-comment" key={comment.id}>
                <div>
                  <strong>{comment.author_name || '익명 탐사자'}</strong>
                  <time>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</time>
                </div>
                <p>{comment.body}</p>
              </article>
            )) : (
              <p className="work-comment-empty">아직 댓글 신호가 없습니다. 첫 반응을 남겨보세요.</p>
            )}
          </div>
          <form className="work-comment-form" onSubmit={onCommentSubmit}>
            <textarea
              disabled={!user || commentStatus === 'saving'}
              onChange={event => onCommentTextChange(event.target.value)}
              placeholder={user ? '이 작품에 대한 짧은 감상이나 질문을 남겨주세요.' : '댓글을 남기려면 먼저 로그인해주세요.'}
              rows={3}
              value={commentText}
            />
            <button disabled={!user || !commentText.trim() || commentStatus === 'saving'} type="submit">
              <Send aria-hidden="true" />
              댓글 저장
            </button>
          </form>
          {commentMessage && <p className={`work-comment-message is-${commentStatus}`}>{commentMessage}</p>}
        </section>
      </article>
    </div>
  );

  if (typeof document === 'undefined') return panel;
  return createPortal(panel, document.body);
}

function WorkArchiveFormPanel({
  form,
  message,
  onChange,
  onClose,
  onSubmit,
  status,
}) {
  const panel = (
    <div className="work-detail-modal" role="dialog" aria-modal="true" aria-label="작품 아카이브 입력">
      <article className="work-submit-panel">
        <header className="work-detail-head">
          <div>
            <span>NEW ARCHIVE SIGNAL</span>
            <h3>작품 아카이브</h3>
            <p>입력한 작품 신호는 노션 작품 아카이브 DB에 바로 저장됩니다.</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 아카이브 입력 닫기">×</button>
        </header>

        <form className="work-submit-form" onSubmit={onSubmit}>
          <label>
            <span>제목</span>
            <input name="title" onChange={onChange} placeholder="작품 제목" required value={form.title} />
          </label>
          <label>
            <span>카테고리</span>
            <select name="category" onChange={onChange} value={form.category}>
              <option value="소설">소설</option>
              <option value="영화">영화</option>
              <option value="게임">게임</option>
              <option value="애니메이션">애니메이션</option>
            </select>
          </label>
          <label>
            <span>저자</span>
            <input name="author" onChange={onChange} placeholder="저자 / 감독 / 제작자" value={form.author} />
          </label>
          <label>
            <span>출판사</span>
            <input name="publisher" onChange={onChange} placeholder="출판사 / 배급사 / 스튜디오" value={form.publisher} />
          </label>
          <label className="is-wide">
            <span>알라딘 링크</span>
            <input name="link" onChange={onChange} placeholder="https://www.aladin.co.kr/..." value={form.link} />
          </label>
          <label>
            <span>태그</span>
            <input name="tags" onChange={onChange} placeholder="쉼표로 구분: 하드SF, 디스토피아" value={form.tags} />
          </label>
          <label>
            <span>추천자</span>
            <input name="recommender" onChange={onChange} placeholder="추천자 이름" value={form.recommender} />
          </label>
          <div className="work-submit-actions">
            <p className={`work-comment-message is-${status}`}>
              {status === 'idle' && '현재는 소설 입력을 기준으로 작동합니다. 다른 카테고리는 선택만 가능합니다.'}
              {status === 'submitting' && '노션에 작품 신호를 저장 중입니다.'}
              {status !== 'idle' && status !== 'submitting' && message}
            </p>
            <button disabled={status === 'submitting'} type="submit">
              <Database aria-hidden="true" />
              {status === 'submitting' ? '저장 중' : '노션에 저장'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );

  if (typeof document === 'undefined') return panel;
  return createPortal(panel, document.body);
}

export default function WorksArchive() {
  const { user } = useAuth();
  const { categorySlug = 'novels' } = useParams();
  const [works, setWorks] = useState(fallbackWorks);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [selectedWork, setSelectedWork] = useState(null);
  const [workComments, setWorkComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');
  const [commentMessage, setCommentMessage] = useState('');
  const [workStatuses, setWorkStatuses] = useState({});
  const [workStatusSaving, setWorkStatusSaving] = useState(false);
  const [isWorkSubmitOpen, setIsWorkSubmitOpen] = useState(false);
  const [workSubmitStatus, setWorkSubmitStatus] = useState('idle');
  const [workSubmitMessage, setWorkSubmitMessage] = useState('');
  const [workSubmitForm, setWorkSubmitForm] = useState({
    title: '',
    author: '',
    publisher: '',
    category: '소설',
    link: '',
    tags: '',
    recommender: '',
  });
  const activeCategory = workCategories.find(category => category.slug === categorySlug) ?? workCategories[0];

  useEffect(() => {
    let isMounted = true;

    fetch('/api/works')
      .then(response => {
        if (!response.ok) throw new Error('Works archive unavailable');
        return response.json();
      })
      .then(data => {
        if (!isMounted) return;
        setWorks(Array.isArray(data.works) && data.works.length > 0 ? data.works : fallbackWorks);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setWorks(fallbackWorks);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) return undefined;
    let isMounted = true;
    const localKey = `sf-work-statuses:${user.id}`;

    supabase
      .from('work_statuses')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted || error) return;
        const nextStatuses = Object.fromEntries((data ?? []).map(item => [item.work_code, item.status]));
        setWorkStatuses(nextStatuses);
        localStorage.setItem(localKey, JSON.stringify(nextStatuses));
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedWork || !supabase) return undefined;
    let isMounted = true;

    supabase
      .from('work_comments')
      .select('*')
      .eq('work_code', selectedWork.code)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setWorkComments([]);
          setCommentStatus('error');
          setCommentMessage('댓글 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.');
          return;
        }
        setWorkComments(data ?? []);
        setCommentStatus('idle');
        setCommentMessage('');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWork]);

  const categoryWorks = useMemo(() => works.filter(work => (
    getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === activeCategory.slug
  )), [activeCategory.slug, works]);

  const visibleWorks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryWorks;
    return categoryWorks.filter(work => getWorkSearchText(work).includes(query));
  }, [categoryWorks, searchQuery]);

  const openWorkDetail = work => {
    setSelectedWork(work);
    setWorkComments([]);
    setCommentText('');
    setCommentStatus('idle');
    setCommentMessage('');
  };

  const openWorkSubmit = () => {
    setWorkSubmitStatus('idle');
    setWorkSubmitMessage('');
    setIsWorkSubmitOpen(true);
  };

  const updateWorkSubmitForm = event => {
    const { name, value } = event.target;
    setWorkSubmitForm(form => ({ ...form, [name]: value }));
  };

  const submitWorkArchive = async event => {
    event.preventDefault();
    if (!workSubmitForm.title.trim()) {
      setWorkSubmitStatus('error');
      setWorkSubmitMessage('작품 제목을 입력해주세요.');
      return;
    }

    setWorkSubmitStatus('submitting');
    setWorkSubmitMessage('');

    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workSubmitForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.notion?.message || data?.error || '작품 저장에 실패했습니다.');
      }

      const refreshResponse = await fetch('/api/works?refresh=1');
      const refreshed = await refreshResponse.json().catch(() => ({}));
      if (Array.isArray(refreshed.works) && refreshed.works.length > 0) {
        setWorks(refreshed.works);
      } else if (data.work) {
        setWorks(current => [data.work, ...current]);
      }

      setWorkSubmitForm({
        title: '',
        author: '',
        publisher: '',
        category: '소설',
        link: '',
        tags: '',
        recommender: '',
      });
      setWorkSubmitStatus('success');
      setWorkSubmitMessage('작품 신호가 노션 아카이브에 저장되었습니다.');
    } catch (error) {
      setWorkSubmitStatus('error');
      setWorkSubmitMessage(error.message);
    }
  };

  const updateWorkStatus = async nextStatus => {
    if (!selectedWork) return;
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('독서 상태를 저장하려면 먼저 로그인해주세요.');
      return;
    }

    const localKey = `sf-work-statuses:${user.id}`;
    const nextStatuses = { ...workStatuses, [selectedWork.code]: nextStatus };
    setWorkStatuses(nextStatuses);
    localStorage.setItem(localKey, JSON.stringify(nextStatuses));
    setWorkStatusSaving(true);

    if (!supabase) {
      setWorkStatusSaving(false);
      return;
    }

    const { error } = await supabase
      .from('work_statuses')
      .upsert({
        user_id: user.id,
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,work_code' });

    setWorkStatusSaving(false);
    if (error) {
      setCommentStatus('error');
      setCommentMessage('독서 상태 저장 중 오류가 발생했습니다.');
      return;
    }

    setCommentStatus('success');
    setCommentMessage('독서 상태가 저장되었습니다.');
  };

  const submitWorkComment = async event => {
    event.preventDefault();
    if (!selectedWork || !supabase) return;
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('댓글을 남기려면 먼저 로그인해주세요.');
      return;
    }

    const body = commentText.trim();
    if (!body) return;

    setCommentStatus('saving');
    setCommentMessage('');

    const authorName = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐사자';
    const { data, error } = await supabase
      .from('work_comments')
      .insert({
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        user_id: user.id,
        author_name: authorName,
        body,
      })
      .select('*')
      .single();

    if (error) {
      setCommentStatus('error');
      setCommentMessage(error.message);
      return;
    }

    await recordUserActivity(user, {
      actionType: 'comment',
      points: 10,
      genre: selectedWork.medium,
      metadata: {
        title: `${selectedWork.title} 댓글`,
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        tags: selectedWork.tags ?? [],
        node: 'works-archive',
      },
    });

    setWorkComments(current => [...current, data]);
    setCommentText('');
    setCommentStatus('success');
    setCommentMessage('+10 MP. 댓글 신호가 저장되었습니다.');
  };

  return (
    <PageTransition className="works-full-page">
      <header className="works-full-header">
        <Link className="works-back-link" to="/#works-archive">
          <ArrowLeft aria-hidden="true" />
          작품 아카이브
        </Link>
        <div>
          <span>WORKS ARCHIVE / FULL INDEX</span>
          <h1>{activeCategory.title}</h1>
          <p>작품 아카이브의 {activeCategory.title} 신호를 별도 전체 페이지에서 검색하고 탐색합니다.</p>
        </div>
        <div className="works-full-status">
          <Sparkles aria-hidden="true" />
          <strong>{visibleWorks.length} SIGNALS</strong>
          <button className="works-full-submit-button" onClick={openWorkSubmit} type="button">
            <Database aria-hidden="true" />
            <span>작품 아카이브</span>
          </button>
        </div>
      </header>

      <nav className="works-full-tabs" aria-label="작품 전체 분류">
        {workCategories.map(category => (
          <Link
            className={category.slug === activeCategory.slug ? 'is-active' : ''}
            key={category.slug}
            to={`/works/${category.slug}`}
          >
            {category.title}
          </Link>
        ))}
      </nav>

      <div className="works-full-search" role="search">
        <Search aria-hidden="true" />
        <input
          aria-label="작품 아카이브 검색"
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="제목, 저자/출판사, 추천자, 태그 검색"
          type="search"
          value={searchQuery}
        />
        <span>{visibleWorks.length} / {categoryWorks.length} SIGNALS</span>
      </div>

      <section className="works-full-grid" aria-label={`${activeCategory.title} 전체 목록`}>
        {visibleWorks.length > 0 ? visibleWorks.map(work => (
          <article
            className="works-full-card"
            key={work.code}
            onClick={() => openWorkDetail(work)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openWorkDetail(work);
              }
            }}
            role="button"
            tabIndex={0}
          >
              <div className="works-full-card-top">
                <span>{work.code}</span>
                <em>{work.medium}</em>
              </div>
              {work.cover ? (
                <figure className="works-full-cover">
                  <img src={work.cover} alt={`${work.title} 표지`} loading="lazy" />
                </figure>
              ) : (
                <div className="works-full-placeholder"><BookOpen aria-hidden="true" /></div>
              )}
              <h2>{work.title}</h2>
              <p>{work.subtitle}</p>
              {work.recommender && <strong className="works-full-recommender">추천자 {work.recommender}</strong>}
              <div className="works-full-tags">
                {(Array.isArray(work.tags) ? work.tags : []).map(tag => <span key={tag}>{tag}</span>)}
              </div>
              <div className="works-full-link">
                <span>DETAIL / COMMENTS</span>
                {work.link && (
                  <a
                    href={work.link}
                    onClick={event => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    ARCHIVE LINK <ExternalLink aria-hidden="true" />
                  </a>
                )}
              </div>
          </article>
        )) : (
          <div className="works-full-empty">
            <strong>{status === 'loading' ? 'LOADING SIGNALS' : 'NO SIGNALS'}</strong>
            <span>
              {status === 'ready' && categoryWorks.length > 0
                ? `${activeCategory.title} 신호 중 검색어와 맞는 항목이 없습니다.`
                : `${activeCategory.title} 데이터가 아직 없습니다.`}
            </span>
          </div>
        )}
      </section>

      {isWorkSubmitOpen && (
        <WorkArchiveFormPanel
          form={workSubmitForm}
          message={workSubmitMessage}
          onChange={updateWorkSubmitForm}
          onClose={() => setIsWorkSubmitOpen(false)}
          onSubmit={submitWorkArchive}
          status={workSubmitStatus}
        />
      )}

      <WorkDetailPanel
        commentMessage={commentMessage}
        commentStatus={commentStatus}
        comments={workComments}
        commentText={commentText}
        onClose={() => {
          setSelectedWork(null);
          setWorkComments([]);
        }}
        onCommentSubmit={submitWorkComment}
        onCommentTextChange={setCommentText}
        onWorkStatusChange={updateWorkStatus}
        user={user}
        work={selectedWork}
        workStatus={selectedWork ? workStatuses[selectedWork.code] : ''}
        workStatusSaving={workStatusSaving}
      />
    </PageTransition>
  );
}
