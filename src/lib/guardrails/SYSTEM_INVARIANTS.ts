export const AUTHORITY_INVARIANTS = {
  GUARDRAILS_IS_SOURCE_OF_TRUTH: true,
  AI_CAN_WRITE: false,
  PERSONAL_SPACES_CAN_WRITE: false,
  TASK_FLOW_CAN_ORIGINATE_TASKS: false,
  MIND_MESH_CAN_CREATE_AUTHORITY: false,
  HOUSEHOLD_CAN_MUTATE_GUARDRAILS: false,
  EXTERNAL_SYSTEMS_READ_ONLY: true,
} as const;

export const AUTHORITATIVE_TABLES = [
  'master_projects',
  'guardrails_tracks',
  'roadmap_items',
  'roadmap_item_assignments',
  'project_people',
  'global_people',
  'project_users',
] as const;

export const DRAFT_TABLES = [
  'ai_drafts',
  'ai_interactions',
  'ai_tag_resolutions',
] as const;

export const CONSUMPTION_TABLES = [
  'personal_space_consumption',
  'task_flow_tasks',
  'mind_mesh_nodes',
] as const;

export const AI_INVARIANTS = {
  OUTPUTS_ARE_DRAFTS: true,
  CANNOT_WRITE_DIRECTLY: true,
  REQUIRES_USER_CONFIRMATION: true,
  PERMISSION_SCOPED_ONLY: true,
  TOKEN_BUDGETS_ENFORCED: true,
  NO_AUTOMATIC_EXECUTION: true,
} as const;

export const PERMISSION_INVARIANTS = {
  NO_CROSS_PROJECT_READS_WITHOUT_CHECK: true,
  NO_PERMISSION_ESCALATION: true,
  RLS_ALWAYS_ENABLED: true,
  PROJECT_MEMBERSHIP_REQUIRED: true,
  SHARED_TRACKS_REQUIRE_SOURCE_ACCESS: true,
} as const;

export const TIMELINE_INVARIANTS = {
  NO_CHILD_ON_TIMELINE: true,
  MAX_COMPOSITION_DEPTH: 3,
  PARENT_MUST_SPAN_CHILDREN: true,
  NO_CIRCULAR_COMPOSITION: true,
} as const;

export const SHARED_TRACK_INVARIANTS = {
  ONE_PRIMARY_AUTHORITY: true,
  VISIBILITY_EXPLICIT: true,
  PERMISSION_INHERITED: true,
  NO_ORPHANED_SHARED_TRACKS: true,
} as const;

export const COLLABORATION_INVARIANTS = {
  LOGS_APPEND_ONLY: true,
  NO_LOG_MUTATION: true,
  NO_LOG_DELETION: true,
  PRESENCE_EPHEMERAL: true,
  CURSORS_EPHEMERAL: true,
} as const;

export const OWNERSHIP_INVARIANTS = {
  TRACKS_OWNED_BY_PROJECT: true,
  ITEMS_OWNED_BY_PROJECT: true,
  DRAFTS_OWNED_BY_USER: true,
  PERSONAL_LINKS_OWNED_BY_USER: true,
  GLOBAL_PEOPLE_OWNED_BY_USER: true,
} as const;

export const LIFECYCLE_INVARIANTS = {
  SOFT_DELETE_PREFERRED: true,
  ARCHIVE_BEFORE_DELETE: true,
  ORPHAN_CLEANUP_ALLOWED: true,
  CASCADE_DELETES_EXPLICIT: true,
} as const;

export const SIDE_EFFECT_INVARIANTS = {
  ROADMAP_MAY_CREATE_MINDMESH: true,
  ROADMAP_MAY_SYNC_TASKFLOW: true,
  ROADMAP_CANNOT_CREATE_DRAFTS: true,
  ROADMAP_CANNOT_AFFECT_PERSONAL_SPACES: true,
  AI_CANNOT_TRIGGER_NOTIFICATIONS: true,
  AI_CANNOT_TRIGGER_AUTOMATIONS: true,
} as const;

