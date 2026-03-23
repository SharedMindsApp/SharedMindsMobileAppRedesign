import { aiExecutionService } from './aiExecutionService';
import { conversationService } from './conversationService';
import { buildContextForProject } from './aiContextAssembly';
import type { CurrentSurface } from '../../aiChatWidgetTypes';
import type { ChatSurfaceType } from './aiChatSurfaceTypes';

export interface ChatExecutionRequest {
  conversationId: string;
  userMessage: string;
  userId: string;
  currentSurface: CurrentSurface;
}

export interface ChatExecutionResult {
  success: boolean;
  aiMessageId?: string;
  error?: string;
  errorDetails?: string;
}

function buildSystemPrompt(surfaceType: ChatSurfaceType, surfaceLabel: string, contextData?: any): string {
  let basePrompt = `You are a helpful AI assistant integrated into the Guardrails project management system.

Current context:
- Surface: ${surfaceLabel}
- Surface Type: ${surfaceType}

`;

  if (surfaceType === 'personal') {
    basePrompt += `This is the user's personal space for tracking their individual consumption of Guardrails projects and activities. Help them understand their personal progress, insights, and usage patterns.

`;
  } else if (surfaceType === 'shared') {
    basePrompt += `This is a shared space for collaboration. Help users coordinate, share information, and work together on shared tracks and activities.

`;
  } else if (surfaceType === 'project' && contextData) {
    basePrompt += `This is a specific project workspace.

Project Information:
- Name: ${contextData.project?.name || 'Unknown'}
- Status: ${contextData.project?.status || 'active'}

`;

    if (contextData.tracks && contextData.tracks.length > 0) {
      basePrompt += `\nTracks (${contextData.tracks.length}):
${contextData.tracks.map((t: any) => `  - ${t.name}: ${t.itemCount || 0} items`).join('\n')}

`;
    }

    if (contextData.deadlines && contextData.deadlines.length > 0) {
      const upcomingDeadlines = contextData.deadlines.filter((d: any) => !d.isOverdue).slice(0, 5);
      if (upcomingDeadlines.length > 0) {
        basePrompt += `\nUpcoming Deadlines:
${upcomingDeadlines.map((d: any) => `  - ${d.itemTitle}: ${d.daysUntilDeadline} days`).join('\n')}

`;
      }
    }

    if (contextData.taskFlow) {
      basePrompt += `\nTask Flow: ${contextData.taskFlow.taskCount} tasks
Status breakdown: ${Object.entries(contextData.taskFlow.statusBreakdown || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}

`;
    }
  }

  basePrompt += `Provide helpful, concise, and actionable responses. When relevant, reference specific data from the context above.`;

  return basePrompt;
}

export class AIChatExecutionHandler {
  async handleUserMessage(request: ChatExecutionRequest): Promise<ChatExecutionResult> {
    console.log('[AI CHAT HANDLER] Starting execution', {
      conversationId: request.conversationId,
      surfaceType: request.currentSurface.surfaceType,
      projectId: request.currentSurface.masterProjectId,
      messageLength: request.userMessage.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const conversation = await conversationService.getConversation(
        request.conversationId,
        request.userId
      );

      if (!conversation) {
        console.error('[AI CHAT HANDLER] Conversation not found', {
          conversationId: request.conversationId,
          userId: request.userId,
        });
        throw new Error('Conversation not found');
      }

      const surfaceType = (conversation as any).surface_type as ChatSurfaceType;
      const masterProjectId = (conversation as any).master_project_id as string | null;

      console.log('[AI CHAT HANDLER] Conversation loaded', {
        conversationId: request.conversationId,
        surfaceType,
        masterProjectId,
        title: conversation.title,
      });

      const recentMessages = await conversationService.getRecentMessages(
        request.conversationId,
        request.userId,
        10
      );

      console.log('[AI CHAT HANDLER] Retrieved recent messages', {
        messageCount: recentMessages.length,
        userMessageCount: recentMessages.filter(m => m.sender_type === 'user').length,
        aiMessageCount: recentMessages.filter(m => m.sender_type === 'ai').length,
      });

      const conversationHistory = recentMessages.map((msg) => ({
        role: (msg.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : (msg.content as any)?.text || '',
      }));

      let contextData: any = {};
      if (surfaceType === 'project' && masterProjectId) {
        console.log('[AI CHAT HANDLER] Fetching project context', {
          projectId: masterProjectId,
        });

        try {
          contextData = await buildContextForProject(masterProjectId, request.userId);
          console.log('[AI CHAT HANDLER] Project context assembled', {
            hasProject: !!contextData.project,
            trackCount: contextData.tracks?.length || 0,
            roadmapItemCount: contextData.roadmapItems?.length || 0,
            deadlineCount: contextData.deadlines?.length || 0,
            taskCount: contextData.taskFlow?.taskCount || 0,
          });
        } catch (err) {
          console.warn('[AI CHAT HANDLER] Failed to fetch project context', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const systemPrompt = buildSystemPrompt(
        surfaceType,
        request.currentSurface.label,
        contextData
      );

      console.log('[AI CHAT HANDLER] System prompt built', {
        promptLength: systemPrompt.length,
        surfaceType,
      });

      console.log('[AI CHAT HANDLER] Calling aiExecutionService.execute', {
        intent: 'general_question',
        featureKey: 'ai_chat',
        surfaceType,
        projectId: masterProjectId,
        hasSystemPrompt: systemPrompt.length > 0,
        hasUserPrompt: request.userMessage.length > 0,
        conversationHistoryLength: conversationHistory.length,
      });

      const executionResult = await aiExecutionService.execute({
        userId: request.userId,
        projectId: masterProjectId || undefined,
        intent: 'general_question',
        featureKey: 'ai_chat',
        surfaceType: surfaceType as any,
        conversationId: request.conversationId,
        systemPrompt,
        userPrompt: request.userMessage,
        messages: conversationHistory,
        contextSnapshot: contextData,
        temperature: 0.7,
      });

      console.log('[AI CHAT HANDLER] AI execution successful', {
        responseLength: executionResult.text.length,
        inputTokens: executionResult.tokenUsage?.inputTokens,
        outputTokens: executionResult.tokenUsage?.outputTokens,
        totalTokens: executionResult.tokenUsage?.totalTokens,
        latencyMs: executionResult.latencyMs,
        auditId: executionResult.auditId,
      });

      const aiMessage = await conversationService.createMessage(
        {
          conversation_id: request.conversationId,
          sender_type: 'ai',
          content: { text: executionResult.text },
          intent: 'general_question',
          response_type: 'conversational',
          token_count: executionResult.tokenUsage?.totalTokens || 0,
        },
        request.userId
      );

      console.log('[AI CHAT HANDLER] AI message saved to database', {
        messageId: aiMessage.id,
        conversationId: request.conversationId,
        tokenCount: aiMessage.token_count,
      });

      return {
        success: true,
        aiMessageId: aiMessage.id,
      };
    } catch (error) {
      console.error('[AI CHAT HANDLER] Execution failed', {
        conversationId: request.conversationId,
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI execution failed',
        errorDetails: error instanceof Error ? error.stack : String(error),
      };
    }
  }
}

export const aiChatExecutionHandler = new AIChatExecutionHandler();
