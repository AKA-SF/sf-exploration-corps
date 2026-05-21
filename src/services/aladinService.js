import { ALADIN_QUERY_CHANNELS, GENRE_RULES, SF_SECTORS } from '../data/sfTaxonomy';

const API_KEY = import.meta.env.VITE_ALADIN_TTB_KEY;
const USE_DEPLOY_PROXY = import.meta.env.PROD;

const SF_GENRE_NAMES = SF_SECTORS.map(sector => sector.name);

const EMOTION_TAGS = ['우울함', '압도감', '현실감 상실', '공포감', '외로움', '희망'];
const EXPERIENCE_TAGS = ['몰입감 높음', '난해함', '영상화 강함', '중독성', '상상력 폭발'];
const CONCEPT_TAGS = ['AI 의식', '기억 조작', '시뮬레이션 세계', '시간 역설', '인간 복제', '우주 고독'];

const FALLBACK_BOOKS = [
  {
    itemId: 'fallback-dune',
    isbn13: 'fallback-dune',
    title: 'Dune',
    author: 'Frank Herbert',
    publisher: 'Ace',
    cover: '',
    description: '은하 제국, 사막 행성, 예언과 생태계가 충돌하는 거대한 우주 오페라.',
    pubDate: '1965',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-neuromancer',
    isbn13: 'fallback-neuromancer',
    title: 'Neuromancer',
    author: 'William Gibson',
    publisher: 'Ace',
    cover: '',
    description: '해커, 가상현실, 인공지능, 미래도시가 얽힌 사이버펑크 네트워크.',
    pubDate: '1984',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-left-hand',
    isbn13: 'fallback-left-hand',
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    publisher: 'Ace',
    cover: '',
    description: '젠더, 사회, 외계 문명, 내면의 고독을 탐사하는 뉴웨이브 SF.',
    pubDate: '1969',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-three-body',
    isbn13: 'fallback-three-body',
    title: 'The Three-Body Problem',
    author: 'Liu Cixin',
    publisher: 'Chongqing Press',
    cover: '',
    description: '물리, 외계 문명, 우주 규모의 위협과 과학적 난제가 전개된다.',
    pubDate: '2008',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-kindred',
    isbn13: 'fallback-kindred',
    title: 'Kindred',
    author: 'Octavia E. Butler',
    publisher: 'Doubleday',
    cover: '',
    description: '시간여행과 역사적 폭력이 현실감 상실을 일으키는 위험한 탐사 기록.',
    pubDate: '1979',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-annihilation',
    isbn13: 'fallback-annihilation',
    title: 'Annihilation',
    author: 'Jeff VanderMeer',
    publisher: 'FSG',
    cover: '',
    description: '생태, 돌연변이, 기괴한 자연, 코즈믹 호러가 뒤섞인 오염 구역.',
    pubDate: '2014',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-snow-crash',
    isbn13: 'fallback-snow-crash',
    title: 'Snow Crash',
    author: 'Neal Stephenson',
    publisher: 'Bantam',
    cover: '',
    description: '메타버스, 해커, 언어 바이러스, 미래도시가 폭주하는 사이버펑크.',
    pubDate: '1992',
    categoryName: 'SF'
  },
  {
    itemId: 'fallback-hyperion',
    isbn13: 'fallback-hyperion',
    title: 'Hyperion',
    author: 'Dan Simmons',
    publisher: 'Doubleday',
    cover: '',
    description: '은하 순례, 시간 역설, 전쟁, 우주 고독이 결합한 심층 탐사 대상.',
    pubDate: '1989',
    categoryName: 'SF'
  }
];

const fallbackSFBooks = () => FALLBACK_BOOKS.map(transformToSFData);

const readAladinChannel = async (channel) => {
  const params = new URLSearchParams({
    Query: channel.query,
    QueryType: 'Keyword',
    MaxResults: '25',
    start: '1',
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
  });
  const url = USE_DEPLOY_PROXY
    ? `/api/aladin?${params.toString()}`
    : `/aladin-api/ItemSearch.aspx?ttbkey=${API_KEY}&${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API Network Error: ${response.status}`);

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const cleanedText = text.trim().replace(/;$/, '');
    return JSON.parse(cleanedText);
  }
};

// 시드 기반의 의사 난수 생성기 (일관된 결과 제공용)
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getRandomItems = (arr, count, seed) => {
  const result = [];
  const tempArr = [...arr];
  let currentSeed = seed;
  
  for (let i = 0; i < count; i++) {
    if (tempArr.length === 0) break;
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const index = Math.floor((currentSeed / 233280) * tempArr.length);
    result.push(tempArr.splice(index, 1)[0]);
  }
  return result;
};

