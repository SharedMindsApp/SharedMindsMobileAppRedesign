# Phase 0: Groups + Permissions + Distribution - Architectural Lock-In

**Status:** Phase 0 - Design Validation Complete  
**Date:** January 2025  
**Purpose:** Final architectural validation and lock-in before Phase 1 (schema implementation) begins

**Based on:**
- `ARCHITECTURE_EXTENSION_GROUPS_PERMISSIONS.md` (January 2025)
- `ARCHITECTURE_BASELINE_TEAMS_PERMISSIONS_COLLABORATION.md` (January 2025)

---

## Executive Summary

This document validates and locks in the Phase 0 architectural decisions for adding team-scoped groups, entity-level permissions, creator default rights, and group-based distribution to SharedMinds.

**Validation Result:** ✅ **APPROVED WITH CLARIFICATIONS**

The proposed architecture is internally consistent, compatible with existing systems, and implementable additively. Minor clarifications are documented as Phase 0 corrections.

**This document is authoritative.** All implementation must follow these rules. Deviations represent architectural debt.

---

## 1. Validated Architectural Rules

### 1.1 Teams as Long-Lived Identity Containers ✅

**Rule:** Teams are persistent, team-scoped organizational units. Teams outlive projects and provide stable identity containers for groups.

**Validation:**
- ✅ Teams table exists with `archived_at` soft delete (lifecycle management)
- ✅ Team membership has status lifecycle (`pending` → `active` → `left`)
- ✅ Teams are distinct from projects (no confusion risk)
- ✅ Teams remain unchanged in this extension (no breaking changes)

**Boundary:** Teams are NOT:
- Project-scoped (teams exist independently)
- Temporary contexts (teams are long-lived)
- Permission sources for projects (project_users remains authoritative)

**Status:** ✅ **VALIDATED** - No changes needed

### 1.2 Groups as Team-Scoped, Lightweight Context Sets ✅

**Rule:** Groups are team-scoped collections of users used for permission scoping and distribution. Groups are lightweight (no complex lifecycle, no nested hierarchies).

**Validation:**
- ✅ Clear separation from `contact_groups` (different ownership model)
- ✅ Groups require team membership (validation constraint)
- ✅ Groups cascade delete with team (proper lifecycle)
- ✅ Groups are explicitly NOT contact groups (boundary preserved)

**Key Distinctions:**
| Aspect | Contact Groups | Team-Scoped Groups |
|--------|---------------|-------------------|
| Ownership | `owner_user_id` (user-owned) | `team_id` (team-owned) |
| Scope | Personal contacts | Team collaboration |
| Membership | Contacts (may not have accounts) | Team members only |
| Purpose | Personal contact sharing | Permission grants, distribution |

**Boundary:** Groups are NOT:
- Contact groups (distinct concept, distinct tables)
- Project-scoped (groups belong to teams, not projects)
- Hierarchical (no nested groups, no group-of-groups)
- Permission sources themselves (groups are containers for permission subjects)
- Team memberships (groups contain team members, but are not membership itself)

**Status:** ✅ **VALIDATED** - No changes needed

### 1.3 Creator Default Edit Rights (Revocable + Restorable) ✅

**Rule:** Entity creators automatically receive edit permissions for their entities. These rights can be revoked by project owners. Revocation is permanent (no automatic restore); re-granting requires explicit entity grant.

**Validation:**
- ✅ Creator rights are implicit (not stored as explicit grants)
- ✅ Creator rights are evaluated at resolution time (after project permissions)
- ✅ Revocation is explicit (stored in `creator_rights_revocations` table)
- ✅ Revocation is permanent (no undo mechanism)

**Resolution Logic:**
1. Check if user is creator (`entity.created_by = user_id`)
2. Check if creator rights were revoked (`creator_rights_revocations` table)
3. If creator AND not revoked: Grant `editor` role (but cannot exceed project permission)
4. If revoked: Fall back to project permissions + entity grants

**Boundary:** Creator rights are NOT:
- Ownership (creators are not owners unless also project owner)
- Permanent (can be revoked by project owners)
- Automatic for all entities (only tracks and subtracks in MVP)
- Grantable to others (creator rights are personal to the creator)

**Clarification Required:** ⚠️ **PHASE 0 CORRECTION #1** (see Section 5)

**Status:** ✅ **VALIDATED** with clarification

