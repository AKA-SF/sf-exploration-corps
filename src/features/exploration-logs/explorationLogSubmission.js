export async function submitExplorationLog({ repository, userId, submissionId, input }) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new Error('Sign in is required before saving an exploration log.');
  }

  if (!repository?.createExplorationLog) {
    throw new Error('An exploration log repository is required.');
  }

  if (typeof submissionId !== 'string' || !submissionId.trim()) {
    throw new Error('submissionId is required for idempotent saving.');
  }

  return repository.createExplorationLog({ userId, submissionId, input });
}
