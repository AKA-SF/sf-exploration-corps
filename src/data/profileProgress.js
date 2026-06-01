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
    id: 'orbit-entry',
    title: '궤도 진입',
    description: '독서 로그 3개 작성',
    icon: 'orbit',
    condition: stats => stats.reviews >= 3,
    progress: stats => Math.min(100, (stats.reviews / 3) * 100),
  },
  {
    id: 'stellar-system-pass',
    title: '항성계 통과',
    description: '독서 로그 5개 작성',
    icon: 'award',
    condition: stats => stats.reviews >= 5,
    progress: stats => Math.min(100, (stats.reviews / 5) * 100),
  },
  {
    id: 'deep-space-voyager',
    title: '심우주 항해자',
    description: '독서 로그 10개 작성',
    icon: 'trophy',
    condition: stats => stats.reviews >= 10,
    progress: stats => Math.min(100, (stats.reviews / 10) * 100),
  },
  {
    id: 'comment-operator',
    title: '댓글 교신자',
    description: '댓글 5개 작성',
    icon: 'badge',
    condition: stats => stats.comments >= 5,
    progress: stats => Math.min(100, (stats.comments / 5) * 100),
  },
  {
    id: 'signal-amplifier',
    title: '신호 증폭자',
    description: '반응 10회 남기기',
    icon: 'sparkles',
    condition: stats => stats.reactions >= 10,
    progress: stats => Math.min(100, (stats.reactions / 10) * 100),
  },
  {
    id: 'curator-cadet',
    title: '큐레이터 후보생',
    description: '추천 리스트 1개 작성',
    icon: 'award',
    condition: stats => stats.recommendationLists >= 1,
    progress: stats => Math.min(100, stats.recommendationLists * 100),
  },
  {
    id: 'beginner-guide',
    title: '입문자 안내원',
    description: 'SF 입문 추천글 작성',
    icon: 'shield',
    condition: stats => stats.beginnerGuide >= 1,
    progress: stats => Math.min(100, stats.beginnerGuide * 100),
  },
  {
    id: 'cyberpunk-connector',
    title: '사이버펑크 접속자',
    description: '사이버펑크 기록 3개',
    icon: 'badge',
    condition: stats => stats.cyberpunk >= 3,
    progress: stats => Math.min(100, (stats.cyberpunk / 3) * 100),
  },
  {
    id: 'dystopia-survivor',
    title: '디스토피아 생존자',
    description: '디스토피아 기록 3개',
    icon: 'trophy',
    condition: stats => stats.dystopia >= 3,
    progress: stats => Math.min(100, (stats.dystopia / 3) * 100),
  },
  {
    id: 'hard-sf-engineer',
    title: '하드 SF 엔지니어',
    description: '하드 SF 기록 3개',
    icon: 'shield',
    condition: stats => stats.hardSf >= 3,
    progress: stats => Math.min(100, (stats.hardSf / 3) * 100),
  },
  {
    id: 'cosmic-horror-witness',
    title: '코즈믹 호러 목격자',
    description: '코즈믹 호러 기록 3개',
    icon: 'sparkles',
    condition: stats => stats.cosmicHorror >= 3,
    progress: stats => Math.min(100, (stats.cosmicHorror / 3) * 100),
  },
  {
    id: 'time-loop-detector',
    title: '시간 루프 감지자',
    description: '시간여행 기록 3개',
    icon: 'orbit',
    condition: stats => stats.timeTravel >= 3,
    progress: stats => Math.min(100, (stats.timeTravel / 3) * 100),
  },
  {
    id: 'alien-intelligence-envoy',
    title: '외계지성 교섭관',
    description: '외계 문명 기록 3개',
    icon: 'badge',
    condition: stats => stats.alienCivilization >= 3,
    progress: stats => Math.min(100, (stats.alienCivilization / 3) * 100),
  },
  {
    id: 'climate-disaster-sentinel',
    title: '기후 재난 감시자',
    description: '클라이파이 기록 3개',
    icon: 'shield',
    condition: stats => stats.cliFi >= 3,
    progress: stats => Math.min(100, (stats.cliFi / 3) * 100),
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
    description: '필립 K. 딕 기록 3개',
    icon: 'badge',
    condition: stats => stats.android >= 3,
    progress: stats => Math.min(100, (stats.android / 3) * 100),
  },
  {
    id: 'leguin-envoy',
    title: '르 귄의 사절',
    description: '르 귄 기록 3개',
    icon: 'orbit',
    condition: stats => stats.leguin >= 3,
    progress: stats => Math.min(100, (stats.leguin / 3) * 100),
  },
  {
    id: 'ted-chiang-equation',
    title: '테드 창의 방정식',
    description: '테드 창 기록 3개',
    icon: 'shield',
    condition: stats => stats.tedChiang >= 3,
    progress: stats => Math.min(100, (stats.tedChiang / 3) * 100),
  },
  {
    id: 'korean-sf-cartographer',
    title: '한국 SF 좌표 기록자',
    description: '한국 SF 기록 5개',
    icon: 'award',
    condition: stats => stats.koreanSf >= 5,
    progress: stats => Math.min(100, (stats.koreanSf / 5) * 100),
  },
  {
    id: 'non-anglo-route-pioneer',
    title: '비영미권 항로 개척자',
    description: '비영미권 SF 기록 5개',
    icon: 'orbit',
    condition: stats => stats.nonAngloSf >= 5,
    progress: stats => Math.min(100, (stats.nonAngloSf / 5) * 100),
  },
  {
    id: 'women-sf-explorer',
    title: '여성 SF 탐사자',
    description: '여성 작가 SF 기록 5개',
    icon: 'sparkles',
    condition: stats => stats.womenSf >= 5,
    progress: stats => Math.min(100, (stats.womenSf / 5) * 100),
  },
  {
    id: 'long-sleep-return',
    title: '장기 동면 해제',
    description: '30일 이상 공백 후 복귀',
    icon: 'badge',
    condition: stats => stats.returnAfter30Days >= 1,
    progress: stats => Math.min(100, stats.returnAfter30Days * 100),
  },
  {
    id: 'galactic-hitchhiker',
    title: '은하계 히치하이커',
    description: '서로 다른 섹터 5개 탐사',
    icon: 'orbit',
    condition: stats => stats.uniqueSectors >= 5,
    progress: stats => Math.min(100, (stats.uniqueSectors / 5) * 100),
  },
  {
    id: 'unknown-signal',
    title: '미확인 신호',
    description: '숨겨진 조건 달성',
    icon: 'sparkles',
    condition: stats => stats.unknownSignal >= 1,
    progress: stats => Math.min(100, stats.unknownSignal * 100),
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
  const sortedActivities = [...activities].sort((a, b) => (
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  ));
  const text = activities
    .map(activity => [
      activity.action_type,
      activity.genre,
      activity.metadata?.title,
      activity.metadata?.work_title,
      activity.metadata?.node,
      activity.metadata?.body,
      activity.metadata?.content,
      activity.metadata?.tags,
      JSON.stringify(activity.metadata ?? {}),
    ].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();
  const uniqueSectors = new Set(activities
    .map(activity => activity.genre)
    .filter(Boolean)
    .map(genre => String(genre).trim().toLowerCase())).size;
  const returnAfter30Days = sortedActivities.some((activity, index) => {
    if (index === 0) return false;
    const previousTime = new Date(sortedActivities[index - 1].created_at ?? 0).getTime();
    const currentTime = new Date(activity.created_at ?? 0).getTime();
    return currentTime - previousTime >= 30 * 24 * 60 * 60 * 1000;
  }) ? 1 : 0;

  return {
    total: activities.length,
    comments: activities.filter(activity => activity.action_type === 'comment').length,
    posts: activities.filter(activity => activity.action_type === 'post').length,
    reviews: activities.filter(activity => ['review', 'exploration_log'].includes(activity.action_type)).length,
    reactions: activities.filter(activity => ['reaction', 'signal_reaction', 'amplify'].includes(activity.action_type)).length,
    recommendationLists: activities.filter(activity => ['recommendation_list', 'curation_list'].includes(activity.action_type)).length,
    tasteTests: activities.filter(activity => activity.action_type === 'taste_test').length,
    conceptReads: activities.filter(activity => activity.action_type === 'concept_read').length,
    mediaVisits: activities.filter(activity => activity.action_type === 'media_visit').length,
    beginnerGuide: (text.match(/입문|초보|처음\s*읽|시작\s*추천|입문자/g) ?? []).length,
    cyberpunk: (text.match(/사이버펑크|cyberpunk|해커|가상현실|네트워크|포스트휴먼/g) ?? []).length,
    hardSf: (text.match(/하드|hard|과학|양자|물리|공학|엔지니어/g) ?? []).length,
    dystopia: (text.match(/디스토피아|dystopia|감시|저항/g) ?? []).length,
    cosmicHorror: (text.match(/코즈믹|cosmic|우주\s*공포|러브크래프트|크툴루|심연/g) ?? []).length,
    timeTravel: (text.match(/시간여행|시간\s*루프|타임\s*루프|타임머신|time travel|time loop/g) ?? []).length,
    alienCivilization: (text.match(/외계|외계지성|외계\s*문명|alien|first contact|퍼스트\s*콘택트/g) ?? []).length,
    cliFi: (text.match(/클라이파이|기후|기후재난|생태|환경|clifi|cli-fi|climate/g) ?? []).length,
    socialSf: (text.match(/인문|사회|뉴웨이브|new wave|디스토피아|dystopia|의식|기억|정체성|감시|저항/g) ?? []).length,
    android: (text.match(/필립|philip|딕|dick|안드로이드|android/g) ?? []).length,
    leguin: (text.match(/르\s*귄|르귄|le guin|leguin|어슐러|ursula/g) ?? []).length,
    tedChiang: (text.match(/테드\s*창|테드창|ted chiang/g) ?? []).length,
    koreanSf: (text.match(/한국\s*sf|한국\s*과학소설|한국소설|천선란|김초엽|김보영|듀나|문목하|청예/g) ?? []).length,
    nonAngloSf: (text.match(/비영미|비영어|폴란드|중국|일본|한국|라오서|류츠신|스타니스와프|렘|아시아|non-anglo/g) ?? []).length,
    womenSf: (text.match(/여성\s*작가|여성작가|옥타비아|버틀러|르\s*귄|르귄|어슐러|김초엽|김보영|천선란|코니\s*윌리스|베키\s*체임버스/g) ?? []).length,
    coordinates: (text.match(/좌표|coordinate|node|genre|장르|탐사/g) ?? []).length,
    communitySignals: activities.filter(activity => ['post', 'comment'].includes(activity.action_type)).length,
    uniqueSectors,
    returnAfter30Days,
    unknownSignal: activities.length >= 1 && uniqueSectors >= 5 && (text.match(/미확인|unknown|secret|숨겨진/g) ?? []).length >= 1 ? 1 : 0,
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
