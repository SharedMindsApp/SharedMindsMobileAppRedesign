import type { FeatureKey, ModelCapabilities } from './providerRegistryTypes';

export interface FeatureMetadata {
  key: FeatureKey;
  label: string;
  description: string;
  requiredCapabilities: (keyof ModelCapabilities)[];
  allowedIntents?: string[];
  supportedSurfaces?: ('project' | 'personal' | 'shared')[];
  icon: string;
}

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureMetadata> = {
  ai_chat: {
    key: 'ai_chat',
    label: 'AI Chat',
    description: 'Conversational AI assistant for general questions and guidance',
    requiredCapabilities: ['chat'],
    allowedIntents: ['general', 'conversational', 'general_question'],
    supportedSurfaces: ['project', 'personal', 'shared'],
    icon: 'MessageSquare',
  },
  draft_generation: {
    key: 'draft_generation',
    label: 'Draft Generation',
    description: 'Generate structured drafts for roadmap items, tracks, and milestones',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['draft_roadmap_item', 'draft_track', 'draft_milestone'],
    supportedSurfaces: ['project'],
    icon: 'FileEdit',
  },
  project_summary: {
    key: 'project_summary',
    label: 'Project Summary',
    description: 'Generate comprehensive project summaries and status reports',
    requiredCapabilities: ['chat', 'reasoning', 'longContext'],
    allowedIntents: ['summarize_project', 'project_status'],
    supportedSurfaces: ['project'],
    icon: 'FileText',
  },
  deadline_analysis: {
    key: 'deadline_analysis',
    label: 'Deadline Analysis',
    description: 'Analyze deadlines, identify risks, and suggest adjustments',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['analyze_deadline', 'deadline_risk'],
    supportedSurfaces: ['project'],
    icon: 'Clock',
  },
  mind_mesh_explain: {
    key: 'mind_mesh_explain',
    label: 'Mind Mesh Explain',
    description: 'Explain relationships and connections in the mind mesh',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['explain_node', 'explain_connection'],
    supportedSurfaces: ['project'],
    icon: 'Brain',
  },
  taskflow_assist: {
    key: 'taskflow_assist',
    label: 'Task Flow Assist',
    description: 'Suggest tasks, prioritize work, and optimize task flow',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['suggest_tasks', 'prioritize_tasks'],
    supportedSurfaces: ['project'],
    icon: 'ListTodo',
  },
  spaces_meal_planner: {
    key: 'spaces_meal_planner',
    label: 'Meal Planner',
    description: 'Suggest meals, plan menus, and provide dietary guidance. Can use chat-based models (OpenAI, Anthropic) or search-based models (Perplexity)',
    requiredCapabilities: ['chat', 'search'], // Accepts models with chat OR search (validated with OR logic)
    allowedIntents: ['meal_suggestion', 'meal_planning'],
    supportedSurfaces: ['shared'],
    icon: 'UtensilsCrossed',
  },
  spaces_notes_assist: {
    key: 'spaces_notes_assist',
    label: 'Notes Assist',
    description: 'Help organize, summarize, and enhance notes',
    requiredCapabilities: ['chat'],
    allowedIntents: ['note_assist', 'note_summary'],
    supportedSurfaces: ['personal', 'shared'],
    icon: 'FileType',
  },
  reality_check_assist: {
    key: 'reality_check_assist',
    label: 'Reality Check',
    description: 'Assess project feasibility and provide realistic feedback',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['check_feasibility', 'reality_check'],
    supportedSurfaces: ['project'],
    icon: 'CheckSquare',
  },
  offshoot_analysis: {
    key: 'offshoot_analysis',
    label: 'Offshoot Analysis',
    description: 'Analyze side projects and offshoots for prioritization',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['analyze_offshoot', 'prioritize_offshoot'],
    supportedSurfaces: ['project'],
    icon: 'Lightbulb',
  },
  reality_check_initial: {
    key: 'reality_check_initial',
    label: 'Initial Reality Check',
    description: 'Performs a high-level feasibility and achievability review based on the user\'s Project Intent Snapshot',
    requiredCapabilities: ['reasoning', 'longContext'],
    allowedIntents: ['reality_check_initial', 'initial_feasibility_check'],
    supportedSurfaces: ['project'],
    icon: 'CheckSquare',
  },
  reality_check_secondary: {
    key: 'reality_check_secondary',
    label: 'Secondary Reality Check',
    description: 'Evaluates feasibility after skills, resources, and people have been defined',
    requiredCapabilities: ['reasoning'],
    allowedIntents: ['reality_check_secondary', 'secondary_feasibility_check'],
    supportedSurfaces: ['project'],
    icon: 'CheckSquare',
  },
  reality_check_detailed: {
    key: 'reality_check_detailed',
    label: 'Detailed Reality Check',
    description: 'Performs a deep feasibility analysis using full project structure, tracks, skills, and constraints',
    requiredCapabilities: ['reasoning', 'longContext'],
    allowedIntents: ['reality_check_detailed', 'detailed_feasibility_check'],
    supportedSurfaces: ['project'],
    icon: 'CheckSquare',
  },
  reality_check_reframe: {
    key: 'reality_check_reframe',
    label: 'Reality Check Reframe Assistant',
    description: 'Generates reframing suggestions when a project is misaligned or unrealistic',
    requiredCapabilities: ['reasoning'],
    allowedIntents: ['reality_check_reframe', 'reframe_suggestion'],
    supportedSurfaces: ['project'],
    icon: 'RefreshCw',
  },
  intelligent_todo: {
    key: 'intelligent_todo',
    label: 'Intelligent Todo Breakdown',
    description: 'Break down tasks into manageable micro-steps with AI assistance',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['breakdown_task', 'task_breakdown', 'micro_steps'],
    supportedSurfaces: ['personal', 'shared'],
    icon: 'ListTodo',
  },
  spaces_recipe_generation: {
    key: 'spaces_recipe_generation',
    label: 'Recipe Generation',
    description: 'Generate recipes using AI-powered web search and extraction (Perplexity)',
    requiredCapabilities: ['search'],
    allowedIntents: ['generate_recipe', 'recipe_generation', 'recipe_search'],
    supportedSurfaces: ['shared'],
    icon: 'UtensilsCrossed',
  },
  spaces_grocery_assist: {
    key: 'spaces_grocery_assist',
    label: 'Grocery List Assistant',
    description: 'Smart shopping suggestions based on meal plans and pantry inventory',
    requiredCapabilities: ['chat', 'reasoning'],
    allowedIntents: ['grocery_suggestion', 'grocery_assist', 'shopping_list'],
    supportedSurfaces: ['shared'],
    icon: 'ShoppingCart',
  },
};

