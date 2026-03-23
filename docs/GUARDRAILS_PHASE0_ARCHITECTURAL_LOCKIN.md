# Guardrails Phase 0: Architectural Lock-In
## Roadmap as Projection Layer

**Document Status:** Phase 0 - Documentation Only (No Schema Changes)  
**Effective Date:** January 2026  
**Purpose:** Establish unambiguous architectural rules before Phase 1 refactor

---

## Executive Summary

This document formally locks in the Guardrails mental model before a major architectural refactor. It establishes immutable rules that separate:

- **Guardrails Domain Entities** (Tasks, Events, Goals, etc.) — first-class domain models
- **Roadmap** — visualization and planning projection layer
- **Execution Views** (Calendar, Taskflow) — derived execution interfaces

**This is a rule document, not a suggestion document. Violations of these rules represent architectural debt that must be addressed in Phase 1.**

---

## 1. Roadmap as a Projection Layer

### 1.1 Explicit Definition

**Roadmap is a visualization and planning layer, not a domain model.**

Roadmap is responsible for:
- ✅ Visual hierarchy and nesting (`parent_item_id`, `item_depth`)
- ✅ Ordering and positioning (`ordering_index`, `order_index`)
- ✅ Visibility and display state (`visibility_state`, `include_in_roadmap`)
- ✅ Temporal projection onto a timeline (Gantt view)
- ✅ Planning-time organization (tracks, subtracks, sections)

Roadmap is **NOT** responsible for:
- ❌ Domain semantics (what a task means, how it behaves)
- ❌ Execution logic (how tasks are completed, validated)
- ❌ Domain validation (what makes a valid task, event, goal)
- ❌ Calendar or taskflow decisions (when items sync, how they appear)
- ❌ Lifecycle management (creation, deletion, state transitions)

### 1.2 Reference-Only Relationship

**Roadmap does not own tasks or events. Roadmap references domain entities by ID only.**

- Roadmap items are visual nodes that **reference** Guardrails domain entities
- Roadmap items cannot define or validate domain entity behavior
- Roadmap items cannot enforce domain constraints
- Roadmap items cannot dictate execution semantics

**Current Reality (Accepted Debt):**
- The `roadmap_items` table currently encodes domain semantics (`type`, `status`, `metadata`)
- This is intentional architectural debt accepted until Phase 1
- Phase 0 does not fix this; Phase 1 will separate domain tables from roadmap projections

**Rule:**
> **RULE-ROADMAP-REFERENCE**: Roadmap must reference domain entities by ID. Roadmap must never encode domain semantics, validation, or execution logic.

### 1.3 Projection Logic

Roadmap is a projection layer that transforms domain entities into a visualizable, hierarchical structure.

**What Roadmap Projects:**
- Domain entity relationships into parent-child hierarchies
- Domain entity assignments into track/subtrack groupings
- Domain entity time data into timeline positions
- Domain entity state into visibility and ordering decisions

**What Roadmap Does NOT Project:**
- Domain entity meaning (handled by domain layer)
- Domain entity validation (handled by domain layer)
- Domain entity execution (handled by execution layers)

**Rule:**
> **RULE-ROADMAP-PROJECTION**: Roadmap is a read-optimized projection for visualization. All domain logic, validation, and execution decisions must exist in lower layers.

---

## 2. Guardrails Domain Entities

### 2.1 First-Class Domain Models

**Guardrails Tasks, Events, Goals, Habits, and future entities are first-class domain models.**

Domain entities are responsible for:
- ✅ **Meaning**: What the entity represents semantically
- ✅ **Behavior**: How the entity behaves, transitions states, validates rules
- ✅ **Validation**: Domain-level constraints and invariants
- ✅ **Lifecycle**: Creation, updates, deletion, archiving
- ✅ **Relationships**: Domain-level associations (assignments, dependencies)

Domain entities are **NOT** responsible for:
- ❌ Visual placement (handled by Roadmap)
- ❌ Execution UI rendering (handled by Taskflow/Calendar)
- ❌ Planning-time organization (handled by Roadmap)

### 2.2 Independence from Roadmap

**Domain entities must never depend on Roadmap tables or logic.**

- Domain entities exist independently of roadmap entries
- Domain entities can be created, updated, and deleted without roadmap involvement
- Domain validation never checks roadmap state
- Domain behavior never queries roadmap tables

