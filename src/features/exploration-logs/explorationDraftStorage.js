import { getJsonStorageItem, removeStorageItem, setJsonStorageItem } from '../../lib/browserStorage.js';

const LEGACY_DRAFT_KEY = 'sf_exploration_log_draft_v1';
const DRAFT_KEY_PREFIX = 'sf_exploration_log_draft_v2';

function draftKey(userId) {
  return userId ? `${DRAFT_KEY_PREFIX}:user:${userId}` : `${DRAFT_KEY_PREFIX}:anonymous`;
}

function pendingDraftsKey(userId) {
  return `${draftKey(userId)}:pending`;
}

function draftTransactionKey(userId) {
  return `${draftKey(userId)}:transaction`;
}

function hasDraftContent(draft) {
  return Boolean(draft && Object.keys(draft).length > 0);
}

export function readExplorationDraft(userId = null) {
  const scopedKey = draftKey(userId);
  const scopedDraft = getJsonStorageItem(scopedKey, {});

  const anonymousKey = draftKey(null);
  const anonymousDraft = getJsonStorageItem(anonymousKey, {});
  const legacyDraft = hasDraftContent(anonymousDraft)
    ? {}
    : getJsonStorageItem(LEGACY_DRAFT_KEY, {});
  const migratableDraft = hasDraftContent(anonymousDraft) ? anonymousDraft : legacyDraft;

  if (!hasDraftContent(migratableDraft)) return scopedDraft;

  if (userId && hasDraftContent(scopedDraft)) {
    const pendingDrafts = getJsonStorageItem(pendingDraftsKey(userId), []);
    const preserved = setJsonStorageItem(
      pendingDraftsKey(userId),
      [...(Array.isArray(pendingDrafts) ? pendingDrafts : []), migratableDraft],
    );
    if (preserved) {
      removeStorageItem(anonymousKey);
      removeStorageItem(LEGACY_DRAFT_KEY);
    }
    return scopedDraft;
  }

  const claimed = setJsonStorageItem(scopedKey, migratableDraft);
  if (claimed) {
    if (userId) removeStorageItem(anonymousKey);
    removeStorageItem(LEGACY_DRAFT_KEY);
  }
  return migratableDraft;
}

export function writeExplorationDraft(draft, userId = null) {
  return setJsonStorageItem(draftKey(userId), draft);
}

export function clearExplorationDraft(userId = null) {
  if (!userId) return removeStorageItem(draftKey(userId));

  const pendingKey = pendingDraftsKey(userId);
  const pendingDrafts = getJsonStorageItem(pendingKey, []);
  if (!Array.isArray(pendingDrafts) || !hasDraftContent(pendingDrafts[0])) {
    return removeStorageItem(draftKey(userId));
  }

  const [nextDraft, ...remainingDrafts] = pendingDrafts;
  if (!setJsonStorageItem(draftKey(userId), nextDraft)) return false;
  if (remainingDrafts.length > 0) setJsonStorageItem(pendingKey, remainingDrafts);
  else removeStorageItem(pendingKey);
  return true;
}

export function readPendingExplorationDraft(userId) {
  if (!userId) return {};
  const pendingDrafts = getJsonStorageItem(pendingDraftsKey(userId), []);
  return Array.isArray(pendingDrafts) && hasDraftContent(pendingDrafts[0])
    ? pendingDrafts[0]
    : {};
}

export function activatePendingExplorationDraft(userId) {
  if (!userId) return {};
  const key = draftKey(userId);
  const pendingKey = pendingDraftsKey(userId);
  const currentDraft = getJsonStorageItem(key, {});
  const pendingDrafts = getJsonStorageItem(pendingKey, []);
  if (!Array.isArray(pendingDrafts) || !hasDraftContent(pendingDrafts[0])) return currentDraft;

  const [nextDraft, ...remainingDrafts] = pendingDrafts;
  const nextPendingDrafts = hasDraftContent(currentDraft)
    ? [...remainingDrafts, currentDraft]
    : remainingDrafts;

  const transactionKey = draftTransactionKey(userId);
  const transaction = { currentDraft, pendingDrafts };
  if (!setJsonStorageItem(transactionKey, transaction)) return currentDraft;

  const pendingUpdated = nextPendingDrafts.length > 0
    ? setJsonStorageItem(pendingKey, nextPendingDrafts)
    : removeStorageItem(pendingKey);
  if (!pendingUpdated) {
    removeStorageItem(transactionKey);
    return currentDraft;
  }

  if (!setJsonStorageItem(key, nextDraft)) {
    const queueRestored = setJsonStorageItem(pendingKey, pendingDrafts);
    if (queueRestored) removeStorageItem(transactionKey);
    return currentDraft;
  }

  removeStorageItem(transactionKey);
  return nextDraft;
}

export function getExplorationDraftStorageKey(userId = null) {
  return draftKey(userId);
}

export function selectExplorationDraft({
  routeDraft = {},
  routeDraftOwnerId = null,
  storedDraft = {},
  userId = null,
} = {}) {
  if (hasDraftContent(storedDraft)) return storedDraft;
  if (!userId || routeDraftOwnerId === userId) return routeDraft;
  return {};
}
