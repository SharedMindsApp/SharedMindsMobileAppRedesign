import type { RoadmapItemStatus, RoadmapItemType } from './coreTypes';

export interface TaskFlowTask {
  id: string;
  roadmapItemId: string | null;
  masterProjectId: string;
  title: string;
  description: string | null;
  status: RoadmapItemStatus;
  archived: boolean;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskFlowTaskInput {
  roadmapItemId?: string | null;
  masterProjectId: string;
  title: string;
  description?: string;
  status?: RoadmapItemStatus;
}

export interface UpdateTaskFlowTaskInput {
  title?: string;
  description?: string | null;
  status?: RoadmapItemStatus;
  archived?: boolean;
}

export type TaskFlowEligibleType = 'task' | 'habit' | 'goal';

export interface TaskFlowSyncResult {
  success: boolean;
  taskFlowTaskId: string | null;
  action: 'created' | 'updated' | 'archived' | 'skipped' | 'error';
  reason?: string;
}

export type TaskFlowSyncStatus = 'synced' | 'unsynced' | 'error';

export const TASKFLOW_ELIGIBLE_TYPES: readonly RoadmapItemType[] = [
  'task',
  'habit',
  'goal',
] as const;

export function isTaskFlowEligible(type: RoadmapItemType): boolean {
  return TASKFLOW_ELIGIBLE_TYPES.includes(type);
}
