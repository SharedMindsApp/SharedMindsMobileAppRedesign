# SharedMinds Current-State Architecture Summary (As Implemented)

**Document Purpose**: This document describes the system as it exists today in the codebase, based on migrations, services, and implementation files. No future features or proposed designs are included.

**Last Updated**: 2025-12-14

---

## 1. High-Level Modules

### A. Guardrails (Project Management System)
The primary project tracking and execution system. Guardrails owns:
- **Projects & Domains**: Master projects organized by life domains (work, personal, creative, health)
- **Roadmap**: Timeline-based planning with hierarchical items, tracks, and sections
- **Task Flow**: Kanban-style task board synchronized with roadmap items
- **Mind Mesh**: Graph-based ideation and relationship visualization
- **Focus Mode**: Time-boxed work sessions with drift detection and analytics
- **Regulation Engine**: Constraint-based intervention system for focus and productivity
- **Side Projects & Offshoots**: Capture mechanisms for diversions and new ideas
- **Reality Check**: Feasibility assessment for projects (skills, tools, time)
- **People & Assignments**: Project team management and task assignment

### B. Spaces (Widget-Based Personal/Shared Canvases)
A widget-based system for personal and household organization. Spaces owns:
- **Personal Spaces**: Private widget canvases for individual users
- **Shared Spaces**: Collaborative widget canvases for households/teams
- **Fridge Board**: Legacy grid-based widget layout system
- **Fridge Canvas**: Infinite canvas implementation with groups and micro-widgets
- **Widget Types**: 14+ widget types (calendar, tasks, goals, habits, notes, meals, etc.)
- **Widget Layouts**: Positioning, sizing, grouping, and z-index management
- **Household System**: Multi-user households with member roles and permissions

### C. Household Module
Manages household-level features:
- **Household Profiles**: Core household metadata and settings
- **Household Members**: User membership and role management
- **Household Calendar**: Shared calendar events across household
- **Meal Planning**: Shared meal library, diet profiles, recipe management
- **Household Insights**: Compatibility matching and insights between members

### D. Professional Access System
Allows professionals (therapists, coaches) to access client households:
- **Professional Profiles**: Extended user profiles for professionals
- **Access Requests**: Request/grant workflow for household access
- **Scoped Visibility**: Read-only or limited write access to client data

### E. AI Assistant System
Multi-feature AI integration with provider routing:
- **AI Chat**: Conversational interface across multiple surfaces (personal, project, household)
- **AI Drafts**: Generated content that can be applied to Guardrails structures
- **AI Roadmap Generator**: Automated roadmap creation from project descriptions
- **Provider Registry**: OpenAI and Anthropic adapter system with routing logic
- **Context Assembly**: Builds project/track/item context for AI prompts
- **Usage Controls**: Rate limiting and feature-specific model routing

### F. Shared Services
Cross-cutting concerns:
- **Authentication**: Supabase Auth with email/password, OAuth support
- **Profiles**: User profiles with neurotype preferences and brain profiles
- **Encryption**: End-to-end encryption for messages (WebCrypto + key exchange)
- **Brain Profiles**: Neurodivergent-friendly UI customization (ADHD, ASD, etc.)
- **Individual Profiles**: 10-question assessment for personalized insights
- **Feature Unlocks**: Progressive disclosure journey for features
- **Messaging**: Encrypted 1:1 and group messaging between household members

---

## 2. Data Model Summary

### Core Entity Relationships

```
users (auth.users)
  └─> profiles
       ├─> household_members
       │    └─> households
       ├─> domains
       │    └─> master_projects
       │         ├─> roadmap_sections
       │         │    └─> roadmap_items (hierarchical)
       │         ├─> side_projects
       │         ├─> offshoot_ideas
       │         ├─> guardrails_tracks_v2 (hierarchical)
       │         ├─> guardrails_nodes (Mind Mesh)
       │         ├─> focus_sessions
       │         ├─> project_people
       │         └─> taskflow_tasks
       ├─> spaces
       │    ├─> space_members
       │    └─> fridge_widgets
       │         ├─> fridge_widget_layouts
       │         └─> fridge_groups
       └─> conversations
            └─> messages
```

### Key Tables and Their Purpose

#### Guardrails Domain

**master_projects**
- One per domain per user (enforced constraint)
- Core project metadata: name, description, type, status
- Links to: domains, project_types, tracks, roadmap sections
- Archival support: `archived_at`, `abandoned_at`

**domains**
- Life context categories: work, personal, creative, health
- User-scoped, determines project organization
- Has display order for UI presentation

