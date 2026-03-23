import { generateAIResponse } from './llmProvider';
import { extractJSONFromResponse } from './wizardAIValidator';

/**
 * Reality Check Funnel #1 Response
 * This is the exact JSON structure returned by the LLM
 */
export interface RealityCheckResult {
  achievabilityScore: number; // 0-100
  achievabilityBand: 'low' | 'medium' | 'high';
  summary: string; // 2-3 sentences, neutral tone
  keyAssumptions: string[]; // Bullet-style strings
  primaryRisks: string[]; // Structural risks only
  recommendedOutcome: 'proceed' | 'reframe' | 'strong_reframe';
  reframeGuidance: {
    needed: boolean;
    suggestion: string | null;
  };
  confidenceNotes: string; // Short reassurance
}

/**
 * Project Intent Snapshot structure
 * This matches what's displayed in the Review step
 */
export interface ProjectIntentSnapshot {
  domain: string | null;
  projectType: string | null;
  projectName: string;
  idea: {
    description: string;
    startingPoint: string;
    expectations: string;
  };
  goals: string[];
  clarifySignals: {
    timeExpectation: string | null;
    weeklyCommitment: string | null;
    experienceLevel: string | null;
    dependencyLevel: string | null;
    resourceAssumption: string | null;
    scopeClarity: string | null;
    timeExpectationContext?: string;
    weeklyCommitmentContext?: string;
    experienceLevelContext?: string;
    dependencyLevelContext?: string;
    resourceAssumptionContext?: string;
    scopeClarityContext?: string;
  };
}

/**
 * System prompt for Reality Check Funnel #1
 * This is the exact prompt as specified in the design brief
 */
const SYSTEM_PROMPT = `You are an analytical project feasibility reviewer.

Your task is to assess the achievability of a user's project idea based ONLY on the information provided.

You must:
- remain neutral and non-judgmental
- avoid motivational language
- avoid execution planning
- avoid task lists, timelines, or step-by-step advice
- avoid personal opinions

You are NOT a coach or assistant.
You are performing an initial reality check.

Your goal is to:
- assess whether the project is achievable as currently framed
- identify major assumptions or mismatches
- recommend whether the project should proceed as-is or be reframed

You must always prefer reframing over abandonment.

If a project is extremely unrealistic, recommend a strong reframe rather than rejection.

You must return your response in the exact JSON format specified.

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Do not include \`\`\`json or \`\`\` markers
- Do not include any text before or after the JSON
- Ensure all required fields are present
- Use exact enum values as specified

ABSOLUTE CONSTRAINTS (Do NOT Violate):
- Do NOT suggest tasks or plans
- Do NOT suggest learning resources
- Do NOT estimate timelines
- Do NOT mention specific skills
- Do NOT mention money amounts
- Do NOT tell the user they "can't" do something
- Do NOT use motivational or emotional language`;

/**
 * Builds the user prompt for the reality check
 */
function buildUserPrompt(snapshot: ProjectIntentSnapshot): string {
  return `Review the following project intent snapshot and perform an initial reality check.

Assess the project's achievability based on:
- stated idea and expectations
- user's starting point
- time assumptions
- experience level
- dependencies
- resource assumptions
- scope clarity

ProjectIntentSnapshot:
${JSON.stringify(snapshot, null, 2)}

Return your assessment in the following JSON format:
{
  "achievabilityScore": <number 0-100>,
  "achievabilityBand": <"low" | "medium" | "high">,
  "summary": "<2-3 sentences, neutral tone>",
  "keyAssumptions": ["<assumption 1>", "<assumption 2>", ...],
  "primaryRisks": ["<risk 1>", "<risk 2>", ...],
  "recommendedOutcome": <"proceed" | "reframe" | "strong_reframe">,
  "reframeGuidance": {
    "needed": <boolean>,
    "suggestion": <string | null>
  },
  "confidenceNotes": "<short reassurance>"
}`;
}

/**
 * Validates the reality check result structure
 */
function validateRealityCheckResult(data: any): RealityCheckResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid reality check result: not an object');
  }

  // Validate achievabilityScore
  if (typeof data.achievabilityScore !== 'number' || data.achievabilityScore < 0 || data.achievabilityScore > 100) {
    throw new Error('Invalid achievabilityScore: must be a number between 0 and 100');
  }

  // Validate achievabilityBand
  if (!['low', 'medium', 'high'].includes(data.achievabilityBand)) {
    throw new Error('Invalid achievabilityBand: must be "low", "medium", or "high"');
  }

  // Validate summary
  if (typeof data.summary !== 'string' || data.summary.trim().length === 0) {
    throw new Error('Invalid summary: must be a non-empty string');
  }

  // Validate keyAssumptions
  if (!Array.isArray(data.keyAssumptions) || !data.keyAssumptions.every((a: any) => typeof a === 'string')) {
    throw new Error('Invalid keyAssumptions: must be an array of strings');
  }

  // Validate primaryRisks
  if (!Array.isArray(data.primaryRisks) || !data.primaryRisks.every((r: any) => typeof r === 'string')) {
    throw new Error('Invalid primaryRisks: must be an array of strings');
  }

  // Validate recommendedOutcome
  if (!['proceed', 'reframe', 'strong_reframe'].includes(data.recommendedOutcome)) {
    throw new Error('Invalid recommendedOutcome: must be "proceed", "reframe", or "strong_reframe"');
  }

  // Validate reframeGuidance
  if (!data.reframeGuidance || typeof data.reframeGuidance !== 'object') {
    throw new Error('Invalid reframeGuidance: must be an object');
  }
  if (typeof data.reframeGuidance.needed !== 'boolean') {
    throw new Error('Invalid reframeGuidance.needed: must be a boolean');
  }
  if (data.reframeGuidance.suggestion !== null && typeof data.reframeGuidance.suggestion !== 'string') {
    throw new Error('Invalid reframeGuidance.suggestion: must be a string or null');
  }

  // Validate confidenceNotes
  if (typeof data.confidenceNotes !== 'string' || data.confidenceNotes.trim().length === 0) {
    throw new Error('Invalid confidenceNotes: must be a non-empty string');
  }

  return data as RealityCheckResult;
}

/**
 * Performs Initial Reality Check (Funnel #1)
 * 
 * This function:
 * - Uses a reasoning-capable model (GPT-4o, Claude Sonnet, or equivalent)
 * - Takes only the ProjectIntentSnapshot as input
 * - Returns a structured RealityCheckResult
 * 
 * @param snapshot The complete ProjectIntentSnapshot from the Review step
 * @returns Promise<RealityCheckResult> The reality check assessment
 */
export async function performInitialRealityCheck(
  snapshot: ProjectIntentSnapshot
): Promise<RealityCheckResult> {
  // Build the complete prompt
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(snapshot)}`;

  try {
    // Call the LLM - this will use the configured provider (should be GPT-4o or Claude Sonnet)
    const rawResponse = await generateAIResponse(fullPrompt);

    // Extract JSON from response
    const jsonData = extractJSONFromResponse(rawResponse);

    // Validate and return the result
    return validateRealityCheckResult(jsonData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to perform reality check: ${errorMessage}`);
  }
}




