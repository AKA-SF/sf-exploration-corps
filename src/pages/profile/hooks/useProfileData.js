import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/getSupabaseClient';
import {
  buildProfileNetworkSignals,
  buildProfileViewModel,
  getFallbackNickname,
  getProfileNickname,
  getSelectedMissionRoute,
  mapLocalWorkStatuses,
  setSelectedMissionRoute as persistSelectedMissionRoute,
} from '../profileDataUtils';
import { fetchCommunityQuestions } from '../../questions/communityApi';

const emptyProfileViewModel = buildProfileViewModel({
  activities: [],
  manualBadges: [],
  profile: null,
  selectedMissionRoute: '',
  workStatuses: [],
});

const profileFields = 'id,nickname,public_code,mileage,title,title_override,avatar_url,created_at,updated_at';
const legacyProfileFields = 'id,nickname,mileage,title,avatar_url,created_at,updated_at';
const PROFILE_SYNC_INTERVAL_MS = 8000;

async function selectProfileById(supabase, userId) {
  const result = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', userId)
    .maybeSingle();

  if (result.error?.code !== '42703') return result;

  return supabase
    .from('profiles')
    .select(legacyProfileFields)
    .eq('id', userId)
    .maybeSingle();
}

async function selectProfileAfterWrite(supabase, userId) {
  const result = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', userId)
    .maybeSingle();

  if (result.error?.code !== '42703') return result.data;

  const { data } = await supabase
    .from('profiles')
    .select(legacyProfileFields)
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export function useProfileData(user) {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedMissionRoute, setSelectedMissionRoute] = useState('');
  const [workStatuses, setWorkStatuses] = useState([]);
  const [networkSignals, setNetworkSignals] = useState([]);
  const [manualBadges, setManualBadges] = useState([]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      const supabase = await getSupabaseClient();
      if (!isMounted) return;
      if (!supabase) {
        if (isMounted) {
          setStatus('error');
          setMessage('Supabase 연결 정보를 찾지 못했습니다.');
        }
        return;
      }
      const fallbackNickname = getFallbackNickname(user);
      const { data: profileData, error: profileError } = await selectProfileById(supabase, user.id);

      if (profileError && profileError.code !== 'PGRST116') {
        if (isMounted) {
          setStatus('error');
          setMessage(profileError.message);
        }
        return;
      }

      let nextProfile = profileData;
      if (!nextProfile) {
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: user.id, nickname: fallbackNickname })
          .select(profileFields)
          .single();
        if (createError) {
          if (createError.code === '42703') {
            const { data: legacyCreatedProfile, error: legacyCreateError } = await supabase
              .from('profiles')
              .insert({ id: user.id, nickname: fallbackNickname })
              .select(legacyProfileFields)
              .single();
            if (!legacyCreateError) {
              nextProfile = legacyCreatedProfile;
            } else if (isMounted) {
              setStatus('error');
              setMessage(legacyCreateError.message);
            }
          } else if (isMounted) {
            setStatus('error');
            setMessage(createError.message);
          }
          if (!nextProfile) return;
        } else {
          nextProfile = createdProfile;
        }
      }

      const [
        { data: activityData, error: activityError },
        { data: statusData, error: statusError },
        { data: badgeData, error: badgeError },
        { data: workCommentData, error: workCommentError },
      ] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('id,action_type,points,genre,metadata,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('work_statuses')
          .select('work_code,work_title,status,updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase
          .from('user_badges')
          .select('badge_id,awarded_at,badges(title,description)')
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false })
          .limit(200),
        supabase
          .from('work_comments')
          .select('id,work_code,work_title,body,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const nextActivities = activityError ? [] : activityData ?? [];
      const nextWorkStatuses = statusError ? mapLocalWorkStatuses(user.id) : statusData ?? [];
      const nextWorkComments = workCommentError ? [] : workCommentData ?? [];
      const workCodes = Array.from(new Set([
        ...nextWorkStatuses.map(item => item.work_code),
        ...nextWorkComments.map(item => item.work_code),
        ...nextActivities.map(item => item.metadata?.work_code),
      ].filter(Boolean)));
      let workCommentCounts = {};
      if (workCodes.length > 0) {
        const { data: commentCountData } = await supabase
          .from('work_comments')
          .select('work_code')
          .in('work_code', workCodes)
          .limit(1000);
        workCommentCounts = (commentCountData ?? []).reduce((result, item) => {
          result[item.work_code] = (result[item.work_code] ?? 0) + 1;
          return result;
        }, {});
      }

      let communityQuestions;
      try {
        const data = await fetchCommunityQuestions({
          auth: true,
          includeCommentCounts: 1,
          mineOnly: 1,
          pageSize: 40,
        });
        communityQuestions = Array.isArray(data.questions) ? data.questions : [];
      } catch {
        communityQuestions = [];
      }

      const lockedNickname = getProfileNickname(user, nextProfile, fallbackNickname);

      if (nextProfile && !nextProfile.nickname) {
        await supabase
          .from('profiles')
          .update({ nickname: lockedNickname })
          .eq('id', user.id)
          .select('id');
        const repairedProfile = await selectProfileAfterWrite(supabase, user.id);
        nextProfile = repairedProfile ?? { ...nextProfile, nickname: lockedNickname };
      }

      if (isMounted) {
        setProfile(nextProfile);
        setNickname(lockedNickname);
        setActivities(nextActivities);
        setWorkStatuses(nextWorkStatuses);
        setNetworkSignals(buildProfileNetworkSignals({
          activities: nextActivities,
          communityQuestions,
          workCommentCounts,
          workComments: nextWorkComments,
          workStatuses: nextWorkStatuses,
        }));
        setManualBadges(badgeError ? [] : badgeData ?? []);
        setSelectedMissionRoute(getSelectedMissionRoute(user.id));
        setStatus(activityError ? 'partial' : 'ready');
        setMessage(activityError ? activityError.message : '');
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    let profileChannel = null;

    async function refreshProfileRecord() {
      const supabase = await getSupabaseClient();
      if (!isMounted || !supabase) return;

      const { data, error } = await selectProfileById(supabase, user.id);
      if (!isMounted || error || !data) return;

      setProfile(data);
      setNickname(getProfileNickname(user, data, getFallbackNickname(user)));
    }

    function refreshWhenVisible() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshProfileRecord();
    }

    const intervalId = window.setInterval(refreshWhenVisible, PROFILE_SYNC_INTERVAL_MS);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    getSupabaseClient().then(supabase => {
      if (!isMounted || !supabase) return;
      profileChannel = supabase
        .channel(`profile-sync-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          filter: `id=eq.${user.id}`,
          schema: 'public',
          table: 'profiles',
        }, payload => {
          const nextProfile = payload.new;
          if (!nextProfile) return;
          setProfile(nextProfile);
          setNickname(getProfileNickname(user, nextProfile, getFallbackNickname(user)));
        })
        .subscribe();
    });

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      if (profileChannel) {
        void getSupabaseClient().then(supabase => supabase?.removeChannel(profileChannel));
      }
    };
  }, [user]);

  const viewModel = useMemo(() => (
    user
      ? buildProfileViewModel({ activities, manualBadges, profile, selectedMissionRoute, workStatuses })
      : emptyProfileViewModel
  ), [activities, manualBadges, profile, selectedMissionRoute, user, workStatuses]);

  const chooseMissionRoute = routeId => {
    if (!viewModel.missionTree.trainingComplete) return;
    setSelectedMissionRoute(routeId);
    persistSelectedMissionRoute(user?.id, routeId);
  };

  return {
    activities,
    chooseMissionRoute,
    message,
    networkSignals,
    nickname,
    profile,
    status,
    viewModel,
    workStatuses,
  };
}