**roadmap_sections**
- Organizational containers within a project
- Each project has multiple sections
- Each section contains roadmap_items

**roadmap_items**
- Timeline items with hierarchy (max depth: 2)
- 10 types: task, event, note, document, milestone, goal, photo, grocery_list, habit, review
- Status: not_started, in_progress, completed, blocked, on_hold, archived
- Scheduling: `start_date`, `end_date` (both optional)
- Hierarchy: `parent_item_id`, `item_depth`
- Type-specific metadata stored in JSONB `metadata` column
- Links to: sections, tracks, subtracks, parent items

**guardrails_tracks_v2**
- Hierarchical track system (parent_track_id for nesting)
- Can be shared across projects (`is_shared` flag)
- Organizes roadmap items into workstreams
- Has color, order_index for visualization

**taskflow_tasks**
- Execution view derived from roadmap items
- Syncs from roadmap items of type: task, habit, goal
- Can exist standalone (without roadmap linkage)
- Status independent from roadmap status
- Unique constraint: one task per roadmap_item_id

**guardrails_nodes** (Mind Mesh)
- Graph nodes with positioning (x, y, width, height)
- Types: idea, task, note, offshoot, group
- Can reference external entities: `source_type`, `source_id`
- Auto-generated flag for system-created nodes

**guardrails_node_links** (Mind Mesh)
- Graph edges connecting nodes
- Edge types: dependency, supporting, reference, offshoot, hierarchy, ideation, influence, derivation
- Direction: directed or undirected
- Auto-generated flag for system-created links

**side_projects**
- Alternative project explorations within master project context
- Limited scope: max 5 tasks per side project
- Can be archived or promoted to master projects
- Drift tracking links to focus system

**offshoot_ideas**
- Lightweight idea capture during work
- Types: exploration, idea_only, feature_request
- Can be promoted to side_projects or roadmap_items
- Linked to originating task for context

**focus_sessions**
- Time-boxed work sessions on specific projects
- Tracks: start/end time, intended vs actual duration, focus score
- Drift and distraction counters
- Status: active, paused, completed, cancelled

**focus_events**
- Event log for focus sessions
- Event types: start, pause, resume, end, drift, return, distraction, nudge_soft, nudge_hard
- JSONB metadata for event-specific data

**regulation_state**
- Per-user, per-project regulation tracking
- Metrics: drift_events_last_7d, side_project_switches_7d, offshoot_creation_rate_7d
- Drives intervention logic

#### Spaces Domain

**spaces**
- Personal or shared widget canvases
- Types: 'personal', 'shared', 'household'
- Visibility: 'private', 'public_read', 'public_edit'
- Links to households for household spaces

**space_members**
- User membership in spaces
- Roles: owner, member
- Status: pending, active

**fridge_widgets**
- Individual widgets on spaces
- 14 types: note, task, calendar, goal, habit, photo, insight, reminder, agreement, custom, meal_planner, grocery_list, habit_tracker, achievements
- Visibility scope: 'all', 'restricted', 'private'
- Soft delete: `deleted_at` column
- Content stored in JSONB `content` column

**fridge_widget_layouts**
- Positioning for widgets: x, y coordinates
- Size mode: 'icon', 'mini', 'full'
- Z-index for layering
- Rotation and collapse state

**fridge_groups**
- Visual grouping of widgets
- Has label, color, position, size
- Members tracked via widget.group_id

#### Household Domain

**households**
- Multi-user household profiles
- Subscription model (tier: free, basic, premium)
- Created automatically on first user signup

**household_members**
- Links users to households
- Roles: member, admin, owner, professional
- Status: pending, active

**household_calendar_events**
- Shared calendar events for household
- Standard event fields: title, description, start/end times
- Visibility and creator tracking

**diet_profiles**
- Per-household-member dietary restrictions/preferences
- Restrictions, allergies, preferences as arrays
- Used for meal planning filtering

**meal_library**
- Household recipe collection
- Can be predefined or user-created
- Filtering by diet profiles
- Vote tracking for popularity

**meal_plans**
- Weekly meal planning
- Links meals to dates and meal types (breakfast, lunch, dinner, snack)

#### AI System

**ai_providers**
- Registry of AI providers: OpenAI, Anthropic
- Configuration: base URLs, capabilities
- Enable/disable flags

**ai_provider_models**
- Specific models: gpt-4o, gpt-4o-mini, claude-3-5-sonnet, etc.
- Capabilities: text_generation, function_calling, vision
- Context window and max tokens
- Pricing information

**ai_feature_routes**
- Routes features to specific models
- Feature keys: ai_chat, draft_generation, project_summary, spaces_meal_planner
- Surface types: personal, project, household (optional)
- Priority-based routing with fallback support
- Project-specific overrides via master_project_id

