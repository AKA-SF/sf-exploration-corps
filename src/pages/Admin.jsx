import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Database,
  Gift,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { rankTable } from '../data/profileProgress';
import { supabase } from '../lib/supabaseClient';
import './Admin.css';

const initialCounts = {
  activityLogs: 0,
  members: 0,
  radioMessages: 0,
  userBadges: 0,
  workComments: 0,
  workStatuses: 0,
};

const initialMemberAction = {
  badgeDescription: '',
  badgeId: '',
  badgeTitle: '',
  mp: 10,
  reason: '관리자 MP 부여',
  title: '',
};

const endpointChecks = [
  { key: 'works', label: '작품 아카이브', path: '/api/works?covers=0', pick: data => data.works?.length ?? 0 },
  { key: 'media', label: '미디어 아카이브', path: '/api/media', pick: data => data.media?.length ?? 0 },
  { key: 'concepts', label: 'SF 개념 사전', path: '/api/concepts', pick: data => data.concepts?.length ?? 0 },
  { key: 'questions', label: '커뮤니티 게시판', path: '/api/questions', pick: data => data.questions?.length ?? 0 },
];

function hasAdminRole(user) {
  const appMetadata = user?.app_metadata ?? {};
  return appMetadata.role === 'admin' || appMetadata.roles?.includes?.('admin');
}

