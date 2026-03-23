import { generateAIResponse, getConfiguredProvider } from './llmProvider';
import { validateAIResponse, extractJSONFromResponse, AIValidationError } from './wizardAIValidator';
import { WizardAISchemas } from './wizardAISchemas';
import type {
  AIProjectIntake,
  AIClarificationQuestion,
  AIStructureDraft,
  AITemplateMatch,
  AIOffshotsAnalysis,
  AIRoadmapSuggestion,
  AIProjectTypeRecommendation,
  AITagSuggestion,
} from './wizardAISchemas';

const MAX_RETRIES_PER_STEP = 1;
const MAX_AI_CALLS_PER_SESSION = 10;

export interface WizardAICallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: string;
  retriesUsed: number;
}

class WizardAISessionTracker {
  private callCounts = new Map<string, number>();
  private failedSteps = new Set<string>();
  private disabledSessions = new Set<string>();

  incrementCallCount(sessionId: string): void {
    const current = this.callCounts.get(sessionId) || 0;
    this.callCounts.set(sessionId, current + 1);
  }

  getCallCount(sessionId: string): number {
    return this.callCounts.get(sessionId) || 0;
  }

  markStepFailed(sessionId: string, step: string): void {
    this.failedSteps.add(`${sessionId}:${step}`);
  }

  hasStepFailed(sessionId: string, step: string): boolean {
    return this.failedSteps.has(`${sessionId}:${step}`);
  }

  disableSession(sessionId: string): void {
    this.disabledSessions.add(sessionId);
  }

  isSessionDisabled(sessionId: string): boolean {
    return this.disabledSessions.has(sessionId);
  }

  canMakeCall(sessionId: string): boolean {
    if (this.isSessionDisabled(sessionId)) {
      return false;
    }
    return this.getCallCount(sessionId) < MAX_AI_CALLS_PER_SESSION;
  }
}

const sessionTracker = new WizardAISessionTracker();

function buildJSONOnlySystemPrompt(schemaDescription: string): string {
  return `You are an assistant generating structured project data.
Return ONLY valid JSON matching this schema:
${schemaDescription}

CRITICAL RULES:
- Return ONLY JSON, no markdown, no code blocks, no explanations
- Do not include \`\`\`json or \`\`\` markers
- Do not include any text before or after the JSON
- Ensure all required fields are present
- Use exact enum values as specified`;
}

async function callAIWithJSONValidation<T>(
  prompt: string,
  schema: any,
  context: {
    step: string;
    sessionId: string;
  }
): Promise<T> {
  if (!sessionTracker.canMakeCall(context.sessionId)) {
    throw new Error('AI session limit reached');
  }

  sessionTracker.incrementCallCount(context.sessionId);

  const rawResponse = await generateAIResponse(prompt);

  const jsonData = extractJSONFromResponse(rawResponse);

  const retryFn = sessionTracker.hasStepFailed(context.sessionId, context.step)
    ? undefined
    : async () => {
        if (!sessionTracker.canMakeCall(context.sessionId)) {
          throw new Error('AI session limit reached');
        }
        sessionTracker.incrementCallCount(context.sessionId);
        const retryResponse = await generateAIResponse(
          prompt + '\n\nIMPORTANT: The previous response had validation errors. Please ensure exact schema compliance.'
        );
        return extractJSONFromResponse(retryResponse);
      };

  try {
    return await validateAIResponse(jsonData, schema, {
      step: context.step,
      sessionId: context.sessionId,
      retryFn,
    });
  } catch (error) {
    sessionTracker.markStepFailed(context.sessionId, context.step);
    throw error;
  }
}

