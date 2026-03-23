import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import {
  unlockPrivateKey,
  decryptConversationKey,
  encryptMessage,
  decryptMessage,
  generateConversationKey,
  encryptConversationKeyForMultipleRecipients,
  EncryptedData,
} from '../lib/encryption';
import {
  fetchCurrentUserKeys,
  fetchEncryptedConversationKey,
  fetchPublicKeys,
  prepareEncryptedConversationKeys,
} from '../lib/encryptionHelpers';

interface EncryptionContextType {
  isUnlocked: boolean;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  getConversationKey: (conversationId: string) => Promise<CryptoKey | null>;
  encryptMessageForConversation: (
    conversationId: string,
    message: string
  ) => Promise<EncryptedData>;
  decryptMessageForConversation: (
    conversationId: string,
    ciphertext: string,
    nonce: string
  ) => Promise<string>;
  prepareNewConversation: (
    participantIds: string[]
  ) => Promise<{
    conversationKey: CryptoKey;
    encryptedKeys: Record<string, string>;
  }>;
  clearConversationKeyCache: () => void;
  hasPrivateKey: boolean;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(
  undefined
);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [conversationKeyCache] = useState<Map<string, CryptoKey>>(new Map());

  const isUnlocked = privateKey !== null;

  const unlock = useCallback(async (passphrase: string) => {
    try {
      const userKeys = await fetchCurrentUserKeys();
      if (!userKeys) {
        throw new Error('User keys not found. Please set up encryption first.');
      }

      const decryptedPrivateKey = await unlockPrivateKey(
        userKeys.encryptedPrivateKey,
        passphrase
      );

      setPrivateKey(decryptedPrivateKey);
    } catch (error) {
      console.error('Failed to unlock private key:', error);
      throw new Error('Invalid passphrase or corrupted keys');
    }
  }, []);

  const lock = useCallback(() => {
    setPrivateKey(null);
    conversationKeyCache.clear();
  }, [conversationKeyCache]);

  const getConversationKey = useCallback(
    async (conversationId: string): Promise<CryptoKey | null> => {
      if (!privateKey) {
        throw new Error('Private key not unlocked');
      }

      if (!profile) {
        throw new Error('User profile not loaded');
      }

      if (conversationKeyCache.has(conversationId)) {
        return conversationKeyCache.get(conversationId)!;
      }

      try {
        const encryptedKey = await fetchEncryptedConversationKey(
          conversationId,
          profile.id
        );

        if (!encryptedKey) {
          return null;
        }

        const conversationKey = await decryptConversationKey(
          encryptedKey,
          privateKey
        );

        conversationKeyCache.set(conversationId, conversationKey);

        return conversationKey;
      } catch (error) {
        console.error('Failed to decrypt conversation key:', error);
        throw new Error('Failed to decrypt conversation key');
      }
    },
    [privateKey, profile, conversationKeyCache]
  );

  const encryptMessageForConversation = useCallback(
    async (conversationId: string, message: string): Promise<EncryptedData> => {
      const conversationKey = await getConversationKey(conversationId);
      if (!conversationKey) {
        throw new Error('Conversation key not found');
      }

      return encryptMessage(message, conversationKey);
    },
    [getConversationKey]
  );

  const decryptMessageForConversation = useCallback(
    async (
      conversationId: string,
      ciphertext: string,
      nonce: string
    ): Promise<string> => {
      const conversationKey = await getConversationKey(conversationId);
      if (!conversationKey) {
        throw new Error('Conversation key not found');
      }

      return decryptMessage(ciphertext, nonce, conversationKey);
    },
    [getConversationKey]
  );

  const prepareNewConversation = useCallback(
    async (
      participantIds: string[]
    ): Promise<{
      conversationKey: CryptoKey;
      encryptedKeys: Record<string, string>;
    }> => {
      if (!privateKey) {
        throw new Error('Private key not unlocked');
      }

      return prepareEncryptedConversationKeys(participantIds);
    },
    [privateKey]
  );

