/**
 * Meal Favourites Service
 * 
 * Single source of truth for managing recipe and meal favorites.
 * All operations use profile_id (from getActiveUserProfile), not auth.uid().
 * 
 * This service ensures:
 * - Favorites persist to meal_favourites table
 * - Uniqueness on (profile_id, recipe_id) or (profile_id, meal_id)
 * - RLS-compatible operations
 * - Immediate UI updates with database confirmation
 */

import { supabase } from './supabase';
import { getActiveUserProfileId } from './profiles/getActiveUserProfile';

/**
 * Add a recipe to favorites
 * @param profileId - Profile ID (from getActiveUserProfileId)
 * @param recipeId - Recipe ID to favorite
 * @param spaceId - Space ID (household/personal space)
 * @returns The inserted favorite record
 */
export async function addRecipeFavourite(
  profileId: string,
  recipeId: string,
  spaceId: string
): Promise<{ id: string; recipe_id: string; user_id: string; space_id: string }> {
  // Check if already favorited (global uniqueness per user, not per space)
  // The unique index on (user_id, recipe_id) enforces global uniqueness
  const { data: existing } = await supabase
    .from('meal_favourites')
    .select('id, space_id')
    .eq('recipe_id', recipeId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (existing) {
    // Already favorited globally for this user, return existing
    // Note: space_id may differ if favorited in a different space, but uniqueness is global
    return {
      id: existing.id,
      recipe_id: recipeId,
      user_id: profileId,
      space_id: existing.space_id || spaceId, // Use existing space_id or provided one
    };
  }

  // Insert new favorite
  const { data, error } = await supabase
    .from('meal_favourites')
    .insert({
      recipe_id: recipeId,
      user_id: profileId,
      space_id: spaceId,
      vote_count: 1,
    })
    .select('id, recipe_id, user_id, space_id')
    .single();

  if (error) {
    console.error('[addRecipeFavourite] Error inserting favorite:', error);
    throw new Error(`Failed to add favorite: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to add favorite: No data returned');
  }

  return {
    id: data.id,
    recipe_id: data.recipe_id,
    user_id: data.user_id,
    space_id: data.space_id,
  };
}

/**
 * Remove a recipe from favorites
 * @param profileId - Profile ID (from getActiveUserProfileId)
 * @param recipeId - Recipe ID to unfavorite
 * @param spaceId - Space ID (household/personal space)
 * @returns true if deleted, false if not found
 */
export async function removeRecipeFavourite(
  profileId: string,
  recipeId: string,
  spaceId: string
): Promise<boolean> {
  // Delete favorite (global uniqueness, so space_id is not needed for lookup)
  // But we include it in the query for consistency with the service interface
  const { data, error } = await supabase
    .from('meal_favourites')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('user_id', profileId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[removeRecipeFavourite] Error deleting favorite:', error);
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }

  return !!data;
}

/**
 * Get all recipe favorites for a user in a space
 * @param profileId - Profile ID (from getActiveUserProfileId)
 * @param spaceId - Space ID (household/personal space)
 * @returns Set of recipe IDs that are favorited
 */
export async function getUserRecipeFavourites(
  profileId: string,
  spaceId: string
): Promise<Set<string>> {
  // Get all recipe favorites for user (global, not space-scoped)
  // spaceId parameter is kept for API consistency but uniqueness is global per user
  const { data, error } = await supabase
    .from('meal_favourites')
    .select('recipe_id')
    .eq('user_id', profileId)
    .not('recipe_id', 'is', null);

  if (error) {
    console.error('[getUserRecipeFavourites] Error fetching favorites:', error);
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  const recipeIds = (data || [])
    .map(fav => fav.recipe_id)
    .filter((id): id is string => id !== null);

  return new Set(recipeIds);
}

/**
 * Check if a recipe is favorited
 * @param profileId - Profile ID (from getActiveUserProfileId)
 * @param recipeId - Recipe ID to check
 * @param spaceId - Space ID (household/personal space)
 * @returns true if favorited, false otherwise
 */
export async function isRecipeFavourited(
  profileId: string,
  recipeId: string,
  spaceId: string
): Promise<boolean> {
  // Check if favorited (global uniqueness per user, spaceId kept for API consistency)
  const { data } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('user_id', profileId)
    .maybeSingle();

  return !!data;
}

/**
 * Convenience function: Add recipe favorite using active profile
 * Automatically resolves profile ID from auth context
 */
export async function addRecipeFavouriteForCurrentUser(
  recipeId: string,
  spaceId: string
): Promise<{ id: string; recipe_id: string; user_id: string; space_id: string }> {
  const profileId = await getActiveUserProfileId();
  return addRecipeFavourite(profileId, recipeId, spaceId);
}

/**
 * Convenience function: Remove recipe favorite using active profile
 * Automatically resolves profile ID from auth context
 */
export async function removeRecipeFavouriteForCurrentUser(
  recipeId: string,
  spaceId: string
): Promise<boolean> {
  const profileId = await getActiveUserProfileId();
  return removeRecipeFavourite(profileId, recipeId, spaceId);
}

/**
 * Convenience function: Get recipe favorites for current user
 * Automatically resolves profile ID from auth context
 */
export async function getCurrentUserRecipeFavourites(spaceId: string): Promise<Set<string>> {
  const profileId = await getActiveUserProfileId();
  return getUserRecipeFavourites(profileId, spaceId);
}

/**
 * Convenience function: Check if recipe is favorited for current user
 * Automatically resolves profile ID from auth context
 */
export async function isRecipeFavouritedForCurrentUser(
  recipeId: string,
  spaceId: string
): Promise<boolean> {
  const profileId = await getActiveUserProfileId();
  return isRecipeFavourited(profileId, recipeId, spaceId);
}
