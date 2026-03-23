# AI Chat Surfaces & Scope Enforcement Architecture

## Purpose

Defines **exactly six AI Chat Surfaces** with strict scoping, boundaries, and lifecycle management to ensure AI conversations are explicitly bounded and architecturally aligned with Guardrails authority domains.

**Core Principle:** No global, cross-surface, or unscoped AI chat is allowed.

---

## Overview

### The Six Canonical Surfaces

```
┌────────────────────────────────────────────────────────────────┐
│                      User's AI Chat Surfaces                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────┐                 │
│  │ Project Surface 1 │  │ Project Surface 2 │                 │
│  │ (Master Project A)│  │ (Master Project B)│                 │
│  └───────────────────┘  └───────────────────┘                 │
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────┐                 │
│  │ Project Surface 3 │  │ Project Surface 4 │                 │
│  │ (Master Project C)│  │ (Master Project D)│                 │
│  └───────────────────┘  └───────────────────┘                 │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Personal Spaces Surface                                    ││
│  │ (Scoped to consumed Guardrails data, read-only)           ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Shared Spaces Surface                                      ││
│  │ (Scoped to shared tracks and shared collaboration)        ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└────────────────────────────────────────────────────────────────┘
       MAX: 6 surfaces per user (4 project + 1 personal + 1 shared)
```

**Key Rules:**
- **Max 4 project surfaces** (one per Master Domain Project)
- **1 personal surface** (for Personal Spaces consumption)
- **1 shared surface** (for Shared Spaces visibility)
- **Total: 6 surfaces maximum per user**

---

## Surface Definitions

### 1. Project Surface

**Purpose:** Scoped to a single Master Domain Project.

**Characteristics:**
- One surface per Master Domain Project (max 4 total)
- Scoped to that project only
- Can access project-authoritative data (permission-checked)
- Can access tracks, roadmap items, mind mesh, task flow within project
- Cannot access other projects
- Cannot access Personal Spaces data
- Cannot access Shared Spaces data

**Database Schema:**
```sql
surface_type = 'project'
master_project_id = 'uuid-of-master-project' (REQUIRED)
```

**Allowed Context Data:**
- Project metadata
- Project tracks (including shared tracks that project has access to)
- Roadmap items
- Task flow tasks synced from roadmap
- Mind mesh nodes scoped to project
- People assigned to project
- Collaboration activity within project

**Forbidden Context Data:**
- Other projects' data
- Personal Spaces consumption data
- Cross-project reads without explicit permission

**Example:**
```
Surface: Project
Project: "Product Launch Q1 2025"
Conversations:
  - "What's the status of the marketing track?"
  - "Generate task list for website redesign"
  - "Show me overdue deadlines"
```

---

### 2. Personal Spaces Surface

**Purpose:** Scoped to Personal Spaces with consumed Guardrails data (read-only).

**Characteristics:**
- One surface per user (total: 1)
- Scoped to Personal Spaces only
- Can access consumed Guardrails data (read-only copies)
- Cannot mutate Guardrails authoritative state
- Cannot see collaboration activity
- Cannot access project-authoritative data

**Database Schema:**
```sql
surface_type = 'personal'
master_project_id = NULL (MUST BE NULL)
```

**Allowed Context Data:**
- Personal space consumption records
- Consumed roadmap items (read-only)
- Consumed tracks (read-only)
- Personal notes and observations
- Personal goals

**Forbidden Context Data:**
- Project-authoritative data
- Collaboration activity
- Other users' personal data
- Shared tracks

**Example:**
```
Surface: Personal
Conversations:
  - "What Guardrails items did I consume this week?"
  - "Summarize my personal progress"
  - "Show me patterns in my consumption"
```

---

### 3. Shared Spaces Surface

**Purpose:** Scoped to Shared Spaces visibility rules.

**Characteristics:**
- One surface per user (total: 1)
- Scoped to Shared Spaces only
- Can reference shared tracks and shared collaboration metadata
- No project authority
- No mutations allowed
- Respects visibility rules

