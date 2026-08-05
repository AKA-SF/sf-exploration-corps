import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/getSupabaseClient';
import { createExplorationLogRepository } from './explorationLogRepository';

export function useVisibleExplorationLogs(limit = 80) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState({ limit, logs: [], status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const client = await getSupabaseClient();
        if (!client) {
          if (isMounted) setState({ limit, logs: [], status: 'unavailable' });
          return;
        }
        const result = await createExplorationLogRepository(client).listVisibleExplorationLogs({ limit });
        if (isMounted) setState({ limit, logs: result, status: 'ready' });
      } catch {
        if (isMounted) setState({ limit, logs: [], status: 'error' });
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [limit, requestVersion]);

  const currentState = state.limit === limit
    ? state
    : { limit, logs: [], status: 'loading' };
  const reload = () => {
    setState({ limit, logs: [], status: 'loading' });
    setRequestVersion(version => version + 1);
  };

  return {
    logs: currentState.logs,
    loading: currentState.status === 'loading',
    reload,
    status: currentState.status,
  };
}
