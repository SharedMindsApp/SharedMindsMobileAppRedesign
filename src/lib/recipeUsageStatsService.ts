/**
 * Recipe Usage Stats Service
 * 
 * Service functions for managing recipe usage statistics and popularity
 * Phase 6: Learning & Analytics
 */

import { supabase } from './supabase';
import type { Recipe } from './recipeGeneratorTypes';

export interface RecipeUsageStats {
  id: string;
  recipe_id: string;
  times_added_to_plan: number;
  times_viewed: number;
  times_favorited: number;
  times_made: number;
  times_shared: number;
  last_added_to_plan: string | null;
  last_viewed: string | null;
  last_favorited: string | null;
  last_made: string | null;
  household_id: string | null;
  period_start: string | null;
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  popularity_score: number;
  trend_direction: 'up' | 'down' | 'stable' | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get usage stats for a recipe
 */
export async function getRecipeUsageStats(
  recipeId: string,
  householdId?: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
): Promise<RecipeUsageStats | null> {
  let query = supabase
    .from('recipe_usage_stats')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('period_type', periodType);

  // Use .is() for null checks, .eq() for actual values
  if (householdId === undefined || householdId === null) {
    query = query.is('household_id', null);
  } else {
    query = query.eq('household_id', householdId);
  }

  // For all_time period, period_start should be NULL
  // For other periods, we need to match the period_start
  // But since we're querying for a specific period, we should also filter by period_start
  // For all_time, filter by period_start IS NULL
  if (periodType === 'all_time') {
    query = query.is('period_start', null);
  }

  // Order by created_at DESC to get the most recent if duplicates exist
  query = query.order('created_at', { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) {
    // If we get a "multiple rows" error, there are duplicate records
    // Get all matching records and return the most recent one
    if (error.code === 'PGRST116') {
      const { data: allData, error: allError } = await supabase
        .from('recipe_usage_stats')
        .select('*')
        .eq('recipe_id', recipeId)
        .eq('period_type', periodType)
        .is('household_id', householdId === undefined || householdId === null ? null : householdId)
        .is('period_start', periodType === 'all_time' ? null : undefined)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (allError) throw allError;
      // Return the first (most recent) record
      return (allData && allData.length > 0) ? (allData[0] as RecipeUsageStats) : null;
    }
    throw error;
  }
  return data as RecipeUsageStats | null;
}

/**
 * Track recipe view
 */
export async function trackRecipeView(recipeId: string, householdId?: string): Promise<void> {
  const { error } = await supabase.rpc('increment_recipe_view', {
    p_recipe_id: recipeId,
    p_household_id: householdId || null,
  });

  if (error) throw error;
}

/**
 * Track recipe added to plan
 */
export async function trackRecipeAddedToPlan(recipeId: string, householdId?: string): Promise<void> {
  const { error } = await supabase.rpc('increment_recipe_added_to_plan', {
    p_recipe_id: recipeId,
    p_household_id: householdId || null,
  });

  if (error) throw error;
}

/**
 * Track recipe favorited
 */
export async function trackRecipeFavorited(recipeId: string, householdId?: string): Promise<void> {
  const { error } = await supabase.rpc('increment_recipe_favorited', {
    p_recipe_id: recipeId,
    p_household_id: householdId || null,
  });

  if (error) throw error;
}

/**
 * Recalculate popularity for a recipe
 */
export async function recalculatePopularity(
  recipeId: string,
  householdId?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_recipe_popularity', {
    p_recipe_id: recipeId,
    p_household_id: householdId || null,
  });

  if (error) throw error;
  return data || 0;
}
