export type ChatSurfaceType = 'project' | 'personal' | 'shared';

export interface ChatSurface {
  surfaceType: ChatSurfaceType;
  masterProjectId?: string | null;
}

export interface ProjectSurface extends ChatSurface {
  surfaceType: 'project';
  masterProjectId: string;
}

export interface PersonalSurface extends ChatSurface {
  surfaceType: 'personal';
  masterProjectId: null;
}

export interface SharedSurface extends ChatSurface {
  surfaceType: 'shared';
  masterProjectId: null;
}

export interface ConversationWithSurface {
  id: string;
  user_id: string;
  surface_type: ChatSurfaceType;
  master_project_id: string | null;
  is_ephemeral: boolean;
  expires_at: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SavedChatLimits {
  maxPerSurface: number;
  maxSurfaces: number;
  maxTotalSaved: number;
}

export const CHAT_LIMITS: SavedChatLimits = {
  maxPerSurface: 10,
  maxSurfaces: 6,
  maxTotalSaved: 60,
};

export interface SurfaceLimitStatus {
  surfaceType: ChatSurfaceType;
  masterProjectId?: string | null;
  currentCount: number;
  maxCount: number;
  canCreateSaved: boolean;
  canCreateEphemeral: boolean;
}

export interface CreateConversationOptions {
  userId: string;
  surfaceType: ChatSurfaceType;
  masterProjectId?: string | null;
  title: string;
  isEphemeral?: boolean;
}

export interface SurfaceValidationError {
  code: string;
  message: string;
  surfaceType: ChatSurfaceType;
  masterProjectId?: string | null;
}

export const EPHEMERAL_EXPIRY_HOURS = 24;

export function getSurfaceKey(surfaceType: ChatSurfaceType, masterProjectId?: string | null): string {
  if (surfaceType === 'project' && masterProjectId) {
    return `project:${masterProjectId}`;
  }
  return surfaceType;
}

export function isProjectSurface(surface: ChatSurface): surface is ProjectSurface {
  return surface.surfaceType === 'project' && !!surface.masterProjectId;
}

export function isPersonalSurface(surface: ChatSurface): surface is PersonalSurface {
  return surface.surfaceType === 'personal' && !surface.masterProjectId;
}

export function isSharedSurface(surface: ChatSurface): surface is SharedSurface {
  return surface.surfaceType === 'shared' && !surface.masterProjectId;
}

export function validateSurfaceConstraints(surface: ChatSurface): SurfaceValidationError | null {
  if (surface.surfaceType === 'project') {
    if (!surface.masterProjectId) {
      return {
        code: 'MISSING_PROJECT_ID',
        message: 'Project surface requires master_project_id',
        surfaceType: surface.surfaceType,
      };
    }
  } else {
    if (surface.masterProjectId) {
      return {
        code: 'UNEXPECTED_PROJECT_ID',
        message: `${surface.surfaceType} surface must not have master_project_id`,
        surfaceType: surface.surfaceType,
        masterProjectId: surface.masterProjectId,
      };
    }
  }

  return null;
}

export function getSurfaceLabel(surfaceType: ChatSurfaceType): string {
  switch (surfaceType) {
    case 'project':
      return 'Project Chat';
    case 'personal':
      return 'Personal Chat';
    case 'shared':
      return 'Shared Spaces Chat';
    default:
      return 'Unknown';
  }
}

export function getSurfaceDescription(surfaceType: ChatSurfaceType): string {
  switch (surfaceType) {
    case 'project':
      return 'Scoped to this specific project and its authoritative data';
    case 'personal':
      return 'Scoped to Personal Spaces with consumed Guardrails data (read-only)';
    case 'shared':
      return 'Scoped to Shared Spaces with visibility-controlled collaboration data';
    default:
      return '';
  }
}

export function canSurfaceAccessEntity(
  surfaceType: ChatSurfaceType,
  surfaceProjectId: string | null,
  entityType: string,
  entityProjectId?: string | null
): boolean {
  switch (surfaceType) {
    case 'project':
      if (!surfaceProjectId) return false;
      if (entityType === 'project' || entityType === 'track' || entityType === 'roadmap_item') {
        return entityProjectId === surfaceProjectId;
      }
      return false;

    case 'personal':
      return entityType === 'personal_space' || entityType === 'consumed_data';

    case 'shared':
      return entityType === 'shared_space' || entityType === 'shared_track';

    default:
      return false;
  }
}
