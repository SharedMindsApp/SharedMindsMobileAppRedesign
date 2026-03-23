export type CollaborationSurfaceType =
  | 'project'
  | 'track'
  | 'roadmap_item'
  | 'execution_unit'
  | 'taskflow'
  | 'mind_mesh'
  | 'personal_bridge'
  | 'side_project'
  | 'offshoot_idea';

export type CollaborationActivityType =
  | 'created'
  | 'updated'
  | 'commented'
  | 'viewed'
  | 'linked'
  | 'unlinked'
  | 'status_changed'
  | 'deadline_changed'
  | 'assigned'
  | 'unassigned'
  | 'shared'
  | 'archived'
  | 'restored'
  | 'converted'
  | 'synced';

export interface CollaborationActivity {
  id: string;
  userId: string;
  projectId: string | null;
  surfaceType: CollaborationSurfaceType;
  entityType: string;
  entityId: string;
  activityType: CollaborationActivityType;
  contextMetadata: Record<string, any>;
  createdAt: string;
}

export interface RecordActivityInput {
  userId: string;
  projectId?: string | null;
  surfaceType: CollaborationSurfaceType;
  entityType: string;
  entityId: string;
  activityType: CollaborationActivityType;
  contextMetadata?: Record<string, any>;
}

export interface EntityCollaborator {
  userId: string;
  activityCount: number;
  lastActivityAt: string;
  activityTypes: CollaborationActivityType[];
}

export interface CollaborationFootprintEntry {
  surfaceType: CollaborationSurfaceType;
  entityType: string;
  entityId: string;
  activityCount: number;
  lastActivityAt: string;
}

export interface CollaborationHeatmapEntry {
  surfaceType: CollaborationSurfaceType;
  activityCount: number;
  uniqueUsers: number;
  mostRecentActivity: string;
}

export interface ActiveUser {
  userId: string;
  activityCount: number;
  lastActivityAt: string;
}

export interface DormantEntity {
  entityType: string;
  entityId: string;
  lastActivityAt: string;
  collaboratorCount: number;
}

export interface CrossProjectActivity {
  projectId: string;
  userCount: number;
  activityCount: number;
  lastActivityAt: string;
}

export interface CollaboratedTrack {
  trackId: string;
  collaboratorCount: number;
  activityCount: number;
  lastActivityAt: string;
}

export interface ParticipationIntensity {
  totalActivities: number;
  firstActivityAt: string;
  lastActivityAt: string;
  daysActive: number;
  activityTypes: CollaborationActivityType[];
}

export interface GetCollaboratorsOptions {
  entityType: string;
  entityId: string;
  limit?: number;
}

export interface GetCollaborationFootprintOptions {
  userId: string;
  projectId?: string;
  daysBack?: number;
}

export interface GetProjectHeatmapOptions {
  projectId: string;
  daysBack?: number;
}

export interface GetActiveUsersOptions {
  surfaceType: CollaborationSurfaceType;
  entityId?: string;
  daysBack?: number;
}

export interface GetDormantEntitiesOptions {
  projectId: string;
  dormantDays?: number;
  minCollaborators?: number;
}

export interface GetCrossProjectActivityOptions {
  entityType: string;
  entityId: string;
}

export interface GetMostCollaboratedTracksOptions {
  projectId?: string;
  limit?: number;
  daysBack?: number;
}

export interface GetParticipationIntensityOptions {
  entityType: string;
  entityId: string;
  userId: string;
}

export const COLLABORATION_SURFACE_DESCRIPTIONS: Record<
  CollaborationSurfaceType,
  string
> = {
  project: 'High-level project activity and management',
  track: 'Track-level planning and organization',
  roadmap_item: 'Roadmap item execution and updates',
  execution_unit: 'Composable execution unit work',
  taskflow: 'Task Flow board and task management',
  mind_mesh: 'Mind Mesh ideation and knowledge graph',
  personal_bridge: 'Personal Spaces Bridge connections',
  side_project: 'Side project exploration',
  offshoot_idea: 'Offshoot idea capture and development',
};

export const ACTIVITY_TYPE_DESCRIPTIONS: Record<
  CollaborationActivityType,
  string
> = {
  created: 'Entity was created',
  updated: 'Entity was modified',
  commented: 'Comment was added',
  viewed: 'Entity was viewed',
  linked: 'Entity was linked to another entity',
  unlinked: 'Entity was unlinked',
  status_changed: 'Status was updated',
  deadline_changed: 'Deadline was modified',
  assigned: 'Person was assigned',
  unassigned: 'Person was unassigned',
  shared: 'Entity was shared across projects',
  archived: 'Entity was archived',
  restored: 'Entity was restored from archive',
  converted: 'Entity was converted to another type',
  synced: 'Entity was synced with external system',
};

export interface CollaborationAwarenessRules {
  APPEND_ONLY: boolean;
  NO_UPDATES: boolean;
  NO_DELETES: boolean;
  PERMISSION_SAFE: boolean;
  PRIVACY_AWARE: boolean;
}

export const COLLABORATION_RULES: CollaborationAwarenessRules = {
  APPEND_ONLY: true,
  NO_UPDATES: true,
  NO_DELETES: true,
  PERMISSION_SAFE: true,
  PRIVACY_AWARE: true,
};

export const AWARENESS_DISTINCTIONS = {
  NOT_PERMISSION: 'Awareness does not grant permission',
  NOT_ASSIGNMENT: 'Awareness does not indicate assignment',
  NOT_RESPONSIBILITY: 'Awareness does not imply responsibility',
  NOT_OWNERSHIP: 'Awareness does not confer ownership',
};
