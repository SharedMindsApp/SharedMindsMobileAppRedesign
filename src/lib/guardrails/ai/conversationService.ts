import { supabase } from '../../supabase';
import {
  assertAuthorityBoundary,
  assertPermissionBoundary,
  assertNoAntiPattern,
  InvariantViolationError,
} from '../SYSTEM_INVARIANTS';
import type {
  AIConversation,
  AIChatMessage,
  ConversationWithMetrics,
  CreateConversationParams,
  CreateMessageParams,
  ConversationListFilters,
  ConversationAnalytics,
  MessageListOptions,
  ConversationSafetyCheck,
  MessageContent,
} from './aiChatTypes';
import {
  validateConversationTitle,
  validateMessageContent,
  CONVERSATION_CONSTRAINTS,
  CHAT_SAFETY_RULES,
} from './aiChatTypes';
import { ChatSurfaceService } from './aiChatSurfaceService';
import type { ChatSurfaceType } from './aiChatSurfaceTypes';
import { EPHEMERAL_EXPIRY_HOURS } from './aiChatSurfaceTypes';

export async function getSurfaceLabel(
  surfaceType: ChatSurfaceType,
  masterProjectId: string | null
): Promise<string> {
  if (surfaceType === 'personal') {
    return 'Personal Space';
  }

  if (surfaceType === 'shared') {
    return 'Shared Space';
  }

  if (surfaceType === 'project' && masterProjectId) {
    const { data: project } = await supabase
      .from('master_projects')
      .select('name')
      .eq('id', masterProjectId)
      .maybeSingle();

    if (project?.name) {
      return project.name;
    }
    return 'Project';
  }

  return 'Chat';
}

export async function createConversation(
  params: CreateConversationParams,
  userId: string,
  surfaceType: ChatSurfaceType,
  isEphemeral: boolean = false
): Promise<AIConversation> {
  if (params.user_id !== userId) {
    throw new InvariantViolationError(
      'CONVERSATION_OWNERSHIP',
      { params, userId },
      'User can only create conversations for themselves'
    );
  }

  if (!surfaceType) {
    throw new InvariantViolationError(
      'CONVERSATION_SURFACE_REQUIRED',
      { params },
      'Every conversation must have a surface type'
    );
  }

  const titleValidation = validateConversationTitle(params.title || null);
  if (!titleValidation.valid) {
    throw new Error(titleValidation.error);
  }

  let defaultTitle = 'New Chat';
  if (!params.title) {
    const surfaceLabel = await getSurfaceLabel(surfaceType, params.master_project_id || null);
    defaultTitle = `New Chat — ${surfaceLabel}`;
  }

  const result = await ChatSurfaceService.createConversation({
    userId,
    surfaceType,
    masterProjectId: params.master_project_id,
    title: params.title || defaultTitle,
    isEphemeral,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to create conversation');
  }

  const { data } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', result.conversationId!)
    .single();

  if (!data) {
    throw new Error('Failed to retrieve created conversation');
  }

  return data;
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<AIConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listConversations(
  filters: ConversationListFilters
): Promise<ConversationWithMetrics[]> {
  let query = supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', filters.user_id)
    .order('created_at', { ascending: false });

  if (filters.master_project_id !== undefined) {
    if (filters.master_project_id === null) {
      query = query.is('master_project_id', null);
    } else {
      query = query.eq('master_project_id', filters.master_project_id);
    }
  }

  if (!filters.include_archived) {
    query = query.is('archived_at', null);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  const conversationsWithMetrics = await Promise.all(
    data.map(async (conv) => {
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('created_at, token_count')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false });

      const message_count = messages?.length || 0;
      const total_tokens = messages?.reduce((sum, m) => sum + (m.token_count || 0), 0) || 0;
      const last_message_at = messages?.[0]?.created_at || null;

      return {
        ...conv,
        message_count,
        total_tokens,
        last_message_at,
      };
    })
  );

  return conversationsWithMetrics;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
  userId: string
): Promise<AIConversation> {
  const titleValidation = validateConversationTitle(title);
  if (!titleValidation.valid) {
    throw new Error(titleValidation.error);
  }

  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ title })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function generateDeterministicTitleFromMessage(
  messageText: string
): Promise<string> {
  const text = messageText.trim();

  if (!text) {
    return 'New Chat';
  }

  let cleaned = text
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 40) {
    cleaned = cleaned.substring(0, 40).trim() + '…';
  }

  if (cleaned.length === 0) {
    return 'New Chat';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export async function autoRenameFromFirstMessage(
  conversationId: string,
  firstMessageText: string,
  userId: string
): Promise<AIConversation | null> {
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    return null;
  }

  const convWithFlags = conversation as any;

  if (convWithFlags.user_renamed === true) {
    return conversation;
  }

  if (convWithFlags.auto_named_from_first_message === true) {
    return conversation;
  }

  const newTitle = await generateDeterministicTitleFromMessage(firstMessageText);

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({
      title: newTitle,
      auto_named_from_first_message: true,
    })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .eq('user_renamed', false)
    .eq('auto_named_from_first_message', false)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Failed to auto-rename conversation:', error);
    return conversation;
  }

  return data || conversation;
}

