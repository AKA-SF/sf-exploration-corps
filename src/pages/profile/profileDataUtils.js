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

function compactText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

function getWorkHref(workCode) {
  return workCode ? `/works/novels?work=${encodeURIComponent(workCode)}` : '/works/novels';
}

function getTimestamp(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function buildProfileNetworkSignals({
  activities = [],
  communityQuestions = [],
  workCommentCounts = {},
  workComments = [],
  workStatuses = [],
}) {
  const signals = [];
  const seen = new Set();

  const pushSignal = signal => {
    const key = signal.key || `${signal.type}:${signal.href}:${signal.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({
      commentCount: 0,
      date: '',
      detail: '',
      href: '',
      tone: 'cyan',
      ...signal,
      key,
    });
  };

  communityQuestions.forEach(question => {
    pushSignal({
      key: `question:${question.id}`,
      type: 'community',
      label: question.category || 'COMMUNITY',
      title: question.title,
      detail: compactText(question.content, '커뮤니티 게시글'),
      href: question.id ? `/questions/${question.id}` : '/questions',
      commentCount: question.commentCount ?? 0,
      date: question.createdAt || question.date,
      timestamp: getTimestamp(question.createdAt || question.date),
      tone: 'amber',
    });
  });

  workComments.forEach(comment => {
    pushSignal({
      key: `work-comment:${comment.id}`,
      type: 'work-comment',
      label: 'ARCHIVE COMMENT',
      title: comment.work_title || comment.work_code,
      detail: compactText(comment.body, '작품 카드에 댓글을 남겼습니다.'),
      href: getWorkHref(comment.work_code),
      commentCount: workCommentCounts[comment.work_code] ?? 0,
      date: comment.created_at,
      timestamp: getTimestamp(comment.created_at),
      tone: 'violet',
    });
  });

  workStatuses.forEach(status => {
    pushSignal({
      key: `work-status:${status.work_code}:${status.status}`,
      type: 'work-status',
      label: 'ARCHIVE CARD',
      title: status.work_title || status.work_code,
      detail: status.status === 'done'
        ? '읽었어요 상태로 탐사 완료 기록'
        : status.status === 'reading'
          ? '읽고 있어요 상태로 현재 탐사 중'
          : '읽고 싶어요 상태로 탐사 예정 좌표 등록',
      href: getWorkHref(status.work_code),
      commentCount: workCommentCounts[status.work_code] ?? 0,
      date: status.updated_at,
      timestamp: getTimestamp(status.updated_at),
      tone: 'cyan',
    });
  });

  activities
    .filter(activity => ['post', 'comment', 'work_status'].includes(activity.action_type))
    .forEach(activity => {
      const metadata = activity.metadata ?? {};
      if (metadata.question_id) {
        pushSignal({
          key: `activity-question:${activity.id}`,
          type: 'activity',
          label: activity.action_type === 'comment' ? 'COMMUNITY COMMENT' : 'COMMUNITY',
          title: metadata.question_title || metadata.title || activityTitle(activity),
          detail: compactText(metadata.category || activity.genre, '커뮤니티 활동'),
          href: `/questions/${metadata.question_id}`,
          date: activity.created_at,
          timestamp: getTimestamp(activity.created_at),
          tone: 'amber',
        });
      } else if (metadata.work_code) {
        pushSignal({
          key: `activity-work:${activity.id}`,
          type: 'activity',
          label: activity.action_type === 'work_status' ? 'ARCHIVE CARD' : 'ARCHIVE COMMENT',
          title: metadata.work_title || metadata.title || activityTitle(activity),
          detail: compactText(activity.genre, '작품 아카이브 활동'),
          href: getWorkHref(metadata.work_code),
          commentCount: workCommentCounts[metadata.work_code] ?? 0,
          date: activity.created_at,
          timestamp: getTimestamp(activity.created_at),
          tone: activity.action_type === 'work_status' ? 'cyan' : 'violet',
        });
      }
    });

  return signals
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, 16);
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