export const ANTI_PATTERN_FLAGS = {
  NO_AI_DIRECT_WRITE: true,
  NO_PERSONAL_SPACES_MUTATION: true,
  NO_UI_BYPASSING_SERVICES: true,
  NO_CROSS_PROJECT_WITHOUT_PERMISSION: true,
  NO_IMPLICIT_AUTOMATION: true,
  NO_SILENT_ESCALATION: true,
} as const;

export const CHAT_SURFACE_INVARIANTS = {
  NO_CONVERSATION_WITHOUT_SURFACE: true,
  NO_SURFACE_SWITCHING: true,
  NO_CROSS_SURFACE_READS: true,
  NO_GLOBAL_CHAT: true,
  NO_CROSS_PROJECT_CONTEXT: true,
  EPHEMERAL_CHATS_EXPIRE: true,
  SAVED_CHAT_LIMITS_ENFORCED: true,
  PERSONAL_CANNOT_ACCESS_PROJECT: true,
  PROJECT_SCOPED_TO_ONE_PROJECT: true,
} as const;

export class InvariantViolationError extends Error {
  constructor(
    public invariantName: string,
    public context: Record<string, any>,
    message?: string
  ) {
    super(message || `Invariant violation: ${invariantName}`);
    this.name = 'InvariantViolationError';
  }
}

export function assertAuthorityBoundary(
  operation: string,
  source: 'ai' | 'personal_spaces' | 'task_flow' | 'mind_mesh' | 'household' | 'guardrails'
): void {
  if (source === 'ai' && !AUTHORITY_INVARIANTS.AI_CAN_WRITE) {
    throw new InvariantViolationError(
      'AI_CAN_WRITE',
      { operation, source },
      'AI cannot write directly to authoritative tables. All outputs must be drafts requiring user confirmation.'
    );
  }

  if (source === 'personal_spaces' && !AUTHORITY_INVARIANTS.PERSONAL_SPACES_CAN_WRITE) {
    throw new InvariantViolationError(
      'PERSONAL_SPACES_CAN_WRITE',
      { operation, source },
      'Personal Spaces cannot mutate Guardrails authoritative state. Only consumption allowed.'
    );
  }

  if (source === 'task_flow' && !AUTHORITY_INVARIANTS.TASK_FLOW_CAN_ORIGINATE_TASKS) {
    throw new InvariantViolationError(
      'TASK_FLOW_CAN_ORIGINATE_TASKS',
      { operation, source },
      'Task Flow cannot originate tasks. All tasks must sync from roadmap items.'
    );
  }

  if (source === 'mind_mesh' && !AUTHORITY_INVARIANTS.MIND_MESH_CAN_CREATE_AUTHORITY) {
    throw new InvariantViolationError(
      'MIND_MESH_CAN_CREATE_AUTHORITY',
      { operation, source },
      'Mind Mesh cannot create authoritative entities. Only nodes and edges allowed.'
    );
  }

  if (source === 'household' && !AUTHORITY_INVARIANTS.HOUSEHOLD_CAN_MUTATE_GUARDRAILS) {
    throw new InvariantViolationError(
      'HOUSEHOLD_CAN_MUTATE_GUARDRAILS',
      { operation, source },
      'Household system cannot mutate Guardrails. Separate domain boundaries.'
    );
  }
}

export function assertDraftSafety(
  operation: string,
  isDraft: boolean,
  requiresConfirmation: boolean
): void {
  if (!AI_INVARIANTS.OUTPUTS_ARE_DRAFTS) {
    throw new InvariantViolationError(
      'OUTPUTS_ARE_DRAFTS',
      { operation, isDraft },
      'AI outputs must always be drafts.'
    );
  }

  if (!isDraft) {
    throw new InvariantViolationError(
      'OUTPUTS_ARE_DRAFTS',
      { operation, isDraft },
      'This AI operation must produce a draft, not a direct write.'
    );
  }

  if (requiresConfirmation && !AI_INVARIANTS.REQUIRES_USER_CONFIRMATION) {
    throw new InvariantViolationError(
      'REQUIRES_USER_CONFIRMATION',
      { operation },
      'This operation requires explicit user confirmation.'
    );
  }
}