export async function manualRenameConversation(
  conversationId: string,
  newTitle: string,
  userId: string
): Promise<AIConversation> {
  const titleValidation = validateConversationTitle(newTitle);
  if (!titleValidation.valid) {
    throw new Error(titleValidation.error);
  }

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    throw new Error('Title cannot be empty');
  }

  if (trimmedTitle.length > 200) {
    throw new Error('Title cannot exceed 200 characters');
  }

  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({
      title: trimmedTitle,
      user_renamed: true,
    })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<AIConversation> {
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function restoreConversation(
  conversationId: string,
  userId: string
): Promise<AIConversation> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ archived_at: null })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createMessage(
  params: CreateMessageParams,
  userId: string
): Promise<AIChatMessage> {
  const conversation = await getConversation(params.conversation_id, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const contentValidation = validateMessageContent(params.content);
  if (!contentValidation.valid) {
    throw new Error(contentValidation.error);
  }

  if (params.sender_type === 'ai') {
    try {
      assertNoAntiPattern('NO_AI_DIRECT_WRITE', {
        operation: 'create_message',
        sender_type: 'ai',
      });
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        throw new Error('AI messages must be created through AI assistant service');
      }
      throw error;
    }
  }

  if (params.linked_draft_id) {
    const { data: draft } = await supabase
      .from('ai_drafts')
      .select('id')
      .eq('id', params.linked_draft_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!draft) {
      throw new Error('Linked draft not found or access denied');
    }
  }

  const { data: existingMessages } = await supabase
    .from('ai_chat_messages')
    .select('id, sender_type')
    .eq('conversation_id', params.conversation_id)
    .limit(1);

  const isFirstMessage = !existingMessages || existingMessages.length === 0;
  const isUserMessage = params.sender_type === 'user';

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      conversation_id: params.conversation_id,
      sender_type: params.sender_type,
      content: params.content as any,
      intent: params.intent || null,
      response_type: params.response_type || null,
      linked_draft_id: params.linked_draft_id || null,
      token_count: params.token_count || 0,
    })
    .select()
    .single();

  if (error) throw error;

  if (isFirstMessage && isUserMessage && params.content) {
    const messageText = typeof params.content === 'string'
      ? params.content
      : (params.content as any).text || '';

    if (messageText) {
      await autoRenameFromFirstMessage(
        params.conversation_id,
        messageText,
        userId
      ).catch((err) => {
        console.warn('Auto-rename failed:', err);
      });
    }
  }

  return data;
}