**ai_conversations**
- Chat conversation threads
- Surface types: personal, project, household, offshoot, side_project
- Auto-naming via AI
- Title and context tracking

**ai_messages**
- Individual messages in conversations
- Role: user, assistant, system
- Content and model tracking
- Parent message for threading

**ai_drafts**
- AI-generated content pending application
- Draft types: roadmap_structure, track_structure, items_batch, etc.
- Status: pending, applied, rejected, partially_applied
- Safety flags: needs_review, has_warnings

#### Messaging System

**conversations**
- Encrypted message threads
- 1:1 or group conversations
- Household-scoped
- Stores encrypted group key for members

**conversation_participants**
- User membership in conversations
- Stores per-user encrypted conversation keys
- Tracks last read timestamp

**messages**
- Encrypted message content
- Stores ciphertext and IV
- Delivery and read receipts
- Supports reactions

**message_reactions**
- Emoji reactions to messages
- One reaction per user per message

### Scoping and Ownership

**User-Scoped**
- profiles
- domains
- master_projects (via domains)
- focus_sessions
- regulation_state
- brain_profiles
- individual_profiles

**Household-Scoped**
- households
- household_members
- household_calendar_events
- diet_profiles
- meal_library
- meal_plans
- conversations
- messages

**Project-Scoped**
- roadmap_sections
- roadmap_items
- guardrails_tracks_v2
- taskflow_tasks
- guardrails_nodes
- guardrails_node_links
- side_projects
- offshoot_ideas
- project_people

**Space-Scoped**
- spaces
- space_members
- fridge_widgets
- fridge_widget_layouts
- fridge_groups

### Foreign Key Relationships

**Critical Cascades**
- `master_projects.domain_id` → `domains.id` (ON DELETE CASCADE)
- `roadmap_sections.master_project_id` → `master_projects.id` (ON DELETE CASCADE)
- `roadmap_items.section_id` → `roadmap_sections.id` (ON DELETE CASCADE)
- `taskflow_tasks.master_project_id` → `master_projects.id` (ON DELETE CASCADE)
- `fridge_widgets.space_id` → `spaces.id` (ON DELETE CASCADE)
- `messages.conversation_id` → `conversations.id` (ON DELETE CASCADE)

**Orphaning Behavior**
- Deleting a master_project cascades to all roadmap data, tracks, nodes, tasks
- Deleting a household keeps members but revokes access
- Deleting a space removes all widgets and layouts
- Soft delete preferred for widgets (`deleted_at`) to preserve history

---

## 3. Source of Truth & Authority Boundaries

### Roadmap System is Authoritative For:
- **Timeline Planning**: `roadmap_items` table is the single source of truth
- **Item Hierarchy**: Parent-child relationships via `parent_item_id`
- **Scheduling**: `start_date`, `end_date` determine timeline placement
- **Status**: Item status drives UI representation and filtering

**Derived Systems (Read-Only Projections)**
- Task Flow syncs FROM roadmap items (one-way)
- Mind Mesh can reference roadmap items but doesn't mutate them
- Spaces widgets can link to roadmap items but are separate copies

### Track System is Authoritative For:
- **Track Definitions**: `guardrails_tracks_v2` defines all tracks
- **Track Hierarchy**: Parent-child via `parent_track_id`
- **Shared Tracks**: `is_shared` flag determines cross-project availability

**Consumption Points**
- Roadmap items reference tracks via `track_id`
- Mind Mesh auto-generates nodes from tracks
- Track selector UI reads track hierarchy

### Spaces is Authoritative For:
- **Widget Content**: `fridge_widgets.content` JSONB is the source of truth
- **Layout**: `fridge_widget_layouts` defines positioning
- **Groups**: `fridge_groups` defines visual grouping

**Sync Behavior**
- Items can be "sent" to spaces, creating independent widget copies
- Changes to widgets do NOT sync back to Guardrails
- "Linked" sync mode exists but implementation unclear (appears unfinished)

### Focus System is Authoritative For:
- **Session State**: `focus_sessions` tracks all work sessions
- **Drift Detection**: `focus_drift_log` records all drift events
- **Regulation Metrics**: `regulation_state` aggregates behavior patterns

**Consumption Points**
- Analytics dashboards read from focus tables
- Regulation engine triggers based on metrics
- Project context shown in focus UI

### AI System is Authoritative For:
- **Conversation History**: `ai_conversations` and `ai_messages`
- **Routing Decisions**: `ai_feature_routes` determines model selection
- **Draft Content**: `ai_drafts` stores generated content

