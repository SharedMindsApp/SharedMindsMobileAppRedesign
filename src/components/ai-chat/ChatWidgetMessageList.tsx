import { useState, useEffect, useRef, useCallback } from 'react';
import { conversationService } from '../../lib/guardrails/ai/conversationService';
import { ChatWidgetDraftCard } from './ChatWidgetDraftCard';
import type { CurrentSurface, MessageWithDraft } from '../../lib/aiChatWidgetTypes';
import { Bot, User, AlertCircle, Loader, RefreshCw } from 'lucide-react';

interface ChatWidgetMessageListProps {
  conversationId: string;
  userId: string;
  currentSurface: CurrentSurface;
}

interface ThinkingState {
  show: boolean;
  userMessage?: string;
}

interface ErrorState {
  show: boolean;
  message: string;
  details?: string;
  userMessage?: string;
  isRetryable?: boolean;
}

export function ChatWidgetMessageList({
  conversationId,
  userId,
  currentSurface,
}: ChatWidgetMessageListProps) {
  const [messages, setMessages] = useState<MessageWithDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinkingState, setThinkingState] = useState<ThinkingState>({ show: false });
  const [errorState, setErrorState] = useState<ErrorState>({ show: false, message: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingState, errorState]);

  useEffect(() => {
    const handleAISending = () => {
      setThinkingState({ show: true });
      setErrorState({ show: false, message: '' });
    };

    const handleAIResponse = () => {
      setThinkingState({ show: false });
      setErrorState({ show: false, message: '' });
      loadMessages();
    };

    const handleAIError = (event: CustomEvent) => {
      setThinkingState({ show: false });
      setErrorState({
        show: true,
        message: event.detail.message || 'AI couldn\'t respond',
        details: event.detail.details,
        userMessage: event.detail.userMessage,
        isRetryable: event.detail.isRetryable !== false,
      });
    };

    window.addEventListener('ai-sending', handleAISending as EventListener);
    window.addEventListener('ai-response', handleAIResponse as EventListener);
    window.addEventListener('ai-error', handleAIError as EventListener);

    return () => {
      window.removeEventListener('ai-sending', handleAISending as EventListener);
      window.removeEventListener('ai-response', handleAIResponse as EventListener);
      window.removeEventListener('ai-error', handleAIError as EventListener);
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (errorState.userMessage) {
      window.dispatchEvent(
        new CustomEvent('ai-retry-message', {
          detail: { message: errorState.userMessage },
        })
      );
      setErrorState({ show: false, message: '' });
    }
  }, [errorState.userMessage]);

  async function loadMessages() {
    try {
      setLoading(true);
      const data = await conversationService.listMessages(
        { conversation_id: conversationId },
        userId
      );
      setMessages(data as MessageWithDraft[]);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-3">👋</div>
        <div className="text-sm font-medium text-gray-700 mb-1">Start a conversation</div>
        <div className="text-xs text-gray-500 max-w-xs">
          Ask questions about your {currentSurface.label.toLowerCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} userId={userId} />
      ))}

      {thinkingState.show && (
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100">
            <Bot className="w-4 h-4 text-purple-700" />
          </div>
          <div className="flex-1 max-w-[80%] bg-gray-100 text-gray-900 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="italic">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}

      {errorState.show && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-900 mb-1">AI couldn't respond</h4>
              <p className="text-sm text-red-800 mb-3">
                {errorState.message || 'Something went wrong while generating a response.'}
              </p>
              <p className="text-xs text-red-700 mb-3">
                Your message was not lost.
              </p>

              <div className="flex items-center gap-2">
                {errorState.isRetryable && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}

                {errorState.details && (
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer hover:underline">Details</summary>
                    <div className="mt-2 p-2 bg-red-100 rounded text-red-900">
                      {errorState.details}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithDraft;
  userId: string;
}

function MessageBubble({ message, userId }: MessageBubbleProps) {
  const isUser = message.sender_type === 'user';
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">{renderMessageContent(message.content)}</div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-100' : 'bg-purple-100'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-700" />
        ) : (
          <Bot className="w-4 h-4 text-purple-700" />
        )}
      </div>

      <div
        className={`flex-1 max-w-[80%] ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        } rounded-lg px-3 py-2`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {renderMessageContent(message.content)}
        </div>

        {message.linked_draft_id && message.draft && (
          <div className="mt-2">
            <ChatWidgetDraftCard draft={message.draft} userId={userId} />
          </div>
        )}

        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function renderMessageContent(content: any): React.ReactNode {
  if (typeof content === 'string') {
    return content;
  }

  if (typeof content === 'object' && content !== null) {
    if (content.text) {
      return content.text;
    }

    if (content.blocks && Array.isArray(content.blocks)) {
      return content.blocks.map((block: any, index: number) => {
        if (block.type === 'text') {
          return <div key={index}>{block.content}</div>;
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc list-inside mt-2">
              {block.items.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={index} className="bg-gray-800 text-gray-100 p-2 rounded mt-2 text-xs overflow-x-auto">
              {block.content}
            </pre>
          );
        }
        return null;
      });
    }

    return JSON.stringify(content);
  }

  return String(content);
}
