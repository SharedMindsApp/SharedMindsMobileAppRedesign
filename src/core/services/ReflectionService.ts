/**
 * ReflectionService — weekly intentions + reflections.
 *
 * Schema lives in 20260519000003_weekly_reflections.sql. Week = Monday-
 * Sunday, week_start is always a Monday DATE in the user's perceived
 * calendar (we treat the date as locale-naive on the client and store
 * it as Postgres DATE).
 */

import { supabase } from '../../lib/supabase';

export interface WeeklyReflection {
  id: string;
  user_id: string;
  week_start: string;            // YYYY-MM-DD (always a Monday)
  reflection_text: string | null;
  overall_rating: number | null; // 1-5
  status: 'planning' | 'reflecting' | 'complete';
  created_at: string;
  updated_at: string;
}

export interface WeeklyIntention {
  id: string;
  reflection_id: string;
  user_id: string;
  title: string;
  project_id: string | null;
  sort_order: number;            // 0, 1, 2
  completed_at: string | null;
  rating: number | null;         // 1-5
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Microtasks ───────────────────────────────────────────────────

/** Energy proxy for effort estimation — avoids asking ADHD brains for minutes. */
export type MicrotaskEnergy = 'deep' | 'medium' | 'quick';

/** Session-cost of each energy level (used to compute ~N sessions estimate). */
export const ENERGY_SESSION_COST: Record<MicrotaskEnergy, number> = {
  deep:   1.0,  // full focus block (~90 min)
  medium: 0.5,  // half block, batch 2 per session (~50 min each)
  quick:  0.25, // quick admin, batch 4 per session (~25 min each)
};

export const ENERGY_LABEL: Record<MicrotaskEnergy, string> = {
  deep:   'Deep',
  medium: 'Medium',
  quick:  'Quick',
};

export const ENERGY_DESCRIPTION: Record<MicrotaskEnergy, string> = {
  deep:   'Needs full focus — 1 session',
  medium: 'Requires thought — ½ session',
  quick:  'Routine / admin — ¼ session',
};

export interface Microtask {
  id: string;
  intention_id: string;
  user_id: string;
  title: string;
  completed_at: string | null;
  sort_order: number;
  energy_level: MicrotaskEnergy;
  created_at: string;
  updated_at: string;
}

export type WeeklyIntentionWithMicrotasks = WeeklyIntention & {
  microtasks: Microtask[];
};

/** Compute estimated sessions from a set of microtasks. Returns 0 if none. */
export function estimateSessions(microtasks: Microtask[]): number {
  if (!microtasks.length) return 0;
  const raw = microtasks.reduce(
    (sum, m) => sum + ENERGY_SESSION_COST[m.energy_level ?? 'medium'],
    0,
  );
  return Math.ceil(raw);
}

export interface ReflectionWithIntentions {
  reflection: WeeklyReflection;
  intentions: WeeklyIntentionWithMicrotasks[];
}

// ── Week helpers ────────────────────────────────────────────────

/** Returns the Monday of the week containing `d` as a YYYY-MM-DD string. */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();         // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

/** Returns YYYY-MM-DD for the Monday `n` weeks back from `today`. Negative = future. */
export function mondayPlusWeeks(weeks: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() + weeks * 7);
  return mondayOf(d);
}