**Application Boundaries**
- Drafts can be applied to Guardrails, creating roadmap_items
- Drafts do NOT auto-apply; user must explicitly accept
- AI reads project context but never mutates directly

### Household System is Authoritative For:
- **Membership**: `household_members` defines who belongs
- **Shared Calendar**: `household_calendar_events`
- **Meal Plans**: `meal_plans` and `meal_library`

**Visibility Rules**
- Household members see shared spaces automatically
- Personal spaces remain private unless explicitly shared
- Professional access grants read-only to household data

---

## 4. Critical Invariants ("Don't Break These")

### Roadmap Invariants

1. **Maximum Item Depth = 2**
   - Enforced in `roadmapItemCompositionRules.ts`
   - Track → Item → Child Item (no deeper)
   - Violation check: `item_depth > 2` prevented

2. **No Circular References**
   - Cannot set `parent_item_id` to self or descendant
   - Validation in `roadmapCompositionService.ts`

3. **Parent-Child Type Compatibility**
   - Strict matrix of allowed parent-child combinations
   - Example: "task" can contain "note" or "document" but not "event"
   - Enforced via `validateComposition()` checks

4. **Section Integrity**
   - Parent and child must be in same section
   - Parent and child must be in same project
   - Enforced at composition attachment time

5. **Timeline Eligibility Rules**
   - Only top-level items (parent_item_id = null) appear on timeline
   - Events and milestones ALWAYS timeline-eligible
   - Tasks, notes, etc. only if they have dates

6. **Task Flow Sync Direction**
   - Roadmap → Task Flow (one-way only)
   - Only task, habit, goal types sync
   - Unique constraint: one task per roadmap_item

### Track Invariants

1. **One Master Project Per Domain**
   - Enforced by unique constraint on `(user_id, domain_id)` where `archived_at IS NULL`
   - Must archive existing before creating new

2. **Track Hierarchy**
   - Tracks can nest via `parent_track_id`
   - No depth limit enforced (risk area)
   - Shared tracks accessible across user's projects

### Space Invariants

1. **Widget Visibility Scopes**
   - 'private': Only creator sees
   - 'all': All space members see
   - 'restricted': Not fully implemented (risk)

2. **Soft Delete Pattern**
   - Widgets use `deleted_at` for soft delete
   - Layouts may reference deleted widgets (cleanup issue)

3. **Layout Uniqueness**
   - One layout record per widget per member
   - Each user has independent positioning

### Focus Session Invariants

1. **One Active Session Per User**
   - Only one session with status='active' allowed
   - Must end/pause before starting new session

2. **Focus Score Bounds**
   - Score calculated as: 100 - (12 * drifts) - (5 * distractions) + completion_bonus
   - Clamped to [0, 100]

3. **Drift Types**
   - Valid: offshoot, side_project, external_distraction
   - Logged in focus_drift_log during sessions

### AI System Invariants

1. **Provider-Model Relationship**
   - Every model belongs to exactly one provider
   - Routes reference models via `provider_model_id`

2. **Route Specificity Priority**
   - Project-specific > Surface-specific > Default
   - Priority value determines selection order
   - Fallback routes have is_fallback=true

3. **Draft Safety**
   - Drafts can be marked for review
   - Applied drafts cannot be re-applied
   - Partial application creates new draft for remaining items

### Household Invariants

1. **Household Auto-Creation**
   - Every user gets a household on signup
   - User is automatically household owner

2. **Member Roles**
   - Owner: full control
   - Admin: management access
   - Member: standard access
   - Professional: read-only client access

3. **Diet Profile Per Member**
   - Each household_member can have one diet_profile
   - Used for meal filtering and suggestions

---

## 5. Coupling & Risk Areas

### High-Coupling Zones

#### 1. Roadmap ↔ Task Flow Sync
**Nature**: One-way sync from roadmap to tasks
**Coupling Point**: `taskflow_tasks.synced_roadmap_item_id`
**Risk**:
- If roadmap_item deleted, task becomes orphaned
- Sync logic is manual, not trigger-based
- No automated sync on roadmap updates
**Impact**: Changes to roadmap status don't propagate to tasks

#### 2. Mind Mesh ↔ Guardrails Auto-Generation
**Nature**: Mind Mesh reads Guardrails structure to create nodes/edges
**Coupling Point**: `guardrails_nodes.source_type` and `source_id`
**Risk**:
- Auto-generated nodes reference tracks, items, people
- If source entity deleted, node may dangle
- No cascade delete from source to node
**Impact**: Broken references in Mind Mesh UI

