import { useState } from 'react';

const genreNodes = [
  { id: 'hard-sf', label: '하드 SF', en: 'HARD SF', x: 50, y: 16, orbit: 2, tone: 'cyan', signals: 14, keywords: ['하드SF', '하드 SF', '과학', '물리학', '우주공학'], questions: ['과학적 개연성은 상상력의 제약일까, 추진력일까?'], concepts: ['하드 SF', '과학적 개연성'] },
  { id: 'space-opera', label: '스페이스 오페라', en: 'SPACE OPERA', x: 75, y: 30, orbit: 3, tone: 'blue', signals: 18, keywords: ['스페이스오페라', '은하', '제국', '우주', '함대'], questions: ['우주 규모의 정치는 인간 사회를 어떻게 확대해서 보여주는가?'], concepts: ['스페이스 오페라', '우주 서사'] },
  { id: 'cyberpunk', label: '사이버펑크', en: 'CYBERPUNK', x: 80, y: 58, orbit: 2, tone: 'cyan', signals: 12, keywords: ['사이버펑크', '안드로이드', '네트워크', 'AI', '해커'], questions: ['기술은 인간의 신체와 기억을 어디까지 바꿀 수 있을까?'], concepts: ['사이버펑크', '포스트휴먼'] },
  { id: 'dystopia', label: '디스토피아', en: 'DYSTOPIA', x: 63, y: 82, orbit: 2, tone: 'amber', signals: 16, keywords: ['디스토피아', '통제', '감시', '전체주의'], questions: ['디스토피아는 미래 예언보다 현재 진단에 가까운가?'], concepts: ['디스토피아', '감시사회'] },
  { id: 'apocalypse', label: '아포칼립스', en: 'APOCALYPSE', x: 36, y: 82, orbit: 3, tone: 'amber', signals: 13, keywords: ['아포칼립스', '종말', '재난', '생존'], questions: ['세계의 끝은 사회의 본질을 어떻게 드러내는가?'], concepts: ['아포칼립스', '생존'] },
  { id: 'posthuman', label: '포스트휴먼', en: 'POST-HUMAN', x: 18, y: 58, orbit: 3, tone: 'amber', signals: 14, keywords: ['포스트휴먼', '신체', '의식', '인공생명'], questions: ['인간 이후에도 인간성이라는 말은 유효할까?'], concepts: ['포스트휴먼', '신체성'] },
  { id: 'time-travel', label: '시간여행', en: 'TIME TRAVEL', x: 24, y: 30, orbit: 1, tone: 'cyan', signals: 11, keywords: ['시간여행', '시간', '루프', '평행세계'], questions: ['시간여행 서사는 왜 후회와 선택의 문제로 돌아오는가?'], concepts: ['시간여행', '인과율'] },
  { id: 'eco-sf', label: '생태 SF', en: 'ECO SF', x: 50, y: 50, orbit: 1, tone: 'blue', signals: 10, keywords: ['생태', '기후', '환경', '공생', '비인간'], questions: ['비인간 존재를 이야기의 중심에 놓으면 세계관은 어떻게 바뀌는가?'], concepts: ['생태 SF', '공생'] },
];

const sfCoreNode = {
  id: 'sf-core',
  label: 'SF',
  en: 'SCIENCE FICTION',
  x: 50,
  y: 50,
  orbit: 5,
  tone: 'cyan',
  signals: 8,
  keywords: ['SF', '과학소설', 'science fiction', '미래', '상상력'],
  questions: ['SF는 미래를 예측하는 장르일까, 현재를 다르게 읽는 장치일까?'],
  concepts: ['SF', '과학소설', '사변적 상상력'],
};

const mapConnections = [
  ...genreNodes.map(node => ['sf-core', node.id]),
  ['hard-sf', 'space-opera'],
  ['hard-sf', 'time-travel'],
  ['space-opera', 'eco-sf'],
  ['space-opera', 'cyberpunk'],
  ['cyberpunk', 'posthuman'],
  ['cyberpunk', 'dystopia'],
  ['dystopia', 'apocalypse'],
  ['dystopia', 'time-travel'],
  ['apocalypse', 'eco-sf'],
  ['posthuman', 'eco-sf'],
  ['posthuman', 'time-travel'],
  ['eco-sf', 'hard-sf'],
];

