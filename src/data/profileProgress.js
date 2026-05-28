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

export const trainingMissions = [
  {
    id: 'taste-test',
    title: '성향 테스트 완료하기',
    description: '나의 SF 성향 테스트를 끝내고 첫 탐사자 유형을 확인합니다.',
    metric: 'tasteTests',
    target: 1,
  },
  {
    id: 'first-post',
    title: '첫 커뮤니티 글 남기기',
    description: '커뮤니티 게시판에 인사나 질문을 남겨 첫 공개 신호를 발신합니다.',
    metric: 'posts',
    target: 1,
  },
  {
    id: 'concept-read',
    title: '사전 용어 1개 읽기',
    description: 'SF 개념 사전에서 관심 있는 용어를 열람합니다.',
    metric: 'conceptReads',
    target: 1,
  },
  {
    id: 'first-comment',
    title: '작품 카드 댓글 남기기',
    description: '작품 아카이브 카드에 짧은 감상이나 질문을 기록합니다.',
    metric: 'comments',
    target: 1,
  },
];

export const missionRoutes = [
  {
    id: 'hardware',
    title: '하드웨어 루트',
    subtitle: '기술, 과학, 우주공학 중심 탐사',
    description: '정교한 설정과 과학적 개연성을 따라 작품을 좌표화하는 루트입니다.',
    missions: [
      {
        id: 'hardware-review',
        title: '기술 중심 SF 기록 3개',
        description: '하드 SF, 과학, 물리, 우주공학 관련 활동을 3회 남깁니다.',
        metric: 'hardSf',
        target: 3,
      },
      {
        id: 'hardware-map',
        title: '탐사 좌표 신호 1개',
        description: '탐사 좌표나 장르 노드와 관련된 활동을 1회 남깁니다.',
        metric: 'coordinates',
        target: 1,
      },
    ],
  },
  {
    id: 'software',
    title: '소프트웨어 루트',
    subtitle: '인문, 사회, 의식 변화 중심 탐사',
    description: '사회 구조, 정체성, 기억, 디스토피아를 중심으로 읽는 루트입니다.',
    missions: [
      {
        id: 'software-review',
        title: '인문/사회 SF 기록 3개',
        description: '디스토피아, 뉴웨이브, 사회, 의식, 기억 관련 활동을 3회 남깁니다.',
        metric: 'socialSf',
        target: 3,
      },
      {
        id: 'software-debate',
        title: '토론 신호 3개',
        description: '커뮤니티 글이나 댓글을 합쳐 3회 남깁니다.',
        metric: 'communitySignals',
        target: 3,
      },
    ],
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
    tasteTests: activities.filter(activity => activity.action_type === 'taste_test').length,
    conceptReads: activities.filter(activity => activity.action_type === 'concept_read').length,
    mediaVisits: activities.filter(activity => activity.action_type === 'media_visit').length,
    hardSf: (text.match(/하드|hard|과학|양자|물리/g) ?? []).length,
    dystopia: (text.match(/디스토피아|dystopia|감시|저항/g) ?? []).length,
    socialSf: (text.match(/인문|사회|뉴웨이브|new wave|디스토피아|dystopia|의식|기억|정체성|감시|저항/g) ?? []).length,
    android: (text.match(/필립|philip|딕|dick|안드로이드|android/g) ?? []).length,
    coordinates: (text.match(/좌표|coordinate|node|genre|장르|탐사/g) ?? []).length,
    communitySignals: activities.filter(activity => ['post', 'comment'].includes(activity.action_type)).length,
  };
}

export function getBadges(stats) {
  return badgeRules.map(rule => ({
    ...rule,
    unlocked: rule.condition(stats),
    progress: rule.progress(stats),
  }));
}

export function hydrateMissions(missions, stats, locked = false) {
  return missions.map(mission => {
    const value = stats[mission.metric] ?? 0;
    const progress = Math.min(100, (value / mission.target) * 100);
    return {
      ...mission,
      locked,
      value,
      progress,
      complete: value >= mission.target,
    };
  });
}

export function getMissionTree(stats, selectedRouteId) {
  const training = hydrateMissions(trainingMissions, stats);
  const trainingComplete = training.every(mission => mission.complete);
  const routes = missionRoutes.map(route => ({
    ...route,
    selected: route.id === selectedRouteId,
    unlocked: trainingComplete,
    missions: hydrateMissions(route.missions, stats, !trainingComplete),
  }));

  return {
    training,
    trainingComplete,
    routes,
    selectedRoute: routes.find(route => route.selected) ?? null,
  };
}
