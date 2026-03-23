/**
 * Perplexity AI Provider Adapter
 * 
 * Implements the AIProviderAdapter interface for Perplexity AI.
 * Perplexity is a search-based AI that can answer questions using web search.
 * 
 * IMPORTANT: Perplexity requires server-side proxy due to CORS restrictions.
 * All API calls are routed through Supabase Edge Function.
 */

import type {
  AIProviderAdapter,
  NormalizedAIRequest,
  NormalizedAIResponse,
  TokenUsage,
} from './providerAdapter';
import { ProviderNotConfiguredError, ProviderAPIError } from './providerAdapter';
import { supabase } from '../../supabase';

export class PerplexityAdapter implements AIProviderAdapter {
  provider = 'perplexity';
  supportsStreaming = false; // Streaming through proxy is complex, disabled for now
  supportsTools = false; // Perplexity doesn't support function calling

  /**
   * Call Perplexity API through server-side proxy
   * The API key is stored server-side and never exposed to the client
   */
  private async callPerplexityProxy(request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }): Promise<any> {
    const { data, error } = await supabase.functions.invoke('perplexity-proxy', {
      body: request,
    });

    if (error) {
      console.error('[PerplexityAdapter] Proxy error:', error);
      throw new ProviderAPIError(
        'perplexity',
        null,
        `Server proxy error: ${error.message || 'Failed to connect to Perplexity proxy'}`,
        true // Retryable
      );
    }

    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error from Perplexity proxy';
      const statusCode = data?.statusCode || null;
      throw new ProviderAPIError(
        'perplexity',
        statusCode,
        errorMessage,
        statusCode ? (statusCode >= 500 || statusCode === 429) : false
      );
    }

    return data.data;
  }

  async generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse> {
    const startTime = Date.now();

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    
    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // If no messages, use userPrompt as fallback
    if (messages.length === 0 && request.userPrompt) {
      messages.push({
        role: 'user',
        content: request.userPrompt,
      });
    }

    // Validate model name
    const modelKey = request.modelKey.trim();
    if (!modelKey || modelKey.length === 0) {
      throw new ProviderAPIError(
        'perplexity',
        null,
        'Model key is required',
        false
      );
    }

    // Warn if model name doesn't look like a valid Perplexity model
    if (!modelKey.toLowerCase().startsWith('sonar')) {
      console.warn(
        `[PerplexityAdapter] Model name "${modelKey}" doesn't match expected Perplexity model format. ` +
        `Valid models typically start with "sonar" (e.g., sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro).`
      );
    }

    try {
      // Call Perplexity API through server-side proxy
      const data = await this.callPerplexityProxy({
        model: modelKey,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? request.budgets.maxOutputTokens ?? 4096,
      });

      const choice = data.choices?.[0];
      
      if (!choice) {
        throw new ProviderAPIError(
          'perplexity',
          null,
          'No response choice in API response',
          false
        );
      }

      const text = choice.message?.content || '';
      const finishReason = choice.finish_reason || 'stop';

      // Extract token usage if available
      let tokenUsage: TokenUsage | undefined;
      if (data.usage) {
        tokenUsage = {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        };
      }

      const latencyMs = Date.now() - startTime;

      return {
        text,
        provider: 'perplexity',
        model: modelKey,
        tokenUsage,
        latencyMs,
        finishReason: finishReason as NormalizedAIResponse['finishReason'],
      };
    } catch (error) {
      // Re-throw ProviderAPIError and ProviderNotConfiguredError as-is
      if (error instanceof ProviderAPIError || error instanceof ProviderNotConfiguredError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ProviderAPIError(
        'perplexity',
        null,
        error instanceof Error ? error.message : String(error),
        false
      );
    }
  }

  async stream(
    request: NormalizedAIRequest,
    callbacks: {
      onToken?: (token: string) => void;
      onComplete?: (response: NormalizedAIResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    // Streaming through proxy is complex and not yet implemented
    // For now, fall back to non-streaming generate
    try {
      const response = await this.generate(request);
      callbacks.onComplete?.(response);
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
