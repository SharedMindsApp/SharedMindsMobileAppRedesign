import type { AIIntent, AIContextScope } from './aiTypes';

export interface IntentContextRequirements {
  requiredSources: Array<
    | 'project'
    | 'tracks'
    | 'roadmapItems'
    | 'collaboration'
    | 'mindMesh'
    | 'taskFlow'
    | 'people'
    | 'deadlines'
  >;
  optionalSources: Array<
    | 'project'
    | 'tracks'
    | 'roadmapItems'
    | 'collaboration'
    | 'mindMesh'
    | 'taskFlow'
    | 'people'
    | 'deadlines'
  >;
  prohibitedSources: Array<
    | 'project'
    | 'tracks'
    | 'roadmapItems'
    | 'collaboration'
    | 'mindMesh'
    | 'taskFlow'
    | 'people'
    | 'deadlines'
  >;
  scopeRequirement: 'project' | 'track' | 'item' | 'any';
  allowCrossProject: boolean;
}

export const AI_INTENT_CONTEXT_MATRIX: Record<AIIntent, IntentContextRequirements> = {
  explain: {
    requiredSources: ['project'],
    optionalSources: ['tracks', 'roadmapItems', 'mindMesh', 'people'],
    prohibitedSources: ['collaboration', 'taskFlow', 'deadlines'],
    scopeRequirement: 'any',
    allowCrossProject: false,
  },

  summarize: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['collaboration', 'taskFlow', 'people', 'deadlines'],
    prohibitedSources: ['mindMesh'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },

  draft_roadmap_item: {
    requiredSources: ['project', 'tracks'],
    optionalSources: ['roadmapItems', 'deadlines'],
    prohibitedSources: ['collaboration', 'mindMesh', 'taskFlow', 'people'],
    scopeRequirement: 'track',
    allowCrossProject: false,
  },

  draft_task_list: {
    requiredSources: ['project', 'roadmapItems'],
    optionalSources: ['taskFlow'],
    prohibitedSources: ['collaboration', 'mindMesh', 'people', 'deadlines'],
    scopeRequirement: 'item',
    allowCrossProject: false,
  },

  suggest_next_steps: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['collaboration', 'taskFlow', 'people', 'deadlines'],
    prohibitedSources: ['mindMesh'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },

  analyze_deadlines: {
    requiredSources: ['project', 'deadlines'],
    optionalSources: ['tracks', 'roadmapItems'],
    prohibitedSources: ['collaboration', 'mindMesh', 'taskFlow', 'people'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },

  critique_plan: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['collaboration', 'taskFlow', 'people', 'deadlines'],
    prohibitedSources: ['mindMesh'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },

  compare_options: {
    requiredSources: ['project'],
    optionalSources: ['tracks', 'roadmapItems', 'deadlines'],
    prohibitedSources: ['collaboration', 'mindMesh', 'taskFlow', 'people'],
    scopeRequirement: 'any',
    allowCrossProject: false,
  },

  generate_checklist: {
    requiredSources: ['project', 'roadmapItems'],
    optionalSources: ['taskFlow'],
    prohibitedSources: ['collaboration', 'mindMesh', 'people', 'deadlines'],
    scopeRequirement: 'item',
    allowCrossProject: false,
  },

  propose_timeline: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['deadlines'],
    prohibitedSources: ['collaboration', 'mindMesh', 'taskFlow', 'people'],
    scopeRequirement: 'track',
    allowCrossProject: false,
  },

  explain_relationships: {
    requiredSources: ['project', 'mindMesh'],
    optionalSources: ['tracks', 'roadmapItems', 'people'],
    prohibitedSources: ['collaboration', 'taskFlow', 'deadlines'],
    scopeRequirement: 'any',
    allowCrossProject: false,
  },

  suggest_breakdown: {
    requiredSources: ['project', 'roadmapItems'],
    optionalSources: [],
    prohibitedSources: ['collaboration', 'mindMesh', 'taskFlow', 'people', 'deadlines'],
    scopeRequirement: 'item',
    allowCrossProject: false,
  },

  identify_risks: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['collaboration', 'taskFlow', 'people', 'deadlines'],
    prohibitedSources: ['mindMesh'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },

  recommend_priorities: {
    requiredSources: ['project', 'tracks', 'roadmapItems'],
    optionalSources: ['collaboration', 'taskFlow', 'people', 'deadlines'],
    prohibitedSources: ['mindMesh'],
    scopeRequirement: 'project',
    allowCrossProject: false,
  },
};

