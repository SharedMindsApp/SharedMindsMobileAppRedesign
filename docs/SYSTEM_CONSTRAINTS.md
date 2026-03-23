# System Constraints

## Overview

This document defines **explicit constraints** enforced across the Guardrails system. Unlike invariants (which define what is impossible), constraints define **limits, rules, and validation requirements** for operations.

**Constraints are enforced before operations occur, preventing invalid states.**

---

## Data Constraints

### Roadmap Items

**Composition Depth:**
- **Max Depth:** 3 levels (root → middle → leaf)
- **Validation:** `assertCompositionDepth(depth, maxDepth)`
- **Enforcement:** Pre-create and pre-update checks

**Circular Composition:**
- **Rule:** No item can be its own ancestor
- **Validation:** `checkCircularComposition(itemId, parentId)`
- **Enforcement:** Pre-create and pre-update checks

**Timeline Eligibility:**
- **Rule:** Items with both parent and children cannot appear on timeline
- **Validation:** `validateTimelineEligibility(itemId)`
- **Enforcement:** Pre-render checks

**Parent-Child Date Constraints:**
- **Rule:** Parent items must span all child items
- **Validation:** Parent start ≤ earliest child start, Parent end ≥ latest child end
- **Enforcement:** Automatic recalculation

**Status Constraints:**
- **Valid Statuses:** `planned`, `in_progress`, `completed`, `blocked`, `cancelled`
- **Validation:** Enum check
- **Enforcement:** Database constraint + service layer

**Deadline Extensions:**
- **Rule:** Deadline extensions logged in `roadmap_deadline_extensions`
- **Max Extensions:** No hard limit, but tracked for analytics
- **Enforcement:** Service layer creates extension record

**Item Type Constraints:**
- **Valid Types:** `milestone`, `task`, `phase`, `event`, `deliverable`, `decision`
- **Validation:** Enum check
- **Enforcement:** Database constraint + service layer

---

### Tracks

**Track Hierarchy:**
- **Max Depth:** No hard limit, but deeply nested tracks discouraged
- **Parent Track:** Track can have parent_track_id
- **Validation:** `assertTrackHierarchy(trackId, parentTrackId)`

**Shared Tracks:**
- **Rule:** Shared tracks must have `is_shared = true`
- **Rule:** Shared tracks must have exactly one `master_project_id`
- **Rule:** Consuming projects link via `shared_track_links`
- **Validation:** `validateSharedTrack(trackId)`

**Track Colors:**
- **Valid Colors:** Predefined palette (see `trackColors`)
- **Validation:** Color must be in palette
- **Enforcement:** UI color picker + service validation

**Track Names:**
- **Required:** Track name cannot be empty
- **Max Length:** 200 characters
- **Uniqueness:** Not enforced (multiple tracks can have same name)

---

### Assignments

**Assignment Constraints:**
- **Rule:** Assignment target must be valid person or user
- **Rule:** Assignment must reference valid roadmap item
- **Validation:** Foreign key constraints + service validation
- **Enforcement:** Pre-create checks

**Assignment Types:**
- **Person Assignment:** References `project_people` or `global_people`
- **User Assignment:** References `project_users`
- **Validation:** Ensure person/user exists and has access

---

### People

**Global People:**
- **Owner:** User who created the person
- **Visibility:** Owner-only
- **Validation:** `assertOwnership('global_person', personId, userId, 'write')`

**Project People:**
- **Owner:** Project
- **Visibility:** Project members
- **Validation:** Project membership check

---

### Shared Track Links

**Link Constraints:**
- **Rule:** User must have access to source project
- **Rule:** Link cannot be created if source project is private and user not a member
- **Validation:** `canUserAccessSharedTrack(userId, trackId, sourceProjectId)`
- **Enforcement:** Pre-create permission check

---

## Permission Constraints

### Project Access

**User Roles:**
- **Valid Roles:** `owner`, `editor`, `viewer`
- **Validation:** Enum check
- **Enforcement:** Database constraint

**Role Permissions:**

| Role | Create | Read | Update | Delete | Invite Users | Manage Settings |
|------|--------|------|--------|--------|--------------|-----------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Validation:** `checkUserRole(userId, projectId, requiredRole)`

**Cross-Project Access:**
- **Rule:** User must be member of both projects
- **Validation:** `validateCrossProjectAccess(userId, sourceProjectId, targetProjectId)`
- **Enforcement:** Pre-read checks

**Shared Track Access:**
- **Rule:** User must have access to source project to consume shared track
- **Validation:** Permission check before link creation
- **Enforcement:** Service layer

---

### AI Access

**AI Scope:**
- **Rule:** AI can only access entities within user's project
- **Rule:** AI respects user's role (viewer → read-only AI suggestions)
- **Validation:** `assertPermissionBoundary('ai_read', userId, projectId, entityProjectId)`

