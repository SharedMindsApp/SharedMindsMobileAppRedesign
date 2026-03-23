# Permission-Sovereign Calendar Projections

## Summary

This document describes the implementation of a permission-sovereign calendar projection model where:
- **Calendar views do NOT define permissions**
- **Users define permissions via projections**
- **Shared calendars are NOT inherently read-only**
- **Personal calendars can be read-only for others**
- **Visibility, detail, and editability are all explicitly granted**

## Core Principles

### ❌ What We DON'T Do
- No implicit permissions
- No calendar-type-based permissions
- No auto-sharing
- No hardcoded read-only assumptions

### ✅ What We DO
- Projection is the single source of truth
- Users fully control visibility and access
- Service layer enforces permissions (not UI)
- Same model works for Trips, Projects, and future contexts

## Database Changes

### Migration: `20260103000009_add_projection_permissions.sql`

**New Fields:**
- `calendar_projections.can_edit` (boolean, default: false)
  - Whether the target user can edit this event
  - Default: false (read-only by default)
  - Owner always has can_edit = true (computed at service layer)

- `calendar_projections.detail_level` (text, enum: 'overview' | 'detailed')
  - Level of detail visible
  - Default: derived from scope ('overview' if scope is 'date_only' or 'title', 'detailed' if 'full')

- `calendar_projections.nested_scope` (text, enum: 'container' | 'container+items')
  - For container events: whether nested items are visible
  - Default: 'container' (container only)

**All fields are nullable for backward compatibility.**

## TypeScript Types

### CalendarProjectionPermissions

```typescript
export interface CalendarProjectionPermissions {
  can_view: boolean;  // If false, event is hidden (filtered at service layer)
  can_edit: boolean;  // If false, mutations blocked at service layer
  detail_level: 'overview' | 'detailed';  // Controls detail visibility
  scope: 'container' | 'container+items';  // Controls nested event visibility
}
```

### Updated Calendar Event Types

All calendar event types now include explicit permissions:

```typescript
export interface ContainerCalendarBlock {
  // ... event fields
  permissions: CalendarProjectionPermissions;  // Explicit permissions
}

export interface NestedCalendarItem {
  // ... event fields
  permissions: CalendarProjectionPermissions;  // Explicit permissions
}

export interface PersonalCalendarEvent {
  // ... event fields
  permissions?: CalendarProjectionPermissions;  // For projected events
}
```

### Updated CalendarProjection

```typescript
export interface CalendarProjection {
  // ... existing fields
  can_edit?: boolean;  // Default: false
  detail_level?: 'overview' | 'detailed';  // Default: derived from scope
  nested_scope?: 'container' | 'container+items';  // Default: 'container'
}
```

## Service Layer Enforcement

### Permission Computation

Permissions are computed from projection metadata:

```typescript
function computePermissions(
  projection: CalendarProjection,
  event: ContextEvent,
  userId: string
): CalendarProjectionPermissions {
  // If projection is not accepted, user cannot view
  if (projection.status !== 'accepted') {
    return {
      can_view: false,
      can_edit: false,
      detail_level: 'overview',
      scope: 'container',
    };
  }
  
  // Owner always has full permissions
  const isOwner = event.created_by === userId;
  
  return {
    can_view: true,  // If projection is accepted
    can_edit: isOwner || (projection.can_edit ?? false),
    detail_level: projection.detail_level || (projection.scope === 'full' ? 'detailed' : 'overview'),
    scope: projection.nested_scope || 'container',
  };
}
```

### Service Layer Filtering

**1. Filter by can_view:**
- Events with `can_view: false` are filtered out at service layer
- UI never sees events user cannot view

**2. Filter nested events by scope:**
- If `scope === 'container'`, nested events are filtered out
- If `scope === 'container+items'`, nested events are included (if projected)

**3. Strip detail fields by detail_level:**
- If `detail_level === 'overview'`, description and location are stripped
- Only title and time are returned

**4. Block mutations by can_edit:**
- Service layer checks `can_edit` before allowing updates/deletes
- UI should never be the first line of defense

## Calendar Behavior Rules

### Shared Calendar

**May contain:**
- Container events (if projected)
- Nested events (if `nested_scope === 'container+items'` AND nested event is projected)

**May be editable:**
- If `can_edit === true` in projection

