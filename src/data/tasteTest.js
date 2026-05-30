export const tasteProfiles = {
  engineer: {
    code: 'TYPE-01',
    title: '하드웨어 엔지니어',
    genre: '하드 SF형',
    vessel: '정밀 관측선 오비터',
    summary: '과학적 고증, 기술적 개연성, 우주 공학의 디테일에서 가장 큰 즐거움을 느끼는 탐사 대원입니다.',
    keywords: ['하드', '과학', '물리', '우주공학', '화성', '기술', '프로젝트', '솔라리스'],
  },
  linguist: {
    code: 'TYPE-02',
    title: '외계 생명체 언어학자',
    genre: '뉴웨이브 / 퍼스트 콘택트형',
    vessel: '심우주 번역선 에코',
    summary: '낯선 존재와 언어, 타자성, 감각의 변화처럼 인간의 인식 자체를 흔드는 이야기에 끌립니다.',
    keywords: ['외계', '언어', '타자', '문명', '콘택트', '솔라리스', '어둠의 왼손', '르 귄'],
  },
  navigator: {
    code: 'TYPE-03',
    title: '은하 항로 개척자',
    genre: '스페이스 오페라형',
    vessel: '은하 항로선 노바',
    summary: '제국, 함대, 행성, 문명 충돌처럼 우주 규모로 펼쳐지는 큰 서사와 모험에 강하게 반응합니다.',
    keywords: ['스페이스', '오페라', '은하', '제국', '우주', '듄', '파운데이션', '나인폭스'],
  },
  hacker: {
    code: 'TYPE-04',
    title: '도시 네트워크 해커',
    genre: '사이버펑크 / 포스트휴먼형',
    vessel: '궤도 침투선 글리치',
    summary: '인공지능, 기억, 신체 개조, 거대 도시와 통제 시스템의 어두운 빛에 민감한 탐사자입니다.',
    keywords: ['사이버', '안드로이드', '인공지능', 'AI', '기억', '신체', '네트워크', '포스트휴먼'],
  },
  archivist: {
    code: 'TYPE-05',
    title: '폐허 기록 보관자',
    genre: '디스토피아 / 아포칼립스형',
    vessel: '잔해 수집선 아카이브',
    summary: '무너진 세계와 감시 사회, 재난 이후의 공동체처럼 현재의 불안을 밀도 있게 읽는 성향입니다.',
    keywords: ['디스토피아', '아포칼립스', '재난', '통제', '감시', '생존', '화씨', '온실'],
  },
  ecologist: {
    code: 'TYPE-06',
    title: '비인간 생태학자',
    genre: '생태 SF / 공생형',
    vessel: '행성 생태선 리프',
    summary: '기후, 식물, 동물, 비인간 존재와의 공생처럼 인간 중심 바깥의 세계를 탐사합니다.',
    keywords: ['생태', '기후', '환경', '동물', '식물', '공생', '비인간', '온실'],
  },
};

