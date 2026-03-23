# Architecture: Tracks, Workspaces, and Roadmap

**Phase 0: Architectural Lock-In**

This document defines the canonical architecture for Tracks, Subtracks, Workspaces, and the Roadmap projection layer. This is a **developer reference**, not user documentation.

---

## Canonical Hierarchy (DO NOT CHANGE)

```
Project
 ├─ Tracks (strategy & intent)
 │   ├─ Subtracks (scoped intent)
 │   │   ├─ Track Workspace (micro-apps)
 │   │   │   ├─ Objectives
 │   │   │   ├─ Documents
 │   │   │   ├─ Research
 │   │   │   ├─ Time Planning
 │   │   │   └─ Financials
 │   │   └─ (optional) Roadmap Items
 │   └─ (optional) Roadmap Items
 └─ Roadmap (projection layer only)
```

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **Track** | Strategic intent container. Represents a major area of work or focus. |
| **Subtrack** | Scoped intent. A sub-area of work within a track. |
| **Workspace** | Where work happens. The actual work surface where users create content, manage objectives, research, plan time, and handle finances. |
| **Roadmap** | Time projection only. A read-only visualization layer that shows tracks, subtracks, and items on a timeline. |
| **Roadmap Item** | Optional time anchor. Represents a task, event, milestone, or other time-bound element. |

---

## Non-Negotiable Rules

### 1. Roadmap is a Projection Layer

**Roadmap never owns domain data.**

- Roadmap items are optional
- Tracks and subtracks MUST render even if they have zero roadmap items
- Roadmap exists to visualize time only
- Roadmap components are render-only

**What Roadmap MUST NOT do:**

- ❌ No business logic in roadmap components
- ❌ No track creation inside roadmap
- ❌ No workspace data edited via roadmap
- ❌ No mutations to domain data
- ❌ No filtering of tracks based on item presence
- ❌ No conditional omission of tracks/subtracks

**What Roadmap CAN do:**

- ✅ Display tracks and subtracks
- ✅ Display roadmap items (if they exist)
- ✅ Handle UI state (collapse, highlight, focus)
- ✅ Navigate to workspaces
- ✅ Visualize time relationships

### 2. Track & Subtrack Workspaces Are the Work Surface

**All real project work happens inside workspaces.**

- Workspaces are where users create and edit content
- Workspaces may optionally generate roadmap items
- Roadmap is read-only visualization

**What Workspaces CAN do:**

- ✅ Create/edit objectives
- ✅ Manage documents
- ✅ Conduct research
- ✅ Plan time
- ✅ Handle financials
- ✅ Create roadmap items (optional)

### 3. UI State Is Transient and Never Persisted

**UI state lives only in localStorage, never in Supabase.**

- Collapse state (tracks/subtracks)
- Highlight state
- Focus state
- Zoom level preferences
- View preferences

**UI State Rules:**

- ✅ Stored in localStorage only
- ✅ Scoped per project
- ✅ Never touches database
- ✅ Never leaks into domain types
- ✅ Cleared on logout (optional)

---

## Data Flow

### Roadmap Projection Flow

```
Database (Supabase)
  ├─ guardrails_tracks (domain data)
  ├─ track_project_instances (visibility/ordering)
  └─ roadmap_items (optional time anchors)
       ↓
useRoadmapProjection Hook
  ├─ Fetches domain data
  ├─ Merges instances + items
  ├─ Applies visibility rules
  ├─ Shapes projection data
  └─ NO MUTATIONS
       ↓
Roadmap UI Components
  ├─ Render projection data
  ├─ Handle UI state (localStorage)
  ├─ Navigate to workspaces
  └─ NO DOMAIN MUTATIONS
```

### Workspace Flow

```
Workspace Components
  ├─ Load track/subtrack data
  ├─ Allow editing
  ├─ Create roadmap items (optional)
  └─ Persist to database
       ↓
Database (Supabase)
  └─ Updates domain data
       ↓
Roadmap Projection
  └─ Refreshes to show updates
```

