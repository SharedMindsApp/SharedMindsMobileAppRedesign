/**
 * Entity Grants API
 * 
 * API handlers for entity-level permission grants.
 * Orchestrates entityGrantsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateEnum } from '../helpers/validators';
import { ENABLE_ENTITY_GRANTS } from '../../featureFlags';
import {
  grantEntityPermission,
  revokeEntityPermission,
  listEntityPermissions,
  type EntityPermissionGrant,
  type EntityType,
  type SubjectType,
  type PermissionRole,
} from '../../permissions/entityGrantsService';

export interface GrantEntityPermissionRequest {
  entityType: EntityType;
  entityId: string;
  subjectType: SubjectType;
  subjectId: string;
  role: PermissionRole;
}

export async function grantEntityPermissionApi(
  request: GrantEntityPermissionRequest
): Promise<ApiResponse<EntityPermissionGrant>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const entityTypeValidation = validateEnum(request.entityType, 'entityType', ['track', 'subtrack'] as const);
  if (!entityTypeValidation.valid) {
    return { success: false, error: entityTypeValidation.error };
  }

  const entityIdValidation = validateUUID(request.entityId, 'entityId');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  const subjectTypeValidation = validateEnum(request.subjectType, 'subjectType', ['user', 'group'] as const);
  if (!subjectTypeValidation.valid) {
    return { success: false, error: subjectTypeValidation.error };
  }

  const subjectIdValidation = validateUUID(request.subjectId, 'subjectId');
  if (!subjectIdValidation.valid) {
    return { success: false, error: subjectIdValidation.error };
  }

  const roleValidation = validateEnum(request.role, 'role', ['editor', 'commenter', 'viewer'] as const);
  if (!roleValidation.valid) {
    return { success: false, error: roleValidation.error };
  }

  // Validate: Cannot grant owner role
  if (request.role === 'owner') {
    return { success: false, error: 'Cannot grant ownership via entity grants. Ownership is project-level only.' };
  }

  try {
    const result = await grantEntityPermission(
      request.entityType,
      request.entityId,
      request.subjectType,
      request.subjectId,
      request.role,
      auth.userId
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface RevokeEntityPermissionRequest {
  grantId: string;
}

export async function revokeEntityPermissionApi(
  request: RevokeEntityPermissionRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const grantIdValidation = validateUUID(request.grantId, 'grantId');
  if (!grantIdValidation.valid) {
    return { success: false, error: grantIdValidation.error };
  }

  try {
    await revokeEntityPermission(request.grantId, auth.userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface ListEntityPermissionsRequest {
  entityType: EntityType;
  entityId: string;
}

export async function listEntityPermissionsApi(
  request: ListEntityPermissionsRequest
): Promise<ApiResponse<EntityPermissionGrant[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const entityTypeValidation = validateEnum(request.entityType, 'entityType', ['track', 'subtrack'] as const);
  if (!entityTypeValidation.valid) {
    return { success: false, error: entityTypeValidation.error };
  }

  const entityIdValidation = validateUUID(request.entityId, 'entityId');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  try {
    const result = await listEntityPermissions(request.entityType, request.entityId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
