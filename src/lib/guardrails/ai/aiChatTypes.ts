export type MessageSenderType = 'user' | 'ai' | 'system';

export type MessageContentText = {
  text: string;
};

export type MessageContentBlock = {
  type: 'text' | 'code' | 'list' | 'heading';
  content: string;
  language?: string;
  level?: number;
};

export type MessageContentStructured = {
  blocks: MessageContentBlock[];
};

export type MessageContent = MessageContentText | MessageContentStructured;

export interface AIConversation {
  id: string;
  user_id: string;
  master_project_id: string | null;
  title: string | null;
  intent_context: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface AIChatMessage {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  content: MessageContent;
  intent: string | null;
  response_type: string | null;
  linked_draft_id: string | null;
  token_count: number;
  created_at: string;
}

export interface ConversationWithMetrics extends AIConversation {
  message_count: number;
  total_tokens: number;
  last_message_at: string | null;
}

export interface CreateConversationParams {
  user_id: string;
  master_project_id?: string | null;
  title?: string | null;
  intent_context?: string | null;
}

export interface CreateMessageParams {
  conversation_id: string;
  sender_type: MessageSenderType;
  content: MessageContent;
  intent?: string | null;
  response_type?: string | null;
  linked_draft_id?: string | null;
  token_count?: number;
}

export interface ConversationListFilters {
  user_id: string;
  master_project_id?: string | null;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface ConversationAnalytics {
  total_conversations: number;
  active_conversations: number;
  archived_conversations: number;
  total_messages: number;
  total_tokens: number;
  average_messages_per_conversation: number;
  draft_creation_rate: number;
}

export interface MessageListOptions {
  conversation_id: string;
  limit?: number;
  before_id?: string;
  after_id?: string;
}

export const MESSAGE_SENDER_TYPES: readonly MessageSenderType[] = ['user', 'ai', 'system'] as const;

export const DEFAULT_CONVERSATION_TITLE = 'New Conversation';

export function isTextContent(content: MessageContent): content is MessageContentText {
  return 'text' in content && typeof content.text === 'string';
}

export function isStructuredContent(content: MessageContent): content is MessageContentStructured {
  return 'blocks' in content && Array.isArray(content.blocks);
}

export function getMessageTextPreview(content: MessageContent, maxLength: number = 100): string {
  if (isTextContent(content)) {
    return content.text.length > maxLength
      ? content.text.substring(0, maxLength) + '...'
      : content.text;
  }

  if (isStructuredContent(content)) {
    const firstBlock = content.blocks[0];
    if (firstBlock) {
      return firstBlock.content.length > maxLength
        ? firstBlock.content.substring(0, maxLength) + '...'
        : firstBlock.content;
    }
  }

  return '';
}

export function createTextMessage(text: string): MessageContentText {
  return { text };
}

export function createStructuredMessage(blocks: MessageContentBlock[]): MessageContentStructured {
  return { blocks };
}

export interface ConversationContext {
  conversation_id: string;
  project_id: string | null;
  message_history: AIChatMessage[];
  current_intent: string | null;
}

export const CONVERSATION_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_HISTORY_FOR_CONTEXT: 10,
  MAX_ACTIVE_CONVERSATIONS_PER_USER: 50,
  MESSAGE_PREVIEW_LENGTH: 100,
} as const;

export const CHAT_SAFETY_RULES = {
  MESSAGES_APPEND_ONLY: true,
  MESSAGES_IMMUTABLE: true,
  NO_CROSS_USER_VISIBILITY: true,
  NO_AI_MEMORY_PERSISTENCE: true,
  NO_AUTONOMOUS_BEHAVIOR: true,
  DRAFT_REFERENCES_READ_ONLY: true,
  PROJECT_SCOPE_ENFORCED: true,
} as const;

export interface ConversationSafetyCheck {
  is_user_owner: boolean;
  has_project_access: boolean;
  is_within_rate_limit: boolean;
  violations: string[];
}

export function validateConversationTitle(title: string | null): { valid: boolean; error?: string } {
  if (title === null) {
    return { valid: true };
  }

  if (title.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if (title.length > CONVERSATION_CONSTRAINTS.MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title exceeds maximum length of ${CONVERSATION_CONSTRAINTS.MAX_TITLE_LENGTH} characters`,
    };
  }

  return { valid: true };
}

export function validateMessageContent(content: MessageContent): { valid: boolean; error?: string } {
  if (isTextContent(content)) {
    if (!content.text || content.text.trim().length === 0) {
      return { valid: false, error: 'Message text cannot be empty' };
    }
    return { valid: true };
  }

  if (isStructuredContent(content)) {
    if (!content.blocks || content.blocks.length === 0) {
      return { valid: false, error: 'Structured message must have at least one block' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Invalid message content format' };
}

export type ConversationEventType =
  | 'conversation_created'
  | 'conversation_archived'
  | 'conversation_restored'
  | 'message_sent'
  | 'draft_linked';

export interface ConversationEvent {
  type: ConversationEventType;
  conversation_id: string;
  user_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
