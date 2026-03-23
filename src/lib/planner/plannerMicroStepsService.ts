/**
 * Planner Micro Steps Service
 * 
 * Ephemeral planning notes for micro-steps (tiny wins).
 * Stored as today's plan, not historical logs.
 */

import { supabase } from '../supabase';

export interface PlannerMicroStep {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  step_text: string; // The micro-step description
  order: number; // For reordering
  created_at: string;
  updated_at: string;
}

/**
 * Get micro-steps for a specific date
 */
export async function getMicroSteps(
  userId: string,
  date: string
): Promise<PlannerMicroStep[]> {
  const { data, error } = await supabase
    .from('planner_microsteps')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('"order"', { ascending: true });

  if (error) {
    console.error('Error fetching micro-steps:', error);
    return [];
  }

  return (data || []) as PlannerMicroStep[];
}

/**
 * Save micro-step (create or update)
 */
export async function saveMicroStep(
  userId: string,
  date: string,
  stepText: string,
  order: number,
  stepId?: string
): Promise<PlannerMicroStep> {
  const payload = {
    user_id: userId,
    date,
    step_text: stepText,
    order,
    updated_at: new Date().toISOString(),
  };

  if (stepId) {
    // Update existing
    const { data, error } = await supabase
      .from('planner_microsteps')
      .update(payload)
      .eq('id', stepId)
      .select()
      .single();

    if (error) throw error;
    return data as PlannerMicroStep;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('planner_microsteps')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as PlannerMicroStep;
  }
}

/**
 * Delete micro-step
 */
export async function deleteMicroStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('planner_microsteps')
    .delete()
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Reorder micro-steps
 */
export async function reorderMicroSteps(
  steps: Array<{ id: string; order: number }>
): Promise<void> {
  // Update all steps in a batch
  const updates = steps.map(step =>
    supabase
      .from('planner_microsteps')
      .update({ order: step.order, updated_at: new Date().toISOString() })
      .eq('id', step.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    throw new Error(`Failed to reorder steps: ${errors.map(e => e.error?.message).join(', ')}`);
  }
}

/**
 * Get tasks due soon (from Guardrails - read-only)
 * Stub implementation - returns empty array for now
 */
export async function getDueSoonTasks(userId: string, days: number = 3): Promise<any[]> {
  // TODO: Integrate with Guardrails task service when available
  // For now, return empty array
  return [];
}