export function assertPermissionBoundary(
  operation: string,
  userId: string,
  projectId: string | null,
  entityProjectId: string | null
): void {
  if (projectId && entityProjectId && projectId !== entityProjectId) {
    if (PERMISSION_INVARIANTS.NO_CROSS_PROJECT_READS_WITHOUT_CHECK) {
      throw new InvariantViolationError(
        'NO_CROSS_PROJECT_READS_WITHOUT_CHECK',
        { operation, userId, projectId, entityProjectId },
        'Cross-project access requires explicit permission check.'
      );
    }
  }
}

export function assertTimelineEligibility(
  itemId: string,
  hasParent: boolean,
  hasChildren: boolean
): void {
  if (hasParent && TIMELINE_INVARIANTS.NO_CHILD_ON_TIMELINE) {
    throw new InvariantViolationError(
      'NO_CHILD_ON_TIMELINE',
      { itemId, hasParent },
      'Items with parents cannot appear on timeline. Only root and leaf items allowed.'
    );
  }

  if (hasChildren && hasParent) {
    throw new InvariantViolationError(
      'NO_CHILD_ON_TIMELINE',
      { itemId, hasParent, hasChildren },
      'Middle-tier items (with both parent and children) cannot appear on timeline.'
    );
  }
}

export function assertCompositionDepth(
  depth: number,
  maxDepth: number = TIMELINE_INVARIANTS.MAX_COMPOSITION_DEPTH
): void {
  if (depth > maxDepth) {
    throw new InvariantViolationError(
      'MAX_COMPOSITION_DEPTH',
      { depth, maxDepth },
      `Composition depth ${depth} exceeds maximum ${maxDepth}.`
    );
  }
}

export function assertSharedTrackInvariant(
  trackId: string,
  hasMultiplePrimary: boolean,
  hasNoAuthority: boolean
): void {
  if (!SHARED_TRACK_INVARIANTS.ONE_PRIMARY_AUTHORITY) {
    return;
  }

  if (hasMultiplePrimary) {
    throw new InvariantViolationError(
      'ONE_PRIMARY_AUTHORITY',
      { trackId },
      'Shared track cannot have multiple primary authority projects.'
    );
  }

  if (hasNoAuthority) {
    throw new InvariantViolationError(
      'NO_ORPHANED_SHARED_TRACKS',
      { trackId },
      'Shared track must have exactly one primary authority project.'
    );
  }
}

export function assertCollaborationLogImmutability(
  operation: 'update' | 'delete',
  logId: string
): void {
  if (operation === 'update' && COLLABORATION_INVARIANTS.NO_LOG_MUTATION) {
    throw new InvariantViolationError(
      'NO_LOG_MUTATION',
      { operation, logId },
      'Collaboration logs are append-only and cannot be updated.'
    );
  }

  if (operation === 'delete' && COLLABORATION_INVARIANTS.NO_LOG_DELETION) {
    throw new InvariantViolationError(
      'NO_LOG_DELETION',
      { operation, logId },
      'Collaboration logs are append-only and cannot be deleted.'
    );
  }
}

export function assertOwnership(
  entityType: string,
  entityOwnerId: string,
  requestingUserId: string,
  operation: 'read' | 'write'
): void {
  if (operation === 'write' && entityOwnerId !== requestingUserId) {
    if (entityType === 'draft' || entityType === 'personal_link') {
      throw new InvariantViolationError(
        'OWNERSHIP_VIOLATION',
        { entityType, entityOwnerId, requestingUserId },
        `Only owner can modify ${entityType}.`
      );
    }
  }
}

export function assertNoAntiPattern(
  pattern: keyof typeof ANTI_PATTERN_FLAGS,
  context: Record<string, any>
): void {
  if (!ANTI_PATTERN_FLAGS[pattern]) {
    throw new InvariantViolationError(
      pattern,
      context,
      `Anti-pattern detected: ${pattern}`
    );
  }
}

