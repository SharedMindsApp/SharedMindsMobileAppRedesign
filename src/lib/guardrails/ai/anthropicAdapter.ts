import type {
  AIProviderAdapter,
  NormalizedAIRequest,
  NormalizedAIResponse,
  StreamCallback,
} from './providerAdapter';
import {
  ProviderNotConfiguredError,
  ModelNotSupportedError,
  ProviderAPIError,
} from './providerAdapter';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Model support is determined by what's configured in the ai_provider_models database table.
// The adapter trusts the database configuration and will attempt to use any model provided.
// Invalid models will be rejected by the Anthropic API itself.

export class AnthropicAdapter implements AIProviderAdapter {
  provider = 'anthropic';
  supportsStreaming = true;
  supportsTools = true;

  async generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse> {
    console.log('[ANTHROPIC ADAPTER] Generate request received', {
      model: request.modelKey,
      intent: request.intent,
      featureKey: request.featureKey,
      surfaceType: request.surfaceType,
      conversationId: request.conversationId,
      systemPromptLength: request.systemPrompt?.length || 0,
      userPromptLength: request.userPrompt?.length || 0,
      messageCount: request.messages?.length || 0,
      maxTokens: request.maxTokens || request.budgets.maxOutputTokens || 4096,
      temperature: request.temperature ?? 0.7,
    });

    if (!ANTHROPIC_API_KEY) {
      console.error('[ANTHROPIC ADAPTER] API key not configured');
      throw new ProviderNotConfiguredError('anthropic');
    }

    // Model validation is handled by the database (ai_provider_models table).
    // If a model is configured in the admin UI, it's considered valid.
    // Invalid models will be rejected by the Anthropic API with appropriate error messages.

    const startTime = Date.now();

    try {
      const anthropicMessages = this.convertMessages(request);

      console.log('[ANTHROPIC ADAPTER] Messages converted', {
        messageCount: anthropicMessages.length,
      });

      const body = {
        model: request.modelKey,
        max_tokens: request.maxTokens || request.budgets.maxOutputTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: anthropicMessages,
      };

      console.log('[ANTHROPIC ADAPTER] Sending request to Anthropic API', {
        model: body.model,
        maxTokens: body.max_tokens,
        temperature: body.temperature,
        systemPromptLength: body.system?.length || 0,
        messageCount: body.messages.length,
      });

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      console.log('[ANTHROPIC ADAPTER] API response received', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        console.error('[ANTHROPIC ADAPTER] API error response', {
          status: response.status,
          errorMessage: errorData.error?.message,
          errorData,
        });
        throw new ProviderAPIError(
          'anthropic',
          response.status,
          errorData.error?.message || 'Unknown error',
          response.status === 429 || response.status >= 500
        );
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      console.log('[ANTHROPIC ADAPTER] Response parsed successfully', {
        latencyMs,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
        stopReason: data.stop_reason,
        contentBlockCount: data.content?.length || 0,
      });

      const text = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      console.log('[ANTHROPIC ADAPTER] Text extracted from response', {
        textLength: text.length,
        latencyMs,
      });

      return {
        text,
        provider: 'anthropic',
        model: request.modelKey,
        tokenUsage: data.usage
          ? {
              inputTokens: data.usage.input_tokens || 0,
              outputTokens: data.usage.output_tokens || 0,
              totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
            }
          : undefined,
        latencyMs,
        finishReason: this.mapStopReason(data.stop_reason),
      };
    } catch (error) {
      console.error('[ANTHROPIC ADAPTER] Generate failed', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        isProviderError: error instanceof ProviderAPIError,
        isConfigError: error instanceof ProviderNotConfiguredError,
      });

      if (error instanceof ProviderAPIError || error instanceof ProviderNotConfiguredError) {
        throw error;
      }
      throw new ProviderAPIError('anthropic', null, (error as Error).message, false);
    }
  }

  async stream(request: NormalizedAIRequest, callbacks: StreamCallback): Promise<void> {
    if (!ANTHROPIC_API_KEY) {
      throw new ProviderNotConfiguredError('anthropic');
    }

    // Model validation is handled by the database (ai_provider_models table).
    // If a model is configured in the admin UI, it's considered valid.
    // Invalid models will be rejected by the Anthropic API with appropriate error messages.

    const startTime = Date.now();

    try {
      const anthropicMessages = this.convertMessages(request);

      const body = {
        model: request.modelKey,
        max_tokens: request.maxTokens || request.budgets.maxOutputTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: anthropicMessages,
        stream: true,
      };

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const error = new ProviderAPIError(
          'anthropic',
          response.status,
          errorData.error?.message || 'Unknown error',
          response.status === 429 || response.status >= 500
        );
        callbacks.onError?.(error);
        throw error;
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let usage: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const token = parsed.delta.text;
                fullText += token;
                callbacks.onToken?.(token);
              } else if (parsed.type === 'message_delta' && parsed.usage) {
                usage = parsed.usage;
              }
            } catch (e) {
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      const finalResponse: NormalizedAIResponse = {
        text: fullText,
        provider: 'anthropic',
        model: request.modelKey,
        tokenUsage: usage
          ? {
              inputTokens: usage.input_tokens || 0,
              outputTokens: usage.output_tokens || 0,
              totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            }
          : undefined,
        latencyMs,
        finishReason: 'stop',
      };

      callbacks.onComplete?.(finalResponse);
    } catch (error) {
      if (!callbacks.onError) throw error;
      callbacks.onError(error as Error);
    }
  }

  private convertMessages(request: NormalizedAIRequest): Array<{ role: string; content: string }> {
    return request.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));
  }

  private mapStopReason(
    stopReason: string | undefined
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | undefined {
    if (!stopReason) return undefined;
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