**Current Reality (Accepted Debt):**
- Currently, domain entities are stored in `roadmap_items` table
- Phase 1 will separate domain entities into dedicated tables (e.g., `guardrails_tasks`, `guardrails_events`)
- Phase 0 accepts this debt and establishes the rule that this must change

**Rule:**
> **RULE-DOMAIN-INDEPENDENCE**: Domain entities must exist independently of Roadmap. Domain entities must never query, depend on, or reference Roadmap tables for meaning, validation, or behavior.

### 2.3 Domain Entity Examples

#### Guardrails Task
- **Owns**: Task semantics (checklist, priority, dependencies), task lifecycle (creation, completion, archiving), task validation (required fields, state transitions)
- **Does NOT Own**: Visual position in roadmap, track/subtrack assignment (these are roadmap concerns), execution UI state (taskflow concern)

#### Guardrails Event
- **Owns**: Event semantics (location, time, attendees, recurrence), event lifecycle, event validation (date requirements, time validation)
- **Does NOT Own**: Timeline position (roadmap concern), calendar appearance (calendar sync concern)

#### Guardrails Goal
- **Owns**: Goal semantics (target value, current value, unit), goal lifecycle, goal validation (measurement rules)
- **Does NOT Own**: Planning position (roadmap concern), execution tracking (taskflow concern)

**Rule:**
> **RULE-DOMAIN-OWNERSHIP**: Each domain entity owns its complete semantic model, validation rules, and lifecycle. No higher layer (Roadmap, Taskflow, Calendar) may override or redefine domain entity meaning.

---

## 3. Execution Layers (Calendar & Taskflow)

### 3.1 Execution Views Only

**Calendar and Taskflow are execution views, not planning tools or domain models.**

Execution layers are responsible for:
- ✅ **Execution UI**: Presenting domain entities in execution-focused interfaces
- ✅ **User Actions**: Capturing execution-time user interactions (complete task, reschedule event)
- ✅ **Sync Rules**: Managing user-controlled synchronization from domain to execution views
- ✅ **Derived State**: Display-only state derived from domain entities (no persistence)

Execution layers are **NOT** responsible for:
- ❌ Domain semantics (what tasks/events mean)
- ❌ Domain validation (what makes valid tasks/events)
- ❌ Planning structure (hierarchies, ordering, visibility)
- ❌ Source of truth (domain entities are authoritative)

### 3.2 Derived from Domain Entities

**Execution layers derive from Guardrails domain entities, never from Roadmap.**

- Calendar events are derived from `guardrails_events` (domain), not `roadmap_items` (projection)
- Taskflow tasks are derived from `guardrails_tasks` (domain), not `roadmap_items` (projection)
- Execution layers may reference roadmap for filtering/grouping, but never for domain truth

**Current Reality (Accepted Debt):**
- Taskflow currently syncs from `roadmap_items` table via `roadmap_item_id`
- Calendar sync currently reads from `roadmap_items` table
- Phase 1 will change execution layers to read from domain entity tables
- Phase 0 accepts this debt and establishes the rule that execution must derive from domain

**Rule:**
> **RULE-EXECUTION-DERIVATION**: Execution layers must derive from Guardrails domain entities. Execution layers must never treat Roadmap as a source of truth for domain semantics or execution logic.

### 3.3 User-Controlled Sync

**Sync between domain and execution is user-controlled via explicit sync rules.**

- Users configure sync mappings (project-level, track-level, item-level)
- Sync is one-way: Domain → Execution (domain is authoritative)
- Execution changes propagate back to domain (not to roadmap)
- Sync rules are stored in `calendar_guardrails_sync` and similar tables

**Rule:**
> **RULE-EXECUTION-SYNC**: Execution layers sync from domain entities via user-controlled rules. Roadmap is not involved in sync logic. Execution changes update domain entities directly, not roadmap items.

### 3.4 Clarifications

**Guardrails Events ≠ Calendar Events**
- **Guardrails Event**: Domain entity with semantic meaning (project milestone, team meeting)
- **Calendar Event**: Execution instance derived from Guardrails Event, with user-specific sync settings
- One Guardrails Event may appear as multiple Calendar Events (different users, different calendars)

**Guardrails Tasks ≠ Calendar Tasks**
- **Guardrails Task**: Domain entity with semantic meaning (work item, checklist, dependency)
- **Calendar Task**: Execution instance derived from Guardrails Task (if task has time/deadline)
- Most Guardrails Tasks do not appear as Calendar Tasks (only time-bound ones)

