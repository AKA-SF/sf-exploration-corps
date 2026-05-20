export const SF_SECTORS = [
  { id: 'cyberpunk', name: '사이버펑크', en: 'CYBERPUNK', x: 600, y: 500, profileX: 20, profileY: 28, risk: 80 },
  { id: 'newwave', name: '뉴웨이브', en: 'NEW WAVE', x: 1200, y: 300, profileX: 44, profileY: 18, risk: 60 },
  { id: 'hard', name: '하드SF', en: 'HARD SF', x: 1800, y: 500, profileX: 66, profileY: 28, risk: 40 },
  { id: 'spaceopera', name: '우주오페라', en: 'SPACE OPERA', x: 800, y: 1100, profileX: 30, profileY: 58, risk: 30 },
  { id: 'dystopia', name: '디스토피아', en: 'DYSTOPIA', x: 1600, y: 1000, profileX: 62, profileY: 56, risk: 90 },
  { id: 'posthuman', name: '포스트휴먼', en: 'POST-HUMAN', x: 2200, y: 700, profileX: 78, profileY: 38, risk: 85 },
  { id: 'ai', name: 'AI SF', en: 'A.I', x: 500, y: 1500, profileX: 18, profileY: 78, risk: 75 },
  { id: 'timetravel', name: '시간여행', en: 'TIME TRAVEL', x: 2000, y: 1400, profileX: 70, profileY: 78, risk: 65 },
  { id: 'biopunk', name: '바이오펑크', en: 'BIOPUNK', x: 1100, y: 1600, profileX: 42, profileY: 84, risk: 88 },
  { id: 'cosmic', name: '코즈믹 호러', en: 'COSMIC HORROR', x: 2400, y: 300, profileX: 88, profileY: 18, risk: 100 },
  { id: 'apocalypse', name: '아포칼립스', en: 'APOCALYPSE', x: 2600, y: 1100, profileX: 90, profileY: 62, risk: 95 },
  { id: 'eco', name: '생태 SF', en: 'ECO SF', x: 400, y: 900, profileX: 12, profileY: 52, risk: 50 },
];

export const MAP_SECTORS = SF_SECTORS.map(sector => ({ ...sector, works: [] }));

export const PROFILE_SECTORS = SF_SECTORS.map(sector => ({
  id: sector.id,
  name: sector.name,
  en: sector.en,
  x: sector.profileX,
  y: sector.profileY,
}));

export const ALADIN_QUERY_CHANNELS = [
  { query: 'SF', hint: null },
  { query: '과학소설', hint: null },
  { query: '사이언스 픽션', hint: null },
  { query: '사이버펑크', hint: '사이버펑크' },
  { query: '디스토피아', hint: '디스토피아' },
  { query: '우주 오페라', hint: '우주오페라' },
  { query: '하드 SF', hint: '하드SF' },
  { query: '인공지능 소설', hint: 'AI SF' },
  { query: '시간여행 소설', hint: '시간여행' },
  { query: '바이오펑크', hint: '바이오펑크' },
  { query: '포스트휴먼', hint: '포스트휴먼' },
  { query: '코즈믹 호러', hint: '코즈믹 호러' },
  { query: '러브크래프트', hint: '코즈믹 호러' },
  { query: '크툴루', hint: '코즈믹 호러' },
  { query: '아포칼립스 소설', hint: '아포칼립스' },
  { query: '기후 소설', hint: '생태 SF' },
  { query: '생태 SF', hint: '생태 SF' },
  { query: '테라포밍', hint: '생태 SF' },
];

export const GENRE_RULES = [
  { genre: 'AI SF', keywords: ['인공지능', '안드로이드', '로봇', 'ai', 'a.i', '자아', '기계인간', '튜링', '휴머노이드', '알고리즘'] },
  { genre: '사이버펑크', keywords: ['사이버펑크', '가상현실', '해커', '미래도시', '메타버스', '네트워크', '뉴로맨서', '스노 크래시', '블레이드 러너'] },
  { genre: '디스토피아', keywords: ['통제', '감시', '권력', '전체주의', '1984', '멋진 신세계', '시녀', '억압', '계급', '국가'] },
  { genre: '아포칼립스', keywords: ['멸망', '종말', '생존', '재난', '파괴', '폐허', '좀비', '포스트 아포칼립스', '대재앙', '멸종'] },
  { genre: '우주오페라', keywords: ['은하', '제국', '외계', '행성', '스페이스', '우주선', '우주 오페라', '듄', '하이페리온', '스타워즈'] },
  { genre: '하드SF', keywords: ['물리', '양자', '과학', '수학', '상대성', '중력', '우주비행', '궤도', '화성', '삼체', '엔지니어'] },
  { genre: '시간여행', keywords: ['시간여행', '타임머신', '타임 루프', '시간 루프', '과거', '미래에서', '시간 역설', '평행우주', '타임라인'] },
  { genre: '바이오펑크', keywords: ['바이오펑크', '생명공학', '유전자', 'dna', '바이러스', '돌연변이', '생체', '장기', '세포', '실험체'] },
  { genre: '코즈믹 호러', keywords: ['코즈믹', '우주적 공포', '러브크래프트', '크툴루', '심연', '광기', '미지의 존재', '기괴한 자연', '외우주'] },
  { genre: '생태 SF', keywords: ['기후', '환경', '생태', '자연', '오염', '지구', '테라포밍', '숲', '해양', '행성 생태계'] },
  { genre: '포스트휴먼', keywords: ['포스트휴먼', '진화', '개조', '사이보그', '인류', '클론', '복제', '초인', '신인류', '업로드'] },
  { genre: '뉴웨이브', keywords: ['철학', '심리', '내면', '사회', '젠더', '몽환', '르 귄', '어슐러', '문학적', '실험적'] },
];
