import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/getSupabaseClient';
import { createExplorationLogRepository } from './explorationLogRepository';

export function useVisibleExplorationLogs(limit = 80) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const client = await getSupabaseClient();
        const result = client
          ? await createExplorationLogRepository(client).listVisibleExplorationLogs({ limit })
          : [];
        if (isMounted) setLogs(result);
      } catch {
        if (isMounted) setLogs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [limit]);

  return { logs, loading };
}
