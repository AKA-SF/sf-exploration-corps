export const rankTable = [
  { title: '수습 대원', min: 0 },
  { title: '항해사', min: 100 },
  { title: '선임 항해사', min: 300 },
  { title: '함장', min: 700 },
  { title: '포스트휴먼', min: 1500 },
];

export const badgeRules = [
  {
    id: 'first-signal',
    title: '첫 신호 수신',
    description: '첫 활동 기록을 남기면 획득',
    icon: 'sparkles',
    condition: stats => stats.total >= 1,
    progress: stats => Math.min(100, stats.total * 100),
  },
  {
    id: 'archive-scribe',
    title: '아카이브 기록자',
    description: '리뷰/로그 5개 작성',
    icon: 'award',
    condition: stats => stats.reviews >= 5,
    progress: stats => Math.min(100, (stats.reviews / 5) * 100),
  },
  {
    id: 'quantum-reader',
    title: '양자역학 탐서가',
    description: '하드 SF 관련 기록 5개',
    icon: 'shield',
    condition: stats => stats.hardSf >= 5,
    progress: stats => Math.min(100, (stats.hardSf / 5) * 100),
  },
  {
    id: 'android-dream',
    title: '안드로이드의 꿈',
    description: '필립 K. 딕 관련 활동 3개',
    icon: 'badge',
    condition: stats => stats.android >= 3,
    progress: stats => Math.min(100, (stats.android / 3) * 100),
  },
  {
    id: 'resistance-leader',
    title: '저항군 리더',
    description: '디스토피아 관련 활동 5개',
    icon: 'trophy',
    condition: stats => stats.dystopia >= 5,
    progress: stats => Math.min(100, (stats.dystopia / 5) * 100),
  },
  {
    id: 'orbit-cartographer',
    title: '궤도 지도 제작자',
    description: '탐사 좌표/장르 관련 기록 3개',
    icon: 'orbit',
    condition: stats => stats.coordinates >= 3,
    progress: stats => Math.min(100, (stats.coordinates / 3) * 100),
  },
];

export function getRank(points) {
  const current = [...rankTable].reverse().find(rank => points >= rank.min) ?? rankTable[0];
  const next = rankTable.find(rank => rank.min > points) ?? null;
  const progress = next ? ((points - current.min) / (next.min - current.min)) * 100 : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)) };
}

export function getActivityStats(activities) {
  const text = activities
    .map(activity => [
      activity.action_type,
      activity.genre,
      activity.metadata?.title,
      activity.metadata?.work_title,
      activity.metadata?.node,
    ].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();

  return {
    total: activities.length,
    comments: activities.filter(activity => activity.action_type === 'comment').length,
    posts: activities.filter(activity => activity.action_type === 'post').length,
    reviews: activities.filter(activity => ['review', 'exploration_log'].includes(activity.action_type)).length,
    hardSf: (text.match(/하드|hard|과학|양자|물리/g) ?? []).length,
    dystopia: (text.match(/디스토피아|dystopia|감시|저항/g) ?? []).length,
    android: (text.match(/필립|philip|딕|dick|안드로이드|android/g) ?? []).length,
    coordinates: (text.match(/좌표|coordinate|node|genre|장르|탐사/g) ?? []).length,
  };
}

export function getBadges(stats) {
  return badgeRules.map(rule => ({
    ...rule,
    unlocked: rule.condition(stats),
    progress: rule.progress(stats),
  }));
}
