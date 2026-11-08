/**
 * Login state + cloud sync.
 *
 * - Signed in: your data is pulled from the cloud once, then every change
 *   is saved back (a couple of seconds later, batched).
 * - Your weekly points, streak and name are copied to your public profile
 *   so friends can see you on the leaderboard.
 * - Signing out clears the data on this phone.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { startOfWeek, todayKey } from '@/store/dates';
import { currentStreak, weekPoints } from '@/store/logic';
import { useStore } from '@/store/store';
import type { AppState } from '@/store/types';
import { shareRecentActivity } from './social';
import { cloudEnabled, db, supabase } from './supabase';

type Auth = {
  session: Session | null;
  /** True once we know whether you're signed in and your cloud data has been loaded */
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth>({ session: null, ready: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, dispatch, ready: storeReady } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(!cloudEnabled);
  const [pulledFor, setPulledFor] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  // Follow login / logout.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionKnown(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // After login: load your cloud data (or upload this phone's data the first time).
  useEffect(() => {
    if (!cloudEnabled || !storeReady || !userId || pulledFor === userId) return;
    (async () => {
      const { data, error } = await db().from('user_data').select('data').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data?.data) {
        dispatch({ type: 'load', state: data.data as AppState });
      } else {
        await db().from('user_data').upsert({ user_id: userId, data: state });
      }
      setPulledFor(userId);
    })().catch(() => setPulledFor(userId)); // offline: carry on with local data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeReady, userId, pulledFor]);

  // Save changes to the cloud, batched 2 seconds after the last change.
  const lastSaved = useRef<string>('');
  useEffect(() => {
    if (!cloudEnabled || !userId || pulledFor !== userId) return;
    const json = JSON.stringify(state);
    if (json === lastSaved.current) return;
    const timer = setTimeout(async () => {
      const today = todayKey();
      const [{ error }] = await Promise.all([
        db().from('user_data').upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() }),
        db()
          .from('profiles')
          .update({
            display_name: state.profile?.name || 'Athlete',
            week_start: startOfWeek(today),
            week_points: weekPoints(state),
            streak: currentStreak(state),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
      ]);
      if (!error) {
        lastSaved.current = json;
        shareRecentActivity(state).catch(() => {});
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, userId, pulledFor]);

  const signOut = async () => {
    await supabase?.auth.signOut();
    dispatch({ type: 'reset' });
    setPulledFor(null);
    lastSaved.current = '';
  };

  const ready = !cloudEnabled || (sessionKnown && (!userId || pulledFor === userId));

  return <AuthContext.Provider value={{ session, ready, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
