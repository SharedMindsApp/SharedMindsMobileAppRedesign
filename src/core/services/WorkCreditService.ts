import { supabase } from '../../lib/supabase';

/** A single piece of past work + the role the member played on it (IMDB-style
 *  credit). See migration 20260530000090. */
export interface WorkCredit {
  id: string;
  user_id: string;
  title: string;
  role: string | null;
  description: string | null;
  year_label: string | null;
  url: string | null;
  thumbnail_url: string | null;
  skills: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Fields the owner can set when creating/updating a credit. */
export type WorkCreditInput = Pick<
  WorkCredit,
  'title' | 'role' | 'description' | 'year_label' | 'url' | 'thumbnail_url' | 'skills'
>;

/** A member's work credits, ordered (manual sort, then newest). Returns [] on
 *  error / pre-migration so callers degrade gracefully. */
export async function fetchWorkCredits(userId: string): Promise<WorkCredit[]> {
  const { data, error } = await supabase
    .from('work_credits')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) { console.warn('[fetchWorkCredits] failed:', error); return []; }
  return (data ?? []).map((r: any) => ({ ...r, skills: r.skills ?? [] })) as WorkCredit[];
}

/** Create a credit for the current user. Appended to the end of their list. */
export async function createWorkCredit(input: WorkCreditInput): Promise<WorkCredit | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  // Place new credits after existing ones.
  const { count } = await supabase
    .from('work_credits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const { data, error } = await supabase
    .from('work_credits')
    .insert({ ...normalise(input), user_id: user.id, sort_order: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as WorkCredit;
}

export async function updateWorkCredit(id: string, input: WorkCreditInput): Promise<void> {
  const { error } = await supabase
    .from('work_credits')
    .update({ ...normalise(input), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkCredit(id: string): Promise<void> {
  const { error } = await supabase.from('work_credits').delete().eq('id', id);
  if (error) throw error;
}

/** Persist a new ordering (array of ids in display order). Best-effort. */
export async function reorderWorkCredits(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('work_credits').update({ sort_order: i }).eq('id', id),
    ),
  );
}

// ── Collaborators (verified credits) ────────────────────────────────────────

export interface CreditCollaborator {
  id: string;
  credit_id: string;
  owner_user_id: string;
  collaborator_user_id: string | null;   // null = email stub not yet claimed
  status: 'pending' | 'confirmed' | 'declined';
  display_name: string | null;
  avatar_url: string | null;
  invited_email: string | null;
  invited_name: string | null;
  invite_token: string | null;            // present for email invites (owner view)
  claimed_at: string | null;
}

/** A pending tag awaiting the current user's confirmation. */
export interface PendingCreditTag {
  id: string;
  credit_id: string;
  status: 'pending' | 'confirmed' | 'declined';
  credit_title: string;
  credit_role: string | null;
  owner_user_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
}

/** Collaborators for a set of credits, grouped by credit id. RLS returns
 *  confirmed rows to anyone + pending rows to the credit owner. */
export async function fetchCreditCollaborators(creditIds: string[]): Promise<Record<string, CreditCollaborator[]>> {
  if (creditIds.length === 0) return {};
  const { data, error } = await supabase
    .from('work_credit_collaborators')
    .select('*')
    .in('credit_id', creditIds);
  if (error || !data) return {};
  const userIds = Array.from(new Set(data.map((r: any) => r.collaborator_user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
    : { data: [] as any[] };
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const out: Record<string, CreditCollaborator[]> = {};
  for (const r of data as any[]) {
    const p = r.collaborator_user_id ? byId.get(r.collaborator_user_id) : null;
    (out[r.credit_id] ??= []).push({
      id: r.id, credit_id: r.credit_id, owner_user_id: r.owner_user_id,
      collaborator_user_id: r.collaborator_user_id ?? null, status: r.status,
      display_name: p?.display_name ?? r.invited_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      invited_email: r.invited_email ?? null, invited_name: r.invited_name ?? null,
      invite_token: r.invite_token ?? null, claimed_at: r.claimed_at ?? null,
    });
  }
  return out;
}

/** Tag a member as a collaborator on one of your credits (status 'pending'). */
export async function addCreditCollaborator(creditId: string, ownerUserId: string, collaboratorUserId: string): Promise<void> {
  const { error } = await supabase
    .from('work_credit_collaborators')
    .insert({ credit_id: creditId, owner_user_id: ownerUserId, collaborator_user_id: collaboratorUserId });
  if (error) throw error;
}

export async function removeCreditCollaborator(id: string): Promise<void> {
  const { error } = await supabase.from('work_credit_collaborators').delete().eq('id', id);
  if (error) throw error;
}

/** Credit a non-member by email — creates a stub + invite token. Returns the
 *  shareable invite link for the tagger to send (no automated email). */
export async function inviteCreditCollaboratorByEmail(
  creditId: string, ownerUserId: string, email: string, name: string,
): Promise<string> {
  const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  const { error } = await supabase
    .from('work_credit_collaborators')
    .insert({
      credit_id: creditId, owner_user_id: ownerUserId,
      invited_email: email.trim().toLowerCase(), invited_name: name.trim() || null,
      invite_token: token,
    });
  if (error) throw error;
  return `${window.location.origin}/credit-invite/${token}`;
}

/** Claim a credit invite by token (the invited person, once signed in). */
export async function claimCreditInvite(token: string): Promise<{
  ok: boolean; reason?: string; credit_title?: string; credit_role?: string | null; owner_name?: string;
}> {
  const { data, error } = await supabase.rpc('claim_credit_invite', { p_token: token });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false }) as any;
}

/** Credits the current user has been tagged on and not yet responded to. */
export async function fetchPendingCreditTags(): Promise<PendingCreditTag[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('work_credit_collaborators')
    .select('id, credit_id, status, owner_user_id, work_credits!credit_id(title, role)')
    .eq('collaborator_user_id', user.id)
    .eq('status', 'pending');
  if (error || !data) return [];
  const ownerIds = Array.from(new Set(data.map((r: any) => r.owner_user_id)));
  const { data: profiles } = await supabase
    .from('profiles').select('id, display_name, avatar_url').in('id', ownerIds);
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return (data as any[]).map((r) => ({
    id: r.id, credit_id: r.credit_id, status: r.status,
    credit_title: r.work_credits?.title ?? 'a project',
    credit_role: r.work_credits?.role ?? null,
    owner_user_id: r.owner_user_id,
    owner_name: byId.get(r.owner_user_id)?.display_name ?? null,
    owner_avatar: byId.get(r.owner_user_id)?.avatar_url ?? null,
  }));
}

/** Confirm or decline a credit tag (current user is the tagged member). */
export async function respondToCreditTag(id: string, status: 'confirmed' | 'declined'): Promise<void> {
  const { error } = await supabase
    .from('work_credit_collaborators')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Trim/normalise input: empty strings → null, title required. */
function normalise(input: WorkCreditInput) {
  const t = (s: string | null | undefined) => {
    const v = (s ?? '').trim();
    return v.length > 0 ? v : null;
  };
  return {
    title: (input.title ?? '').trim(),
    role: t(input.role),
    description: t(input.description),
    year_label: t(input.year_label),
    url: t(input.url),
    thumbnail_url: t(input.thumbnail_url),
    skills: input.skills ?? [],
  };
}
