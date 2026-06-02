import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityToastContext } from './activityToastContextValue';

export function ActivityToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showActivityToast = useCallback((nextToast) => {
    setToast({
      detail: nextToast.detail ?? '',
      id: Date.now(),
      points: nextToast.points ?? 0,
      title: nextToast.title ?? '탐사 신호 수신',
    });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timerId = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const value = useMemo(() => ({ showActivityToast }), [showActivityToast]);

  return (
    <ActivityToastContext.Provider value={value}>
      {children}
      {toast && (
        <aside className="activity-toast" role="status" aria-live="polite">
          <span className="mono">MISSION FEEDBACK</span>
          <strong>{toast.title}</strong>
          <p>{toast.detail || (toast.points ? `+${toast.points} MP 수신` : '활동 기록이 갱신되었습니다.')}</p>
          {toast.points > 0 && <em>+{toast.points} MP</em>}
        </aside>
      )}
    </ActivityToastContext.Provider>
  );
}
