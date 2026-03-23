import type { AIDraft, AIDraftType } from './aiTypes';

export interface DraftSafetyCheck {
  canAutoApply: boolean;
  requiresUserConfirmation: boolean;
  requiresServiceValidation: boolean;
  warnings: string[];
}

export const DRAFT_SAFETY_RULES: Record<AIDraftType, DraftSafetyCheck> = {
  roadmap_item: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: true,
    warnings: [
      'Draft must be reviewed before creating roadmap item',
      'User must call createRoadmapItem() service',
      'No AI-generated IDs are persisted directly',
    ],
  },

  child_item: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: true,
    warnings: [
      'Draft must be reviewed before creating child item',
      'User must call createRoadmapItem() service with parent_item_id',
      'No AI-generated IDs are persisted directly',
    ],
  },

  task_list: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: true,
    warnings: [
      'Draft task list must be reviewed',
      'User must call createTask() for each task via service',
      'Tasks can be created one-by-one or in batch',
    ],
  },

  document: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: false,
    warnings: [
      'Draft document must be reviewed',
      'User can copy content or attach to entity',
      'Content should be validated before use',
    ],
  },

  summary: {
    canAutoApply: false,
    requiresUserConfirmation: false,
    requiresServiceValidation: false,
    warnings: [
      'Summary is informational only',
      'No action required',
      'Can be saved as note if desired',
    ],
  },

  insight: {
    canAutoApply: false,
    requiresUserConfirmation: false,
    requiresServiceValidation: false,
    warnings: [
      'Insight is advisory only',
      'User should evaluate before acting',
      'Can be saved for reference',
    ],
  },

  checklist: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: false,
    warnings: [
      'Checklist should be reviewed and edited',
      'User can copy to task list or notes',
      'Items may need adjustment for context',
    ],
  },

  timeline: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: true,
    warnings: [
      'Timeline proposal must be reviewed',
      'Dates and durations should be validated',
      'User must manually apply via roadmap services',
    ],
  },

  breakdown: {
    canAutoApply: false,
    requiresUserConfirmation: true,
    requiresServiceValidation: true,
    warnings: [
      'Breakdown must be reviewed',
      'User must create child items via service',
      'Structure may need refinement',
    ],
  },

  risk_analysis: {
    canAutoApply: false,
    requiresUserConfirmation: false,
    requiresServiceValidation: false,
    warnings: [
      'Risk analysis is informational',
      'User should validate risks',
      'Mitigation strategies are suggestions only',
    ],
  },
};

export function checkDraftSafety(draft: AIDraft): DraftSafetyCheck {
  return DRAFT_SAFETY_RULES[draft.draftType];
}

export function canApplyDraft(draft: AIDraft): { allowed: boolean; reason?: string } {
  const safety = checkDraftSafety(draft);

  if (safety.canAutoApply) {
    return { allowed: false, reason: 'This draft type cannot be auto-applied (safety rule)' };
  }

  if (draft.status === 'accepted') {
    return { allowed: false, reason: 'Draft has already been applied' };
  }

  if (draft.status === 'discarded') {
    return { allowed: false, reason: 'Draft has been discarded' };
  }

  if (!draft.provenanceMetadata || !draft.provenanceMetadata.sourceEntityIds) {
    return { allowed: false, reason: 'Draft is missing provenance metadata' };
  }

  if (!draft.contextScope) {
    return { allowed: false, reason: 'Draft is missing context scope' };
  }

  return { allowed: true };
}

export interface DraftApplicationPlan {
  draftId: string;
  draftType: AIDraftType;
  targetService: string;
  serviceMethod: string;
  requiredParameters: string[];
  partialApplicationSupported: boolean;
  steps: string[];
}