**Database Schema:**
```sql
surface_type = 'shared'
master_project_id = NULL (MUST BE NULL)
```

**Allowed Context Data:**
- Shared tracks (with visibility permission)
- Shared collaboration metadata
- Shared roadmap items (read-only)
- Shared space activity logs

**Forbidden Context Data:**
- Project-authoritative data
- Personal Spaces data
- Non-shared tracks

**Example:**
```
Surface: Shared
Conversations:
  - "What shared tracks am I collaborating on?"
  - "Show me shared collaboration activity"
  - "Summarize shared space updates"
```

---

## Conversation Scoping Rules

### Database Constraints

**Every AI conversation MUST have:**

1. **surface_type** (project | personal | shared) - REQUIRED, NOT NULL
2. **master_project_id** (uuid | NULL)
   - REQUIRED for `surface_type = 'project'`
   - MUST BE NULL for `surface_type = 'personal'` or `'shared'`

**Check Constraints:**
```sql
-- Project surface requires master_project_id
CHECK (
  (surface_type = 'project' AND master_project_id IS NOT NULL)
  OR (surface_type != 'project')
)

-- Non-project surfaces must NOT have master_project_id
CHECK (
  (surface_type != 'project' AND master_project_id IS NULL)
  OR (surface_type = 'project')
)
```

**Foreign Key Constraints:**
```sql
master_project_id REFERENCES master_projects(id) ON DELETE CASCADE
```

---

### Context Assembly Must Reject

**Cross-Surface Data Access:**
- Project surface cannot read Personal Spaces data
- Personal surface cannot read project-authoritative data
- Shared surface cannot read project-authoritative data

**Cross-Project Reads:**
- Project surface A cannot read Project B's data
- No cross-project context assembly

**Surface Switching:**
- Cannot change surface_type after conversation creation
- Cannot change master_project_id after conversation creation
- Must create new conversation to switch surface

---

### Invariant Enforcement

All surface violations throw `InvariantViolationError`:

```typescript
// No conversation without surface
assertChatSurfaceRequired(conversationId, hasSurface);

// No surface switching
assertNoSurfaceSwitching(conversationId, currentSurface, requestedSurface);

// No cross-surface reads
assertNoCrossSurfaceReads(conversationSurface, dataSurface, dataType);

// No global chat
assertNoGlobalChat();

// Personal cannot access project
assertPersonalCannotAccessProject(isPersonalSurface, hasProjectAccess);
```

---

## Saved Chat Limits & Lifecycle

### Limit Rules

**Per Surface:**
- Max **10 saved conversations** per surface
- Ephemeral conversations **unlimited**

**Per User:**
- Max **6 surfaces** total (4 project + 1 personal + 1 shared)
- Effective max: **60 saved conversations** (6 surfaces × 10 per surface)

**Database Enforcement:**
```sql
CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Ephemeral chats always allowed
      is_ephemeral = true
      -- Saved chats only if under limit
      OR can_create_saved_conversation(auth.uid(), surface_type, master_project_id)
    )
  );
```

---

### Ephemeral Chats

**Characteristics:**
- `is_ephemeral = true`
- `expires_at` set to 24 hours from creation
- Do NOT count toward saved limits
- Auto-deleted after expiration
- Unlimited creation

**Lifecycle:**
```
1. User creates ephemeral chat
2. expires_at = now() + 24 hours
3. Chat usable for 24 hours
4. Auto-deleted by expire_old_ephemeral_chats() function
```

**Database Function:**
```sql
CREATE FUNCTION expire_old_ephemeral_chats()
RETURNS integer
AS $$
  DELETE FROM ai_conversations
  WHERE is_ephemeral = true
    AND expires_at < now();
$$;
```

---

### Saved Chats

**Characteristics:**
- `is_ephemeral = false`
- `expires_at = NULL`
- Persist indefinitely
- User must explicitly save them
- Count toward per-surface limit (max 10)

**Lifecycle:**
```
1. User creates saved chat
2. Check if under limit (max 10 per surface)
3. If under limit: create saved chat
4. If over limit: reject with error
```

