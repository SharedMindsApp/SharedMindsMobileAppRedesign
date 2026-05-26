/**
 * Shared OpenRouter client for SharedMinds edge functions.
 *
 * OpenRouter (https://openrouter.ai) is an OpenAI-compatible chat-completions
 * proxy that routes to many providers (Google, Anthropic, Meta, Mistral, etc.)
 * behind a single API key. This lets us pick the best price/capability for
 * each feature without juggling provider-specific clients.
 *
 * Setup:
 *   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
 *
 * Usage:
 *   import { openrouterChat, type ORMessage } from '../_shared/openrouter.ts';
 *
 *   const reply = await openrouterChat({
 *     model: 'google/gemini-2.5-flash',
 *     messages: [
 *       { role: 'system', content: 'You are a concise assistant.' },
 *       { role: 'user',   content: 'Summarise this in 1 line: ...' },
 *     ],
 *     jsonMode: true, // optional — response_format: json_object
 *   });
 *   // reply.text — the assistant's content
 *   // reply.raw  — full JSON response (for finish_reason, usage, etc.)
 *
 * Model picking quick reference (as of 2026-05):
 *   - Cheap + fast + vision:   google/gemini-2.5-flash
 *   - Cheap + good reasoning:  anthropic/claude-haiku-4.5
 *   - Open + free tier:        meta-llama/llama-3.3-70b-instruct
 *   - High-quality reasoning:  anthropic/claude-sonnet-4.5
 *   - OpenAI via OR:           openai/gpt-5.4-nano, openai/gpt-5.4-mini
 *
 * Reference: https://openrouter.ai/docs#models
 */

/** Text-only message — the common case. */
export type ORTextMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/** Multimodal message — content array with text and/or image parts. */
export type ORMultimodalMessage = {
  role: 'system' | 'user' | 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
};

export type ORMessage = ORTextMessage | ORMultimodalMessage;

export interface OpenRouterChatInput {
  /** Model slug, e.g. 'google/gemini-2.5-flash'. Required. */
  model: string;
  messages: ORMessage[];
  /** When true, sets response_format to json_object (model returns valid JSON). */
  jsonMode?: boolean;
  /** Defaults to 0.4 — low enough for consistent extraction, warm enough for copy. */
  temperature?: number;
  /** Cap on output tokens; defaults to 800 (plenty for most SharedMinds tasks). */
  maxTokens?: number;
  /** Optional override; defaults to the OPENROUTER_API_KEY env var. */
  apiKey?: string;
  /** Optional list of fallback models OpenRouter will try if the primary fails. */
  fallbacks?: string[];
}

export interface OpenRouterChatResult {
  /** The assistant's reply text (string-flattened from whichever content shape). */
  text: string;
  /** Full raw response — use for `usage` token counts, finish_reason, etc. */
  raw: any;
  /** The model that actually served the response (may differ from input on fallback). */
  model: string;
}

export class OpenRouterError extends Error {
  status: number;
  bodyText: string;
  constructor(status: number, bodyText: string) {
    super(`OpenRouter HTTP ${status}: ${bodyText.slice(0, 200)}`);
    this.name = 'OpenRouterError';
    this.status = status;
    this.bodyText = bodyText;
  }
}

/**
 * Call OpenRouter's chat-completions endpoint.
 *
 * Throws `OpenRouterError` on non-2xx responses so callers can decide whether
 * to fail-open (e.g. avatar moderation) or surface an error. The standard
 * pattern in our edge functions is to catch this, log, and fall through to
 * a safe default rather than break the user-facing flow.
 */
export async function openrouterChat(
  input: OpenRouterChatInput,
): Promise<OpenRouterChatResult> {
  const apiKey = input.apiKey ?? Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens ?? 800,
  };
  if (input.jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  if (input.fallbacks && input.fallbacks.length > 0) {
    // OpenRouter-specific: try these models if the primary fails.
    body.models = [input.model, ...input.fallbacks];
  }

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Recommended by OpenRouter for ranking/attribution. Not required.
      'HTTP-Referer': 'https://sharedminds.app',
      'X-Title': 'SharedMinds',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new OpenRouterError(resp.status, text);
  }

  const raw = await resp.json();
  const content = raw?.choices?.[0]?.message?.content ?? '';
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text)
          .join('\n')
      : '';

  return {
    text,
    raw,
    model: raw?.model ?? input.model,
  };
}

/**
 * Convenience helper: call the model in JSON mode and parse the response.
 * Returns null on parse failure instead of throwing — most of our use cases
 * (suggestions, classifications) should gracefully degrade rather than fail.
 */
export async function openrouterJSON<T = unknown>(
  input: Omit<OpenRouterChatInput, 'jsonMode'>,
): Promise<T | null> {
  try {
    const { text } = await openrouterChat({ ...input, jsonMode: true });
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('[openrouterJSON] failed:', e);
    return null;
  }
}
