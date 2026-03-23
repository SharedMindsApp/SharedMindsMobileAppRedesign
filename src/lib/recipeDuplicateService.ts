/**
 * Recipe Duplicate Service
 * 
 * Service functions for managing recipe duplicates, detection, and merging
 * Phase 5: Duplicate Detection
 */

import { supabase } from './supabase';
import type { Recipe } from './recipeGeneratorTypes';

export interface RecipeDuplicate {
  id: string;
  primary_recipe_id: string;
  duplicate_recipe_id: string;
  similarity_score: number;
  detection_method: 'name_match' | 'ingredient_match' | 'combined' | 'user_reported' | 'ai_detected';
  detection_confidence: 'high' | 'medium' | 'low';
  similarity_details: {
    name_similarity?: number;
    ingredient_similarity?: number;
    matching_ingredients?: string[];
  };
  status: 'detected' | 'pending_review' | 'confirmed' | 'merged' | 'rejected' | 'false_positive';
  merge_action: 'merge' | 'keep_separate' | 'pending' | null;
  merged_into_recipe_id: string | null;
  merged_at: string | null;
  merged_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeDuplicateWithDetails extends RecipeDuplicate {
  primary_recipe?: Recipe;
  duplicate_recipe?: Recipe;
}

/**
 * Get duplicates for a recipe
 */
export async function getDuplicatesForRecipe(recipeId: string): Promise<RecipeDuplicateWithDetails[]> {
  const { data, error } = await supabase
    .from('recipe_duplicates')
    .select(`
      *,
      primary_recipe:recipes!recipe_duplicates_primary_recipe_id_fkey(*),
      duplicate_recipe:recipes!recipe_duplicates_duplicate_recipe_id_fkey(*)
    `)
    .or(`primary_recipe_id.eq.${recipeId},duplicate_recipe_id.eq.${recipeId}`)
    .eq('status', 'detected')
    .order('similarity_score', { ascending: false });

  if (error) throw error;
  return (data || []) as RecipeDuplicateWithDetails[];
}

/**
 * Get all unresolved duplicates (for review queue)
 */
export async function getUnresolvedDuplicates(limit: number = 50): Promise<RecipeDuplicateWithDetails[]> {
  const { data, error } = await supabase
    .from('recipe_duplicates')
    .select(`
      *,
      primary_recipe:recipes!recipe_duplicates_primary_recipe_id_fkey(*),
      duplicate_recipe:recipes!recipe_duplicates_duplicate_recipe_id_fkey(*)
    `)
    .in('status', ['detected', 'pending_review'])
    .order('similarity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as RecipeDuplicateWithDetails[];
}

/**
 * Manually trigger duplicate detection for a recipe
 */
export async function detectDuplicatesForRecipe(
  recipeId: string,
  householdId?: string,
  threshold: number = 0.75
): Promise<RecipeDuplicate[]> {
  const { data, error } = await supabase.rpc('detect_recipe_duplicates', {
    new_recipe_id: recipeId,
    check_household_id: householdId || null,
    similarity_threshold: threshold,
  });

  if (error) throw error;
  
  // Return the created duplicates
  return getDuplicatesForRecipe(recipeId);
}

/**
 * Merge two recipes
 */
export async function mergeRecipes(
  primaryRecipeId: string,
  duplicateRecipeId: string,
  userId: string
): Promise<void> {
  // Get user's profile ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Call merge function
  const { error } = await supabase.rpc('merge_recipe_duplicates', {
    p_primary_recipe_id: primaryRecipeId,
    p_duplicate_recipe_id: duplicateRecipeId,
    p_merged_by_user_id: profile.id,
  });

  if (error) throw error;
}

/**
 * Reject a duplicate (mark as false positive)
 */
export async function rejectDuplicate(
  primaryRecipeId: string,
  duplicateRecipeId: string,
  userId: string,
  reviewNotes?: string
): Promise<void> {
  // Get user's profile ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Call reject function
  const { error } = await supabase.rpc('reject_recipe_duplicate', {
    p_primary_recipe_id: primaryRecipeId,
    p_duplicate_recipe_id: duplicateRecipeId,
    p_reviewed_by_user_id: profile.id,
    p_review_notes: reviewNotes || null,
  });

  if (error) throw error;
}

/**
 * Update duplicate status manually
 */
export async function updateDuplicateStatus(
  duplicateId: string,
  status: RecipeDuplicate['status'],
  userId?: string,
  reviewNotes?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      updateData.reviewed_by = profile.id;
      updateData.reviewed_at = new Date().toISOString();
    }
  }

  if (reviewNotes) {
    updateData.review_notes = reviewNotes;
  }

  const { error } = await supabase
    .from('recipe_duplicates')
    .update(updateData)
    .eq('id', duplicateId);

  if (error) throw error;
}

/**
 * Get duplicate statistics
 */
export async function getDuplicateStatistics(): Promise<{
  total: number;
  detected: number;
  pending_review: number;
  merged: number;
  rejected: number;
}> {
  const { data, error } = await supabase
    .from('recipe_duplicates')
    .select('status');

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    detected: 0,
    pending_review: 0,
    merged: 0,
    rejected: 0,
  };

  data?.forEach(dup => {
    switch (dup.status) {
      case 'detected':
        stats.detected++;
        break;
      case 'pending_review':
        stats.pending_review++;
        break;
      case 'merged':
        stats.merged++;
        break;
      case 'rejected':
      case 'false_positive':
        stats.rejected++;
        break;
    }
  });

  return stats;
}
