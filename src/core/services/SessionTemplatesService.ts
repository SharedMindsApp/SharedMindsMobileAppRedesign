// SessionTemplatesService — curated session structures (solo + group).
//
// Templates live in the session_templates table (admin-curated). Users
// select one at scheduling time and the template's segments get copied
// onto the new focus_sessions row.
//
// Runtime segment progression (auto-advance, wizard auto-trigger,
// chimes on transition) lives in a future migration; this service just
// reads the library.

import { supabase } from '../../lib/supabase';

/** Kinds the runtime understands. Wizard-fired kinds map to an entry
 *  in SessionWizards/registry.ts via the optional `wizard` field. */
export type SegmentKind =
  | 'intro'
  | 'intentions'
  | 'work'
  | 'break'
  | 'reflect'
  | 'farewell'
  | 'wizard';

export interface Segment {
  kind: SegmentKind;
  label: string;
  minutes: number;
  /** Optional wizard id — when the segment becomes active, the
   *  runtime fires this wizard for the session. Maps to existing
   *  wizards (e.g. 'intentions', 'breathing', 'reflection'). */
  wizard?: string;
}

export interface SessionTemplate {
  id: string;
  label: string;
  tagline: string;
  description: string;
  emoji: string;
  scope: 'solo' | 'group' | 'one_on_one';
  total_minutes: number;
  segments: Segment[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const SessionTemplatesService = {
  /** List active templates for a given scope. Sort by curated order. */
  async listByScope(scope: 'solo' | 'group' | 'one_on_one'): Promise<SessionTemplate[]> {
    const { data, error } = await supabase
      .from('session_templates')
      .select('*')
      .eq('scope', scope)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[SessionTemplatesService] listByScope', error);
      return [];
    }
    return (data ?? []) as SessionTemplate[];
  },

  /** Fetch a single template by id — used when applying to a session. */
  async getById(id: string): Promise<SessionTemplate | null> {
    const { data, error } = await supabase
      .from('session_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[SessionTemplatesService] getById', error);
      return null;
    }
    return (data as SessionTemplate) ?? null;
  },
};