**Guardrails Tasks ≠ Taskflow Tasks**
- **Guardrails Task**: Domain entity with semantic meaning and lifecycle
- **Taskflow Task**: Execution instance derived from Guardrails Task, filtered for Kanban view
- Taskflow is a filtered, execution-focused projection; not all Guardrails Tasks appear in Taskflow

**Rule:**
> **RULE-EXECUTION-IDENTITY**: Execution layer entities (Calendar Events, Taskflow Tasks) are derived instances, not domain entities. They share identity only via reference (domain entity ID). Execution layers must never claim to "be" domain entities.

---

## 4. Layer Responsibility Contract

### 4.1 Responsibility Matrix

| Layer | Owns | Must Never Own |
|-------|------|----------------|
| **Guardrails Domain** | Meaning, lifecycle, validation, semantics, behavior, domain relationships | Visual hierarchy, execution UI, planning structure |
| **Roadmap** | Hierarchy, ordering, visibility, nesting, timeline projection, planning organization | Semantics, execution logic, domain validation, domain lifecycle |
| **Taskflow** | Execution UI (Kanban), user execution actions, filtered task view, sync rules | Planning structure, domain validation, roadmap hierarchy |
| **Calendar** | Time execution UI, user scheduling actions, event sync rules, calendar presentation | Domain truth, roadmap planning, task semantics |
| **Mind Mesh** | Relationships, connections, graph edges, knowledge graph structure | State, execution logic, validation, domain semantics |

### 4.2 Hard Rule: Dependency Direction

**Higher layers may reference lower layers by ID only. Lower layers must never depend on higher layers for meaning.**

**Dependency Hierarchy (from lowest to highest):**
1. **Guardrails Domain** (foundation)
2. **Roadmap** (references domain by ID)
3. **Execution Layers** (Taskflow, Calendar — reference domain by ID, may filter via roadmap)
4. **Mind Mesh** (references all layers by ID)

**Rule:**
> **RULE-DEPENDENCY-DIRECTION**: Dependencies flow downward only. Lower layers cannot reference higher layers. Higher layers reference lower layers via ID only, never by logic or meaning.

### 4.3 Query Patterns

**Correct Pattern:**
```typescript
// Domain layer: Get domain entity
const task = await getGuardrailsTask(taskId);

// Roadmap layer: Get roadmap projection (references domain entity)
const roadmapItem = await getRoadmapItem(roadmapItemId);
const domainTaskId = roadmapItem.domainEntityId; // Reference by ID
const task = await getGuardrailsTask(domainTaskId); // Query domain, not roadmap

// Execution layer: Get execution view (references domain entity)
const taskflowTask = await getTaskflowTask(taskflowId);
const domainTaskId = taskflowTask.domainTaskId; // Reference by ID
const task = await getGuardrailsTask(domainTaskId); // Query domain, not execution
```

**Incorrect Pattern (VIOLATION):**
```typescript
// ❌ Domain layer querying roadmap for meaning
const task = await getTaskFromRoadmap(roadmapItemId); // WRONG: Domain depends on roadmap

// ❌ Execution layer treating roadmap as source of truth
const taskflowTask = await syncFromRoadmap(roadmapItemId); // WRONG: Should sync from domain

// ❌ Roadmap encoding domain validation
if (roadmapItem.type === 'task' && !roadmapItem.checklist) {
  throw new Error('Tasks require checklist'); // WRONG: Validation in roadmap layer
}
```

**Rule:**
> **RULE-QUERY-PATTERN**: All queries for domain meaning, validation, or behavior must target domain layer tables. Roadmap and execution layers provide filtering, grouping, and visualization only.

---

## 5. Vocabulary Lock-In

### 5.1 Standardized Terms

The following terms are locked in and must be used consistently across all code, documentation, and conversations.

#### Domain Terms
- **Task** → Guardrails domain entity representing actionable work
- **Event** → Guardrails domain entity representing a time-bound occurrence
- **Goal** → Guardrails domain entity representing a measurable objective
- **Habit** → Guardrails domain entity representing a recurring behavior pattern
- **Milestone** → Guardrails domain entity representing a significant achievement marker

#### Projection Terms
- **Roadmap Item** → Visual planning node in roadmap that references a domain entity by ID
- **Roadmap Entry** → Synonym for Roadmap Item (acceptable)
- **Roadmap Projection** → The visual representation of domain entities in roadmap

