# Guardrails Phase 1: Domain Entity Separation
## Implementation Plan

**Document Status:** Phase 1 Implementation Plan  
**Effective Date:** January 2026  
**Prerequisites:** Phase 0 Architectural Lock-In must be complete and reviewed  
**Goal:** Separate domain entities from roadmap projection layer while maintaining system compatibility

---

## Executive Summary

Phase 1 implements the architectural separation defined in Phase 0 by:

1. Creating first-class domain tables (`guardrails_tasks`, `guardrails_events`)
2. Converting `roadmap_items` into a projection node that references domain entities
3. Migrating existing data from roadmap to domain tables
4. Updating services to write domain-first, roadmap-second
5. Maintaining compatibility bridges for Taskflow/Calendar until Phase 2/3

**Non-Goal:** Full refactor of Calendar/Taskflow to derive from domain tables (deferred to Phase 2/3)

---

## 1. Database: Create Domain Tables (New Source of Truth)

### 1.1 guardrails_tasks

**Purpose:** First-class domain table for Guardrails Tasks. Contains task semantics, validation, and lifecycle.

**Schema:**

```sql
CREATE TABLE guardrails_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project assignment (required for project-scoped tasks)
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Future: side project container (nullable for now)
  side_project_id uuid NULL,
  
  -- Core semantics
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'pending',
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Lifecycle timestamps
  completed_at timestamptz NULL,
  due_at timestamptz NULL,
  
  -- Type-specific metadata (extensible)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  
  -- Constraints
  CONSTRAINT guardrails_tasks_status_check CHECK (
    status IN ('not_started', 'pending', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled')
  ),
  CONSTRAINT guardrails_tasks_completed_logic CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);
```

**Indexes:**

```sql
-- Project filtering
CREATE INDEX idx_guardrails_tasks_project 
  ON guardrails_tasks(master_project_id) 
  WHERE archived_at IS NULL;

-- Status filtering
CREATE INDEX idx_guardrails_tasks_status 
  ON guardrails_tasks(master_project_id, status) 
  WHERE archived_at IS NULL;

-- Due date filtering
CREATE INDEX idx_guardrails_tasks_due_at 
  ON guardrails_tasks(due_at) 
  WHERE archived_at IS NULL AND due_at IS NOT NULL;

-- Created by filtering
CREATE INDEX idx_guardrails_tasks_created_by 
  ON guardrails_tasks(created_by) 
  WHERE archived_at IS NULL;

-- Updated timestamp for sync
CREATE INDEX idx_guardrails_tasks_updated_at 
  ON guardrails_tasks(updated_at) 
  WHERE archived_at IS NULL;
```

**Triggers:**

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_guardrails_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guardrails_tasks_updated_at
  BEFORE UPDATE ON guardrails_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_guardrails_tasks_updated_at();
```

### 1.2 guardrails_events

**Purpose:** First-class domain table for Guardrails Events. Contains event semantics, validation, and lifecycle.

**Schema:**

```sql
CREATE TABLE guardrails_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project assignment
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Future: side project container
  side_project_id uuid NULL,
  
  -- Core semantics
  title text NOT NULL,
  description text NULL,
  
  -- Temporal properties
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  timezone text NULL DEFAULT 'UTC',
  
  -- Location
  location text NULL,
  
  -- Type-specific metadata (recurrence, attendees, etc.)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  
  -- Constraints
  CONSTRAINT guardrails_events_temporal_check CHECK (
    (start_at IS NULL AND end_at IS NULL) OR
    (start_at IS NOT NULL AND (end_at IS NULL OR end_at >= start_at))
  )
);
```

**Indexes:**

```sql
-- Project filtering
CREATE INDEX idx_guardrails_events_project 
  ON guardrails_events(master_project_id) 
  WHERE archived_at IS NULL;

-- Date range queries
CREATE INDEX idx_guardrails_events_start_at 
  ON guardrails_events(start_at) 
  WHERE archived_at IS NULL AND start_at IS NOT NULL;

CREATE INDEX idx_guardrails_events_end_at 
  ON guardrails_events(end_at) 
  WHERE archived_at IS NULL AND end_at IS NOT NULL;

-- Date range for calendar sync
CREATE INDEX idx_guardrails_events_date_range 
  ON guardrails_events USING GIST (
    tstzrange(start_at, end_at, '[]')
  ) 
  WHERE archived_at IS NULL;

-- Created by filtering
CREATE INDEX idx_guardrails_events_created_by 
  ON guardrails_events(created_by) 
  WHERE archived_at IS NULL;

-- Updated timestamp for sync
CREATE INDEX idx_guardrails_events_updated_at 
  ON guardrails_events(updated_at) 
  WHERE archived_at IS NULL;
```

**Triggers:**

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_guardrails_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guardrails_events_updated_at
  BEFORE UPDATE ON guardrails_events
  FOR EACH ROW
  EXECUTE FUNCTION update_guardrails_events_updated_at();
```

### 1.3 Design Decisions

**Why These Fields:**
- `master_project_id`: Required for project-scoped RLS and organization
- `side_project_id`: Nullable future hook for side projects (can be added later without migration)
- `status` (tasks): Domain semantics - task lifecycle state
- `progress` (tasks): Domain semantics - completion tracking
- `start_at`/`end_at` (events): Domain semantics - temporal requirements
- `metadata` JSONB: Extensible for type-specific data without schema changes
- `created_by`: Audit trail linking to authenticated user
- `archived_at`: Soft deletion for data retention

**What's NOT Included (Intentionally):**
- ❌ Track/subtrack assignment (roadmap projection concern)
- ❌ Parent-child hierarchy (roadmap projection concern)
- ❌ Ordering/positioning (roadmap projection concern)
- ❌ Visibility state (roadmap projection concern)

**Rule:**
> **RULE-DOMAIN-TABLE-CONTENT**: Domain tables contain only semantic meaning, validation, lifecycle, and project assignment. All visual hierarchy, ordering, and planning structure belongs in roadmap_items.

---