export class WizardAIService {
  static async analyzeProjectIdea(
    projectIdea: string,
    sessionId: string
  ): Promise<WizardAICallResult<AIProjectIntake>> {
    if (sessionTracker.isSessionDisabled(sessionId)) {
      return {
        success: false,
        error: 'AI is disabled for this session',
        retriesUsed: 0,
      };
    }

    const initialCallCount = sessionTracker.getCallCount(sessionId);

    try {
      const schemaDescription = JSON.stringify({
        goals: ['array of string goals'],
        concepts: ['array of key concepts'],
        entities: ['optional array of entities'],
        outputType: 'one of: writing|startup|learning|fitness|system|creative|other',
        confidence: 'number between 0 and 1',
      }, null, 2);

      const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Analyze this project idea and extract structured information:
"${projectIdea}"

Return the JSON object now:`;

      const data = await callAIWithJSONValidation<AIProjectIntake>(
        prompt,
        WizardAISchemas.projectIntake,
        { step: 'analyzeProjectIdea', sessionId }
      );

      return {
        success: true,
        data,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (sessionTracker.getCallCount(sessionId) >= MAX_AI_CALLS_PER_SESSION) {
        sessionTracker.disableSession(sessionId);
      }

      return {
        success: false,
        error: error instanceof AIValidationError ? 'AI response validation failed' : 'AI call failed',
        errorDetails: errorMessage,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    }
  }

  static async generateClarificationQuestions(
    projectIdea: string,
    analysis: AIProjectIntake,
    sessionId: string
  ): Promise<WizardAICallResult<AIClarificationQuestion[]>> {
    if (sessionTracker.isSessionDisabled(sessionId)) {
      return {
        success: false,
        error: 'AI is disabled for this session',
        retriesUsed: 0,
      };
    }

    const initialCallCount = sessionTracker.getCallCount(sessionId);

    try {
      const schemaDescription = JSON.stringify([{
        id: 'unique-id',
        question: 'question text (min 5 chars)',
        type: 'one of: text|single_choice|multi_choice',
        options: ['optional array if type is single_choice or multi_choice'],
        required: 'boolean (default false)',
      }], null, 2);

      const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Project idea: "${projectIdea}"
Analysis: ${JSON.stringify(analysis)}

Generate 2-4 clarifying questions to better understand this project.

Return the JSON array now:`;

      const data = await callAIWithJSONValidation<AIClarificationQuestion[]>(
        prompt,
        WizardAISchemas.clarificationQuestion.array(),
        { step: 'generateClarificationQuestions', sessionId }
      );

      return {
        success: true,
        data,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: 'Failed to generate clarification questions',
        errorDetails: errorMessage,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    }
  }

  static async generateStructureDraft(
    projectIdea: string,
    clarifications: Record<string, string>,
    detailLevel: 'lean' | 'standard' | 'detailed',
    sessionId: string
  ): Promise<WizardAICallResult<AIStructureDraft>> {
    if (sessionTracker.isSessionDisabled(sessionId)) {
      return {
        success: false,
        error: 'AI is disabled for this session',
        retriesUsed: 0,
      };
    }

    const initialCallCount = sessionTracker.getCallCount(sessionId);

    try {
      const schemaDescription = JSON.stringify({
        tracks: [{
          name: 'track name',
          description: 'optional description',
          subtracks: [{ name: 'subtrack name', description: 'optional' }],
        }],
        roadmapItems: [{
          title: 'item title',
          description: 'optional',
          type: 'one of: task|event|milestone',
          trackName: 'name of parent track',
        }],
        milestones: [{ title: 'milestone', description: 'optional' }],
        mindMeshNodes: [{ label: 'node label', relatedTo: ['optional related nodes'] }],
        version: 'one of: lean|standard|detailed',
      }, null, 2);

      const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Project idea: "${projectIdea}"
Additional context: ${JSON.stringify(clarifications)}
Detail level: ${detailLevel}

Generate a project structure with tracks, roadmap items, and mind mesh nodes.

Return the JSON object now:`;

      const data = await callAIWithJSONValidation<AIStructureDraft>(
        prompt,
        WizardAISchemas.structureDraft,
        { step: 'generateStructureDraft', sessionId }
      );

      return {
        success: true,
        data,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: 'Failed to generate structure draft',
        errorDetails: errorMessage,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    }
  }

  static async suggestTemplateMatch(
    projectIdea: string,
    availableTemplateIds: string[],
    sessionId: string
  ): Promise<WizardAICallResult<AITemplateMatch>> {
    if (sessionTracker.isSessionDisabled(sessionId)) {
      return {
        success: false,
        error: 'AI is disabled for this session',
        retriesUsed: 0,
      };
    }

    const initialCallCount = sessionTracker.getCallCount(sessionId);

    try {
      const schemaDescription = JSON.stringify({
        templateId: 'id from available templates',
        confidence: 'number between 0 and 1',
        reasoning: 'optional explanation',
        suggestedModifications: ['optional array of modifications'],
      }, null, 2);

      const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Project idea: "${projectIdea}"
Available template IDs: ${JSON.stringify(availableTemplateIds)}

Suggest the best matching template.

Return the JSON object now:`;

      const data = await callAIWithJSONValidation<AITemplateMatch>(
        prompt,
        WizardAISchemas.templateMatch,
        { step: 'suggestTemplateMatch', sessionId }
      );

      return {
        success: true,
        data,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: 'Failed to suggest template match',
        errorDetails: errorMessage,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    }
  }

  static async analyzeOffshoots(
    projectIdea: string,
    capturedText: string,
    sessionId: string
  ): Promise<WizardAICallResult<AIOffshotsAnalysis>> {
    if (sessionTracker.isSessionDisabled(sessionId)) {
      return {
        success: false,
        error: 'AI is disabled for this session',
        retriesUsed: 0,
      };
    }

    const initialCallCount = sessionTracker.getCallCount(sessionId);

    try {
      const schemaDescription = JSON.stringify({
        offshoots: [{
          title: 'offshoot title',
          description: 'optional',
          category: 'one of: idea|concern|blocker|opportunity (default: idea)',
          priority: 'one of: low|medium|high (default: medium)',
        }],
        summary: 'optional summary',
      }, null, 2);

      const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Main project: "${projectIdea}"
User's notes: "${capturedText}"

Extract offshoot ideas, concerns, and opportunities from the notes.

Return the JSON object now:`;

      const data = await callAIWithJSONValidation<AIOffshotsAnalysis>(
        prompt,
        WizardAISchemas.offshotsAnalysis,
        { step: 'analyzeOffshoots', sessionId }
      );

      return {
        success: true,
        data,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: 'Failed to analyze offshoots',
        errorDetails: errorMessage,
        retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
      };
    }
  }

  static getSessionStats(sessionId: string) {
    return {
      callCount: sessionTracker.getCallCount(sessionId),
      isDisabled: sessionTracker.isSessionDisabled(sessionId),
      canMakeCall: sessionTracker.canMakeCall(sessionId),
      remainingCalls: Math.max(0, MAX_AI_CALLS_PER_SESSION - sessionTracker.getCallCount(sessionId)),
    };
  }

  static isAIAvailable(): boolean {
    return getConfiguredProvider() !== null;
  }

  static resetSession(sessionId: string): void {
    sessionTracker['callCounts'].delete(sessionId);
    sessionTracker['disabledSessions'].delete(sessionId);
  }
}

export const wizardAIService = WizardAIService;
