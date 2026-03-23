import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { conversationService } from '../../lib/guardrails/ai/conversationService';
import { createConversation } from '../../lib/guardrails/ai/conversationService';
import { aiChatExecutionHandler } from '../../lib/guardrails/ai/aiChatExecutionHandler';
import type { CurrentSurface } from '../../lib/aiChatWidgetTypes';

interface ChatWidgetComposerProps {
  conversationId: string | null;
  userId: string;
  currentSurface: CurrentSurface;
  onConversationCreated?: (conversationId: string) => void;
  disabled?: boolean;
}

export function ChatWidgetComposer({
  conversationId,
  userId,
  currentSurface,
  onConversationCreated,
  disabled = false,
}: ChatWidgetComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = message.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const afterAt = text.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length > 0) {
        setTagQuery(afterAt);
        setShowTagSuggestions(true);
      } else if (afterAt.length === 0) {
        setShowTagSuggestions(true);
        setTagQuery('');
      } else {
        setShowTagSuggestions(false);
      }
    } else {
      setShowTagSuggestions(false);
    }
  }, [message, cursorPosition]);

  useEffect(() => {
    const handleRetry = (event: CustomEvent) => {
      const retryMessage = event.detail.message;
      if (retryMessage && !sending) {
        setMessage(retryMessage);
        setTimeout(() => {
          handleSend();
        }, 100);
      }
    };

    window.addEventListener('ai-retry-message', handleRetry as EventListener);

    return () => {
      window.removeEventListener('ai-retry-message', handleRetry as EventListener);
    };
  }, [sending]);

  function adjustTextareaHeight() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }

  async function handleSend() {
    if (!message.trim() || sending) return;

    // Safety guard: prevent sending during surface transitions
    if (disabled) {
      console.warn('[AI COMPOSER SAFETY] Blocked message send during surface transition');
      return;
    }

    const userMessage = message.trim();

    console.log('[AI COMPOSER] send initiated', {
      surfaceType: currentSurface.surfaceType,
      projectId: currentSurface.masterProjectId,
      messageLength: userMessage.length,
      hasConversation: !!conversationId,
    });

    try {
      setSending(true);
      window.dispatchEvent(new CustomEvent('ai-sending', { detail: { message: userMessage } }));

      let targetConversationId = conversationId;

      if (!targetConversationId) {
        console.log('[AI COMPOSER] Creating new conversation');
        const newConversation = await createConversation(
          {
            user_id: userId,
            title: 'New Conversation',
            master_project_id: currentSurface.masterProjectId,
          },
          userId,
          currentSurface.surfaceType,
          true
        );

        targetConversationId = newConversation.id;
        console.log('[AI COMPOSER] New conversation created', {
          conversationId: targetConversationId,
        });
        onConversationCreated?.(targetConversationId);
      }

      console.log('[AI COMPOSER] Saving user message to database');
      await conversationService.createMessage(
        {
          conversation_id: targetConversationId,
          sender_type: 'user',
          content: { text: userMessage },
        },
        userId
      );

      setMessage('');
      setShowTagSuggestions(false);

      console.log('[AI COMPOSER] User message saved, dispatching ai-message-sent event');
      window.dispatchEvent(new CustomEvent('ai-message-sent', { detail: { conversationId: targetConversationId } }));

      console.log('[AI COMPOSER] Calling AI execution handler');
      const result = await aiChatExecutionHandler.handleUserMessage({
        conversationId: targetConversationId,
        userMessage,
        userId,
        currentSurface,
      });

      if (result.success) {
        console.log('[AI COMPOSER] AI execution successful, dispatching ai-response event', {
          aiMessageId: result.aiMessageId,
        });
        window.dispatchEvent(new CustomEvent('ai-response', { detail: { conversationId: targetConversationId } }));
      } else {
        console.error('[AI COMPOSER] AI execution failed', {
          error: result.error,
          details: result.errorDetails,
        });
        throw new Error(result.error || 'AI execution failed');
      }
    } catch (error) {
      console.error('[AI COMPOSER] Failed to complete message flow:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';

      window.dispatchEvent(
        new CustomEvent('ai-error', {
          detail: {
            message: errorMessage,
            details: error instanceof Error ? error.message : String(error),
            userMessage,
            isRetryable: true,
          },
        })
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
    setCursorPosition(e.target.selectionStart);
  }

  function handleSelectionChange() {
    const textarea = textareaRef.current;
    if (textarea) {
      setCursorPosition(textarea.selectionStart);
    }
  }

  function insertTag(tag: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = message;
    const lastAtIndex = text.slice(0, cursorPosition).lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const before = text.slice(0, lastAtIndex);
      const after = text.slice(cursorPosition);
      const newText = before + '@' + tag + ' ' + after;

      setMessage(newText);
      setShowTagSuggestions(false);

      setTimeout(() => {
        const newPosition = before.length + tag.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  }

  const tagSuggestions = getTagSuggestions(tagQuery, currentSurface);

  return (
    <div className="border-t border-gray-200 p-3 bg-white">
      {showTagSuggestions && tagSuggestions.length > 0 && (
        <div className="mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {tagSuggestions.map((suggestion) => (
            <button
              key={suggestion.value}
              onClick={() => insertTag(suggestion.value)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">@{suggestion.value}</div>
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          placeholder={disabled ? 'Switching projects...' : `Ask about ${currentSurface.label.toLowerCase()}... (use @ to tag entities)`}
          disabled={sending || disabled}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
          rows={1}
          aria-label="Message input"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center transition-colors"
          aria-label="Send message"
          title="Send (Enter)"
        >
          {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd>{' '}
        to send,{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
          Shift+Enter
        </kbd>{' '}
        for new line
      </div>
    </div>
  );
}

function getTagSuggestions(
  query: string,
  currentSurface: CurrentSurface
): Array<{ value: string; description: string }> {
  const allSuggestions: Array<{ value: string; description: string }> = [];

  if (currentSurface.surfaceType === 'project') {
    allSuggestions.push(
      { value: 'project', description: 'Current project' },
      { value: 'tracks', description: 'All tracks in project' },
      { value: 'roadmap', description: 'All roadmap items' },
      { value: 'deadlines', description: 'Upcoming deadlines' },
      { value: 'mindmesh', description: 'Mind mesh nodes' },
      { value: 'taskflow', description: 'Task flow tasks' },
      { value: 'people', description: 'Project team members' }
    );
  }

  if (currentSurface.surfaceType === 'personal') {
    allSuggestions.push(
      { value: 'consumed', description: 'Consumed Guardrails data' },
      { value: 'progress', description: 'Personal progress summary' }
    );
  }

  if (currentSurface.surfaceType === 'shared') {
    allSuggestions.push(
      { value: 'shared-tracks', description: 'Shared tracks' },
      { value: 'collaboration', description: 'Collaboration activity' }
    );
  }

  if (!query) return allSuggestions;

  const lowerQuery = query.toLowerCase();
  return allSuggestions.filter(
    (s) => s.value.toLowerCase().includes(lowerQuery) || s.description.toLowerCase().includes(lowerQuery)
  );
}
