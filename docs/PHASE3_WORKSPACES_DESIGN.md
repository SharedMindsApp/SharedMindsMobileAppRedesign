# Phase 3: Track & Subtrack Workspaces — Design Brief & Implementation Plan

**Status**: Design Phase  
**Dependencies**: Phase 0 (Architectural Lock-In), Phase 1 (Projection Pipeline), Phase 2 (Roadmap Timeline Views)  
**Date**: 2025-01-11

---

## Executive Summary

Phase 3 implements **Track & Subtrack Workspaces** as the exclusive mutation surface for domain work. Workspaces are the single source of truth for track/subtrack content, objectives, documents, research, time planning, and financials. The Roadmap (Phase 2) remains a read-only projection layer that visualizes workspace data.

**Core Principle**: **Roadmap = Read-Only Visualization | Workspace = Mutation Surface**

---

## 1. Architectural Boundaries

### 1.1 Responsibility Model

#### Roadmap (Phase 2 - LOCKED)
**Purpose**: Read-only timeline visualization

**Owns**:
- ✅ Timeline rendering (Day/Week/Month views)
- ✅ Bucket aggregation and drill-down
- ✅ Visual hierarchy (Tracks → Subtracks → Items)
- ✅ UI state (collapse, highlight, view mode)
- ✅ Empty state handling

**MUST NOT**:
- ❌ Mutate domain data
- ❌ Query Supabase directly
- ❌ Create/edit/delete tracks, subtracks, or items
- ❌ Own workspace functionality

#### Workspaces (Phase 3 - NEW)
**Purpose**: Exclusive mutation surface for domain work

**Owns**:
- ✅ **Track/Subtrack creation and editing**
- ✅ **Objective management** (`universal_track_info.objective`)
- ✅ **Definition of Done** (`universal_track_info.definition_of_done`)
- ✅ **Time planning** (`universal_track_info.time_mode`, `start_date`, `end_date`, `target_date`)
- ✅ **Track category** (`universal_track_info.track_category_id`)
- ✅ **Subtrack category** (`guardrails_subtracks.subtrack_category_id`)
- ✅ **Document management** (new table: `track_documents`)
- ✅ **Research notes** (new table: `track_research_notes`)
- ✅ **Financial tracking** (new table: `track_financials`)
- ✅ **Roadmap item creation** (delegates to `roadmapService`, but UI lives in workspace)

**MUST NOT**:
- ❌ Render timeline views (Roadmap owns this)
- ❌ Handle bucket aggregation
- ❌ Manage global roadmap UI state

**Boundary Contract**:
- Workspaces **may** create roadmap items (via `roadmapService`)
- Roadmap **consumes** workspace data via `useRoadmapProjection`
- Workspaces **mutate** track/subtrack data directly
- Roadmap **reads** track/subtrack data via projection

### 1.2 Data Flow

```
┌─────────────────┐
│   Workspace     │ (Phase 3)
│   (Mutation)    │
└────────┬────────┘
         │ creates/updates
         ▼
┌─────────────────┐
│  Supabase DB    │
│  (Domain Data)  │
└────────┬────────┘
         │
         │ projection reads
         ▼
┌─────────────────┐
│   Roadmap       │ (Phase 2)
│  (Read-Only)    │
└─────────────────┘
```

**Key Insight**: Workspace is the **authoritative source**. Roadmap is a **derived view**.

---

## 2. Workspace Routing Structure

### 2.1 URL Patterns

```
/guardrails/project/:projectId/workspace/track/:trackId
/guardrails/project/:projectId/workspace/track/:trackId/subtrack/:subtrackId
```

**Route Hierarchy**:
- **Track Workspace**: `/guardrails/project/{projectId}/workspace/track/{trackId}`
- **Subtrack Workspace**: `/guardrails/project/{projectId}/workspace/track/{parentTrackId}/subtrack/{subtrackId}`

**Note**: Subtracks are accessed via nested route under parent track. This maintains hierarchy while allowing independent workspace access.

### 2.2 Navigation Patterns

#### From Roadmap to Workspace:
- Click track/subtrack name → Navigate to workspace
- Click "View in workspace" from bucket bottom sheet → Navigate to workspace
- Roadmap item click → Navigate to owning track/subtrack workspace

#### From Workspace:
- Breadcrumb navigation: `Project > Track Name > (Subtrack Name)`
- Back button → Returns to Roadmap or previous page
- Sibling navigation (optional Phase 3.1): Navigate between tracks/subtracks