  const clearConversationKeyCache = useCallback(() => {
    conversationKeyCache.clear();
  }, [conversationKeyCache]);

  useEffect(() => {
    if (!user) {
      lock();
    }
  }, [user, lock]);

  const value: EncryptionContextType = {
    isUnlocked,
    unlock,
    lock,
    getConversationKey,
    encryptMessageForConversation,
    decryptMessageForConversation,
    prepareNewConversation,
    clearConversationKeyCache,
    hasPrivateKey: !!privateKey,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption(): EncryptionContextType {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
}

export function useConversationKey(conversationId: string) {
  const { getConversationKey, isUnlocked } = useEncryption();
  const [conversationKey, setConversationKey] = useState<CryptoKey | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKey = useCallback(async () => {
    if (!isUnlocked) {
      setError('Encryption keys not unlocked');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const key = await getConversationKey(conversationId);
      setConversationKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key');
    } finally {
      setLoading(false);
    }
  }, [conversationId, getConversationKey, isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      loadKey();
    }
  }, [loadKey, isUnlocked]);

  return { conversationKey, loading, error, reload: loadKey };
}

export function useEncryptMessage(conversationId: string) {
  const { encryptMessageForConversation, isUnlocked } = useEncryption();
  const [encrypting, setEncrypting] = useState(false);

  const encrypt = useCallback(
    async (message: string): Promise<EncryptedData> => {
      if (!isUnlocked) {
        throw new Error('Encryption keys not unlocked');
      }

      setEncrypting(true);
      try {
        return await encryptMessageForConversation(conversationId, message);
      } finally {
        setEncrypting(false);
      }
    },
    [conversationId, encryptMessageForConversation, isUnlocked]
  );

  return { encrypt, encrypting };
}

export function useDecryptMessage(conversationId: string) {
  const { decryptMessageForConversation, isUnlocked } = useEncryption();

  const decrypt = useCallback(
    async (ciphertext: string, nonce: string): Promise<string> => {
      if (!isUnlocked) {
        throw new Error('Encryption keys not unlocked');
      }

      return decryptMessageForConversation(conversationId, ciphertext, nonce);
    },
    [conversationId, decryptMessageForConversation, isUnlocked]
  );

  return { decrypt };
}

export function useDecryptMessages(conversationId: string) {
  const { decrypt } = useDecryptMessage(conversationId);
  const [decryptedMessages, setDecryptedMessages] = useState<
    Map<string, string>
  >(new Map());
  const [decryptionErrors, setDecryptionErrors] = useState<Map<string, string>>(
    new Map()
  );

  const decryptMultiple = useCallback(
    async (
      messages: Array<{ id: string; ciphertext: string; nonce: string }>
    ) => {
      const newDecrypted = new Map(decryptedMessages);
      const newErrors = new Map(decryptionErrors);

      for (const message of messages) {
        if (newDecrypted.has(message.id)) {
          continue;
        }

        try {
          const plaintext = await decrypt(message.ciphertext, message.nonce);
          newDecrypted.set(message.id, plaintext);
        } catch (error) {
          newErrors.set(
            message.id,
            error instanceof Error ? error.message : 'Decryption failed'
          );
        }
      }

      setDecryptedMessages(newDecrypted);
      setDecryptionErrors(newErrors);
    },
    [decrypt, decryptedMessages, decryptionErrors]
  );

  const getDecryptedMessage = useCallback(
    (messageId: string): string | null => {
      return decryptedMessages.get(messageId) || null;
    },
    [decryptedMessages]
  );

  const getDecryptionError = useCallback(
    (messageId: string): string | null => {
      return decryptionErrors.get(messageId) || null;
    },
    [decryptionErrors]
  );

  const clearCache = useCallback(() => {
    setDecryptedMessages(new Map());
    setDecryptionErrors(new Map());
  }, []);

  return {
    decryptMultiple,
    getDecryptedMessage,
    getDecryptionError,
    clearCache,
  };
}