## 2. Database: Repurpose roadmap_items into Projection Node

### 2.1 Add Reference Columns

**Migration:**

```sql
-- Add entity reference columns
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add index for entity lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_items_entity 
  ON roadmap_items(entity_type, entity_id) 
  WHERE archived_at IS NULL;

-- Add index for roadmap structure queries
CREATE INDEX IF NOT EXISTS idx_roadmap_items_structure 
  ON roadmap_items(master_project_id, track_id, subtrack_id, ordering_index) 
  WHERE archived_at IS NULL;
```

**Note:** Keep existing columns (`master_project_id`, `track_id`, `subtrack_id`, `parent_item_id`, `ordering_index`, `start_date`, `end_date`, `type`, `status`, `metadata`, etc.) for now. These will be deprecated in later phases but remain for compatibility.

### 2.2 Add Constraints

**Unique Constraint (Prevents Duplicate Projections):**

```sql
-- Prevent duplicate active projections of same entity in same project
CREATE UNIQUE INDEX idx_roadmap_items_unique_projection 
  ON roadmap_items(master_project_id, entity_type, entity_id) 
  WHERE archived_at IS NULL;
```

**Entity Type Check Constraint:**

```sql
-- Initially support task and event (expand later for goals, habits, etc.)
ALTER TABLE roadmap_items
  ADD CONSTRAINT roadmap_items_entity_type_check 
  CHECK (entity_type IN ('task', 'event') OR entity_type IS NULL);
```

**Note:** Allow `entity_type IS NULL` during migration period when legacy items haven't been backfilled yet.

### 2.3 Integrity Trigger (Critical)

**Purpose:** Enforce referential integrity and project consistency between roadmap projection and domain entity.

```sql
CREATE OR REPLACE FUNCTION validate_roadmap_item_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_project_id uuid;
BEGIN
  -- Skip validation if entity reference is not set (during migration)
  IF NEW.entity_type IS NULL OR NEW.entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate entity exists and get its project_id
  IF NEW.entity_type = 'task' THEN
    SELECT master_project_id INTO v_entity_project_id
    FROM guardrails_tasks
    WHERE id = NEW.entity_id AND archived_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Roadmap item references non-existent task: %', NEW.entity_id;
    END IF;
  ELSIF NEW.entity_type = 'event' THEN
    SELECT master_project_id INTO v_entity_project_id
    FROM guardrails_events
    WHERE id = NEW.entity_id AND archived_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Roadmap item references non-existent event: %', NEW.entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', NEW.entity_type;
  END IF;

  -- Ensure roadmap item's project matches entity's project
  IF NEW.master_project_id != v_entity_project_id THEN
    RAISE EXCEPTION 'Roadmap item project_id (%) does not match entity project_id (%)', 
      NEW.master_project_id, v_entity_project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_roadmap_item_entity
  BEFORE INSERT OR UPDATE ON roadmap_items
  FOR EACH ROW
  WHEN (NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL)
  EXECUTE FUNCTION validate_roadmap_item_entity();
```

**Rule:**
> **RULE-ROADMAP-INTEGRITY**: Roadmap items must reference valid, non-archived domain entities. Roadmap item's project must match referenced entity's project. This is enforced by trigger.

---

## 3. Data Migration: Backfill Domain Entities

### 3.1 Migration Map Table (Essential for Debugging)

**Create migration tracking table:**

```sql
CREATE TABLE guardrails_domain_migration_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  migration_notes text NULL,
  
  UNIQUE(roadmap_item_id, entity_type, entity_id)
);

CREATE INDEX idx_migration_map_roadmap_item 
  ON guardrails_domain_migration_map(roadmap_item_id);

CREATE INDEX idx_migration_map_entity 
  ON guardrails_domain_migration_map(entity_type, entity_id);
```

### 3.2 Backfill Tasks Migration

**Migration script:**

```sql
-- Migration: Backfill guardrails_tasks from roadmap_items
DO $$
DECLARE
  v_roadmap_item RECORD;
  v_new_task_id uuid;
  v_status text;
  v_completed_at timestamptz;
  v_due_at timestamptz;
BEGIN
  FOR v_roadmap_item IN 
    SELECT id, master_project_id, title, description, status, 
           end_date, metadata, created_at, updated_at
    FROM roadmap_items
    WHERE type = 'task'
      AND entity_type IS NULL  -- Only migrate unmigrated items
  LOOP
    -- Map roadmap status to domain status (adjust as needed)
    v_status := COALESCE(v_roadmap_item.status, 'pending');
    
    -- Determine completed_at from status
    IF v_status = 'completed' THEN
      v_completed_at := COALESCE(v_roadmap_item.updated_at, now());
    ELSE
      v_completed_at := NULL;
    END IF;
    
    -- Convert end_date to due_at (if present)
    IF v_roadmap_item.end_date IS NOT NULL THEN
      v_due_at := v_roadmap_item.end_date::timestamptz;
    ELSE
      v_due_at := NULL;
    END IF;
    
    -- Generate new task ID (or reuse roadmap_item.id if preferred)
    v_new_task_id := gen_random_uuid();
    
    -- Insert into domain table
    INSERT INTO guardrails_tasks (
      id, master_project_id, title, description, status, 
      completed_at, due_at, metadata, created_at, updated_at
    ) VALUES (
      v_new_task_id,
      v_roadmap_item.master_project_id,
      v_roadmap_item.title,
      v_roadmap_item.description,
      v_status,
      v_completed_at,
      v_due_at,
      COALESCE(v_roadmap_item.metadata, '{}'::jsonb),
      v_roadmap_item.created_at,
      v_roadmap_item.updated_at
    );
    
    -- Update roadmap item with entity reference
    UPDATE roadmap_items
    SET entity_type = 'task',
        entity_id = v_new_task_id
    WHERE id = v_roadmap_item.id;
    
    -- Record migration
    INSERT INTO guardrails_domain_migration_map (
      roadmap_item_id, entity_type, entity_id, migration_notes
    ) VALUES (
      v_roadmap_item.id, 'task', v_new_task_id, 'Phase 1 backfill migration'
    );
  END LOOP;
END $$;
```

