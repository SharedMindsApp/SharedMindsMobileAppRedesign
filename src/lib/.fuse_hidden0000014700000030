import { supabase } from './supabase';
import {
  generateUserKeypair,
  generateConversationKey,
  encryptConversationKeyForMultipleRecipients,
} from './encryption';

export interface UserKeys {
  publicKey: string;
  encryptedPrivateKey: string;
}

export async function fetchUserKeys(
  profileId: string
): Promise<UserKeys | null> {
  const { data, error } = await supabase
    .from('profile_keys')
    .select('public_key, encrypted_private_key')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    publicKey: data.public_key,
    encryptedPrivateKey: data.encrypted_private_key,
  };
}

export async function fetchCurrentUserKeys(): Promise<UserKeys | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return fetchUserKeys(profile.id);
}

export async function storeUserKeys(
  profileId: string,
  keys: UserKeys
): Promise<boolean> {
  const { error } = await supabase.from('profile_keys').upsert({
    profile_id: profileId,
    public_key: keys.publicKey,
    encrypted_private_key: keys.encryptedPrivateKey,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

export async function initializeUserKeys(
  passphrase: string
): Promise<UserKeys | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const existingKeys = await fetchUserKeys(profile.id);
  if (existingKeys) {
    return existingKeys;
  }

  const keys = await generateUserKeypair(passphrase);

  const success = await storeUserKeys(profile.id, keys);
  if (!success) {
    throw new Error('Failed to store user keys');
  }

  return keys;
}

export async function fetchPublicKeys(
  profileIds: string[]
): Promise<Record<string, string>> {
  if (profileIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profile_keys')
    .select('profile_id, public_key')
    .in('profile_id', profileIds);

  if (error || !data) {
    throw new Error('Failed to fetch public keys');
  }

  const publicKeys: Record<string, string> = {};
  for (const row of data) {
    publicKeys[row.profile_id] = row.public_key;
  }

  return publicKeys;
}

export async function fetchEncryptedConversationKey(
  conversationId: string,
  profileId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('encrypted_conversation_key')
    .eq('conversation_id', conversationId)
    .eq('profile_id', profileId)
    .is('left_at', null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.encrypted_conversation_key;
}

export async function prepareEncryptedConversationKeys(
  participantIds: string[]
): Promise<{
  conversationKey: CryptoKey;
  encryptedKeys: Record<string, string>;
}> {
  const conversationKey = await generateConversationKey();

  const publicKeys = await fetchPublicKeys(participantIds);

  for (const participantId of participantIds) {
    if (!publicKeys[participantId]) {
      throw new Error(
        `Public key not found for participant: ${participantId}`
      );
    }
  }

  const encryptedKeys = await encryptConversationKeyForMultipleRecipients(
    conversationKey,
    publicKeys
  );

  return {
    conversationKey,
    encryptedKeys,
  };
}

export async function hasUserKeys(profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profile_keys')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  return !!data;
}

export async function hasCurrentUserKeys(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return false;

  return hasUserKeys(profile.id);
}