function formatDate(value) {
  if (!value) return 'UNKNOWN';
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(value) {
  return String(value ?? '').slice(0, 8);
}

function errorMessage(error) {
  return error?.message || '요청 처리 중 문제가 생겼습니다.';
}

async function getCount(table, column = 'id') {
  const { count, error } = await supabase
    .from(table)
    .select(column, { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function checkEndpoint({ key, label, path, pick }) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} 연결 실패`);
  const data = await response.json();
  return {
    count: pick(data),
    key,
    label,
    ok: true,
  };
}

async function getAdminAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('관리자 세션을 다시 확인해주세요.');
  return token;
}

export default function Admin() {
  const { isConfigured, loading, user } = useAuth();
  const [counts, setCounts] = useState(initialCounts);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [radioMessages, setRadioMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [checks, setChecks] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberAction, setMemberAction] = useState(initialMemberAction);
  const [questionComments, setQuestionComments] = useState({});
  const [status, setStatus] = useState('idle');
  const [actionStatus, setActionStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const isAdmin = hasAdminRole(user);

  const selectedMember = useMemo(() => (
    members.find(member => member.id === selectedMemberId) ?? members[0] ?? null
  ), [members, selectedMemberId]);

  const selectedMemberBadges = useMemo(() => (
    userBadges.filter(badge => badge.user_id === selectedMember?.id)
  ), [selectedMember?.id, userBadges]);
  const memberActionTitle = memberAction.title || selectedMember?.title || rankTable[0].title;

  const loadAdminDashboard = useCallback(async () => {
    if (!user || !isAdmin || !supabase) return;
    setStatus('loading');
    setMessage('');

    try {
      const [
        memberCount,
        activityCount,
        workCommentCount,
        workStatusCount,
        radioCount,
        badgeCount,
        memberResult,
        activityResult,
        commentResult,
        radioResult,
        userBadgeResult,
        questionResult,
        endpointResults,
      ] = await Promise.all([
        getCount('profiles'),
        getCount('activity_logs'),
        getCount('work_comments'),
        getCount('work_statuses', 'work_code'),
        getCount('radio_messages'),
        getCount('user_badges', 'badge_id'),
        supabase
          .from('profiles')
          .select('id,nickname,title,mileage,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(18),
        supabase
          .from('activity_logs')
          .select('id,action_type,points,genre,metadata,created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('work_comments')
          .select('id,work_title,author_name,body,created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('radio_messages')
          .select('id,author_name,body,parent_id,recipient_name,created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('user_badges')
          .select('user_id,badge_id,awarded_at,badges(title,description)')
          .order('awarded_at', { ascending: false })
          .limit(120),
        fetch('/api/questions', { cache: 'no-store' }).then(response => (response.ok ? response.json() : { questions: [] })),
        Promise.allSettled(endpointChecks.map(checkEndpoint)),
      ]);

      const tableError = memberResult.error
        || activityResult.error
        || commentResult.error
        || radioResult.error
        || userBadgeResult.error;
      if (tableError) throw tableError;

      setCounts({
        activityLogs: activityCount,
        members: memberCount,
        radioMessages: radioCount,
        userBadges: badgeCount,
        workComments: workCommentCount,
        workStatuses: workStatusCount,
      });
      setMembers(memberResult.data ?? []);
      setActivities(activityResult.data ?? []);
      setComments(commentResult.data ?? []);
      setRadioMessages(radioResult.data ?? []);
      setUserBadges(userBadgeResult.data ?? []);
      setQuestions((questionResult.questions ?? []).slice(0, 12));
      setChecks(endpointResults.map((result, index) => (
        result.status === 'fulfilled'
          ? result.value
          : { ...endpointChecks[index], count: 0, ok: false }
      )));
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(errorMessage(error));
    }
  }, [isAdmin, user]);

  useEffect(() => {
    void Promise.resolve().then(loadAdminDashboard);
  }, [loadAdminDashboard]);

  const dashboardCards = useMemo(() => ([
    { icon: Users, label: '회원', value: counts.members, note: '등록된 탐사 대원' },
    { icon: Activity, label: '활동 기록', value: counts.activityLogs, note: 'MP와 배지 기반 데이터' },
    { icon: MessageSquareText, label: '작품 댓글', value: counts.workComments, note: '작품 카드 교신' },
    { icon: BadgeCheck, label: '독서 상태', value: counts.workStatuses, note: '읽고 싶어요/읽고 있어요/완료' },
    { icon: Gift, label: '지급 배지', value: counts.userBadges, note: '수동/히든 배지 포함' },
    { icon: RadioTower, label: '무전 메시지', value: counts.radioMessages, note: '네트워크 탭 공개 신호' },
  ]), [counts]);

  async function runAdminAction(task, successMessage) {
    setActionStatus('loading');
    setActionMessage('');
    try {
      await task();
      await loadAdminDashboard();
      setActionStatus('ready');
      setActionMessage(successMessage);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(errorMessage(error));
    }
  }

  async function deleteCommunityPayload(payload) {
    const token = await getAdminAccessToken();
    const response = await fetch('/api/questions', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '커뮤니티 항목 삭제에 실패했습니다.');
  }

  async function loadQuestionComments(questionId) {
    setActionStatus('loading');
    setActionMessage('');
    try {
      const response = await fetch(`/api/questions?id=${encodeURIComponent(questionId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '댓글을 불러오지 못했습니다.');
      setQuestionComments(current => ({ ...current, [questionId]: data.comments ?? [] }));
      setActionStatus('ready');
      setActionMessage('댓글 목록을 불러왔습니다.');
    } catch (error) {
      setActionStatus('error');
      setActionMessage(errorMessage(error));
    }
  }

  function deleteCommunityPost(questionId) {
    runAdminAction(
      () => deleteCommunityPayload({ mode: 'post', questionId }),
      '커뮤니티 글을 보관 처리했습니다.',
    );
  }

  function deleteCommunityComment(questionId, commentId) {
    runAdminAction(
      async () => {
        await deleteCommunityPayload({ commentId, mode: 'comment' });
        await loadQuestionComments(questionId);
      },
      '커뮤니티 댓글을 삭제했습니다.',
    );
  }

  function deleteSupabaseRow(table, id, successMessage) {
    runAdminAction(async () => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }, successMessage);
  }

  function updateMemberAction(key, value) {
    setMemberAction(current => ({ ...current, [key]: value }));
  }

  function setMemberTitle() {
    if (!selectedMember) return;
    runAdminAction(async () => {
      const { error } = await supabase.rpc('admin_set_member_title', {
        next_title: memberActionTitle,
        target_user_id: selectedMember.id,
      });
      if (error) throw error;
    }, `${selectedMember.nickname} 대원의 등급을 조정했습니다.`);
  }

  function grantMileage() {
    if (!selectedMember) return;
    runAdminAction(async () => {
      const { error } = await supabase.rpc('admin_grant_mileage', {
        points: Number(memberAction.mp),
        reason: memberAction.reason || '관리자 MP 부여',
        target_user_id: selectedMember.id,
      });
      if (error) throw error;
    }, `${selectedMember.nickname} 대원에게 MP를 부여했습니다.`);
  }

  function awardBadge() {
    if (!selectedMember) return;
    runAdminAction(async () => {
      const { error } = await supabase.rpc('admin_award_badge', {
        badge_description: memberAction.badgeDescription || '관리자가 수동으로 지급한 히든 배지입니다.',
        badge_id: memberAction.badgeId,
        badge_title: memberAction.badgeTitle,
        target_user_id: selectedMember.id,
      });
      if (error) throw error;
    }, `${selectedMember.nickname} 대원에게 히든 배지를 지급했습니다.`);
  }

  function revokeBadge(badgeId) {
    if (!selectedMember) return;
    runAdminAction(async () => {
      const { error } = await supabase.rpc('admin_revoke_badge', {
        p_badge_id: badgeId,
        p_target_user_id: selectedMember.id,
      });
      if (error) throw error;
    }, '히든 배지를 회수했습니다.');
  }

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <PageTransition className="admin-page">
        <section className="admin-locked panel">
          <ShieldCheck size={28} />
          <span className="mono">ACCESS CHECK</span>
          <h2>관리자 권한 확인 중</h2>
          <p>로그인 세션과 관리자 권한을 확인하고 있습니다.</p>
        </section>
      </PageTransition>
    );
  }

  if (!isConfigured) {
    return (
      <PageTransition className="admin-page">
        <section className="admin-locked panel">
          <Database size={24} />
          <h2>Supabase 연결 필요</h2>
          <p>관리자 페이지를 사용하려면 Supabase 환경 변수가 먼저 연결되어야 합니다.</p>
        </section>
      </PageTransition>
    );
  }

  if (!loading && user && !isAdmin) {
    return (
      <PageTransition className="admin-page">
        <section className="admin-locked panel">
          <ShieldCheck size={28} />
          <span className="mono">ADMIN ACCESS REQUIRED</span>
          <h2>관리자 권한이 필요합니다</h2>
          <p>Supabase Authentication의 사용자 app metadata에 role 값을 admin으로 지정한 계정만 접근할 수 있습니다.</p>
          <Link to="/profile">프로필로 돌아가기</Link>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="admin-page">
      <header className="admin-header panel">
        <div>
          <span className="mono">ARCHIVE CONTROL ROOM</span>
          <h1>관리자 대시보드</h1>
          <p>회원 권한, 커뮤니티 게시글, 댓글, 무전 신호, 히든 배지를 한 화면에서 관리하는 운영용 대시보드입니다.</p>
        </div>
        <Link className="admin-header-link mono" to="/">홈으로</Link>
      </header>

      {(status === 'error' || actionStatus === 'error' || actionMessage) && (
        <section className={`admin-alert panel ${actionStatus === 'ready' ? 'is-success' : ''}`}>
          <AlertTriangle size={18} />
          <p>{actionMessage || message}</p>
          {(status === 'error' || actionStatus === 'error') && <span>관리자 SQL 정책이 아직 적용되지 않았을 수 있습니다.</span>}
        </section>
      )}

      <section className="admin-grid">
        {dashboardCards.map(card => {
          const Icon = card.icon;
          return (
            <article className="admin-stat-card panel" key={card.label}>
              <Icon size={18} />
              <span className="mono">{card.label}</span>
              <strong>{status === 'loading' ? '...' : card.value}</strong>
              <p>{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="admin-member-control panel">
        <div className="admin-section-head">
          <span className="mono">CREW CONTROL</span>
          <strong>회원 권한 / MP / 히든 배지</strong>
        </div>

        <div className="admin-member-layout">
          <div className="admin-member-list">
            {members.map(member => (
              <button
                className={`admin-member-button ${selectedMember?.id === member.id ? 'is-active' : ''}`}
                key={member.id}
                onClick={() => {
                  setSelectedMemberId(member.id);
                  setMemberAction(current => ({ ...current, title: member.title || rankTable[0].title }));
                }}
                type="button"
              >
                <strong>{member.nickname || '이름 없음'}</strong>
                <span>{member.title} / {member.mileage} MP / {shortId(member.id)}</span>
              </button>
            ))}
            {status !== 'loading' && members.length === 0 && <p className="admin-empty">표시할 회원 데이터가 없습니다.</p>}
          </div>

          {selectedMember && (
            <div className="admin-member-editor">
              <div className="admin-editor-summary">
                <strong>{selectedMember.nickname}</strong>
                <span>{selectedMember.title} / {selectedMember.mileage} MP</span>
              </div>

              <label>
                <span>등급 권한</span>
                <select value={memberActionTitle} onChange={event => updateMemberAction('title', event.target.value)}>
                  {rankTable.map(rank => <option key={rank.title} value={rank.title}>{rank.title}</option>)}
                </select>
              </label>
              <button className="admin-action-button" disabled={actionStatus === 'loading'} onClick={setMemberTitle} type="button">등급 저장</button>

              <div className="admin-form-row">
                <label>
                  <span>MP</span>
                  <input min="-500" step="5" type="number" value={memberAction.mp} onChange={event => updateMemberAction('mp', event.target.value)} />
                </label>
                <label>
                  <span>사유</span>
                  <input value={memberAction.reason} onChange={event => updateMemberAction('reason', event.target.value)} />
                </label>
              </div>
              <button className="admin-action-button" disabled={actionStatus === 'loading'} onClick={grantMileage} type="button">MP 부여</button>

              <div className="admin-badge-form">
                <label>
                  <span>히든 배지 ID</span>
                  <input placeholder="secret-signal" value={memberAction.badgeId} onChange={event => updateMemberAction('badgeId', event.target.value)} />
                </label>
                <label>
                  <span>배지명</span>
                  <input placeholder="미확인 신호" value={memberAction.badgeTitle} onChange={event => updateMemberAction('badgeTitle', event.target.value)} />
                </label>
                <label>
                  <span>설명</span>
                  <textarea placeholder="숨겨진 조건을 달성했습니다." value={memberAction.badgeDescription} onChange={event => updateMemberAction('badgeDescription', event.target.value)} />
                </label>
                <button className="admin-action-button" disabled={actionStatus === 'loading'} onClick={awardBadge} type="button">히든 배지 지급</button>
              </div>

              <div className="admin-awarded-badges">
                <span className="mono">AWARDED BADGES</span>
                {selectedMemberBadges.map(item => (
                  <div className="admin-badge-row" key={`${item.user_id}-${item.badge_id}`}>
                    <div>
                      <strong>{item.badges?.title ?? item.badge_id}</strong>
                      <span>{item.badges?.description ?? item.badge_id}</span>
                    </div>
                    <button className="admin-danger-button" onClick={() => revokeBadge(item.badge_id)} type="button">회수</button>
                  </div>
                ))}
                {selectedMemberBadges.length === 0 && <p className="admin-empty">지급된 배지가 없습니다.</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="admin-panel-grid">
        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">RECENT ACTIVITY</span>
            <strong>최근 활동</strong>
          </div>
          <div className="admin-list">
            {activities.map(activity => (
              <div className="admin-list-row" key={activity.id}>
                <div>
                  <strong>{activity.metadata?.title || activity.action_type}</strong>
                  <span>{activity.action_type} / {activity.genre || '미분류'} / +{activity.points} MP</span>
                </div>
                <em>{formatDate(activity.created_at)}</em>
              </div>
            ))}
            {status !== 'loading' && activities.length === 0 && <p className="admin-empty">표시할 활동 데이터가 없습니다.</p>}
          </div>
        </article>

        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">NOTION SYNC</span>
            <strong>연결 상태</strong>
          </div>
          <div className="admin-check-grid">
            {checks.map(check => (
              <div className={`admin-check ${check.ok ? 'is-ok' : 'is-error'}`} key={check.key}>
                <span>{check.label}</span>
                <strong>{check.ok ? `${check.count} items` : 'ERROR'}</strong>
              </div>
            ))}
            {status === 'loading' && <p className="admin-empty">연결 상태 확인 중...</p>}
          </div>
        </article>

        <article className="admin-section panel is-wide">
          <div className="admin-section-head">
            <span className="mono">COMMUNITY</span>
            <strong>커뮤니티 글 / 댓글 관리</strong>
          </div>
          <div className="admin-list">
            {questions.map(question => (
              <div className="admin-community-item" key={question.id}>
                <div className="admin-list-row">
                  <Link to={`/questions/${question.id}`}>
                    <strong>{question.title}</strong>
                    <span>{question.author} / {question.category}</span>
                  </Link>
                  <div className="admin-row-actions">
                    <em>{question.date || 'NO DATE'}</em>
                    <button onClick={() => loadQuestionComments(question.id)} type="button">댓글</button>
                    <button className="admin-danger-button" onClick={() => deleteCommunityPost(question.id)} type="button"><Trash2 size={14} /> 글 삭제</button>
                  </div>
                </div>

                {questionComments[question.id]?.length > 0 && (
                  <div className="admin-comment-list">
                    {questionComments[question.id].map(comment => (
                      <div className="admin-comment-row" key={comment.id}>
                        <div>
                          <strong>{comment.name}</strong>
                          <span>{comment.content}</span>
                        </div>
                        <button className="admin-danger-button" onClick={() => deleteCommunityComment(question.id, comment.id)} type="button">댓글 삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {status !== 'loading' && questions.length === 0 && <p className="admin-empty">표시할 게시글이 없습니다.</p>}
          </div>
        </article>

        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">WORK COMMENTS</span>
            <strong>최근 작품 댓글</strong>
          </div>
          <div className="admin-list">
            {comments.map(comment => (
              <div className="admin-list-row" key={comment.id}>
                <div>
                  <strong>{comment.work_title}</strong>
                  <span>{comment.author_name}: {comment.body}</span>
                </div>
                <button
                  className="admin-danger-button"
                  onClick={() => deleteSupabaseRow('work_comments', comment.id, '작품 댓글을 삭제했습니다.')}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
            {status !== 'loading' && comments.length === 0 && <p className="admin-empty">표시할 작품 댓글이 없습니다.</p>}
          </div>
        </article>

        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">RADIO STREAM</span>
            <strong>최근 무전</strong>
          </div>
          <div className="admin-list">
            {radioMessages.map(radioMessage => (
              <div className="admin-list-row" key={radioMessage.id}>
                <div>
                  <strong>{radioMessage.author_name}</strong>
                  <span>{radioMessage.parent_id ? `답신 to ${radioMessage.recipient_name || '탐사자'}: ` : ''}{radioMessage.body}</span>
                </div>
                <button
                  className="admin-danger-button"
                  onClick={() => deleteSupabaseRow('radio_messages', radioMessage.id, '무전 메시지를 삭제했습니다.')}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
            {status !== 'loading' && radioMessages.length === 0 && <p className="admin-empty">표시할 무전 메시지가 없습니다.</p>}
          </div>
        </article>
      </section>
    </PageTransition>
  );
}
