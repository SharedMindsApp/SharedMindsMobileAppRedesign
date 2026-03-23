/**
 * Creator Rights API
 * 
 * API handlers for creator rights revocation and restoration.
 * Orchestrates creatorRightsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateEnum } from '../helpers/validators';
import { ENABLE_CREATOR_RIGHTS } from '../../featureFlags';
import {
  revokeCreatorRights,
  restoreCreatorRights,
  isCreatorRightsRevoked,
  type EntityType,
} from '../../permissions/creatorRightsService';

export interface RevokeCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

export async function revokeCreatorRightsApi(
  request: RevokeCreatorRightsRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
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

  const creatorUserIdValidation = validateUUID(request.creatorUserId, 'creatorUserId');
  if (!creatorUserIdValidation.valid) {
    return { success: false, error: creatorUserIdValidation.error };
  }

  try {
    await revokeCreatorRights(
      request.entityType,
      request.entityId,
      request.creatorUserId,
      auth.userId
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface RestoreCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

export async function restoreCreatorRightsApi(
  request: RestoreCreatorRightsRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
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

  const creatorUserIdValidation = validateUUID(request.creatorUserId, 'creatorUserId');
  if (!creatorUserIdValidation.valid) {
    return { success: false, error: creatorUserIdValidation.error };
  }

  try {
    await restoreCreatorRights(
      request.entityType,
      request.entityId,
      request.creatorUserId,
      auth.userId
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface CheckCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

export async function checkCreatorRightsApi(
  request: CheckCreatorRightsRequest
): Promise<ApiResponse<boolean>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
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

  const creatorUserIdValidation = validateUUID(request.creatorUserId, 'creatorUserId');
  if (!creatorUserIdValidation.valid) {
    return { success: false, error: creatorUserIdValidation.error };
  }

  try {
    const result = await isCreatorRightsRevoked(
      request.entityType,
      request.entityId,
      request.creatorUserId
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