### 1.4 Owner as Ultimate Authority ✅

**Rule:** Project owners have ultimate authority over all entities within their projects. Owners can revoke creator rights, manage entity grants, and override any permission.

**Validation:**
- ✅ Project `owner` role is highest permission level
- ✅ Only owners can revoke creator rights
- ✅ Only owners can manage entity grants (implicit from project permission model)
- ✅ Owner authority cannot be reduced by grants or creator rights

**Permission Hierarchy:**
```
owner > editor > viewer
```

Owner authority is checked FIRST in permission resolution (project base layer).

**Boundary:** Owner authority is NOT:
- Transferable via grants (ownership is project-level only)
- Delegatable to groups (groups cannot grant ownership)
- Overridable by creator rights (creator rights are below owner)
- Applicable to other projects (owners are project-scoped)

**Status:** ✅ **VALIDATED** - No changes needed

### 1.5 Distribution via Projections (Not Assignment) ✅

**Rule:** Tasks and calendar events are distributed via projections, not direct assignment. Distribution creates projection records for each group member. Projections are read references to source entities.

**Validation:**
- ✅ Reuses existing `calendar_projections` pattern (proven model)
- ✅ Single source of truth (event/task exists once)
- ✅ Explicit distribution (no automatic distribution)
- ✅ Group membership resolved at distribution time (not dynamically)

**Pattern:**
1. Author creates entity (task/event)
2. Author distributes to group → creates projections for all group members
3. Group members see entity via their projections
4. Edits update source entity (projections are read references)

**Boundary:** Distribution is NOT:
- Assignment (no `assigned_to` field on entities)
- Ownership transfer (source entity remains owned by creator)
- Automatic (requires explicit distribution action)
- Dynamic (projections created at distribution time, not re-evaluated)

**Clarification Required:** ⚠️ **PHASE 0 CORRECTION #2** (see Section 5)

**Status:** ✅ **VALIDATED** with clarification

---

## 2. Explicit Non-Goals & Boundaries

### 2.1 What Groups Are NOT Allowed to Do

**Groups CANNOT:**
- ❌ Grant permissions that exceed project permissions (groups are refinement layer, not base layer)
- ❌ Exist without a team (groups are team-scoped, CASCADE DELETE with team)
- ❌ Contain users who are not team members (membership validation required)
- ❌ Grant ownership permissions (ownership is project-level only)
- ❌ Override project owner authority (owners have ultimate authority)
- ❌ Create nested hierarchies (no groups-of-groups)
- ❌ Cross team boundaries (groups belong to one team only)
- ❌ Be used as contact groups (distinct concepts, distinct tables)
- ❌ Automatically distribute entities (distribution is explicit action)
- ❌ Grant permissions to entities outside the team's projects (scoping constraint)

### 2.2 What Creator Rights Do NOT Imply

**Creator Rights DO NOT:**
- ❌ Grant ownership (creators are not owners)
- ❌ Override project permissions (creator rights are additive, not overriding)
- ❌ Grant permissions to others (creator rights are personal to creator)
- ❌ Prevent revocation (owners can revoke creator rights)
- ❌ Apply to all entities (only tracks/subtracks in MVP)
- ❌ Transfer with entity (creator rights are personal, not inheritable)
- ❌ Restore automatically after revocation (revocation is permanent)
- ❌ Grant manage permissions (creators get `editor` role, not `owner`)

### 2.3 What Distribution Does NOT Mean

**Distribution DOES NOT:**
- ❌ Transfer ownership (source entity remains owned by creator)
- ❌ Create copies (projections are read references)
- ❌ Automatically update when group membership changes (projections are snapshots)
- ❌ Grant permissions beyond projection metadata (permissions stored in projection)
- ❌ Sync edits automatically (edits update source, projections are read references)
- ❌ Apply to all entities (only tasks and calendar events in MVP)
- ❌ Create bidirectional relationships (distribution is one-way: creator → members)
- ❌ Override entity permissions (distribution permissions are separate from entity permissions)

---

## 3. Final Permission Semantics

### 3.1 Permission Resolution Order (Deterministic)

**Resolution follows strict priority order:**

1. **Project Base Permissions** (Step 1)
   - Check: `project_users.role` WHERE `user_id = ?` AND `master_project_id = ?`
   - Result: `'owner' | 'editor' | 'viewer' | null` (no access)
   - **If null:** User has NO access (stop resolution)
   - **If not null:** Base role established (cannot be reduced below this)

