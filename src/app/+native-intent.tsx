/**
 * Incoming links from outside the app. Invite links are remembered and
 * redeemed by `usePendingInvite`; the app itself just opens on Home.
 */
import { inviteCodeFromLink, rememberInvite } from '@/lib/invites';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const code = inviteCodeFromLink(path);
    if (code) {
      rememberInvite(code);
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
