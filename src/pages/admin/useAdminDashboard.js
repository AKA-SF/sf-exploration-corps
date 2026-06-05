import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  checkEndpoint,
  endpointChecks,
  errorMessage,
  getAdminAccessToken,
  getCount,
  getOptionalCount,
  initialCounts,
} from './adminUtils';

export function useAdminDashboard({ isAdmin, user }) {
  const [counts, setCounts] = useState(initialCounts);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [radioMessages, setRadioMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [memberNotes, setMemberNotes] = useState([]);
  const [checks, setChecks] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const loadAdminDashboard = useCallback(async () => {
    if (!user || !isAdmin || !supabase) return;
    setStatus('loading');
    setMessage('');

    try {
      const adminToken = await getAdminAccessToken(supabase);
      const [
        memberCount,
        activityCount,
        workCommentCount,
        workStatusCount,
        radioCount,
        badgeCount,
        adminActionCount,
        memberNoteCount,
        memberResult,
        activityResult,
        commentResult,
        radioResult,
        userBadgeResult,
        adminLogResult,
        memberNoteResult,
        questionResult,
        endpointResults,
      ] = await Promise.all([
        getCount(supabase, 'profiles'),
        getCount(supabase, 'activity_logs'),
        getCount(supabase, 'work_comments'),
        getCount(supabase, 'work_statuses', 'work_code'),
        getCount(supabase, 'radio_messages'),
        getCount(supabase, 'user_badges', 'badge_id'),
        getOptionalCount(supabase, 'admin_action_logs'),
        getOptionalCount(supabase, 'member_admin_notes', 'user_id'),
        supabase
          .from('profiles')
          .select('id,nickname,title,title_override,mileage,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(200),
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
        supabase
          .from('admin_action_logs')
          .select('id,admin_user_id,action_type,target_type,target_id,target_label,metadata,created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('member_admin_notes')
          .select('user_id,note,updated_by,updated_at')
          .order('updated_at', { ascending: false })
          .limit(200),
        fetch('/api/questions?admin=1&pageSize=24', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then(response => (response.ok ? response.json() : { questions: [], totalCount: 0 })),
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
        adminActions: adminActionCount,
        communityQuestions: questionResult.totalCount ?? questionResult.questions?.length ?? 0,
        memberNotes: memberNoteCount,
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
      setAdminLogs(adminLogResult.error ? [] : adminLogResult.data ?? []);
      setMemberNotes(memberNoteResult.error ? [] : memberNoteResult.data ?? []);
      setQuestions(questionResult.questions ?? []);
      setChecks(endpointResults.map((result, index) => {
        const check = result.status === 'fulfilled'
          ? result.value
          : { ...endpointChecks[index], count: 0, ok: false };
        if (check.key !== 'questions') return check;
        return {
          ...check,
          count: questionResult.totalCount ?? questionResult.questions?.length ?? check.count,
        };
      }));
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(errorMessage(error));
    }
  }, [isAdmin, user]);

  useEffect(() => {
    void Promise.resolve().then(loadAdminDashboard);
  }, [loadAdminDashboard]);

  return {
    activities,
    adminLogs,
    checks,
    comments,
    counts,
    loadAdminDashboard,
    memberNotes,
    members,
    message,
    questions,
    radioMessages,
    status,
    userBadges,
  };
}
