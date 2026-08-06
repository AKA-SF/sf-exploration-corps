import { createContext, useContext } from 'react';

export const AdminAccessContext = createContext(null);

export function useAdminAccess() {
  const value = useContext(AdminAccessContext);
  if (!value) throw new Error('useAdminAccess must be used inside AdminAccessBoundary');
  return value;
}
