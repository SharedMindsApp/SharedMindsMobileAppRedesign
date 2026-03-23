const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_SIZE = 256;
const RSA_KEY_SIZE = 4096;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
}

export interface UserKeypair {
  publicKey: string;
  encryptedPrivateKey: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: KEY_SIZE },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateUserKeypair(
  passphrase: string
): Promise<UserKeypair> {
  const keypair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey(
    'spki',
    keypair.publicKey
  );
  const publicKey = arrayBufferToBase64(publicKeyBuffer);

  const privateKeyBuffer = await crypto.subtle.exportKey(
    'pkcs8',
    keypair.privateKey
  );

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptionKey = await deriveKeyFromPassphrase(passphrase, salt);

  const encryptedPrivateKeyBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    privateKeyBuffer
  );

  const combined = new Uint8Array(
    salt.length + iv.length + encryptedPrivateKeyBuffer.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(
    new Uint8Array(encryptedPrivateKeyBuffer),
    salt.length + iv.length
  );

  const encryptedPrivateKey = arrayBufferToBase64(combined.buffer);

  return {
    publicKey,
    encryptedPrivateKey,
  };
}

export async function unlockPrivateKey(
  encryptedPrivateKey: string,
  passphrase: string
): Promise<CryptoKey> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedPrivateKey));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH);

  const decryptionKey = await deriveKeyFromPassphrase(passphrase, salt);

  const privateKeyBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    decryptionKey,
    encryptedData
  );

  return crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['decrypt']
  );
}

export async function generateConversationKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: KEY_SIZE,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptConversationKey(
  conversationKey: CryptoKey,
  publicKeyBase64: string
): Promise<string> {
  const conversationKeyBuffer = await crypto.subtle.exportKey(
    'raw',
    conversationKey
  );

  const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );

  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    conversationKeyBuffer
  );

  return arrayBufferToBase64(encryptedKeyBuffer);
}

export async function decryptConversationKey(
  encryptedKey: string,
  userPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKey);

  const conversationKeyBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    userPrivateKey,
    encryptedKeyBuffer
  );

  return crypto.subtle.importKey(
    'raw',
    conversationKeyBuffer,
    {
      name: 'AES-GCM',
      length: KEY_SIZE,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  message: string,
  conversationKey: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const messageBuffer = encoder.encode(message);

  const nonce = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    conversationKey,
    messageBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    nonce: arrayBufferToBase64(nonce.buffer),
  };
}

export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  conversationKey: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const nonceBuffer = base64ToArrayBuffer(nonce);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBuffer) },
    conversationKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

export async function exportConversationKey(
  conversationKey: CryptoKey
): Promise<string> {
  const keyBuffer = await crypto.subtle.exportKey('raw', conversationKey);
  return arrayBufferToBase64(keyBuffer);
}

export async function importConversationKey(
  keyBase64: string
): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: KEY_SIZE,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptConversationKeyForMultipleRecipients(
  conversationKey: CryptoKey,
  publicKeys: Record<string, string>
): Promise<Record<string, string>> {
  const encryptedKeys: Record<string, string> = {};

  for (const [profileId, publicKey] of Object.entries(publicKeys)) {
    encryptedKeys[profileId] = await encryptConversationKey(
      conversationKey,
      publicKey
    );
  }

  return encryptedKeys;
}