### 3.3 Backfill Events Migration

**Migration script:**

```sql
-- Migration: Backfill guardrails_events from roadmap_items
DO $$
DECLARE
  v_roadmap_item RECORD;
  v_new_event_id uuid;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_location text;
BEGIN
  FOR v_roadmap_item IN 
    SELECT id, master_project_id, title, description, 
           start_date, end_date, metadata, created_at, updated_at
    FROM roadmap_items
    WHERE type = 'event'
      AND entity_type IS NULL  -- Only migrate unmigrated items
  LOOP
    -- Convert dates to timestamps (adjust timezone handling as needed)
    IF v_roadmap_item.start_date IS NOT NULL THEN
      v_start_at := v_roadmap_item.start_date::timestamptz;
    ELSE
      v_start_at := NULL;
    END IF;
    
    IF v_roadmap_item.end_date IS NOT NULL THEN
      v_end_at := v_roadmap_item.end_date::timestamptz;
    ELSE
      v_end_at := NULL;
    END IF;
    
    -- Extract location from metadata if present
    v_location := NULL;
    IF v_roadmap_item.metadata IS NOT NULL AND jsonb_typeof(v_roadmap_item.metadata) = 'object' THEN
      v_location := v_roadmap_item.metadata->>'location';
    END IF;
    
    -- Generate new event ID
    v_new_event_id := gen_random_uuid();
    
    -- Insert into domain table
    INSERT INTO guardrails_events (
      id, master_project_id, title, description, 
      start_at, end_at, location, metadata, created_at, updated_at
    ) VALUES (
      v_new_event_id,
      v_roadmap_item.master_project_id,
      v_roadmap_item.title,
      v_roadmap_item.description,
      v_start_at,
      v_end_at,
      v_location,
      COALESCE(v_roadmap_item.metadata, '{}'::jsonb),
      v_roadmap_item.created_at,
      v_roadmap_item.updated_at
    );
    
    -- Update roadmap item with entity reference
    UPDATE roadmap_items
    SET entity_type = 'event',
        entity_id = v_new_event_id
    WHERE id = v_roadmap_item.id;
    
    -- Record migration
    INSERT INTO guardrails_domain_migration_map (
      roadmap_item_id, entity_type, entity_id, migration_notes
    ) VALUES (
      v_roadmap_item.id, 'event', v_new_event_id, 'Phase 1 backfill migration'
    );
  END LOOP;
END $$;
```

### 3.4 Migration Validation

**Post-migration validation queries:**

```sql
-- Verify all tasks migrated
SELECT 
  COUNT(*) as unmigrated_tasks
FROM roadmap_items
WHERE type = 'task' AND entity_type IS NULL;

-- Verify all events migrated
SELECT 
  COUNT(*) as unmigrated_events
FROM roadmap_items
WHERE type = 'event' AND entity_type IS NULL;

-- Verify referential integrity
SELECT 
  COUNT(*) as invalid_references
FROM roadmap_items ri
WHERE ri.entity_type = 'task'
  AND NOT EXISTS (
    SELECT 1 FROM guardrails_tasks gt 
    WHERE gt.id = ri.entity_id AND gt.archived_at IS NULL
  );

SELECT 
  COUNT(*) as invalid_references
FROM roadmap_items ri
WHERE ri.entity_type = 'event'
  AND NOT EXISTS (
    SELECT 1 FROM guardrails_events ge 
    WHERE ge.id = ri.entity_id AND ge.archived_at IS NULL
  );

-- Verify project consistency
SELECT 
  COUNT(*) as project_mismatches
FROM roadmap_items ri
LEFT JOIN guardrails_tasks gt ON ri.entity_type = 'task' AND gt.id = ri.entity_id
LEFT JOIN guardrails_events ge ON ri.entity_type = 'event' AND ge.id = ri.entity_id
WHERE (gt.id IS NOT NULL AND ri.master_project_id != gt.master_project_id)
   OR (ge.id IS NOT NULL AND ri.master_project_id != ge.master_project_id);
```

### 3.5 Migration Rollback (Safety)

**If migration needs to be rolled back:**

```sql
-- Rollback: Clear entity references (keep domain tables for investigation)
UPDATE roadmap_items
SET entity_type = NULL, entity_id = NULL
WHERE entity_type IN ('task', 'event');

-- Domain tables remain (for data recovery if needed)
-- Truncate or archive guardrails_tasks/guardrails_events if full rollback needed
```

**Rule:**
> **RULE-MIGRATION-SAFETY**: All migrations must be reversible. Migration map table enables debugging and rollback. Domain tables are never dropped during Phase 1 (even if roadmap references are cleared).

---

## 4. RLS & Permission Enforcement

### 4.1 RLS on guardrails_tasks

**Enable RLS:**

```sql
ALTER TABLE guardrails_tasks ENABLE ROW LEVEL SECURITY;
```

**Policies:**

```sql
-- View tasks in projects user can view
CREATE POLICY "Users can view tasks in their projects"
  ON guardrails_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_tasks.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.archived_at IS NULL
    )
  );

-- Create tasks in projects user can edit
CREATE POLICY "Editors can create tasks"
  ON guardrails_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_tasks.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  );

-- Update tasks in projects user can edit
CREATE POLICY "Editors can update tasks"
  ON guardrails_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_tasks.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_tasks.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  );

-- Delete tasks in projects user can edit (soft delete via archived_at)
CREATE POLICY "Editors can archive tasks"
  ON guardrails_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_tasks.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  )
  WITH CHECK (
    -- Only allow updating archived_at (soft delete)
    (OLD.* IS DISTINCT FROM NEW.*) = (OLD.archived_at IS DISTINCT FROM NEW.archived_at)
    OR NEW.archived_at IS NOT NULL
  );
```

### 4.2 RLS on guardrails_events

**Enable RLS:**