const classifySFGenre = (book, seed) => {
  const textToAnalyze = [
    book.title,
    book.author,
    book.publisher,
    book.description,
    book.categoryName,
    book.__sourceQuery,
  ].filter(Boolean).join(' ').toLowerCase();

  const scored = GENRE_RULES.map(rule => {
    const matchedKeywords = rule.keywords.filter(kw => textToAnalyze.includes(kw.toLowerCase()));
    return {
      genre: rule.genre,
      score: matchedKeywords.reduce((sum, keyword) => sum + Math.max(1, Math.min(4, keyword.length / 2)), 0),
      matchedKeywords,
    };
  }).sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) {
    return {
      genre: scored[0].genre,
      confidence: Math.min(98, Math.round(55 + scored[0].score * 9)),
      matchedKeywords: scored[0].matchedKeywords.slice(0, 4),
      inferred: false,
    };
  }

  if (book.__genreHint) {
    return {
      genre: book.__genreHint,
      confidence: 64,
      matchedKeywords: [book.__sourceQuery || '탐사 채널'],
      inferred: true,
    };
  }

  const inferredGenre = SF_GENRE_NAMES[seed % SF_GENRE_NAMES.length];
  return {
    genre: inferredGenre,
    confidence: 36,
    matchedKeywords: ['탐사 추정'],
    inferred: true,
  };
};

// 책의 메타데이터를 SF 탐사 데이터로 변환
const transformToSFData = (book) => {
  const seed = hashString(book.isbn13 || book.title);
  const classification = classifySFGenre(book, seed);

  // 2. 태그 할당
  const emotions = getRandomItems(EMOTION_TAGS, 2, seed);
  const experiences = getRandomItems(EXPERIENCE_TAGS, 2, seed + 1);
  const concepts = getRandomItems(CONCEPT_TAGS, 2, seed + 2);
  
  // 3. 수치 파라미터 생성 (seed 기반으로 일관된 수치 유지)
  const getParam = (s, min = 40, max = 95) => {
    const rand = ((s * 9301 + 49297) % 233280) / 233280;
    return Math.floor(rand * (max - min)) + min;
  };

  const dangerLevel = getParam(seed, 30, 95);
  const complexity = getParam(seed + 1, 40, 90);
  const immersion = getParam(seed + 2, 60, 100);

  return {
    id: book.isbn13 || book.itemId,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    cover: (book.cover || '').replace('coversum', 'cover200'), // 고해상도 표지로 변경
    description: book.description || '이 데이터베이스에는 상세 기록이 손상되어 있습니다.',
    pubDate: book.pubDate,
    category: book.categoryName,
    
    // SF 탐사단 커스텀 데이터
    sfGenre: classification.genre,
    classification,
    tags: {
      emotions,
      experiences,
      concepts
    },
    metrics: {
      dangerLevel,
      complexity,
      immersion
    }
  };
};

export const fetchSFBooks = async () => {
  try {
    if (!API_KEY && !USE_DEPLOY_PROXY) {
      console.warn("Aladin API Key is missing. Using fallback SF signal data.");
      return {
        books: fallbackSFBooks(),
        source: 'fallback',
        status: 'missing-key',
        totalResults: 0,
        queryCount: 0,
      };
    }

    const collected = new Map();
    let totalResults = 0;
    const channelFailures = [];

    for (const channel of ALADIN_QUERY_CHANNELS) {
      let data;
      try {
        data = await readAladinChannel(channel);
      } catch (error) {
        channelFailures.push(`${channel.query}: ${error.message}`);
        continue;
      }

      if (data.totalResults) totalResults += Number(data.totalResults) || 0;
      if (Array.isArray(data.item)) {
        data.item.forEach(item => {
          const id = item.isbn13 || item.itemId || item.link || item.title;
          if (!id) return;
          if (!collected.has(id)) {
            collected.set(id, {
              ...item,
              __sourceQuery: channel.query,
              __genreHint: channel.hint,
            });
            return;
          }

          const existing = collected.get(id);
          if (!existing.__genreHint && channel.hint) {
            collected.set(id, {
              ...existing,
              __sourceQuery: channel.query,
              __genreHint: channel.hint,
            });
          }
        });
      }
    }

    if (collected.size === 0) {
      throw new Error('No items found or API Key invalid');
    }

    const processedBooks = [...collected.values()].map(transformToSFData);
    return {
      books: processedBooks,
      source: 'aladin',
      status: 'connected',
      totalResults,
      queryCount: ALADIN_QUERY_CHANNELS.length,
      error: channelFailures.length ? `${channelFailures.length} channels degraded` : undefined,
    };
  } catch (error) {
    console.error("Error fetching books:", error);
    return {
      books: fallbackSFBooks(),
      source: 'fallback',
      status: 'error',
      totalResults: 0,
      queryCount: 0,
      error: error.message,
    };
  }
};
