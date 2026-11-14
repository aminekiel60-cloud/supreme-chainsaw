// Supabase Edge Function: invite link.
//
// A normal https link (tappable in WhatsApp, Instagram, SMS) that opens the
// Locked in app on the invite. If the app isn't installed, the browser shows
// short instructions with the code instead.
//
//   GET /functions/v1/invite?c=ABCD2345        friend invite
//   GET /functions/v1/invite?c=K7M2QX9P&club=1 club invite
//
// No login needed and nothing is read or written here: the code is only
// passed on to the app, which redeems it for the signed-in user.

const APP_SCHEME = 'lockedin';
const ANDROID_PACKAGE = 'com.lockedin.app';

Deno.serve((req) => {
  const url = new URL(req.url);
  const code = (url.searchParams.get('c') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

  if (!code) return text('This invite link is not complete. Ask your friend to share it again.', 400);
  const club = url.searchParams.get('club') === '1';
  const path = club ? 'club' : 'invite';

  if (url.searchParams.get('fallback') && club) {
    return text(
      `You're invited to a club on Locked in 🔒\n\n` +
        `1. Install the Locked in app and create an account.\n` +
        `2. Open You, then Clubs, and enter this code:\n\n` +
        `        ${code}\n\n` +
        `You see each other's workouts and the weekly ranking.\n\nLOCK IN. LEVEL UP.`,
    );
  }
  if (url.searchParams.get('fallback')) {
    return text(
      `You're invited to Locked in 🔒\n\n` +
        `1. Install the Locked in app and create an account.\n` +
        `2. Open You, then Friends, and enter this code:\n\n` +
        `        ${code}\n\n` +
        `You and your friend are connected right away.\n\nLOCK IN. LEVEL UP.`,
    );
  }

  // The public address of this function (req.url is the internal one).
  const fallback = `${Deno.env.get('SUPABASE_URL')}/functions/v1/invite?c=${code}${club ? '&club=1' : ''}&fallback=1`;
  const android = /android/i.test(req.headers.get('user-agent') ?? '');
  // Android: an intent link opens the app, or the fallback page when it isn't installed.
  // Elsewhere: the app's own link scheme.
  const target = android
    ? `intent://${path}?code=${code}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`
    : `${APP_SCHEME}://${path}?code=${code}`;

  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
});

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
