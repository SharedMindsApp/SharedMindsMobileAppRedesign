export interface EncryptedData {
  ciphertext: string;
  nonce: string;
}

export interface UserKeypair {
  publicKey: string;
  encryptedPrivateKey: string;
}

export interface ConversationKeyData {
  conversationId: string;
  encryptedKey: string;
}

export interface MessageEncryptionData {
  id: string;
  ciphertext: string;
  nonce: string;
}

export interface DecryptedMessage {
  id: string;
  plaintext: string;
}

export interface EncryptionKeyMetadata {
  profileId: string;
  publicKey: string;
  hasPrivateKey: boolean;
  keysGeneratedAt?: string;
}

export interface ConversationParticipantKeys {
  profileId: string;
  encryptedConversationKey: string;
}

export interface PreparedConversation {
  conversationKey: CryptoKey;
  encryptedKeys: Record<string, string>;
}

export type EncryptionStatus = 'locked' | 'unlocked' | 'initializing' | 'error';

export interface EncryptionError {
  code: string;
  message: string;
  details?: unknown;
}
