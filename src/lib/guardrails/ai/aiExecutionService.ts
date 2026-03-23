import type { NormalizedAIRequest, NormalizedAIResponse, StreamCallback } from './providerAdapter';
import { aiRoutingService } from './aiRoutingService';
import { getProviderAdapter } from './providerFactory';
import type { FeatureKey, SurfaceType } from './providerRegistryTypes';
import { INTENT_TO_FEATURE_MAP } from './providerRegistryTypes';
import { supabase } from '../../supabase';
import { normalizeError, logAIError, type AIExecutionError } from './aiErrorTypes';

import type { ReasoningLevel } from './providerAdapter';

export interface AIExecutionRequest {
  userId: string;
  projectId?: string;
  intent: string;
  featureKey?: FeatureKey;
  surfaceType?: SurfaceType;
  conversationId?: string;
  systemPrompt: string;
  userPrompt: string;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  contextSnapshot?: Record<string, any>;
  tagsResolutionSummary?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningLevel?: ReasoningLevel; // Admin-selectable preset for OpenAI models
}

export interface AIExecutionResult extends NormalizedAIResponse {
  auditId?: string;
}

export class AIExecutionService {
  async execute(request: AIExecutionRequest): Promise<AIExecutionResult> {
    const featureKey = request.featureKey || this.inferFeatureKey(request.intent);
    const startTime = Date.now();

    console.info('[AI EXECUTION] start', {
      userId: request.userId,
      projectId: request.projectId,
      intent: request.intent,
      featureKey,
      surfaceType: request.surfaceType,
      conversationId: request.conversationId,
    });

    try {
      const route = await aiRoutingService.resolveRoute({
        featureKey,
        surfaceType: request.surfaceType,
        intent: request.intent,
        userId: request.userId,
        projectId: request.projectId,
      });

      console.info('[AI ROUTE] resolved', {
        provider: route.provider,
        model: route.modelKey,
        routeId: route.routeId,
        featureKey,
        intent: request.intent,
      });

      const adapter = getProviderAdapter(route.provider);

      const messages = request.messages || [];
      if (messages.length === 0 || messages[messages.length - 1].content !== request.userPrompt) {
        messages.push({ role: 'user', content: request.userPrompt });
      }

      const normalizedRequest: NormalizedAIRequest = {
        provider: route.provider,
        modelKey: route.modelKey,
        intent: request.intent,
        featureKey,
        surfaceType: request.surfaceType,
        conversationId: request.conversationId,
        messages,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        contextSnapshot: request.contextSnapshot,
        budgets: {
          maxInputTokens: route.constraints.maxContextTokens,
          maxOutputTokens: route.constraints.maxOutputTokens,
        },
        tagsResolutionSummary: request.tagsResolutionSummary,
        temperature: request.temperature,
        maxTokens: request.maxTokens || route.constraints.maxOutputTokens,
        reasoningLevel: request.reasoningLevel, // Pass through reasoning_level preset
      };

      const response = await adapter.generate(normalizedRequest);

      const auditId = await this.recordAudit({
        userId: request.userId,
        projectId: request.projectId,
        intent: request.intent,
        featureKey,
        surfaceType: request.surfaceType,
        provider: route.provider,
        model: route.modelKey,
        routeId: route.routeId,
        providerModelId: route.providerModelId,
        conversationId: request.conversationId,
        tokenUsage: response.tokenUsage,
        costEstimate: response.costEstimate,
        latencyMs: response.latencyMs,
      });

      const duration = Date.now() - startTime;
      console.info('[AI EXECUTION] success', {
        provider: route.provider,
        model: route.modelKey,
        featureKey,
        intent: request.intent,
        durationMs: duration,
        auditId,
      });

      return {
        ...response,
        auditId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const normalizedError = normalizeError(error);

      logAIError(normalizedError, {
        userId: request.userId,
        projectId: request.projectId,
        conversationId: request.conversationId,
        featureKey,
        intent: request.intent,
        surfaceType: request.surfaceType,
      });

      console.error('[AI EXECUTION] failed', {
        errorType: normalizedError.type,
        message: normalizedError.message,
        provider: normalizedError.provider,
        model: normalizedError.model,
        featureKey,
        intent: request.intent,
        durationMs: duration,
      });

      throw normalizedError;
    }
  }

  async executeStream(
    request: AIExecutionRequest,
    callbacks: StreamCallback
  ): Promise<void> {
    const featureKey = request.featureKey || this.inferFeatureKey(request.intent);

    const route = await aiRoutingService.resolveRoute({
      featureKey,
      surfaceType: request.surfaceType,
      intent: request.intent,
      userId: request.userId,
      projectId: request.projectId,
    });

    const adapter = getProviderAdapter(route.provider);

    if (!adapter.supportsStreaming || !adapter.stream) {
      throw new Error(`Provider ${route.provider} does not support streaming`);
    }

    const messages = request.messages || [];
    if (messages.length === 0 || messages[messages.length - 1].content !== request.userPrompt) {
      messages.push({ role: 'user', content: request.userPrompt });
    }

    const normalizedRequest: NormalizedAIRequest = {
      provider: route.provider,
      modelKey: route.modelKey,
      intent: request.intent,
      featureKey,
      surfaceType: request.surfaceType,
      conversationId: request.conversationId,
      messages,
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      contextSnapshot: request.contextSnapshot,
      budgets: {
        maxInputTokens: route.constraints.maxContextTokens,
        maxOutputTokens: route.constraints.maxOutputTokens,
      },
      tagsResolutionSummary: request.tagsResolutionSummary,
      temperature: request.temperature,
      maxTokens: request.maxTokens || route.constraints.maxOutputTokens,
      reasoningLevel: request.reasoningLevel, // Pass through reasoning_level preset
    };

    const originalOnComplete = callbacks.onComplete;
    callbacks.onComplete = async (response: NormalizedAIResponse) => {
      await this.recordAudit({
        userId: request.userId,
        projectId: request.projectId,
        intent: request.intent,
        featureKey,
        surfaceType: request.surfaceType,
        provider: route.provider,
        model: route.modelKey,
        routeId: route.routeId,
        providerModelId: route.providerModelId,
        conversationId: request.conversationId,
        tokenUsage: response.tokenUsage,
        costEstimate: response.costEstimate,
        latencyMs: response.latencyMs,
      });

      originalOnComplete?.(response);
    };

    await adapter.stream(normalizedRequest, callbacks);
  }

  private inferFeatureKey(intent: string): FeatureKey {
    return INTENT_TO_FEATURE_MAP[intent] || 'ai_chat';
  }

  private async recordAudit(params: {
    userId: string;
    projectId?: string;
    intent: string;
    featureKey: FeatureKey;
    surfaceType?: SurfaceType;
    provider: string;
    model: string;
    routeId: string;
    providerModelId: string;
    conversationId?: string;
    tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
    costEstimate?: { inputCost: number; outputCost: number; totalCost: number; currency: string };
    latencyMs: number;
  }): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from('ai_interaction_audits')
        .insert({
          user_id: params.userId,
          master_project_id: params.projectId || null,
          intent: params.intent,
          response_type: 'conversational',
          context_scope: params.surfaceType || 'global',
          conversation_id: params.conversationId || null,
          entities_included: {
            featureKey: params.featureKey,
            provider: params.provider,
            model: params.model,
            routeId: params.routeId,
            providerModelId: params.providerModelId,
            tokenUsage: params.tokenUsage,
            costEstimate: params.costEstimate,
            latencyMs: params.latencyMs,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to record AI audit:', error);
        return undefined;
      }

      return data?.id;
    } catch (error) {
      console.error('Failed to record AI audit:', error);
      return undefined;
    }
  }
}

export const aiExecutionService = new AIExecutionService();
