// WaitlistService — premium-tier demand capture.
//
// Billing isn't built yet; the "Upgrade to Premium" CTA instead routes to
// /upgrade where an interested user joins the waitlist. This is how we learn
// who would pay (and roughly how much) before committing to a payment flow.

import { supabase } from '../../lib/supabase';

export interface WaitlistEntry {
  user_id: string;
  email: string | null;
  display_name: string | null;
  price_band: string | null;
  reason: string | null;
  created_at: string;
}

export interface JoinWaitlistInput {
  priceBand?: string | null;
  reason?: string | null;
}

/** The current user's waitlist entry, or null if they haven't joined. */
export async function getMyWaitlistEntry(): Promise<WaitlistEntry | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('premium_waitlist')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as WaitlistEntry) ?? null;
}

/** Join (or update) the premium waitlist. Idempotent — one row per user. */
export async function joinPremiumWaitlist(input: JoinWaitlistInput = {}): Promise<WaitlistEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Denormalise email + display_name so the admin view needs no auth join.
  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const row = {
    user_id: user.id,
    email: user.email ?? null,
    display_name: (prof as { display_name?: string } | null)?.display_name ?? null,
    price_band: input.priceBand ?? null,
    reason: input.reason?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('premium_waitlist')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data as WaitlistEntry;
}

/** Admin: the whole waitlist, newest first. RLS gates this to admins. */
export async function fetchPremiumWaitlist(): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase
    .from('premium_waitlist')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WaitlistEntry[]) ?? [];
}