```sql
ALTER TABLE guardrails_events ENABLE ROW LEVEL SECURITY;
```

**Policies (similar pattern to tasks):**

```sql
-- View events in projects user can view
CREATE POLICY "Users can view events in their projects"
  ON guardrails_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_events.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.archived_at IS NULL
    )
  );

-- Create events in projects user can edit
CREATE POLICY "Editors can create events"
  ON guardrails_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_events.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  );

-- Update events in projects user can edit
CREATE POLICY "Editors can update events"
  ON guardrails_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_events.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_events.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  );

-- Archive events in projects user can edit
CREATE POLICY "Editors can archive events"
  ON guardrails_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = guardrails_events.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('owner', 'editor')
      AND pu.archived_at IS NULL
    )
  )
  WITH CHECK (
    (OLD.* IS DISTINCT FROM NEW.*) = (OLD.archived_at IS DISTINCT FROM NEW.archived_at)
    OR NEW.archived_at IS NOT NULL
  );
```

### 4.3 RLS on roadmap_items (Updated)

**Existing roadmap_items RLS policies should remain, but ensure they respect project permissions:**

```sql
-- Verify roadmap_items RLS uses project_users pattern
-- If not, update to match the pattern above
```

**Rule:**
> **RULE-RLS-CONSISTENCY**: All domain and roadmap tables use the same permission model (project_users with roles). RLS policies must be consistent across all Guardrails tables.

---

## 5. Services: Domain Services + Roadmap Reference Mode

### 5.1 New Domain Services

#### guardrailsTaskService.ts

**Location:** `src/lib/guardrails/guardrailsTaskService.ts`

**Key Functions:**

```typescript
// Domain entity CRUD (no roadmap knowledge)
export async function createGuardrailsTask(
  input: CreateGuardrailsTaskInput
): Promise<GuardrailsTask>;

export async function getGuardrailsTask(
  taskId: string
): Promise<GuardrailsTask | null>;

export async function updateGuardrailsTask(
  taskId: string,
  input: UpdateGuardrailsTaskInput
): Promise<GuardrailsTask>;

export async function archiveGuardrailsTask(
  taskId: string
): Promise<GuardrailsTask>;

export async function getGuardrailsTasksByProject(
  projectId: string,
  filters?: TaskFilters
): Promise<GuardrailsTask[]>;

// Query helpers (domain semantics only)
export async function getCompletedTasksByProject(
  projectId: string,
  dateRange?: DateRange
): Promise<GuardrailsTask[]>;

export async function getOverdueTasks(projectId: string): Promise<GuardrailsTask[]>;
```

**Types:**

```typescript
export interface GuardrailsTask {
  id: string;
  masterProjectId: string;
  sideProjectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number; // 0-100
  completedAt: string | null;
  dueAt: string | null;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateGuardrailsTaskInput {
  masterProjectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  progress?: number;
  dueAt?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface UpdateGuardrailsTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  progress?: number;
  completedAt?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, any>;
}

export type TaskStatus = 
  | 'not_started' 
  | 'pending' 
  | 'in_progress' 
  | 'blocked' 
  | 'on_hold' 
  | 'completed' 
  | 'cancelled';
```

**Rule:**
> **RULE-DOMAIN-SERVICE-SCOPE**: Domain services (guardrailsTaskService, guardrailsEventService) must not know about roadmap ordering, hierarchy, or visibility. They operate on domain semantics only.

#### guardrailsEventService.ts

**Location:** `src/lib/guardrails/guardrailsEventService.ts`

**Key Functions:**

```typescript
// Domain entity CRUD
export async function createGuardrailsEvent(
  input: CreateGuardrailsEventInput
): Promise<GuardrailsEvent>;

export async function getGuardrailsEvent(
  eventId: string
): Promise<GuardrailsEvent | null>;

export async function updateGuardrailsEvent(
  eventId: string,
  input: UpdateGuardrailsEventInput
): Promise<GuardrailsEvent>;

export async function archiveGuardrailsEvent(
  eventId: string
): Promise<GuardrailsEvent>;

export async function getGuardrailsEventsByProject(
  projectId: string,
  filters?: EventFilters
): Promise<GuardrailsEvent[]>;

// Query helpers (domain semantics only)
export async function getEventsInDateRange(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<GuardrailsEvent[]>;
```

**Types:**

```typescript
export interface GuardrailsEvent {
  id: string;
  masterProjectId: string;
  sideProjectId: string | null;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  location: string | null;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateGuardrailsEventInput {
  masterProjectId: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface UpdateGuardrailsEventInput {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  metadata?: Record<string, any>;
}
```

### 5.2 Roadmap Service Changes

#### Updated Creation Flow

**When user creates a "Task" in Guardrails:**

```typescript
// High-level orchestration function (in roadmapService or new orchestration layer)
export async function createTaskWithRoadmapProjection(
  input: CreateTaskWithRoadmapInput,
  roadmapContext: RoadmapProjectionContext
): Promise<{ task: GuardrailsTask; roadmapItem: RoadmapItem }> {
  // Step 1: Create domain entity FIRST
  const task = await createGuardrailsTask({
    masterProjectId: input.masterProjectId,
    title: input.title,
    description: input.description,
    status: input.status ?? 'pending',
    dueAt: input.dueAt,
    metadata: input.metadata,
    createdBy: input.createdBy,
  });

  // Step 2: Create roadmap projection referencing domain entity
  const roadmapItem = await createRoadmapItem({
    masterProjectId: input.masterProjectId,
    trackId: roadmapContext.trackId,
    subtrackId: roadmapContext.subtrackId,
    parentItemId: roadmapContext.parentItemId,
    orderingIndex: roadmapContext.orderingIndex,
    // NEW: Reference domain entity
    entityType: 'task',
    entityId: task.id,
    // Legacy fields for compatibility (mirrored from domain)
    title: task.title,  // Temporary mirror (Phase 1 compatibility)
    status: task.status,  // Temporary mirror
    startDate: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : null,
    endDate: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : null,
    metadata: task.metadata,  // Temporary mirror
  });

  return { task, roadmapItem };
}
```

