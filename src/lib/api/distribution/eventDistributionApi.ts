/**
 * Event Distribution API
 * 
 * API handlers for calendar event distribution to groups.
 * Orchestrates eventDistributionService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateEnum } from '../helpers/validators';
import { ENABLE_GROUP_DISTRIBUTION } from '../../featureFlags';
import {
  distributeCalendarEventToGroup,
  revokeCalendarProjection,
  listCalendarProjectionsForEvent,
  type CalendarProjection,
} from '../../distribution/eventDistributionService';

export interface DistributeEventRequest {
  eventId: string;
  groupId: string;
  options?: {
    scope?: 'date_only' | 'title' | 'full';
    canEdit?: boolean;
    status?: 'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked';
  };
}

export async function distributeEventApi(
  request: DistributeEventRequest
): Promise<ApiResponse<{ created: number; skipped: number }>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const eventIdValidation = validateUUID(request.eventId, 'eventId');
  if (!eventIdValidation.valid) {
    return { success: false, error: eventIdValidation.error };
  }

  const groupIdValidation = validateUUID(request.groupId, 'groupId');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  // Validate optional scope enum
  if (request.options?.scope) {
    const scopeValidation = validateEnum(request.options.scope, 'scope', ['date_only', 'title', 'full'] as const);
    if (!scopeValidation.valid) {
      return { success: false, error: scopeValidation.error };
    }
  }

  // Validate optional status enum
  if (request.options?.status) {
    const statusValidation = validateEnum(request.options.status, 'status', ['suggested', 'pending', 'accepted', 'declined', 'revoked'] as const);
    if (!statusValidation.valid) {
      return { success: false, error: statusValidation.error };
    }
  }

  try {
    const result = await distributeCalendarEventToGroup(
      request.eventId,
      request.groupId,
      auth.userId,
      request.options
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface RevokeEventDistributionRequest {
  eventId: string;
  targetUserId: string;
  targetSpaceId?: string | null;
}

export async function revokeEventDistributionApi(
  request: RevokeEventDistributionRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const eventIdValidation = validateUUID(request.eventId, 'eventId');
  if (!eventIdValidation.valid) {
    return { success: false, error: eventIdValidation.error };
  }

  const targetUserIdValidation = validateUUID(request.targetUserId, 'targetUserId');
  if (!targetUserIdValidation.valid) {
    return { success: false, error: targetUserIdValidation.error };
  }

  // targetSpaceId is optional and can be null, so no validation needed

  try {
    await revokeCalendarProjection(request.eventId, request.targetUserId, auth.userId, request.targetSpaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export interface ListEventDistributionsRequest {
  eventId: string;
}

export async function listEventDistributionsApi(
  request: ListEventDistributionsRequest
): Promise<ApiResponse<CalendarProjection[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'This feature is not available' };
  }

  // Validate inputs
  const eventIdValidation = validateUUID(request.eventId, 'eventId');
  if (!eventIdValidation.valid) {
    return { success: false, error: eventIdValidation.error };
  }

  try {
    const result = await listCalendarProjectionsForEvent(request.eventId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