export const tasteQuestions = [
  {
    id: 'q1',
    question: '처음 보는 SF를 고를 때 가장 먼저 끌리는 것은?',
    options: [
      { label: '과학 설정이 얼마나 설득력 있는지', scores: { engineer: 3, navigator: 1 } },
      { label: '낯선 존재와 세계를 만나는 감각', scores: { linguist: 3, ecologist: 1 } },
      { label: '무너진 사회와 살아남는 사람들', scores: { archivist: 3, hacker: 1 } },
    ],
  },
  {
    id: 'q2',
    question: '가장 오래 생각나는 장면은 어느 쪽인가요?',
    options: [
      { label: '거대한 우주선, 행성, 은하 정치', scores: { navigator: 3, engineer: 1 } },
      { label: '기억이 조작되거나 몸이 바뀌는 순간', scores: { hacker: 3, linguist: 1 } },
      { label: '인간이 아닌 존재와 관계를 맺는 순간', scores: { ecologist: 3, linguist: 2 } },
    ],
  },
  {
    id: 'q3',
    question: '토론 모임에서 가장 던지고 싶은 질문은?',
    options: [
      { label: '이 기술은 실제로 가능할까?', scores: { engineer: 3, hacker: 1 } },
      { label: '우리는 무엇을 인간이라고 부를 수 있을까?', scores: { hacker: 2, linguist: 2 } },
      { label: '세계가 망한 뒤 공동체는 어떻게 다시 생길까?', scores: { archivist: 3, ecologist: 1 } },
    ],
  },
  {
    id: 'q4',
    question: '당신에게 더 매력적인 탐사 임무는?',
    options: [
      { label: '미지의 행성 궤도와 물리 조건 분석', scores: { engineer: 3, navigator: 1 } },
      { label: '외계 문명의 언어와 의례 기록', scores: { linguist: 3, ecologist: 1 } },
      { label: '거대 도시의 은폐된 시스템 침투', scores: { hacker: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q5',
    question: '책장을 덮은 뒤 가장 만족스러운 감정은?',
    options: [
      { label: '설정이 정교하게 맞물렸다는 쾌감', scores: { engineer: 3, navigator: 1 } },
      { label: '내가 알던 인간의 기준이 흔들리는 감각', scores: { linguist: 2, hacker: 2 } },
      { label: '지금 사회를 다시 보게 되는 불편함', scores: { archivist: 3, ecologist: 1 } },
    ],
  },
  {
    id: 'q6',
    question: '가장 궁금한 미래 기술은?',
    options: [
      { label: '우주 항행, 궤도 거주, 테라포밍', scores: { engineer: 2, navigator: 2 } },
      { label: '의식 업로드, 인공 신체, 네트워크 자아', scores: { hacker: 3, linguist: 1 } },
      { label: '기후 복원, 생태 네트워크, 공생 기술', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q7',
    question: '당신이 선호하는 주인공은?',
    options: [
      { label: '문제를 계산하고 해결하는 과학자/엔지니어', scores: { engineer: 3 } },
      { label: '낯선 문화 사이를 통역하는 관찰자', scores: { linguist: 3, navigator: 1 } },
      { label: '붕괴한 세계에서 기록을 남기는 생존자', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q8',
    question: '가장 끌리는 배경은?',
    options: [
      { label: '거대한 행성 도시와 데이터 네트워크', scores: { hacker: 3, navigator: 1 } },
      { label: '은하 제국의 변경 지대', scores: { navigator: 3 } },
      { label: '인간보다 오래된 숲과 바다', scores: { ecologist: 3, linguist: 1 } },
    ],
  },
  {
    id: 'q9',
    question: '당신이 더 오래 붙잡는 질문은?',
    options: [
      { label: '이 세계의 물리 법칙은 어떻게 작동할까?', scores: { engineer: 3 } },
      { label: '타자의 언어를 정말 이해할 수 있을까?', scores: { linguist: 3 } },
      { label: '감시와 편의는 어디서 갈라질까?', scores: { hacker: 2, archivist: 2 } },
    ],
  },
  {
    id: 'q10',
    question: 'SF에서 가장 피하고 싶은 것은?',
    options: [
      { label: '과학 설정이 너무 헐거운 이야기', scores: { engineer: 3 } },
      { label: '우주 규모인데 인간 사회가 너무 단순한 이야기', scores: { navigator: 2, linguist: 1 } },
      { label: '세계가 무너졌는데 공동체 질문이 없는 이야기', scores: { archivist: 2, ecologist: 1 } },
    ],
  },
  {
    id: 'q11',
    question: '당신의 탐사 장비를 하나 고른다면?',
    options: [
      { label: '정밀 센서와 계산 모듈', scores: { engineer: 3 } },
      { label: '언어 샘플러와 문화 기록 장치', scores: { linguist: 3 } },
      { label: '암호 해독기와 접속 단말', scores: { hacker: 3 } },
    ],
  },
  {
    id: 'q12',
    question: '더 읽고 싶은 갈등은?',
    options: [
      { label: '행성 환경과 기술 한계의 충돌', scores: { engineer: 2, ecologist: 2 } },
      { label: '문명과 문명의 오해', scores: { linguist: 2, navigator: 2 } },
      { label: '개인과 통제 시스템의 충돌', scores: { hacker: 2, archivist: 2 } },
    ],
  },
  {
    id: 'q13',
    question: '가장 매력적인 제목의 느낌은?',
    options: [
      { label: '방정식, 궤도, 실험, 임계점', scores: { engineer: 3 } },
      { label: '제국, 항로, 함대, 성간', scores: { navigator: 3 } },
      { label: '폐허, 금지구역, 마지막 기록', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q14',
    question: '작품 속 AI를 볼 때 먼저 드는 생각은?',
    options: [
      { label: '어떤 구조와 학습 방식으로 작동할까?', scores: { engineer: 2, hacker: 1 } },
      { label: '의식이나 권리를 가질 수 있을까?', scores: { hacker: 2, linguist: 1 } },
      { label: '인간 사회의 통제 도구가 되지 않을까?', scores: { archivist: 2, hacker: 1 } },
    ],
  },
  {
    id: 'q15',
    question: '당신에게 좋은 SF 세계관이란?',
    options: [
      { label: '내부 규칙이 단단한 세계', scores: { engineer: 3 } },
      { label: '규모가 크고 역사성이 느껴지는 세계', scores: { navigator: 3 } },
      { label: '비인간 존재까지 살아 있는 세계', scores: { ecologist: 3 } },
    ],
  },
  {
    id: 'q16',
    question: '가장 마음이 가는 결말은?',
    options: [
      { label: '문제의 원리를 이해하고 다음 실험으로 나아간다', scores: { engineer: 3 } },
      { label: '완전한 이해 대신 공존의 가능성을 남긴다', scores: { linguist: 2, ecologist: 2 } },
      { label: '낡은 체제가 무너지고 작은 공동체가 살아남는다', scores: { archivist: 3 } },
    ],
  },
  {
    id: 'q17',
    question: '독서 모임에서 맡고 싶은 역할은?',
    options: [
      { label: '설정 오류와 과학적 가능성 체크', scores: { engineer: 3 } },
      { label: '상징, 언어, 타자성 해석', scores: { linguist: 3 } },
      { label: '사회 구조와 권력 관계 분석', scores: { archivist: 3, hacker: 1 } },
    ],
  },
  {
    id: 'q18',
    question: '가장 흥미로운 공포는?',
    options: [
      { label: '우주의 규모 앞에서 느끼는 압도감', scores: { navigator: 2, linguist: 1 } },
      { label: '내 기억과 몸이 내 것이 아닐 수 있다는 감각', scores: { hacker: 3 } },
      { label: '기후와 생태계가 되돌릴 수 없게 바뀌는 감각', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
  {
    id: 'q19',
    question: '작품을 추천받는다면 어떤 문장이 좋나요?',
    options: [
      { label: '과학 설정이 탄탄해서 천천히 파고들 맛이 있어요.', scores: { engineer: 3 } },
      { label: '읽고 나면 인간이라는 말이 이상해져요.', scores: { linguist: 2, hacker: 2 } },
      { label: '세계가 망하는데도 이상하게 따뜻해요.', scores: { archivist: 2, ecologist: 2 } },
    ],
  },
  {
    id: 'q20',
    question: '당신의 우주선 항로를 정한다면?',
    options: [
      { label: '검증되지 않은 과학 가설을 따라간다', scores: { engineer: 3 } },
      { label: '은하 외곽의 오래된 문명을 찾아간다', scores: { navigator: 2, linguist: 2 } },
      { label: '버려진 지구 생태권의 회복 신호를 따라간다', scores: { ecologist: 3, archivist: 1 } },
    ],
  },
];

export function getRandomTasteQuestions() {
  return [...tasteQuestions].sort(() => Math.random() - 0.5).slice(0, 4);
}

function getWorkSearchText(work) {
  return [
    work.title,
    work.subtitle,
    work.medium,
    work.recommender,
    ...(work.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function getTasteProfile(answers, questions) {
  const scores = Object.keys(tasteProfiles).reduce((result, key) => ({ ...result, [key]: 0 }), {});

  questions.forEach(question => {
    const selectedIndex = answers[question.id];
    const selectedOption = question.options[selectedIndex];
    if (!selectedOption) return;

    Object.entries(selectedOption.scores).forEach(([profile, score]) => {
      scores[profile] = (scores[profile] ?? 0) + score;
    });
  });

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'engineer';
  return tasteProfiles[winner];
}

export function getTasteRecommendations(items, profile) {
  if (!profile) return [];

  const bookLikeWorks = items.filter(work => {
    const medium = String(work.medium ?? '').toLowerCase();
    return medium.includes('novel') || medium.includes('소설') || medium.includes('이론서') || medium.includes('archive');
  });
  const source = bookLikeWorks.length > 0 ? bookLikeWorks : items;
  const keywords = profile.keywords.map(keyword => keyword.toLowerCase());

  const ranked = source
    .map(work => {
      const searchText = getWorkSearchText(work);
      const score = keywords.reduce((total, keyword) => (
        searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword)
          ? total + 2
          : total
      ), 0);
      return { work, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked
    .filter(item => item.score > 0)
    .map(item => item.work)
    .concat(source.filter(work => !ranked.some(item => item.work.code === work.code)))
    .slice(0, 3);
}
