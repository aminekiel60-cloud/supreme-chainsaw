/**
 * Invite links: "https://…/invite?c=CODE" opens the app on lockedin://invite?code=CODE.
 * The code is remembered (also across sign-up and onboarding) and redeemed as
 * soon as you're signed in: you and the inviter become friends right away.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { haptics } from './haptics';
import { cloudEnabled, db } from './supabase';

const KEY = 'lockedin:pending-invite';
const listeners = new Set<() => void>();

/** The link people tap. Served by the `invite` Edge Function. */
export function inviteLink(code: string) {
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invite?c=${code}`;
}

export function inviteMessage(code: string) {
  return `Lock in with me on Locked in 🔒\nTap to add me as a friend:\n${inviteLink(code)}\n\nOr enter my code in the app: ${code}`;
}

/** Pull the invite code out of an incoming link, if it is one. */
export function inviteCodeFromLink(path: string): string | null {
  const match = /invite\/?\?(?:.*&)?code=([A-Za-z0-9-]{4,16})/.exec(path);
  return match ? match[1].toUpperCase() : null;
}

/** Remember an invite until it can be redeemed. */
export function rememberInvite(code: string) {
  AsyncStorage.setItem(KEY, code)
    .catch(() => {})
    .finally(() => listeners.forEach((l) => l()));
}

export type InviteResult = { ok: true; name: string } | { ok: false; error: 'not_found' | 'own' | 'too_many' | 'offline' };

/** Redeem a code: instant friendship with its owner. */
export async function redeemInvite(code: string): Promise<InviteResult> {
  const { data, error } = await db().rpc('accept_invite', { p_code: code });
  if (error) return { ok: false, error: 'offline' };
  return data as InviteResult;
}

export const INVITE_ERRORS: Record<Exclude<InviteResult, { ok: true }>['error'], string> = {
  not_found: 'That code doesn’t exist (anymore). Ask your friend to share their invite again.',
  own: 'That’s your own code 🙂 Share it with a friend.',
  too_many: 'Too many wrong codes. Try again in an hour.',
  offline: 'Could not reach the server. Check your connection and try again.',
};

/** Redeems a remembered invite once you're signed in and set up. Mount once, at the app root. */
export function usePendingInvite(active: boolean) {
  useEffect(() => {
    if (!active || !cloudEnabled) return;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        const code = await AsyncStorage.getItem(KEY);
        if (!code) return;
        const result = await redeemInvite(code);
        if (!result.ok && result.error === 'offline') return; // keep it for the next try
        await AsyncStorage.removeItem(KEY);
        if (result.ok) {
          haptics.success();
          Alert.alert('You’re connected! 🎉', `You and ${result.name} are now friends on Locked in.`, [
            { text: 'See the feed', onPress: () => router.navigate('/feed') },
            { text: 'OK' },
          ]);
        } else if (result.error !== 'own') {
          Alert.alert('Invite', INVITE_ERRORS[result.error]);
        }
      } finally {
        busy = false;
      }
    };
    run();
    listeners.add(run);
    return () => {
      listeners.delete(run);
    };
  }, [active]);
}
