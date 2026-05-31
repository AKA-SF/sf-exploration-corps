import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
  buildProfileViewModel,
  getFallbackNickname,
  getSelectedMissionRoute,
  mapLocalWorkStatuses,
  setSelectedMissionRoute as persistSelectedMissionRoute,
} from '../profileDataUtils';

const emptyProfileViewModel = buildProfileViewModel({
  activities: [],
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

  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      const fallbackNickname = getFallbackNickname(user);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
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
          .select('*')
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
      ] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('work_statuses')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ]);

      if (isMounted) {
        setProfile(nextProfile);
        setNickname(nextProfile.nickname ?? fallbackNickname);
        setActivities(activityError ? [] : activityData ?? []);
        setWorkStatuses(statusError ? mapLocalWorkStatuses(user.id) : statusData ?? []);
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
      ? buildProfileViewModel({ activities, profile, selectedMissionRoute, workStatuses })
      : emptyProfileViewModel
  ), [activities, profile, selectedMissionRoute, user, workStatuses]);

  const saveNickname = async event => {
    event.preventDefault();
    if (!user || !supabase) return;
    setStatus('saving');
    const { data, error } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setProfile(data);
    setStatus('ready');
    setMessage('프로필이 저장되었습니다.');
  };

  const chooseMissionRoute = routeId => {
    if (!viewModel.missionTree.trainingComplete) return;
    setSelectedMissionRoute(routeId);
    persistSelectedMissionRoute(user?.id, routeId);
  };

  return {
    activities,
    chooseMissionRoute,
    message,
    nickname,
    onNicknameChange: setNickname,
    onSaveNickname: saveNickname,
    profile,
    status,
    viewModel,
    workStatuses,
  };
}