**Converting Ephemeral to Saved:**
```sql
CREATE FUNCTION save_ephemeral_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
AS $$
  -- Check if under limit
  IF NOT can_create_saved_conversation(...) THEN
    RETURN false;
  END IF;

  -- Convert to saved
  UPDATE ai_conversations
  SET is_ephemeral = false, expires_at = NULL
  WHERE id = p_conversation_id AND user_id = p_user_id;

  RETURN true;
$$;
```

---

### Limit Exceeded Behavior

**When User Reaches Limit:**

1. New **ephemeral** chats: ✅ Always allowed
2. New **saved** chats: ❌ Rejected with clear error

**Error Message:**
```
"Maximum saved conversations limit reached for this surface (10).
 You can:
 - Create an ephemeral chat (auto-expires in 24 hours)
 - Delete an existing saved conversation
 - Archive unused conversations"
```

**No Silent Failure:**
- Clear UX feedback required
- User informed of limit
- Options provided

---

## Context Assembly Enforcement

### Surface Validation Function

```typescript
export async function validateSurfaceScope(
  scope: AIContextScope,
  surfaceType: ChatSurfaceType,
  surfaceProjectId: string | null
): Promise<{ valid: boolean; violations: string[] }> {
  const violations: string[] = [];

  // Project surface rules
  if (surfaceType === 'project') {
    if (!surfaceProjectId) {
      violations.push('Project surface requires a master_project_id');
    }

    if (scope.projectId && scope.projectId !== surfaceProjectId) {
      violations.push(`Project surface can only access its own project data`);
    }
  }

  // Personal surface rules
  if (surfaceType === 'personal') {
    if (scope.projectId) {
      violations.push('Personal surface cannot access project-authoritative data');
    }

    if (scope.includeCollaboration) {
      violations.push('Personal surface cannot access collaboration data');
    }
  }

  // Shared surface rules
  if (surfaceType === 'shared') {
    if (scope.projectId) {
      violations.push('Shared surface can only access shared tracks and shared collaboration metadata');
    }
  }

  return { valid: violations.length === 0, violations };
}
```

---

### Pre-Flight Validation

Before context assembly:

1. **Validate surface constraints:**
   ```typescript
   const validation = await validateSurfaceScope(scope, surfaceType, surfaceProjectId);
   if (!validation.valid) {
     throw new InvariantViolationError('SURFACE_SCOPE_VIOLATION', { violations });
   }
   ```

2. **Validate intent compatibility:**
   - Some intents only valid on certain surfaces
   - E.g., `create_roadmap_item` only valid on project surface

3. **Validate permission boundaries:**
   - User has access to requested surface
   - User has permission to requested data

---

### Rejection Examples

**Project Surface Attempting Personal Read:**
```typescript
// ❌ REJECTED
{
  conversationSurface: 'project',
  scope: {
    includePersonalSpaces: true  // ← VIOLATION
  }
}
// Throws: "Project surface cannot access Personal Spaces data"
```

**Personal Surface Attempting Project Read:**
```typescript
// ❌ REJECTED
{
  conversationSurface: 'personal',
  scope: {
    projectId: 'uuid-of-project'  // ← VIOLATION
  }
}
// Throws: "Personal surface cannot access project-authoritative data"
```

**Cross-Project Read:**
```typescript
// ❌ REJECTED
{
  conversationSurface: 'project',
  surfaceProjectId: 'project-A',
  scope: {
    projectId: 'project-B'  // ← VIOLATION
  }
}
// Throws: "Project surface can only access its own project data"
```

---

## UX Behavior Rules (Architecture Only)

### Surface-Aware Chat Widget

**Behavior:**
- AI widget always operates within currently active surface
- Surface clearly labeled in chat header
- Switching projects switches AI surface
- "New Chat" creates chat in current surface only