#### Workspace-to-Workspace:
- Subtrack workspace shows parent track context
- Parent track workspace shows subtrack list/links
- Navigation preserved in history stack

---

## 3. Micro-App Architecture

Each workspace is composed of **micro-apps** (tabbed sections) that organize domain work:

### 3.1 Core Micro-Apps

#### 3.1.1 Overview
**Purpose**: High-level track/subtrack summary and quick actions

**Content**:
- Track/Subtrack name, description, color
- Objective (from `universal_track_info.objective`)
- Definition of Done (from `universal_track_info.definition_of_done`)
- Time intent summary (from `universal_track_info.time_mode`, dates)
- Track category badge
- Subtrack category badge (subtracks only)
- Quick stats (document count, research note count, financial total)
- Recent activity feed (optional Phase 3.1)

**Actions**:
- Edit track/subtrack metadata
- Update objective
- Update Definition of Done
- Update time intent
- Change category

#### 3.1.2 Objectives
**Purpose**: Detailed objective management

**Content**:
- Full objective text (editable)
- Objective history (optional Phase 3.1)
- Related objectives (cross-track links, optional Phase 3.2)

**Data Source**: `universal_track_info.objective`

**Actions**:
- Edit objective
- View/edit Definition of Done
- Link related objectives (optional Phase 3.2)

#### 3.1.3 Documents
**Purpose**: Document repository for track/subtrack

**Content**:
- Document list (grid/list view toggle)
- Document metadata (title, type, upload date, size)
- Document preview (optional Phase 3.1)
- Document tags/categories

**Data Source**: `track_documents` (new table)

**Actions**:
- Upload documents
- Delete documents
- Edit document metadata
- Download documents
- Organize documents (folders, optional Phase 3.2)

**Table Schema** (to be created):
```sql
CREATE TABLE track_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  -- NULL subtrack_id means document belongs to parent track
  title text NOT NULL,
  file_path text NOT NULL, -- Storage path (Supabase Storage)
  file_type text, -- MIME type
  file_size bigint, -- bytes
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb, -- Flexible metadata (tags, categories, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 3.1.4 Research
**Purpose**: Research notes and findings

**Content**:
- Research note list (chronological or categorized)
- Note content (rich text, markdown, or structured fields)
- Note tags/categories
- Source links
- Research timeline

**Data Source**: `track_research_notes` (new table)

**Actions**:
- Create research notes
- Edit research notes
- Delete research notes
- Organize notes (tags, categories)
- Link notes to documents
- Link notes to roadmap items (optional Phase 3.1)

**Table Schema** (to be created):
```sql
CREATE TABLE track_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  -- NULL subtrack_id means note belongs to parent track
  title text NOT NULL,
  content text, -- Rich text or markdown
  source_urls text[], -- Array of URLs
  tags text[], -- Array of tags
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 3.1.5 Time Planning
**Purpose**: Time intent and scheduling

**Content**:
- Time mode selector (Unscheduled / Target date / Date range / Ongoing)
- Date inputs (conditional based on mode)
- Time breakdown (optional Phase 3.1: time estimates per activity)
- Calendar integration preview (optional Phase 3.2)

**Data Source**: `universal_track_info.time_mode`, `start_date`, `end_date`, `target_date`

**Actions**:
- Update time mode
- Set dates
- Clear dates
- View in calendar (optional Phase 3.2)

#### 3.1.6 Financials
**Purpose**: Budget and expense tracking

**Content**:
- Budget overview (total budget, spent, remaining)
- Expense list (chronological)
- Expense categories
- Budget vs actual chart (optional Phase 3.1)

**Data Source**: `track_financials` (new table)

**Actions**:
- Set budget
- Add expenses
- Edit expenses
- Delete expenses
- Categorize expenses
- Export financial data (optional Phase 3.1)

