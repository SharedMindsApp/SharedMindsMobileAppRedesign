import { useState, useCallback } from 'react';
import { useEncryptMessage } from '../contexts/EncryptionContext';
import { sendEncryptedMessage } from '../lib/encryptionUtils';

export function useSendMessage(conversationId: string) {
  const { encrypt, encrypting } = useEncryptMessage(conversationId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      messageType: 'text' | 'system' | 'info' = 'text'
    ): Promise<boolean> => {
      if (!message.trim()) {
        setError('Message cannot be empty');
        return false;
      }

      setSending(true);
      setError(null);

      try {
        const encryptedData = await encrypt(message);

        const result = await sendEncryptedMessage(
          conversationId,
          encryptedData,
          messageType
        );

        if (result.success) {
          return true;
        } else {
          setError(result.error || 'Failed to send message');
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, encrypt]
  );

  return {
    sendMessage,
    sending: sending || encrypting,
    error,
  };
}
