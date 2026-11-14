/**
 * Incoming links from outside the app. Invite links are remembered and
 * redeemed by `usePendingInvite`; the app itself just opens on Home.
 * Club links open the Clubs screen with the code filled in.
 */
import { clubCodeFromLink, inviteCodeFromLink, rememberInvite } from '@/lib/invites';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const club = clubCodeFromLink(path);
    if (club) return `/clubs?code=${club}`;
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
