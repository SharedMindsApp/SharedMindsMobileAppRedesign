# Architecture Invariants

## Purpose

This document defines **non-negotiable architectural rules** that govern the Guardrails system. These invariants are:

- **Enforced at runtime** via assertions
- **Checked at build time** via TypeScript
- **Validated by tests** (when implemented)
- **Immutable** without explicit architectural review

**Violations of these invariants represent bugs, not features.**

---

## Core Architectural Principles

### 1. Single Source of Truth (Authority)

**Invariant:** Guardrails is the **only** authoritative system for project management entities.

**What This Means:**
- `master_projects` table is authoritative for projects
- `guardrails_tracks_v2` table is authoritative for tracks
- `roadmap_items` table is authoritative for all project items
- `roadmap_item_assignments` table is authoritative for assignments
- `project_people` and `global_people` are authoritative for people
- `project_users` is authoritative for permissions

**Enforcement:**
```typescript
AUTHORITY_INVARIANTS.GUARDRAILS_IS_SOURCE_OF_TRUTH = true
```

**Forbidden:**
- AI creating roadmap items directly
- Personal Spaces mutating tracks
- Task Flow originating tasks
- Mind Mesh creating authoritative entities
- External systems writing to authoritative tables

**Allowed:**
- Guardrails UI writing to authoritative tables
- Guardrails API services writing to authoritative tables
- User-confirmed AI drafts applying to authoritative tables

---

### 2. AI Outputs Are Always Drafts

**Invariant:** AI **cannot** write directly to authoritative tables.

**What This Means:**
- All AI outputs go to `ai_drafts` table
- User must explicitly confirm before applying
- No silent AI mutations
- AI operates in a read-only context with draft-only writes

**Enforcement:**
```typescript
AI_INVARIANTS.OUTPUTS_ARE_DRAFTS = true
AI_INVARIANTS.CANNOT_WRITE_DIRECTLY = true
AI_INVARIANTS.REQUIRES_USER_CONFIRMATION = true
```

**Forbidden:**
- `INSERT INTO roadmap_items` from AI
- `UPDATE guardrails_tracks_v2` from AI
- Any AI operation bypassing draft table

**Allowed:**
- AI reading authoritative data (permission-checked)
- AI writing to `ai_drafts`
- User applying AI drafts to authoritative tables

---

### 3. Personal Spaces Are Consumption-Only

**Invariant:** Personal Spaces **cannot** mutate Guardrails authoritative state.

**What This Means:**
- Personal Spaces read from Guardrails
- Personal Spaces create consumption records
- Personal Spaces create personal links (owned by user)
- Personal Spaces never write back to Guardrails

**Enforcement:**
```typescript
AUTHORITY_INVARIANTS.PERSONAL_SPACES_CAN_WRITE = false
```

**Forbidden:**
- Personal Spaces creating roadmap items
- Personal Spaces updating tracks
- Personal Spaces affecting other users
- Personal Spaces mutating project state

**Allowed:**
- Personal Spaces reading authoritative data (permission-checked)
- Personal Spaces creating `personal_space_consumption` records
- Personal Spaces creating user-owned personal links

---

### 4. Task Flow Syncs, Doesn't Originate

**Invariant:** Task Flow **cannot** originate tasks. All tasks sync from roadmap items.

**What This Means:**
- Task Flow is a view/editor of roadmap items
- Task status updates sync back to roadmap items
- No tasks exist in Task Flow without corresponding roadmap item

**Enforcement:**
```typescript
AUTHORITY_INVARIANTS.TASK_FLOW_CAN_ORIGINATE_TASKS = false
```

**Forbidden:**
- Creating tasks in Task Flow UI without roadmap item
- Task Flow creating roadmap items
- Orphaned Task Flow tasks

**Allowed:**
- Task Flow displaying synced tasks
- Task Flow updating roadmap item status
- Task Flow triggering roadmap item updates

---

### 5. Mind Mesh Represents, Doesn't Create Authority

**Invariant:** Mind Mesh **cannot** create authoritative entities.

**What This Means:**
- Mind Mesh creates nodes representing entities
- Mind Mesh creates edges representing relationships
- Mind Mesh does not create tracks or roadmap items
- Mind Mesh is a graph representation, not a source of truth

**Enforcement:**
```typescript
AUTHORITY_INVARIANTS.MIND_MESH_CAN_CREATE_AUTHORITY = false
```

**Forbidden:**
- Mind Mesh creating roadmap items
- Mind Mesh creating tracks
- Mind Mesh mutating represented entities

**Allowed:**
- Mind Mesh creating nodes
- Mind Mesh creating edges
- Mind Mesh referencing authoritative entities by ID

