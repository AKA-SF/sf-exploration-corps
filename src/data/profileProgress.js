export const rankTable = [
  { title: '탐사보조원', min: 0 },
  { title: '수습 대원', min: 20 },
  { title: '탐사대원', min: 60 },
  { title: '연구원', min: 120 },
  { title: '분석사', min: 220 },
  { title: '항해사', min: 380 },
  { title: '선임 항해사', min: 620 },
  { title: '부함장', min: 950 },
  { title: '함장', min: 1400 },
  { title: '심우주 사령관', min: 2000 },
  { title: '포스트휴먼', min: 3000 },
];

export const badgeRules = [
  {
    id: 'first-signal',
    title: '첫 신호 수신',
    description: '탐사단 네트워크에 첫 번째 신호를 남겼습니다.',
    icon: 'sparkles',
    condition: stats => stats.total >= 1,
    progress: stats => Math.min(100, stats.total * 100),
  },
  {
    id: 'first-want-coordinate',
    title: '탐사 예정 좌표 등록',
    description: '아직 도착하지 않은 SF 좌표를 탐사 목록에 등록했습니다.',
    icon: 'orbit',
    condition: stats => stats.wantToRead >= 1,
    progress: stats => Math.min(100, stats.wantToRead * 100),
  },
  {
    id: 'route-collector',
    title: '관심 항로 수집가',
    description: '앞으로 향할 탐사 항로가 점점 선명해지고 있습니다.',
    icon: 'award',
    condition: stats => stats.wantToRead >= 5,
    progress: stats => Math.min(100, (stats.wantToRead / 5) * 100),
  },
  {
    id: 'waiting-orbit-manager',
    title: '대기 궤도 관리자',
    description: '탐사 대기 중인 작품들이 하나의 궤도를 이루기 시작했습니다.',
    icon: 'shield',
    condition: stats => stats.wantToRead >= 10,
    progress: stats => Math.min(100, (stats.wantToRead / 10) * 100),
  },
  {
    id: 'current-expedition-start',
    title: '현재 탐사 개시',
    description: '하나의 SF 세계에 본격적으로 진입했습니다.',
    icon: 'sparkles',
    condition: stats => stats.reading >= 1,
    progress: stats => Math.min(100, stats.reading * 100),
  },
  {
    id: 'parallel-voyager',
    title: '동시 항해자',
    description: '여러 세계를 동시에 항해하는 탐사자가 되었습니다.',
    icon: 'orbit',
    condition: stats => stats.reading >= 3,
    progress: stats => Math.min(100, (stats.reading / 3) * 100),
  },
  {
    id: 'first-expedition-complete',
    title: '첫 탐사 완료',
    description: '하나의 SF 세계를 끝까지 통과했습니다.',
    icon: 'badge',
    condition: stats => stats.readDone >= 1,
    progress: stats => Math.min(100, stats.readDone * 100),
  },
  {
    id: 'orbit-entry',
    title: '궤도 진입',
    description: 'SF 우주의 낮은 궤도에 진입했습니다.',
    icon: 'orbit',
    condition: stats => stats.readDone >= 3,
    progress: stats => Math.min(100, (stats.readDone / 3) * 100),
  },
  {
    id: 'stellar-system-pass',
    title: '항성계 통과',
    description: '하나의 항성계를 지나 더 깊은 독서 항로로 이동했습니다.',
    icon: 'award',
    condition: stats => stats.readDone >= 5,
    progress: stats => Math.min(100, (stats.readDone / 5) * 100),
  },
  {
    id: 'deep-space-voyager',
    title: '심우주 항해자',
    description: '이제 당신의 기록은 심우주 탐사 데이터로 분류됩니다.',
    icon: 'trophy',
    condition: stats => stats.readDone >= 10,
    progress: stats => Math.min(100, (stats.readDone / 10) * 100),
  },
  {
    id: 'interstellar-recordist',
    title: '성간 항해 기록자',
    description: '여러 세계를 통과한 장거리 탐사 기록을 보유했습니다.',
    icon: 'trophy',
    condition: stats => stats.readDone >= 30,
    progress: stats => Math.min(100, (stats.readDone / 30) * 100),
  },
  {
    id: 'comment-operator',
    title: '댓글 교신자',
    description: '다른 탐사자와의 교신이 시작되었습니다.',
    icon: 'badge',
    condition: stats => stats.comments >= 5,
    progress: stats => Math.min(100, (stats.comments / 5) * 100),
  },
  {
    id: 'signal-amplifier',
    title: '신호 증폭자',
    description: '좋은 탐사 기록의 신호를 더 멀리 증폭했습니다.',
    icon: 'sparkles',
    condition: stats => stats.reactions >= 10,
    progress: stats => Math.min(100, (stats.reactions / 10) * 100),
  },
  {
    id: 'curator-cadet',
    title: '큐레이터 후보생',
    description: '다른 탐사자를 위한 첫 번째 항로를 설계했습니다.',
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
    description: '네온, 데이터, 거대기업의 섹터에 접속했습니다.',
    icon: 'badge',
    condition: stats => stats.doneCyberpunk >= 3,
    progress: stats => Math.min(100, (stats.doneCyberpunk / 3) * 100),
  },
  {
    id: 'dystopia-survivor',
    title: '디스토피아 생존자',
    description: '붕괴한 체제 속에서도 기록을 남겼습니다.',
    icon: 'trophy',
    condition: stats => stats.doneDystopia >= 3,
    progress: stats => Math.min(100, (stats.doneDystopia / 3) * 100),
  },
  {
    id: 'hard-sf-engineer',
    title: '하드 SF 엔지니어',
    description: '고밀도 과학 신호를 해독하는 능력을 얻었습니다.',
    icon: 'shield',
    condition: stats => stats.doneHardSf >= 3,
    progress: stats => Math.min(100, (stats.doneHardSf / 3) * 100),
  },
  {
    id: 'cosmic-horror-witness',
    title: '코즈믹 호러 목격자',
    description: '인간의 이해를 넘어선 신호를 목격했습니다.',
    icon: 'sparkles',
    condition: stats => stats.doneCosmicHorror >= 3,
    progress: stats => Math.min(100, (stats.doneCosmicHorror / 3) * 100),
  },
  {
    id: 'time-loop-detector',
    title: '시간 루프 감지자',
    description: '반복되는 시간의 균열을 감지했습니다.',
    icon: 'orbit',
    condition: stats => stats.doneTimeTravel >= 3,
    progress: stats => Math.min(100, (stats.doneTimeTravel / 3) * 100),
  },
  {
    id: 'alien-intelligence-envoy',
    title: '외계지성 교섭관',
    description: '비인간 지성과의 첫 교섭 프로토콜을 열었습니다.',
    icon: 'badge',
    condition: stats => stats.doneAlienCivilization >= 3,
    progress: stats => Math.min(100, (stats.doneAlienCivilization / 3) * 100),
  },
  {
    id: 'climate-disaster-sentinel',
    title: '기후 재난 감시자',
    description: '붕괴하는 행성 환경의 경고 신호를 수집했습니다.',
    icon: 'shield',
    condition: stats => stats.doneCliFi >= 3,
    progress: stats => Math.min(100, (stats.doneCliFi / 3) * 100),
  },
  {
    id: 'media-archive-entry',
    title: '미디어 아카이브 입장',
    description: '텍스트 바깥의 SF 신호망에 접속했습니다.',
    icon: 'sparkles',
    condition: stats => stats.mediaVisits >= 1,
    progress: stats => Math.min(100, stats.mediaVisits * 100),
  },
  {
    id: 'classic-film-observer',
    title: '고전 영화 관측자',
    description: '오래된 영상 기록 속 미래 상상력을 관측했습니다.',
    icon: 'orbit',
    condition: stats => stats.classicFilmVisits >= 3,
    progress: stats => Math.min(100, (stats.classicFilmVisits / 3) * 100),
  },
  {
    id: 'interview-listener',
    title: '인터뷰 청취자',
    description: '작가와 창작자의 목소리에서 새로운 단서를 발견했습니다.',
    icon: 'badge',
    condition: stats => stats.interviewVisits >= 3,
    progress: stats => Math.min(100, (stats.interviewVisits / 3) * 100),
  },
  {
    id: 'media-signal-collector',
    title: '미디어 신호 수집가',
    description: '영화, 인터뷰, 자료 카드의 신호를 폭넓게 수집했습니다.',
    icon: 'award',
    condition: stats => stats.mediaVisits >= 10,
    progress: stats => Math.min(100, (stats.mediaVisits / 10) * 100),
  },
  {
    id: 'first-term-decoder',
    title: 'SF 용어 첫 해독',
    description: 'SF 우주를 이해하기 위한 첫 번째 개념을 해독했습니다.',
    icon: 'sparkles',
    condition: stats => stats.conceptReads >= 1,
    progress: stats => Math.min(100, stats.conceptReads * 100),
  },
  {
    id: 'concept-dictionary-explorer',
    title: '개념 사전 탐사자',
    description: '장르를 읽는 데 필요한 핵심 개념들을 수집했습니다.',
    icon: 'orbit',
    condition: stats => stats.conceptReads >= 5,
    progress: stats => Math.min(100, (stats.conceptReads / 5) * 100),
  },
  {
    id: 'theory-signal-decoder',
    title: '이론 신호 해독자',
    description: 'SF 세계의 구조를 읽는 해석 장비를 갖추었습니다.',
    icon: 'shield',
    condition: stats => stats.conceptReads >= 15,
    progress: stats => Math.min(100, (stats.conceptReads / 15) * 100),
  },
  {
    id: 'first-community-contact',
    title: '커뮤니티 첫 교신',
    description: '탐사단 내부 통신망에 첫 메시지를 남겼습니다.',
    icon: 'badge',
    condition: stats => stats.posts >= 1,
    progress: stats => Math.min(100, stats.posts * 100),
  },
  {
    id: 'exploration-log-writer',
    title: '탐사 로그 작성자',
    description: '자신의 탐사 경험을 기록 가능한 데이터로 남겼습니다.',
    icon: 'award',
    condition: stats => stats.posts >= 3,
    progress: stats => Math.min(100, (stats.posts / 3) * 100),
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

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

export function getActivityStats(activities, workStatuses = []) {
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
  const workStatusItems = Array.isArray(workStatuses) ? workStatuses : [];
  const statusCounts = workStatusItems.reduce((result, item) => ({
    ...result,
    [item.status]: (result[item.status] ?? 0) + 1,
  }), {});
  const doneStatusText = workStatusItems
    .filter(item => item.status === 'done')
    .map(item => [item.work_title, item.work_code, item.genre, item.metadata ? JSON.stringify(item.metadata) : ''].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();
  const doneActivityText = activities
    .filter(activity => activity.action_type === 'work_status' && activity.metadata?.status === 'done')
    .map(activity => [
      activity.genre,
      activity.metadata?.title,
      activity.metadata?.work_title,
      activity.metadata?.tags,
      JSON.stringify(activity.metadata ?? {}),
    ].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();
  const doneText = `${doneStatusText} ${doneActivityText}`;
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
    classicFilmVisits: activities.filter(activity => activity.action_type === 'media_visit' && /고전|영화|classic|film|cinema/.test(`${activity.genre ?? ''} ${JSON.stringify(activity.metadata ?? {})}`.toLowerCase())).length,
    interviewVisits: activities.filter(activity => activity.action_type === 'media_visit' && /인터뷰|작가|interview/.test(`${activity.genre ?? ''} ${JSON.stringify(activity.metadata ?? {})}`.toLowerCase())).length,
    wantToRead: statusCounts.want ?? 0,
    reading: statusCounts.reading ?? 0,
    readDone: statusCounts.done ?? 0,
    beginnerGuide: countMatches(text, /입문|초보|처음\s*읽|시작\s*추천|입문자/g),
    cyberpunk: countMatches(text, /사이버펑크|cyberpunk|해커|가상현실|네트워크|포스트휴먼/g),
    hardSf: countMatches(text, /하드|hard|과학|양자|물리|공학|엔지니어/g),
    dystopia: countMatches(text, /디스토피아|dystopia|감시|저항/g),
    cosmicHorror: countMatches(text, /코즈믹|cosmic|우주\s*공포|러브크래프트|크툴루|심연/g),
    timeTravel: countMatches(text, /시간여행|시간\s*루프|타임\s*루프|타임머신|time travel|time loop/g),
    alienCivilization: countMatches(text, /외계|외계지성|외계\s*문명|alien|first contact|퍼스트\s*콘택트/g),
    cliFi: countMatches(text, /클라이파이|기후|기후재난|생태|환경|clifi|cli-fi|climate/g),
    socialSf: countMatches(text, /인문|사회|뉴웨이브|new wave|디스토피아|dystopia|의식|기억|정체성|감시|저항/g),
    android: countMatches(text, /필립|philip|딕|dick|안드로이드|android/g),
    leguin: countMatches(text, /르\s*귄|르귄|le guin|leguin|어슐러|ursula/g),
    tedChiang: countMatches(text, /테드\s*창|테드창|ted chiang/g),
    koreanSf: countMatches(text, /한국\s*sf|한국\s*과학소설|한국소설|천선란|김초엽|김보영|듀나|문목하|청예/g),
    nonAngloSf: countMatches(text, /비영미|비영어|폴란드|중국|일본|한국|라오서|류츠신|스타니스와프|렘|아시아|non-anglo/g),
    womenSf: countMatches(text, /여성\s*작가|여성작가|옥타비아|버틀러|르\s*귄|르귄|어슐러|김초엽|김보영|천선란|코니\s*윌리스|베키\s*체임버스/g),
    doneCyberpunk: countMatches(doneText, /사이버펑크|cyberpunk|해커|가상현실|네트워크|포스트휴먼/g),
    doneHardSf: countMatches(doneText, /하드|hard|과학|양자|물리|공학|엔지니어/g),
    doneDystopia: countMatches(doneText, /디스토피아|dystopia|감시|저항/g),
    doneCosmicHorror: countMatches(doneText, /코즈믹|cosmic|우주\s*공포|러브크래프트|크툴루|심연/g),
    doneTimeTravel: countMatches(doneText, /시간여행|시간\s*루프|타임\s*루프|타임머신|time travel|time loop/g),
    doneAlienCivilization: countMatches(doneText, /외계|외계지성|외계\s*문명|alien|first contact|퍼스트\s*콘택트/g),
    doneCliFi: countMatches(doneText, /클라이파이|기후|기후재난|생태|환경|clifi|cli-fi|climate/g),
    coordinates: countMatches(text, /좌표|coordinate|node|genre|장르|탐사/g),
    communitySignals: activities.filter(activity => ['post', 'comment'].includes(activity.action_type)).length,
    uniqueSectors,
    returnAfter30Days,
    unknownSignal: activities.length >= 1 && uniqueSectors >= 5 && countMatches(text, /미확인|unknown|secret|숨겨진/g) >= 1 ? 1 : 0,
  };
}

export function getBadges(stats) {
  return badgeRules.map(rule => ({
    ...rule,
    unlocked: rule.condition(stats),
    progress: rule.progress(stats),
  }));
}

export function normalizeManualBadges(userBadges = []) {
  return userBadges.map(item => {
    const badge = item.badges ?? {};
    return {
      id: item.badge_id,
      title: badge.title ?? item.badge_id,
      description: badge.description ?? '관리자가 수동으로 지급한 히든 배지입니다.',
      icon: 'sparkles',
      manual: true,
      awardedAt: item.awarded_at,
      unlocked: true,
      progress: 100,
    };
  });
}

export function mergeManualBadges(badges, userBadges = []) {
  const manualBadges = normalizeManualBadges(userBadges);
  const existingIds = new Set(badges.map(badge => badge.id));
  const mergedBadges = badges.map(badge => {
    const manualBadge = manualBadges.find(item => item.id === badge.id);
    return manualBadge ? { ...badge, ...manualBadge, unlocked: true, progress: 100 } : badge;
  });

  return [
    ...mergedBadges,
    ...manualBadges.filter(badge => !existingIds.has(badge.id)),
  ];
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
