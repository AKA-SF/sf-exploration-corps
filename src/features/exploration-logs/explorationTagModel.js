export const MAX_EXPLORATION_TAGS = 3;
export const MAX_EXPLORATION_TAG_LENGTH = 12;

export const EMOTION_TAGS = [
  '경이로움',
  '낯섦',
  '불안함',
  '먹먹함',
  '쓸쓸함',
  '압도감',
  '섬뜩함',
  '희망',
];

export const IDEA_TAGS = [
  '인간다움',
  '기술과 윤리',
  '기억과 정체성',
  '타자와 공존',
  '사회와 권력',
  '생태와 미래',
  '세계의 규칙',
  '미래의 일상',
];

function normalizeTag(value, fieldName = '태그') {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName}는 글자로 입력해주세요.`);
  }

  const normalized = value
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) throw new Error(`${fieldName}를 입력해주세요.`);
  if (normalized.length > MAX_EXPLORATION_TAG_LENGTH) {
    throw new Error(`${fieldName}는 12자 이하로 입력해주세요.`);
  }
  return normalized;
}

function comparableTag(value) {
  return value.toLocaleLowerCase('ko-KR');
}

export function normalizeExplorationTags(value, fieldName = '태그') {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${fieldName}는 글자 목록이어야 합니다.`);
  }

  const seen = new Set();
  const normalized = [];
  value.forEach(item => {
    const tag = normalizeTag(item, fieldName);
    const comparable = comparableTag(tag);
    if (seen.has(comparable)) return;
    seen.add(comparable);
    normalized.push(tag);
  });

  if (normalized.length > MAX_EXPLORATION_TAGS) {
    throw new Error(`${fieldName}는 최대 3개까지 선택할 수 있습니다.`);
  }
  return normalized;
}

export function normalizeCustomExplorationTag(value) {
  const tag = normalizeTag(value, '직접 입력');
  if (/\s/.test(tag)) {
    throw new Error('직접 입력은 공백 없이 한 단어로 적어주세요.');
  }
  return tag;
}

export function addExplorationTag(values, value, { custom = false } = {}) {
  const currentValues = normalizeExplorationTags(values ?? []);
  const tag = custom ? normalizeCustomExplorationTag(value) : normalizeTag(value);
  if (currentValues.some(item => comparableTag(item) === comparableTag(tag))) {
    return { reason: 'duplicate', values: currentValues };
  }
  if (currentValues.length >= MAX_EXPLORATION_TAGS) {
    return { reason: 'limit', values: currentValues };
  }
  return { reason: 'added', values: [...currentValues, tag] };
}
