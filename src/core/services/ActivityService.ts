// ActivityService — Quick Activities ("Cold calling", "Research", ...).
//
// Thin wrapper around user_activities + activity_templates. Used by the
// Quick Timer dropdown to surface a user-curated vocabulary of recurring
// focus work without forcing them to invent a goal every time.
//
// Lifecycle:
//   1. listMine() — gets the user's personal list, sorted by recency.
//   2. If empty + the user hasn't been seeded yet, call seedFromWorkTypes()
//      to pull in templates matching their profile.
//   3. After a session starts pinned to an activity, call bumpUsage(id)
//      so it floats to the top of the dropdown.

import { supabase } from '../../lib/supabase';

export interface UserActivity {
  id: string;
  user_id: string;
  template_id: string | null;
  label: string;
  emoji: string;
  default_minutes: number;
  sort_order: number;
  archived_at: string | null;
  last_used_at: string | null;
  sessions_count: number;
  created_at: string;
}

export interface ActivityTemplate {
  id: string;
  label: string;
  emoji: string;
  default_minutes: number;
  work_types: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const ActivityService = {
  /** The user's active activity list, sorted by most-recently-used.
   *  Activities never used yet fall back to their seeded sort_order. */
  async listMine(): Promise<UserActivity[]> {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .is('archived_at', null)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[ActivityService] listMine', error);
      return [];
    }
    return (data ?? []) as UserActivity[];
  },

  /** All templates from the global library, optionally filtered by
   *  work_types. Used by the "Browse library" picker. */
  async listTemplates(workTypes?: string[]): Promise<ActivityTemplate[]> {
    let q = supabase
      .from('activity_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (workTypes && workTypes.length > 0) {
      q = q.overlaps('work_types', workTypes);
    }
    const { data, error } = await q;
    if (error) {
      console.error('[ActivityService] listTemplates', error);
      return [];
    }
    return (data ?? []) as ActivityTemplate[];
  },

  /** RPC: seed the user's activity list from templates matching their
   *  profile.work_types (plus a "universal" bucket). Idempotent —
   *  on_conflict_do_nothing means re-running is safe. Returns the
   *  number of rows inserted (0 if everything already seeded). */
  async seedFromWorkTypes(perWorkType = 5): Promise<number> {
    const { data, error } = await supabase.rpc('seed_user_activities', {
      p_per_work_type: perWorkType,
    });
    if (error) {
      console.error('[ActivityService] seedFromWorkTypes', error);
      return 0;
    }
    return (data as number) ?? 0;
  },

  /** Increment sessions_count + set last_used_at server-side. Fire
   *  after a session is created with this activity. */
  async bumpUsage(activityId: string): Promise<void> {
    const { error } = await supabase.rpc('bump_user_activity_usage', {
      p_activity_id: activityId,
    });
    if (error) console.warn('[ActivityService] bumpUsage failed', error);
  },

  /** Add a custom activity not from the library. Default emoji is ⏱️. */
  async addCustom(input: { label: string; emoji?: string; defaultMinutes?: number }): Promise<UserActivity | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('user_activities')
      .insert({
        user_id: user.id,
        template_id: null,
        label: input.label.trim(),
        emoji: input.emoji?.trim() || '⏱️',
        default_minutes: Math.min(180, Math.max(5, input.defaultMinutes ?? 25)),
        sort_order: 50,
      })
      .select()
      .single();
    if (error) {
      console.error('[ActivityService] addCustom', error);
      return null;
    }
    return data as UserActivity;
  },

  /** Soft delete — sets archived_at. We don't hard-delete so historical
   *  session ↔ activity references stay intact for stats. */
  async archive(activityId: string): Promise<void> {
    const { error } = await supabase
      .from('user_activities')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', activityId);
    if (error) throw error;
  },
};
