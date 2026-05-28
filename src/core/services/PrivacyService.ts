/**
 * PrivacyService — GDPR data-subject rights, self-serve.
 *
 *   exportMyData()      — Article 20 portability. Aggregates every
 *                         user-owned row (RLS-scoped, so the client
 *                         can only ever pull its own data) into one
 *                         JSON document and triggers a download.
 *
 *   deleteMyAccount()   — Article 17 erasure. Calls the delete-account
 *                         Edge Function, which runs with the service
 *                         role to remove the auth.users row + all
 *                         owned data, then signs the user out locally.
 *
 * The export runs entirely client-side: each query below is gated by
 * the same row-level-security policies the rest of the app uses, so a
 * user can only ever export their own data. No service role, no Edge
 * Function needed for export.
 */

import { supabase } from '../../lib/supabase';

/** Tables we export, keyed by the column that identifies "this user". */
const OWNED_TABLES: { table: string; column: string }[] = [
  { table: 'focus_sessions',          column: 'user_id' },
  { table: 'session_outcomes',        column: 'user_id' },
  { table: 'tasks',                   column: 'user_id' },
  { table: 'projects',                column: 'owner_id' },
  { table: 'weekly_intentions',       column: 'user_id' },
  { table: 'weekly_reflections',      column: 'user_id' },
  { table: 'daily_plans',             column: 'user_id' },
  { table: 'community_posts',         column: 'author_id' },
  { table: 'community_post_replies',  column: 'author_id' },
  { table: 'community_post_reactions',column: 'user_id' },
  { table: 'dm_messages',             column: 'sender_id' },
  { table: 'global_chat_messages',    column: 'user_id' },
  { table: 'notifications',           column: 'user_id' },
];

export interface DataExport {
  generated_at: string;
  user_id: string;
  email: string | null;
  profile: Record<string, unknown> | null;
  /** table name -> array of rows (empty array if none) */
  data: Record<string, unknown[]>;
  /** tables that errored during export (RLS, missing table, etc.) */
  skipped: string[];
}

/**
 * Build a full export of the calling user's personal data.
 * Returns the structured object; use downloadDataExport() to save it.
 */
export async function buildMyDataExport(): Promise<DataExport> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Profile row
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const data: Record<string, unknown[]> = {};
  const skipped: string[] = [];

  // Connections are special — the user is on either side of the row.
  try {
    const { data: conns, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (error) throw error;
    data['connections'] = conns ?? [];
  } catch {
    skipped.push('connections');
  }

  // Everything else is a straight owner-column filter.
  for (const { table, column } of OWNED_TABLES) {
    try {
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .eq(column, user.id);
      if (error) throw error;
      data[table] = rows ?? [];
    } catch {
      skipped.push(table);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    data,
    skipped,
  };
}

/** Trigger a browser download of the export as a JSON file. */
export function downloadDataExport(exportObj: DataExport): void {
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `sharedminds-data-export-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convenience: build + download in one call. */
export async function exportMyData(): Promise<{ skipped: string[] }> {
  const exp = await buildMyDataExport();
  downloadDataExport(exp);
  return { skipped: exp.skipped };
}

// ── Account deletion (Article 17) ──────────────────────────────────

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

/**
 * Permanently delete the calling user's account and all owned data.
 *
 * Calls the `delete-account` Edge Function, which runs with the
 * service-role key to (a) delete owned rows and (b) remove the
 * auth.users entry — neither of which the anon client can do itself.
 * On success we sign the user out locally so the UI returns to the
 * logged-out state immediately.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>(
      'delete-account',
      { body: {} },
    );

    if (error) {
      console.error('[PrivacyService] deleteMyAccount failed:', error);
      return { ok: false, error: error.message ?? 'Deletion failed. Please email privacy@sharedminds.app.' };
    }
    if (!data?.ok) {
      return { ok: false, error: data?.error ?? 'Deletion failed. Please email privacy@sharedminds.app.' };
    }

    // Clear the local session — the auth row is gone server-side.
    await supabase.auth.signOut().catch(() => { /* already gone */ });
    return { ok: true };
  } catch (e) {
    console.error('[PrivacyService] deleteMyAccount threw:', e);
    return { ok: false, error: 'Could not reach the deletion service. Please email privacy@sharedminds.app.' };
  }
}
