/**
 * Task Distribution API
 * 
 * API handlers for task distribution to groups.
 * Orchestrates taskDistributionService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateEnum } from '../helpers/validators';
import { ENABLE_GROUP_DISTRIBUTION } from '../../featureFlags';
import {
  distributeTaskToGroup,
  revokeTaskProjection,
  listTaskProjections,
  type TaskProjection,
} from '../../distribution/taskDistributionService';

export interface DistributeTaskRequest {
  taskId: string;
  groupId: string;
  options?: {
    canEdit?: boolean;
    canComplete?: boolean;
    status?: 'pending' | 'accepted' | 'declined' | 'revoked';
  };
}

export async function distributeTaskApi(
  request: DistributeTaskRequest
): Promise<ApiResponse<{ created: number; skipped: number }>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const taskIdValidation = validateUUID(request.taskId, 'taskId');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  const groupIdValidation = validateUUID(request.groupId, 'groupId');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  // Validate optional status enum
  if (request.options?.status) {
    const statusValidation = validateEnum(request.options.status, 'status', ['pending', 'accepted', 'declined', 'revoked'] as const);
    if (!statusValidation.valid) {
      return { success: false, error: statusValidation.error };
    }
  }

  try {
    const result = await distributeTaskToGroup(
      request.taskId,
      request.groupId,
      auth.userId,
      request.options
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface RevokeTaskProjectionRequest {
  taskId: string;
  targetUserId: string;
}

export async function revokeTaskProjectionApi(
  request: RevokeTaskProjectionRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const taskIdValidation = validateUUID(request.taskId, 'taskId');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  const targetUserIdValidation = validateUUID(request.targetUserId, 'targetUserId');
  if (!targetUserIdValidation.valid) {
    return { success: false, error: targetUserIdValidation.error };
  }

  try {
    await revokeTaskProjection(request.taskId, request.targetUserId, auth.userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface ListTaskProjectionsRequest {
  taskId: string;
}

export async function listTaskProjectionsApi(
  request: ListTaskProjectionsRequest
): Promise<ApiResponse<TaskProjection[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const taskIdValidation = validateUUID(request.taskId, 'taskId');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  try {
    const result = await listTaskProjections(request.taskId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
