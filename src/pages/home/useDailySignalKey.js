import { useEffect, useState } from 'react';
import { getDailySignalKey, getNextDailySignalResetDelay } from './homeUtils';

export default function useDailySignalKey() {
  const [dailySignalKey, setDailySignalKey] = useState(() => getDailySignalKey());

  useEffect(() => {
    let timerId;

    function scheduleNextReset() {
      timerId = window.setTimeout(() => {
        setDailySignalKey(getDailySignalKey());
        scheduleNextReset();
      }, getNextDailySignalResetDelay());
    }

    scheduleNextReset();
    return () => window.clearTimeout(timerId);
  }, []);

  return dailySignalKey;
}