---

### 6. Cross-Project Access Requires Permission Check

**Invariant:** No entity can be accessed across project boundaries without explicit permission validation.

**What This Means:**
- All cross-project reads validate user membership
- Shared tracks require source project access
- No data leaks across project boundaries
- Permission checks happen before data access

**Enforcement:**
```typescript
PERMISSION_INVARIANTS.NO_CROSS_PROJECT_READS_WITHOUT_CHECK = true
```

**Forbidden:**
- Reading entities from other projects without check
- Inferring existence of cross-project entities
- Bypassing permission layer

**Allowed:**
- Reading entities in user's project
- Reading shared tracks with validated access
- Cross-project reads after explicit permission check

---

### 7. Timeline Eligibility Rules

**Invariant:** Only root items and leaf items appear on timeline. Middle-tier items (with both parent and children) are hidden.

**What This Means:**
- Items with `parent_item_id` and children cannot appear on timeline
- Prevents visual clutter and ensures clean hierarchy
- Composition is 3 levels max: root → middle → leaf

**Enforcement:**
```typescript
TIMELINE_INVARIANTS.NO_CHILD_ON_TIMELINE = true
TIMELINE_INVARIANTS.MAX_COMPOSITION_DEPTH = 3
```

**Forbidden:**
- Displaying middle-tier items on timeline
- Exceeding 3 levels of composition depth
- Circular composition

**Allowed:**
- Root items on timeline
- Leaf items on timeline
- Items with parent OR children on timeline

---

### 8. Shared Tracks Have One Primary Authority

**Invariant:** Every shared track has exactly one primary authority project.

**What This Means:**
- Shared tracks originate from one project
- Other projects consume via `shared_track_links`
- No orphaned shared tracks
- No multiple primary authorities

**Enforcement:**
```typescript
SHARED_TRACK_INVARIANTS.ONE_PRIMARY_AUTHORITY = true
SHARED_TRACK_INVARIANTS.NO_ORPHANED_SHARED_TRACKS = true
```

**Forbidden:**
- Shared track without `master_project_id`
- Multiple projects claiming primary authority
- Orphaned shared tracks

**Allowed:**
- One project owns shared track
- Many projects consume via links
- Explicit visibility rules

---

### 9. Collaboration Logs Are Append-Only

**Invariant:** Collaboration logs are immutable after creation.

**What This Means:**
- Logs record all mutations
- Logs cannot be updated
- Logs cannot be deleted
- Audit trail is permanent

**Enforcement:**
```typescript
COLLABORATION_INVARIANTS.LOGS_APPEND_ONLY = true
COLLABORATION_INVARIANTS.NO_LOG_MUTATION = true
COLLABORATION_INVARIANTS.NO_LOG_DELETION = true
```

**Forbidden:**
- `UPDATE collaboration_activity`
- `DELETE FROM collaboration_activity`
- Mutating historical logs

**Allowed:**
- `INSERT INTO collaboration_activity`
- Reading logs
- Filtering logs

---

### 10. Ownership Semantics

**Invariant:** Entity ownership is explicit and enforced.

| Entity Type | Owner | Who Can Edit | Who Can View |
|-------------|-------|--------------|--------------|
| Track | Project | Project editors | Project viewers |
| Roadmap Item | Project | Project editors | Project viewers |
| AI Draft | User | Owner only | Owner only |
| Personal Link | User | Owner only | Owner only |
| Global Person | User | Owner only | Owner only |
| Collaboration Log | System | Never | Permission-checked |

**Enforcement:**
```typescript
OWNERSHIP_INVARIANTS.TRACKS_OWNED_BY_PROJECT = true
OWNERSHIP_INVARIANTS.ITEMS_OWNED_BY_PROJECT = true
OWNERSHIP_INVARIANTS.DRAFTS_OWNED_BY_USER = true
OWNERSHIP_INVARIANTS.PERSONAL_LINKS_OWNED_BY_USER = true
OWNERSHIP_INVARIANTS.GLOBAL_PEOPLE_OWNED_BY_USER = true
```

**Forbidden:**
- Non-owners editing AI drafts
- Non-owners editing personal links
- Users editing other projects without permission

**Allowed:**
- Owners editing their entities
- Project members editing project entities (per role)
- Read access per RLS policies

---

### 11. Lifecycle & Deletion Rules

**Invariant:** Soft delete is preferred. Archive before delete. Cascade deletes are explicit.

**What This Means:**
- Most deletions are soft deletes (archived_at timestamp)
- Hard deletes require confirmation
- Cascade deletes require explicit user action
- Orphan cleanup happens explicitly