export const DRAFT_APPLICATION_PLANS: Record<AIDraftType, DraftApplicationPlan> = {
  roadmap_item: {
    draftId: '',
    draftType: 'roadmap_item',
    targetService: 'roadmapService',
    serviceMethod: 'createRoadmapItem',
    requiredParameters: ['projectId', 'trackId', 'title'],
    partialApplicationSupported: false,
    steps: [
      'Review draft content',
      'Edit title, description, duration if needed',
      'Select target track',
      'Call createRoadmapItem() with draft content',
      'On success, call acceptDraft() with created item ID',
    ],
  },

  child_item: {
    draftId: '',
    draftType: 'child_item',
    targetService: 'roadmapService',
    serviceMethod: 'createRoadmapItem',
    requiredParameters: ['projectId', 'trackId', 'title', 'parentItemId'],
    partialApplicationSupported: false,
    steps: [
      'Review draft content',
      'Confirm parent item',
      'Edit details if needed',
      'Call createRoadmapItem() with parent_item_id',
      'On success, call acceptDraft()',
    ],
  },

  task_list: {
    draftId: '',
    draftType: 'task_list',
    targetService: 'taskFlowService',
    serviceMethod: 'createTask',
    requiredParameters: ['projectId', 'title'],
    partialApplicationSupported: true,
    steps: [
      'Review task list',
      'Select which tasks to create',
      'For each task: call createTask()',
      'Track created task IDs',
      'Call markDraftAsPartiallyApplied() or acceptDraft()',
    ],
  },

  document: {
    draftId: '',
    draftType: 'document',
    targetService: 'none',
    serviceMethod: 'none',
    requiredParameters: [],
    partialApplicationSupported: false,
    steps: [
      'Review document content',
      'Copy to clipboard or save as note',
      'Optionally attach to entity',
      'Call acceptDraft() if satisfied',
    ],
  },

  summary: {
    draftId: '',
    draftType: 'summary',
    targetService: 'none',
    serviceMethod: 'none',
    requiredParameters: [],
    partialApplicationSupported: false,
    steps: [
      'Read summary',
      'Use insights for decision-making',
      'Optionally save for reference',
    ],
  },

  insight: {
    draftId: '',
    draftType: 'insight',
    targetService: 'none',
    serviceMethod: 'none',
    requiredParameters: [],
    partialApplicationSupported: false,
    steps: [
      'Review insight',
      'Evaluate relevance',
      'Take action if warranted',
    ],
  },

  checklist: {
    draftId: '',
    draftType: 'checklist',
    targetService: 'none',
    serviceMethod: 'none',
    requiredParameters: [],
    partialApplicationSupported: false,
    steps: [
      'Review checklist items',
      'Edit or reorder as needed',
      'Copy to task list or notes',
      'Use for tracking progress',
    ],
  },

  timeline: {
    draftId: '',
    draftType: 'timeline',
    targetService: 'roadmapService',
    serviceMethod: 'createRoadmapItem',
    requiredParameters: ['projectId', 'trackId'],
    partialApplicationSupported: true,
    steps: [
      'Review timeline phases',
      'Adjust dates and durations',
      'Create roadmap items for each phase',
      'Set deadlines appropriately',
      'Call markDraftAsPartiallyApplied() or acceptDraft()',
    ],
  },

  breakdown: {
    draftId: '',
    draftType: 'breakdown',
    targetService: 'roadmapService',
    serviceMethod: 'createRoadmapItem',
    requiredParameters: ['projectId', 'trackId', 'parentItemId'],
    partialApplicationSupported: true,
    steps: [
      'Review breakdown structure',
      'Edit items as needed',
      'Create child items via createRoadmapItem()',
      'Maintain hierarchy',
      'Call markDraftAsPartiallyApplied() or acceptDraft()',
    ],
  },

  risk_analysis: {
    draftId: '',
    draftType: 'risk_analysis',
    targetService: 'none',
    serviceMethod: 'none',
    requiredParameters: [],
    partialApplicationSupported: false,
    steps: [
      'Review identified risks',
      'Validate severity and likelihood',
      'Consider mitigation strategies',
      'Document in project notes',
    ],
  },
};

export function getDraftApplicationPlan(draftType: AIDraftType): DraftApplicationPlan {
  return DRAFT_APPLICATION_PLANS[draftType];
}

export interface DraftProvenanceVerification {
  valid: boolean;
  hasSourceEntities: boolean;
  hasContextSnapshot: boolean;
  hasGenerationTimestamp: boolean;
  hasContextHash: boolean;
  issues: string[];
}

export function verifyDraftProvenance(draft: AIDraft): DraftProvenanceVerification {
  const issues: string[] = [];

  const hasSourceEntities =
    draft.provenanceMetadata?.sourceEntityIds &&
    draft.provenanceMetadata.sourceEntityIds.length > 0;

  if (!hasSourceEntities) {
    issues.push('Missing source entity IDs');
  }

  const hasContextSnapshot =
    draft.provenanceMetadata?.contextSnapshot &&
    Object.keys(draft.provenanceMetadata.contextSnapshot).length > 0;

  if (!hasContextSnapshot) {
    issues.push('Missing context snapshot');
  }

  const hasGenerationTimestamp = !!draft.provenanceMetadata?.generatedAt;

  if (!hasGenerationTimestamp) {
    issues.push('Missing generation timestamp');
  }

  const hasContextHash = !!draft.contextScope;

  if (!hasContextHash) {
    issues.push('Missing context scope');
  }

  if (draft.provenanceMetadata?.sourceEntityIds && draft.provenanceMetadata?.sourceEntityTypes) {
    if (draft.provenanceMetadata.sourceEntityIds.length !== draft.provenanceMetadata.sourceEntityTypes.length) {
      issues.push('Source entity IDs and types length mismatch');
    }
  }

  return {
    valid: issues.length === 0,
    hasSourceEntities,
    hasContextSnapshot,
    hasGenerationTimestamp,
    hasContextHash,
    issues,
  };
}

export const DRAFT_SAFETY_GUARANTEES = {
  NO_AUTO_APPLICATION: 'Drafts can NEVER be applied automatically',
  USER_CONFIRMATION: 'Every application requires explicit user action',
  SERVICE_ROUTING: 'All writes go through authoritative services',
  PARTIAL_SUPPORTED: 'Some draft types support partial application',
  PROVENANCE_REQUIRED: 'All drafts must have complete provenance',
  NO_AI_IDS: 'AI-generated IDs are NEVER persisted directly',
  CONTEXT_HASH: 'Context snapshot hash enables reproducibility',
  STATUS_TRACKING: 'Draft lifecycle is fully tracked',
};

export const PROHIBITED_DRAFT_ACTIONS = {
  DIRECT_DB_WRITE: 'Draft content must NEVER write directly to roadmap_items, tracks, etc.',
  BYPASS_VALIDATION: 'Draft application must NEVER bypass service-layer validation',
  HIDDEN_MUTATIONS: 'Draft acceptance must NEVER make hidden changes',
  IMPLICIT_PERMISSIONS: 'Draft application must NEVER grant permissions',
  AUTO_TRIGGER: 'Draft acceptance must NEVER trigger automation',
};
