# Global People Directory Architecture

## Overview

The Global People Directory introduces a canonical identity layer for people across the Guardrails system. This architecture separates **identity** (who someone is) from **membership** (their involvement in specific projects).

## Core Principles

### 1. People ≠ Users

- People are **informational entities**, not system accounts
- No authentication, permissions, or access control
- No invitations or email workflows
- People represent collaborators, team members, or stakeholders in projects

### 2. Global Identity, Local Membership

- **Global Identity**: One canonical person record across all projects
- **Local Membership**: Project-specific participation with roles and assignments
- A person can participate in multiple projects with different roles

### 3. Backward Compatibility

- All existing assignments and relationships preserved
- No breaking changes to Roadmap, Mind Mesh, or Task Flow
- Existing queries continue to work

### 4. Future-Proofing

- Architecture supports future conversion: Person → User
- Clean path for adding authentication later
- No implementation of auth or billing now

## Data Model

### Global People Table

**Purpose**: Canonical identity store

```sql
CREATE TABLE global_people (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Features**:
- Globally unique email (when present)
- Deduplication by email
- Soft-delete support via `archived`
- No project association

### Project People Table (Refactored)

**Purpose**: Project membership and roles

```sql
ALTER TABLE project_people ADD COLUMN global_person_id uuid NOT NULL REFERENCES global_people(id);
```

**Key Features**:
- References `global_people` for identity
- Contains project-specific metadata (role, archived)
- Maintains denormalized `name` and `email` for backward compatibility
- Service layer keeps fields in sync

### Assignments (Unchanged)

**Purpose**: Link people to roadmap items

```sql
CREATE TABLE roadmap_item_assignees (
  id uuid PRIMARY KEY,
  roadmap_item_id uuid REFERENCES roadmap_items(id),
  person_id uuid REFERENCES project_people(id),
  assigned_at timestamptz DEFAULT now()
);
```

**Key Features**:
- Still references `project_people` (membership), not `global_people` (identity)
- Assignment resolution: Roadmap Item → Project Person → Global Person
- No changes to assignment logic or semantics

## Data Flow

### Creating a Person in a Project

```
User creates person → Check for existing global_person by email
                    ↓
            Found? → Link to existing
                    ↓
         Not Found? → Create new global_person
                    ↓
            Create project_people record
```

### Updating a Person

```
Update project_people
        ↓
Update global_people (name, email)
        ↓
Sync denormalized fields in project_people
```

### Assignment Resolution

```
roadmap_item_assignees.person_id → project_people.id
                                          ↓
                            project_people.global_person_id → global_people.id
```

## Service Layer

### globalPeopleService.ts

**Responsibilities**:
- Create, update, archive global people
- Search by name or email
- Deduplication detection
- Fetch all projects a person belongs to (read-only)

**Key Functions**:
- `createGlobalPerson(input)` - Create new global identity
- `updateGlobalPerson(id, input)` - Update identity
- `findGlobalPersonByEmail(email)` - Find by email
- `searchGlobalPeople(query)` - Search by name/email
- `getGlobalPersonWithProjects(id)` - Get person with project memberships
- `findOrCreateGlobalPerson(name, email)` - Dedupe helper

### peopleService.ts (Refactored)

**Responsibilities**:
- Treat people as project memberships
- Resolve identity via `global_people`
- Sync denormalized fields
- Provide enriched views

**Key Functions**:
- `createPerson(input)` - Create project membership (auto-links to global_person)
- `updatePerson(id, input)` - Update membership and sync with global_person
- `getPeopleByProject(projectId)` - Get project members
- `getPersonWithGlobalIdentity(id)` - Get enriched person with global data
- `checkPersonExistsInProject(projectId, globalPersonId)` - Check if person already in project

## UI Implementation

### People Page (`/guardrails/people`)

**Features**:
- Lists all people in the active project
- Shows name, role, email, assignment count
- Archive/unarchive people
- View assignments (read-only)

**No Changes**: Existing functionality preserved

### Add/Edit Person Modal

**New Features**:
- **Search Existing People**: Search global directory when adding
- **Reuse Existing**: Select from search results to reuse identity
- **Create New**: Option to create fresh person
- **Duplicate Detection**: Prevents adding same global person twice
- **Visual Feedback**: Shows when reusing vs creating

**Behavior**:
- When adding: Search first, or create new
- When editing: Updates both project membership and global identity
- Email changes propagate to global_people
- Name changes propagate to global_people

## Migration Strategy

### Phase 1: Create Global People Table

```sql
CREATE TABLE global_people (...);
```

### Phase 2: Link and Migrate

```sql
ALTER TABLE project_people ADD COLUMN global_person_id uuid;

-- Migrate existing records
FOR EACH project_people:
  IF email exists:
    Find or create global_person by email
  ELSE:
    Create new global_person
  Link project_people to global_person

