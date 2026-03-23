/**
 * Tag Preferences Service
 * 
 * Service functions for managing user tag preferences for recipe searches
 */

import { supabase } from './supabase';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';

export interface UserTagPreference {
  id: string;
  profile_id: string;
  space_id: string;
  tag: string;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagPreferenceInput {
  tag: string;
  is_preferred: boolean;
}

/**
 * Get all tag preferences for a space
 */
export async function getTagPreferences(spaceId: string): Promise<UserTagPreference[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileId = await getProfileIdFromAuthUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found for authenticated user');
  }

  const { data, error } = await supabase
    .from('user_tag_preferences')
    .select('*')
    .eq('profile_id', profileId)
    .eq('space_id', spaceId)
    .order('tag', { ascending: true });

  if (error) {
    console.error('[tagPreferencesService] Error fetching tag preferences:', error);
    throw error;
  }

  return (data || []) as UserTagPreference[];
}

/**
 * Get preferred tags for a space (is_preferred = true)
 */
export async function getPreferredTags(spaceId: string): Promise<string[]> {
  const preferences = await getTagPreferences(spaceId);
  return preferences.filter(p => p.is_preferred).map(p => p.tag);
}

/**
 * Upsert a tag preference (create or update)
 */
export async function upsertTagPreference(
  spaceId: string,
  input: TagPreferenceInput
): Promise<UserTagPreference> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileId = await getProfileIdFromAuthUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found for authenticated user');
  }

  const { data, error } = await supabase
    .from('user_tag_preferences')
    .upsert({
      profile_id: profileId,
      space_id: spaceId,
      tag: input.tag,
      is_preferred: input.is_preferred,
    }, {
      onConflict: 'profile_id,space_id,tag',
    })
    .select()
    .single();

  if (error) {
    console.error('[tagPreferencesService] Error upserting tag preference:', error);
    throw error;
  }

  return data as UserTagPreference;
}

/**
 * Toggle tag preference (if exists, toggle; if not, create as preferred)
 */
export async function toggleTagPreference(
  spaceId: string,
  tag: string
): Promise<UserTagPreference> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileId = await getProfileIdFromAuthUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found for authenticated user');
  }

  // Check if preference exists
  const { data: existing } = await supabase
    .from('user_tag_preferences')
    .select('*')
    .eq('profile_id', profileId)
    .eq('space_id', spaceId)
    .eq('tag', tag)
    .maybeSingle();

  const newIsPreferred = existing ? !existing.is_preferred : true;

  const { data, error } = await supabase
    .from('user_tag_preferences')
    .upsert({
      profile_id: profileId,
      space_id: spaceId,
      tag: tag,
      is_preferred: newIsPreferred,
    }, {
      onConflict: 'profile_id,space_id,tag',
    })
    .select()
    .single();

  if (error) {
    console.error('[tagPreferencesService] Error toggling tag preference:', error);
    throw error;
  }

  return data as UserTagPreference;
}

/**
 * Remove a tag preference
 */
export async function removeTagPreference(
  spaceId: string,
  tag: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileId = await getProfileIdFromAuthUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found for authenticated user');
  }

  const { error } = await supabase
    .from('user_tag_preferences')
    .delete()
    .eq('profile_id', profileId)
    .eq('space_id', spaceId)
    .eq('tag', tag);

  if (error) {
    console.error('[tagPreferencesService] Error removing tag preference:', error);
    throw error;
  }
}

/**
 * Batch upsert tag preferences
 */
export async function batchUpsertTagPreferences(
  spaceId: string,
  inputs: TagPreferenceInput[]
): Promise<UserTagPreference[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileId = await getProfileIdFromAuthUserId(user.id);
  if (!profileId) {
    throw new Error('Profile not found for authenticated user');
  }

  const upsertData = inputs.map(input => ({
    profile_id: profileId,
    space_id: spaceId,
    tag: input.tag,
    is_preferred: input.is_preferred,
  }));

  const { data, error } = await supabase
    .from('user_tag_preferences')
    .upsert(upsertData, {
      onConflict: 'profile_id,space_id,tag',
    })
    .select();

  if (error) {
    console.error('[tagPreferencesService] Error batch upserting tag preferences:', error);
    throw error;
  }

  return (data || []) as UserTagPreference[];
}
