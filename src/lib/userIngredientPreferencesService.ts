/**
 * User Ingredient Preferences Service (Optional)
 * 
 * Lightweight preference learning for ingredient-based recipe search.
 * Tracks which ingredients users frequently search for together.
 * 
 * Note: This is optional and does NOT block core functionality if it fails.
 */

import { supabase } from './supabase';
import { getActiveUserProfileId } from './profiles/getActiveUserProfile';

export interface UserIngredientPreference {
  id: string;
  profile_id: string;
  ingredient: string; // Normalized ingredient name
  weight: number; // Preference weight (incremented on use)
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Increment ingredient preference weight
 * Called when a recipe is added to meal plan via ingredient search
 */
export async function incrementIngredientPreference(
  spaceId: string,
  ingredient: string
): Promise<void> {
  try {
    const profileId = await getActiveUserProfileId();
    if (!profileId) {
      console.warn('[userIngredientPreferences] No profile ID, skipping preference update');
      return;
    }

    // Normalize ingredient name
    const normalizedIngredient = ingredient
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');

    if (!normalizedIngredient || normalizedIngredient.length === 0) {
      return;
    }

    // Upsert preference (increment weight if exists, create if not)
    // Note: This requires user_ingredient_preferences table to exist
    // For now, this is a no-op if the table doesn't exist (graceful degradation)
    try {
      // Try to get existing preference
      const { data: existing } = await supabase
        .from('user_ingredient_preferences')
        .select('id, weight')
        .eq('profile_id', profileId)
        .eq('ingredient', normalizedIngredient)
        .maybeSingle();

      if (existing) {
        // Update existing: increment weight
        const { error: updateError } = await supabase
          .from('user_ingredient_preferences')
          .update({
            weight: (existing.weight || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError && updateError.code !== '42P01') {
          console.warn('[userIngredientPreferences] Failed to update preference:', updateError);
        }
      } else {
        // Create new preference
        const { error: insertError } = await supabase
          .from('user_ingredient_preferences')
          .insert({
            profile_id: profileId,
            ingredient: normalizedIngredient,
            weight: 1,
            last_used_at: new Date().toISOString(),
          });

        if (insertError && insertError.code !== '42P01') {
          console.warn('[userIngredientPreferences] Failed to create preference:', insertError);
        }
      }
    } catch (error: any) {
      // Table might not exist (42P01) - this is optional, so we ignore it
      if (error?.code !== '42P01') {
        console.warn('[userIngredientPreferences] Error in preference update:', error);
      }
    }
  } catch (error) {
    // Don't throw - this is optional functionality
    console.warn('[userIngredientPreferences] Error incrementing preference:', error);
  }
}

/**
 * Batch increment ingredient preferences
 * Called when multiple ingredients are used together
 */
export async function incrementIngredientPreferences(
  spaceId: string,
  ingredients: string[]
): Promise<void> {
  // Increment each ingredient preference
  // Don't await - fire and forget for performance
  ingredients.forEach(ingredient => {
    incrementIngredientPreference(spaceId, ingredient).catch(err => {
      console.warn('[userIngredientPreferences] Failed to increment preference for:', ingredient, err);
    });
  });
}

/**
 * Get user's preferred ingredients (top N by weight)
 * Optional: Can be used to suggest ingredients in the future
 */
export async function getPreferredIngredients(
  spaceId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    const profileId = await getActiveUserProfileId();
    if (!profileId) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_ingredient_preferences')
      .select('ingredient')
      .eq('profile_id', profileId)
      .order('weight', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[userIngredientPreferences] Failed to get preferences:', error);
      return [];
    }

    return (data || []).map(p => p.ingredient);
  } catch (error) {
    console.warn('[userIngredientPreferences] Error getting preferences:', error);
    return [];
  }
}
