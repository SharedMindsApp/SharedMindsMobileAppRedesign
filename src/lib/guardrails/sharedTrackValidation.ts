import type { TrackAuthorityMode } from './tracksTypes';

export const MAX_LINKED_PROJECTS = 50;

export const DEFAULT_AUTHORITY_MODE: TrackAuthorityMode = 'primary_project_only';

export const SHARED_TRACK_RULES = {
  MAX_LINKED_PROJECTS,
  ALLOW_CROSS_PROJECT_SUBTRACKS: true,
  REQUIRE_PRIMARY_OWNER: true,
  ALLOW_AUTHORITY_MODE_CHANGE: true,
};

export interface SharedTrackValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export function validateTrackLinking(
  trackId: string,
  projectId: string,
  existingProjectIds: string[]
): SharedTrackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trackId || !projectId) {
    errors.push('Track ID and Project ID are required');
  }

  if (existingProjectIds.includes(projectId)) {
    errors.push('Track is already linked to this project');
  }

  if (existingProjectIds.length >= MAX_LINKED_PROJECTS) {
    errors.push(
      `Cannot link track to more than ${MAX_LINKED_PROJECTS} projects`
    );
  }

  if (existingProjectIds.length > 10) {
    warnings.push(
      'Track is linked to many projects. Consider organization implications.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateTrackUnlinking(
  trackId: string,
  projectId: string,
  existingProjectIds: string[],
  isPrimaryProject: boolean
): SharedTrackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trackId || !projectId) {
    errors.push('Track ID and Project ID are required');
  }

  if (!existingProjectIds.includes(projectId)) {
    errors.push('Track is not linked to this project');
  }

  if (existingProjectIds.length === 1) {
    warnings.push(
      'Unlinking the last project will make this track inaccessible. Consider deleting the track instead.'
    );
  }

  if (isPrimaryProject && existingProjectIds.length > 1) {
    errors.push(
      'Cannot unlink primary owner project while other projects are linked. Transfer primary ownership first or unlink other projects.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateAuthorityMode(
  authorityMode: TrackAuthorityMode,
  hasMultipleProjects: boolean
): SharedTrackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!authorityMode) {
    errors.push('Authority mode is required');
  }

  if (
    authorityMode === 'primary_project_only' &&
    hasMultipleProjects
  ) {
    warnings.push(
      'Primary project only mode restricts editing to one project. Other projects will have read-only access.'
    );
  }

  if (authorityMode === 'shared_editing' && hasMultipleProjects) {
    warnings.push(
      'Shared editing mode allows all linked projects to edit. Consider coordination requirements.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateConvertToShared(
  trackHasSubtracks: boolean,
  trackHasItems: boolean,
  trackHasChildren: boolean
): SharedTrackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (trackHasSubtracks) {
    warnings.push(
      'Track has subtracks. All subtracks will also be accessible across linked projects.'
    );
  }

  if (trackHasItems) {
    warnings.push(
      'Track has roadmap items. All items will be accessible across linked projects.'
    );
  }

  if (trackHasChildren && !SHARED_TRACK_RULES.ALLOW_CROSS_PROJECT_SUBTRACKS) {
    errors.push(
      'Track has child tracks. Cross-project subtracks are not enabled.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function canEditTrackContent(
  authorityMode: TrackAuthorityMode,
  isPrimaryProject: boolean,
  isLinkedProject: boolean
): boolean {
  if (!isLinkedProject) {
    return false;
  }

  if (authorityMode === 'shared_editing') {
    return true;
  }

  if (authorityMode === 'primary_project_only') {
    return isPrimaryProject;
  }

  return false;
}

export function canConfigureTrackInstance(
  isLinkedProject: boolean
): boolean {
  return isLinkedProject;
}

export const SHARED_TRACK_ERROR_MESSAGES = {
  NOT_LINKED: 'Track is not linked to this project',
  ALREADY_LINKED: 'Track is already linked to this project',
  MAX_PROJECTS_EXCEEDED: `Cannot link track to more than ${MAX_LINKED_PROJECTS} projects`,
  CANNOT_UNLINK_PRIMARY: 'Cannot unlink primary owner project',
  NO_EDIT_PERMISSION: 'Project does not have edit permission for this track',
  TRACK_NOT_SHARED: 'Track is not configured as shared',
  INVALID_AUTHORITY_MODE: 'Invalid authority mode',
  PRIMARY_OWNER_REQUIRED: 'Shared tracks must have a primary owner project',
};

export interface EditPermissionCheck {
  canEdit: boolean;
  reason?: string;
}

export function checkEditPermission(
  trackIsShared: boolean,
  trackAuthorityMode: TrackAuthorityMode,
  trackMasterProjectId: string,
  trackPrimaryOwnerProjectId: string | null,
  requestingProjectId: string,
  isLinkedProject: boolean
): EditPermissionCheck {
  if (!trackIsShared) {
    const canEdit = trackMasterProjectId === requestingProjectId;
    return {
      canEdit,
      reason: canEdit ? undefined : 'Project does not own this track',
    };
  }

  if (!isLinkedProject) {
    return {
      canEdit: false,
      reason: SHARED_TRACK_ERROR_MESSAGES.NOT_LINKED,
    };
  }

  if (trackAuthorityMode === 'shared_editing') {
    return { canEdit: true };
  }

  if (trackAuthorityMode === 'primary_project_only') {
    const isPrimaryProject =
      trackPrimaryOwnerProjectId === requestingProjectId;
    return {
      canEdit: isPrimaryProject,
      reason: isPrimaryProject
        ? undefined
        : 'Only primary owner project can edit in primary_project_only mode',
    };
  }

  return {
    canEdit: false,
    reason: SHARED_TRACK_ERROR_MESSAGES.INVALID_AUTHORITY_MODE,
  };
}

export function validatePrimaryOwnerTransfer(
  currentPrimaryProjectId: string | null,
  newPrimaryProjectId: string,
  linkedProjectIds: string[]
): SharedTrackValidationResult {
  const errors: string[] = [];

  if (!newPrimaryProjectId) {
    errors.push('New primary owner project ID is required');
  }

  if (!linkedProjectIds.includes(newPrimaryProjectId)) {
    errors.push('New primary owner must be a linked project');
  }

  if (currentPrimaryProjectId === newPrimaryProjectId) {
    errors.push('New primary owner is already the current primary owner');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const SHARED_TRACK_RULES_DESCRIPTION = {
  MAX_LINKED_PROJECTS: `A track can be linked to at most ${MAX_LINKED_PROJECTS} projects.`,
  ALLOW_CROSS_PROJECT_SUBTRACKS: SHARED_TRACK_RULES.ALLOW_CROSS_PROJECT_SUBTRACKS
    ? 'Subtracks inherit parent track linkages across projects.'
    : 'Subtracks must belong to same project as parent.',
  REQUIRE_PRIMARY_OWNER: SHARED_TRACK_RULES.REQUIRE_PRIMARY_OWNER
    ? 'Shared tracks must designate a primary owner project.'
    : 'Shared tracks can be truly global without an owner.',
  AUTHORITY_MODES:
    'shared_editing: all linked projects can edit. primary_project_only: only primary owner can edit.',
};
