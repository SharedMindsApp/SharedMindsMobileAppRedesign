import type {
  AIProviderAdapter,
  NormalizedAIRequest,
  NormalizedAIResponse,
  StreamCallback,
  ReasoningLevel,
} from './providerAdapter';
import {
  ProviderNotConfiguredError,
  ModelNotSupportedError,
  ProviderAPIError,
} from './providerAdapter';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'; // GPT-5 models must use Responses API

// Model support is determined by what's configured in the ai_provider_models database table.
// The adapter trusts the database configuration and will attempt to use any model provided.
// Invalid models will be rejected by the OpenAI API itself.

/**
 * Resolves reasoning_level preset into model-specific parameters for OpenAI requests.
 * GPT-5 models use max_output_tokens (Responses API) and reasoning.effort.
 * Other OpenAI models use max_tokens (Chat Completions API) and temperature.
 * 
 * This expansion happens at request time - only reasoning_level is stored in config.
 */
function resolveReasoningLevel(
  reasoningLevel: ReasoningLevel | undefined,
  isGPT5: boolean
): {
  maxTokens?: number;
  maxCompletionTokens?: number;
  temperature?: number;
  reasoning?: { effort: 'low' | 'medium' | 'high' };
} {
  // If no reasoning level specified, return empty (will use defaults from request)
  if (!reasoningLevel) {
    return {};
  }

  if (isGPT5) {
    // GPT-5 family models use max_output_tokens (Responses API) and reasoning.effort
    // GPT-5 does not support max_tokens or temperature parameters
    // Note: OpenAI updated Responses API from max_completion_tokens to max_output_tokens
    switch (reasoningLevel) {
      case 'fast':
        return {
          maxCompletionTokens: 1200,
          reasoning: { effort: 'low' },
        };
      case 'balanced':
        return {
          maxCompletionTokens: 2000,
          reasoning: { effort: 'medium' },
        };
      case 'deep':
        return {
          maxCompletionTokens: 6000,
          reasoning: { effort: 'high' },
        };
      case 'long_form':
        return {
          maxCompletionTokens: 12000,
          reasoning: { effort: 'medium' },
        };
    }
  } else {
    // GPT-4, GPT-4o, and other OpenAI models use max_tokens and temperature
    // These models do not support max_completion_tokens or reasoning parameters
    switch (reasoningLevel) {
      case 'fast':
        return {
          maxTokens: 800,
          temperature: 0.3,
        };
      case 'balanced':
        return {
          maxTokens: 1500,
          temperature: 0.7,
        };
      case 'deep':
        return {
          maxTokens: 3000,
          temperature: 0.7,
        };
      case 'long_form':
        return {
          maxTokens: 6000,
          temperature: 0.8,
        };
    }
  }
}

export class OpenAIAdapter implements AIProviderAdapter {
  provider = 'openai';
  supportsStreaming = true;
  supportsTools = true;

