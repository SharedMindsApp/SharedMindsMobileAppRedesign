/**
 * Auth Context Helper
 * 
 * Extracts authentication context from Supabase auth session.
 * Used by API handlers to get the current user's profile ID and auth user ID.
 */

import { supabase } from '../../supabase';

export interface AuthContext {
  userId: string;      // profiles.id
  authUserId: string;  // auth.users.id
}

/**
 * Get current authenticated user context
 * Returns null if user is not authenticated
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  // Get profile ID from user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (profileError || !profile) {
    return null;
  }
  
  return {
    userId: profile.id,      // profiles.id
    authUserId: user.id,     // auth.users.id
  };
}