**Enforcement:**
```typescript
LIFECYCLE_INVARIANTS.SOFT_DELETE_PREFERRED = true
LIFECYCLE_INVARIANTS.ARCHIVE_BEFORE_DELETE = true
LIFECYCLE_INVARIANTS.CASCADE_DELETES_EXPLICIT = true
```

**Forbidden:**
- Hard deletes without confirmation
- Silent cascade deletes
- Orphaning child entities

**Allowed:**
- Soft delete (set archived_at)
- Hard delete with confirmation
- Explicit cascade (with warning)

---

### 12. Side Effects Are Bounded

**Invariant:** Side effects are explicit, documented, and bounded.

**What This Means:**
- Every operation has defined side effects
- No silent cascades beyond documented effects
- Side effects documented in `SYSTEM_SIDE_EFFECTS.md`
- Forbidden side effects enforced at runtime

**Enforcement:**
```typescript
SIDE_EFFECT_INVARIANTS.ROADMAP_MAY_CREATE_MINDMESH = true
SIDE_EFFECT_INVARIANTS.ROADMAP_MAY_SYNC_TASKFLOW = true
SIDE_EFFECT_INVARIANTS.ROADMAP_CANNOT_CREATE_DRAFTS = true
SIDE_EFFECT_INVARIANTS.ROADMAP_CANNOT_AFFECT_PERSONAL_SPACES = true
```

**Forbidden:**
- Creating roadmap item → creating AI draft
- AI generating content → creating roadmap item
- Personal Space action → mutating Guardrails
- Undocumented side effects

**Allowed:**
- Creating roadmap item → creating Mind Mesh node
- Creating roadmap item → syncing to Task Flow
- All documented side effects in `SYSTEM_SIDE_EFFECTS.md`

---

## Anti-Patterns (Explicitly Forbidden)

### ❌ AI Direct Write

**What:** AI writing directly to authoritative tables.

**Why Forbidden:** Violates draft-safety invariant.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_AI_DIRECT_WRITE = true
```

**Example Violation:**
```typescript
await supabase.from('roadmap_items').insert({ title: aiGeneratedTitle });
```

**Correct Pattern:**
```typescript
await supabase.from('ai_drafts').insert({ draft_content: { items: [...] } });
```

---

### ❌ Personal Spaces Mutation

**What:** Personal Spaces mutating Guardrails authoritative state.

**Why Forbidden:** Personal Spaces are consumption-only.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_PERSONAL_SPACES_MUTATION = true
```

**Example Violation:**
```typescript
await supabase.from('roadmap_items').update({ status: 'completed' });
```

**Correct Pattern:**
```typescript
await supabase.from('personal_space_consumption').insert({ entity_id, consumed_at });
```

---

### ❌ UI Bypassing Services

**What:** UI directly mutating database without service layer validation.

**Why Forbidden:** Bypasses invariant checks and validation.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_UI_BYPASSING_SERVICES = true
```

**Example Violation:**
```typescript
await supabase.from('roadmap_items').insert(formData);
```

**Correct Pattern:**
```typescript
await roadmapService.createItem(formData, validationContext);
```

---

### ❌ Cross-Project Without Permission

**What:** Reading or writing across project boundaries without permission check.

**Why Forbidden:** Data leak, permission escalation.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_CROSS_PROJECT_WITHOUT_PERMISSION = true
```

**Example Violation:**
```typescript
const items = await supabase.from('roadmap_items').select('*').eq('master_project_id', otherProjectId);
```

**Correct Pattern:**
```typescript
await validateCrossProjectAccess(userId, currentProjectId, otherProjectId);
const items = await supabase.from('roadmap_items').select('*').eq('master_project_id', otherProjectId);
```

---

### ❌ Implicit Automation

**What:** Automated actions triggering without user confirmation.

