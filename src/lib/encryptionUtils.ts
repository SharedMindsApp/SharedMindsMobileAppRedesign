import { supabase } from './supabase';
import { EncryptedData } from './encryption';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function createEncryptedConversation(
  type: 'household' | 'direct' | 'group',
  participantIds: string[],
  encryptedKeys: Record<string, string>,
  options?: {
    householdId?: string;
    title?: string;
  }
): Promise<{ conversationId: string; success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { conversationId: '', success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-conversation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          participantIds,
          encryptedConversationKeys: encryptedKeys,
          householdId: options?.householdId,
          title: options?.title,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        conversationId: '',
        success: false,
        error: error.error || 'Failed to create conversation',
      };
    }

    const data = await response.json();
    return { conversationId: data.conversation.id, success: true };
  } catch (error) {
    return {
      conversationId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendEncryptedMessage(
  conversationId: string,
  encryptedData: EncryptedData,
  messageType: 'text' | 'system' | 'info' = 'text'
): Promise<{ messageId: string; success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { messageId: '', success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        messageType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        messageId: '',
        success: false,
        error: error.error || 'Failed to send message',
      };
    }

    const data = await response.json();
    return { messageId: data.message.id, success: true };
  } catch (error) {
    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchConversationsList(): Promise<{
  conversations: any[];
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { conversations: [], success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-conversations`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        conversations: [],
        success: false,
        error: error.error || 'Failed to fetch conversations',
      };
    }

    const data = await response.json();
    return { conversations: data.conversations || [], success: true };
  } catch (error) {
    return {
      conversations: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchConversationMessages(
  conversationId: string,
  options?: {
    limit?: number;
    before?: string;
  }
): Promise<{
  messages: any[];
  encryptedConversationKey: string;
  hasMore: boolean;
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return {
        messages: [],
        encryptedConversationKey: '',
        hasMore: false,
        success: false,
        error: 'Not authenticated',
      };
    }

    const params = new URLSearchParams({
      conversationId,
      limit: (options?.limit || 50).toString(),
    });

    if (options?.before) {
      params.append('before', options.before);
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-conversation-messages?${params}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        messages: [],
        encryptedConversationKey: '',
        hasMore: false,
        success: false,
        error: error.error || 'Failed to fetch messages',
      };
    }

    const data = await response.json();
    return {
      messages: data.messages || [],
      encryptedConversationKey: data.encryptedConversationKey || '',
      hasMore: data.hasMore || false,
      success: true,
    };
  } catch (error) {
    return {
      messages: [],
      encryptedConversationKey: '',
      hasMore: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getOrCreateHouseholdChat(
  householdId: string,
  encryptedKeys?: Record<string, string>
): Promise<{
  conversationId: string;
  created: boolean;
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return {
        conversationId: '',
        created: false,
        success: false,
        error: 'Not authenticated',
      };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-household-chat`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          householdId,
          encryptedConversationKeys: encryptedKeys,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        conversationId: '',
        created: false,
        success: false,
        error: error.error || 'Failed to get/create household chat',
      };
    }

    const data = await response.json();
    return {
      conversationId: data.conversation.id,
      created: data.created,
      success: true,
    };
  } catch (error) {
    return {
      conversationId: '',
      created: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addParticipantsToConversation(
  conversationId: string,
  participantIds: string[],
  encryptedKeys: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/add-conversation-participants`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          participantIds,
          encryptedConversationKeys: encryptedKeys,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to add participants',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function leaveConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/leave-conversation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to leave conversation',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function generateStrongPassphrase(): string {
  const words = [
    'correct',
    'horse',
    'battery',
    'staple',
    'mountain',
    'river',
    'forest',
    'ocean',
    'thunder',
    'lightning',
    'crystal',
    'diamond',
    'silver',
    'golden',
    'dragon',
    'phoenix',
  ];

  const randomWords = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    randomWords.push(words[randomIndex]);
  }

  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomWords.join('-')}-${randomNumber}`;
}

export function validatePassphraseStrength(passphrase: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (passphrase.length >= 12) {
    score += 2;
  } else if (passphrase.length >= 8) {
    score += 1;
    feedback.push('Passphrase should be at least 12 characters');
  } else {
    feedback.push('Passphrase is too short (minimum 8 characters)');
  }

  if (/[a-z]/.test(passphrase)) score += 1;
  if (/[A-Z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^a-zA-Z0-9]/.test(passphrase)) score += 1;

  if (score < 3) {
    feedback.push('Use a mix of letters, numbers, and symbols');
  }

  const isStrong = score >= 4 && passphrase.length >= 12;

  return { isStrong, score, feedback };
}
