# Phase 6.0: Product Surface Definition & Domain Context Resolution

**Status**: 🟡 IN PROGRESS — DECISION PHASE  
**Date**: January 2025  
**Depends on**: Phase 4.0–4.4 (Completed), Phase 5.0 (Correctly Blocked)  
**Scope Type**: Product Definition & Domain Clarity  
**Architecture Status**: 🔒 LOCKED — NO CHANGES ALLOWED

## Executive Summary

Phase 6.0 exists to define missing product surfaces and resolve domain context ambiguity that blocked Phase 5.0.

**This is a decision phase, not a build phase.**

No UI implementation. No schema changes. No permission changes. Only explicit decisions and documentation.

## Current State Analysis

### ✅ What Already Exists (Locked, Not Debated)

| Feature | Status | Evidence |
|---------|--------|----------|
| Permission architecture | ✅ Complete | Phase 0–4 implementation |
| API + hooks layers | ✅ Complete | Phase 3 implementation |
| Phase 4 UIs | ✅ Complete | All components production-ready |
| Feature flag strategy | ✅ Locked | ENABLE_GROUPS, ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS, ENABLE_GROUP_DISTRIBUTION |
| Permission layering | ✅ Locked | Route/layout/action pattern established |
| Standalone admin routes | ✅ Existing | `/teams/:teamId/groups`, `/projects/:projectId/tracks/:trackId/permissions` |

### 🔍 Schema Evidence (Current Reality)

#### Project Ownership Model
- **Schema**: `master_projects.user_id` (references `auth.users.id`)
- **Conclusion**: Projects are **user-owned**, not team-owned
- **Evidence**: No `team_id` column in `master_projects` table
- **Service Evidence**: Entity grants service comment: *"Teams and projects are independent entities in the current architecture"*

#### Team Model
- **Schema**: `teams` table exists independently
- **Membership**: `team_members` table (user_id → team_id, role)
- **Groups**: `team_groups.team_id` (groups belong to teams)
- **Conclusion**: Teams are **independent organizational units**

#### Task/Event Ownership
- **Tasks**: Owned via parent event (`event_tasks.event_id` → `calendar_events.user_id`)
- **Events**: Owned via `context_events.created_by` (references `auth.users.id`)
- **Conclusion**: Tasks and events are **user-owned**, no direct team relationship

#### Distribution Requirements
- **Groups**: Team-scoped (`team_groups.team_id`)
- **Distribution**: Requires `teamId` to list groups
- **Gap**: Tasks/events don't have team context

### 📋 Missing Product Surfaces (From Phase 5.0)

1. **Team Settings / Team Admin Surface** — Does not exist
2. **Track Settings / Track Admin Surface** — Does not exist
3. **Task Detail View** — Does not exist
4. **Event Detail View** — Does not exist

---

## Decision Framework

### 1. Product Surface Decisions

For each missing surface, choose one option:

#### 1.1 Team Settings / Team Admin Surface

**Purpose**: Integration target for Team Groups (Phase 4.0)

**Options**:

- ⬜ **Option A: Create Team Settings Page**
  - New page/route: `/teams/:teamId/settings`
  - Contains: Team Groups section (embedded Phase 4.0 UI)
  - Access: Team owners/admins
  - Pros: Centralized team management, discoverable
  - Cons: New UX surface, design work required
  
- ⬜ **Option B: Keep Standalone Route (Permanent)**
  - Route: `/teams/:teamId/groups` (already exists)
  - Access: Team owners/admins
  - Status: Power-user/admin surface
  - Pros: No new surface needed, direct access
  - Cons: Less discoverable, separate from team context
  
- ⬜ **Option C: Hybrid (Link from Team, Standalone Route)**
  - Team view/page has "Manage Groups" link
  - Link navigates to `/teams/:teamId/groups`
  - Status: Standalone route with navigation entry point
  - Pros: Discoverable but no new surface
  - Cons: Requires identifying "Team view/page" integration point
  
- ⬜ **Option D: Defer Entirely**
  - No integration planned
  - Status: Standalone route is permanent solution
  - Pros: No decisions needed
  - Cons: Feature remains disconnected from team management

**Decision**: ⬜ **CHOOSE ONE**

**Rationale** (required if Option A or C chosen):
```
[Explain decision rationale here]
```

---

#### 1.2 Track Settings / Track Admin Surface

