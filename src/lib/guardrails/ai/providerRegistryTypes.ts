export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  isEnabled: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  requiresServerProxy?: boolean; // If true, API calls must go through server proxy
  supportsBrowserCalls?: boolean; // If false, cannot make direct API calls from browser
  createdAt: string;
  updatedAt: string;
}

import type { ReasoningLevel } from './providerAdapter';

export type ModelType = 'language_model' | 'search_ai';

export interface AIProviderModel {
  id: string;
  providerId: string;
  modelKey: string;
  displayName: string;
  modelType: ModelType;
  capabilities: ModelCapabilities;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  isEnabled: boolean;
  reasoningLevel?: ReasoningLevel | null; // Admin-selectable preset for OpenAI models
  createdAt: string;
  updatedAt: string;
}

export interface ModelCapabilities {
  chat?: boolean;
  reasoning?: boolean;
  vision?: boolean;
  search?: boolean;
  longContext?: boolean;
  tools?: boolean;
}

export type SurfaceType = 'project' | 'personal' | 'shared';

export interface AIFeatureRoute {
  id: string;
  featureKey: string;
  surfaceType: SurfaceType | null;
  masterProjectId: string | null;
  providerModelId: string;
  isFallback: boolean;
  priority: number;
  constraints: RouteConstraints;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteConstraints {
  maxContextTokens?: number;
  maxOutputTokens?: number;
  maxCostWeight?: number;
  allowedIntents?: string[];
  disallowedIntents?: string[];
}

export type FeatureKey =
  | 'ai_chat'
  | 'draft_generation'
  | 'project_summary'
  | 'deadline_analysis'
  | 'mind_mesh_explain'
  | 'taskflow_assist'
  | 'spaces_meal_planner'
  | 'spaces_notes_assist'
  | 'spaces_recipe_generation'
  | 'spaces_grocery_assist'
  | 'reality_check_assist'
  | 'offshoot_analysis'
  | 'reality_check_initial'
  | 'reality_check_secondary'
  | 'reality_check_detailed'
  | 'reality_check_reframe'
  | 'intelligent_todo';

export const FEATURE_KEYS: Record<string, FeatureKey> = {
  AI_CHAT: 'ai_chat',
  DRAFT_GENERATION: 'draft_generation',
  PROJECT_SUMMARY: 'project_summary',
  DEADLINE_ANALYSIS: 'deadline_analysis',
  MIND_MESH_EXPLAIN: 'mind_mesh_explain',
  TASKFLOW_ASSIST: 'taskflow_assist',
  SPACES_MEAL_PLANNER: 'spaces_meal_planner',
  SPACES_NOTES_ASSIST: 'spaces_notes_assist',
  SPACES_RECIPE_GENERATION: 'spaces_recipe_generation',
  SPACES_GROCERY_ASSIST: 'spaces_grocery_assist',
  REALITY_CHECK_ASSIST: 'reality_check_assist',
  OFFSHOOT_ANALYSIS: 'offshoot_analysis',
  REALITY_CHECK_INITIAL: 'reality_check_initial',
  REALITY_CHECK_SECONDARY: 'reality_check_secondary',
  REALITY_CHECK_DETAILED: 'reality_check_detailed',
  REALITY_CHECK_REFRAME: 'reality_check_reframe',
  INTELLIGENT_TODO: 'intelligent_todo',
} as const;

export const INTENT_TO_FEATURE_MAP: Record<string, FeatureKey> = {
  draft_roadmap_item: 'draft_generation',
  draft_track: 'draft_generation',
  draft_milestone: 'draft_generation',
  suggest_tasks: 'taskflow_assist',
  explain_node: 'mind_mesh_explain',
  analyze_deadline: 'deadline_analysis',
  summarize_project: 'project_summary',
  meal_suggestion: 'spaces_meal_planner',
  note_assist: 'spaces_notes_assist',
  generate_recipe: 'spaces_recipe_generation',
  recipe_generation: 'spaces_recipe_generation',
  grocery_suggestion: 'spaces_grocery_assist',
  grocery_assist: 'spaces_grocery_assist',
  check_feasibility: 'reality_check_assist',
  analyze_offshoot: 'offshoot_analysis',
  breakdown_task: 'intelligent_todo',
  general: 'ai_chat',
  conversational: 'ai_chat',
};

export interface ResolvedRoute {
  provider: string;
  modelKey: string;
  providerModelId: string;
  routeId: string;
  constraints: RouteConstraints;
  capabilities: ModelCapabilities;
  supportsStreaming: boolean;
  requiresServerProxy?: boolean; // If true, must use server proxy (no browser calls)
  supportsBrowserCalls?: boolean; // If false, cannot make direct browser API calls
}

export interface RouteResolutionRequest {
  featureKey: FeatureKey;
  surfaceType?: SurfaceType;
  intent?: string;
  userId: string;
  projectId?: string;
}
