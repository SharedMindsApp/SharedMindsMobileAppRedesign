import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useSendMessage } from '../../hooks/useSendMessage';

interface MessageComposerProps {
  conversationId: string;
  onMessageSent?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function MessageComposer({
  conversationId,
  onMessageSent,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, sending, error } = useSendMessage(conversationId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    onTypingStop?.();

    const success = await sendMessage(message.trim());

    if (success) {
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onMessageSent?.();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.length > 0) {
      onTypingStart?.();
    } else {
      onTypingStop?.();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