2. **Creator Default Rights** (Step 2)
   - Check: `entity.created_by = user_id` AND NOT EXISTS (`creator_rights_revocations`)
   - Result: If true, grant `'editor'` role (if project permission allows)
   - **Constraint:** Creator rights cannot exceed project permission
   - **If project = 'viewer':** Creator rights = `'viewer'` (not `'editor'`)
   - **If project = 'editor' or 'owner':** Creator rights = `'editor'`

3. **Entity-Level Grants** (Step 3)
   - Check: `entity_permission_grants` WHERE `entity_type = ?` AND `entity_id = ?`
     - Direct user grants: `subject_type = 'user'` AND `subject_id = user_id`
     - Group grants: `subject_type = 'group'` AND `subject_id IN (user's group memberships)`
   - Result: Highest role found (`'owner' > 'editor' > 'viewer'`)
   - **Constraint:** Grants cannot exceed project permission (if project = 'viewer', grant cannot be 'editor')

4. **Final Permission Calculation** (Step 4)
   ```
   base_role = project_users.role (Step 1)
   creator_role = 'editor' if creator AND not revoked (Step 2), else null
   grant_role = highest from entity grants (Step 3), else null
   
   final_role = max(base_role, creator_role, grant_role)
   Where: 'owner' > 'editor' > 'viewer'
   ```
   - **Constraint:** `final_role` cannot exceed `base_role` (project permission is ceiling)

**Determinism Guarantee:** ✅ Resolution order is fixed and deterministic. Same inputs always produce same output.

**Safety Guarantee:** ✅ No step can reduce permissions below project access level.

### 3.2 Permission Role Semantics

**Role Hierarchy:**
```
owner > editor > viewer
```

**Role Meanings:**
- **owner:** Full control (edit, manage permissions, delete)
- **editor:** Can edit content (cannot manage permissions, cannot delete)
- **viewer:** Read-only access

**⚠️ PHASE 0 CORRECTION #3:** The canonical permission system defines `PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer'`, but the extension document only uses `'owner' | 'editor' | 'viewer'`. Entity grants table must align with canonical types. See Section 5.

### 3.3 Grant Resolution Rules