**AI Limits:**
- **Max Tags Per Prompt:** 5
- **Max Context Size:** Defined by budget
- **Max Interactions Per Hour:** Rate-limited (configurable)

**AI Outputs:**
- **Rule:** All outputs go to `ai_drafts`
- **Rule:** User must confirm before applying
- **Validation:** `assertDraftSafety(operation, isDraft, requiresConfirmation)`

---

## Temporal Constraints

### Deadlines

**Deadline Validation:**
- **Rule:** Deadline must be valid date
- **Rule:** Child deadlines cannot exceed parent deadlines
- **Validation:** Date validation + hierarchy check

**Deadline Extensions:**
- **Rule:** Each extension logged
- **Rule:** Extension reason recorded
- **Validation:** Service layer creates `roadmap_deadline_extensions` record

---

### Focus Sessions

**Session Duration:**
- **Min Duration:** 5 minutes
- **Max Duration:** 240 minutes (4 hours)
- **Validation:** Duration check on session creation

**Session State:**
- **Valid States:** `active`, `paused`, `completed`, `abandoned`
- **Validation:** Enum check

**Distractions:**
- **Rule:** Distraction must reference active session
- **Rule:** Distraction timestamp must be within session bounds
- **Validation:** Session validation

---

### Regulation Engine

**Regulation Thresholds:**
- **Work Hours:** User-configurable (default: 8 hours/day)
- **Break Frequency:** User-configurable (default: every 2 hours)
- **Daily Limit:** User-configurable (default: 10 hours)

**Regulation Events:**
- **Rule:** Events logged with timestamp and user_id
- **Rule:** Events cannot be deleted
- **Validation:** Append-only constraint

---

## Token & Budget Constraints

### AI Token Budgets

**Context Budget:**
- **Max Tokens Per Request:** Configurable per intent
- **Max Text Length Per Entity:** 1000 characters (default)
- **Max Tags Per Prompt:** 5
- **Max Snapshots:** 5 per request

**Validation:** `validateTagLimits(text)`, `assertCompositionDepth()`

**Budget Enforcement:**
- Service layer checks before context assembly
- Context truncated if exceeds budget
- Warning logged if truncation occurs

---

### Rate Limits

**AI Requests:**
- **Max Per Hour:** 60 (configurable)
- **Max Per Day:** 500 (configurable)
- **Validation:** Check usage cache before request

**API Requests:**
- **Max Per Minute:** 120
- **Max Per Hour:** 5000
- **Validation:** Rate limiter middleware

---

## Collaboration Constraints

### Presence

**Presence Timeout:**
- **Timeout:** 30 seconds of inactivity
- **Validation:** Ephemeral presence records expire automatically

**Cursor Broadcast:**
- **Throttle:** Max 10 updates per second
- **Validation:** Client-side throttle

---

### Collaboration Logs

**Log Immutability:**
- **Rule:** Logs cannot be updated after creation
- **Rule:** Logs cannot be deleted
- **Validation:** `assertCollaborationLogImmutability(operation, logId)`
- **Enforcement:** Database RLS policies + service layer

**Log Retention:**
- **Retention Period:** Indefinite (no automatic deletion)
- **Archival:** Not implemented yet

---

## Lifecycle Constraints

### Soft Delete

**Soft Delete Fields:**
- **Field:** `archived_at` (timestamp)
- **Rule:** Set to current timestamp on delete
- **Rule:** NULL = active, NOT NULL = archived

**Cascade Behavior:**
- **Rule:** Cascade deletes require explicit user confirmation
- **Validation:** Confirmation modal + service flag
- **Example:** Deleting track → confirm cascade delete of items

---

### Hard Delete

**Hard Delete Rules:**
- **Rule:** Hard delete only after soft delete
- **Rule:** Hard delete requires admin confirmation
- **Rule:** Hard delete creates audit log

**Forbidden Hard Deletes:**
- Collaboration logs (never deleted)
- AI interactions (never deleted)
- Regulation events (never deleted)

---

## Text & Data Limits

### String Lengths

| Field | Max Length | Truncation |
|-------|------------|------------|
| Track Name | 200 chars | Error |
| Item Title | 300 chars | Error |
| Item Description | 5000 chars | Truncate |
| AI Prompt | 10000 chars | Truncate |
| Tag Name | 50 chars | Error |
| Person Name | 100 chars | Error |

**Enforcement:** Database constraints + service validation

---

### Array Limits

| Array | Max Items |
|-------|-----------|
| Tags per prompt | 5 |
| Assignments per item | 10 |
| Children per item | 50 |
| Members per project | 100 |
| Tracks per project | 500 |