const genreSubmaps = {
  'hard-sf': {
    description: '하드 SF는 과학적 가설과 물리 법칙의 제약을 중심으로, 기술과 우주를 가능한 세계로 계산합니다.',
    nodes: [
      { id: 'near-future', label: '근미래 기술', en: 'NEAR FUTURE', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 8, keywords: ['근미래', '기술', 'AI'], questions: ['가까운 미래의 기술은 지금 우리의 습관을 어떻게 비틀어 보여주는가?'], concepts: ['근미래', '기술사회'] },
      { id: 'space-engineering', label: '우주 공학', en: 'SPACE ENGINEERING', x: 76, y: 36, orbit: 3, tone: 'blue', signals: 7, keywords: ['우주공학', '궤도', '화성'], questions: ['우주 개발은 탐험인가, 시스템의 확장인가?'], concepts: ['우주공학', '궤도'] },
      { id: 'planetary-science', label: '행성과학', en: 'PLANETARY SCIENCE', x: 68, y: 72, orbit: 2, tone: 'cyan', signals: 6, keywords: ['행성', '테라포밍', '기후'], questions: ['행성 환경이 바뀌면 사회의 규칙도 바뀌는가?'], concepts: ['행성과학', '테라포밍'] },
      { id: 'first-contact', label: '퍼스트 콘택트', en: 'FIRST CONTACT', x: 32, y: 72, orbit: 2, tone: 'amber', signals: 9, keywords: ['외계', '조우', '언어'], questions: ['첫 조우에서 무너지는 것은 언어일까 세계관일까?'], concepts: ['타자성', '언어'] },
      { id: 'simulation', label: '시뮬레이션', en: 'SIMULATION', x: 24, y: 36, orbit: 1, tone: 'blue', signals: 5, keywords: ['시뮬레이션', '가상', '현실'], questions: ['현실이 계산된 것이라면 경험의 진짜성은 어디에 놓이는가?'], concepts: ['가상현실', '의식'] },
    ],
    connections: [['hard-sf', 'near-future'], ['hard-sf', 'space-engineering'], ['hard-sf', 'planetary-science'], ['hard-sf', 'first-contact'], ['hard-sf', 'simulation'], ['space-engineering', 'space-opera'], ['first-contact', 'space-opera'], ['simulation', 'cyberpunk']],
  },
  'space-opera': {
    description: '스페이스 오페라는 은하 규모의 정치, 전쟁, 모험, 문명 충돌을 장대한 서사로 펼칩니다.',
    nodes: [
      { id: 'galactic-empire', label: '은하 제국', en: 'GALACTIC EMPIRE', x: 50, y: 17, orbit: 3, tone: 'amber', signals: 9, keywords: ['제국', '은하', '정치'], questions: ['거대한 제국은 어떤 질서와 폭력을 동시에 만드는가?'], concepts: ['제국', '정치SF'] },
      { id: 'fleet-war', label: '함대 전쟁', en: 'FLEET WAR', x: 77, y: 38, orbit: 2, tone: 'blue', signals: 7, keywords: ['함대', '전쟁', '전략'], questions: ['전쟁은 우주 규모에서 어떻게 추상화되는가?'], concepts: ['전쟁', '군사SF'] },
      { id: 'alien-civilization', label: '외계 문명', en: 'ALIEN CIVILIZATION', x: 66, y: 75, orbit: 2, tone: 'cyan', signals: 8, keywords: ['외계', '문명', '타자'], questions: ['타자의 문명은 인간 중심의 역사를 어떻게 흔드는가?'], concepts: ['타자성', '문명'] },
      { id: 'deep-voyage', label: '심우주 항해', en: 'DEEP VOYAGE', x: 34, y: 75, orbit: 1, tone: 'blue', signals: 6, keywords: ['항해', '우주선', '탐사'], questions: ['탐사는 발견인가, 새로운 경계의 생산인가?'], concepts: ['탐사', '우주선'] },
      { id: 'stellar-myth', label: '성간 신화', en: 'STELLAR MYTH', x: 23, y: 38, orbit: 2, tone: 'amber', signals: 5, keywords: ['신화', '예언', '영웅'], questions: ['우주 서사는 왜 다시 신화가 되는가?'], concepts: ['신화', '영웅서사'] },
    ],
    connections: [['space-opera', 'galactic-empire'], ['space-opera', 'fleet-war'], ['space-opera', 'alien-civilization'], ['space-opera', 'deep-voyage'], ['space-opera', 'stellar-myth'], ['alien-civilization', 'first-contact'], ['deep-voyage', 'space-engineering'], ['galactic-empire', 'dystopia']],
  },
  cyberpunk: {
    description: '사이버펑크는 고도화된 기술과 붕괴한 사회 질서가 동시에 존재하는 도시적 SF 감각입니다.',
    nodes: [
      { id: 'megacity', label: '메가시티', en: 'MEGACITY', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 6, keywords: ['도시', '기업', '계급'], questions: ['도시는 왜 미래의 불평등을 가장 먼저 드러내는가?'], concepts: ['도시', '불평등'] },
      { id: 'cybernetics', label: '사이버네틱스', en: 'CYBERNETICS', x: 76, y: 38, orbit: 3, tone: 'amber', signals: 8, keywords: ['신체개조', '의수', '기계'], questions: ['신체가 교체되면 정체성도 교체되는가?'], concepts: ['신체성', '포스트휴먼'] },
      { id: 'net-hacker', label: '해커/네트워크', en: 'NET HACKER', x: 66, y: 75, orbit: 1, tone: 'blue', signals: 7, keywords: ['해커', '네트워크', '정보'], questions: ['정보에 접속하는 능력은 새로운 계급이 되는가?'], concepts: ['네트워크', '정보'] },
      { id: 'ai-corporation', label: 'AI 기업국가', en: 'AI CORP STATE', x: 34, y: 75, orbit: 2, tone: 'cyan', signals: 6, keywords: ['AI', '기업', '통제'], questions: ['기업이 국가처럼 작동할 때 시민은 무엇이 되는가?'], concepts: ['AI SF', '통제'] },
      { id: 'noir-interface', label: '느와르 인터페이스', en: 'NOIR INTERFACE', x: 24, y: 38, orbit: 1, tone: 'blue', signals: 5, keywords: ['느와르', '기억', '탐정'], questions: ['기억이 조작될 수 있다면 진실은 어디에 남는가?'], concepts: ['기억', '정체성'] },
    ],
    connections: [['cyberpunk', 'megacity'], ['cyberpunk', 'cybernetics'], ['cyberpunk', 'net-hacker'], ['cyberpunk', 'ai-corporation'], ['cyberpunk', 'noir-interface'], ['cybernetics', 'posthuman'], ['ai-corporation', 'dystopia'], ['net-hacker', 'posthuman']],
  },
  dystopia: {
    description: '디스토피아는 미래를 예언하기보다 현재의 통제, 감시, 불평등을 극단화해 읽게 합니다.',
    nodes: [
      { id: 'surveillance-state', label: '감시국가', en: 'SURVEILLANCE', x: 50, y: 18, orbit: 2, tone: 'blue', signals: 8, keywords: ['감시', '통제', '국가'], questions: ['감시는 안전의 언어로 어떻게 정당화되는가?'], concepts: ['감시사회'] },
      { id: 'totalitarian-order', label: '전체주의 질서', en: 'TOTAL ORDER', x: 76, y: 38, orbit: 2, tone: 'amber', signals: 7, keywords: ['전체주의', '검열', '권력'], questions: ['언어와 기억의 통제는 어떻게 현실을 바꾸는가?'], concepts: ['전체주의', '검열'] },
      { id: 'class-divide', label: '계급 격차', en: 'CLASS DIVIDE', x: 66, y: 75, orbit: 1, tone: 'cyan', signals: 6, keywords: ['계급', '불평등', '빈곤'], questions: ['미래 사회의 기술은 격차를 줄이는가 확대하는가?'], concepts: ['불평등'] },
      { id: 'memory-control', label: '기억 통제', en: 'MEMORY CONTROL', x: 34, y: 75, orbit: 2, tone: 'blue', signals: 5, keywords: ['기억', '조작', '기록'], questions: ['기억을 잃은 사회는 저항할 수 있는가?'], concepts: ['기억', '기록'] },
      { id: 'resistance-cell', label: '저항 조직', en: 'RESISTANCE', x: 24, y: 38, orbit: 1, tone: 'cyan', signals: 5, keywords: ['저항', '혁명', '탈출'], questions: ['저항은 개인의 윤리인가, 공동체의 전략인가?'], concepts: ['저항', '공동체'] },
    ],
    connections: [['dystopia', 'surveillance-state'], ['dystopia', 'totalitarian-order'], ['dystopia', 'class-divide'], ['dystopia', 'memory-control'], ['dystopia', 'resistance-cell'], ['surveillance-state', 'cyberpunk'], ['class-divide', 'apocalypse'], ['memory-control', 'time-travel']],
  },
  apocalypse: {
    description: '아포칼립스 좌표는 세계가 무너지는 장면보다, 붕괴 이후 어떤 질서와 공동체가 다시 태어나는지를 추적합니다.',
    nodes: [
      { id: 'climate-collapse', label: '기후 재난', en: 'CLIMATE COLLAPSE', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 7, keywords: ['기후', '환경', '재난'], questions: ['기후 위기는 자연재해인가, 사회 시스템의 실패인가?'], concepts: ['기후위기'] },
      { id: 'pandemic-sf', label: '팬데믹 SF', en: 'PANDEMIC SF', x: 76, y: 38, orbit: 1, tone: 'blue', signals: 6, keywords: ['팬데믹', '감염', '바이러스'], questions: ['감염 서사는 타자에 대한 공포를 어떻게 드러내는가?'], concepts: ['팬데믹'] },
      { id: 'post-collapse', label: '붕괴 이후', en: 'POST-COLLAPSE', x: 66, y: 75, orbit: 3, tone: 'amber', signals: 9, keywords: ['종말', '생존', '폐허'], questions: ['무너진 세계에서 가장 먼저 다시 만들어지는 규칙은 무엇인가?'], concepts: ['생존'] },
      { id: 'resource-war', label: '자원 전쟁', en: 'RESOURCE WAR', x: 34, y: 75, orbit: 2, tone: 'amber', signals: 5, keywords: ['자원', '전쟁', '식량'], questions: ['부족한 자원은 윤리를 어떻게 시험하는가?'], concepts: ['자원', '전쟁'] },
      { id: 'survival-community', label: '생존 공동체', en: 'SURVIVAL COMMUNITY', x: 24, y: 38, orbit: 2, tone: 'cyan', signals: 8, keywords: ['생존', '공동체', '연대'], questions: ['생존은 개인의 능력인가, 공동체의 구조인가?'], concepts: ['연대'] },
    ],
    connections: [['apocalypse', 'climate-collapse'], ['apocalypse', 'pandemic-sf'], ['apocalypse', 'post-collapse'], ['apocalypse', 'resource-war'], ['apocalypse', 'survival-community'], ['climate-collapse', 'eco-sf'], ['resource-war', 'dystopia'], ['survival-community', 'posthuman']],
  },
  posthuman: {
    description: '포스트휴먼은 인간의 몸, 의식, 관계가 기술과 비인간 존재를 통해 재정의되는 좌표입니다.',
    nodes: [
      { id: 'body-augmentation', label: '신체 확장', en: 'BODY AUGMENT', x: 50, y: 18, orbit: 2, tone: 'amber', signals: 7, keywords: ['신체', '확장', '개조'], questions: ['확장된 몸은 더 자유로운 몸인가?'], concepts: ['신체성'] },
      { id: 'mind-upload', label: '의식 업로드', en: 'MIND UPLOAD', x: 76, y: 38, orbit: 2, tone: 'blue', signals: 6, keywords: ['의식', '업로드', '기억'], questions: ['복제된 의식은 같은 사람인가?'], concepts: ['의식', '정체성'] },
      { id: 'synthetic-life', label: '인공생명', en: 'SYNTHETIC LIFE', x: 66, y: 75, orbit: 3, tone: 'cyan', signals: 7, keywords: ['인공생명', '로봇', '안드로이드'], questions: ['만들어진 생명은 어떤 권리를 갖는가?'], concepts: ['인공생명'] },
      { id: 'human-animal', label: '인간-동물 경계', en: 'HUMAN ANIMAL', x: 34, y: 75, orbit: 1, tone: 'amber', signals: 5, keywords: ['동물', '비인간', '공생'], questions: ['비인간과의 관계는 인간성을 어떻게 바꾸는가?'], concepts: ['비인간'] },
      { id: 'collective-mind', label: '집합 의식', en: 'COLLECTIVE MIND', x: 24, y: 38, orbit: 2, tone: 'blue', signals: 5, keywords: ['집합', '의식', '네트워크'], questions: ['개별 자아가 연결될 때 책임은 어디에 있는가?'], concepts: ['네트워크', '의식'] },
    ],
    connections: [['posthuman', 'body-augmentation'], ['posthuman', 'mind-upload'], ['posthuman', 'synthetic-life'], ['posthuman', 'human-animal'], ['posthuman', 'collective-mind'], ['synthetic-life', 'cyberpunk'], ['human-animal', 'eco-sf'], ['collective-mind', 'cyberpunk']],
  },
  'time-travel': {
    description: '시간여행은 과거와 미래의 이동보다, 선택과 책임의 구조를 다시 묻는 장르 좌표입니다.',
    nodes: [
      { id: 'time-loop', label: '타임 루프', en: 'TIME LOOP', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 7, keywords: ['루프', '반복', '시간'], questions: ['반복되는 시간은 구원인가 감옥인가?'], concepts: ['루프'] },
      { id: 'alternate-history', label: '대체역사', en: 'ALT HISTORY', x: 76, y: 38, orbit: 2, tone: 'amber', signals: 6, keywords: ['대체역사', '역사', '분기'], questions: ['다른 역사는 현재의 책임을 어떻게 묻는가?'], concepts: ['역사'] },
      { id: 'parallel-world', label: '평행세계', en: 'PARALLEL WORLD', x: 66, y: 75, orbit: 3, tone: 'blue', signals: 7, keywords: ['평행세계', '멀티버스'], questions: ['다른 내가 존재한다면 자아는 하나인가?'], concepts: ['멀티버스'] },
      { id: 'causal-paradox', label: '인과 역설', en: 'CAUSAL PARADOX', x: 34, y: 75, orbit: 1, tone: 'cyan', signals: 6, keywords: ['인과', '역설', '패러독스'], questions: ['원인과 결과가 뒤엉키면 책임도 뒤엉키는가?'], concepts: ['인과율'] },
      { id: 'temporal-memory', label: '시간과 기억', en: 'TEMPORAL MEMORY', x: 24, y: 38, orbit: 2, tone: 'amber', signals: 5, keywords: ['기억', '시간', '상실'], questions: ['시간을 바꾸는 것은 기억을 바꾸는 일인가?'], concepts: ['기억'] },
    ],
    connections: [['time-travel', 'time-loop'], ['time-travel', 'alternate-history'], ['time-travel', 'parallel-world'], ['time-travel', 'causal-paradox'], ['time-travel', 'temporal-memory'], ['alternate-history', 'dystopia'], ['parallel-world', 'simulation'], ['temporal-memory', 'cyberpunk']],
  },
  'eco-sf': {
    description: '생태 SF는 인간 중심의 미래 대신, 기후와 비인간 존재, 공생 관계가 만드는 세계를 탐사합니다.',
    nodes: [
      { id: 'climate-fiction', label: '기후소설', en: 'CLI-FI', x: 50, y: 18, orbit: 2, tone: 'cyan', signals: 8, keywords: ['기후', '환경', '온실'], questions: ['기후 위기는 어떤 서사 형식을 요구하는가?'], concepts: ['기후위기'] },
      { id: 'animal-sentience', label: '동물 지성', en: 'ANIMAL SENTIENCE', x: 76, y: 38, orbit: 1, tone: 'amber', signals: 5, keywords: ['동물', '지성', '비인간'], questions: ['동물이 말할 수 있다면 인간 사회는 어떻게 달라지는가?'], concepts: ['비인간'] },
      { id: 'plant-network', label: '식물 네트워크', en: 'PLANT NETWORK', x: 66, y: 75, orbit: 2, tone: 'cyan', signals: 5, keywords: ['식물', '네트워크', '숲'], questions: ['느린 생명의 시간은 인간의 속도를 어떻게 바꾸는가?'], concepts: ['네트워크'] },
      { id: 'symbiosis', label: '공생 사회', en: 'SYMBIOSIS', x: 34, y: 75, orbit: 3, tone: 'blue', signals: 7, keywords: ['공생', '관계', '생명'], questions: ['공생은 선택인가 생존 조건인가?'], concepts: ['공생'] },
      { id: 'terraforming-ethics', label: '테라포밍 윤리', en: 'TERRAFORMING ETHICS', x: 24, y: 38, orbit: 2, tone: 'amber', signals: 6, keywords: ['테라포밍', '행성', '윤리'], questions: ['다른 행성을 바꾸는 권리는 누구에게 있는가?'], concepts: ['테라포밍'] },
    ],
    connections: [['eco-sf', 'climate-fiction'], ['eco-sf', 'animal-sentience'], ['eco-sf', 'plant-network'], ['eco-sf', 'symbiosis'], ['eco-sf', 'terraforming-ethics'], ['climate-fiction', 'apocalypse'], ['terraforming-ethics', 'hard-sf'], ['animal-sentience', 'posthuman']],
  },
};

