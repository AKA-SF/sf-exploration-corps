import { useEffect, useState } from 'react';
import { createExplorationLogRepository } from '../../../features/exploration-logs/explorationLogRepository';
import { getSupabaseClient } from '../../../lib/getSupabaseClient';

const initialState = {
  error: '',
  loadedUserId: null,
  logs: [],
  status: 'idle',
};

export function useOwnExplorationLogs(user) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadLogs() {
      try {
        const client = await getSupabaseClient();
        if (!client) throw new Error('Supabase 연결 정보를 찾지 못했습니다.');
        const logs = await createExplorationLogRepository(client).listOwnExplorationLogs({
          userId: user.id,
          limit: 12,
        });
        if (isMounted) {
          setState({ error: '', loadedUserId: user.id, logs, status: 'ready' });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            error: error instanceof Error ? error.message : '최근 기록을 불러오지 못했습니다.',
            loadedUserId: user.id,
            logs: [],
            status: 'error',
          });
        }
      }
    }

    void loadLogs();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const hasCurrentUserData = Boolean(user?.id && state.loadedUserId === user?.id);
  return {
    error: hasCurrentUserData ? state.error : '',
    logs: hasCurrentUserData ? state.logs : [],
    status: user?.id && !hasCurrentUserData ? 'loading' : state.status,
  };
}