export function assertTableAuthority(
  table: string,
  operation: 'read' | 'write',
  source: 'ui' | 'api' | 'ai' | 'external'
): void {
  const isAuthoritative = AUTHORITATIVE_TABLES.includes(table as any);
  const isDraft = DRAFT_TABLES.includes(table as any);
  const isConsumption = CONSUMPTION_TABLES.includes(table as any);

  if (isAuthoritative && operation === 'write' && source === 'ai') {
    throw new InvariantViolationError(
      'AI_CANNOT_WRITE_AUTHORITATIVE',
      { table, operation, source },
      'AI cannot write directly to authoritative tables.'
    );
  }

  if (isAuthoritative && operation === 'write' && source === 'external') {
    throw new InvariantViolationError(
      'EXTERNAL_SYSTEMS_READ_ONLY',
      { table, operation, source },
      'External systems cannot write to authoritative tables.'
    );
  }

  if (!isDraft && source === 'ai' && operation === 'write') {
    throw new InvariantViolationError(
      'AI_MUST_WRITE_DRAFTS',
      { table, operation, source },
      'AI can only write to draft tables.'
    );
  }
}

export function assertSideEffectBoundary(
  action: string,
  intendedEffect: string
): void {
  const illegalEffects: Record<string, string[]> = {
    create_roadmap_item: ['create_ai_draft', 'affect_personal_spaces', 'send_notification'],
    update_roadmap_item: ['create_ai_draft', 'affect_personal_spaces', 'send_notification'],
    ai_generate_content: ['create_roadmap_item', 'trigger_automation', 'send_notification'],
    personal_space_action: ['mutate_guardrails', 'affect_other_users'],
  };

  const illegal = illegalEffects[action] || [];
  if (illegal.includes(intendedEffect)) {
    throw new InvariantViolationError(
      'ILLEGAL_SIDE_EFFECT',
      { action, intendedEffect },
      `Action ${action} cannot trigger side effect ${intendedEffect}.`
    );
  }
}

export function assertChatSurfaceRequired(conversationId: string, hasSurface: boolean): void {
  if (!hasSurface && CHAT_SURFACE_INVARIANTS.NO_CONVERSATION_WITHOUT_SURFACE) {
    throw new InvariantViolationError(
      'NO_CONVERSATION_WITHOUT_SURFACE',
      { conversationId },
      'Every AI conversation must have a surface type'
    );
  }
}

export function assertNoSurfaceSwitching(
  conversationId: string,
  currentSurface: string,
  requestedSurface: string
): void {
  if (currentSurface !== requestedSurface && CHAT_SURFACE_INVARIANTS.NO_SURFACE_SWITCHING) {
    throw new InvariantViolationError(
      'NO_SURFACE_SWITCHING',
      { conversationId, currentSurface, requestedSurface },
      'Cannot switch surface type within a conversation'
    );
  }
}

export function assertNoCrossSurfaceReads(
  conversationSurface: string,
  dataSurface: string,
  dataType: string
): void {
  if (conversationSurface !== dataSurface && CHAT_SURFACE_INVARIANTS.NO_CROSS_SURFACE_READS) {
    throw new InvariantViolationError(
      'NO_CROSS_SURFACE_READS',
      { conversationSurface, dataSurface, dataType },
      `Surface ${conversationSurface} cannot read data from ${dataSurface}`
    );
  }
}

export function assertNoGlobalChat(): void {
  if (CHAT_SURFACE_INVARIANTS.NO_GLOBAL_CHAT) {
    throw new InvariantViolationError(
      'NO_GLOBAL_CHAT',
      {},
      'Global AI chat is not allowed. All conversations must be surface-scoped'
    );
  }
}

export function assertPersonalCannotAccessProject(isPersonalSurface: boolean, hasProjectAccess: boolean): void {
  if (isPersonalSurface && hasProjectAccess && CHAT_SURFACE_INVARIANTS.PERSONAL_CANNOT_ACCESS_PROJECT) {
    throw new InvariantViolationError(
      'PERSONAL_CANNOT_ACCESS_PROJECT',
      { isPersonalSurface, hasProjectAccess },
      'Personal surface cannot access project-authoritative data'
    );
  }
}