**Enforcement:** Service layer validation

---

## Anti-Pattern Detection

### Forbidden Patterns

**Pattern Detection:**
```typescript
assertNoAntiPattern('NO_AI_DIRECT_WRITE', { operation, targetTable })
assertNoAntiPattern('NO_PERSONAL_SPACES_MUTATION', { operation, targetEntity })
assertNoAntiPattern('NO_UI_BYPASSING_SERVICES', { operation })
assertNoAntiPattern('NO_CROSS_PROJECT_WITHOUT_PERMISSION', { operation, userId, projectId })
assertNoAntiPattern('NO_IMPLICIT_AUTOMATION', { operation })
```

**Enforcement:** Runtime checks throw `InvariantViolationError`

---

## Validation Flow

### Pre-Operation Validation

**Example: Create Roadmap Item**

```typescript
async function createRoadmapItem(data, context) {
  // 1. Validate authority
  assertAuthorityBoundary('create_roadmap_item', context.source);

  // 2. Validate permission
  assertPermissionBoundary('create_roadmap_item', context.userId, context.projectId, data.master_project_id);

  // 3. Validate composition depth
  if (data.parent_item_id) {
    const depth = await calculateCompositionDepth(data.parent_item_id);
    assertCompositionDepth(depth + 1);
  }

  // 4. Validate no circular composition
  if (data.parent_item_id) {
    const hasCircular = await checkCircularComposition(data.parent_item_id, data.parent_item_id);
    if (hasCircular) throw new Error('Circular composition detected');
  }

  // 5. Validate field lengths
  if (data.title.length > 300) throw new Error('Title too long');

  // 6. Proceed with creation
  const item = await supabase.from('roadmap_items').insert(data);

  // 7. Trigger allowed side effects
  await createMindMeshNode(item);
  await syncToTaskFlow(item);
  await createCollaborationLog('create_item', item.id);

  return item;
}
```

---

## Constraint Violation Handling

### Error Types

**`InvariantViolationError`:**
- Thrown when architectural invariant violated
- Indicates serious bug
- Logged for review

**`ValidationError`:**
- Thrown when constraint check fails
- Expected error (e.g., invalid input)
- Returned to user with clear message

**`PermissionError`:**
- Thrown when permission check fails
- User not authorized
- Returned with generic message (no info leak)

---

### Error Logging

All violations logged:

```typescript
{
  timestamp: '2025-12-12T10:00:00Z',
  error_type: 'InvariantViolationError',
  invariant: 'AI_CAN_WRITE',
  context: { operation: 'create_roadmap_item', source: 'ai' },
  user_id: 'user-123',
  stack_trace: '...'
}
```

---

## Testing Constraints

### Unit Tests (Future)

```typescript
describe('Constraint: Max Composition Depth', () => {
  it('should reject items beyond depth 3', async () => {
    const parent = await createItem({ depth: 3 });
    await expect(
      createItem({ parent_item_id: parent.id })
    ).rejects.toThrow('Composition depth 4 exceeds maximum 3');
  });
});
```

### Integration Tests (Future)

```typescript
describe('Constraint: Cross-Project Access', () => {
  it('should reject reads without permission', async () => {
    await expect(
      readItem(itemId, userWithoutAccess)
    ).rejects.toThrow('PermissionError');
  });
});
```

---

## Constraint Registry

All constraints are registered in:

- **`SYSTEM_INVARIANTS.ts`** - Constant definitions
- **`systemConstraintService.ts`** - Validation functions
- **Database Constraints** - CHECK constraints, foreign keys
- **RLS Policies** - Row-level security

---

## Summary

Constraints ensure:

1. **Data Integrity** - Valid states only
2. **Permission Safety** - Access control enforced
3. **Temporal Validity** - Dates and deadlines consistent
4. **Token Efficiency** - Budgets respected
5. **Collaboration Safety** - Immutable logs, ephemeral presence
6. **Lifecycle Compliance** - Soft delete preferred, cascades explicit

**All constraints enforced before operations, preventing invalid states.**

---

## Future Constraints (Planned)

### Notifications (When Implemented)

- **Max Notifications Per Hour:** 10
- **Notification Preferences:** User-configurable
- **Validation:** Check preferences before sending

### Automations (When Implemented)

- **Max Automations Per Project:** 20
- **Automation Review:** Requires preview + confirmation
- **Validation:** Explicit user action required

### Webhooks (When Implemented)

- **Max Webhooks Per Project:** 5
- **Webhook Validation:** URL validation + retry logic
- **Rate Limits:** Max 1000 webhook calls per day

---

## Conclusion

Constraints are **explicit, enforced, and auditable**. They prevent invalid operations before they occur, ensuring system integrity and user safety.

**Every operation must pass constraint checks before execution.**