**Defaults:**
- If no projection exists → event is hidden
- If `scope === 'container'` → hide nested events
- If `detail_level === 'overview'` → hide itinerary details
- If `can_edit === false` → enforce read-only at service layer

**DO NOT hardcode shared calendars as read-only.**

### Personal Calendar

**Shows:**
- Own events with full permissions (`can_edit: true`, `detail_level: 'detailed'`)
- Projected events based on projection permissions

**Rules:**
- Owner always has `can_edit: true` (computed at service layer)
- Others depend on `projection.can_edit`
- Detail level depends on `projection.detail_level`
- Nested events visible if `projection.nested_scope === 'container+items'`

## Context / Container Rules

- Container and nested events have **independent projections**
- Container projection does NOT imply nested projection
- Nested events NEVER auto-leak
- Linking ≠ sharing

## Files Modified/Created

### Database
- `supabase/migrations/20260103000009_add_projection_permissions.sql` (NEW)

### TypeScript Types
- `src/lib/contextSovereign/types.ts` (UPDATED)

### Services
- `src/lib/contextSovereign/projectionsService.ts` (UPDATED - handles permission fields)
- `src/lib/contextSovereign/containerCalendarService.ts` (UPDATED - computes and enforces permissions)
- `src/lib/personalSpaces/calendarService.ts` (UPDATED - includes permissions)

## Verification Checklist

- [x] Permissions come ONLY from projection metadata
- [x] Calendar views do NOT define permissions
- [x] Shared calendars are NOT inherently read-only
- [x] Personal calendars can be read-only for others
- [x] Service layer enforces permissions (not UI)
- [x] Events filtered by can_view at service layer
- [x] Nested events filtered by scope at service layer
- [x] Detail fields stripped by detail_level at service layer
- [x] Mutations blocked by can_edit at service layer
- [x] No hardcoded read-only assumptions
- [x] No calendar-type-based permissions
- [x] No implicit permissions

## Usage Examples

### Creating a Projection with Permissions

```typescript
// Read-only, overview detail, container only
await createProjection({
  event_id: containerEventId,
  target_user_id: userId,
  target_space_id: spaceId,  // Shared calendar
  scope: 'title',
  created_by: ownerId,
  can_edit: false,  // Read-only
  detail_level: 'overview',  // Hide details
  nested_scope: 'container',  // Hide nested events
});

// Editable, detailed, with nested events
await createProjection({
  event_id: containerEventId,
  target_user_id: userId,
  target_space_id: null,  // Personal calendar
  scope: 'full',
  created_by: ownerId,
  can_edit: true,  // Editable
  detail_level: 'detailed',  // Show all details
  nested_scope: 'container+items',  // Show nested events
});
```

### Service Layer Permission Enforcement

```typescript
// In update event function
async function updateContextEvent(
  eventId: string,
  updates: UpdateContextEventInput,
  userId: string
): Promise<ServiceResponse<ContextEvent>> {
  // Get event
  const event = await getContextEvent(eventId);
  
  // Check if user is owner
  if (event.created_by === userId) {
    // Owner always has permission
    return await updateEvent(eventId, updates);
  }
  
  // Check projection permissions
  const projection = await getProjectionForEvent(eventId, userId);
  if (!projection || projection.status !== 'accepted') {
    return { success: false, error: 'No permission to edit' };
  }
  
  if (!projection.can_edit) {
    return { success: false, error: 'Read-only event' };
  }
  
  // Permission granted - proceed with update
  return await updateEvent(eventId, updates);
}
```

## Hard Invariants

### ❌ No Implicit Permissions
- Every permission must be explicit
- No assumptions based on calendar type
- No assumptions based on event type

### ❌ No Calendar-Type-Based Permissions
- Shared calendars are NOT inherently read-only
- Personal calendars can be read-only
- Permissions come from projections, not calendar type

### ❌ No Auto-Sharing
- All sharing is explicit
- No automatic projections
- No implicit visibility

### ✅ Projection is Single Source of Truth
- All permissions come from projection metadata
- Service layer enforces permissions
- UI never infers permissions

### ✅ Users Fully Control Visibility and Access
- Users explicitly grant permissions
- Users can revoke permissions
- Users control detail level and scope

### ✅ Same Model Works for All Contexts
- Trips use same permission model
- Projects use same permission model
- Future contexts use same permission model