**Table Schema** (to be created):
```sql
CREATE TABLE track_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  -- NULL subtrack_id means financial belongs to parent track
  budget_amount numeric(12, 2), -- NULL = no budget set
  currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, subtrack_id) -- One budget per track/subtrack
);

CREATE TABLE track_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_id uuid NOT NULL REFERENCES track_financials(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text DEFAULT 'USD',
  description text NOT NULL,
  category text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 3.1.7 Roadmap Items
**Purpose**: Create and manage roadmap items for this track/subtrack

**Content**:
- Roadmap item list (filtered by track/subtrack)
- Item creation form
- Item editing
- Item deletion

**Data Source**: `roadmap_items` (via `roadmapService`)

**Actions**:
- Create roadmap items
- Edit roadmap items
- Delete roadmap items
- Filter items by type/status
- View items in roadmap (navigate to roadmap view)

**Note**: This micro-app **delegates** to `roadmapService` but provides the UI for item management within the workspace context.

---

### 3.2 Micro-App Tab Structure

**Mobile**:
- Bottom tab navigation (Overview, Documents, Research, Time, Financials, Roadmap Items)
- Overview is default tab
- Tabs scroll horizontally if needed

**Desktop**:
- Side tab navigation (vertical list)
- Overview is default tab
- Tabs can be collapsed to icons only

**Tab Order** (can be customized in Phase 3.1):
1. Overview
2. Objectives
3. Documents
4. Research
5. Time Planning
6. Financials
7. Roadmap Items

---

## 4. Data Ownership & Supabase Table Mapping

### 4.1 Existing Tables (Phase 0-2)

| Table | Owned By | Workspace Access |
|-------|----------|------------------|
| `guardrails_tracks` | Domain | ✅ Read/Write (name, description, color, category) |
| `guardrails_track_instances` | Domain | ✅ Read/Write (visibility, order) |
| `universal_track_info` | Workspace | ✅ Read/Write (objective, definition_of_done, time_mode, dates, track_category_id) |
| `project_track_categories` | Domain | ✅ Read only (workspace displays category) |
| `subtrack_categories` | Domain | ✅ Read only (workspace displays category) |
| `guardrails_subtracks` | Domain | ✅ Read/Write (subtrack_category_id) |
| `roadmap_items` | Roadmap Service | ✅ Read/Write (workspace creates items, but service owns schema) |

### 4.2 New Tables (Phase 3)

| Table | Purpose | Ownership |
|-------|---------|-----------|
| `track_documents` | Document repository | Workspace (exclusive) |
| `track_research_notes` | Research notes | Workspace (exclusive) |
| `track_financials` | Budget tracking | Workspace (exclusive) |
| `track_expenses` | Expense tracking | Workspace (exclusive) |

### 4.3 Data Access Patterns

**Workspace Reads**:
- Use existing services (`getTracksForProject`, `getUniversalTrackInfo`, etc.)
- New services for new tables (`getTrackDocuments`, `getTrackResearchNotes`, etc.)

**Workspace Writes**:
- Direct Supabase mutations via service layer
- All mutations go through service functions (no direct client access)

**Roadmap Reads** (unchanged):
- Via `useRoadmapProjection` only
- No direct workspace data access

---

## 5. UI Shell Design

### 5.1 Mobile-First Workspace Layout

```
┌─────────────────────────┐
│ Header                  │
│ [← Back] Track Name     │
│ (Breadcrumb if subtrack)│
├─────────────────────────┤
│                         │
│   Tab Content Area      │
│   (Scrollable)          │
│                         │
│                         │
├─────────────────────────┤
│ Tab Navigation (Bottom) │
│ [Overview] [Docs] [...] │
└─────────────────────────┘
```

**Header**:
- Back button (returns to roadmap or previous page)
- Track/subtrack name (editable inline or via menu)
- Actions menu (Edit, Delete, Share - optional Phase 3.2)

**Tab Navigation**:
- Bottom tabs on mobile (iOS/Android native pattern)
- Icons + labels
- Active tab indicator
- Badge indicators (optional: unread count, new items)

**Content Area**:
- Full-width, scrollable
- Padding: 16px mobile, 24px desktop
- Cards/sections with clear visual hierarchy

### 5.2 Desktop Workspace Layout

```
┌──────┬────────────────────────────┐
│      │ Header                     │
│      │ [← Back] Track Name        │
│ Tab  ├────────────────────────────┤
│ List │                            │
│      │   Tab Content Area         │
│ [📋] │   (Scrollable)             │
│ [📄] │                            │
│ [🔍] │                            │
│ [⏰] │                            │
│ [💰] │                            │
│ [🗓️] │                            │
│      │                            │
└──────┴────────────────────────────┘
```

**Sidebar** (tabs):
- Width: 200px (expanded) / 64px (collapsed)
- Vertical list of tabs
- Icons + labels (collapsed: icons only)
- Active tab highlighted

**Content Area**:
- Remaining width
- Max-width: 1200px (centered)
- Padding: 24px

### 5.3 Responsive Breakpoints

- **Mobile**: < 768px (bottom tabs)
- **Tablet**: 768px - 1024px (side tabs, narrower)
- **Desktop**: > 1024px (side tabs, full width)

---

## 6. Phase 3 Implementation Plan

### Phase 3.0: Foundation & Routing (Week 1)

**Objectives**:
- Set up workspace routing structure
- Create workspace shell component
- Implement basic navigation

**Tasks**:
1. Add workspace routes to router
   - `/guardrails/project/:projectId/workspace/track/:trackId`
   - `/guardrails/project/:projectId/workspace/track/:trackId/subtrack/:subtrackId`
2. Create `WorkspaceShell` component (mobile-first)
   - Header with back button and track name
   - Tab navigation (bottom on mobile, side on desktop)
   - Content area with tab routing
3. Create `TrackWorkspace` component
   - Consumes track data via service
   - Renders `WorkspaceShell` with track context
4. Create `SubtrackWorkspace` component
   - Consumes subtrack data via service
   - Renders `WorkspaceShell` with subtrack + parent context
5. Update Roadmap navigation
   - Track/subtrack name clicks navigate to workspace
   - Bucket bottom sheet "View in workspace" links

**Deliverables**:
- ✅ Workspace routes functional
- ✅ Basic workspace shell renders
- ✅ Navigation from roadmap to workspace works
- ✅ Back navigation works

---

### Phase 3.1: Overview Micro-App (Week 2)

**Objectives**:
- Implement Overview tab
- Integrate with existing `universal_track_info` data
- Enable basic track/subtrack editing

**Tasks**:
1. Create `WorkspaceOverview` component
   - Display track/subtrack metadata
   - Display objective (from `universal_track_info`)
   - Display Definition of Done
   - Display time intent summary
   - Display category badges
2. Create `WorkspaceEditForm` component
   - Edit track/subtrack name, description, color
   - Edit objective
   - Edit Definition of Done
   - Edit time intent (mode + dates)
   - Change category (reuse wizard category selector)
3. Integrate with existing services
   - `getUniversalTrackInfo`
   - `saveUniversalTrackInfo`
   - `updateTrack`
   - `getProjectTrackCategories`
4. Add edit mode toggle
   - Inline editing or modal (TBD based on UX testing)

**Deliverables**:
- ✅ Overview tab displays all track/subtrack data
- ✅ Editing works for all fields
- ✅ Data persists to Supabase
- ✅ Roadmap updates after workspace edits (via projection refresh)

---

### Phase 3.2: Objectives Micro-App (Week 2-3)

**Objectives**:
- Dedicated Objectives tab
- Rich text editing for objectives
- Definition of Done management

**Tasks**:
1. Create `WorkspaceObjectives` component
   - Full objective text editor
   - Definition of Done editor
   - Save/cancel actions
2. Implement rich text editor (optional)
   - Markdown support or WYSIWYG
   - Or keep simple textarea for MVP
3. Add objective history (optional, defer if needed)
   - Track objective changes over time
   - Display version history

**Deliverables**:
- ✅ Objectives tab functional
- ✅ Objective editing works
- ✅ Definition of Done editing works
- ✅ Data syncs with Overview tab

---

### Phase 3.3: Documents Micro-App (Week 3-4)

**Objectives**:
- Document upload and management
- Document list view
- Document metadata editing

**Tasks**:
1. Create database migration
   - `track_documents` table
   - RLS policies
   - Indexes
2. Create document service
   - `getTrackDocuments(trackId, subtrackId?)`
   - `uploadTrackDocument(...)`
   - `deleteTrackDocument(id)`
   - `updateTrackDocument(id, metadata)`
3. Integrate Supabase Storage
   - Set up storage bucket for track documents
   - Generate signed URLs for downloads
4. Create `WorkspaceDocuments` component
   - Document list (grid/list toggle)
   - Upload UI (drag-drop or file picker)
   - Document metadata editing
   - Delete confirmation
5. Add document preview (optional, Phase 3.3.1)
   - PDF preview
   - Image preview
   - Text preview

**Deliverables**:
- ✅ Documents table created
- ✅ Document upload works
- ✅ Document list displays
- ✅ Document deletion works
- ✅ Documents organized by track/subtrack

---

### Phase 3.4: Research Micro-App (Week 4-5)

**Objectives**:
- Research note creation and editing
- Note organization (tags, categories)
- Source link management

**Tasks**:
1. Create database migration
   - `track_research_notes` table
   - RLS policies
   - Indexes
2. Create research service
   - `getTrackResearchNotes(trackId, subtrackId?)`
   - `createResearchNote(...)`
   - `updateResearchNote(id, ...)`
   - `deleteResearchNote(id)`
3. Create `WorkspaceResearch` component
   - Note list (chronological or categorized)
   - Note editor (markdown or rich text)
   - Tag input
   - Source URL input
   - Note creation/edit forms
4. Add note organization (optional)
   - Tag filtering
   - Category grouping
   - Search

**Deliverables**:
- ✅ Research notes table created
- ✅ Note creation works
- ✅ Note editing works
- ✅ Note deletion works
- ✅ Tags and source URLs work

---

### Phase 3.5: Time Planning Micro-App (Week 5)

**Objectives**:
- Time intent editing UI
- Date picker integration
- Time mode switching

**Tasks**:
1. Create `WorkspaceTimePlanning` component
   - Time mode selector (radio buttons)
   - Conditional date inputs
   - Date range picker
   - Target date picker
2. Integrate with existing `universal_track_info` fields
   - `time_mode`, `start_date`, `end_date`, `target_date`
3. Add validation
   - Date range: end >= start
   - Required fields based on mode
4. Add calendar preview (optional, Phase 3.5.1)
   - Show track/subtrack on calendar
   - Link to calendar integration

**Deliverables**:
- ✅ Time Planning tab functional
- ✅ Time mode selection works
- ✅ Date inputs work correctly
- ✅ Data syncs with Overview tab
- ✅ Validation prevents invalid dates

---

### Phase 3.6: Financials Micro-App (Week 6)

**Objectives**:
- Budget setting
- Expense tracking
- Financial overview

**Tasks**:
1. Create database migrations
   - `track_financials` table
   - `track_expenses` table
   - RLS policies
   - Indexes
2. Create financial service
   - `getTrackFinancials(trackId, subtrackId?)`
   - `setTrackBudget(trackId, subtrackId?, amount, currency)`
   - `createExpense(financialId, ...)`
   - `updateExpense(id, ...)`
   - `deleteExpense(id)`
   - `getTrackExpenses(financialId)`
3. Create `WorkspaceFinancials` component
   - Budget overview (total, spent, remaining)
   - Expense list (chronological)
   - Expense creation form
   - Expense editing
   - Expense deletion
   - Category selection
4. Add financial chart (optional, Phase 3.6.1)
   - Budget vs actual
   - Spending over time
   - Category breakdown

**Deliverables**:
- ✅ Financials tables created
- ✅ Budget setting works
- ✅ Expense creation works
- ✅ Expense editing works
- ✅ Expense deletion works
- ✅ Budget overview displays correctly

---

### Phase 3.7: Roadmap Items Micro-App (Week 7)

**Objectives**:
- Roadmap item creation within workspace
- Roadmap item list (filtered by track/subtrack)
- Roadmap item editing
- Link back to roadmap view

**Tasks**:
1. Create `WorkspaceRoadmapItems` component
   - Item list (filtered by track/subtrack)
   - Item creation form (reuse existing `CreateRoadmapItemSheet`)
   - Item editing (reuse existing edit flow)
   - Item deletion
   - Filter by type/status
2. Integrate with existing `roadmapService`
   - `createRoadmapItem`
   - `updateRoadmapItem`
   - `deleteRoadmapItem`
   - `getRoadmapItemsByTrack`
3. Add navigation to roadmap
   - "View in Roadmap" button
   - Navigate to roadmap with track/subtrack focused
4. Add item count badges
   - Show item count in tab badge
   - Show by-status counts in overview

**Deliverables**:
- ✅ Roadmap Items tab functional
- ✅ Item creation works
- ✅ Item editing works
- ✅ Item deletion works
- ✅ Items filtered by track/subtrack
- ✅ Navigation to roadmap works

---

### Phase 3.8: Polish & Integration (Week 8)

**Objectives**:
- Mobile UX refinements
- Desktop layout optimization
- Integration testing
- Performance optimization

**Tasks**:
1. Mobile UX improvements
   - Touch targets (minimum 44x44px)
   - Swipe gestures (optional)
   - Loading states
   - Error states
   - Empty states
2. Desktop layout optimization
   - Responsive breakpoints
   - Tab sidebar behavior
   - Content width constraints
3. Integration testing
   - Workspace → Roadmap data flow
   - Roadmap → Workspace navigation
   - Edit → Save → Refresh cycle
4. Performance optimization
   - Lazy loading for tabs
   - Image optimization for documents
   - List virtualization for long lists
5. Documentation
   - Workspace usage guide
   - Developer documentation
   - API documentation (service layer)

**Deliverables**:
- ✅ Mobile UX is polished
- ✅ Desktop layout is optimized
- ✅ Integration works seamlessly
- ✅ Performance is acceptable
- ✅ Documentation is complete

---

## 7. Explicitly Excluded from Phase 3

### Daily View
- **Status**: Deferred to Phase 4+
- **Reason**: Requires workspace awareness and task-level intent
- **Note**: Daily View will consume workspace data but is not part of workspace implementation

### Collaboration / Permissions
- **Status**: Deferred to Phase 4+
- **Reason**: Single-user focus for Phase 3
- **Note**: All workspace data is user-scoped for now

### Real-time Features
- **Status**: Deferred to Phase 4+
- **Reason**: Not required for MVP
- **Note**: Workspace updates trigger projection refresh, but no real-time sync

### Workspace-to-Workspace Collaboration
- **Status**: Deferred to Phase 4+
- **Reason**: Single-user focus
- **Note**: Workspaces are private to the track/subtrack owner

---

## 8. Success Criteria

Phase 3 is complete when:

✅ **Workspace routing structure is functional**
- Track workspaces accessible via URL
- Subtrack workspaces accessible via nested URL
- Navigation from roadmap to workspace works
- Back navigation works

✅ **All micro-apps are implemented**
- Overview tab functional
- Objectives tab functional
- Documents tab functional
- Research tab functional
- Time Planning tab functional
- Financials tab functional
- Roadmap Items tab functional

✅ **Data persistence works**
- All workspace edits persist to Supabase
- Roadmap reflects workspace changes (via projection refresh)
- No data loss on navigation

✅ **Mobile UX is acceptable**
- Bottom tabs work on mobile
- Touch targets are appropriate
- Forms are usable on mobile
- Performance is acceptable

✅ **Desktop UX is acceptable**
- Side tabs work on desktop
- Layout is responsive
- Content width is appropriate
- Performance is acceptable

✅ **Integration with Phase 0-2 is seamless**
- Workspace mutations update roadmap correctly
- Roadmap navigation to workspace works
- No breaking changes to existing architecture

---

## 9. Risk Mitigation

### Risk: Workspace data not syncing with Roadmap
**Mitigation**: 
- Use projection refresh after workspace mutations
- Test integration thoroughly in Phase 3.8
- Add error handling and user feedback

### Risk: Performance issues with large document/research lists
**Mitigation**:
- Implement list virtualization
- Add pagination if needed
- Lazy load tab content

### Risk: Mobile UX is cramped
**Mitigation**:
- Mobile-first design approach
- Test on real devices early
- Iterate on UX based on feedback

### Risk: Database schema changes break existing code
**Mitigation**:
- Incremental migrations
- Test migrations on dev database
- Backward compatibility where possible

---

## 10. Future Enhancements (Post-Phase 3)

### Phase 3.1: Advanced Features
- Document preview
- Research note linking
- Financial charts
- Objective history

### Phase 4: Collaboration
- Multi-user workspaces
- Permissions system
- Real-time updates
- Activity feeds

### Phase 5: Daily View
- Workspace-aware daily view
- Task-level intent
- Contextual density rules

---

## Appendix: Service Layer Structure

### New Services (Phase 3)

```
src/lib/guardrails/workspace/
├── workspaceService.ts          # Main workspace service (routing, context)
├── documentService.ts            # Document CRUD
├── researchService.ts            # Research note CRUD
├── financialService.ts           # Financial/budget CRUD
└── workspaceTypes.ts             # Workspace-specific types
```

### Existing Services (Reused)

```
src/lib/guardrails/
├── universalTrackInfo.ts         # Objective, Definition of Done, Time Planning
├── trackCategories.ts            # Category management
├── subtrackCategories.ts         # Subtrack category management
├── roadmapService.ts             # Roadmap item CRUD (used by workspace)
└── tracks.ts                     # Track/subtrack CRUD
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-11  
**Next Review**: After Phase 3.0 completion
