import { supabase } from './supabase';
import { checkStorageQuota, freeStorageSpaceAggressively } from './errorLogger';

export type Profile = {
  id: string;
  /** @deprecated V1: id === user_id. Kept for backward compat. */
  user_id?: string;
  display_name: string;
  /** @deprecated Use display_name. */
  full_name?: string;
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
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/login`,
      data: {
        full_name: normalizedName,
        display_name: normalizedName,
        name: normalizedName,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('User creation failed');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      full_name: normalizedName,
      display_name: normalizedName,
    });

  if (profileError) throw profileError;

  return data;
}

export async function resendSignupConfirmation(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter your email address first.');
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/login`,
    },
  });

  if (error) throw error;
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
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateProfile(userId: string, fullName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId)
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
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return false;

  // V1: spaces.type is 'personal' | 'shared' — no household type yet.
  // Check if user is a member of any shared space as a household proxy.
  const { data: householdMembership } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(type)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.type', 'shared')
    .maybeSingle();

  return !!householdMembership;
}