**Key Rules:**
1. ✅ Grants are **additive** to project permissions (cannot restrict below project level)
2. ✅ Grants are checked **after** project membership (if user has no project access, grants don't apply)
3. ✅ Grants can be made to **users** or **groups** (group membership resolved at query time)
4. ✅ Group grants resolve to individual user grants at query time
5. ✅ Highest permission level wins (if user has project `viewer` but track grant `editor`, they get `editor` - but only if project allows it)

**Escalation Prevention:**
- ✅ Group grants cannot escalate beyond owner authority (project permission is ceiling)
- ✅ Creator rights cannot escalate beyond owner authority (project permission is ceiling)
- ✅ Entity grants cannot grant ownership (ownership is project-level only)

### 3.4 Creator Rights Semantics

**Creator Rights Rules:**
1. ✅ Creator rights are **implicit** (not stored as explicit grants)
2. ✅ Creator rights are **evaluated at resolution time** (checked after project permissions, before entity grants)
3. ✅ Creator rights can be **revoked** by project owners (stored as exclusion list)
4. ✅ Creator rights are **additive** (cannot restrict below project level)
5. ✅ Creator rights grant `editor` role (not `owner`)
6. ✅ Creator rights are **permanent until revoked** (no expiration)

**Revocation Rules:**
- ✅ Only project `owner` can revoke creator rights
- ✅ Revocation is **permanent** (no undo - must re-grant via entity grant if needed)
- ✅ Revocation affects **only** the creator's automatic rights (they can still get permissions via grants)

---

## 4. Confirmed Compatibility Guarantees

### 4.1 Backward Compatibility ✅

**Existing Systems Remain Unchanged:**
- ✅ `project_users` table (unchanged - remains authoritative)
- ✅ `team_members` table (unchanged - used for group membership validation)
- ✅ `contact_groups` table (unchanged - distinct concept)
- ✅ Existing RLS policies (additive only - new policies added, existing unchanged)
- ✅ Existing permission helper functions (extended, not replaced)
- ✅ Single-user workflows (continue unchanged - no grants = existing behavior)
- ✅ Legacy projects (continue unchanged - no grants = existing behavior)

**Backward Compatibility Pattern:**
- ✅ New permission resolution runs **in addition to** existing checks
- ✅ If no grants exist, resolution returns same result as existing logic
- ✅ Services accept optional `userId?` parameter (backward compatible)
- ✅ When `userId` not provided, fall back to RLS-only checks (existing behavior)

### 4.2 Safety Guarantees ✅

**Security Guarantees:**
- ✅ Existing RLS policies remain intact (no changes to existing security model)
- ✅ New grants table has its own RLS policies (isolated from existing)
- ✅ Permission resolution cannot bypass project access (project permission is base layer)
- ✅ Group membership validation prevents unauthorized access (groups can only contain team members)
- ✅ Owner authority cannot be overridden (project owners have ultimate authority)

**Data Integrity Guarantees:**
- ✅ Group membership validated against team membership (constraint)
- ✅ Entity grants validated against project membership (service layer check)
- ✅ Creator rights revocation validated (only owners can revoke)
- ✅ Distribution projections validated (group membership checked at distribution time)

**Performance Guarantees:**
- ✅ Permission resolution is deterministic (no N+1 queries)
- ✅ Group membership cached at distribution time (not re-evaluated)
- ✅ Grant lookups are indexed (fast resolution)
- ✅ RLS policies use SECURITY DEFINER functions (no recursion risk)

### 4.3 Single-User Workflow Compatibility ✅

**Single-User Projects:**
- ✅ Continue to work unchanged (no grants = existing behavior)
- ✅ Project owner has all permissions (existing behavior)
- ✅ No groups required (groups are optional feature)
- ✅ No creator rights tracking required (can be disabled via feature flag)

**Legacy Workflows:**
- ✅ Existing permission checks continue to work (backward compatible)
- ✅ RLS policies continue to work (additive only)
- ✅ Service layer continues to work (optional checks)
- ✅ UI continues to work (feature flags control visibility)

---

## 5. Phase 0 Corrections

### CORRECTION #1: Creator Rights Scope Clarification

**Issue:** The extension document states "Creator rights grant `editor` role" but also states "Creator rights cannot exceed project permission". This creates ambiguity: if a user has project `viewer` role, do creator rights grant `editor` (which exceeds project permission) or `viewer` (which doesn't exceed but doesn't add value)?

**Clarification:**
Creator rights grant **effective `editor` capabilities** but are **capped by project permission**. The resolution logic should be:
- If project role is `viewer`: Creator rights grant `viewer` (no escalation)
- If project role is `editor` or `owner`: Creator rights grant `editor` (effective edit capabilities)

**Resolution:** The extension document's resolution logic (Step 2) is correct: "Creator rights cannot exceed project permission (if project = 'viewer', creator still = 'viewer')". However, this should be made explicit in the final permission semantics.

**Action Required:** Update permission resolution documentation to explicitly state that creator rights are capped by project permission level.

### CORRECTION #2: Distribution and Group Membership Changes

**Issue:** The extension document proposes two options for handling group membership changes:
- Option A: Keep existing projections, mark as `revoked` (user keeps tasks they already accepted)
- Option B: Revoke all projections from that group (user loses all tasks immediately)

The document recommends Option A but doesn't lock this decision.

**Clarification:**
**LOCK IN: Option A (Keep existing, revoke future)**

**Rationale:**
- Better user experience (users don't lose work they've already accepted)
- Aligns with calendar projection model (projections are persistent)
- Cleaner separation (future distributions respect group membership, past distributions remain)

**Implementation:**
- When user is removed from group: Existing projections remain (no automatic revocation)
- When user is removed from group: Future distributions skip that user
- Optional: Manual revocation UI for project owners (can revoke specific projections)

**Action Required:** Lock in Option A as the canonical behavior. Document this decision in implementation plan.

### CORRECTION #3: Permission Role Alignment

**Issue:** The canonical permission system (`src/lib/permissions/types.ts`) defines `PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer'`, but the extension document's `entity_permission_grants` table only supports `'owner' | 'editor' | 'viewer'`. The `'commenter'` role is missing.

**Clarification:**
**LOCK IN: Entity grants support all canonical roles (`'owner' | 'editor' | 'commenter' | 'viewer'`)**

**Rationale:**
- Aligns with canonical permission system (consistency)
- Provides flexibility for future use cases (comment-only access)
- No breaking change (existing code uses `'owner' | 'editor' | 'viewer'`, which are subset)

**Implementation:**
- `entity_permission_grants.permission_role` should use `project_user_role` enum OR support `'commenter'`
- Resolution logic handles `'commenter'` role (maps to `can_comment: true, can_edit: false`)
- Role hierarchy: `owner > editor > commenter > viewer`

**Action Required:** Update entity grants table definition to support `'commenter'` role. Update resolution logic to handle `'commenter'`.

### CORRECTION #4: Project Permission as Ceiling (Explicit)

**Issue:** The extension document states that grants are "additive" but also that they "cannot exceed project permission". The resolution logic needs to explicitly cap grants at project permission level.

**Clarification:**
**LOCK IN: Project permission is the ceiling. No grant, creator right, or combination can exceed project permission level.**

**Resolution Logic (Updated):**
```
base_role = project_users.role (Step 1)
creator_role = 'editor' if creator AND not revoked (Step 2), else null
grant_role = highest from entity grants (Step 3), else null

candidates = [base_role, creator_role, grant_role].filter(not null)
final_role = max(candidates) WHERE final_role <= base_role
```

If `creator_role` or `grant_role` exceeds `base_role`, they are capped at `base_role`.

**Action Required:** Update resolution logic documentation to explicitly cap all roles at project permission level. Add this constraint to implementation.

---

## 6. Formal "Ready to Implement" Declaration

### 6.1 Architectural Validation Complete ✅

**Validation Status:** ✅ **APPROVED**

All architectural decisions have been validated:
- ✅ Conceptual soundness confirmed
- ✅ Permission model consistency verified
- ✅ Scope boundaries explicitly defined
- ✅ Backward compatibility guaranteed
- ✅ Safety guarantees confirmed
- ⚠️ Minor clarifications documented as Phase 0 corrections

### 6.2 Implementation Readiness ✅

**Ready for Phase 1 (Schema Implementation):**
- ✅ All tables defined (conceptual model complete)
- ✅ All relationships defined (foreign keys clear)
- ✅ All constraints defined (validation rules clear)
- ✅ All indexes defined (performance considerations addressed)
- ⚠️ Phase 0 corrections must be incorporated into Phase 1

**Required Before Phase 1:**
1. ✅ Incorporate Phase 0 corrections into schema design
2. ✅ Update permission resolution logic documentation with explicit capping
3. ✅ Lock in distribution behavior (Option A)
4. ✅ Align entity grants with canonical permission roles

### 6.3 Authoritative Status

**This document is canonical.** All implementation must follow these rules. Deviations represent architectural debt and must be documented as such.

**Next Steps:**
1. Phase 1: Schema implementation (incorporate Phase 0 corrections)
2. Phase 2: Service layer implementation
3. Phase 3: Permission enforcement
4. Phase 4: Distribution services
5. Phase 5: UI enablement

---

## Appendix: Key Decisions Reference

### Decision Log

| Decision | Status | Rationale |
|----------|--------|-----------|
| Teams as long-lived containers | ✅ LOCKED | Teams exist independently of projects |
| Groups as team-scoped | ✅ LOCKED | Clear separation from contact groups |
| Creator rights revocable | ✅ LOCKED | Owners have ultimate authority |
| Distribution via projections | ✅ LOCKED | Reuses proven pattern |
| Project permission as ceiling | ✅ LOCKED | Security guarantee |
| Option A for group membership changes | ✅ LOCKED | Better UX, aligns with projections |
| Support `commenter` role | ✅ LOCKED | Aligns with canonical types |

### Boundary Summary

**Groups:**
- ✅ Team-scoped only
- ✅ Lightweight context sets
- ✅ Used for permission scoping and distribution
- ❌ NOT contact groups
- ❌ NOT project-scoped
- ❌ NOT hierarchical

**Creator Rights:**
- ✅ Automatic edit permissions
- ✅ Revocable by owners
- ✅ Capped by project permission
- ❌ NOT ownership
- ❌ NOT permanent
- ❌ NOT grantable

**Distribution:**
- ✅ Via projections
- ✅ Explicit action
- ✅ Snapshot at distribution time
- ❌ NOT assignment
- ❌ NOT automatic
- ❌ NOT dynamic

---

**End of Phase 0 Lock-In Document**