ALTER TABLE project_people ALTER COLUMN global_person_id SET NOT NULL;
```

### Phase 3: Service Layer Updates

- Refactor `peopleService` to use `global_person_id`
- Create `globalPeopleService`
- Update types in `coreTypes.ts`

### Phase 4: UI Updates

- Add search to Add Person modal
- Show reuse vs create options
- Preserve all existing views

## Deduplication Logic

### By Email

```typescript
async function findOrCreateGlobalPerson(name: string, email?: string) {
  if (email) {
    const existing = await findGlobalPersonByEmail(email);
    if (existing) return existing;
  }
  return createGlobalPerson({ name, email });
}
```

**Rules**:
- Email match = reuse identity
- No email = always create new
- Case-insensitive email matching
- Unique constraint enforced at database level

### By Search

```typescript
// User-initiated search in Add Person modal
const results = await searchGlobalPeople(query);
// Returns matching global_people by name or email
```

**Rules**:
- User explicitly selects from results
- System checks if already in project
- Prevents duplicate project memberships

## Security & RLS

### Global People

```sql
-- Read: All authenticated users
POLICY "Authenticated users can view global people"
  ON global_people FOR SELECT
  USING (archived = false);

-- Write: All authenticated users (enforced via service layer)
POLICY "Authenticated users can create/update global people"
  ON global_people FOR INSERT/UPDATE
  WITH CHECK (true);
```

### Project People

```sql
-- Read/Write: Project owners only
POLICY "Users can manage people in their projects"
  ON project_people
  USING (project.user_id = auth.uid());
```

### Assignments

```sql
-- Read/Write: Project owners only (via roadmap_items)
POLICY "Users can manage assignments in their projects"
  ON roadmap_item_assignees
  USING (roadmap_item.project.user_id = auth.uid());
```

## Future Extensions

### User Account Binding

```sql
-- Future: Link global_people to auth.users
ALTER TABLE global_people ADD COLUMN user_id uuid REFERENCES auth.users(id);
```

**Use Cases**:
- Convert collaborator → authenticated user
- Grant project access to people
- Enable self-service profile management

### Cross-Project Insights

```sql
-- Future: Analytics across projects
SELECT gp.name, COUNT(DISTINCT pp.master_project_id) as project_count
FROM global_people gp
JOIN project_people pp ON pp.global_person_id = gp.id
GROUP BY gp.id;
```

### Invitation System

```sql
-- Future: Invite people to projects
CREATE TABLE project_invitations (
  id uuid PRIMARY KEY,
  master_project_id uuid REFERENCES master_projects(id),
  global_person_id uuid REFERENCES global_people(id),
  status text CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at timestamptz DEFAULT now()
);
```

## Constraints & Validations

### Database

- `global_people.email` - UNIQUE when present
- `global_people.name` - NOT NULL, length > 0
- `project_people.global_person_id` - NOT NULL, references `global_people(id)`
- Email validation regex at database level

### Service Layer

- Name cannot be empty
- Email format validated
- Duplicate project membership prevented
- Sync between `project_people` and `global_people` enforced

### UI

- Search requires 2+ characters
- Duplicate detection before adding
- Clear feedback when reusing vs creating
- Disabled fields when reusing global person

## Testing Checklist

- [ ] Create new person without email (creates new global_person)
- [ ] Create new person with email (creates new global_person)
- [ ] Create second person with same email (reuses global_person)
- [ ] Search for existing person (finds across projects)
- [ ] Select existing person (reuses in current project)
- [ ] Prevent duplicate: try adding same global_person twice
- [ ] Update person name (syncs to global_people)
- [ ] Update person email (syncs to global_people)
- [ ] Archive person (only in project, not global)
- [ ] View assignments (resolves through global_person_id)
- [ ] All existing assignment queries work
- [ ] Migration completes without data loss

## Non-Goals (Explicitly NOT Implemented)

- ❌ Authentication
- ❌ User accounts
- ❌ Invitations or emails
- ❌ Permissions or access control
- ❌ Billing or subscriptions
- ❌ Notifications
- ❌ Household or Spaces integration
- ❌ Task enforcement based on assignments

## Success Criteria

✅ One canonical person identity across Guardrails
✅ Project-scoped roles and assignments preserved
✅ Architecture supports multi-project participation
✅ Future auth-bound users supported (not implemented)
✅ Build passes with zero errors
✅ No breaking UI changes
✅ All existing queries work
✅ Migration completes cleanly

## Related Documentation

- [GUARDRAILS_UNIFIED_ARCHITECTURE.md](./GUARDRAILS_UNIFIED_ARCHITECTURE.md) - Overall system design
- [People Management UI](./src/components/guardrails/people/) - UI implementation
- [globalPeopleService.ts](./src/lib/guardrails/globalPeopleService.ts) - Global identity service
- [peopleService.ts](./src/lib/guardrails/peopleService.ts) - Project membership service
- [coreTypes.ts](./src/lib/guardrails/coreTypes.ts) - Type definitions
