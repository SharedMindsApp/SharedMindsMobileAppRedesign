/**
 * Food Profile Service
 * 
 * Service functions for managing user food profiles
 */

import { supabase } from './supabase';
import type { UserFoodProfile, FoodProfileInput, DietType, AllergyType } from './foodProfileTypes';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';

/**
 * Get food profile for a space
 */
export async function getFoodProfile(spaceId: string): Promise<UserFoodProfile | null> {
  // Determine if this is a household or personal space
  const { data: space } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  let query = supabase
    .from('user_food_profiles')
    .select('*')
    .eq('space_id', spaceId);

  if (space.context_type === 'household') {
    query = query.eq('household_id', space.context_id);
  } else {
    // For personal spaces, get the profile ID from the auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profileId = await getProfileIdFromAuthUserId(user.id);
    if (!profileId) {
      throw new Error('Profile not found for authenticated user');
    }
    query = query.eq('profile_id', profileId).is('household_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    allergies: (data.allergies || []) as AllergyType[],
    excluded_ingredients: (data.excluded_ingredients || []) as string[],
    preferred_ingredients: (data.preferred_ingredients || []) as string[],
    excluded_cuisines: (data.excluded_cuisines || []) as string[],
    preferred_cuisines: (data.preferred_cuisines || []) as string[],
  };
}

/**
 * Create or update food profile for a space
 */
export async function upsertFoodProfile(
  spaceId: string,
  input: FoodProfileInput
): Promise<UserFoodProfile> {
  // Determine if this is a household or personal space
  const { data: space } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  const profileData: any = {
    space_id: spaceId,
    diet: input.diet || null,
    allergies: input.allergies || [],
    excluded_ingredients: input.excluded_ingredients || [],
    preferred_ingredients: input.preferred_ingredients || [],
    excluded_cuisines: input.excluded_cuisines || [],
    preferred_cuisines: input.preferred_cuisines || [],
    allow_overrides: input.allow_overrides ?? false,
  };

  if (space.context_type === 'household') {
    profileData.household_id = space.context_id;
    profileData.profile_id = null;
  } else {
    // For personal spaces, get the profile ID from the auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profileId = await getProfileIdFromAuthUserId(user.id);
    if (!profileId) {
      throw new Error('Profile not found for authenticated user');
    }
    profileData.profile_id = profileId;
    profileData.household_id = null;
  }

  const { data, error } = await supabase
    .from('user_food_profiles')
    .upsert(profileData, {
      onConflict: 'profile_id,household_id,space_id',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    allergies: (data.allergies || []) as AllergyType[],
    excluded_ingredients: (data.excluded_ingredients || []) as string[],
    preferred_ingredients: (data.preferred_ingredients || []) as string[],
    excluded_cuisines: (data.excluded_cuisines || []) as string[],
    preferred_cuisines: (data.preferred_cuisines || []) as string[],
  };
}

/**
 * Delete food profile for a space
 */
export async function deleteFoodProfile(spaceId: string): Promise<void> {
  // Determine if this is a household or personal space
  const { data: space } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  let query = supabase
    .from('user_food_profiles')
    .delete()
    .eq('space_id', spaceId);

  if (space.context_type === 'household') {
    query = query.eq('household_id', space.context_id);
  } else {
    // For personal spaces, get the profile ID from the auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profileId = await getProfileIdFromAuthUserId(user.id);
    if (!profileId) {
      throw new Error('Profile not found for authenticated user');
    }
    query = query.eq('profile_id', profileId).is('household_id', null);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}
