import { createContext, useContext } from 'react';

export const ActivityToastContext = createContext({
  showActivityToast: () => {},
});

export function useActivityToast() {
  return useContext(ActivityToastContext);
}