#### Execution Terms
- **Calendar Event** → Execution instance in calendar derived from Guardrails Event
- **Taskflow Task** → Execution instance in taskflow derived from Guardrails Task
- **Execution View** → Generic term for Calendar, Taskflow, or other execution interfaces

### 5.2 Discouraged Terms (Ambiguous)

The following terms are ambiguous and must be avoided. Use the standardized terms above instead.

❌ **"roadmap task"** → Use "Guardrails Task" (domain) or "Roadmap Item referencing a Task" (projection)  
❌ **"calendar task"** → Use "Guardrails Task" (domain) or "Calendar Event derived from Task" (execution)  
❌ **"taskflow event"** → Use "Guardrails Event" (domain) or clarify if Taskflow supports events  
❌ **"roadmap event"** → Use "Guardrails Event" (domain) or "Roadmap Item referencing an Event" (projection)  
❌ **"event task"** → Ambiguous; clarify whether this is a Guardrails Event, Guardrails Task, or Calendar Event

**Rule:**
> **RULE-VOCABULARY**: Use standardized terms consistently. Avoid ambiguous terms. When in doubt, specify the layer (domain, projection, execution) explicitly.

### 5.3 Code Naming Conventions

**Domain Entities:**
- TypeScript: `GuardrailsTask`, `GuardrailsEvent`, `GuardrailsGoal`
- Database: `guardrails_tasks`, `guardrails_events`, `guardrails_goals`
- Service functions: `getGuardrailsTask()`, `createGuardrailsEvent()`, `updateGuardrailsGoal()`

**Roadmap Projections:**
- TypeScript: `RoadmapItem`, `RoadmapEntry`
- Database: `roadmap_items` (current; Phase 1 may rename)
- Service functions: `getRoadmapItem()`, `createRoadmapItem()`, `updateRoadmapProjection()`

**Execution Views:**
- TypeScript: `TaskflowTask`, `CalendarEvent`
- Database: `taskflow_tasks`, `calendar_events`
- Service functions: `getTaskflowTask()`, `syncToCalendar()`, `getCalendarEventsForTask()`

**Rule:**
> **RULE-NAMING**: Type names, function names, and table names must clearly indicate the layer (domain, roadmap, execution). Avoid generic names like "Task" or "Event" without layer prefix.

---

## 6. Known Architectural Debt (Accepted Until Phase 1)

This section documents known misalignments with the Phase 0 architecture. These are **intentionally unfixed** in Phase 0. They represent accepted technical debt that must be addressed in Phase 1.

### 6.1 roadmap_items Encodes Domain Semantics

**Current State:**
- The `roadmap_items` table contains domain semantics:
  - `type` column (task, event, goal, etc.) — this is domain meaning
  - `status` column (not_started, in_progress, completed) — this is domain state
  - `metadata` JSONB column — this stores domain-specific data
  - `start_date`, `end_date` columns — these are domain time properties

**Why This Is Debt:**
- Roadmap should reference domain entities, not encode them
- Domain validation cannot be cleanly separated from roadmap concerns
- Execution layers incorrectly treat roadmap as source of truth

**Phase 1 Fix:**
- Create dedicated domain tables: `guardrails_tasks`, `guardrails_events`, `guardrails_goals`, etc.
- `roadmap_items` becomes a pure projection table with `domain_entity_type` and `domain_entity_id` columns
- Migrate existing domain data from `roadmap_items` to domain tables

### 6.2 Execution Layers Read from Roadmap

**Current State:**
- Taskflow syncs from `roadmap_items` via `roadmap_item_id` foreign key
- Calendar sync reads from `roadmap_items` table
- Execution layers query roadmap to determine domain entity state

**Why This Is Debt:**
- Execution layers should derive from domain entities, not roadmap projections
- Creates incorrect dependency: Execution → Roadmap → Domain (should be Execution → Domain)
- Roadmap changes (visibility, ordering) incorrectly affect execution views

**Phase 1 Fix:**
- Taskflow syncs from `guardrails_tasks` table (domain layer)
- Calendar syncs from `guardrails_events` table (domain layer)
- Execution layers reference domain entities directly via `domain_entity_id`

### 6.3 Lack of Side-Project Containers

