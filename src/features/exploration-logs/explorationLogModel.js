import { normalizeExplorationTags } from './explorationTagModel.js';

const VISIBILITY_VALUES = new Set([
  'PRIVATE_ARCHIVE',
  'ANON_NETWORK',
  'PUBLIC_SIGNAL',
]);

const SPOILER_VALUES = new Set(['CLEAR_SIGNAL', 'CLASSIFIED_SIGNAL']);

const EXPERIENCE_KEYS = [
  'immersion',
  'addiction',
  'complexity',
  'visual',
  'derealization',
  'scale',
];

function requireText(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be text.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${fieldName} must be between 1 and ${maxLength} characters.`);
  }

  return normalized;
}

function normalizeExperiences(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('experiences must be an object.');
  }

  const normalized = {};
  EXPERIENCE_KEYS.forEach(key => {
    const score = value[key];
    if (score == null) return;
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`experiences.${key} must be a number from 0 to 100.`);
    }
    normalized[key] = score;
  });

  return normalized;
}

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeExplorationLogInput(input) {
  const requestedVisibility = input?.visibility ?? 'PRIVATE_ARCHIVE';
  if (!VISIBILITY_VALUES.has(requestedVisibility)) {
    throw new Error('visibility must be PRIVATE_ARCHIVE, ANON_NETWORK, or PUBLIC_SIGNAL.');
  }

  const spoiler = input?.spoiler ?? 'CLEAR_SIGNAL';
  if (!SPOILER_VALUES.has(spoiler)) {
    throw new Error('spoiler must be CLEAR_SIGNAL or CLASSIFIED_SIGNAL.');
  }

  const memo = requireText(input?.memo, 'memo', 10000);

  return {
    title: requireText(input?.title, 'title', 240),
    logType: requireText(input?.logType || input?.type || '감상 기록', 'logType', 120),
    experiences: normalizeExperiences(input?.experiences),
    emotions: normalizeExplorationTags(input?.emotions ?? [], '느낀 감정'),
    ideas: normalizeExplorationTags(input?.ideas ?? [], '남은 생각'),
    memo,
    visibility: 'PRIVATE_ARCHIVE',
    spoiler,
  };
}

export function stableLegacySourceId(sourceKey, legacyLog) {
  const key = requireText(sourceKey, 'sourceKey', 120);
  const legacyId = typeof legacyLog?.id === 'string' ? legacyLog.id.trim() : '';
  const fallback = JSON.stringify({
    title: legacyLog?.title ?? '',
    type: legacyLog?.type ?? '',
    memo: legacyLog?.memo ?? '',
    timestamp: legacyLog?.timestamp ?? '',
  });

  return `${key}:${legacyId || hashText(fallback)}`;
}

export const EXPLORATION_LOG_VISIBILITY = [...VISIBILITY_VALUES];
