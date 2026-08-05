import { normalizeExplorationLogInput } from './explorationLogModel.js';

function requireUserId(userId) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new Error('userId is required.');
  }

  return userId;
}

function requireClient(client) {
  if (!client?.from) {
    throw new Error('A Supabase client is required.');
  }

  return client;
}

function mapStoredExplorationLog(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    logType: row.log_type,
    experiences: row.experiences,
    emotions: row.emotions,
    ideas: row.ideas,
    memo: row.memo,
    visibility: row.visibility,
    spoiler: row.spoiler,
    legacySourceId: row.legacy_source_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVisibleExplorationLog(row) {
  return {
    id: row.id,
    title: row.title,
    logType: row.log_type,
    experiences: row.experiences,
    emotions: row.emotions,
    ideas: row.ideas,
    memo: row.memo,
    visibility: row.visibility,
    nickname: row.nickname,
    spoiler: row.spoiler ?? 'CLEAR_SIGNAL',
    createdAt: row.created_at,
  };
}

function throwIfError(error) {
  if (error) throw error;
}

export function createExplorationLogRepository(client) {
  const supabase = requireClient(client);

  return {
    async listVisibleExplorationLogs({ limit = 80 } = {}) {
      const { data, error } = await supabase.rpc('get_visible_exploration_logs', { p_limit: limit });
      throwIfError(error);
      return (data ?? []).map(mapVisibleExplorationLog);
    },

    async getVisibleExplorationLog({ id }) {
      if (typeof id !== 'string' || !id.trim()) return null;
      const { data, error } = await supabase.rpc('get_visible_exploration_log_detail', { p_id: id });
      throwIfError(error);
      return data?.[0] ? mapVisibleExplorationLog(data[0]) : null;
    },

    async listOwnExplorationLogs({ userId, limit = 100 }) {
      const safeUserId = requireUserId(userId);
      const { data, error } = await supabase
        .from('exploration_logs')
        .select('*')
        .eq('user_id', safeUserId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

      throwIfError(error);
      return (data ?? []).map(mapStoredExplorationLog);
    },

    async createExplorationLog({ userId, submissionId, input }) {
      const safeUserId = requireUserId(userId);
      if (typeof submissionId !== 'string' || !submissionId.trim()) {
        throw new Error('submissionId is required.');
      }
      const normalized = normalizeExplorationLogInput(input);
      const { data, error } = await supabase
        .from('exploration_logs')
        .insert({
          user_id: safeUserId,
          title: normalized.title,
          log_type: normalized.logType,
          experiences: normalized.experiences,
          emotions: normalized.emotions,
          ideas: normalized.ideas,
          memo: normalized.memo,
          visibility: normalized.visibility,
          spoiler: normalized.spoiler,
          client_submission_id: submissionId,
        })
        .select('*')
        .single();

      if (error?.code === '23505') {
        const { data: existing, error: lookupError } = await supabase
          .from('exploration_logs')
          .select('*')
          .eq('user_id', safeUserId)
          .eq('client_submission_id', submissionId)
          .single();
        throwIfError(lookupError);
        return mapStoredExplorationLog(existing);
      }

      throwIfError(error);
      return mapStoredExplorationLog(data);
    },

    async getOwnExplorationLog({ userId, id }) {
      const safeUserId = requireUserId(userId);
      if (typeof id !== 'string' || !id.trim()) return null;

      const { data, error } = await supabase
        .from('exploration_logs')
        .select('*')
        .eq('id', id)
        .eq('user_id', safeUserId)
        .maybeSingle();

      throwIfError(error);
      return data ? mapStoredExplorationLog(data) : null;
    },
  };
}
