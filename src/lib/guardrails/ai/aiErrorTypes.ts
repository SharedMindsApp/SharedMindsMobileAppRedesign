export type AIExecutionErrorType =
  | 'PROVIDER_DISABLED'
  | 'MODEL_DISABLED'
  | 'NO_ROUTE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface AIExecutionError extends Error {
  type: AIExecutionErrorType;
  provider?: string;
  model?: string;
  featureKey?: string;
  intent?: string;
  details?: Record<string, any>;
  isRetryable?: boolean;
}

export class ProviderDisabledError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'PROVIDER_DISABLED';
  provider?: string;
  isRetryable = false;

  constructor(provider: string, message?: string) {
    super(message || `Provider "${provider}" is currently disabled`);
    this.name = 'ProviderDisabledError';
    this.provider = provider;
  }
}

export class ModelDisabledError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'MODEL_DISABLED';
  provider?: string;
  model?: string;
  isRetryable = false;

  constructor(provider: string, model: string, message?: string) {
    super(message || `Model "${model}" from provider "${provider}" is currently disabled`);
    this.name = 'ModelDisabledError';
    this.provider = provider;
    this.model = model;
  }
}

export class NoRouteFoundError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'NO_ROUTE';
  featureKey?: string;
  intent?: string;
  isRetryable = false;

  constructor(featureKey: string, intent?: string, message?: string) {
    super(message || `No AI model is configured for feature "${featureKey}"${intent ? ` with intent "${intent}"` : ''}`);
    this.name = 'NoRouteFoundError';
    this.featureKey = featureKey;
    this.intent = intent;
  }
}

export class NetworkError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'NETWORK_ERROR';
  isRetryable = true;

  constructor(message?: string) {
    super(message || 'Connection issue. Please try again.');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'TIMEOUT';
  isRetryable = true;

  constructor(message?: string) {
    super(message || 'The AI took too long to respond.');
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'RATE_LIMIT';
  isRetryable = true;

  constructor(message?: string) {
    super(message || 'Rate limit exceeded. Please wait a moment and try again.');
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error implements AIExecutionError {
  type: AIExecutionErrorType = 'VALIDATION_ERROR';
  isRetryable = false;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function getUserFriendlyErrorMessage(error: Error | AIExecutionError): string {
  if ('type' in error) {
    const aiError = error as AIExecutionError;

    switch (aiError.type) {
      case 'PROVIDER_DISABLED':
        return 'This AI provider is currently disabled.';
      case 'MODEL_DISABLED':
        return 'This AI model is currently disabled.';
      case 'NO_ROUTE':
        return 'No AI model is configured for this feature.';
      case 'NETWORK_ERROR':
        return 'Connection issue. Please try again.';
      case 'TIMEOUT':
        return 'The AI took too long to respond.';
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment.';
      case 'VALIDATION_ERROR':
        return aiError.message;
      default:
        return 'Unexpected error occurred.';
    }
  }

  return 'Unexpected error occurred.';
}

export function normalizeError(error: unknown): AIExecutionError {
  if (error instanceof Error && 'type' in error) {
    return error as AIExecutionError;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return new NetworkError(error.message);
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError(error.message);
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new RateLimitError(error.message);
    }

    if (message.includes('disabled')) {
      return {
        ...error,
        type: 'PROVIDER_DISABLED',
        isRetryable: false,
      } as AIExecutionError;
    }

    return {
      ...error,
      type: 'UNKNOWN',
      isRetryable: false,
    } as AIExecutionError;
  }

  return {
    name: 'UnknownError',
    message: String(error),
    type: 'UNKNOWN',
    isRetryable: false,
  } as AIExecutionError;
}

export function logAIError(
  error: AIExecutionError,
  context: {
    userId?: string;
    projectId?: string;
    conversationId?: string;
    featureKey?: string;
    intent?: string;
    surfaceType?: string;
  }
): void {
  const logData = {
    errorType: error.type,
    message: error.message,
    provider: error.provider,
    model: error.model,
    featureKey: error.featureKey || context.featureKey,
    intent: error.intent || context.intent,
    ...context,
    isRetryable: error.isRetryable,
    timestamp: new Date().toISOString(),
  };

  console.error('[AI ERROR]', logData);

  if (error.type === 'UNKNOWN' && error.stack) {
    console.error('[AI ERROR STACK]', error.stack);
  }
}
