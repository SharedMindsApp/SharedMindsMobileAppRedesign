// delete-account Edge Function — GDPR Article 17 (right to erasure).
//
// Authenticated user calls this to permanently delete their own
// account. Runs with the service-role key so it can (a) delete owned
// rows that RLS would otherwise protect from cross-table cascade, and
// (b) remove the auth.users entry, which the anon client cannot do.
//
// The caller's identity is taken from the JWT — a user can only ever
// delete THEMSELVES. There is no user_id parameter to tamper with.
//
// Deploy:
//   supabase functions deploy delete-account
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Tables to scrub directly, keyed by the column identifying the user.
// Many of these would cascade from auth.users deletion if FKs are set
// ON DELETE CASCADE, but we delete explicitly so erasure is complete
// and predictable regardless of FK configuration.
const OWNED: { table: string; column: string }[] = [
  { table: 'community_post_reactions', column: 'user_id' },
  { table: 'community_post_replies',   column: 'author_id' },
  { table: 'community_posts',          column: 'author_id' },
  { table: 'global_chat_messages',     column: 'user_id' },
  { table: 'dm_messages',              column: 'sender_id' },
  { table: 'session_outcomes',         column: 'user_id' },
  { table: 'focus_sessions',           column: 'user_id' },
  { table: 'weekly_intentions',        column: 'user_id' },
  { table: 'weekly_reflections',       column: 'user_id' },
  { table: 'daily_plans',              column: 'user_id' },
  { table: 'tasks',                    column: 'user_id' },
  { table: 'projects',                 column: 'owner_id' },
  { table: 'notifications',            column: 'user_id' },
  { table: 'notification_preferences', column: 'user_id' },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const supabaseUrl    = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  // 1. Identify the caller from their JWT (anon client + their token).
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, error: 'Missing authorization' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, error: 'Invalid or expired session' }, 401);
  }
  const userId = userData.user.id;

  // 2. Service-role client for the actual deletion.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const errors: string[] = [];

  // 3. Delete owned rows. Best-effort: collect errors but keep going so
  //    a single missing table doesn't block the whole erasure.
  for (const { table, column } of OWNED) {
    const { error } = await admin.from(table).delete().eq(column, userId);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // 4. Connections — user can be on either side of the row.
  {
    const { error } = await admin
      .from('connections')
      .delete()
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) errors.push(`connections: ${error.message}`);
  }

  // 5. DM participation + conversations the user was in. Delete the
  //    participant rows first; conversations with no participants left
  //    are orphaned but harmless (and can be reaped by a separate job).
  {
    const { error } = await admin.from('dm_participants').delete().eq('user_id', userId);
    if (error) errors.push(`dm_participants: ${error.message}`);
  }

  // 6. Storage: remove the avatar object if present.
  await admin.storage.from('avatars').remove([`${userId}.jpg`]).catch(() => { /* none */ });

  // 7. Profile row.
  {
    const { error } = await admin.from('profiles').delete().eq('id', userId);
    if (error) errors.push(`profiles: ${error.message}`);
  }

  // 8. The auth.users entry — the irreversible step. Do this last so a
  //    failure above doesn't leave a half-deleted account that can't
  //    sign in to retry.
  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
  if (authDelErr) {
    return json({
      ok: false,
      error: `Could not delete auth account: ${authDelErr.message}`,
      partial_errors: errors,
    }, 500);
  }

  return json({ ok: true, scrubbed: OWNED.length, warnings: errors });
});
