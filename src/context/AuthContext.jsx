import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './authContextValue';
import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { recordDailyLoginBonus } from '../lib/activityLogger';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const supabaseRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;
    let authSubscription;

    import('../lib/supabaseClient').then(({ supabase }) => {
      if (!isMounted) return;
      if (!supabase) {
        setLoading(false);
        return;
      }
      supabaseRef.current = supabase;

      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      });
      authSubscription = listener.subscription;
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
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
      const client = supabaseRef.current ?? (await import('../lib/supabaseClient')).supabase;
      if (client) await client.auth.signOut();
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