**Header Display:**
```
┌─────────────────────────────────────────┐
│ AI Chat - Project: Product Launch      │ ← Surface label
│ ─────────────────────────────────────── │
│ Scoped to this project only             │ ← Scope description
└─────────────────────────────────────────┘
```

---

### Conversation Grouping

**List View:**
```
Project Surfaces:
  ├─ Product Launch (3 conversations)
  ├─ Marketing Campaign (2 conversations)
  └─ Engineering Sprint (1 conversation)

Personal Surface:
  └─ Personal Progress (5 conversations)

Shared Spaces Surface:
  └─ Team Collaboration (2 conversations)
```

**Filtering:**
- Filter by surface type
- Filter by project (for project surfaces)
- Filter by saved vs ephemeral

---

### Surface Switching Flow

**User Action:**
```
1. User viewing Project A
2. User switches to Project B
3. AI widget automatically switches to Project B surface
4. Conversation list shows Project B conversations
5. "New Chat" creates chat in Project B surface
```

**No Cross-Surface Access:**
- Cannot continue Project A conversation in Project B
- Cannot access Project A context from Project B chat
- Must explicitly switch back to Project A

---

### Saved Chat Visibility

**Conversations Visible Only Within Their Surface:**

```
User in Project A surface:
  ✅ Can see Project A conversations
  ❌ Cannot see Project B conversations
  ❌ Cannot see Personal conversations
  ❌ Cannot see Shared conversations

User in Personal surface:
  ❌ Cannot see Project conversations
  ✅ Can see Personal conversations
  ❌ Cannot see Shared conversations
```

---

### New Chat Creation

**Flow:**
```
1. User clicks "New Chat"
2. Determine current active surface:
   - If in project view: Create project surface chat
   - If in personal view: Create personal surface chat
   - If in shared view: Create shared surface chat
3. Check saved chat limit for that surface
4. If under limit:
   - Offer "Saved" or "Ephemeral" option
5. If over limit:
   - Offer "Ephemeral" only
   - Show limit reached message
6. Create conversation with appropriate surface_type and master_project_id
```

---

## Safety & Invariants

### System Invariants (Enforced)

```typescript
export const CHAT_SURFACE_INVARIANTS = {
  NO_CONVERSATION_WITHOUT_SURFACE: true,
  NO_SURFACE_SWITCHING: true,
  NO_CROSS_SURFACE_READS: true,
  NO_GLOBAL_CHAT: true,
  NO_CROSS_PROJECT_CONTEXT: true,
  EPHEMERAL_CHATS_EXPIRE: true,
  SAVED_CHAT_LIMITS_ENFORCED: true,
  PERSONAL_CANNOT_ACCESS_PROJECT: true,
  PROJECT_SCOPED_TO_ONE_PROJECT: true,
} as const;
```

---

### Violation Handling

**All violations throw `InvariantViolationError`:**

```typescript
try {
  await buildContextWithSurfaceValidation(scope, userId, surfaceType, surfaceProjectId);
} catch (error) {
  if (error instanceof InvariantViolationError) {
    // Log violation
    console.error('[SURFACE_VIOLATION]', error.invariantName, error.context);

    // Reject request
    throw new Error(error.message);
  }
}
```

**Violations Are NOT Warnings:**
- Violations are hard errors
- Request is completely rejected
- No partial execution
- No fallback behavior

---

### Boundary Enforcement Layers

**Layer 1: Database Constraints**
- Check constraints on ai_conversations table
- Foreign key constraints
- RLS policies

**Layer 2: Service Validation**
- ChatSurfaceService.validateSurface()
- conversationService.validateConversationSurface()

**Layer 3: Context Assembly**
- validateSurfaceScope()
- buildContextWithSurfaceValidation()

**Layer 4: Invariant Assertions**
- assertChatSurfaceRequired()
- assertNoSurfaceSwitching()
- assertNoCrossSurfaceReads()
- assertNoGlobalChat()
- assertPersonalCannotAccessProject()

---

## Permission & Access Control

### Project Surface Permissions

**Requirements:**
- User must be in project_users table for master_project_id
- User must have appropriate role (viewer, contributor, admin)
- All data access respects existing RLS policies