export interface ContextValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
}

export function validateIntentContextMatch(
  intent: AIIntent,
  scope: AIContextScope
): ContextValidationResult {
  const requirements = AI_INTENT_CONTEXT_MATRIX[intent];
  const violations: string[] = [];
  const warnings: string[] = [];

  const requestedSources = getScopeSources(scope);

  for (const required of requirements.requiredSources) {
    if (!requestedSources.includes(required)) {
      violations.push(`Intent '${intent}' requires '${required}' but it was not included in scope`);
    }
  }

  for (const prohibited of requirements.prohibitedSources) {
    if (requestedSources.includes(prohibited)) {
      violations.push(`Intent '${intent}' prohibits '${prohibited}' but it was included in scope`);
    }
  }

  if (requirements.scopeRequirement === 'project' && !scope.projectId) {
    violations.push(`Intent '${intent}' requires a project ID`);
  }

  if (requirements.scopeRequirement === 'track' && (!scope.trackIds || scope.trackIds.length === 0)) {
    violations.push(`Intent '${intent}' requires at least one track ID`);
  }

  if (requirements.scopeRequirement === 'item' && (!scope.roadmapItemIds || scope.roadmapItemIds.length === 0)) {
    violations.push(`Intent '${intent}' requires at least one roadmap item ID`);
  }

  for (const optional of requirements.optionalSources) {
    if (!requestedSources.includes(optional) && !requirements.requiredSources.includes(optional)) {
      warnings.push(`Intent '${intent}' could benefit from including '${optional}'`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

function getScopeSources(scope: AIContextScope): string[] {
  const sources: string[] = [];

  if (scope.projectId) sources.push('project');
  if (scope.trackIds && scope.trackIds.length > 0) sources.push('tracks');
  if (scope.roadmapItemIds && scope.roadmapItemIds.length > 0) sources.push('roadmapItems');
  if (scope.includeCollaboration) sources.push('collaboration');
  if (scope.includeMindMesh) sources.push('mindMesh');
  if (scope.includeTaskFlow) sources.push('taskFlow');
  if (scope.includePeople) sources.push('people');
  if (scope.includeDeadlines) sources.push('deadlines');

  return sources;
}

export function buildScopeForIntent(
  intent: AIIntent,
  projectId?: string,
  trackId?: string,
  itemId?: string
): AIContextScope {
  const requirements = AI_INTENT_CONTEXT_MATRIX[intent];

  const scope: AIContextScope = {};

  if (projectId) {
    scope.projectId = projectId;
  }

  if (trackId) {
    scope.trackIds = [trackId];
  }

  if (itemId) {
    scope.roadmapItemIds = [itemId];
  }

  const allSources = [...requirements.requiredSources, ...requirements.optionalSources];

  if (allSources.includes('collaboration')) {
    scope.includeCollaboration = true;
  }

  if (allSources.includes('mindMesh')) {
    scope.includeMindMesh = true;
  }

  if (allSources.includes('taskFlow')) {
    scope.includeTaskFlow = true;
  }

  if (allSources.includes('people')) {
    scope.includePeople = true;
  }

  if (allSources.includes('deadlines')) {
    scope.includeDeadlines = true;
  }

  return scope;
}

export const INTENT_CONTEXT_RULES = {
  NO_IMPLICIT_EXPANSION: 'Intent cannot implicitly expand scope beyond declared requirements',
  EXPLICIT_PROHIBITION: 'Prohibited sources must never be included, even if requested',
  SCOPE_VALIDATION: 'Pre-flight validation blocks intent/context mismatches',
  DETERMINISTIC_SCOPING: 'Same intent + same IDs = same scope every time',
  NO_CROSS_PROJECT: 'No intent currently allows cross-project data access',
};

export const INTENT_SCOPE_EXAMPLES = {
  draft_roadmap_item: 'Needs: project + selected track. Gets: track items for context. No collaboration data.',
  analyze_deadlines: 'Needs: project + deadlines. Gets: roadmap items with deadlines. No Mind Mesh.',
  explain_relationships: 'Needs: project + Mind Mesh. Gets: nodes, edges, related entities. No collaboration verbatim.',
  summarize: 'Needs: project + tracks + items. Gets: summary metrics, not full dumps.',
};
