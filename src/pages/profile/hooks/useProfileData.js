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
const PROFILE_SYNC_INTERVAL_MS = 30000;
const PROFILE_OVERVIEW_ACTIVITY_LIMIT = 8;
const PROFILE_DETAIL_ACTIVITY_LIMIT = 120;
const PROFILE_OVERVIEW_WORK_STATUS_LIMIT = 8;
const PROFILE_RECORDS_WORK_STATUS_LIMIT = 160;
const PROFILE_OVERVIEW_BADGE_LIMIT = 8;
const PROFILE_PROGRESS_BADGE_LIMIT = 80;
const PROFILE_INBOX_WORK_COMMENT_LIMIT = 60;
const PROFILE_COMMENT_COUNT_LIMIT = 500;
const PROFILE_COMMUNITY_LIMIT = 20;

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

export function useProfileData(user, activeTab = 'overview') {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedMissionRoute, setSelectedMissionRoute] = useState('');
  const [workStatuses, setWorkStatuses] = useState([]);
  const [networkSignals, setNetworkSignals] = useState([]);
  const [manualBadges, setManualBadges] = useState([]);
  const [dataOwnerId, setDataOwnerId] = useState(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      let hasLoadedBaseProfile = false;

      try {
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
          hasLoadedBaseProfile = true;
          setProfile(nextProfile);
          setNickname(lockedNickname);
          setSelectedMissionRoute(getSelectedMissionRoute(user.id));
          setStatus('loading');
          setMessage('');
        }

        const activityLimit = activeTab === 'progress' || activeTab === 'inbox'
          ? PROFILE_DETAIL_ACTIVITY_LIMIT
          : PROFILE_OVERVIEW_ACTIVITY_LIMIT;
        const workStatusLimit = activeTab === 'records'
          ? PROFILE_RECORDS_WORK_STATUS_LIMIT
          : PROFILE_OVERVIEW_WORK_STATUS_LIMIT;
        const badgeLimit = activeTab === 'progress'
          ? PROFILE_PROGRESS_BADGE_LIMIT
          : PROFILE_OVERVIEW_BADGE_LIMIT;
        const shouldLoadInbox = activeTab === 'inbox';

        const [
          { data: activityData, error: activityError },
          { data: tasteActivityData, error: tasteActivityError },
          { data: statusData, error: statusError },
          { data: badgeData, error: badgeError },
          { data: workCommentData, error: workCommentError },
        ] = await Promise.all([
          supabase
            .from('activity_logs')
            .select('id,action_type,points,genre,metadata,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(activityLimit),
          supabase
            .from('activity_logs')
            .select('id,action_type,points,genre,metadata,created_at')
            .eq('user_id', user.id)
            .eq('action_type', 'taste_test')
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('work_statuses')
            .select('work_code,work_title,status,updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(workStatusLimit),
          supabase
            .from('user_badges')
            .select('badge_id,awarded_at,badges(title,description)')
            .eq('user_id', user.id)
            .order('awarded_at', { ascending: false })
            .limit(badgeLimit),
          shouldLoadInbox
            ? supabase
              .from('work_comments')
              .select('id,work_code,work_title,body,created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(PROFILE_INBOX_WORK_COMMENT_LIMIT)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const recentActivities = activityError ? [] : activityData ?? [];
        const latestTasteActivity = tasteActivityError ? null : tasteActivityData?.[0] ?? null;
        const nextActivities = latestTasteActivity && !recentActivities.some(activity => activity.id === latestTasteActivity.id)
          ? [latestTasteActivity, ...recentActivities]
          : recentActivities;
        const nextWorkStatuses = statusError ? mapLocalWorkStatuses(user.id) : statusData ?? [];
        const nextWorkComments = workCommentError ? [] : workCommentData ?? [];
        const workCodes = Array.from(new Set([
          ...nextWorkStatuses.map(item => item.work_code),
          ...nextWorkComments.map(item => item.work_code),
          ...nextActivities.map(item => item.metadata?.work_code),
        ].filter(Boolean)));
        let workCommentCounts = {};
        if (shouldLoadInbox && workCodes.length > 0) {
          const { data: commentCountData } = await supabase
            .from('work_comments')
            .select('work_code')
            .in('work_code', workCodes)
            .limit(PROFILE_COMMENT_COUNT_LIMIT);
          workCommentCounts = (commentCountData ?? []).reduce((result, item) => {
            result[item.work_code] = (result[item.work_code] ?? 0) + 1;
            return result;
          }, {});
        }

        let communityQuestions = [];
        if (shouldLoadInbox) {
          try {
            const data = await fetchCommunityQuestions({
              auth: true,
              includeCommentCounts: 1,
              mineOnly: 1,
              pageSize: PROFILE_COMMUNITY_LIMIT,
            });
            communityQuestions = Array.isArray(data.questions) ? data.questions : [];
          } catch {
            communityQuestions = [];
          }
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
          setDataOwnerId(user.id);
          setStatus(activityError ? 'partial' : 'ready');
          setMessage(activityError ? activityError.message : '');
        }
      } catch (error) {
        if (isMounted) {
          if (hasLoadedBaseProfile) {
            setActivities([]);
            setWorkStatuses([]);
            setNetworkSignals([]);
            setManualBadges([]);
            setDataOwnerId(user.id);
          }
          setStatus(hasLoadedBaseProfile ? 'partial' : 'error');
          setMessage(error?.message || '프로필 데이터를 불러오지 못했습니다.');
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [activeTab, user]);

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

  const hasCurrentUserData = Boolean(user?.id && dataOwnerId === user.id);
  const viewModel = useMemo(() => (
    hasCurrentUserData
      ? buildProfileViewModel({ activities, manualBadges, profile, selectedMissionRoute, workStatuses })
      : emptyProfileViewModel
  ), [activities, hasCurrentUserData, manualBadges, profile, selectedMissionRoute, workStatuses]);

  const chooseMissionRoute = routeId => {
    if (!viewModel.missionTree.trainingComplete) return;
    setSelectedMissionRoute(routeId);
    persistSelectedMissionRoute(user?.id, routeId);
  };

  return {
    activities: hasCurrentUserData ? activities : [],
    chooseMissionRoute,
    message: hasCurrentUserData || status === 'error' ? message : '',
    networkSignals: hasCurrentUserData ? networkSignals : [],
    nickname: hasCurrentUserData ? nickname : '',
    profile: hasCurrentUserData ? profile : null,
    status: user && !hasCurrentUserData && status !== 'error' ? 'loading' : status,
    viewModel,
    workStatuses: hasCurrentUserData ? workStatuses : [],
  };
}