**Why Forbidden:** User must control all mutations.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_IMPLICIT_AUTOMATION = true
```

**Example Violation:**
```typescript
if (item.deadline < tomorrow) {
  await supabase.from('roadmap_items').update({ status: 'overdue' });
}
```

**Correct Pattern:**
```typescript
if (item.deadline < tomorrow) {
  await createRegulationWarning(item.id, 'deadline_approaching');
}
```

---

### ❌ Silent Escalation

**What:** Granting permissions or access without explicit user action.

**Why Forbidden:** Security, principle of least privilege.

**Enforcement:**
```typescript
ANTI_PATTERN_FLAGS.NO_SILENT_ESCALATION = true
```

**Example Violation:**
```typescript
await supabase.from('project_users').insert({ user_id, master_project_id, role: 'editor' });
```

**Correct Pattern:**
```typescript
await inviteUserToProject(user_id, master_project_id, role, inviting_user_id);
```

---

## Domain Boundaries

### Guardrails ↔ Household

**Boundary:** Strict separation. No shared state.

**Allowed:**
- User belongs to both domains
- Separate database schemas
- No cross-domain mutations

**Forbidden:**
- Household mutating Guardrails
- Guardrails mutating Household
- Shared tables

---

### Guardrails ↔ Personal Spaces

**Boundary:** Consumption-only. One-way read.

**Allowed:**
- Personal Spaces reading Guardrails (permission-checked)
- Personal Spaces creating consumption records
- Personal Spaces creating personal links

**Forbidden:**
- Personal Spaces writing to Guardrails
- Personal Spaces affecting other users
- Bidirectional sync

---

### Guardrails ↔ AI

**Boundary:** AI reads, drafts writes. User confirms.

**Allowed:**
- AI reading Guardrails (permission + budget checked)
- AI writing to drafts
- User confirming drafts

**Forbidden:**
- AI writing to Guardrails
- AI triggering automation
- AI silent execution

---

### Guardrails ↔ Task Flow

**Boundary:** Sync relationship. Task Flow displays + updates synced tasks.

**Allowed:**
- Task Flow reading roadmap items
- Task Flow updating roadmap item status
- Bidirectional sync

**Forbidden:**
- Task Flow creating roadmap items
- Task Flow deleting roadmap items
- Task Flow as source of truth

---

### Guardrails ↔ Mind Mesh

**Boundary:** Representation relationship. Mind Mesh represents Guardrails entities.

**Allowed:**
- Mind Mesh creating nodes referencing entities
- Mind Mesh creating edges representing relationships
- Roadmap changes creating Mind Mesh updates

**Forbidden:**
- Mind Mesh creating authoritative entities
- Mind Mesh mutating roadmap items
- Mind Mesh as source of truth

---

## Verification & Enforcement

### Runtime Enforcement

All invariants enforced via:

1. **`SYSTEM_INVARIANTS.ts`** - Exported constants and assertions
2. **`systemConstraintService.ts`** - Validation functions
3. **Service Layer** - Pre-operation checks
4. **Database RLS** - PostgreSQL row-level security

**Example:**
```typescript
import { assertAuthorityBoundary } from './SYSTEM_INVARIANTS';

function createRoadmapItem(data, context) {
  assertAuthorityBoundary('create_roadmap_item', context.source);
  // ... proceed with creation
}
```

### Compile-Time Enforcement

TypeScript types enforce architectural boundaries:

```typescript
type AuthoritativeWrite = {
  source: 'guardrails_ui' | 'guardrails_api';
  target: AuthoritativeTable;
};

type DraftWrite = {
  source: 'ai';
  target: 'ai_drafts';
};

type ConsumptionRead = {
  source: 'personal_spaces';
  target: AuthoritativeTable;
  operation: 'read';
};
```

### Test Enforcement (Future)

```typescript
describe('Invariant: AI Cannot Write Directly', () => {
  it('should throw InvariantViolationError', async () => {
    await expect(
      aiService.createRoadmapItem(data)
    ).rejects.toThrow(InvariantViolationError);
  });
});
```

---

## Future-Proofing

### Notification System (When Implemented)

**Must:**
- Consume collaboration logs + analytics (read-only)
- Require explicit user opt-in
- Never mutate any entities
- Be user-configurable

**Must Not:**
- Write to authoritative tables
- Trigger automations
- Execute without opt-in

---

### Automation System (When Implemented)

**Must:**
- Require explicit user configuration
- Show preview before execution
- Create audit trail
- Be reversible

**Must Not:**
- Execute silently
- Mutate without confirmation
- Bypass permission checks

---

### Proactive AI (When Implemented)

**Must:**
- Create drafts only
- Require user opt-in
- Respect token budgets
- Be transparent

**Must Not:**
- Execute automatically
- Mutate authoritative tables
- Trigger notifications

---

## Invariant Validation

Run invariant validation:

```typescript
import { validateInvariants } from './SYSTEM_INVARIANTS';

const result = validateInvariants();
if (!result.valid) {
  console.error('Invariant violations detected:', result.violations);
}
```

Expected output:
```json
{
  "valid": true,
  "violations": []
}
```

---

## Conclusion

These invariants are **non-negotiable**. Violations represent architectural bugs.

Future development must:
1. **Respect** these invariants
2. **Enforce** via runtime checks
3. **Document** any new invariants
4. **Review** invariant changes architecturally

**Guardrails has guardrails.** These are them.
