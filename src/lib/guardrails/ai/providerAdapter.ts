import type { FeatureKey, SurfaceType } from './providerRegistryTypes';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface BudgetLimits {
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

export type ReasoningLevel = 'fast' | 'balanced' | 'deep' | 'long_form';

export interface NormalizedAIRequest {
  provider: string;
  modelKey: string;
  intent: string;
  featureKey: FeatureKey;
  surfaceType?: SurfaceType;
  conversationId?: string;
  messages: Message[];
  systemPrompt: string;
  userPrompt: string;
  contextSnapshot?: Record<string, any>;
  budgets: BudgetLimits;
  tagsResolutionSummary?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningLevel?: ReasoningLevel; // Admin-selectable preset that expands to model-specific parameters
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface NormalizedAIResponse {
  text: string;
  blocks?: Array<{
    type: string;
    content: any;
  }>;
  draftId?: string;
  provider: string;
  model: string;
  tokenUsage?: TokenUsage;
  latencyMs: number;
  costEstimate?: CostEstimate;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
}

export interface StreamCallback {
  onToken?: (token: string) => void;
  onComplete?: (response: NormalizedAIResponse) => void;
  onError?: (error: Error) => void;
}

export interface AIProviderAdapter {
  provider: string;
  supportsStreaming: boolean;
  supportsTools: boolean;

  generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse>;

  stream?(
    request: NormalizedAIRequest,
    callbacks: StreamCallback
  ): Promise<void>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" is not configured. Please check environment variables.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ModelNotSupportedError extends Error {
  constructor(provider: string, modelKey: string) {
    super(`Model "${modelKey}" is not supported by provider "${provider}"`);
    this.name = 'ModelNotSupportedError';
  }
}

export class ProviderAPIError extends Error {
  constructor(
    provider: string,
    statusCode: number | null,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(`${provider} API error (${statusCode || 'unknown'}): ${message}`);
    this.name = 'ProviderAPIError';
  }
}
