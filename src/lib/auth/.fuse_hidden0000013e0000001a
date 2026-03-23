import { supabase } from '../supabase';
import type { Provider } from '@supabase/supabase-js';

export type OAuthProvider = 'google' | 'apple';

export async function signInWithOAuth(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function ensureProfileExists(userId: string, email: string, metadata: any) {
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingProfile) {
    return existingProfile;
  }

  const fullName = extractFullNameFromMetadata(metadata, email);

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: fullName,
      email: email,
      role: 'free',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return newProfile;
}

function extractFullNameFromMetadata(metadata: any, email: string): string {
  if (metadata?.full_name) {
    return metadata.full_name;
  }

  if (metadata?.name) {
    return metadata.name;
  }

  if (metadata?.display_name) {
    return metadata.display_name;
  }

  if (metadata?.given_name && metadata?.family_name) {
    return `${metadata.given_name} ${metadata.family_name}`.trim();
  }

  if (metadata?.given_name) {
    return metadata.given_name;
  }

  if (email) {
    const emailPrefix = email.split('@')[0];
    return emailPrefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  return 'User';
}

export async function isNewUser(userId: string): Promise<boolean> {
  const { data: household } = await supabase
    .from('members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !household?.household_id;
}