**When user creates an "Event" in Guardrails:**

```typescript
export async function createEventWithRoadmapProjection(
  input: CreateEventWithRoadmapInput,
  roadmapContext: RoadmapProjectionContext
): Promise<{ event: GuardrailsEvent; roadmapItem: RoadmapItem }> {
  // Step 1: Create domain entity
  const event = await createGuardrailsEvent({
    masterProjectId: input.masterProjectId,
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: input.timezone,
    location: input.location,
    metadata: input.metadata,
    createdBy: input.createdBy,
  });

  // Step 2: Create roadmap projection
  const roadmapItem = await createRoadmapItem({
    masterProjectId: input.masterProjectId,
    trackId: roadmapContext.trackId,
    subtrackId: roadmapContext.subtrackId,
    parentItemId: roadmapContext.parentItemId,
    orderingIndex: roadmapContext.orderingIndex,
    entityType: 'event',
    entityId: event.id,
    // Legacy mirror fields
    title: event.title,
    startDate: event.startAt ? new Date(event.startAt).toISOString().split('T')[0] : null,
    endDate: event.endAt ? new Date(event.endAt).toISOString().split('T')[0] : null,
    metadata: event.metadata,
  });

  return { event, roadmapItem };
}
```

#### Updated Edit Flow

**When user edits task/event title/description/status:**

```typescript
export async function updateTaskSemantics(
  taskId: string,
  input: UpdateGuardrailsTaskInput
): Promise<GuardrailsTask> {
  // Update domain entity
  const updatedTask = await updateGuardrailsTask(taskId, input);

  // Update roadmap mirror fields (Phase 1 compatibility)
  // In Phase 2, roadmap will read directly from domain, so this mirror can be removed
  await updateRoadmapItemMirrorForTask(taskId, updatedTask);

  return updatedTask;
}

// Helper: Mirror domain changes to roadmap (temporary Phase 1 compatibility)
async function updateRoadmapItemMirrorForTask(
  taskId: string,
  task: GuardrailsTask
): Promise<void> {
  await supabase
    .from('roadmap_items')
    .update({
      title: task.title,  // Mirror
      status: task.status,  // Mirror
      end_date: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : null,  // Mirror
      metadata: task.metadata,  // Mirror
      updated_at: task.updatedAt,
    })
    .eq('entity_type', 'task')
    .eq('entity_id', taskId);
}
```

**When user reorders/moves items (roadmap-only changes):**

```typescript
export async function updateRoadmapProjection(
  roadmapItemId: string,
  input: UpdateRoadmapProjectionInput
): Promise<RoadmapItem> {
  // Update ONLY roadmap projection fields
  // Do NOT touch domain entity
  const updated = await supabase
    .from('roadmap_items')
    .update({
      track_id: input.trackId,
      subtrack_id: input.subtrackId,
      parent_item_id: input.parentItemId,
      ordering_index: input.orderingIndex,
      visibility_state: input.visibilityState,
      include_in_roadmap: input.includeInRoadmap,
    })
    .eq('id', roadmapItemId)
    .select()
    .single();

  return updated.data;
}
```

**Rule:**
> **RULE-SERVICE-SEPARATION**: Domain services update domain semantics. Roadmap services update projection fields. Orchestration functions coordinate both but maintain clear separation. Semantic edits go to domain; visual edits go to roadmap.

---

## 6. UI: Minimal Wiring to Keep App Working

### 6.1 Roadmap Rendering (Updated)

**Current Approach:** Roadmap reads from `roadmap_items` table directly.

**Phase 1 Approach:** Roadmap reads structure from `roadmap_items` and joins domain entities for semantic fields.

#### Option A: Two Queries + Client Merge (Simple)

```typescript
export async function getRoadmapItemsWithDomainEntities(
  projectId: string,
  trackId?: string
): Promise<RoadmapItemWithEntity[]> {
  // Step 1: Get roadmap structure
  const { data: roadmapItems } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('master_project_id', projectId)
    .eq('archived_at', null)
    .order('ordering_index');

  if (!roadmapItems) return [];

  // Step 2: Fetch domain entities by type
  const tasks = roadmapItems.filter(item => item.entity_type === 'task');
  const events = roadmapItems.filter(item => item.entity_type === 'event');

  const taskIds = tasks.map(t => t.entity_id);
  const eventIds = events.map(e => e.entity_id);

  // Fetch domain entities
  const { data: domainTasks } = taskIds.length > 0
    ? await supabase
        .from('guardrails_tasks')
        .select('*')
        .in('id', taskIds)
        .is('archived_at', null)
    : { data: [] };

  const { data: domainEvents } = eventIds.length > 0
    ? await supabase
        .from('guardrails_events')
        .select('*')
        .in('id', eventIds)
        .is('archived_at', null)
    : { data: [] };

  // Step 3: Merge roadmap structure with domain entities
  const domainMap = new Map([
    ...(domainTasks || []).map(t => [t.id, { type: 'task', entity: t }]),
    ...(domainEvents || []).map(e => [e.id, { type: 'event', entity: e }]),
  ]);

  return roadmapItems.map(item => ({
    ...item,
    domainEntity: domainMap.get(item.entity_id),
  }));
}
```

#### Option B: Postgres RPC (Recommended)

**Create RPC function:**