  async generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse> {
    if (!OPENAI_API_KEY) {
      throw new ProviderNotConfiguredError('openai');
    }

    // Model validation is handled by the database (ai_provider_models table).
    // If a model is configured in the admin UI, it's considered valid.
    // Invalid models will be rejected by the OpenAI API with appropriate error messages.

    const startTime = Date.now();

    try {
      const messages = this.convertMessages(request);

      // Trim model name to prevent invalid OpenAI API requests
      // OpenAI API rejects model identifiers with leading/trailing whitespace
      const trimmedModel = request.modelKey.trim();

      // GPT-5 models require max_output_tokens (Responses API) instead of max_tokens (Chat Completions API)
      // This is a breaking API change in OpenAI's GPT-5 family models
      // Check if model starts with 'gpt-5' (case-insensitive for safety)
      const isGPT5 = trimmedModel.toLowerCase().startsWith('gpt-5');
      
      // Log model detection for debugging
      console.log('[OPENAI ADAPTER] Model detection (generate)', {
        originalModelKey: request.modelKey,
        trimmedModel,
        isGPT5,
        reasoningLevel: request.reasoningLevel,
      });

      // Resolve reasoning_level preset into model-specific parameters
      // This expands the admin-selectable preset into actual API parameters
      const reasoningParams = resolveReasoningLevel(request.reasoningLevel, isGPT5);

      // Determine token limits - reasoning_level takes precedence, then explicit maxTokens, then budgets
      let maxOutputTokens: number;
      if (reasoningParams.maxTokens) {
        maxOutputTokens = reasoningParams.maxTokens;
      } else if (reasoningParams.maxCompletionTokens) {
        maxOutputTokens = reasoningParams.maxCompletionTokens;
      } else {
        maxOutputTokens = request.maxTokens || request.budgets.maxOutputTokens || 4096;
      }

      // GPT-5 models must use the Responses API endpoint
      // The legacy Chat Completions API does not support GPT-5 reasoning parameters
      let apiUrl: string;
      let body: Record<string, any>;

      if (isGPT5) {
        // GPT-5: Use Responses API with input format
        apiUrl = OPENAI_RESPONSES_URL;
        
        // Combine system prompt and user messages into a single text input
        // Responses API uses a different format than Chat Completions
        const combinedPrompt = this.combineMessagesForResponsesAPI(messages, request.systemPrompt);
        
        body = {
          model: trimmedModel,
          input: [
            {
              role: 'user',
              // Responses API requires type: "input_text" (not "text" like Chat Completions)
              content: [{ type: 'input_text', text: combinedPrompt }],
            },
          ],
        };

        // Set max_output_tokens for GPT-5 (Responses API parameter)
        // OpenAI updated Responses API: max_completion_tokens → max_output_tokens
        if (reasoningParams.maxCompletionTokens) {
          body.max_output_tokens = reasoningParams.maxCompletionTokens;
        } else {
          body.max_output_tokens = maxOutputTokens;
        }

        // Set reasoning parameter for GPT-5
        if (reasoningParams.reasoning) {
          body.reasoning = reasoningParams.reasoning;
        }

        // GPT-5 does not support: messages, max_tokens, temperature
        // These are not included in the body
      } else {
        // Non-GPT-5: Use Chat Completions API with messages format
        apiUrl = OPENAI_CHAT_COMPLETIONS_URL;
        
        body = {
          model: trimmedModel,
          messages,
        };

        // Set max_tokens for non-GPT-5 models
        if (reasoningParams.maxTokens) {
          body.max_tokens = reasoningParams.maxTokens;
        } else {
          body.max_tokens = maxOutputTokens;
        }

        // Set temperature for non-GPT-5 models
        if (reasoningParams.temperature !== undefined) {
          body.temperature = reasoningParams.temperature;
        } else {
          body.temperature = request.temperature ?? 0.7;
        }

        // Non-GPT-5 does not support: max_output_tokens, reasoning
        // These are not included in the body
      }

      // Log the request being sent for debugging
      console.log('[OPENAI ADAPTER] Sending request to OpenAI API', {
        model: trimmedModel,
        isGPT5,
        apiEndpoint: isGPT5 ? 'Responses API' : 'Chat Completions API',
        url: apiUrl,
        messageCount: messages.length,
        maxTokens: isGPT5 ? body.max_output_tokens : body.max_tokens,
        hasTemperature: !isGPT5 && body.temperature !== undefined,
        hasReasoning: !!body.reasoning,
        bodyKeys: Object.keys(body),
        requestBody: JSON.stringify(body, null, 2),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      console.log('[OPENAI ADAPTER] Fetch response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new ProviderAPIError(
          'openai',
          response.status,
          errorData.error?.message || 'Unknown error',
          response.status === 429 || response.status >= 500
        );
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      
      // Log raw JSON immediately to see exact structure
      console.log('[OPENAI ADAPTER] Raw JSON response', JSON.stringify(data, null, 2));

      let text = '';
      let tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;
      let finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | undefined;

      if (isGPT5) {
        // GPT-5 Responses API format: response.output_text or response.output[].content[]
        // GPT-5 may successfully generate tokens without visible text output (e.g., summary_text, non-text blocks)
        console.log('[OPENAI ADAPTER] Parsing Responses API response', {
          hasOutputText: !!data.output_text,
          hasOutput: !!data.output,
          outputType: typeof data.output,
          outputIsArray: Array.isArray(data.output),
          dataKeys: Object.keys(data),
        });

        // Extract token usage first to check if tokens were generated
        if (data.usage) {
          tokenUsage = {
            inputTokens: data.usage.input_tokens || data.usage.prompt_tokens || 0,
            outputTokens: data.usage.output_tokens || data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || (tokenUsage ? tokenUsage.inputTokens + tokenUsage.outputTokens : 0),
          };
        }

        // Normalize Responses API output using dedicated function
        const normalizedOutput = this.normalizeResponsesAPIOutput(data);
        text = normalizedOutput.text;

        // If no visible text but tokens were generated, this is valid (non-text output)
        if (!text && tokenUsage && tokenUsage.outputTokens > 0) {
          console.warn('[OPENAI ADAPTER] GPT-5 generated tokens but no visible text output', {
            model: trimmedModel,
            outputTokens: tokenUsage.outputTokens,
            hasOutputText: !!data.output_text,
            hasOutput: !!data.output,
            reason: 'non_text_output',
          });
          // Return empty string - this is a valid outcome, not an error
          // Metadata about non-text output is logged but not thrown
        } else if (!text && (!tokenUsage || tokenUsage.outputTokens === 0)) {
          // Only error if there's no text AND no tokens (actual failure)
          console.error('[OPENAI ADAPTER] Invalid Responses API response structure', { data });
          throw new ProviderAPIError(
            'openai',
            response.status,
            'Invalid Responses API response structure: missing output_text or output',
            false
          );
        }

        // Map finish reason if available
        if (data.finish_reason) {
          finishReason = this.mapFinishReason(data.finish_reason);
        }
      } else {
        // Non-GPT-5 Chat Completions API format: data.choices[0].message.content
        const firstChoice = data.choices?.[0];
        const message = firstChoice?.message;
        const content = message?.content;
        
        console.log('[OPENAI ADAPTER] Parsing Chat Completions API response', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length || 0,
          hasMessage: !!message,
          hasContent: content !== undefined && content !== null,
          contentType: typeof content,
        });

        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          console.error('[OPENAI ADAPTER] Invalid Chat Completions response structure - no choices', { data });
          throw new ProviderAPIError(
            'openai',
            response.status,
            'Invalid response structure: no choices in response',
            false
          );
        }

        if (!firstChoice?.message) {
          console.error('[OPENAI ADAPTER] Invalid Chat Completions response structure - no message', { 
            choice: firstChoice,
            data 
          });
          throw new ProviderAPIError(
            'openai',
            response.status,
            'Invalid response structure: no message in response',
            false
          );
        }

        // Extract text from Chat Completions format
        if (typeof content === 'string') {
          text = content;
        } else if (Array.isArray(content)) {
          // Content as array of content blocks
          text = content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text || '')
            .join('');
        } else if (content === null || content === undefined) {
          // Content might be null if it hit length limit or was filtered
          if (firstChoice.finish_reason === 'length') {
            text = `[Response was truncated - hit token limit (${data.usage?.completion_tokens || 'unknown'} tokens used). Increase max_tokens to see full response.]`;
          } else if (firstChoice.finish_reason === 'content_filter') {
            text = '[Response was filtered by content policy]';
          } else {
            text = `[No content in response - finish reason: ${firstChoice.finish_reason || 'unknown'}]`;
          }
          console.warn('[OPENAI ADAPTER] Content is null/undefined', {
            finishReason: firstChoice.finish_reason,
            usage: data.usage,
            model: trimmedModel,
          });
        } else {
          text = String(content);
          console.warn('[OPENAI ADAPTER] Content is unexpected type', {
            contentType: typeof content,
            content,
          });
        }

        // Extract token usage from Chat Completions format
        if (data.usage) {
          tokenUsage = {
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          };
        }

        // Map finish reason
        if (firstChoice.finish_reason) {
          finishReason = this.mapFinishReason(firstChoice.finish_reason);
        }
      }

      if (!text || text.trim().length === 0) {
        console.warn('[OPENAI ADAPTER] Empty response text received', {
          isGPT5,
          data,
        });
      }

      return {
        text,
        provider: 'openai',
        model: request.modelKey,
        tokenUsage,
        latencyMs,
        finishReason,
      };
    } catch (error) {
      console.error('[OPENAI ADAPTER] Generate failed', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        isProviderError: error instanceof ProviderAPIError,
        isConfigError: error instanceof ProviderNotConfiguredError,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof ProviderAPIError || error instanceof ProviderNotConfiguredError) {
        throw error;
      }
      throw new ProviderAPIError('openai', null, (error as Error).message, false);
    }
  }

  async stream(request: NormalizedAIRequest, callbacks: StreamCallback): Promise<void> {
    if (!OPENAI_API_KEY) {
      throw new ProviderNotConfiguredError('openai');
    }

    // Model validation is handled by the database (ai_provider_models table).
    // If a model is configured in the admin UI, it's considered valid.
    // Invalid models will be rejected by the OpenAI API with appropriate error messages.

    const startTime = Date.now();

    try {
      const messages = this.convertMessages(request);

      // Trim model name to prevent invalid OpenAI API requests
      // OpenAI API rejects model identifiers with leading/trailing whitespace
      const trimmedModel = request.modelKey.trim();

      // GPT-5 models require max_output_tokens (Responses API) instead of max_tokens (Chat Completions API)
      // This is a breaking API change in OpenAI's GPT-5 family models
      // Check if model starts with 'gpt-5' (case-insensitive for safety)
      const isGPT5 = trimmedModel.toLowerCase().startsWith('gpt-5');
      
      // Log model detection for debugging
      console.log('[OPENAI ADAPTER] Model detection (stream)', {
        originalModelKey: request.modelKey,
        trimmedModel,
        isGPT5,
        reasoningLevel: request.reasoningLevel,
      });

      // Resolve reasoning_level preset into model-specific parameters
      // This expands the admin-selectable preset into actual API parameters
      const reasoningParams = resolveReasoningLevel(request.reasoningLevel, isGPT5);

      // Determine token limits - reasoning_level takes precedence, then explicit maxTokens, then budgets
      let maxOutputTokens: number;
      if (reasoningParams.maxTokens) {
        maxOutputTokens = reasoningParams.maxTokens;
      } else if (reasoningParams.maxCompletionTokens) {
        maxOutputTokens = reasoningParams.maxCompletionTokens;
      } else {
        maxOutputTokens = request.maxTokens || request.budgets.maxOutputTokens || 4096;
      }

      // GPT-5 models must use the Responses API endpoint for streaming
      // The legacy Chat Completions API does not support GPT-5 reasoning parameters
      let apiUrl: string;
      let body: Record<string, any>;

      if (isGPT5) {
        // GPT-5: Use Responses API with input format
        apiUrl = OPENAI_RESPONSES_URL;
        
        // Combine system prompt and user messages into a single text input
        const combinedPrompt = this.combineMessagesForResponsesAPI(messages, request.systemPrompt);
        
        body = {
          model: trimmedModel,
          input: [
            {
              role: 'user',
              // Responses API requires type: "input_text" (not "text" like Chat Completions)
              content: [{ type: 'input_text', text: combinedPrompt }],
            },
          ],
          stream: true,
        };

        // Set max_output_tokens for GPT-5 (Responses API parameter)
        // OpenAI updated Responses API: max_completion_tokens → max_output_tokens
        if (reasoningParams.maxCompletionTokens) {
          body.max_output_tokens = reasoningParams.maxCompletionTokens;
        } else {
          body.max_output_tokens = maxOutputTokens;
        }

        // Set reasoning parameter for GPT-5
        if (reasoningParams.reasoning) {
          body.reasoning = reasoningParams.reasoning;
        }

        // GPT-5 does not support: messages, max_tokens, temperature
      } else {
        // Non-GPT-5: Use Chat Completions API with messages format
        apiUrl = OPENAI_CHAT_COMPLETIONS_URL;
        
        body = {
          model: trimmedModel,
          messages,
          stream: true,
        };

        // Set max_tokens for non-GPT-5 models
        if (reasoningParams.maxTokens) {
          body.max_tokens = reasoningParams.maxTokens;
        } else {
          body.max_tokens = maxOutputTokens;
        }

        // Set temperature for non-GPT-5 models
        if (reasoningParams.temperature !== undefined) {
          body.temperature = reasoningParams.temperature;
        } else {
          body.temperature = request.temperature ?? 0.7;
        }

        // Non-GPT-5 does not support: max_output_tokens, reasoning
      }

      console.log('[OPENAI ADAPTER] Sending streaming request to OpenAI API', {
        model: trimmedModel,
        isGPT5,
        apiEndpoint: isGPT5 ? 'Responses API' : 'Chat Completions API',
        url: apiUrl,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const error = new ProviderAPIError(
          'openai',
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
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

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
              
              if (isGPT5) {
                // Responses API streaming format: use normalization function
                // GPT-5 may generate tokens without visible text (valid behavior)
                const normalizedOutput = this.normalizeResponsesAPIOutput(parsed);
                const content = normalizedOutput.text;

                if (content) {
                  // For streaming, we need to extract only the new content
                  // Responses API may send full output_text each time, so we track what we've seen
                  const newContent = content.slice(fullText.length);
                  if (newContent) {
                    fullText = content; // Update full text
                    callbacks.onToken?.(newContent);
                  }
                }
                // If no content but tokens were generated, that's valid (non-text output)
                // We'll handle this in the final response

                // Extract token usage if available
                if (parsed.usage) {
                  totalInputTokens = parsed.usage.input_tokens || parsed.usage.prompt_tokens || 0;
                  totalOutputTokens = parsed.usage.output_tokens || parsed.usage.completion_tokens || 0;
                }
              } else {
                // Chat Completions API streaming format: parsed.choices[0].delta.content
                const content = parsed.choices?.[0]?.delta?.content;
                const usage = parsed.usage;

                if (usage) {
                  totalInputTokens = usage.prompt_tokens || 0;
                  totalOutputTokens += usage.completion_tokens || 0;
                }

                if (content) {
                  fullText += content;
                  callbacks.onToken?.(content);
                }
              }
            } catch (e) {
              console.error('[OPENAI ADAPTER] Error parsing streaming chunk', { chunk, error: e });
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      const finalResponse: NormalizedAIResponse = {
        text: fullText,
        provider: 'openai',
        model: request.modelKey,
        tokenUsage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
        latencyMs,
        finishReason: 'stop', // In streaming, finish reason is usually 'stop' at the end
      };

      callbacks.onComplete?.(finalResponse);
    } catch (error) {
      if (!callbacks.onError) throw error;
      callbacks.onError(error as Error);
    }
  }

  private convertMessages(request: NormalizedAIRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push(
      ...request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
    );

    return messages;
  }

  /**
   * Combines system prompt and messages into a single text string for Responses API
   * GPT-5 models use the Responses API which requires a single text input instead of messages array
   */
  private combineMessagesForResponsesAPI(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): string {
    const parts: string[] = [];

    // Add system prompt if present
    if (systemPrompt) {
      parts.push(`System: ${systemPrompt}`);
    }

    // Add user and assistant messages
    for (const msg of messages) {
      if (msg.role === 'system' && systemPrompt) {
        // Skip system messages if we already added the system prompt
        continue;
      }
      const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      parts.push(`${roleLabel}: ${msg.content}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Normalizes Responses API output to extract visible text content.
   * GPT-5 models may successfully generate tokens without emitting visible text
   * (e.g., summary_text, non-text output blocks). This function handles all valid output formats.
   * 
   * @param data The Responses API response data
   * @returns Normalized output with extracted text
   */
  private normalizeResponsesAPIOutput(data: any): { text: string } {
    // First priority: output_text if it exists and is non-empty
    if (data.output_text && typeof data.output_text === 'string' && data.output_text.trim().length > 0) {
      return { text: data.output_text };
    }

    // Second priority: scan response.output[]?.content[] for text blocks
    if (Array.isArray(data.output) && data.output.length > 0) {
      const textBlocks: string[] = [];

      for (const block of data.output) {
        // Check for direct text content
        if (block.type === 'output_text' && block.text) {
          textBlocks.push(block.text);
        } else if (block.type === 'summary_text' && block.text) {
          textBlocks.push(block.text);
        } else if (block.content) {
          // Handle nested content structure
          if (typeof block.content === 'string') {
            textBlocks.push(block.content);
          } else if (Array.isArray(block.content)) {
            // Extract text from content array
            const contentText = block.content
              .filter((c: any) => c.type === 'output_text' || c.type === 'summary_text' || c.type === 'text')
              .map((c: any) => c.text || '')
              .filter((t: string) => t.trim().length > 0)
              .join('\n\n');
            if (contentText) {
              textBlocks.push(contentText);
            }
          }
        }
      }

      // Concatenate multiple text blocks with double newlines
      if (textBlocks.length > 0) {
        return { text: textBlocks.join('\n\n') };
      }
    }

    // No visible text found - return empty string (caller will check token usage)
    return { text: '' };
  }

  private mapFinishReason(
    finishReason: string | undefined
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | undefined {
    if (!finishReason) return undefined;
    switch (finishReason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