const externalNodeSlots = [
  { x: 13, y: 17 },
  { x: 87, y: 17 },
  { x: 89, y: 84 },
  { x: 11, y: 84 },
  { x: 50, y: 92 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function findRelatedWorksForNode(node, works) {
  const keywords = [node.label, node.en, ...(node.keywords ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  const scoredWorks = works
    .map(work => {
      const searchText = getWorkSearchText(work);
      const score = keywords.reduce((total, keyword) => (
        searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword)
          ? total + 1
          : total
      ), 0);
      return { work, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredWorks.map(item => item.work).slice(0, 5);
}

function findRelatedConceptsForNode(node, concepts) {
  const keywords = [node.label, node.en, ...(node.keywords ?? []), ...(node.concepts ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  return concepts
    .filter(concept => {
      const searchText = [
        concept.term,
        concept.english,
        concept.category,
        concept.summary,
        ...(concept.keywords ?? []),
      ].filter(Boolean).join(' ').toLowerCase();

      return keywords.some(keyword => searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword));
    })
    .slice(0, 4);
}

export default function useCoordinateMap({ concepts, setDashboard, works }) {
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [selectedCoordinateId, setSelectedCoordinateId] = useState('');
  const [mapView, setMapView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [coordinateLogUrl, setCoordinateLogUrl] = useState('');
  const [coordinateLogStatus, setCoordinateLogStatus] = useState('idle');
  const [coordinateLogMessage, setCoordinateLogMessage] = useState('');

  const activeGenre = activeGenreId ? genreNodes.find(node => node.id === activeGenreId) : null;
  const activeSubmap = activeGenreId ? genreSubmaps[activeGenreId] : null;
  const activeSubmapNodeIds = new Set(activeSubmap?.nodes.map(node => node.id) ?? []);
  const submapExternalNodes = activeSubmap
    ? [...new Set((activeSubmap.connections ?? []).flat())]
      .filter(id => id !== activeGenreId && !activeSubmapNodeIds.has(id))
      .map((id, index) => {
        const linkedGenre = genreNodes.find(node => node.id === id);
        if (!linkedGenre) return null;
        return {
          ...linkedGenre,
          ...externalNodeSlots[index % externalNodeSlots.length],
          orbit: Math.max(1, linkedGenre.orbit - 1),
          external: true,
        };
      })
      .filter(Boolean)
    : [];
  const visibleNodes = activeSubmap
    ? [...activeSubmap.nodes, ...submapExternalNodes]
    : [sfCoreNode, ...genreNodes];
  const visibleConnections = activeSubmap
    ? activeSubmap.connections ?? activeSubmap.nodes.map(node => [activeGenreId, node.id])
    : mapConnections;
  const mapPositions = activeSubmap && activeGenre
    ? [{ ...activeGenre, x: 50, y: 50, orbit: 5 }, ...visibleNodes]
    : visibleNodes;
  const selectedCoordinate = mapPositions.find(node => node.id === selectedCoordinateId) ?? activeGenre ?? sfCoreNode;
  const selectedCoordinateConnections = selectedCoordinateId
    ? visibleConnections.filter(([from, to]) => from === selectedCoordinateId || to === selectedCoordinateId)
    : [];
  const relatedCoordinateIds = new Set(selectedCoordinateConnections.flat());
  const hasCoordinateFocus = Boolean(selectedCoordinateId);
  const selectedCoordinateWorks = findRelatedWorksForNode(selectedCoordinate, works);
  const selectedCoordinateConcepts = findRelatedConceptsForNode(selectedCoordinate, concepts);
  const selectedCoordinateQuestions = selectedCoordinate.questions?.length
    ? selectedCoordinate.questions
    : ['이 좌표는 어떤 인간 이후의 조건을 상상하게 만드는가?'];
  const mapDescription = activeSubmap?.description
    ?? '탐사 좌표는 SF를 중심으로 8개의 하위 장르를 배치합니다. 각 장르는 독립된 행성이면서도 서로 다른 장르와 연결되어 새로운 질문의 항로를 만듭니다.';
  const minimapViewportWidth = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewportHeight = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewport = {
    width: minimapViewportWidth,
    height: minimapViewportHeight,
    x: clamp(50 + (mapView.yaw * 5) - minimapViewportWidth / 2, 4, 96 - minimapViewportWidth),
    y: clamp(50 + (mapView.pitch * 14) - minimapViewportHeight / 2, 4, 96 - minimapViewportHeight),
  };

  const resetCoordinateMap = () => {
    setActiveGenreId(null);
    setSelectedCoordinateId('');
    setMapView({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  };

  const handleGenreNodeClick = node => {
    if (node.id === sfCoreNode.id) {
      resetCoordinateMap();
      return;
    }

    if (node.id === selectedCoordinateId && !genreSubmaps[node.id]) {
      setSelectedCoordinateId('');
      return;
    }

    setSelectedCoordinateId(node.id);
    if (genreSubmaps[node.id]) {
      setActiveGenreId(node.id);
    }
  };

  const openCoordinateLogModal = () => {
    if (!selectedCoordinateId) return;
    setCoordinateLogUrl('');
    setCoordinateLogStatus('idle');
    setCoordinateLogMessage('');
    setIsLogModalOpen(true);
  };

  const submitCoordinateLog = async event => {
    event.preventDefault();
    if (!coordinateLogUrl.trim()) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage('인스타 서평 주소를 입력해주세요.');
      return;
    }

    setCoordinateLogStatus('submitting');
    setCoordinateLogMessage('');

    try {
      const response = await fetch('/api/exploration-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramUrl: coordinateLogUrl,
          nodeId: selectedCoordinate.id,
          nodeLabel: selectedCoordinate.label,
          nodeEnglish: selectedCoordinate.en,
          workTitle: selectedCoordinate.label,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.notion?.message || data?.error || '탐사 로그 저장에 실패했습니다.');
      }

      setCoordinateLogStatus('success');
      setCoordinateLogMessage('탐사 로그가 노션에 저장되었습니다.');
      setDashboard(state => ({
        ...state,
        logs: data.log ? [data.log, ...state.logs] : state.logs,
        status: { ...state.status, logs: true },
      }));
      setCoordinateLogUrl('');
    } catch (error) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage(error.message);
    }
  };

  return {
    activeGenre,
    coordinateLogMessage,
    coordinateLogStatus,
    coordinateLogUrl,
    handleGenreNodeClick,
    hasCoordinateFocus,
    isLogModalOpen,
    mapDescription,
    mapPositions,
    minimapViewport,
    openCoordinateLogModal,
    relatedCoordinateIds,
    resetCoordinateMap,
    selectedCoordinate,
    selectedCoordinateConcepts,
    selectedCoordinateId,
    selectedCoordinateQuestions,
    selectedCoordinateWorks,
    setCoordinateLogUrl,
    setIsLogModalOpen,
    setMapView,
    submitCoordinateLog,
    visibleConnections,
  };
}