#### 3. Spaces ↔ Guardrails Sync
**Nature**: Items can be "sent" to Spaces as widgets
**Coupling Point**: `spacesSync.ts` service
**Risk**:
- Widgets are copies, not references
- No bi-directional sync
- "Linked" mode not fully implemented
**Impact**: Divergence between Guardrails and Spaces representations

#### 4. AI Drafts ↔ Roadmap Application
**Nature**: AI drafts can be applied to create roadmap items
**Coupling Point**: `databaseWriter.ts` writes to roadmap tables
**Risk**:
- Draft application bypasses normal validation
- Partial application can leave inconsistent state
- No rollback mechanism for failed applications
**Impact**: Data integrity issues if draft application fails midway

#### 5. Focus Sessions ↔ Regulation State
**Nature**: Focus events update regulation_state aggregates
**Coupling Point**: Manual updates to `regulation_state` metrics
**Risk**:
- Metrics calculated in application code, not database
- No triggers to maintain consistency
- Drift counts can desync if focus_drift_log edited
**Impact**: Incorrect regulation interventions

### Naming Confusion and Misleading Terminology

#### 1. "Node" Overloading
**Problem**: "Node" means different things in different contexts
- Mind Mesh nodes: Graph vertices with content
- Roadmap items: Sometimes called "nodes" in discussions
- React component tree: Also uses "node" terminology
**Risk**: Developer confusion, incorrect service calls
**Evidence**: Mixed usage in `mindmesh.ts` and `roadmapService.ts`

#### 2. "Type" vs "Item Type" vs "Node Type"
**Problem**: Multiple "type" columns with different enums
- `roadmap_items.type`: task, event, milestone, etc.
- `guardrails_nodes.node_type`: idea, task, note, offshoot, group
- `project_types.type_key`: software, writing, health, etc.
**Risk**: Wrong enum values, type mismatch bugs
**Evidence**: Type assertions scattered across services

#### 3. "Track" vs "Section" vs "Lane"
**Problem**: Inconsistent terminology for organizational units
- Tracks: Workstreams in Guardrails
- Sections: Containers in roadmap
- Lanes: Sometimes used for both tracks and sections
**Risk**: Confusion about data model relationships
**Evidence**: Comments in roadmap UI refer to "lanes" but code uses tracks

#### 4. "Space" vs "Household" vs "Shared Space"
**Problem**: Overlapping concepts
- Personal Space: One per user
- Shared Space: Multiple members
- Household: Group of users (can have multiple spaces)
**Risk**: Permission checks using wrong scope
**Evidence**: `useHouseholdPermissions.ts` checks household roles, but spaces have separate members

#### 5. "Draft" in Multiple Contexts
**Problem**: "Draft" means different things
- AI Drafts: Generated content awaiting application
- Draft roadmap items: Items not yet finalized (NOT implemented)
- Message drafts: Unsent messages (NOT implemented)
**Risk**: Assuming draft behavior that doesn't exist

### Brittle Integration Points

#### 1. Widget Type Registration
**Location**: `mobileAppsRegistry.tsx` and widget component folders
**Problem**: Widget types must be manually registered in multiple places
- Widget component files
- Widget type enum in migrations
- Mobile app registry
- Canvas widget renderer
**Risk**: Adding new widget type requires changes in 5+ files
**Evidence**: meal_planner widget added required migration + 4 code changes

#### 2. AI Feature Registration
**Location**: AI routing service and feature registry
**Problem**: New AI features require:
- New enum value in `ai_feature_key` type
- Route configuration in database
- Context assembly logic
- Provider adapter support
**Risk**: Incomplete feature registration causes routing failures
**Evidence**: Missing ai_chat routes caused recent bug

#### 3. Roadmap Item Type Handling
**Location**: Composition rules, sync services, timeline rendering
**Problem**: Adding new item type requires:
- Migration to add enum value
- Update composition matrix
- Update task flow sync eligibility
- Update timeline rendering logic
**Risk**: Incomplete updates cause validation failures
**Evidence**: 10+ files reference item type enums

#### 4. Domain Configuration
**Location**: `domainConfig.ts` and database seeding
**Problem**: Domains hardcoded in multiple places
- Database enum: work, personal, creative, health
- Config file defines properties per domain
- UI strings duplicated
**Risk**: Adding/removing domains requires coordinated changes
**Evidence**: Domain icons, colors, labels scattered across files

### Data Integrity Vulnerabilities

#### 1. Orphaned Task Flow Items
**Scenario**: Roadmap item deleted, task remains
**Current Behavior**: Task.synced_roadmap_item_id points to nonexistent row
**Missing**: No foreign key constraint, no cascade delete