```sql
CREATE OR REPLACE FUNCTION get_roadmap_projection(
  p_master_project_id uuid,
  p_track_id uuid DEFAULT NULL
)
RETURNS TABLE (
  -- Roadmap structure fields
  roadmap_item_id uuid,
  track_id uuid,
  subtrack_id uuid,
  parent_item_id uuid,
  ordering_index integer,
  
  -- Entity reference
  entity_type text,
  entity_id uuid,
  
  -- Domain entity fields (denormalized for performance)
  title text,
  description text,
  status text,
  start_date date,
  end_date date,
  metadata jsonb,
  
  -- Task-specific fields (null for events)
  progress integer,
  due_at timestamptz,
  
  -- Event-specific fields (null for tasks)
  start_at timestamptz,
  end_at timestamptz,
  location text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id as roadmap_item_id,
    ri.track_id,
    ri.subtrack_id,
    ri.parent_item_id,
    ri.ordering_index,
    ri.entity_type,
    ri.entity_id,
    
    -- Domain fields (from appropriate table)
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.title
      WHEN ri.entity_type = 'event' THEN ge.title
    END as title,
    
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.description
      WHEN ri.entity_type = 'event' THEN ge.description
    END as description,
    
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.status::text
      WHEN ri.entity_type = 'event' THEN NULL
    END as status,
    
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.due_at::date
      WHEN ri.entity_type = 'event' THEN ge.start_at::date
    END as start_date,
    
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.due_at::date
      WHEN ri.entity_type = 'event' THEN ge.end_at::date
    END as end_date,
    
    CASE 
      WHEN ri.entity_type = 'task' THEN gt.metadata
      WHEN ri.entity_type = 'event' THEN ge.metadata
    END as metadata,
    
    -- Task-specific
    CASE WHEN ri.entity_type = 'task' THEN gt.progress ELSE NULL END as progress,
    CASE WHEN ri.entity_type = 'task' THEN gt.due_at ELSE NULL END as due_at,
    
    -- Event-specific
    CASE WHEN ri.entity_type = 'event' THEN ge.start_at ELSE NULL END as start_at,
    CASE WHEN ri.entity_type = 'event' THEN ge.end_at ELSE NULL END as end_at,
    CASE WHEN ri.entity_type = 'event' THEN ge.location ELSE NULL END as location
    
  FROM roadmap_items ri
  LEFT JOIN guardrails_tasks gt ON ri.entity_type = 'task' AND gt.id = ri.entity_id
  LEFT JOIN guardrails_events ge ON ri.entity_type = 'event' AND ge.id = ri.entity_id
  WHERE ri.master_project_id = p_master_project_id
    AND ri.archived_at IS NULL
    AND (p_track_id IS NULL OR ri.track_id = p_track_id)
    AND (gt.archived_at IS NULL OR ge.archived_at IS NULL)
  ORDER BY ri.ordering_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**TypeScript usage:**

```typescript
export async function getRoadmapProjection(
  projectId: string,
  trackId?: string
): Promise<RoadmapProjectionRow[]> {
  const { data, error } = await supabase.rpc('get_roadmap_projection', {
    p_master_project_id: projectId,
    p_track_id: trackId || null,
  });

  if (error) throw error;
  return data || [];
}
```

**Recommendation:** Use Option B (RPC) for performance and maintainability. Avoids N+1 queries and keeps logic centralized.

### 6.2 Editing Modals

**Task Edit Modal:**

```typescript
// Component: TaskEditModal.tsx
export function TaskEditModal({ roadmapItemId, onClose }) {
  const [task, setTask] = useState<GuardrailsTask | null>(null);
  const [roadmapItem, setRoadmapItem] = useState<RoadmapItem | null>(null);

  useEffect(() => {
    // Load roadmap item to get entity reference
    loadRoadmapItem(roadmapItemId).then(item => {
      setRoadmapItem(item);
      
      // Load domain entity
      if (item.entity_type === 'task') {
        loadGuardrailsTask(item.entity_id).then(setTask);
      }
    });
  }, [roadmapItemId]);

  const handleSave = async (updates: UpdateGuardrailsTaskInput) => {
    if (!task || !roadmapItem) return;

    // Update domain entity (semantics)
    const updated = await updateGuardrailsTask(task.id, updates);
    setTask(updated);

    // Mirror updates to roadmap (Phase 1 compatibility)
    // In Phase 2, this mirror is removed
    await updateRoadmapItemMirrorForTask(task.id, updated);
  };

  const handleMove = async (newTrackId: string, newOrderingIndex: number) => {
    if (!roadmapItem) return;

    // Update roadmap projection only (structure)
    await updateRoadmapProjection(roadmapItem.id, {
      trackId: newTrackId,
      orderingIndex: newOrderingIndex,
    });
  };

  // Render form with task fields (title, description, status, progress, due date)
  // Render move/reorder controls that update roadmap only
}
```

**Event Edit Modal:** Similar pattern, update `guardrails_events` for semantics, update `roadmap_items` for structure.

**Rule:**
> **RULE-UI-SEPARATION**: UI modals must distinguish between semantic edits (update domain) and structural edits (update roadmap). Semantic fields come from domain entities; structural fields come from roadmap items.

---

## 7. Compatibility Bridge (Taskflow/Calendar)

### 7.1 Option A: Keep Legacy Mirror Fields (Recommended for Phase 1)

**Strategy:** Maintain temporary mirror fields in `roadmap_items` (title, status, dates, metadata) that are kept in sync with domain tables. This allows Taskflow and Calendar to continue reading from roadmap during Phase 1.

#### Mirror Trigger on Domain Tables

**Task mirror trigger:**

```sql
CREATE OR REPLACE FUNCTION mirror_task_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all roadmap items referencing this task
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    status = NEW.status::text,
    end_date = CASE 
      WHEN NEW.due_at IS NOT NULL THEN NEW.due_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE entity_type = 'task'
    AND entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_mirror_task_to_roadmap
  AFTER UPDATE ON guardrails_tasks
  FOR EACH ROW
  WHEN (OLD.archived_at IS NULL)
  EXECUTE FUNCTION mirror_task_to_roadmap();
```

**Event mirror trigger:**

```sql
CREATE OR REPLACE FUNCTION mirror_event_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    start_date = CASE 
      WHEN NEW.start_at IS NOT NULL THEN NEW.start_at::date 
      ELSE NULL 
    END,
    end_date = CASE 
      WHEN NEW.end_at IS NOT NULL THEN NEW.end_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE entity_type = 'event'
    AND entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_mirror_event_to_roadmap
  AFTER UPDATE ON guardrails_events
  FOR EACH ROW
  WHEN (OLD.archived_at IS NULL)
  EXECUTE FUNCTION mirror_event_to_roadmap();
