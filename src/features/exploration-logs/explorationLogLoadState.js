export function getExplorationLogRecordKey(userId, recordId) {
  return `${userId || 'anonymous'}:${recordId || ''}`;
}

export function getCurrentExplorationLogLoadState({ authLoading, userId, recordId, loadedKey, loadState }) {
  if (authLoading) return 'loading';
  if (!userId) return 'unauthorized';
  return loadedKey === getExplorationLogRecordKey(userId, recordId) ? loadState : 'loading';
}