export function getFeatureMetadata(featureKey: FeatureKey): FeatureMetadata {
  return FEATURE_REGISTRY[featureKey];
}

export function getAllFeatures(): FeatureMetadata[] {
  return Object.values(FEATURE_REGISTRY);
}

export function validateModelForFeature(
  modelCapabilities: ModelCapabilities,
  featureKey: FeatureKey
): { valid: boolean; missingCapabilities: string[] } {
  const feature = FEATURE_REGISTRY[featureKey];

  if (!feature) {
    return {
      valid: false,
      missingCapabilities: ['feature_not_found'],
    };
  }

  // Special handling for features that accept multiple capability types (OR logic)
  // Currently: spaces_meal_planner accepts chat OR search
  if (featureKey === 'spaces_meal_planner') {
    // Accept if model has chat OR search capability
    const hasChat = modelCapabilities.chat || false;
    const hasSearch = modelCapabilities.search || false;
    
    if (hasChat || hasSearch) {
      return {
        valid: true,
        missingCapabilities: [],
      };
    }
    
    return {
      valid: false,
      missingCapabilities: ['chat', 'search'], // Needs at least one
    };
  }

  // Standard AND logic for other features (all required capabilities must be present)
  const missingCapabilities: string[] = [];

  for (const capability of feature.requiredCapabilities) {
    if (!modelCapabilities[capability]) {
      missingCapabilities.push(capability);
    }
  }

  return {
    valid: missingCapabilities.length === 0,
    missingCapabilities,
  };
}

export function getCompatibleModelsForFeature(
  models: Array<{ id: string; capabilities: ModelCapabilities }>,
  featureKey: FeatureKey
): string[] {
  return models
    .filter((model) => validateModelForFeature(model.capabilities, featureKey).valid)
    .map((model) => model.id);
}
