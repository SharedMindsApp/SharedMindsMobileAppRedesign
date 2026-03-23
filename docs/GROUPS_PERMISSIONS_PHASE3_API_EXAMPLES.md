# Phase 3: API Handler Examples

**Status:** Implementation Examples  
**Date:** January 2025  
**Phase:** 3 of N

---

## Helper Utilities

### authContext.ts

```typescript
/**
 * Authentication Context Utilities
 * 
 * Extracts current user from session and provides auth context to API handlers.
 */

import { supabase } from '../supabase';

export interface AuthContext {
  userId: string;        // profiles.id
  authUserId: string;    // auth.users.id
}

/**
 * Get current user's auth context
 * Returns null if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  // Get profile ID from user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return {
    userId: profile.id,      // profiles.id
    authUserId: user.id,     // auth.users.id
  };
}
```

### responseTypes.ts

```typescript
/**
 * Common API Response Types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}

export interface CountResponse extends ApiResponse<{ count: number }> {}
```

### errorMapper.ts

```typescript
/**
 * Error Mapping Utilities
 * 
 * Maps service errors to user-friendly messages.
 * Services already return user-friendly errors for business logic,
 * but we hide internal errors (database, RLS) from the UI.
 */

export function mapError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Service errors that are already user-friendly (pass through)
    if (
      message.includes('not authorized') ||
      message.includes('cannot') ||
      message.includes('must be') ||
      message.includes('not found') ||
      message.includes('already exists') ||
      message.includes('Only') ||
      message.includes('Cannot')
    ) {
      return message;
    }

    // Feature flag errors
    if (message.includes('feature is disabled') || message.includes('Feature is disabled')) {
      return 'This feature is not available';
    }

    // Internal errors (hide details)
    return 'An error occurred. Please try again.';
  }

  return 'An unexpected error occurred';
}
```

### validators.ts

```typescript
/**
 * Input Validation Utilities
 * 
 * Validates request inputs before service calls.
 * Services also validate, but this provides early feedback to UI.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNonEmpty(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateUUID(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid ID` };
  }
  
  return { valid: true };
}

export function validateGroupName(name: string): ValidationResult {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Group name is required' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Group name must be 100 characters or less' };
  }
  
  return { valid: true };
}
```

---

## Example 1: Group Management API

### groupsApi.ts

```typescript
/**
 * Groups API
 * 
 * API handlers for team group management.
 * Orchestrates teamGroupsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateNonEmpty, validateUUID, validateGroupName } from '../helpers/validators';
import { ENABLE_GROUPS } from '../../featureFlags';
import {
  createGroup,
  renameGroup,
  archiveGroup,
  listGroups,
  getGroup,
  type TeamGroup,
} from '../groups/teamGroupsService';

export interface CreateGroupRequest {
  teamId: string;
  name: string;
  description?: string;
}

export interface RenameGroupRequest {
  groupId: string;
  name: string;
}

export interface ArchiveGroupRequest {
  groupId: string;
}

/**
 * Create a new team group
 */
export async function createGroupApi(
  request: CreateGroupRequest
): Promise<ApiResponse<TeamGroup>> {
  // 1. Extract auth context
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to create groups' };
  }

  // 2. Check feature flag
  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  // 3. Validate input
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

  // 4. Call service
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
 * Rename a group
 */