#### 2. Dangling Widget References
**Scenario**: Widget soft-deleted, layout remains
**Current Behavior**: Layout records reference deleted_at widgets
**Missing**: Cleanup job to remove orphaned layouts

#### 3. Focus Drift Log Without Session
**Scenario**: Focus session deleted, drift log remains
**Current Behavior**: Drift logs point to nonexistent session
**Missing**: Cascade delete from sessions to drift logs

#### 4. AI Conversation Without Messages
**Scenario**: All messages deleted, conversation remains
**Current Behavior**: Empty conversation shows in list
**Missing**: Auto-cleanup of empty conversations

#### 5. Household Member Without User
**Scenario**: User account deleted, household member row remains
**Current Behavior**: Broken reference in household_members
**Missing**: Cascade delete from auth.users to household_members

---

## 6. Key Implementation Entry Points

### Guardrails System

#### Roadmap
**Primary Service**: `/src/lib/guardrails/roadmapService.ts`
- CRUD operations for roadmap items
- Status and deadline management
- Query helpers for timeline rendering

**Composition Logic**: `/src/lib/guardrails/roadmapCompositionService.ts`
- Parent-child attachment/detachment
- Hierarchy validation
- Tree traversal utilities

**Composition Rules**: `/src/lib/guardrails/roadmapItemCompositionRules.ts`
- Type compatibility matrix
- Depth constraints
- Validation functions

**UI Components**:
- `/src/components/guardrails/roadmap/RoadmapPage.tsx`: Main timeline view
- `/src/components/guardrails/roadmap/GanttView.tsx`: Gantt chart rendering
- `/src/components/guardrails/roadmap/ItemDrawer.tsx`: Item detail editor

#### Task Flow
**Primary Service**: `/src/lib/guardrails/taskFlowSyncService.ts`
- Sync from roadmap to tasks
- Task CRUD operations
- Status management

**UI Components**:
- `/src/components/guardrails/taskflow/TaskFlowBoard.tsx`: Kanban board
- `/src/components/guardrails/taskflow/TaskFlowCard.tsx`: Task card rendering

#### Mind Mesh
**Primary Service**: `/src/lib/guardrails/mindMeshService.ts`
- Node and edge CRUD
- Graph queries (connected nodes, paths)
- Export/import functionality

**Auto-Generation**: `/src/lib/guardrails/mindMeshAutoGenService.ts`
- Creates nodes from Guardrails structure
- Generates hierarchy edges
- Maintains auto-generated flag

**Graph Utilities**: `/src/lib/guardrails/mindMeshGraphService.ts`
- Graph analysis (connected components, paths)
- Layout algorithms
- Visibility filtering

**UI Components**:
- `/src/components/guardrails/mindmesh/MindMeshPage.tsx`: Main canvas
- `/src/components/guardrails/mindmesh/MindMeshNodeComponent.tsx`: Node rendering
- `/src/components/guardrails/mindmesh/MindMeshLinks.tsx`: Edge rendering

#### Tracks
**Primary Service**: `/src/lib/guardrails/trackService.ts`
- Track CRUD operations
- Hierarchy management
- Shared track handling

**UI Components**:
- `/src/components/guardrails/tracks/TrackDropdown.tsx`: Track selector
- `/src/components/guardrails/roadmap/TrackTree.tsx`: Hierarchical track display

#### Side Projects & Offshoots
**Primary Service**: `/src/lib/guardrails/sideProjects.ts`
- Side project CRUD
- Task management within side projects
- Conversion to master projects

**Offshoot Service**: `/src/lib/guardrails/offshoots.ts`
- Offshoot idea capture
- Promotion to side projects or roadmap items

**UI Components**:
- `/src/components/guardrails/side-projects/SideProjectsList.tsx`
- `/src/components/guardrails/offshoots/OffshootIdeasList.tsx`

#### Focus Mode
**Primary Service**: `/src/lib/guardrails/focus.ts`
- Session lifecycle management
- Drift and distraction logging
- Focus score calculation
- Weekly analytics generation

**Regulation**: Part of focus.ts
- Regulation rule evaluation
- Nudge triggering
- Pause enforcement

**UI Components**:
- `/src/components/guardrails/focus/FocusModePage.tsx`: Session container
- `/src/components/guardrails/focus/FocusModeStart.tsx`: Session start
- `/src/components/guardrails/focus/FocusModeLive.tsx`: Active session view
- `/src/components/guardrails/focus/FocusTimer.tsx`: Timer display
- `/src/components/guardrails/focus/DistractionLogger.tsx`: Distraction capture

