/**
 * Active User Profile Resolver
 *
 * Canonical helper for resolving the current authenticated user's profile.
 *
 * V1 Schema: profiles.id IS auth.users.id (direct FK, no separate user_id column).
 * This is the single source of truth for profile resolution across the app.
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If no profile exists
 * @returns {Promise<ActiveUserProfile>} The user's active profile
 */

import { supabase } from '../supabase';

export interface ActiveUserProfile {
  id: string;
  /** @deprecated V1 schema: id === user_id. Kept for backward compatibility. */
  user_id: string;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Get the active profile for the current authenticated user.
 *
 * In V1 schema, profiles.id references auth.users(id) directly,
 * so we query .eq('id', authUserId) instead of .eq('user_id', ...).
 */
export async function getActiveUserProfile(): Promise<ActiveUserProfile> {
  // 1. Get authenticated user
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('User not authenticated');
  }

  const authUserId = authData.user.id;

  // 2. Fetch profile (V1: profiles.id = auth.uid())
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', authUserId)
    .maybeSingle();

  if (profileError) {
    console.error('[getActiveUserProfile] Database error:', profileError.message);
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error(
      'Cannot proceed: no user profile found. Please complete your profile setup.'
    );
  }

  // 3. Return with backward-compatible shape
  return {
    id: profile.id,
    user_id: profile.id, // V1: id === user_id for backward compat
    full_name: profile.display_name,
    email: authData.user.email || null,
  };
}

/**
 * Get only the profile ID (convenience wrapper)
 */
export async function getActiveUserProfileId(): Promise<string> {
  const profile = await getActiveUserProfile();
  return profile.id;
}