export async function renameGroupApi(
  request: RenameGroupRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to rename groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const groupIdValidation = validateUUID(request.groupId, 'Group ID');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  const nameValidation = validateGroupName(request.name);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  try {
    await renameGroup(request.groupId, request.name.trim(), auth.userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Archive a group
 */
export async function archiveGroupApi(
  request: ArchiveGroupRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to archive groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const groupIdValidation = validateUUID(request.groupId, 'Group ID');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  try {
    await archiveGroup(request.groupId, auth.userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * List groups for a team
 */
export async function listGroupsApi(
  teamId: string
): Promise<ApiResponse<TeamGroup[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to view groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const teamIdValidation = validateUUID(teamId, 'Team ID');
  if (!teamIdValidation.valid) {
    return { success: false, error: teamIdValidation.error };
  }

  try {
    const groups = await listGroups(teamId);
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Get a single group
 */
export async function getGroupApi(
  groupId: string
): Promise<ApiResponse<TeamGroup>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to view groups' };
  }

  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  const groupIdValidation = validateUUID(groupId, 'Group ID');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  try {
    const group = await getGroup(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }
    return { success: true, data: group };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

---

## Example 2: Entity Grants API

### entityGrantsApi.ts

```typescript
/**
 * Entity Grants API
 * 
 * API handlers for entity-level permission grants.
 * Orchestrates entityGrantsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateNonEmpty } from '../helpers/validators';
import { ENABLE_ENTITY_GRANTS } from '../../featureFlags';
import {
  grantEntityPermission,
  revokeEntityPermission,
  listEntityPermissions,
  type EntityPermissionGrant,
  type EntityType,
  type SubjectType,
  type PermissionRole,
} from '../permissions/entityGrantsService';

export interface GrantEntityPermissionRequest {
  entityType: EntityType;
  entityId: string;
  subjectType: SubjectType;
  subjectId: string;
  role: PermissionRole;
}

export interface RevokeEntityPermissionRequest {
  entityType: EntityType;
  entityId: string;
  subjectType: SubjectType;
  subjectId: string;
}

export interface ListEntityPermissionsRequest {
  entityType: EntityType;
  entityId: string;
}

/**
 * Grant entity permission to a user or group
 */
export async function grantEntityPermissionApi(
  request: GrantEntityPermissionRequest
): Promise<ApiResponse<EntityPermissionGrant>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to grant permissions' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'Entity permissions feature is not available' };
  }

  // Validate entity type
  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  // Validate subject type
  if (!['user', 'group'].includes(request.subjectType)) {
    return { success: false, error: 'Invalid subject type' };
  }

  const subjectIdValidation = validateUUID(request.subjectId, 'Subject ID');
  if (!subjectIdValidation.valid) {
    return { success: false, error: subjectIdValidation.error };
  }

  // Validate role
  if (!['editor', 'commenter', 'viewer'].includes(request.role)) {
    return { success: false, error: 'Invalid permission role. Owner role cannot be granted via entity grants.' };
  }

  try {
    const grant = await grantEntityPermission(
      request.entityType,
      request.entityId,
      request.subjectType,
      request.subjectId,
      request.role,
      auth.userId
    );

    return { success: true, data: grant };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Revoke entity permission
 */
export async function revokeEntityPermissionApi(
  request: RevokeEntityPermissionRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to revoke permissions' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'Entity permissions feature is not available' };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  if (!['user', 'group'].includes(request.subjectType)) {
    return { success: false, error: 'Invalid subject type' };
  }

  const subjectIdValidation = validateUUID(request.subjectId, 'Subject ID');
  if (!subjectIdValidation.valid) {
    return { success: false, error: subjectIdValidation.error };
  }

  try {
    await revokeEntityPermission(
      request.entityType,
      request.entityId,
      request.subjectType,
      request.subjectId,
      auth.userId
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * List entity permissions
 */
export async function listEntityPermissionsApi(
  request: ListEntityPermissionsRequest
): Promise<ApiResponse<EntityPermissionGrant[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to view permissions' };
  }

  if (!ENABLE_ENTITY_GRANTS) {
    return { success: false, error: 'Entity permissions feature is not available' };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  try {
    const grants = await listEntityPermissions(
      request.entityType,
      request.entityId
    );

    return { success: true, data: grants };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

---

## Example 3: Creator Rights API

### creatorRightsApi.ts

```typescript
/**
 * Creator Rights API
 * 
 * API handlers for creator default rights revocation/restoration.
 * Orchestrates creatorRightsService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID } from '../helpers/validators';
import { ENABLE_CREATOR_RIGHTS } from '../../featureFlags';
import {
  revokeCreatorRights,
  restoreCreatorRights,
  isCreatorRightsRevoked,
  type EntityType,
} from '../permissions/creatorRightsService';

export interface RevokeCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

export interface RestoreCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

export interface CheckCreatorRightsRequest {
  entityType: EntityType;
  entityId: string;
  creatorUserId: string;
}

/**
 * Revoke creator default rights
 */
export async function revokeCreatorRightsApi(
  request: RevokeCreatorRightsRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to revoke creator rights' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
    return { success: false, error: 'Creator rights feature is not available' };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  const creatorIdValidation = validateUUID(request.creatorUserId, 'Creator user ID');
  if (!creatorIdValidation.valid) {
    return { success: false, error: creatorIdValidation.error };
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

/**
 * Restore creator default rights
 */
export async function restoreCreatorRightsApi(
  request: RestoreCreatorRightsRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to restore creator rights' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
    return { success: false, error: 'Creator rights feature is not available' };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  const creatorIdValidation = validateUUID(request.creatorUserId, 'Creator user ID');
  if (!creatorIdValidation.valid) {
    return { success: false, error: creatorIdValidation.error };
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

/**
 * Check if creator rights are revoked
 */
export async function checkCreatorRightsApi(
  request: CheckCreatorRightsRequest
): Promise<ApiResponse<{ revoked: boolean }>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to check creator rights' };
  }

  if (!ENABLE_CREATOR_RIGHTS) {
    return { success: false, error: 'Creator rights feature is not available' };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  const creatorIdValidation = validateUUID(request.creatorUserId, 'Creator user ID');
  if (!creatorIdValidation.valid) {
    return { success: false, error: creatorIdValidation.error };
  }

  try {
    const revoked = await isCreatorRightsRevoked(
      request.entityType,
      request.entityId,
      request.creatorUserId
    );

    return { success: true, data: { revoked } };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

---

## Example 4: Distribution API

### taskDistributionApi.ts

```typescript
/**
 * Task Distribution API
 * 
 * API handlers for task distribution to groups.
 * Orchestrates taskDistributionService calls.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID } from '../helpers/validators';
import { ENABLE_GROUP_DISTRIBUTION } from '../../featureFlags';
import {
  distributeTaskToGroup,
  revokeTaskProjection,
  listTaskProjections,
  type TaskProjection,
} from '../distribution/taskDistributionService';

export interface DistributeTaskRequest {
  taskId: string;
  groupId: string;
  options?: {
    canEdit?: boolean;
    canComplete?: boolean;
    status?: 'pending' | 'accepted' | 'declined' | 'revoked';
  };
}

export interface RevokeTaskProjectionRequest {
  taskId: string;
  targetUserId: string;
}

/**
 * Distribute a task to a group
 */
export async function distributeTaskApi(
  request: DistributeTaskRequest
): Promise<ApiResponse<{ created: number; skipped: number }>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to distribute tasks' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'Task distribution feature is not available' };
  }

  const taskIdValidation = validateUUID(request.taskId, 'Task ID');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  const groupIdValidation = validateUUID(request.groupId, 'Group ID');
  if (!groupIdValidation.valid) {
    return { success: false, error: groupIdValidation.error };
  }

  // Validate status if provided
  if (request.options?.status && !['pending', 'accepted', 'declined', 'revoked'].includes(request.options.status)) {
    return { success: false, error: 'Invalid status' };
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

/**
 * Revoke a task projection
 */
export async function revokeTaskProjectionApi(
  request: RevokeTaskProjectionRequest
): Promise<ApiResponse<void>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to revoke task projections' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'Task distribution feature is not available' };
  }

  const taskIdValidation = validateUUID(request.taskId, 'Task ID');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  const targetUserIdValidation = validateUUID(request.targetUserId, 'Target user ID');
  if (!targetUserIdValidation.valid) {
    return { success: false, error: targetUserIdValidation.error };
  }

  try {
    await revokeTaskProjection(
      request.taskId,
      request.targetUserId,
      auth.userId
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * List task projections
 */
export async function listTaskProjectionsApi(
  taskId: string
): Promise<ApiResponse<TaskProjection[]>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to view task projections' };
  }

  if (!ENABLE_GROUP_DISTRIBUTION) {
    return { success: false, error: 'Task distribution feature is not available' };
  }

  const taskIdValidation = validateUUID(taskId, 'Task ID');
  if (!taskIdValidation.valid) {
    return { success: false, error: taskIdValidation.error };
  }

  try {
    const projections = await listTaskProjections(taskId);
    return { success: true, data: projections };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

---

## Example 5: Permission Resolver API (Debug/Inspection)

### permissionResolverApi.ts

```typescript
/**
 * Permission Resolver API
 * 
 * API handlers for permission inspection (debug/resolver output).
 * Orchestrates entityPermissionResolver calls.
 * 
 * NOTE: This is primarily for debugging and inspection.
 * UI should not rely on this for permission checks in normal flows.
 */

import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID } from '../helpers/validators';
import { ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS } from '../../featureFlags';
import {
  resolveEntityPermissions,
  type EntityType,
  type ResolvedPermissions,
} from '../permissions/entityPermissionResolver';

export interface ResolvePermissionsRequest {
  entityType: EntityType;
  entityId: string;
  userId?: string;  // Optional: if not provided, uses current user
}

/**
 * Resolve entity permissions for a user
 * 
 * This is a debug/inspection endpoint. UI should use existing
 * permission checks (canUserAccessTrack, etc.) for normal flows.
 */
export async function resolvePermissionsApi(
  request: ResolvePermissionsRequest
): Promise<ApiResponse<ResolvedPermissions>> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to resolve permissions' };
  }

  // Only available if at least one permission feature is enabled
  if (!ENABLE_ENTITY_GRANTS && !ENABLE_CREATOR_RIGHTS) {
    return { 
      success: false, 
      error: 'Permission resolution features are not available' 
    };
  }

  if (!['track', 'subtrack'].includes(request.entityType)) {
    return { success: false, error: 'Invalid entity type' };
  }

  const entityIdValidation = validateUUID(request.entityId, 'Entity ID');
  if (!entityIdValidation.valid) {
    return { success: false, error: entityIdValidation.error };
  }

  // Use provided userId or current user
  const targetUserId = request.userId || auth.userId;

  if (request.userId) {
    const userIdValidation = validateUUID(request.userId, 'User ID');
    if (!userIdValidation.valid) {
      return { success: false, error: userIdValidation.error };
    }
  }

  try {
    const resolved = await resolveEntityPermissions({
      userId: targetUserId,
      entityType: request.entityType,
      entityId: request.entityId,
    });

    return { success: true, data: resolved };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

---

## Summary

These examples demonstrate:

1. **Consistent Pattern**: All handlers follow the same structure (auth → feature flag → validation → service → error mapping)

2. **Thin Orchestration**: Handlers are thin wrappers around services

3. **No Business Logic**: All business logic remains in services

4. **User-Friendly Errors**: Errors are mapped to user-friendly messages

5. **Clean Responses**: Consistent response shapes across all handlers

6. **Service Trust**: Handlers trust services for authorization and feature flag checks (defense in depth, not re-checking)

---

**End of Examples Document**
