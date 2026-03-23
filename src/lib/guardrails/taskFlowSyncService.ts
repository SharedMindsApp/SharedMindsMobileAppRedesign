import { supabase } from '../supabase';
import type {
  TaskFlowTask,
  CreateTaskFlowTaskInput,
  UpdateTaskFlowTaskInput,
  TaskFlowSyncResult,
  TaskFlowEligibleType,
} from './taskFlowTypes';
import { isTaskFlowEligible } from './taskFlowTypes';
import type { RoadmapItem, RoadmapItemType } from './coreTypes';

const TABLE_NAME = 'taskflow_tasks';

function transformKeysFromDb(row: any): TaskFlowTask {
  return {
    id: row.id,
    roadmapItemId: row.roadmap_item_id,
    masterProjectId: row.master_project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    archived: row.archived,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

export function isRoadmapItemTaskFlowEligible(item: RoadmapItem): boolean {
  const { TASKFLOW_SYNC_CHILD_ITEMS } = require('./roadmapItemCompositionRules');

  if (!TASKFLOW_SYNC_CHILD_ITEMS && item.parentItemId) {
    return false;
  }

  return isTaskFlowEligible(item.type);
}

export async function getTaskFlowTaskForRoadmapItem(
  roadmapItemId: string
): Promise<TaskFlowTask | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('roadmap_item_id', roadmapItemId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching task flow task for roadmap item:', error);
    return null;
  }

  return data ? transformKeysFromDb(data) : null;
}

export async function getTaskFlowTask(taskId: string): Promise<TaskFlowTask | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching task flow task:', error);
    return null;
  }

  return data ? transformKeysFromDb(data) : null;
}

export async function getTaskFlowTasksForProject(
  masterProjectId: string
): Promise<TaskFlowTask[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching task flow tasks:', error);
    return [];
  }

  return data.map(transformKeysFromDb);
}

export async function createTaskFlowTask(
  input: CreateTaskFlowTaskInput
): Promise<TaskFlowTask> {
  const dbInput = transformKeysToSnake({
    ...input,
    status: input.status || 'not_started',
    syncedAt: input.roadmapItemId ? new Date().toISOString() : null,
  });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task flow task: ${error.message}`);
  }

  return transformKeysFromDb(data);
}

export async function updateTaskFlowTask(
  taskId: string,
  input: UpdateTaskFlowTaskInput
): Promise<TaskFlowTask> {
  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task flow task: ${error.message}`);
  }

  return transformKeysFromDb(data);
}

export async function archiveTaskFlowTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ archived: true })
    .eq('id', taskId);

  if (error) {
    throw new Error(`Failed to archive task flow task: ${error.message}`);
  }
}

export async function syncRoadmapItemToTaskFlow(
  roadmapItem: RoadmapItem
): Promise<TaskFlowSyncResult> {
  if (!isRoadmapItemTaskFlowEligible(roadmapItem)) {
    return {
      success: true,
      taskFlowTaskId: null,
      action: 'skipped',
      reason: `Item type '${roadmapItem.type}' is not eligible for Task Flow`,
    };
  }

  try {
    const existingTask = await getTaskFlowTaskForRoadmapItem(roadmapItem.id);

    if (existingTask) {
      const updated = await updateTaskFlowTask(existingTask.id, {
        title: roadmapItem.title,
        description: roadmapItem.description,
        status: roadmapItem.status,
      });

      await supabase
        .from(TABLE_NAME)
        .update({ synced_at: new Date().toISOString() })
        .eq('id', existingTask.id);

      return {
        success: true,
        taskFlowTaskId: updated.id,
        action: 'updated',
      };
    }

    const newTask = await createTaskFlowTask({
      roadmapItemId: roadmapItem.id,
      masterProjectId: roadmapItem.masterProjectId,
      title: roadmapItem.title,
      description: roadmapItem.description,
      status: roadmapItem.status,
    });

    return {
      success: true,
      taskFlowTaskId: newTask.id,
      action: 'created',
    };
  } catch (error) {
    console.error('Error syncing roadmap item to task flow:', error);
    return {
      success: false,
      taskFlowTaskId: null,
      action: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function archiveTaskFlowTaskForRoadmapItem(
  roadmapItemId: string
): Promise<void> {
  const existingTask = await getTaskFlowTaskForRoadmapItem(roadmapItemId);

  if (existingTask && !existingTask.archived) {
    await archiveTaskFlowTask(existingTask.id);
  }
}

export async function deleteTaskFlowTask(taskId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', taskId);

  if (error) {
    throw new Error(`Failed to delete task flow task: ${error.message}`);
  }
}
