# SharedMinds Encryption System

## Overview

This encryption system provides end-to-end encryption for the SharedMinds messaging feature. All messages are encrypted on the client side and the server only stores encrypted data.

## Architecture

### Key Components

1. **User Encryption Keys**
   - Public/Private RSA-OAEP keypair (4096-bit)
   - Public key stored in `profile_keys` table
   - Private key encrypted with user passphrase and stored in `profile_keys` table
   - Decrypted private key ONLY stored in memory during active session

2. **Conversation Keys**
   - 256-bit AES-GCM symmetric keys (one per conversation)
   - Each participant receives the conversation key encrypted with their public key
   - Encrypted conversation keys stored in `conversation_participants` table

3. **Message Encryption**
   - Messages encrypted with conversation's AES-GCM key
   - Each message has unique nonce (12 bytes)
   - Stored as `ciphertext` + `nonce` in `messages` table

## Usage

### Setting Up Encryption for New Users

```typescript
import { initializeUserKeys } from './lib/encryptionHelpers';

// When user first signs up or needs to set up encryption
const passphrase = 'user-chosen-strong-passphrase';
const keys = await initializeUserKeys(passphrase);
// Keys are automatically stored in Supabase
```

### Unlocking Keys (Login)

```typescript
import { useEncryption } from './contexts/EncryptionContext';

function LoginComponent() {
  const { unlock, isUnlocked } = useEncryption();

  const handleUnlock = async (passphrase: string) => {
    try {
      await unlock(passphrase);
      // Keys now unlocked and available in memory
    } catch (error) {
      console.error('Invalid passphrase');
    }
  };

  return (
    <div>
      {!isUnlocked && (
        <input type="password" onChange={(e) => handleUnlock(e.target.value)} />
      )}
    </div>
  );
}
```

### Creating a New Conversation

```typescript
import { useEncryption } from './contexts/EncryptionContext';

function CreateConversationComponent() {
  const { prepareNewConversation } = useEncryption();

  const createConversation = async (participantIds: string[]) => {
    // Generate conversation key and encrypt for all participants
    const { conversationKey, encryptedKeys } = await prepareNewConversation(participantIds);

    // Send to backend
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-conversation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'group',
        participantIds,
        encryptedConversationKeys: encryptedKeys,
      }),
    });

    const { conversation } = await response.json();
    return conversation;
  };
}
```

### Encrypting and Sending Messages

```typescript
import { useEncryptMessage } from './contexts/EncryptionContext';

function SendMessageComponent({ conversationId }: { conversationId: string }) {
  const { encrypt, encrypting } = useEncryptMessage(conversationId);

  const sendMessage = async (message: string) => {
    // Encrypt the message
    const { ciphertext, nonce } = await encrypt(message);

    // Send to backend
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        ciphertext,
        nonce,
        messageType: 'text',
      }),
    });

    return response.json();
  };

  return (
    <div>
      <button onClick={() => sendMessage('Hello!')} disabled={encrypting}>
        Send
      </button>
    </div>
  );
}
```

### Decrypting and Displaying Messages

```typescript
import { useDecryptMessages } from './contexts/EncryptionContext';

function MessageListComponent({ conversationId, messages }: Props) {
  const { decryptMultiple, getDecryptedMessage, getDecryptionError } =
    useDecryptMessages(conversationId);

  useEffect(() => {
    // Decrypt all messages
    decryptMultiple(messages);
  }, [messages, decryptMultiple]);

  return (
    <div>
      {messages.map((msg) => {
        const plaintext = getDecryptedMessage(msg.id);
        const error = getDecryptionError(msg.id);

        return (
          <div key={msg.id}>
            {plaintext ? (
              <p>{plaintext}</p>
            ) : error ? (
              <p>Error: {error}</p>
            ) : (
              <p>Decrypting...</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Loading a Conversation Key

```typescript
import { useConversationKey } from './contexts/EncryptionContext';