**Purpose**: Integration target for Track Permissions (Phase 4.1) and Creator Rights (Phase 4.2)

**Options**:

- ⬜ **Option A: Create Track Settings Page**
  - New page/route: `/projects/:projectId/tracks/:trackId/settings`
  - Contains: Permissions section (embedded Phase 4.1 UI), Creator Rights section (embedded Phase 4.2 UI)
  - Access: Track editors/owners
  - Pros: Centralized track management, discoverable
  - Cons: New UX surface, design work required
  
- ⬜ **Option B: Keep Standalone Route (Permanent)**
  - Route: `/projects/:projectId/tracks/:trackId/permissions` (already exists)
  - Access: Track editors/owners
  - Status: Power-user/admin surface
  - Pros: No new surface needed, direct access
  - Cons: Less discoverable, separate from track context
  
- ⬜ **Option C: Hybrid (Link from Track Workspace, Standalone Route)**
  - Track workspace has "Permissions" link/button
  - Link navigates to `/projects/:projectId/tracks/:trackId/permissions`
  - Status: Standalone route with navigation entry point
  - Pros: Discoverable but no new surface
  - Cons: Requires identifying Track Workspace integration point
  
- ⬜ **Option D: Defer Entirely**
  - No integration planned
  - Status: Standalone route is permanent solution
  - Pros: No decisions needed
  - Cons: Feature remains disconnected from track management

**Decision**: ⬜ **CHOOSE ONE**

**Rationale** (required if Option A or C chosen):
```
[Explain decision rationale here]
```

---

#### 1.3 Task Detail View

**Purpose**: Integration target for Task Distribution (Phase 4.3)

**Options**:

- ⬜ **Option A: Create Task Detail View**
  - New view/modal/page for individual tasks
  - Contains: Task Distribution section (embedded Phase 4.3 UI)
  - Access: Task owners/editors
  - Pros: Rich task context, distribution visible in task context
  - Cons: Significant new UX surface, tasks may be lightweight
  
- ⬜ **Option B: Integrate into Existing Views**
  - Integrate Task Distribution UI into Planner, Roadmap, or Task List views
  - Status: Distribution as action/panel in existing views
  - Pros: No new surface, fits existing patterns
  - Cons: Requires identifying integration points, may be less prominent
  
- ⬜ **Option C: Keep Standalone Route (Admin-Only)**
  - Route: `/projects/:projectId/tracks/:trackId/tasks/:taskId/distribution` (needs creation)
  - Access: Task owners only
  - Status: Power-user/admin surface
  - Pros: No new surface, clear separation
  - Cons: Less discoverable, requires route creation
  
- ⬜ **Option D: Defer Entirely**
  - No integration planned
  - Status: Distribution feature remains unused until task detail exists
  - Pros: No premature decisions
  - Cons: Feature blocked until future work

**Decision**: ⬜ **CHOOSE ONE**

**Rationale** (required):
```
[Explain decision rationale here]
```

**Integration Point** (if Option B chosen):
```
[Specify which view(s) and where distribution UI should appear]
```

---

#### 1.4 Event Detail View

**Purpose**: Integration target for Event Distribution (Phase 4.4)

**Options**:

- ⬜ **Option A: Create Event Detail View**
  - New view/modal/page for individual events
  - Contains: Event Distribution section (embedded Phase 4.4 UI)
  - Access: Event owners
  - Pros: Rich event context, distribution visible in event context
  - Cons: Significant new UX surface, events may be lightweight
  
- ⬜ **Option B: Integrate into Calendar UI**
  - Integrate Event Distribution UI into Calendar view (event modal/sidebar)
  - Status: Distribution as action/panel in calendar
  - Pros: No new surface, fits existing patterns
  - Cons: Requires identifying calendar integration points
  
- ⬜ **Option C: Keep Standalone Route (Admin-Only)**
  - Route: `/projects/:projectId/tracks/:trackId/events/:eventId/distribution` (needs creation)
  - Access: Event owners only
  - Status: Power-user/admin surface
  - Pros: No new surface, clear separation
  - Cons: Less discoverable, requires route creation
  
- ⬜ **Option D: Defer Entirely**
  - No integration planned
  - Status: Distribution feature remains unused until event detail exists
  - Pros: No premature decisions
  - Cons: Feature blocked until future work

**Decision**: ⬜ **CHOOSE ONE**

