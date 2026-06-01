import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Database,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
  Users,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/authContextValue';
import { supabase } from '../lib/supabaseClient';
import './Admin.css';

const initialCounts = {
  activityLogs: 0,
  members: 0,
  radioMessages: 0,
  workComments: 0,
  workStatuses: 0,
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

export default function Admin() {
  const { isConfigured, loading, user } = useAuth();
  const [counts, setCounts] = useState(initialCounts);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [radioMessages, setRadioMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [checks, setChecks] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const isAdmin = hasAdminRole(user);

  useEffect(() => {
    if (!user || !isAdmin || !supabase) return undefined;
    let isMounted = true;

    async function loadAdminDashboard() {
      setStatus('loading');
      setMessage('');

      try {
        const [
          memberCount,
          activityCount,
          workCommentCount,
          workStatusCount,
          radioCount,
          memberResult,
          activityResult,
          commentResult,
          radioResult,
          questionResult,
          endpointResults,
        ] = await Promise.all([
          getCount('profiles'),
          getCount('activity_logs'),
          getCount('work_comments'),
          getCount('work_statuses', 'work_code'),
          getCount('radio_messages'),
          supabase
            .from('profiles')
            .select('id,nickname,title,mileage,created_at,updated_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('activity_logs')
            .select('id,action_type,points,genre,metadata,created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('work_comments')
            .select('id,work_title,author_name,body,created_at')
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('radio_messages')
            .select('id,author_name,body,parent_id,recipient_name,created_at')
            .order('created_at', { ascending: false })
            .limit(6),
          fetch('/api/questions', { cache: 'no-store' }).then(response => response.ok ? response.json() : { questions: [] }),
          Promise.allSettled(endpointChecks.map(checkEndpoint)),
        ]);

        const tableError = memberResult.error
          || activityResult.error
          || commentResult.error
          || radioResult.error;
        if (tableError) throw tableError;
        if (!isMounted) return;

        setCounts({
          activityLogs: activityCount,
          members: memberCount,
          radioMessages: radioCount,
          workComments: workCommentCount,
          workStatuses: workStatusCount,
        });
        setMembers(memberResult.data ?? []);
        setActivities(activityResult.data ?? []);
        setComments(commentResult.data ?? []);
        setRadioMessages(radioResult.data ?? []);
        setQuestions((questionResult.questions ?? []).slice(0, 6));
        setChecks(endpointResults.map((result, index) => (
          result.status === 'fulfilled'
            ? result.value
            : { ...endpointChecks[index], count: 0, ok: false }
        )));
        setStatus('ready');
      } catch (error) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.message);
      }
    }

    loadAdminDashboard();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, user]);

  const dashboardCards = useMemo(() => ([
    { icon: Users, label: '회원', value: counts.members, note: '등록된 탐사 대원' },
    { icon: Activity, label: '활동 기록', value: counts.activityLogs, note: 'MP와 배지 기반 데이터' },
    { icon: MessageSquareText, label: '작품 댓글', value: counts.workComments, note: '작품 카드 교신' },
    { icon: BadgeCheck, label: '독서 상태', value: counts.workStatuses, note: '읽고 싶어요/읽고 있어요/완료' },
    { icon: RadioTower, label: '무전 메시지', value: counts.radioMessages, note: '네트워크 탭 공개 신호' },
  ]), [counts]);

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
          <p>회원, 활동, 커뮤니티, 무전 신호, Notion 연결 상태를 가볍게 점검하는 1차 관제 화면입니다.</p>
        </div>
        <Link className="admin-header-link mono" to="/">홈으로</Link>
      </header>

      {status === 'error' && (
        <section className="admin-alert panel">
          <AlertTriangle size={18} />
          <p>{message}</p>
          <span>관리자 SQL 정책이 아직 적용되지 않았을 수 있습니다.</span>
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

      <section className="admin-panel-grid">
        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">RECENT CREW</span>
            <strong>최근 회원</strong>
          </div>
          <div className="admin-list">
            {members.map(member => (
              <div className="admin-list-row" key={member.id}>
                <div>
                  <strong>{member.nickname}</strong>
                  <span>{member.title} / {member.mileage} MP</span>
                </div>
                <em>{formatDate(member.created_at)}</em>
              </div>
            ))}
            {status !== 'loading' && members.length === 0 && <p className="admin-empty">표시할 회원 데이터가 없습니다.</p>}
          </div>
        </article>

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

        <article className="admin-section panel">
          <div className="admin-section-head">
            <span className="mono">COMMUNITY</span>
            <strong>최근 게시글</strong>
          </div>
          <div className="admin-list">
            {questions.map(question => (
              <Link className="admin-list-row is-link" key={question.id} to={`/questions/${question.id}`}>
                <div>
                  <strong>{question.title}</strong>
                  <span>{question.author} / {question.category}</span>
                </div>
                <em>{question.date || 'NO DATE'}</em>
              </Link>
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
                <em>{formatDate(comment.created_at)}</em>
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
            {radioMessages.map(message => (
              <div className="admin-list-row" key={message.id}>
                <div>
                  <strong>{message.author_name}</strong>
                  <span>{message.parent_id ? `답신 to ${message.recipient_name || '탐사자'}: ` : ''}{message.body}</span>
                </div>
                <em>{formatDate(message.created_at)}</em>
              </div>
            ))}
            {status !== 'loading' && radioMessages.length === 0 && <p className="admin-empty">표시할 무전 메시지가 없습니다.</p>}
          </div>
        </article>
      </section>
    </PageTransition>
  );
}
