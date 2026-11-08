/**
 * Supabase client — accounts, cloud sync and social features.
 *
 * The URL and publishable key come from `.env` (EXPO_PUBLIC_… variables).
 * Both are meant to be public; the database's Row Level Security rules
 * (supabase/migrations) are what keep each user's data private.
 *
 * Without these variables the app runs in "local mode": no account,
 * data only on this phone, demo friends.
 */
import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(url && key);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Only refresh the login token while the app is open.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The database client; only call this from code that runs when cloudEnabled is true. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}
