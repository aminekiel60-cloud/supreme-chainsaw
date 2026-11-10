// Supabase Edge Function: permanently delete the signed-in user's account.
// Deleting the auth user removes all their rows too (every table cascades on delete).
// Google Play requires apps with accounts to offer this inside the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Server-side key (bypasses Row Level Security). Supabase provides it automatically:
// SUPABASE_SECRET_KEYS on projects with the new API keys, SUPABASE_SERVICE_ROLE_KEY on older ones.
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!data.user) return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401 });

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return new Response(JSON.stringify({ error: 'Could not delete account' }), { status: 500 });
  return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
});
