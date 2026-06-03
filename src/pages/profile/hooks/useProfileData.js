import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
  buildProfileNetworkSignals,
  buildProfileViewModel,
  getFallbackNickname,
  getProfileNickname,
  getSelectedMissionRoute,
  mapLocalWorkStatuses,
  setSelectedMissionRoute as persistSelectedMissionRoute,
} from '../profileDataUtils';
import { getCommunityAuthHeaders } from '../../questions/communityApi';

const emptyProfileViewModel = buildProfileViewModel({
  activities: [],
  manualBadges: [],
  profile: null,
  selectedMissionRoute: '',
  workStatuses: [],
});

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
    if (!user || !supabase) return;
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      const fallbackNickname = getFallbackNickname(user);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,nickname,mileage,title,avatar_url,created_at,updated_at')
        .eq('id', user.id)
        .maybeSingle();

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
          .select('id,nickname,mileage,title,avatar_url,created_at,updated_at')
          .single();
        if (createError) {
          if (isMounted) {
            setStatus('error');
            setMessage(createError.message);
          }
          return;
        }
        nextProfile = createdProfile;
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

      let communityQuestions = [];
      try {
        const authHeaders = await getCommunityAuthHeaders();
        const response = await fetch('/api/questions?mine=1&includeCommentCounts=1&pageSize=40', {
          cache: 'no-store',
          headers: authHeaders,
        });
        if (response.ok) {
          const data = await response.json();
          communityQuestions = Array.isArray(data.questions) ? data.questions : [];
        }
      } catch {
        communityQuestions = [];
      }

      const lockedNickname = getProfileNickname(user, nextProfile, fallbackNickname);

      if (nextProfile && !nextProfile.nickname) {
        const { data: repairedProfile } = await supabase
          .from('profiles')
          .update({ nickname: lockedNickname })
          .eq('id', user.id)
          .select('id,nickname,mileage,title,avatar_url,created_at,updated_at')
          .maybeSingle();
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
