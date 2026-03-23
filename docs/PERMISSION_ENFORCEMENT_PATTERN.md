# Permission Enforcement Pattern

## Overview

This document describes how to integrate permission checks into existing Guardrails services (trackService, roadmapService, mindMeshService, etc.) without breaking existing functionality.

## Core Pattern

All write operations should optionally accept a `userId` parameter and verify permissions when provided. If `userId` is not provided, the operation continues without permission checks (for backward compatibility).

## Pattern 1: Optional Permission Check (Recommended for Migration)

```typescript
import { checkProjectPermission } from './projectUserService';

export async function updateTrack(
  trackId: string,
  input: UpdateTrackInput,
  userId?: string
): Promise<Track> {
  // Get the track to find its project
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  // If userId provided, check permissions
  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      track.masterProjectId,
      'editor' // requires editor role
    );

    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }
  }

  // Proceed with update
  const { data, error } = await supabase
    .from('tracks')
    .update(transformKeysToSnake(input))
    .eq('id', trackId)
    .select()
    .single();

  if (error) throw error;
  return transformKeysFromDb(data);
}
```

## Pattern 2: Using the Helper (Cleaner)

```typescript
import { withPermissionCheck } from './projectUserService';

export async function deleteRoadmapItem(
  itemId: string,
  userId?: string
): Promise<void> {
  const item = await getRoadmapItem(itemId);
  if (!item) throw new Error('Item not found');

  if (userId) {
    await withPermissionCheck(
      { userId, masterProjectId: item.masterProjectId },
      'editor',
      async () => {
        // Delete operation here
        const { error } = await supabase
          .from('roadmap_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;
      }
    );
  } else {
    // Fallback: no permission check
    const { error } = await supabase
      .from('roadmap_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }
}
```

## Pattern 3: Asserting Permissions

```typescript
import { assertCanEdit } from './projectUserService';

export async function updateMindMeshNode(
  nodeId: string,
  input: UpdateNodeInput,
  userId?: string
): Promise<MindMeshNode> {
  const node = await getMindMeshNode(nodeId);
  if (!node) throw new Error('Node not found');

  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      node.masterProjectId,
      'editor'
    );
    assertCanEdit(permissionCheck); // Throws if not allowed
  }

  // Update operation
  // ...
}
```

## Required Role by Operation

### Read Operations
- **Role Required**: `viewer`
- **Operations**: get*, list*, query*

### Write Operations
- **Role Required**: `editor`
- **Operations**: create*, update*, delete*, move*, reorder*

### User Management
- **Role Required**: `owner`
- **Operations**: addUser*, removeUser*, changeUserRole*

## Example: trackService.ts Integration

```typescript
// Before (no permission checks)
export async function updateTrack(
  trackId: string,
  input: UpdateTrackInput
): Promise<Track> {
  // ... update logic
}

// After (with optional permission check)
export async function updateTrack(
  trackId: string,
  input: UpdateTrackInput,
  userId?: string
): Promise<Track> {
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      track.masterProjectId,
      'editor'
    );

    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }
  }

  // ... existing update logic unchanged
}
```

## Example: roadmapService.ts Integration

```typescript
// Before
export async function createRoadmapItem(
  input: CreateRoadmapItemInput
): Promise<RoadmapItem> {
  // ... create logic
}

// After
export async function createRoadmapItem(
  input: CreateRoadmapItemInput,
  userId?: string
): Promise<RoadmapItem> {
  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      input.masterProjectId,
      'editor'
    );

    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }
  }

  // ... existing create logic unchanged
}
```

## Example: peopleService.ts Integration

```typescript
// Before
export async function addPersonToProject(
  input: CreateProjectPersonInput
): Promise<ProjectPerson> {
  // ... create logic
}

// After
export async function addPersonToProject(
  input: CreateProjectPersonInput,
  userId?: string
): Promise<ProjectPerson> {
  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      input.masterProjectId,
      'editor'
    );

    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }
  }

  // ... existing create logic unchanged
}
```

## Migration Strategy

### Phase 1: Add Optional Parameters (Now)
- Add optional `userId` parameter to all write operations
- Add permission checks when `userId` is provided
- Existing code without `userId` continues to work

### Phase 2: Frontend Integration (Future)
- Update UI components to pass `userId` from auth context
- Display permission errors to users
- Hide actions user doesn't have permission for

### Phase 3: Enforce Permissions (Future)
- Make `userId` required for all write operations
- Remove fallback paths without permission checks
- Complete migration

## Common Permission Errors

```typescript
// User not a member of project
{
  allowed: false,
  reason: 'User is not a member of this project'
}

// Insufficient role
{
  allowed: false,
  reason: "User role 'viewer' does not have 'editor' permission",
  role: 'viewer'
}
```

## Testing Permission Checks

```typescript
// Test that editor can update
const permissionCheck = await checkProjectPermission(
  editorUserId,
  projectId,
  'editor'
);
expect(permissionCheck.allowed).toBe(true);

// Test that viewer cannot update
const permissionCheck = await checkProjectPermission(
  viewerUserId,
  projectId,
  'editor'
);
expect(permissionCheck.allowed).toBe(false);
expect(permissionCheck.reason).toContain('viewer');
```

## Summary

1. **Add optional `userId` parameter** to all write operations
2. **Check permissions when provided** using `checkProjectPermission`
3. **Throw descriptive errors** when permission denied
4. **Maintain backward compatibility** by making `userId` optional
5. **Use consistent error messages** from permission check results

This pattern enables gradual migration without breaking existing code.
