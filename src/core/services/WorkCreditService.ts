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