**Current State:**
- All roadmap items must belong to a `master_project_id` and `track_id`
- No concept of "side projects" or "personal items" that exist outside project structure
- Domain entities are artificially constrained to project/track hierarchy

**Why This Is Debt:**
- Domain entities should exist independently of planning structure
- Side projects are a roadmap/planning concern, not a domain requirement
- Forces domain entities into project hierarchy even when not needed

**Phase 1 Fix:**
- Domain entities can exist without project/track assignment
- Roadmap items can reference domain entities and provide project/track context
- Side project containers become a roadmap-only concept

### 6.4 Roadmap Hierarchy Encodes Domain Relationships

**Current State:**
- `parent_item_id` in `roadmap_items` encodes both roadmap hierarchy AND domain relationships
- Domain entity relationships (task dependencies, event sequences) are stored in roadmap

**Why This Is Debt:**
- Domain relationships should exist in domain layer (e.g., `task_dependencies` table)
- Roadmap hierarchy should be a visual overlay, not the source of domain relationships
- Cannot represent domain relationships without roadmap projection

**Phase 1 Fix:**
- Create domain relationship tables: `task_dependencies`, `event_sequences`, etc.
- `parent_item_id` in roadmap becomes purely visual (roadmap-only hierarchy)
- Domain relationships are queried separately and projected onto roadmap

### 6.5 Mind Mesh Connections Reference Roadmap Items

**Current State:**
- Mind Mesh connections reference `roadmap_items` as source/target entities
- Knowledge graph structure depends on roadmap projections

**Why This Is Debt:**
- Mind Mesh should reference domain entities directly
- Knowledge graph should be independent of visual planning structure
- Roadmap changes should not affect knowledge graph structure

**Phase 1 Fix:**
- Mind Mesh connections reference domain entities via `domain_entity_type` and `domain_entity_id`
- Knowledge graph is rebuilt from domain relationships, not roadmap hierarchy
- Roadmap provides visual overlay on knowledge graph, but does not define it

**Rule:**
> **RULE-DEBT-ACKNOWLEDGMENT**: All items in Section 6 are accepted architectural debt. They must not be fixed in Phase 0. They must be addressed in Phase 1. No new code should be written that increases this debt.

---

## 7. Phase 0 Exit Criteria

Phase 0 is complete when all of the following criteria are met:

### 7.1 Documentation Completeness

- [x] **Roadmap's role is explicitly defined and constrained**
  - Roadmap is documented as a projection layer only
  - Roadmap responsibilities are clearly separated from domain and execution
  - Rules are stated in firm, unambiguous language

- [x] **Domain vs execution vs visualization is unambiguous**
  - Each layer's ownership is explicitly defined
  - Responsibility matrix is complete and accurate
  - Dependency direction is clearly stated with hard rules

- [x] **Language and terminology are standardized**
  - Vocabulary is locked in with clear definitions
  - Ambiguous terms are explicitly discouraged
  - Naming conventions are specified for code

### 7.2 Architectural Rules Established

- [x] **RULE-ROADMAP-REFERENCE**: Roadmap must reference domain entities by ID only
- [x] **RULE-ROADMAP-PROJECTION**: Roadmap is a read-optimized projection for visualization
- [x] **RULE-DOMAIN-INDEPENDENCE**: Domain entities must exist independently of Roadmap
- [x] **RULE-DOMAIN-OWNERSHIP**: Each domain entity owns its complete semantic model
- [x] **RULE-EXECUTION-DERIVATION**: Execution layers must derive from domain entities
- [x] **RULE-EXECUTION-SYNC**: Execution layers sync from domain via user-controlled rules
- [x] **RULE-EXECUTION-IDENTITY**: Execution entities are derived instances, not domain entities
- [x] **RULE-DEPENDENCY-DIRECTION**: Dependencies flow downward only
- [x] **RULE-QUERY-PATTERN**: All domain queries target domain layer tables
- [x] **RULE-VOCABULARY**: Use standardized terms consistently
- [x] **RULE-NAMING**: Names must indicate layer clearly
- [x] **RULE-DEBT-ACKNOWLEDGMENT**: Known debt is documented and accepted until Phase 1

### 7.3 Implementation Constraints

- [ ] **No new logic should be added to roadmap_items before Phase 1**
  - All new domain semantics must be planned for domain tables (Phase 1)
  - All new roadmap features must be projection-only (visual hierarchy, ordering)
  - All new execution features must derive from domain (not roadmap)