**Validation:**
```typescript
const { data: projectAccess } = await supabase
  .from('project_users')
  .select('user_id')
  .eq('master_project_id', masterProjectId)
  .eq('user_id', userId)
  .maybeSingle();

if (!projectAccess) {
  throw new Error('User does not have access to the specified project');
}
```

---

### Personal Surface Permissions

**Requirements:**
- User owns the personal surface
- Can only access own consumed data
- Cannot access other users' personal data

**Validation:**
- RLS on personal_space_consumption: `user_id = auth.uid()`
- No cross-user reads allowed

---

### Shared Surface Permissions

**Requirements:**
- User has visibility permission for shared tracks
- Respects shared_track_visibility rules
- Cannot access non-shared data

**Validation:**
- RLS on shared tracks checks visibility
- Collaboration metadata respects surface_type

---

## Lifecycle Diagrams

### Ephemeral Chat Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Ephemeral Chat Lifecycle                 │
└─────────────────────────────────────────────────────────────┘

1. CREATE
   ├─ User clicks "New Chat" → "Ephemeral"
   ├─ is_ephemeral = true
   ├─ expires_at = now() + 24 hours
   └─ Does NOT count toward saved limit

2. USE (0-24 hours)
   ├─ User sends messages
   ├─ AI responds with context
   └─ Conversation persists

3. OPTIONAL: SAVE
   ├─ User clicks "Save Conversation"
   ├─ Check if under saved limit
   ├─ If YES:
   │  ├─ is_ephemeral = false
   │  ├─ expires_at = NULL
   │  └─ Now counts toward saved limit
   └─ If NO:
      └─ Reject with "Limit reached" error

4. EXPIRE (after 24 hours)
   ├─ Automated cleanup job runs
   ├─ DELETE FROM ai_conversations WHERE expires_at < now()
   └─ Conversation permanently deleted
```

---

### Saved Chat Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      Saved Chat Lifecycle                    │
└─────────────────────────────────────────────────────────────┘

1. CREATE
   ├─ User clicks "New Chat" → "Saved"
   ├─ Check limit: count_saved_conversations_for_surface()
   ├─ If under limit (< 10):
   │  ├─ is_ephemeral = false
   │  ├─ expires_at = NULL
   │  └─ Counts toward saved limit
   └─ If over limit (≥ 10):
      └─ Reject with error

2. USE (indefinitely)
   ├─ User sends messages
   ├─ AI responds with context
   └─ Conversation persists indefinitely

3. ARCHIVE (optional)
   ├─ User clicks "Archive"
   ├─ archived_at = now()
   ├─ Still counts toward saved limit
   └─ Hidden from default view

4. DELETE (optional)
   ├─ User clicks "Delete"
   ├─ DELETE FROM ai_conversations
   ├─ No longer counts toward saved limit
   └─ Frees up slot for new saved chat
```

---

### Surface Limit Enforcement Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Surface Limit Enforcement Flow               │
└─────────────────────────────────────────────────────────────┘

User creates new conversation:

1. Determine surface_type and master_project_id
2. Determine is_ephemeral (user choice or forced)

3. IF is_ephemeral = true:
   ├─ ALLOW (no limit check)
   ├─ Set expires_at = now() + 24 hours
   └─ CREATE conversation

4. IF is_ephemeral = false:
   ├─ CALL count_saved_conversations_for_surface(user_id, surface_type, master_project_id)
   ├─ current_count = result
   ├─ max_count = 10
   │
   ├─ IF current_count < max_count:
   │  ├─ ALLOW
   │  └─ CREATE conversation
   │
   └─ IF current_count >= max_count:
      ├─ REJECT
      └─ THROW Error("Maximum saved conversations limit reached for this surface (10)")