```

#### Insert Mirror (on Domain Creation)

**When domain entity is created, roadmap mirror is populated by service layer** (already handled in Section 5.2 orchestration functions).

#### Archive Mirror (on Domain Archive)

```sql
-- When domain entity is archived, archive roadmap projection
CREATE OR REPLACE FUNCTION mirror_task_archive_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    UPDATE roadmap_items
    SET archived_at = NEW.archived_at
    WHERE entity_type = 'task'
      AND entity_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_mirror_task_archive_to_roadmap
  AFTER UPDATE ON guardrails_tasks
  FOR EACH ROW
  WHEN (NEW.archived_at IS DISTINCT FROM OLD.archived_at)
  EXECUTE FUNCTION mirror_task_archive_to_roadmap();
```

**Benefits:**
- ✅ Taskflow/Calendar continue working without changes
- ✅ No N+1 queries (mirror fields are in roadmap_items)
- ✅ Automatic sync via triggers (no manual sync code)
- ✅ Can be removed in Phase 2 when execution layers read from domain

**Costs:**
- ⚠️ Temporary data duplication (accepted for Phase 1)
- ⚠️ Trigger overhead (minimal, but exists)
- ⚠️ Must remember to remove mirrors in Phase 2

**Rule:**
> **RULE-COMPATIBILITY-BRIDGE**: Phase 1 maintains mirror fields in roadmap_items for Taskflow/Calendar compatibility. Mirrors are kept in sync via triggers. This is temporary debt accepted until Phase 2/3 refactors execution layers.

### 7.2 Option B: Immediate Execution Refactor (Not Recommended for Phase 1)

**Strategy:** Refactor Taskflow and Calendar to read directly from domain tables in Phase 1.

**Why Not Recommended:**
- ❌ Larger blast radius (touches execution layer code)
- ❌ More risk of breaking existing functionality
- ❌ Requires coordination across multiple systems
- ❌ Better to defer to Phase 2/3 when execution architecture is rethought

**When to Use:** Only if Option A proves unworkable or if execution layer is already being refactored for other reasons.

---

## 8. Tests & Acceptance Checks

### 8.1 Data Integrity Tests

**Test: Creating task creates domain row + roadmap reference**

```typescript
test('createTaskWithRoadmapProjection creates both domain and projection', async () => {
  const { task, roadmapItem } = await createTaskWithRoadmapProjection({
    masterProjectId: projectId,
    title: 'Test Task',
  }, {
    trackId: trackId,
    orderingIndex: 0,
  });

  // Verify domain entity exists
  const domainTask = await getGuardrailsTask(task.id);
  expect(domainTask).toBeTruthy();
  expect(domainTask.title).toBe('Test Task');

  // Verify roadmap reference
  expect(roadmapItem.entity_type).toBe('task');
  expect(roadmapItem.entity_id).toBe(task.id);

  // Verify integrity trigger works
  const invalidUpdate = supabase
    .from('roadmap_items')
    .update({ master_project_id: otherProjectId })
    .eq('id', roadmapItem.id);
  
  await expect(invalidUpdate).rejects.toThrow(); // Should fail trigger
});
```

**Test: Editing task updates domain + keeps roadmap mirror correct**

```typescript
test('updateTaskSemantics updates domain and mirrors to roadmap', async () => {
  const task = await createGuardrailsTask({ /* ... */ });
  const roadmapItem = await createRoadmapItem({ entity_type: 'task', entity_id: task.id });

  // Update domain
  const updated = await updateGuardrailsTask(task.id, { title: 'Updated Title' });

  // Wait for trigger to run
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify roadmap mirror updated
  const { data: updatedRoadmap } = await supabase
    .from('roadmap_items')
    .select('title')
    .eq('id', roadmapItem.id)
    .single();

  expect(updatedRoadmap.title).toBe('Updated Title');
});
```

**Test: Roadmap item cannot reference entity in different project**

```typescript
test('roadmap item entity must match project', async () => {
  const task = await createGuardrailsTask({ masterProjectId: project1Id });

  // Attempt to create roadmap item in different project
  const invalidCreate = supabase
    .from('roadmap_items')
    .insert({
      master_project_id: project2Id,  // Wrong project
      entity_type: 'task',
      entity_id: task.id,
    });

  await expect(invalidCreate).rejects.toThrow(); // Trigger should reject
});
```

**Test: Deleting task archives domain (and roadmap item)**

```typescript
test('archiveTask soft-deletes domain and archives roadmap', async () => {
  const task = await createGuardrailsTask({ /* ... */ });
  const roadmapItem = await createRoadmapItem({ entity_type: 'task', entity_id: task.id });

  // Archive domain entity
  await archiveGuardrailsTask(task.id);

  // Wait for trigger
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify domain archived
  const archivedTask = await getGuardrailsTask(task.id);
  expect(archivedTask.archivedAt).toBeTruthy();

  // Verify roadmap archived
  const { data: archivedRoadmap } = await supabase
    .from('roadmap_items')
    .select('archived_at')
    .eq('id', roadmapItem.id)
    .single();

  expect(archivedRoadmap.archived_at).toBeTruthy();
});
```

### 8.2 UI Acceptance Checks

**Checklist:**

- [ ] **Roadmap loads correctly for existing projects (post-migration)**
  - Existing roadmap items display with correct titles, statuses, dates
  - Hierarchy and ordering unchanged
  - No missing items or broken references

- [ ] **Creating tasks/events works**
  - New task creates domain entity and roadmap reference
  - New event creates domain entity and roadmap reference
  - Items appear in roadmap immediately
  - Domain tables contain correct data

- [ ] **Editing tasks/events works**
  - Title/description/status updates persist in domain
  - Roadmap mirror updates automatically (via trigger)
  - Changes reflected in UI immediately

- [ ] **Ordering/hierarchy unchanged**
  - Drag-and-drop reordering updates roadmap only
  - Moving items between tracks updates roadmap only
  - Domain entities unaffected by structural changes

- [ ] **Existing Taskflow still displays items**
  - Taskflow reads from roadmap_items (mirror fields)
  - Tasks appear with correct titles, statuses
  - Filtering and sorting work as before

- [ ] **Existing Calendar still displays events**
  - Calendar reads from roadmap_items (mirror fields)
  - Events appear with correct dates, titles
  - Sync rules work as before

**Rule:**
> **RULE-ACCEPTANCE-TESTS**: All tests and acceptance checks must pass before Phase 1 is considered complete. No regressions in existing functionality. Domain and roadmap separation must be verified.

---

## 9. Phase 1 "Done" Criteria

Phase 1 is complete when **all** of the following criteria are met:

### 9.1 Database Schema

- [x] `guardrails_tasks` table exists with correct schema and indexes
- [x] `guardrails_events` table exists with correct schema and indexes
- [x] `roadmap_items` has `entity_type` and `entity_id` columns
- [x] Unique constraint prevents duplicate projections
- [x] Integrity trigger enforces entity existence and project matching
- [x] All tables have appropriate RLS policies

### 9.2 Data Migration

- [x] All existing `roadmap_items` with `type='task'` have `entity_type='task'` and valid `entity_id`
- [x] All existing `roadmap_items` with `type='event'` have `entity_type='event'` and valid `entity_id`
- [x] Migration map table populated for debugging
- [x] No orphaned roadmap items (all have entity references)
- [x] No invalid entity references (all entities exist and are in correct projects)

### 9.3 Services

- [x] `guardrailsTaskService.ts` implements full CRUD on domain table
- [x] `guardrailsEventService.ts` implements full CRUD on domain table
- [x] Roadmap service creates domain-first, then roadmap reference
- [x] Semantic edits update domain entities
- [x] Structural edits update roadmap projections only
- [x] Domain services do not know about roadmap

### 9.4 UI Integration

- [x] Roadmap rendering reads domain entities (via RPC or client merge)
- [x] Task edit modal updates `guardrails_tasks`
- [x] Event edit modal updates `guardrails_events`
- [x] Reorder/move operations update `roadmap_items` only
- [x] All existing UI flows work without regression

### 9.5 Compatibility Bridge

- [x] Mirror triggers keep roadmap fields in sync with domain
- [x] Taskflow reads from roadmap_items and displays correctly
- [x] Calendar reads from roadmap_items and displays correctly
- [x] No N+1 queries introduced (mirror fields or RPC used)

### 9.6 Testing

- [x] All data integrity tests pass
- [x] All UI acceptance checks pass
- [x] No regressions in existing functionality
- [x] Integration tests verify domain-roadmap separation

### 9.7 Documentation

- [x] Phase 0 architectural rules are followed
- [x] Code comments explain domain vs roadmap separation
- [x] Migration scripts are documented and tested
- [x] Service layer separation is clear in code structure

**Rule:**
> **RULE-PHASE1-COMPLETION**: Phase 1 is not complete until all criteria are met. Partial implementations are not acceptable. System must work end-to-end with domain-roadmap separation in place.

---

## 10. Migration Execution Plan

### 10.1 Pre-Migration Checklist

- [ ] Backup database
- [ ] Run migration scripts in staging environment
- [ ] Verify all acceptance tests pass in staging
- [ ] Test rollback procedure
- [ ] Notify team of maintenance window (if needed)
- [ ] Document any custom data transformations needed

### 10.2 Migration Order

1. **Create domain tables** (non-destructive)
2. **Add roadmap reference columns** (nullable, non-breaking)
3. **Backfill domain entities** (new data, no deletes)
4. **Update roadmap items with entity references** (updates only)
5. **Add constraints and triggers** (enforce integrity going forward)
6. **Deploy service changes** (new code reads from domain)
7. **Deploy UI changes** (new UI reads from domain)
8. **Enable mirror triggers** (keep compatibility bridge working)

### 10.3 Rollback Plan

If migration fails:

1. **Disable triggers** (stop mirror operations)
2. **Clear entity references** (set `entity_type` and `entity_id` to NULL)
3. **Keep domain tables** (for data recovery, don't drop)
4. **Revert service code** (read from roadmap_items as before)
5. **Revert UI code** (read from roadmap_items as before)

Domain tables remain for investigation and potential manual data recovery.

### 10.4 Post-Migration Validation

Run all acceptance checks (Section 8.2) in production:
- Verify roadmap loads
- Verify task/event creation works
- Verify editing works
- Verify Taskflow/Calendar still work
- Monitor error logs for integrity violations

---

## Summary

Phase 1 implementation plan provides:

1. ✅ **Complete database schema** for domain tables and roadmap projection
2. ✅ **Data migration scripts** with validation and rollback
3. ✅ **Service layer architecture** with clear domain-roadmap separation
4. ✅ **UI integration patterns** for reading domain entities
5. ✅ **Compatibility bridge** to keep Taskflow/Calendar working
6. ✅ **Comprehensive testing strategy** with acceptance criteria
7. ✅ **Clear "done" criteria** with checklist

**Key Architectural Principles Enforced:**
- Domain entities own semantics and lifecycle
- Roadmap is a projection referencing domain by ID
- Services maintain clear separation of concerns
- Compatibility bridge is temporary (Phase 1 only)
- All changes are testable and reversible

**Next Steps After Phase 1:**
- Phase 2: Refactor Taskflow to read from `guardrails_tasks` directly
- Phase 3: Refactor Calendar to read from `guardrails_events` directly
- Phase 4: Remove mirror fields from `roadmap_items` (cleanup)
- Phase 5: Add Goals, Habits, and other domain entities

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Related Documents:**
- [GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md](./GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md) - Phase 0 rules (prerequisite)
- [GUARDRAILS_UNIFIED_ARCHITECTURE.md](./GUARDRAILS_UNIFIED_ARCHITECTURE.md) - Current architecture state