#### Reality Check
**Primary Service**: `/src/lib/guardrails/realityCheck.ts`
- Skills and tools tracking
- Feasibility scoring
- Recommendation generation

**UI Components**:
- `/src/components/guardrails/reality/RealityCheckPage.tsx`
- `/src/components/guardrails/reality/FeasibilityDashboard.tsx`

#### People & Assignments
**Primary Service**: `/src/lib/guardrails/peopleService.ts`
- Project people management
- Global people linking

**Assignment Service**: `/src/lib/guardrails/assignmentService.ts`
- Task assignment to people
- Assignment queries

**UI Components**:
- `/src/components/guardrails/people/PeoplePage.tsx`

#### Wizard (Project Creation)
**Primary Service**: `/src/lib/guardrails/wizard.ts`
- Multi-step project creation flow
- Template application
- Domain and type selection

**AI Integration**: `/src/lib/guardrails/ai/wizardAIService.ts`
- AI-assisted project setup
- Roadmap generation from description

**UI Components**:
- `/src/components/guardrails/wizard/ProjectWizard.tsx`: Main wizard
- Multiple `/src/components/guardrails/wizard/WizardStep*.tsx` files

### Spaces System

#### Core Spaces
**Primary Service**: `/src/lib/spacesSync.ts`
- Sync from Guardrails to Spaces
- Widget creation from various source types

**UI Components**:
- `/src/components/SpaceViewPage.tsx`: Space viewer
- `/src/components/fridge-board/FridgeBoard.tsx`: Grid-based board
- `/src/components/fridge-canvas/FridgeCanvas.tsx`: Infinite canvas

#### Widget Rendering
**Widget Components**: `/src/components/fridge-board/widgets/` and `/src/components/fridge-canvas/widgets/`
- Each widget type has its own component
- Examples: CalendarWidget.tsx, TaskWidget.tsx, MealPlannerWidget.tsx
- Canvas widgets support micro/full modes

**Layout Management**: Handled in FridgeBoard.tsx and FridgeCanvas.tsx
- Drag and drop positioning
- Resize handling
- Z-index management

### Household System

**Primary Service**: `/src/lib/household.ts`
- Household CRUD
- Member management
- Invitation handling

**Calendar**: `/src/lib/calendar.ts`
- Household calendar event CRUD
- Event queries and filtering

**Meal Planning**: `/src/lib/mealPlanner.ts`, `/src/lib/mealLibrary.ts`
- Meal plan CRUD
- Recipe management
- Diet profile filtering

**UI Components**:
- `/src/components/HouseholdDashboardPage.tsx`
- `/src/components/HouseholdMembersPage.tsx`
- `/src/components/calendar/CalendarPage.tsx`

### AI System

#### Conversation Management
**Primary Service**: `/src/lib/guardrails/ai/conversationService.ts`
- Conversation CRUD
- Message handling
- Conversation listing

**Context Assembly**: `/src/lib/guardrails/ai/aiContextAssembly.ts` and `aiContextAssemblyV2.ts`
- Builds project/track/item context
- Budget management for token limits
- Context truncation

**Routing**: `/src/lib/guardrails/ai/aiRoutingService.ts`
- Determines which model to use
- Priority and fallback handling
- Constraint evaluation

**Execution**: `/src/lib/guardrails/ai/aiExecutionService.ts`
- Coordinates AI request flow
- Error handling
- Retry logic

**Provider Adapters**:
- `/src/lib/guardrails/ai/openaiAdapter.ts`: OpenAI integration
- `/src/lib/guardrails/ai/anthropicAdapter.ts`: Anthropic integration

**Draft Management**: `/src/lib/guardrails/ai/aiDraftService.ts`
- Draft creation and storage
- Application to Guardrails
- Safety validation

**UI Components**:
- `/src/components/ai-chat/FloatingAIChatWidget.tsx`: Chat interface
- `/src/components/guardrails/ai/DraftDrawer.tsx`: Draft review

### Authentication & Profile

**Auth Service**: `/src/lib/auth.ts`
- Signup, login, logout
- Password reset
- Session management

**Profile Management**: In auth.ts
- Profile creation on signup
- Profile updates
- Deletion handling

**UI Components**:
- `/src/components/Login.tsx`
- `/src/components/Signup.tsx`
- `/src/components/ProfileSettings.tsx`

### Encryption (Messaging)

**Encryption Service**: `/src/lib/encryption.ts`
- Key generation and exchange
- Message encryption/decryption
- Conversation key management

**Contexts**: `/src/contexts/EncryptionContext.tsx`
- Key pair management
- Encryption utilities for components

---

