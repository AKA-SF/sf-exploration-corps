import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContextValue';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { recordDailyLoginBonus } from '../lib/activityLogger';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user) return;

    const todayKey = new Date().toLocaleDateString('sv-SE');
    const storageKey = `sf-daily-login-bonus:${user.id}:${todayKey}`;
    if (localStorage.getItem(storageKey)) return;

    recordDailyLoginBonus(user).then(result => {
      if (result?.ok) localStorage.setItem(storageKey, '1');
    });
  }, [session]);

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
