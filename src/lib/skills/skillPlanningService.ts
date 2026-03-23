/**
 * Skill Planning Service
 * 
 * Manages optional, non-binding planning layer for skills.
 * Planning is user-initiated, optional, and reversible.
 * 
 * PRINCIPLES:
 * - No metrics
 * - No targets
 * - No success/failure fields
 * - No auto-enforcement
 * - No recommendations
 */

import { supabase } from '../supabase';

export type SkillPlanTimeframe = 'short' | 'medium' | 'long' | 'open';

export interface SkillPlan {
  id: string;
  skill_id: string;
  context_id?: string | null;
  user_id: string;
  timeframe: SkillPlanTimeframe;
  intent_note?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface CreateSkillPlanInput {
  skill_id: string;
  context_id?: string | null;
  user_id: string;
  timeframe?: SkillPlanTimeframe;
  intent_note?: string | null;
}

export interface UpdateSkillPlanInput {
  timeframe?: SkillPlanTimeframe;
  intent_note?: string | null;
}

export const skillPlanningService = {
  /**
   * Get active plan for a skill context
   */
  async getPlanForContext(
    userId: string,
    skillId: string,
    contextId?: string
  ): Promise<SkillPlan | null> {
    let query = supabase
      .from('skill_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .is('archived_at', null);

    if (contextId) {
      query = query.eq('context_id', contextId);
    } else {
      query = query.is('context_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data as SkillPlan | null;
  },

  /**
   * Get all active plans for a skill (across all contexts)
   */
  async getPlansForSkill(userId: string, skillId: string): Promise<SkillPlan[]> {
    const { data, error } = await supabase
      .from('skill_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillPlan[];
  },

  /**
   * Get all active plans for a user
   */
  async getPlansForUser(userId: string): Promise<SkillPlan[]> {
    const { data, error } = await supabase
      .from('skill_plans')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillPlan[];
  },

  /**
   * Create a new plan
   */
  async createPlan(input: CreateSkillPlanInput): Promise<SkillPlan> {
    const { data, error } = await supabase
      .from('skill_plans')
      .insert([{
        skill_id: input.skill_id,
        context_id: input.context_id || null,
        user_id: input.user_id,
        timeframe: input.timeframe || 'open',
        intent_note: input.intent_note || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as SkillPlan;
  },

  /**
   * Update a plan
   */
  async updatePlan(planId: string, updates: UpdateSkillPlanInput): Promise<SkillPlan> {
    const { data, error } = await supabase
      .from('skill_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data as SkillPlan;
  },

  /**
   * Archive a plan (soft delete)
   */
  async archivePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_plans')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
  },

  /**
   * Restore an archived plan
   */
  async restorePlan(planId: string): Promise<SkillPlan> {
    const { data, error } = await supabase
      .from('skill_plans')
      .update({ archived_at: null })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data as SkillPlan;
  },

  /**
   * Delete a plan permanently (hard delete)
   */
  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },
};