export const INVARIANT_REGISTRY = {
  AUTHORITY_INVARIANTS,
  AI_INVARIANTS,
  PERMISSION_INVARIANTS,
  TIMELINE_INVARIANTS,
  SHARED_TRACK_INVARIANTS,
  COLLABORATION_INVARIANTS,
  OWNERSHIP_INVARIANTS,
  LIFECYCLE_INVARIANTS,
  SIDE_EFFECT_INVARIANTS,
  ANTI_PATTERN_FLAGS,
  CHAT_SURFACE_INVARIANTS,
} as const;

export function logInvariantCheck(
  invariantName: string,
  passed: boolean,
  context: Record<string, any>
): void {
  if (!passed) {
    console.error(`[INVARIANT VIOLATION] ${invariantName}`, context);
  }
}

export function validateInvariants(): {
  valid: boolean;
  violations: Array<{ invariant: string; reason: string }>;
} {
  const violations: Array<{ invariant: string; reason: string }> = [];

  if (AUTHORITY_INVARIANTS.AI_CAN_WRITE) {
    violations.push({
      invariant: 'AI_CAN_WRITE',
      reason: 'AI_CAN_WRITE must be false',
    });
  }

  if (AUTHORITY_INVARIANTS.PERSONAL_SPACES_CAN_WRITE) {
    violations.push({
      invariant: 'PERSONAL_SPACES_CAN_WRITE',
      reason: 'PERSONAL_SPACES_CAN_WRITE must be false',
    });
  }

  if (AUTHORITY_INVARIANTS.TASK_FLOW_CAN_ORIGINATE_TASKS) {
    violations.push({
      invariant: 'TASK_FLOW_CAN_ORIGINATE_TASKS',
      reason: 'TASK_FLOW_CAN_ORIGINATE_TASKS must be false',
    });
  }

  if (AUTHORITY_INVARIANTS.MIND_MESH_CAN_CREATE_AUTHORITY) {
    violations.push({
      invariant: 'MIND_MESH_CAN_CREATE_AUTHORITY',
      reason: 'MIND_MESH_CAN_CREATE_AUTHORITY must be false',
    });
  }

  if (!AI_INVARIANTS.OUTPUTS_ARE_DRAFTS) {
    violations.push({
      invariant: 'OUTPUTS_ARE_DRAFTS',
      reason: 'AI outputs must always be drafts',
    });
  }

  if (!PERMISSION_INVARIANTS.NO_CROSS_PROJECT_READS_WITHOUT_CHECK) {
    violations.push({
      invariant: 'NO_CROSS_PROJECT_READS_WITHOUT_CHECK',
      reason: 'Cross-project reads require permission checks',
    });
  }

  if (!COLLABORATION_INVARIANTS.LOGS_APPEND_ONLY) {
    violations.push({
      invariant: 'LOGS_APPEND_ONLY',
      reason: 'Collaboration logs must be append-only',
    });
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export const INVARIANT_DOCUMENTATION = {
  AUTHORITY: 'Guardrails is the single source of truth for all project entities',
  AI_DRAFTS: 'AI outputs are always drafts requiring user confirmation',
  PERMISSION_SCOPED: 'All operations respect user permissions and project boundaries',
  TIMELINE_RULES: 'Timeline eligibility enforced at composition level',
  SHARED_TRACKS: 'Shared tracks have exactly one primary authority project',
  COLLABORATION: 'Collaboration logs are immutable, append-only records',
  OWNERSHIP: 'Clear ownership semantics for all entity types',
  SIDE_EFFECTS: 'Explicit, bounded side-effect propagation',
  ANTI_PATTERNS: 'Forbidden implementation patterns explicitly blocked',
  CHAT_SURFACES: 'All AI conversations must be surface-scoped with strict boundaries',
};

export default INVARIANT_REGISTRY;
