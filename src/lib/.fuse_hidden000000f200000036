import { supabase } from './supabase';
import { checkStorageQuota, freeStorageSpaceAggressively } from './errorLogger';

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export async function signUp({ email, password, fullName }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('User creation failed');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: data.user.id,
      full_name: fullName,
    });

  if (profileError) throw profileError;

  return data;
}

export async function signIn({ email, password }: SignInInput) {
  // Proactively check storage quota before attempting login
  // This ensures we have space for the auth token
  const quotaCheck = checkStorageQuota();
  
  // If storage is not healthy, aggressively free up space
  if (!quotaCheck.isHealthy) {
    freeStorageSpaceAggressively();
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    // Check if it's a quota error and aggressively free up space
    if (error instanceof DOMException && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      // Aggressively free up storage space
      freeStorageSpaceAggressively();
      
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Retry once after freeing space
      const { data, error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (retryError) throw retryError;
      return data;
    }
    
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/login`,
  });

  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateProfile(userId: string, fullName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function checkUserHasHousehold(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return false;

  // Check if user is a member of any household space (context_type = 'household')
  const { data: householdMembership } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(context_type)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.context_type', 'household')
    .maybeSingle();

  return !!householdMembership;
}
