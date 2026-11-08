// Supabase Edge Function: permanently delete the signed-in user's account.
// Deleting the auth user removes all their rows too (every table cascades on delete).
// Google Play requires apps with accounts to offer this inside the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!data.user) return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401 });

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return new Response(JSON.stringify({ error: 'Could not delete account' }), { status: 500 });
  return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
});
