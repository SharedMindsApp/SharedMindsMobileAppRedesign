/**
 * Planner Intentions & Reflections Service
 * 
 * Ephemeral planning notes for temporal views.
 * Intentions are forward-looking, reflections are contextual.
 * 
 * Architecture: Planner = intentions + gentle reflection
 * No tracking, no logs, no metrics, no completion states.
 */

import { supabase } from '../supabase';

export type TemporalScope = 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface PlannerIntention {
  id: string;
  user_id: string;
  scope: TemporalScope;
  scope_date: string; // YYYY-MM-DD - the date this intention is for
  intention_text: string; // Short, forward-looking statement
  created_at: string;
  updated_at: string;
}

export interface PlannerReflection {
  id: string;
  user_id: string;
  scope: TemporalScope;
  scope_date: string; // YYYY-MM-DD - the date this reflection is for
  reflection_text: string; // Free-text narrative reflection
  created_at: string;
  updated_at: string;
}

/**
 * Get intention for a specific temporal scope and date
 */
export async function getIntention(
  userId: string,
  scope: TemporalScope,
  scopeDate: string
): Promise<PlannerIntention | null> {
  const { data, error } = await supabase
    .from('planner_intentions')
    .select('*')
    .eq('user_id', userId)
    .eq('scope', scope)
    .eq('scope_date', scopeDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching intention:', error);
    return null;
  }

  return data as PlannerIntention | null;
}

/**
 * Save or update intention for a temporal scope and date
 */
export async function saveIntention(
  userId: string,
  scope: TemporalScope,
  scopeDate: string,
  intentionText: string
): Promise<PlannerIntention> {
  // Check if intention exists
  const existing = await getIntention(userId, scope, scopeDate);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('planner_intentions')
      .update({
        intention_text: intentionText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as PlannerIntention;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('planner_intentions')
      .insert({
        user_id: userId,
        scope,
        scope_date: scopeDate,
        intention_text: intentionText,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PlannerIntention;
  }
}

/**
 * Clear intention for a temporal scope and date
 */
export async function clearIntention(
  userId: string,
  scope: TemporalScope,
  scopeDate: string
): Promise<void> {
  const { error } = await supabase
    .from('planner_intentions')
    .delete()
    .eq('user_id', userId)
    .eq('scope', scope)
    .eq('scope_date', scopeDate);

  if (error) throw error;
}

/**
 * Get reflection for a specific temporal scope and date
 */
export async function getReflection(
  userId: string,
  scope: TemporalScope,
  scopeDate: string
): Promise<PlannerReflection | null> {
  const { data, error } = await supabase
    .from('planner_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('scope', scope)
    .eq('scope_date', scopeDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching reflection:', error);
    return null;
  }

  return data as PlannerReflection | null;
}

/**
 * Save or update reflection for a temporal scope and date
 */
export async function saveReflection(
  userId: string,
  scope: TemporalScope,
  scopeDate: string,
  reflectionText: string
): Promise<PlannerReflection> {
  // Check if reflection exists
  const existing = await getReflection(userId, scope, scopeDate);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('planner_reflections')
      .update({
        reflection_text: reflectionText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as PlannerReflection;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('planner_reflections')
      .insert({
        user_id: userId,
        scope,
        scope_date: scopeDate,
        reflection_text: reflectionText,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PlannerReflection;
  }
}

/**
 * Clear reflection for a temporal scope and date
 */
export async function clearReflection(
  userId: string,
  scope: TemporalScope,
  scopeDate: string
): Promise<void> {
  const { error } = await supabase
    .from('planner_reflections')
    .delete()
    .eq('user_id', userId)
    .eq('scope', scope)
    .eq('scope_date', scopeDate);

  if (error) throw error;
}

/**
 * Get scope date for a given temporal scope
 * - today: today's date
 * - week: start of current week (Monday)
 * - month: first day of current month
 * - quarter: first day of current quarter
 * - year: first day of current year
 */
export function getScopeDate(scope: TemporalScope, baseDate: Date = new Date()): string {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);

  switch (scope) {
    case 'today':
      return date.toISOString().split('T')[0];
    
    case 'week': {
      // Get Monday of current week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      const monday = new Date(date.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    
    case 'month': {
      // First day of month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      return firstDay.toISOString().split('T')[0];
    }
    
    case 'quarter': {
      // First day of quarter
      const quarter = Math.floor(date.getMonth() / 3);
      const firstDay = new Date(date.getFullYear(), quarter * 3, 1);
      return firstDay.toISOString().split('T')[0];
    }
    
    case 'year': {
      // First day of year
      const firstDay = new Date(date.getFullYear(), 0, 1);
      return firstDay.toISOString().split('T')[0];
    }
    
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Get reflection prompt for a temporal scope
 */
export function getReflectionPrompt(scope: TemporalScope): string {
  const prompts: Record<TemporalScope, string> = {
    today: 'What shifted today?',
    week: 'What worked or didn\'t?',
    month: 'What mattered this month?',
    quarter: 'What changed direction?',
    year: 'What defined this year?',
  };
  
  return prompts[scope] || 'Reflection';
}