## 7. Open Questions / Missing Context

### Database Behavior Questions

1. **Task Flow Sync Triggering**
   - How and when does roadmap → task sync occur?
   - Is it manual, webhook-based, or periodic job?
   - Evidence: No triggers found in migrations, sync service exists but trigger unclear

2. **Shared Track Visibility**
   - How are shared tracks visible across projects?
   - Is there a junction table or query-time filter?
   - Evidence: `is_shared` flag exists but usage pattern unclear

3. **Widget "Linked" Sync Mode**
   - What does "linked" sync actually do?
   - Is bi-directional sync implemented?
   - Evidence: Enum value exists, but no implementation found

4. **AI Draft Partial Application**
   - How is partial state tracked?
   - What happens to the original draft?
   - Evidence: Status exists but workflow unclear

5. **Focus Session Auto-End**
   - Do sessions auto-complete on timeout?
   - Is there a background job checking session duration?
   - Evidence: Intended duration tracked but enforcement mechanism missing

### Implementation Completeness Questions

6. **Reality Check Scoring Algorithm**
   - How is feasibility score calculated?
   - What weights are applied to different factors?
   - Evidence: Service exists but calculation logic not in migrations

7. **Regulation Rule Definitions**
   - Where are regulation rules defined?
   - Are they hardcoded or configurable per user?
   - Evidence: Regulation state table exists but rules not in database

8. **AI Provider Fallback Flow**
   - If primary model fails, how is fallback selected?
   - Is there automatic retry with different model?
   - Evidence: Fallback routes exist but retry logic not clear

9. **Household Subscription Enforcement**
   - Do free/basic/premium tiers limit functionality?
   - Where are tier checks performed?
   - Evidence: Tier column exists but no enforcement logic found

10. **Professional Access Audit Trail**
    - Is professional access to client data logged?
    - Can clients see access history?
    - Evidence: Access tables exist but audit logging unclear

### Architectural Intent Questions

11. **Mind Mesh vs Roadmap Relationship**
    - Is Mind Mesh intended to replace roadmap eventually?
    - Or are they permanently separate views?
    - Evidence: Overlap in functionality suggests unclear boundary

12. **Spaces vs Guardrails Long-Term Design**
    - Should these systems converge?
    - Is one intended to be deprecated?
    - Evidence: Sync mechanisms suggest parallel evolution

13. **Mobile App vs Web Widgets**
    - Do mobile apps use same widget system?
    - Is there a separate mobile data model?
    - Evidence: mobileAppsRegistry exists but relationship to widgets unclear

14. **Focus Analytics Caching Strategy**
    - How often is focus_analytics_cache updated?
    - Is there a background job or on-demand calculation?
    - Evidence: Cache table exists but refresh trigger missing

15. **Template System Ownership**
    - Who creates templates (admin, users, both)?
    - Can users share templates with each other?
    - Evidence: User and system templates exist but creation flow unclear

---

## Appendix: Table Counts and Complexity Metrics

### Database Schema Size
- **Total Tables**: 97 (excluding Supabase internal tables)
- **Guardrails Domain**: 42 tables
- **Spaces Domain**: 8 tables
- **Household Domain**: 12 tables
- **AI System**: 9 tables
- **Authentication/Profile**: 8 tables
- **Messaging**: 6 tables
- **Shared/Utility**: 12 tables

### Code Organization
- **Total TypeScript Files**: 450+
- **Component Files**: 280+
- **Service/Library Files**: 120+
- **Migration Files**: 192 files
- **Type Definition Files**: 35+

### Key Enums (Critical for Validation)
- **roadmap_item.status**: 7 values
- **roadmap_item.type**: 10 values
- **guardrails_node.node_type**: 5 values
- **edge_type**: 7 values (legacy + extended)
- **domain_type**: 4 values (work, personal, creative, health)
- **household_member_role**: 4 values (member, admin, owner, professional)
- **focus_event_type**: 9 values
- **ai_feature_key**: 4+ values (extensible)

### Complexity Indicators
- **Maximum Foreign Key Depth**: 6 (users → domains → projects → sections → items → child items)
- **Largest JSONB Columns**: roadmap_items.metadata, fridge_widgets.content, ai_messages.metadata
- **Tables with Soft Delete**: 4 (fridge_widgets, master_projects, messages, guardrails_nodes)
- **Tables with RLS Policies**: All user-facing tables (97)
- **Stored Procedures**: 3 (delete_user_account, update track dates, auto-create profile)

---

**End of Document**

This document represents the system as implemented as of 2025-12-14. All information is derived from actual code, migrations, and service implementations. No future features or designs are included.