---

## Empty States Are Valid

**Empty is a valid state — absence of items is not an error.**

The following are all valid and must render correctly:

- ✅ Track with zero subtracks
- ✅ Subtrack with zero items
- ✅ Track with zero roadmap items
- ✅ Subtrack with zero roadmap items
- ✅ Project with zero tracks (shows empty state, routes to wizard)

**Implementation Notes:**

- Empty state checks should only verify track existence, not item presence
- Tracks/subtracks render even when empty
- Empty states are informational, not errors

---

## Component Responsibilities

### `useRoadmapProjection` Hook

**Purpose:** Single source of truth for Roadmap UI data.

**What it CAN do:**

- ✅ Fetch domain data (tracks, instances, items)
- ✅ Apply visibility_state filtering (hidden, collapsed, visible)
- ✅ Merge UI state from localStorage
- ✅ Check permissions via service calls
- ✅ Return fully-shaped, UI-safe projection

**What it MUST NOT do:**

- ❌ Mutate domain data
- ❌ Filter tracks based on item presence
- ❌ Apply UI logic beyond shaping
- ❌ Persist UI state to database
- ❌ Create/edit/delete tracks or items

### Roadmap UI Components

**Purpose:** Visualize time-based projection of tracks, subtracks, and items.

**What they CAN do:**

- ✅ Render projection data
- ✅ Handle UI state (collapse, highlight, focus)
- ✅ Navigate to workspaces
- ✅ Display timeline visualization

**What they MUST NOT do:**

- ❌ Mutate domain data
- ❌ Create/edit tracks or items
- ❌ Filter tracks based on item presence
- ❌ Access workspace data directly
- ❌ Apply business logic

### Workspace Components

**Purpose:** Provide work surface for creating and editing project content.

**What they CAN do:**

- ✅ Load track/subtrack data
- ✅ Allow editing of objectives, documents, research, etc.
- ✅ Create/edit roadmap items (optional)
- ✅ Persist changes to database

---

## Architectural Guardrails

### Separation of Concerns

1. **Roadmap = Projection Only**
   - Roadmap components consume projection data
   - Roadmap components never mutate domain data
   - Roadmap components handle UI state only

2. **Workspaces = Work Surface**
   - Workspaces own domain mutations
   - Workspaces can create roadmap items
   - Workspaces trigger projection refreshes

3. **Projection Hook = Data Shaping**
   - Hook fetches and shapes data
   - Hook applies visibility rules
   - Hook never mutates anything

### Code Organization

- **Projection Logic:** `src/hooks/useRoadmapProjection.ts`
- **Projection Types:** `src/lib/guardrails/roadmapProjectionTypes.ts`
- **Roadmap UI:** `src/components/guardrails/roadmap/`
- **Workspace UI:** `src/components/guardrails/[workspace-modules]/`

### Type Safety

- Projection types are separate from domain types
- UI state types are separate from domain types
- No mixing of concerns in type definitions

---

## Future Development Guidelines

When adding new features:

1. **Ask:** Is this a projection concern or a workspace concern?
2. **Ask:** Does this mutate domain data?
3. **Ask:** Does this belong in the roadmap or in a workspace?

**If it mutates domain data:**
- ❌ Does NOT belong in roadmap components
- ✅ Belongs in workspace components

**If it's projection/visualization:**
- ✅ Belongs in roadmap components
- ❌ Does NOT mutate domain data

**If it's work/content creation:**
- ✅ Belongs in workspace components
- ✅ Can create roadmap items (optional)

---

## Acceptance Criteria

This architecture is locked in when:

- ✅ Architecture is written down and enforced
- ✅ Roadmap projection renders all tracks reliably
- ✅ Empty tracks/subtracks render without hacks
- ✅ No component crosses responsibility boundaries
- ✅ Future phases can build without rethinking fundamentals