- [ ] **No new dependencies from domain to roadmap**
  - Domain validation must not query roadmap
  - Domain lifecycle must not update roadmap
  - Domain behavior must not depend on roadmap state

- [ ] **No new execution layers reading from roadmap**
  - All new execution views must read from domain entities
  - Sync logic must reference domain tables (even if roadmap currently stores domain data)
  - Execution queries must be planned for domain tables (Phase 1)

### 7.4 Team Alignment

- [ ] **All contributors have read and acknowledged this document**
- [ ] **Architectural rules are understood and accepted**
- [ ] **Vocabulary is adopted in conversations and code reviews**
- [ ] **Phase 1 planning references this document as constraint source**

---

## 8. Implementation Notes for Phase 1

**See [GUARDRAILS_PHASE1_IMPLEMENTATION_PLAN.md](./GUARDRAILS_PHASE1_IMPLEMENTATION_PLAN.md) for complete Phase 1 implementation details.**

This section provides high-level guidance for Phase 1 implementation. **Do not implement these in Phase 0.**

### 8.1 Domain Table Separation

**Goal:** Separate domain entities from roadmap projections.

**Steps:**
1. Create domain tables: `guardrails_tasks`, `guardrails_events`, `guardrails_goals`, `guardrails_habits`
2. Migrate domain data from `roadmap_items` to domain tables
3. Add `domain_entity_type` and `domain_entity_id` columns to `roadmap_items`
4. Update `roadmap_items` to reference domain entities by ID only
5. Remove domain columns (`type`, `status`, `metadata`, etc.) from `roadmap_items`

### 8.2 Execution Layer Refactoring

**Goal:** Execution layers derive from domain entities, not roadmap.

**Steps:**
1. Update Taskflow to read from `guardrails_tasks` instead of `roadmap_items`
2. Update Calendar sync to read from `guardrails_events` instead of `roadmap_items`
3. Update sync rules to reference domain entity IDs
4. Remove `roadmap_item_id` foreign keys from execution tables

### 8.3 Domain Relationship Separation

**Goal:** Domain relationships exist independently of roadmap hierarchy.

**Steps:**
1. Create domain relationship tables: `task_dependencies`, `event_sequences`, `goal_relationships`
2. Migrate relationship data from roadmap hierarchy to domain tables
3. Update roadmap to use visual-only hierarchy (`parent_item_id` for display only)
4. Rebuild Mind Mesh connections from domain relationships

### 8.4 Side Project Support

**Goal:** Domain entities can exist without project/track assignment.

**Steps:**
1. Make `master_project_id` and `track_id` nullable in domain tables (if needed)
2. Create `side_projects` container in roadmap layer only
3. Update roadmap items to provide project/track context without requiring it in domain

---

## 9. Document Maintenance

### 9.1 Amendment Process

This document may be amended only to:
- Clarify existing rules (add examples, expand explanations)
- Document additional known debt (add to Section 6)
- Update Phase 1 planning (update Section 8)

This document may **NOT** be amended to:
- Relax architectural rules (rules are immutable until Phase 1)
- Remove or modify responsibility assignments
- Change vocabulary or terminology

### 9.2 Phase 1 Completion

Upon completion of Phase 1 refactoring:
1. This document will be archived as historical reference
2. A new architecture document will reflect the post-refactor state
3. All known debt items (Section 6) must be resolved or explicitly accepted as new debt

---

## Summary

This document establishes the Guardrails architectural mental model with unambiguous rules:

1. **Roadmap is a projection layer** — visualization and planning only, never domain semantics
2. **Domain entities are first-class** — independent, authoritative, owning meaning and behavior
3. **Execution layers derive from domain** — Calendar and Taskflow are views, not sources of truth
4. **Dependencies flow downward** — lower layers never depend on higher layers
5. **Vocabulary is standardized** — consistent terms prevent ambiguity
6. **Known debt is accepted** — roadmap_items encoding domain is intentional until Phase 1
7. **Phase 0 is documentation only** — no schema changes, no refactors, clarity first

**This document makes it impossible to accidentally:**
- Treat Roadmap as a domain model
- Confuse Guardrails tasks/events with calendar entities
- Add execution logic to visualization layers
- Create dependencies from domain to roadmap

**Phase 1 implementation can now proceed safely with clear architectural constraints.**

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Next Review:** Phase 1 Planning
