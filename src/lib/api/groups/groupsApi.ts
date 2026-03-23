/**
 * Groups API
 * 
 * API handlers for team group management.
 * Orchestrates teamGroupsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateGroupName } from '../helpers/validators';
import { ENABLE_GROUPS } from '../../featureFlags';
import {
  createGroup,
  listGroups,
  type TeamGroup,
} from '../../groups/teamGroupsService';

export interface CreateGroupRequest {
  teamId: string;
  name: string;
  description?: string;
}

export interface ListGroupsRequest {
  teamId: string;
}

/**
 * Create a new team group
 */
export async function createGroupApi(
  request: CreateGroupRequest
): Promise<ApiResponse<TeamGroup>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to create groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const teamIdValidation = validateUUID(request.teamId, 'Team ID');
  if (!teamIdValidation.valid) {
    return { success: false, error: teamIdValidation.error };
  }

  const nameValidation = validateGroupName(request.name);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  if (request.description !== undefined && request.description.length > 500) {
    return { success: false, error: 'Description must be 500 characters or less' };
  }

  try {
    const group = await createGroup(
      request.teamId,
      request.name.trim(),
      request.description?.trim(),
      auth.userId
    );

    return { success: true, data: group };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * List groups for a team
 */
export async function listGroupsApi(
  request: ListGroupsRequest
): Promise<ApiResponse<TeamGroup[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to view groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const teamIdValidation = validateUUID(request.teamId, 'Team ID');
  if (!teamIdValidation.valid) {
    return { success: false, error: teamIdValidation.error };
  }

  try {
    const groups = await listGroups(request.teamId);
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