```

---

## Database Schema

### ai_conversations Table

```sql
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Surface Scoping (REQUIRED)
  surface_type chat_surface_type NOT NULL,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,

  -- Lifecycle Management
  is_ephemeral boolean NOT NULL DEFAULT false,
  expires_at timestamptz,

  -- Metadata
  title text,
  intent_context jsonb,
  archived_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT ai_conversations_project_surface_requires_project
    CHECK (
      (surface_type = 'project' AND master_project_id IS NOT NULL)
      OR (surface_type != 'project')
    ),

  CONSTRAINT ai_conversations_non_project_no_project_id
    CHECK (
      (surface_type != 'project' AND master_project_id IS NULL)
      OR (surface_type = 'project')
    ),

  CONSTRAINT ai_conversations_ephemeral_has_expiry
    CHECK (
      (is_ephemeral = true AND expires_at IS NOT NULL)
      OR (is_ephemeral = false)
    )
);

-- Indexes
CREATE INDEX idx_ai_conversations_surface_type
  ON ai_conversations(user_id, surface_type, is_ephemeral)
  WHERE is_ephemeral = false;

CREATE INDEX idx_ai_conversations_project_surface
  ON ai_conversations(user_id, master_project_id)
  WHERE surface_type = 'project';

CREATE INDEX idx_ai_conversations_expires_at
  ON ai_conversations(expires_at)
  WHERE is_ephemeral = true AND expires_at IS NOT NULL;
```

---

### Database Functions

```sql
-- Count saved conversations for a surface
CREATE FUNCTION count_saved_conversations_for_surface(
  p_user_id uuid,
  p_surface_type chat_surface_type,
  p_master_project_id uuid DEFAULT NULL
)
RETURNS integer;

-- Check if user can create saved conversation
CREATE FUNCTION can_create_saved_conversation(
  p_user_id uuid,
  p_surface_type chat_surface_type,
  p_master_project_id uuid DEFAULT NULL
)
RETURNS boolean;

-- Auto-expire ephemeral chats
CREATE FUNCTION expire_old_ephemeral_chats()
RETURNS integer;

