import { getActivityStats, getBadges, getMissionTree, getRank, mergeManualBadges } from '../../data/profileProgress';
import { tasteProfiles } from '../../data/tasteTest';
import { getJsonStorageItem, getStorageItem, setStorageItem } from '../../lib/browserStorage';
import { getProfileNickname, getUserNickname } from '../../lib/userIdentity';

export function getFallbackNickname(user) {
  return getUserNickname(user);
}

export { getProfileNickname };

export function activityTitle(activity) {
  return activity.metadata?.title
    || activity.metadata?.work_title
    || activity.metadata?.node
    || activity.genre
    || '탐사 활동';
}

export function mapLocalWorkStatuses(userId) {
  if (!userId) return [];
  const localWorkStatuses = getJsonStorageItem(`sf-work-statuses:${userId}`, {});
  return Object.entries(localWorkStatuses).map(([workCode, readStatus]) => ({
    work_code: workCode,
    work_title: workCode,
    status: readStatus,
  }));
}

export function getSelectedMissionRoute(userId) {
  return userId ? getStorageItem(`sf-selected-mission-route:${userId}`, '') : '';
}

export function setSelectedMissionRoute(userId, routeId) {
  if (userId) setStorageItem(`sf-selected-mission-route:${userId}`, routeId);
}

function getLatestTasteProfile(activities) {
  const latestTasteActivity = activities.find(activity => activity.action_type === 'taste_test');
  if (!latestTasteActivity) return null;

  const metadata = latestTasteActivity.metadata ?? {};
  const profile = Object.values(tasteProfiles).find(item => (
    item.code === metadata.taste_code ||
    item.title === metadata.taste_title ||
    item.genre === latestTasteActivity.genre
  ));

  return profile
    ? { ...profile, completedAt: latestTasteActivity.created_at }
    : {
      code: metadata.taste_code ?? 'TYPE-SCAN',
      title: metadata.taste_title ?? '탐사 성향 확인 완료',
      genre: latestTasteActivity.genre ?? 'SF 탐사형',
      vessel: metadata.node ?? 'SF 탐사선',
      summary: 'SF 탐사 성향 테스트를 완료한 대원입니다.',
      completedAt: latestTasteActivity.created_at,
    };
}

export function buildProfileViewModel({ activities, manualBadges = [], profile, selectedMissionRoute, workStatuses }) {
  const points = profile?.mileage ?? activities.reduce((sum, activity) => sum + (activity.points ?? 0), 0);
  const rank = getRank(points);
  const stats = getActivityStats(activities, workStatuses);
  const badges = mergeManualBadges(getBadges(stats), manualBadges);
  const missionTree = getMissionTree(stats, selectedMissionRoute);
  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const todayKey = new Date().toLocaleDateString('sv-SE');
  const dailyLoginReceived = activities.some(activity => (
    activity.action_type === 'daily_login'
    && new Date(activity.created_at).toLocaleDateString('sv-SE') === todayKey
  ));
  const nextMission = missionTree.training.find(mission => !mission.complete)
    || missionTree.selectedRoute?.missions.find(mission => !mission.complete)
    || missionTree.routes.find(route => route.unlocked)?.missions.find(mission => !mission.complete)
    || null;
  const statusCounts = workStatuses.reduce((result, item) => ({
    ...result,
    [item.status]: (result[item.status] ?? 0) + 1,
  }), {});
  const latestWorkStatus = workStatuses[0] ?? null;
  const activitySummary = {
    posts: activities.filter(activity => activity.action_type === 'post').slice(0, 3),
    comments: activities.filter(activity => activity.action_type === 'comment').slice(0, 3),
    badges: unlockedBadges.slice(0, 3),
    missions: [
      ...missionTree.training,
      ...(missionTree.selectedRoute?.missions ?? []),
    ].filter(mission => !mission.complete).slice(0, 3),
  };

  return {
    activitySummary,
    badges,
    dailyLoginReceived,
    latestWorkStatus,
    latestTasteProfile: getLatestTasteProfile(activities),
    missionTree,
    nextMission,
    points,
    rank,
    stats,
    statusCounts,
    unlockedBadges,
  };
}