**Rationale** (required):
```
[Explain decision rationale here]
```

**Integration Point** (if Option B chosen):
```
[Specify which calendar view/component and where distribution UI should appear]
```

---

### 2. Domain Context Resolution (CRITICAL)

#### 2.1 Project ↔ Team Relationship

**Current Reality** (from schema):
- Projects are **user-owned** (`master_projects.user_id`)
- Teams are **independent** organizational units
- **No direct relationship** between projects and teams in schema
- Service comment: *"Teams and projects are independent entities"*

**Question**: How should tasks/events derive team context for distribution?

**Options**:

- ⬜ **Option A: User's Teams (Explicit Selection)**
  - Distribution UI shows groups from all teams the user belongs to
  - User selects team/group explicitly
  - No automatic team derivation
  - Pros: Flexible, no schema changes, respects independence
  - Cons: Requires user to know which team, may show irrelevant teams
  
- ⬜ **Option B: Project → Team Mapping (Future Schema Change)**
  - Add `team_id` to `master_projects` (nullable)
  - Projects can optionally belong to teams
  - Distribution derives team from project
  - Pros: Clear ownership, automatic context
  - Cons: Schema change required, breaks independence model
  
- ⬜ **Option C: Contextual Derivation (User's Primary Team)**
  - Use user's "primary" or "active" team (if such concept exists)
  - Fallback to all user teams if no primary
  - Pros: Automatic context, no schema changes
  - Cons: Ambiguous "primary team" concept, may be wrong team
  
- ⬜ **Option D: No Default (Require Explicit Team Selection)**
  - Distribution UI requires user to select team first
  - Then shows groups for that team
  - Pros: Explicit and clear, no assumptions
  - Cons: Extra step, less smooth UX

**Decision**: ⬜ **CHOOSE ONE**

**Rationale** (required):
```
[Explain decision rationale here]
```

**Implementation Notes** (if Option B chosen):
```
[Document schema change requirements and migration plan]
```

---

#### 2.2 Task/Event Team Context Derivation

**Current Reality** (from schema):
- Tasks: `event_tasks.event_id` → `calendar_events.user_id` (user-owned)
- Events: `context_events.created_by` (user-owned)
- No direct team relationship

**Question**: Given the project-team relationship decision above, how do tasks/events get team context?

**Decision Logic** (depends on 2.1):

If **Option A (User's Teams)**:
- ✅ **Resolved**: Distribution UI lists all teams user belongs to
- ✅ **Resolved**: User selects team, then group from that team
- ✅ **No schema changes needed**

If **Option B (Project → Team Mapping)**:
- ⬜ **Decision Required**: How to get project from task/event?
  - Tasks: `event_tasks` → (needs track/project lookup)
  - Events: `context_events` → (needs track/project lookup)
- ⬜ **Decision Required**: What if project has no team_id (nullable)?
  - Fallback to user's teams?
  - Disable distribution?

If **Option C (Primary Team)**:
- ⬜ **Decision Required**: How is "primary team" determined?
  - Most recent team activity?
  - Explicit user preference?
  - First team alphabetically?

If **Option D (Explicit Selection)**:
- ✅ **Resolved**: UI flow requires team selection first
- ✅ **No derivation logic needed**

**Decision**: ⬜ **DOCUMENT DERIVATION LOGIC**

**Derivation Rules** (required):
```
[Document the exact logic for deriving teamId for tasks/events based on 2.1 decision]
```

---

#### 2.3 Distribution Scope Model

**Question**: Is distribution team-scoped, project-scoped, or contextual?

**Current Reality**:
- Groups are team-scoped (`team_groups.team_id`)
- Distribution services require `teamId` to list groups
- Permission grants are project-scoped (but can grant to team groups)

**Options**:

- ⬜ **Option A: Team-Scoped Distribution (Current)**
  - Distribution always requires team context
  - Groups are team-scoped
  - Pros: Matches current architecture, clear boundaries
  - Cons: Requires team context resolution
  
- ⬜ **Option B: Project-Scoped Distribution**
  - Distribution uses project context
  - Groups span teams (schema change required)
  - Pros: Simpler context resolution
  - Cons: Major schema change, breaks team-scoped groups model
  
- ⬜ **Option C: Mixed (Team-Scoped, Project-Derived)**
  - Distribution is team-scoped
  - Team context derived from project (if Option 2.1B chosen)
  - Pros: Clear scoping with automatic derivation
  - Cons: Requires project-team relationship

**Decision**: ⬜ **CHOOSE ONE** (Recommended: Option A, matches current architecture)

**Rationale** (required):
```
[Explain decision rationale here]
```

---

### 3. Admin Route Policy

**Question**: What is the long-term role of standalone admin routes?

**Current Routes**:
- `/teams/:teamId/groups` (Team Groups)
- `/projects/:projectId/tracks/:trackId/permissions` (Track Permissions)

**Policy Options**:

- ⬜ **Option A: All Routes Permanent (Admin Surfaces)**
  - Standalone routes are permanent power-user/admin surfaces
  - No integration planned
  - Pros: Clear, no future migration
  - Cons: Features remain disconnected
  
- ⬜ **Option B: All Routes Temporary (Integration Targets)**
  - Standalone routes are temporary
  - Will be embedded into settings/detail views
  - Routes deprecated after integration
  - Pros: Unified UX
  - Cons: Requires all surfaces to exist
  
- ⬜ **Option C: Mixed (Case-by-Case)**
  - Some routes permanent (admin-only)
  - Some routes temporary (integration targets)
  - Document decision per route
  - Pros: Flexible, pragmatic
  - Cons: Requires explicit documentation

**Decision**: ⬜ **CHOOSE ONE**

**Route-by-Route Decision** (if Option C):

| Route | Status | Rationale |
|-------|--------|-----------|
| `/teams/:teamId/groups` | ⬜ Permanent / ⬜ Temporary / ⬜ Deprecated | |
| `/projects/:projectId/tracks/:trackId/permissions` | ⬜ Permanent / ⬜ Temporary / ⬜ Deprecated | |

---

## Decision Summary Template

Once all decisions are made, complete this summary:

### Product Surfaces

- **Team Settings**: ⬜ Created / ⬜ Standalone / ⬜ Hybrid / ⬜ Deferred
- **Track Settings**: ⬜ Created / ⬜ Standalone / ⬜ Hybrid / ⬜ Deferred
- **Task Detail**: ⬜ Created / ⬜ Integrated / ⬜ Standalone / ⬜ Deferred
- **Event Detail**: ⬜ Created / ⬜ Integrated / ⬜ Standalone / ⬜ Deferred

### Domain Context

- **Project-Team Relationship**: ⬜ Option A / ⬜ Option B / ⬜ Option C / ⬜ Option D
- **Team Context Derivation**: [Document logic]
- **Distribution Scope**: ⬜ Team-Scoped / ⬜ Project-Scoped / ⬜ Mixed

### Admin Routes

- **Policy**: ⬜ Permanent / ⬜ Temporary / ⬜ Mixed
- **Route Decisions**: [Per-route status]

---

## Integration Readiness Statement

Once all decisions are locked, document what Phase 5.x may integrate:

### Ready for Integration

- [List features that can be integrated based on decisions]

### Remaining Standalone

- [List features that will remain standalone]

### Blocked Until Future Work

- [List features blocked by deferred decisions]

---

## Constraints (Non-Negotiable)

During Phase 6.0:

- ❌ No UI implementation
- ❌ No schema changes (unless explicitly documented as required)
- ❌ No permission changes
- ❌ No hooks or APIs
- ❌ No "temporary" logic
- ❌ No assumptions baked into code

- ✅ Decisions only
- ✅ Documentation only
- ✅ Explicit acceptance of tradeoffs

---

## Next Phase (After Phase 6.0)

Once Phase 6.0 decisions are locked:

🔜 **Phase 5.1: Controlled Integration into Defined Surfaces**

- Integration only
- No new permissions
- No new architecture
- No ambiguity
- Uses Phase 6.0 decisions as requirements

---

## Completion Criteria

Phase 6.0 is complete when:

- ✅ All product surface decisions are made (with rationale)
- ✅ Domain context resolution is explicit (with derivation rules)
- ✅ Admin route policy is defined (per-route if mixed)
- ✅ Integration readiness statement is documented
- ✅ All decisions are documented with tradeoffs accepted
- ✅ No ambiguity remains for Phase 5.1

---

**Document Status**: 🟡 Decision Framework (Pending Decisions)  
**Last Updated**: January 2025  
**Next Step**: Complete decision framework with explicit choices
