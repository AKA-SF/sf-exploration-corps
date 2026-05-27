import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  isConfigured: false,
  loading: false,
  session: null,
  user: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