-- Convert ephemeral to saved (if under limit)
CREATE FUNCTION save_ephemeral_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean;
```

---

## What This Does NOT Do

### ❌ No New AI Capabilities

**Does NOT:**
- Add new AI generation logic
- Change how AI creates drafts
- Modify AI response formatting
- Add new AI features

**Why:** This is scope enforcement only. AI capabilities are separate.

---

### ❌ No Draft Logic Changes

**Does NOT:**
- Modify draft creation logic
- Change draft application flow
- Add new draft types
- Alter draft provenance

**Why:** Drafts are separate from chat surfaces. Surfaces only control context.

---

### ❌ No Tagging Logic

**Does NOT:**
- Modify tag resolution
- Add new tag types
- Change tag parser
- Alter tag suggestions

**Why:** Tagging is separate from surface scoping.

---

### ❌ No UI Components

**Does NOT:**
- Build React components
- Add CSS styling
- Create animations
- Design layouts

**Why:** This is architecture only. UX behavior rules define expectations, but no UI is built.

---

### ❌ No Notifications

**Does NOT:**
- Send notifications for new chats
- Alert on surface switches
- Notify on limit reached
- Push draft creation alerts

**Why:** Notification system is separate (future feature).

---

### ❌ No Billing Logic

**Does NOT:**
- Charge for saved chats
- Implement subscription tiers
- Add payment integration
- Track usage for billing

**Why:** Billing is separate from surface enforcement.

---

### ❌ No Automation

**Does NOT:**
- Auto-switch surfaces
- Auto-create conversations
- Auto-save ephemeral chats
- Auto-archive old chats

**Why:** All user actions must be explicit.

---

### ❌ No Collaboration Chat

**Does NOT:**
- Add multi-user chat
- Enable chat sharing
- Create group conversations
- Allow chat collaboration

**Why:** AI conversations are single-user only. Collaboration is separate.

---

## Implementation Checklist

### Database Layer ✅

- [x] Create `chat_surface_type` enum
- [x] Add `surface_type` column to `ai_conversations`
- [x] Add `master_project_id` column
- [x] Add `is_ephemeral` column
- [x] Add `expires_at` column
- [x] Add check constraints
- [x] Create indexes
- [x] Create `count_saved_conversations_for_surface()` function
- [x] Create `can_create_saved_conversation()` function
- [x] Create `expire_old_ephemeral_chats()` function
- [x] Create `save_ephemeral_conversation()` function
- [x] Update RLS policies

---

### Type System ✅

- [x] Create `ChatSurfaceType` type
- [x] Create `ChatSurface` interface
- [x] Create `ProjectSurface` interface
- [x] Create `PersonalSurface` interface
- [x] Create `SharedSurface` interface
- [x] Create `ConversationWithSurface` interface
- [x] Create `SavedChatLimits` interface
- [x] Create `SurfaceLimitStatus` interface
- [x] Create `CreateConversationOptions` interface
- [x] Create `SurfaceValidationError` interface
- [x] Create helper functions (getSurfaceKey, isProjectSurface, etc.)

---

### Service Layer ✅

- [x] Create `ChatSurfaceService`
- [x] Implement `validateSurface()`
- [x] Implement `getSurfaceLimitStatus()`
- [x] Implement `canCreateSavedConversation()`
- [x] Implement `createConversation()`
- [x] Implement `getConversationsForSurface()`
- [x] Implement `saveEphemeralConversation()`
- [x] Implement `expireOldEphemeralChats()`
- [x] Implement `validateEntityAccess()`
- [x] Update `conversationService.createConversation()` to use surfaces
- [x] Add `validateConversationSurface()`
- [x] Add `enforceNoSurfaceSwitching()`
- [x] Add `enforceNoGlobalChat()`
- [x] Add `getConversationSurface()`

---

### Context Assembly ✅

- [x] Create `validateSurfaceScope()`
- [x] Create `buildContextWithSurfaceValidation()`
- [x] Add pre-flight validation
- [x] Reject cross-surface reads
- [x] Reject cross-project reads
- [x] Reject invalid surface combinations

---

### Invariants ✅

- [x] Add `CHAT_SURFACE_INVARIANTS` constant
- [x] Create `assertChatSurfaceRequired()`
- [x] Create `assertNoSurfaceSwitching()`
- [x] Create `assertNoCrossSurfaceReads()`
- [x] Create `assertNoGlobalChat()`
- [x] Create `assertPersonalCannotAccessProject()`
- [x] Add to `INVARIANT_REGISTRY`
- [x] Add to `INVARIANT_DOCUMENTATION`

---

### Documentation ✅

- [x] Create `AI_CHAT_SURFACES_ARCHITECTURE.md`
- [x] Document surface definitions
- [x] Document scoping rules
- [x] Document limit enforcement
- [x] Document lifecycle diagrams
- [x] Document UX behavior rules
- [x] Document safety invariants
- [x] Document "What This Does NOT Do" section

---

## Testing Strategy

### Unit Tests (Future)

**Test Surface Validation:**
```typescript
describe('validateSurfaceScope', () => {
  it('rejects project surface with wrong project_id', async () => {
    const result = await validateSurfaceScope(
      { projectId: 'project-B' },
      'project',
      'project-A'
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Project surface can only access its own project data');
  });

  it('rejects personal surface with project data', async () => {
    const result = await validateSurfaceScope(
      { projectId: 'project-A' },
      'personal',
      null
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Personal surface cannot access project-authoritative data');
  });
});
```

---

### Integration Tests (Future)

**Test Limit Enforcement:**
```typescript
describe('saved chat limits', () => {
  it('allows creating saved chat when under limit', async () => {
    // Create 9 saved chats
    for (let i = 0; i < 9; i++) {
      await createConversation({ ... }, userId, 'project', false);
    }

    // 10th should succeed
    const result = await createConversation({ ... }, userId, 'project', false);
    expect(result.success).toBe(true);
  });

  it('rejects creating saved chat when at limit', async () => {
    // Create 10 saved chats
    for (let i = 0; i < 10; i++) {
      await createConversation({ ... }, userId, 'project', false);
    }

    // 11th should fail
    const result = await createConversation({ ... }, userId, 'project', false);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum saved conversations limit reached');
  });

  it('allows unlimited ephemeral chats', async () => {
    // Create 100 ephemeral chats
    for (let i = 0; i < 100; i++) {
      const result = await createConversation({ ... }, userId, 'project', true);
      expect(result.success).toBe(true);
    }
  });
});
```

---

### End-to-End Tests (Future)

**Test Surface Switching:**
```typescript
describe('surface switching', () => {
  it('switches surface when user switches project', async () => {
    // User in Project A
    const projectA = await getActiveProject(userId);
    expect(projectA.id).toBe('project-A');

    // Create conversation in Project A
    const convA = await createConversation({ ... }, userId, 'project', false);
    const surfaceA = await getConversationSurface(convA.id, userId);
    expect(surfaceA.masterProjectId).toBe('project-A');

    // User switches to Project B
    await setActiveProject(userId, 'project-B');

    // Create conversation in Project B
    const convB = await createConversation({ ... }, userId, 'project', false);
    const surfaceB = await getConversationSurface(convB.id, userId);
    expect(surfaceB.masterProjectId).toBe('project-B');

    // Cannot access Project A conversation from Project B
    const conversations = await getConversationsForSurface(userId, 'project', 'project-B');
    expect(conversations).not.toContainEqual(expect.objectContaining({ id: convA.id }));
  });
});
```

---

## Maintenance & Operations

### Automated Cleanup Job

**Purpose:** Delete expired ephemeral chats

**Schedule:** Every hour

**Implementation:**
```typescript
// Cron job or scheduled function
async function cleanupExpiredChats() {
  const deletedCount = await ChatSurfaceService.expireOldEphemeralChats();
  console.log(`Deleted ${deletedCount} expired ephemeral chats`);
}

// Run every hour
setInterval(cleanupExpiredChats, 60 * 60 * 1000);
```

---

### Monitoring & Alerts

**Metrics to Track:**
- Total conversations per surface type
- Saved vs ephemeral ratio
- Conversations near limit per surface
- Expired chats deleted per day
- Surface validation failures

**Alerts:**
- High rate of limit-reached errors
- High rate of surface validation failures
- Ephemeral cleanup failures

---

### Admin Tools (Future)

**View User Surfaces:**
```typescript
async function getUserSurfacesAdmin(userId: string) {
  const surfaces = await ChatSurfaceService.getUserSurfacesCount(userId);
  const conversations = await ChatSurfaceService.getAllSavedConversations(userId);

  return {
    totalSurfaces: surfaces,
    conversations: conversations.map(c => ({
      id: c.id,
      surface_type: c.surface_type,
      master_project_id: c.master_project_id,
      is_ephemeral: c.is_ephemeral,
      created_at: c.created_at,
    })),
  };
}
```

---

## Conclusion

AI Chat Surfaces & Scope Enforcement provides **strict boundaries and lifecycle management** for AI conversations, ensuring:

**Key Achievements:**

✅ **Explicit Surface Scoping** - All conversations belong to one of six surfaces
✅ **Hard Limits Enforced** - Max 10 saved per surface, 6 surfaces per user
✅ **Ephemeral Lifecycle** - Auto-expiring chats that don't count toward limits
✅ **No Cross-Surface Reads** - Strict data access boundaries
✅ **No Global Chat** - All conversations scoped to authority domains
✅ **Permission-Safe** - All data access respects existing RLS policies
✅ **Invariant-Enforced** - Violations throw errors, not warnings
✅ **Audit-Ready** - All surface assignments logged

**Design Principles Maintained:**

- Conversations are explicitly scoped
- Surfaces aligned with authority domains
- Limits prevent unbounded growth
- Ephemeral chats provide unlimited experimentation
- No automation or background processing
- Clear error handling
- Full transparency

**Status: ✅ Architecture Complete**

All AI conversations are now surface-scoped with strict boundaries, lifecycle management, and hard limits enforced at the database level.
