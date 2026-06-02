import { useEffect, useState } from 'react';
import { recordUserActivity } from '../../lib/activityLogger';
import { setJsonStorageItem } from '../../lib/browserStorage';
import { getSupabaseClient } from '../../lib/getSupabaseClient';

const emptyWorkSubmitForm = {
  title: '',
  author: '',
  publisher: '',
  category: '소설',
  link: '',
  tags: '',
  recommender: '',
};

export default function useWorkArchiveInteractions({
  getRandomWorks,
  setRandomWorkCodes,
  setWorks,
  user,
}) {
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
  const [workSubmitForm, setWorkSubmitForm] = useState(emptyWorkSubmitForm);

  useEffect(() => {
    if (!user) return undefined;

    const localKey = `sf-work-statuses:${user.id}`;
    let isMounted = true;

    getSupabaseClient().then(supabase => {
      if (!isMounted || !supabase) return;
      supabase
        .from('work_statuses')
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!isMounted || error) return;
          const nextStatuses = Object.fromEntries((data ?? []).map(item => [item.work_code, item.status]));
          setWorkStatuses(nextStatuses);
          setJsonStorageItem(localKey, nextStatuses);
        });
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedWork) {
      return undefined;
    }

    let isMounted = true;

    getSupabaseClient().then(supabase => {
      if (!isMounted) return;
      if (!supabase) {
        setCommentStatus('idle');
        return;
      }
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
        });
    }).catch(() => {
      if (!isMounted) return;
      setCommentStatus('error');
      setCommentMessage('댓글 신호를 불러오지 못했습니다.');
    });

    return () => {
      isMounted = false;
    };
  }, [selectedWork]);

  const openWorkDetail = work => {
    setSelectedWork(work);
    setWorkComments([]);
    setCommentText('');
    setCommentStatus('loading');
    setCommentMessage('');
  };

  const closeWorkDetail = () => {
    setSelectedWork(null);
    setWorkComments([]);
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
        setRandomWorkCodes(getRandomWorks(refreshed.works, 6).map(work => work.code));
      } else if (data.work) {
        setWorks(current => [data.work, ...current]);
      }

      setWorkSubmitForm(emptyWorkSubmitForm);
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
    setJsonStorageItem(localKey, nextStatuses);
    setWorkStatusSaving(true);

    const supabase = await getSupabaseClient();
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
      setCommentMessage('독서 상태 테이블 연결이 필요합니다. Supabase SQL 스키마를 다시 실행해주세요.');
      return;
    }

    await recordUserActivity(user, {
      actionType: 'work_status',
      points: nextStatus === 'done' ? 15 : 5,
      genre: selectedWork.medium,
      metadata: {
        title: `${selectedWork.title} 독서 상태`,
        work_code: selectedWork.code,
        work_title: selectedWork.title,
        status: nextStatus,
        tags: selectedWork.tags ?? [],
        node: 'works-archive',
      },
    });

    setCommentStatus('success');
    setCommentMessage('독서 상태가 저장되었습니다.');
  };

  const submitWorkComment = async event => {
    event.preventDefault();
    if (!selectedWork) return;
    if (!user) {
      setCommentStatus('error');
      setCommentMessage('댓글을 남기려면 먼저 로그인해주세요.');
      return;
    }

    const body = commentText.trim();
    if (!body) return;

    setCommentStatus('saving');
    setCommentMessage('');

    const supabase = await getSupabaseClient();
    if (!supabase) {
      setCommentStatus('error');
      setCommentMessage('댓글 저장을 위해 Supabase 연결이 필요합니다.');
      return;
    }

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

  return {
    closeWorkDetail,
    commentMessage,
    commentStatus,
    commentText,
    isWorkSubmitOpen,
    openWorkDetail,
    openWorkSubmit,
    selectedWork,
    setCommentText,
    setIsWorkSubmitOpen,
    submitWorkArchive,
    submitWorkComment,
    updateWorkStatus,
    updateWorkSubmitForm,
    workComments,
    workStatusSaving,
    workStatuses,
    workSubmitForm,
    workSubmitMessage,
    workSubmitStatus,
  };
}