export async function listMessages(
  options: MessageListOptions,
  userId: string
): Promise<AIChatMessage[]> {
  const conversation = await getConversation(options.conversation_id, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  let query = supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('conversation_id', options.conversation_id)
    .order('created_at', { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.before_id) {
    const { data: beforeMessage } = await supabase
      .from('ai_chat_messages')
      .select('created_at')
      .eq('id', options.before_id)
      .maybeSingle();

    if (beforeMessage) {
      query = query.lt('created_at', beforeMessage.created_at);
    }
  }

  if (options.after_id) {
    const { data: afterMessage } = await supabase
      .from('ai_chat_messages')
      .select('created_at')
      .eq('id', options.after_id)
      .maybeSingle();

    if (afterMessage) {
      query = query.gt('created_at', afterMessage.created_at);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getRecentMessages(
  conversationId: string,
  userId: string,
  limit: number = CONVERSATION_CONSTRAINTS.MAX_MESSAGE_HISTORY_FOR_CONTEXT
): Promise<AIChatMessage[]> {
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).reverse();
}

export async function getConversationAnalytics(userId: string): Promise<ConversationAnalytics> {
  const { data: conversations } = await supabase
    .from('ai_conversations')
    .select('id, archived_at')
    .eq('user_id', userId);

  const total_conversations = conversations?.length || 0;
  const active_conversations = conversations?.filter((c) => !c.archived_at).length || 0;
  const archived_conversations = total_conversations - active_conversations;

  const { data: messages } = await supabase
    .from('ai_chat_messages')
    .select('token_count, linked_draft_id, conversation_id')
    .in(
      'conversation_id',
      conversations?.map((c) => c.id) || []
    );

  const total_messages = messages?.length || 0;
  const total_tokens = messages?.reduce((sum, m) => sum + (m.token_count || 0), 0) || 0;
  const messages_with_drafts = messages?.filter((m) => m.linked_draft_id !== null).length || 0;

  return {
    total_conversations,
    active_conversations,
    archived_conversations,
    total_messages,
    total_tokens,
    average_messages_per_conversation:
      total_conversations > 0 ? total_messages / total_conversations : 0,
    draft_creation_rate: total_messages > 0 ? messages_with_drafts / total_messages : 0,
  };
}

export async function getUserActiveConversationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ai_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('archived_at', null);

  if (error) throw error;
  return count || 0;
}

export async function checkConversationSafety(
  conversationId: string,
  userId: string,
  projectId: string | null
): Promise<ConversationSafetyCheck> {
  const violations: string[] = [];

  const conversation = await getConversation(conversationId, userId);
  const is_user_owner = !!conversation;

  if (!is_user_owner) {
    violations.push('User is not the owner of this conversation');
  }

  let has_project_access = true;
  if (projectId && conversation?.master_project_id) {
    const { data: projectAccess } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('master_project_id', conversation.master_project_id)
      .eq('user_id', userId)
      .maybeSingle();

    has_project_access = !!projectAccess;

    if (!has_project_access) {
      violations.push('User does not have access to conversation project');
    }
  }

  const is_within_rate_limit = true;

  return {
    is_user_owner,
    has_project_access,
    is_within_rate_limit,
    violations,
  };
}

export async function getConversationContext(
  conversationId: string,
  userId: string
): Promise<{
  conversation: AIConversation;
  recent_messages: AIChatMessage[];
  message_count: number;
  total_tokens: number;
}> {
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const recent_messages = await getRecentMessages(conversationId, userId);

  const { data: allMessages } = await supabase
    .from('ai_chat_messages')
    .select('token_count')
    .eq('conversation_id', conversationId);

  const message_count = allMessages?.length || 0;
  const total_tokens = allMessages?.reduce((sum, m) => sum + (m.token_count || 0), 0) || 0;

  return {
    conversation,
    recent_messages,
    message_count,
    total_tokens,
  };
}

export function enforceChatSafetyRules(): void {
  if (!CHAT_SAFETY_RULES.MESSAGES_APPEND_ONLY) {
    throw new InvariantViolationError(
      'MESSAGES_APPEND_ONLY',
      {},
      'Messages must be append-only'
    );
  }

  if (!CHAT_SAFETY_RULES.MESSAGES_IMMUTABLE) {
    throw new InvariantViolationError(
      'MESSAGES_IMMUTABLE',
      {},
      'Messages must be immutable'
    );
  }

  if (!CHAT_SAFETY_RULES.NO_CROSS_USER_VISIBILITY) {
    throw new InvariantViolationError(
      'NO_CROSS_USER_VISIBILITY',
      {},
      'Conversations cannot be shared between users'
    );
  }

  if (!CHAT_SAFETY_RULES.NO_AI_MEMORY_PERSISTENCE) {
    throw new InvariantViolationError(
      'NO_AI_MEMORY_PERSISTENCE',
      {},
      'AI cannot persist memory beyond conversation history'
    );
  }

  if (!CHAT_SAFETY_RULES.NO_AUTONOMOUS_BEHAVIOR) {
    throw new InvariantViolationError(
      'NO_AUTONOMOUS_BEHAVIOR',
      {},
      'AI cannot take autonomous actions'
    );
  }
}

export async function validateConversationSurface(
  conversationId: string,
  userId: string
): Promise<{ valid: boolean; error?: string; surfaceType?: ChatSurfaceType; masterProjectId?: string | null }> {
  const conversation = await getConversation(conversationId, userId);

  if (!conversation) {
    return { valid: false, error: 'Conversation not found or access denied' };
  }

  const surfaceType = (conversation as any).surface_type as ChatSurfaceType;
  const masterProjectId = (conversation as any).master_project_id as string | null;

  if (!surfaceType) {
    throw new InvariantViolationError(
      'CONVERSATION_MISSING_SURFACE',
      { conversationId },
      'Conversation must have a surface type'
    );
  }

  const validation = await ChatSurfaceService.validateSurface({
    surfaceType,
    masterProjectId,
  });

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error?.message || 'Invalid surface configuration',
    };
  }

  return {
    valid: true,
    surfaceType,
    masterProjectId,
  };
}

export function enforceNoSurfaceSwitching(
  currentSurfaceType: ChatSurfaceType,
  currentProjectId: string | null,
  requestedSurfaceType: ChatSurfaceType,
  requestedProjectId: string | null
): void {
  if (currentSurfaceType !== requestedSurfaceType) {
    throw new InvariantViolationError(
      'SURFACE_SWITCHING_FORBIDDEN',
      { currentSurfaceType, requestedSurfaceType },
      'Cannot switch surface type within a conversation'
    );
  }

  if (currentSurfaceType === 'project') {
    if (currentProjectId !== requestedProjectId) {
      throw new InvariantViolationError(
        'PROJECT_SWITCHING_FORBIDDEN',
        { currentProjectId, requestedProjectId },
        'Cannot switch projects within a conversation'
      );
    }
  }
}

export function enforceNoGlobalChat(): void {
  throw new InvariantViolationError(
    'NO_GLOBAL_CHAT',
    {},
    'Global AI chat is not allowed. All conversations must be surface-scoped'
  );
}

export async function getConversationSurface(
  conversationId: string,
  userId: string
): Promise<{ surfaceType: ChatSurfaceType; masterProjectId: string | null } | null> {
  const conversation = await getConversation(conversationId, userId);

  if (!conversation) {
    return null;
  }

  return {
    surfaceType: (conversation as any).surface_type as ChatSurfaceType,
    masterProjectId: (conversation as any).master_project_id as string | null,
  };
}

export const conversationService = {
  createConversation,
  getConversation,
  listConversations,
  updateConversationTitle,
  manualRenameConversation,
  autoRenameFromFirstMessage,
  generateDeterministicTitleFromMessage,
  getSurfaceLabel,
  archiveConversation,
  restoreConversation,
  createMessage,
  listMessages,
  getRecentMessages,
  getConversationAnalytics,
  getUserActiveConversationCount,
  checkConversationSafety,
  getConversationContext,
  enforceChatSafetyRules,
  validateConversationSurface,
  enforceNoSurfaceSwitching,
  enforceNoGlobalChat,
  getConversationSurface,
};

export default conversationService;
