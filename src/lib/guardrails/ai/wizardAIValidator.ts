import { ZodSchema, ZodError } from 'zod';

export interface ValidationContext {
  step: string;
  retryFn?: () => Promise<unknown>;
  sessionId?: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    issues: string[];
    raw?: unknown;
  };
}

export class AIValidationError extends Error {
  constructor(
    public step: string,
    public issues: string[],
    public raw?: unknown
  ) {
    super(`AI validation failed for step: ${step}`);
    this.name = 'AIValidationError';
  }
}

export async function validateAIResponse<T>(
  raw: unknown,
  schema: ZodSchema<T>,
  context: ValidationContext
): Promise<T> {
  const parsed = schema.safeParse(raw);

  if (parsed.success) {
    console.log('[WIZARD AI] Validation passed', {
      step: context.step,
      sessionId: context.sessionId,
    });
    return parsed.data;
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );

  console.warn('[WIZARD AI] Validation failed', {
    step: context.step,
    sessionId: context.sessionId,
    issues,
    raw: JSON.stringify(raw).substring(0, 200),
  });

  if (context.retryFn) {
    console.log('[WIZARD AI] Attempting retry', {
      step: context.step,
      sessionId: context.sessionId,
    });

    try {
      const retryRaw = await context.retryFn();
      const retryParsed = schema.safeParse(retryRaw);

      if (retryParsed.success) {
        console.log('[WIZARD AI] Retry succeeded', {
          step: context.step,
          sessionId: context.sessionId,
        });
        return retryParsed.data;
      }

      const retryIssues = retryParsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );

      console.warn('[WIZARD AI] Retry also failed', {
        step: context.step,
        sessionId: context.sessionId,
        retryIssues,
      });
    } catch (retryError) {
      console.error('[WIZARD AI] Retry threw error', {
        step: context.step,
        sessionId: context.sessionId,
        error: retryError instanceof Error ? retryError.message : String(retryError),
      });
    }
  }

  throw new AIValidationError(context.step, issues, raw);
}

export function safeValidateAIResponse<T>(
  raw: unknown,
  schema: ZodSchema<T>,
  context: Pick<ValidationContext, 'step' | 'sessionId'>
): ValidationResult<T> {
  const parsed = schema.safeParse(raw);

  if (parsed.success) {
    return {
      success: true,
      data: parsed.data,
    };
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );

  console.warn('[WIZARD AI] Safe validation failed', {
    step: context.step,
    sessionId: context.sessionId,
    issues,
  });

  return {
    success: false,
    error: {
      message: `Validation failed for ${context.step}`,
      issues,
      raw,
    },
  };
}

export function extractJSONFromResponse(response: string): unknown {
  try {
    return JSON.parse(response);
  } catch {
    const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Could not extract valid JSON from AI response');
      }
    }
    throw new Error('No JSON found in AI response');
  }
}

export function isJSONOnlyResponse(response: string): boolean {
  const trimmed = response.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

export function formatValidationError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('\n');
}
