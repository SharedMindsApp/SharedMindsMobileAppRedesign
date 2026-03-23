/**
 * Recipe Feedback Service
 * 
 * Service functions for managing recipe feedback
 * Phase 6: Learning & Analytics
 */

import { supabase } from './supabase';

export type FeedbackTag = 
  | 'worked_well'
  | 'too_complex'
  | 'too_simple'
  | 'loved_it'
  | 'will_make_again'
  | 'quick_and_easy'
  | 'needed_help'
  | 'family_favorite';

export interface RecipeFeedback {
  id: string;
  recipe_id: string;
  user_id: string | null;
  household_id: string | null;
  rating: number | null; // 1-5
  feedback_tags: FeedbackTag[];
  notes: string | null;
  made_on_date: string | null;
  made_with_modifications: boolean;
  modifications_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackInput {
  recipe_id: string;
  rating?: number; // 1-5
  feedback_tags?: FeedbackTag[];
  notes?: string;
  made_on_date?: string;
  made_with_modifications?: boolean;
  modifications_notes?: string;
}

export interface UpdateFeedbackInput {
  rating?: number;
  feedback_tags?: FeedbackTag[];
  notes?: string;
  made_on_date?: string;
  made_with_modifications?: boolean;
  modifications_notes?: string;
}

/**
 * Submit feedback for a recipe (creates or updates existing)
 */
export async function submitFeedback(
  input: CreateFeedbackInput,
  userId: string,
  householdId?: string
): Promise<RecipeFeedback> {
  // Get user's profile ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Upsert feedback (one per user per recipe)
  const { data, error } = await supabase
    .from('recipe_feedback')
    .upsert({
      recipe_id: input.recipe_id,
      user_id: profile.id,
      household_id: householdId || null,
      rating: input.rating || null,
      feedback_tags: input.feedback_tags || [],
      notes: input.notes || null,
      made_on_date: input.made_on_date || null,
      made_with_modifications: input.made_with_modifications || false,
      modifications_notes: input.modifications_notes || null,
    }, {
      onConflict: 'recipe_id,user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data as RecipeFeedback;
}

/**
 * Get feedback for a recipe
 */
export async function getRecipeFeedback(recipeId: string): Promise<RecipeFeedback[]> {
  const { data, error } = await supabase
    .from('recipe_feedback')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RecipeFeedback[];
}

/**
 * Get user's feedback for a recipe
 */
export async function getUserFeedback(recipeId: string, userId: string): Promise<RecipeFeedback | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const { data, error } = await supabase
    .from('recipe_feedback')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return data as RecipeFeedback | null;
}

/**
 * Update existing feedback
 */
export async function updateFeedback(
  recipeId: string,
  userId: string,
  input: UpdateFeedbackInput
): Promise<RecipeFeedback> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.feedback_tags !== undefined) updateData.feedback_tags = input.feedback_tags;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.made_on_date !== undefined) updateData.made_on_date = input.made_on_date;
  if (input.made_with_modifications !== undefined) updateData.made_with_modifications = input.made_with_modifications;
  if (input.modifications_notes !== undefined) updateData.modifications_notes = input.modifications_notes;

  const { data, error } = await supabase
    .from('recipe_feedback')
    .update(updateData)
    .eq('recipe_id', recipeId)
    .eq('user_id', profile.id)
    .select()
    .single();

  if (error) throw error;
  return data as RecipeFeedback;
}

/**
 * Delete feedback
 */
export async function deleteFeedback(recipeId: string, userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const { error } = await supabase
    .from('recipe_feedback')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('user_id', profile.id);

  if (error) throw error;
}

/**
 * Get aggregated feedback stats for a recipe
 */
export async function getRecipeFeedbackStats(recipeId: string): Promise<{
  total_feedback: number;
  average_rating: number | null;
  rating_count: number;
  tag_counts: Record<FeedbackTag, number>;
}> {
  const feedback = await getRecipeFeedback(recipeId);

  const stats = {
    total_feedback: feedback.length,
    average_rating: null as number | null,
    rating_count: 0,
    tag_counts: {
      worked_well: 0,
      too_complex: 0,
      too_simple: 0,
      loved_it: 0,
      will_make_again: 0,
      quick_and_easy: 0,
      needed_help: 0,
      family_favorite: 0,
    } as Record<FeedbackTag, number>,
  };

  // Calculate average rating
  const ratings = feedback.filter(f => f.rating !== null).map(f => f.rating!);
  if (ratings.length > 0) {
    stats.average_rating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    stats.rating_count = ratings.length;
  }

  // Count tags
  feedback.forEach(f => {
    f.feedback_tags.forEach(tag => {
      if (tag in stats.tag_counts) {
        stats.tag_counts[tag as FeedbackTag]++;
      }
    });
  });

  return stats;
}