/** "Mon 12 May - Sun 18 May" style label for display. */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startFmt = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endFmt = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${startFmt} – ${endFmt}`;
}

// ── Service ─────────────────────────────────────────────────────

export const ReflectionService = {
  /** Fetch (or auto-stub) the reflection row for a given week_start. */
  async getReflectionByWeek(weekStart: string): Promise<ReflectionWithIntentions | null> {
    const { data: ref, error: refErr } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('week_start', weekStart)
      .maybeSingle();

    if (refErr) throw refErr;
    if (!ref) return null;

    const { data: ints, error: intErr } = await supabase
      .from('weekly_intentions')
      .select('*, microtasks:intention_microtasks(* )')
      .eq('reflection_id', ref.id)
      .order('sort_order', { ascending: true });
    if (intErr) throw intErr;

    return {
      reflection: ref as WeeklyReflection,
      intentions: ((ints ?? []) as any[]).map((row) => ({
        ...row,
        microtasks: ((row.microtasks ?? []) as Microtask[])
          .sort((a, b) => a.sort_order - b.sort_order),
      })) as WeeklyIntentionWithMicrotasks[],
    };
  },

  /** Create the empty reflection row for a week if it doesn't exist. */
  async ensureReflection(weekStart: string): Promise<WeeklyReflection> {
    const { data: existing } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('week_start', weekStart)
      .maybeSingle();
    if (existing) return existing as WeeklyReflection;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('weekly_reflections')
      .insert({ user_id: user.id, week_start: weekStart, status: 'planning' })
      .select()
      .single();
    if (error) throw error;
    return data as WeeklyReflection;
  },

  async updateReflection(
    reflectionId: string,
    patch: Partial<Pick<WeeklyReflection, 'reflection_text' | 'overall_rating' | 'status'>>,
  ): Promise<WeeklyReflection> {
    const { data, error } = await supabase
      .from('weekly_reflections')
      .update(patch)
      .eq('id', reflectionId)
      .select()
      .single();
    if (error) throw error;
    return data as WeeklyReflection;
  },

  /** Add an intention. DB trigger enforces max 3. */
  async addIntention(input: {
    reflectionId: string;
    title: string;
    projectId?: string | null;
    sortOrder: 0 | 1 | 2;
  }): Promise<WeeklyIntention> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('weekly_intentions')
      .insert({
        reflection_id: input.reflectionId,
        user_id: user.id,
        title: input.title.trim(),
        project_id: input.projectId ?? null,
        sort_order: input.sortOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return data as WeeklyIntention;
  },

  async updateIntention(
    intentionId: string,
    patch: Partial<Pick<WeeklyIntention, 'title' | 'project_id' | 'rating' | 'notes' | 'completed_at'>>,
  ): Promise<WeeklyIntention> {
    const { data, error } = await supabase
      .from('weekly_intentions')
      .update(patch)
      .eq('id', intentionId)
      .select()
      .single();
    if (error) throw error;
    return data as WeeklyIntention;
  },

  async deleteIntention(intentionId: string): Promise<void> {
    const { error } = await supabase
      .from('weekly_intentions')
      .delete()
      .eq('id', intentionId);
    if (error) throw error;
  },

  async toggleIntentionComplete(intention: WeeklyIntention): Promise<WeeklyIntention> {
    return ReflectionService.updateIntention(intention.id, {
      completed_at: intention.completed_at ? null : new Date().toISOString(),
    });
  },

  /** Get a window of recent reflections for the history tab. */
  async getRecentReflections(limit = 12): Promise<ReflectionWithIntentions[]> {
    const { data: refs, error } = await supabase
      .from('weekly_reflections')
      .select('*, weekly_intentions(*)')
      .order('week_start', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (refs ?? []).map((row: any) => ({
      reflection: row as WeeklyReflection,
      intentions: ((row.weekly_intentions ?? []) as WeeklyIntentionWithMicrotasks[])
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  },

  // ── Microtask CRUD ────────────────────────────────────────────

  async addMicrotask(input: {
    intentionId: string;
    title: string;
    energyLevel?: MicrotaskEnergy;
    sortOrder?: number;
  }): Promise<Microtask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('intention_microtasks')
      .insert({
        intention_id: input.intentionId,
        user_id: user.id,
        title: input.title.trim(),
        energy_level: input.energyLevel ?? 'medium',
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Microtask;
  },

  async updateMicrotask(
    microtaskId: string,
    patch: Partial<Pick<Microtask, 'title' | 'energy_level' | 'completed_at' | 'sort_order'>>,
  ): Promise<Microtask> {
    const { data, error } = await supabase
      .from('intention_microtasks')
      .update(patch)
      .eq('id', microtaskId)
      .select()
      .single();
    if (error) throw error;
    return data as Microtask;
  },

  async deleteMicrotask(microtaskId: string): Promise<void> {
    const { error } = await supabase
      .from('intention_microtasks')
      .delete()
      .eq('id', microtaskId);
    if (error) throw error;
  },

  async toggleMicrotaskComplete(microtask: Microtask): Promise<Microtask> {
    return ReflectionService.updateMicrotask(microtask.id, {
      completed_at: microtask.completed_at ? null : new Date().toISOString(),
    });
  },
};