function ConversationComponent({ conversationId }: { conversationId: string }) {
  const { conversationKey, loading, error } = useConversationKey(conversationId);

  if (loading) return <div>Loading encryption keys...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!conversationKey) return <div>No access to this conversation</div>;

  return <div>Ready to send/receive messages</div>;
}
```

## Security Best Practices

### DO

- ✅ Always check `isUnlocked` before encryption operations
- ✅ Lock keys on logout: `lock()`
- ✅ Clear sensitive data from memory when done
- ✅ Use strong passphrases (12+ characters, mixed case, numbers, symbols)
- ✅ Validate all inputs before encryption
- ✅ Handle encryption errors gracefully

### DON'T

- ❌ Store decrypted private keys in localStorage/sessionStorage
- ❌ Send plaintext messages to the server
- ❌ Log decrypted content
- ❌ Share encryption keys between users
- ❌ Reuse nonces for different messages
- ❌ Bypass the encryption layer

## Key Rotation (Placeholder)

The system is designed to support key rotation in the future:

1. New conversation key generated
2. Old messages remain encrypted with old key
3. New encrypted conversation keys distributed to all participants
4. Future messages use new key
5. Clients maintain cache of both old and new keys

Implementation coming in future update.

## Troubleshooting

### "Private key not unlocked"
User needs to call `unlock(passphrase)` first.

### "Conversation key not found"
User may not be a participant or RLS policy blocking access.

### "Failed to decrypt message"
- Wrong conversation key
- Corrupted ciphertext
- Incorrect nonce
- Key rotation occurred (future feature)

### "Invalid passphrase or corrupted keys"
User entered wrong passphrase or their keys are corrupted.

## Technical Details

### Algorithms

- **Asymmetric Encryption**: RSA-OAEP with SHA-256, 4096-bit keys
- **Symmetric Encryption**: AES-GCM, 256-bit keys
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **Encoding**: Base64 for all encrypted data

### Storage

- Public keys: `profile_keys.public_key` (base64)
- Encrypted private keys: `profile_keys.encrypted_private_key` (base64)
- Encrypted conversation keys: `conversation_participants.encrypted_conversation_key` (base64)
- Message ciphertext: `messages.ciphertext` (base64)
- Message nonces: `messages.nonce` (base64)

### In-Memory Caching

- Private key: Stored in React state via EncryptionContext
- Conversation keys: Stored in Map, indexed by conversation ID
- Decrypted messages: Stored in Map, indexed by message ID
- All cleared on logout or `lock()` call

## API Reference

### Core Functions (encryption.ts)

- `generateUserKeypair(passphrase)` - Generate new user keypair
- `unlockPrivateKey(encrypted, passphrase)` - Decrypt private key
- `generateConversationKey()` - Generate conversation key
- `encryptConversationKey(key, publicKey)` - Encrypt for recipient
- `decryptConversationKey(encrypted, privateKey)` - Decrypt conversation key
- `encryptMessage(message, key)` - Encrypt message text
- `decryptMessage(ciphertext, nonce, key)` - Decrypt message

### Helper Functions (encryptionHelpers.ts)

- `fetchUserKeys(profileId)` - Load keys from Supabase
- `fetchCurrentUserKeys()` - Load current user's keys
- `storeUserKeys(profileId, keys)` - Save keys to Supabase
- `initializeUserKeys(passphrase)` - Set up encryption for new user
- `fetchPublicKeys(profileIds)` - Batch load public keys
- `fetchEncryptedConversationKey(convId, profileId)` - Load conversation key
- `prepareEncryptedConversationKeys(participantIds)` - Prepare for new conversation

### React Hooks

- `useEncryption()` - Main encryption context
- `useConversationKey(conversationId)` - Load and cache conversation key
- `useEncryptMessage(conversationId)` - Encrypt messages for conversation
- `useDecryptMessage(conversationId)` - Decrypt single messages
- `useDecryptMessages(conversationId)` - Decrypt and cache multiple messages

## Performance Considerations

- RSA operations are slow (~100ms for 4096-bit keys)
- AES-GCM is fast (~1ms per message)
- Conversation keys are cached to avoid repeated RSA decryption
- Decrypted messages are cached to avoid repeated AES decryption
- Use `useDecryptMessages` for batch decryption of message lists

## Future Enhancements

- [ ] Key rotation support
- [ ] Backup key escrow (optional)
- [ ] Hardware security module (HSM) integration
- [ ] Biometric unlock
- [ ] Session timeout for automatic lock
- [ ] Multi-device key synchronization
- [ ] Forward secrecy (Double Ratchet algorithm)
