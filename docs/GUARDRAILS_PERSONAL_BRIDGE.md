# Guardrails ↔ Personal Spaces Data Bridge Architecture

## Overview

The Guardrails ↔ Personal Spaces Data Bridge provides a **controlled, user-governed reference layer** between Guardrails project data and Personal Spaces (calendar, tasks, habits, notes, goals). This architecture enables users to explicitly surface selected Guardrails items in their personal systems without automatic sync or data leakage.

## Core Principles

### 1. Guardrails is Source of Truth
- Guardrails data remains authoritative
- Personal Spaces **reference** Guardrails items
- Personal Spaces **never mutate** Guardrails data
- One-directional awareness

### 2. Opt-In Only
- No automatic flows
- User explicitly marks items for linking
- Nothing surfaces without user action
- Defaults to isolated

### 3. Granular Control
- Per-item control
- Per-type eligibility rules
- Per-project visibility
- Per-space targeting

### 4. Reversible
- Links can be deactivated at any time
- Revocation doesn't delete history
- Reactivation possible
- Complete audit trail

### 5. Audit-Safe
- Track what was shared
- Track where it was shared
- Track when it was shared
- Track when it was revoked

## Architecture Components

### 1. Data Bridge Layer

The bridge consists of explicit link records that connect Guardrails entities to Personal Space types.

```typescript
interface PersonalLink {
  id: string;
  userId: string;
  masterProjectId: string;

  sourceType: 'track' | 'roadmap_item';
  sourceId: string;

  targetSpaceType: 'calendar' | 'tasks' | 'habits' | 'notes' | 'goals';
  targetEntityId?: string;  // Optional reference to created entity

  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
}
```

### 2. Eligibility Matrix

Not all item types can link to all personal spaces. Service-enforced rules:

| Roadmap Item Type | Calendar | Tasks | Habits | Notes | Goals |
|-------------------|----------|-------|--------|-------|-------|
| task              | ❌       | ✅    | ❌     | ✅    | ❌    |
| event             | ✅       | ❌    | ❌     | ✅    | ❌    |
| milestone         | ✅       | ❌    | ❌     | ✅    | ❌    |
| goal              | ❌       | ❌    | ❌     | ❌    | ✅    |
| habit             | ❌       | ❌    | ✅     | ❌    | ❌    |
| note              | ❌       | ❌    | ❌     | ✅    | ❌    |
| document          | ❌       | ❌    | ❌     | ✅    | ❌    |
| review            | ❌       | ❌    | ❌     | ✅    | ❌    |
| grocery_list      | ❌       | ❌    | ❌     | ❌    | ❌    |
| photo             | ❌       | ❌    | ❌     | ✅    | ❌    |

**Track Eligibility:**
- Tracks can only link to: **Notes**

### 3. Link Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                    Link States                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [No Link] ──create──> [Active Link] ──revoke──> [Revoked Link]
│                            │                              │
│                            │                              │
│                            └──────reactivate──────────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Creating a Link
1. User selects Guardrails item (track or roadmap_item)
2. User chooses target Personal Space
3. System validates eligibility
4. System checks for duplicate active links
5. System verifies project ownership
6. Link created with `is_active = true`

#### Revoking a Link
1. User selects active link
2. System sets `is_active = false`
3. System sets `revoked_at = now()`
4. Historical record preserved

#### Reactivating a Link
1. User selects revoked link
2. System sets `is_active = true`
3. System clears `revoked_at`
4. Link becomes active again

## Database Schema

### guardrails_personal_links Table

```sql
CREATE TABLE guardrails_personal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,

  source_type guardrails_source_type NOT NULL,
  source_id uuid NOT NULL,

  target_space_type personal_space_type NOT NULL,
  target_entity_id uuid,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,

  CONSTRAINT valid_revocation CHECK (
    (is_active = true AND revoked_at IS NULL) OR
    (is_active = false AND revoked_at IS NOT NULL)
  )
);
```

### Enums

```sql
CREATE TYPE guardrails_source_type AS ENUM ('track', 'roadmap_item');

CREATE TYPE personal_space_type AS ENUM (
  'calendar',
  'tasks',
  'habits',
  'notes',
  'goals'
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_gpl_user_id ON guardrails_personal_links(user_id);
CREATE INDEX idx_gpl_project_id ON guardrails_personal_links(master_project_id);
CREATE INDEX idx_gpl_source ON guardrails_personal_links(source_type, source_id);
CREATE INDEX idx_gpl_target_space ON guardrails_personal_links(target_space_type);
CREATE INDEX idx_gpl_active ON guardrails_personal_links(is_active) WHERE is_active = true;

-- Prevent duplicate active links
CREATE UNIQUE INDEX idx_gpl_unique_active_link
  ON guardrails_personal_links(source_type, source_id, target_space_type, user_id)
  WHERE is_active = true;
```

### Triggers

```sql
-- Auto-set revoked_at when deactivating
CREATE TRIGGER trigger_set_revoked_at
  BEFORE UPDATE ON guardrails_personal_links
  FOR EACH ROW
  EXECUTE FUNCTION set_revoked_at_on_deactivate();
```

## Service Layer

### personalBridgeService.ts

#### Core Functions

##### Link Management

```typescript
linkToPersonalSpace(input: CreatePersonalLinkInput): Promise<PersonalLink>
```
- Validates eligibility
- Checks project ownership
- Prevents duplicate links
- Creates active link

```typescript
unlinkFromPersonalSpace(linkId: string): Promise<PersonalLink>
```
- Sets `is_active = false`
- Sets `revoked_at = now()`
- Preserves history

```typescript
reactivateLink(linkId: string): Promise<PersonalLink>
```
- Reactivates revoked link
- Clears `revoked_at`

```typescript
updatePersonalLink(linkId: string, input: UpdatePersonalLinkInput): Promise<PersonalLink>
```
- Updates `targetEntityId` or `isActive`

```typescript
deletePersonalLink(linkId: string): Promise<void>
```
- Permanently removes link
- Use sparingly (prefer revocation)

##### Queries

```typescript
getPersonalLinksForProject(projectId: string, activeOnly?: boolean): Promise<PersonalLink[]>
```
- Get all links for a project
- Optionally filter to active only

```typescript
getPersonalLinksForUser(userId: string, activeOnly?: boolean): Promise<PersonalLink[]>
```
- Get all links for a user
- Across all their projects

```typescript
getPersonalLinksForSource(sourceType, sourceId, activeOnly?): Promise<PersonalLink[]>
```
- Get all links for a specific track or roadmap_item

```typescript
getPersonalLinksForSpace(targetSpaceType, userId, activeOnly?): Promise<PersonalLink[]>
```
- Get all links targeting a specific personal space

```typescript
isLinked(sourceType, sourceId, targetSpaceType, userId): Promise<boolean>
```
- Check if an active link exists

```typescript
getPersonalLink(linkId: string): Promise<PersonalLink | null>
```
- Get single link by ID

##### Analytics

```typescript
getPersonalLinkStatsForProject(projectId: string): Promise<PersonalLinkStats>
```
Returns:
- Total links
- Active vs revoked
- Breakdown by space type
- Breakdown by source type

```typescript
getPersonalLinkStatsForUser(userId: string): Promise<PersonalLinkStats>
```
User-level analytics across all projects

##### Eligibility

```typescript
isRoadmapItemEligibleForSpace(itemType, spaceType): boolean
```
- Check if item type can link to space

```typescript
isTrackEligibleForSpace(spaceType): boolean
```
- Check if tracks can link to space

```typescript
getEligibleSpacesForRoadmapItem(itemType): PersonalSpaceType[]
```
- Get all eligible spaces for an item type

```typescript
getEligibleSpacesForTrack(): PersonalSpaceType[]
```
- Get all eligible spaces for tracks

### Validation Rules

#### Eligibility Validation

```typescript
async function validateLinkEligibility(
  sourceType: GuardrailsSourceType,
  sourceId: string,
  targetSpaceType: PersonalSpaceType
): Promise<PersonalLinkValidationResult>
```

**Checks:**
1. Source entity exists (track or roadmap_item)
2. Source type is eligible for target space
3. If roadmap_item: item type allows this space

**Example Errors:**
```
- sourceId: Roadmap item not found
- targetSpaceType: Roadmap item type 'task' cannot be linked to 'calendar'. Not eligible.
- targetSpaceType: Tracks cannot be linked to 'habits'. Not eligible.
```

#### Ownership Validation

```typescript
async function validateProjectOwnership(
  userId: string,
  masterProjectId: string
): Promise<boolean>
```

Ensures user owns the project before creating links.

#### Duplicate Prevention

System prevents multiple active links for same source → target combination:

```sql
UNIQUE INDEX idx_gpl_unique_active_link
  ON guardrails_personal_links(source_type, source_id, target_space_type, user_id)
  WHERE is_active = true;
```

## Mind Mesh Integration

### Metadata Enrichment

Personal links can be exposed as metadata on Mind Mesh nodes:

```typescript
interface PersonalLinkMetadata {
  linkedToPersonalSpace: boolean;
  linkedSpaces: PersonalSpaceType[];
  activeLinkCount: number;
}
```

#### Functions

```typescript
getPersonalLinkMetadataForSource(sourceType, sourceId): Promise<PersonalLinkMetadata>
```

Get link metadata for a single source entity.

```typescript
enrichWithPersonalLinkMetadata<T>(items: T[], sourceType): Promise<T & PersonalLinkMetadata[]>
```

Batch enrich multiple items with link metadata.

### Example Usage

```typescript
// Enrich tracks with link metadata
const tracks = await getTracksForProject(projectId);
const enrichedTracks = await enrichWithPersonalLinkMetadata(tracks, 'track');

// Now each track has:
enrichedTracks[0].personalLinkMetadata = {
  linkedToPersonalSpace: true,
  linkedSpaces: ['notes'],
  activeLinkCount: 1,
};
```

### Mind Mesh Node Properties

When rendering Mind Mesh:
- Check `personalLinkMetadata.linkedToPersonalSpace`
- Visual indicator can show linked items
- Hover/click can reveal which spaces
- No schema changes needed

## Security & RLS

### Row Level Security Policies

#### SELECT
```sql
CREATE POLICY "Users can view own personal links"
  ON guardrails_personal_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

Users can only view links they created.

#### INSERT
```sql
CREATE POLICY "Users can create personal links for own projects"
  ON guardrails_personal_links FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_personal_links.master_project_id
      AND mp.user_id = auth.uid()
    )
  );
```

Users can only create links for projects they own.

#### UPDATE
```sql
CREATE POLICY "Users can update own personal links"
  ON guardrails_personal_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Users can only update their own links.

#### DELETE
```sql
CREATE POLICY "Users can delete own personal links"
  ON guardrails_personal_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

Users can only delete their own links.

## Usage Examples

### Creating Links

#### Link a Task to Personal Tasks
```typescript
import { linkToPersonalSpace } from '@/lib/guardrails';

await linkToPersonalSpace({
  userId: user.id,
  masterProjectId: project.id,
  sourceType: 'roadmap_item',
  sourceId: taskItem.id,
  targetSpaceType: 'tasks',
});
```

#### Link an Event to Calendar
```typescript
await linkToPersonalSpace({
  userId: user.id,
  masterProjectId: project.id,
  sourceType: 'roadmap_item',
  sourceId: eventItem.id,
  targetSpaceType: 'calendar',
  targetEntityId: calendarEventId,  // Optional: reference to created calendar event
});
```

#### Link a Habit to Personal Habits
```typescript
await linkToPersonalSpace({
  userId: user.id,
  masterProjectId: project.id,
  sourceType: 'roadmap_item',
  sourceId: habitItem.id,
  targetSpaceType: 'habits',
});
```

#### Link a Track to Notes
```typescript
await linkToPersonalSpace({
  userId: user.id,
  masterProjectId: project.id,
  sourceType: 'track',
  sourceId: track.id,
  targetSpaceType: 'notes',
});
```

### Querying Links

#### Get All Links for a Project
```typescript
const links = await getPersonalLinksForProject(projectId);

console.log(`Total links: ${links.length}`);
console.log(`Active: ${links.filter(l => l.isActive).length}`);
```

#### Check if Item is Linked
```typescript
const isLinked = await isLinked(
  'roadmap_item',
  taskId,
  'tasks',
  userId
);

if (isLinked) {
  console.log('This task is already linked to Personal Tasks');
}
```

#### Get All Calendar Links
```typescript
const calendarLinks = await getPersonalLinksForSpace(
  'calendar',
  userId,
  true  // active only
);

console.log(`You have ${calendarLinks.length} items synced to calendar`);
```

### Managing Links

#### Revoke a Link
```typescript
const revokedLink = await unlinkFromPersonalSpace(linkId);

console.log(`Link revoked at: ${revokedLink.revokedAt}`);
```

#### Reactivate a Link
```typescript
const reactivated = await reactivateLink(linkId);

console.log(`Link reactivated: ${reactivated.isActive}`);
```

#### Update Target Entity
```typescript
await updatePersonalLink(linkId, {
  targetEntityId: newCalendarEventId,
});
```

### Analytics

#### Project Statistics
```typescript
const stats = await getPersonalLinkStatsForProject(projectId);

console.log(`
  Total Links: ${stats.totalLinks}
  Active: ${stats.activeLinks}
  Revoked: ${stats.revokedLinks}

  By Space:
  - Calendar: ${stats.linksBySpace.calendar}
  - Tasks: ${stats.linksBySpace.tasks}
  - Habits: ${stats.linksBySpace.habits}
  - Notes: ${stats.linksBySpace.notes}
  - Goals: ${stats.linksBySpace.goals}
`);
```

#### User Statistics
```typescript
const userStats = await getPersonalLinkStatsForUser(userId);

console.log(`You have ${userStats.activeLinks} active links across all projects`);
```

### Eligibility Checking

#### Check What Spaces a Task Can Link To
```typescript
const eligibleSpaces = getEligibleSpacesForRoadmapItem('task');

console.log(eligibleSpaces);  // ['tasks', 'notes']
```

#### Check if Event Can Link to Calendar
```typescript
const canLink = isRoadmapItemEligibleForSpace('event', 'calendar');

console.log(canLink);  // true
```

### Error Handling

#### Validation Errors
```typescript
try {
  await linkToPersonalSpace({
    userId: user.id,
    masterProjectId: project.id,
    sourceType: 'roadmap_item',
    sourceId: taskId,
    targetSpaceType: 'calendar',  // ❌ Tasks can't link to calendar
  });
} catch (error) {
  console.error(error.message);
  // Link validation failed:
  // - targetSpaceType: Roadmap item type 'task' cannot be linked to 'calendar'. Not eligible.
}
```

#### Duplicate Link Error
```typescript
try {
  await linkToPersonalSpace(input);
} catch (error) {
  console.error(error.message);
  // An active link already exists between this roadmap_item and tasks
}
```

#### Ownership Error
```typescript
try {
  await linkToPersonalSpace({
    userId: user.id,
    masterProjectId: someoneElsesProjectId,
    ...
  });
} catch (error) {
  console.error(error.message);
  // User does not own this project
}
```

## Explicit Non-Goals

The following are **intentionally NOT implemented**:

### ❌ No Automatic Sync
- Status changes in Guardrails do NOT update Personal Spaces
- Status changes in Personal Spaces do NOT update Guardrails
- Links are **references only**, not live sync

### ❌ No UI Components
- No link toggle buttons
- No drag & drop
- No link management UI
- Pure architecture only

### ❌ No Notifications
- No alerts when links are created
- No notifications when Guardrails items update
- No email/push notifications

### ❌ No Automation Rules
- No "auto-link tasks"
- No "sync on status change"
- No background jobs
- No scheduled sync

### ❌ No Task Flow Sync
- Task Flow remains independent
- No automatic connection to Personal Tasks
- Future enhancement

### ❌ No External Calendar Integration
- No Google Calendar sync
- No iCal export
- No third-party integrations

### ❌ No Permissions System
- No sharing links with other users
- No collaborative linking
- Single-user only

## Future Extensions (Not Implemented)

### Potential Enhancements

#### 1. Bi-Directional Sync (Controlled)
```typescript
interface SyncRule {
  linkId: string;
  syncDirection: 'guardrails_to_personal' | 'personal_to_guardrails' | 'bidirectional';
  syncFields: string[];
  conflictResolution: 'source_wins' | 'target_wins' | 'manual';
}
```

#### 2. Link Groups
```typescript
interface LinkGroup {
  id: string;
  name: string;
  linkIds: string[];
  userId: string;
}
```

#### 3. Smart Link Suggestions
```typescript
interface LinkSuggestion {
  sourceId: string;
  targetSpaceType: PersonalSpaceType;
  confidence: number;
  reason: string;
}

getSuggestedLinks(userId: string): Promise<LinkSuggestion[]>
```

#### 4. Batch Operations
```typescript
bulkLinkToPersonalSpace(inputs: CreatePersonalLinkInput[]): Promise<PersonalLink[]>
bulkUnlink(linkIds: string[]): Promise<void>
```

#### 5. Link Templates
```typescript
interface LinkTemplate {
  id: string;
  name: string;
  rules: Array<{
    itemType: RoadmapItemType;
    targetSpace: PersonalSpaceType;
  }>;
}
```

## Analytics Readiness

### Queries Available

#### Most Linked Personal Spaces
```typescript
const stats = await getPersonalLinkStatsForUser(userId);
const sortedSpaces = Object.entries(stats.linksBySpace)
  .sort(([, a], [, b]) => b - a);

console.log('Most used space:', sortedSpaces[0][0]);
```

#### Link Creation Over Time
```typescript
const links = await getPersonalLinksForUser(userId, false);
const byMonth = links.reduce((acc, link) => {
  const month = link.createdAt.substring(0, 7);
  acc[month] = (acc[month] || 0) + 1;
  return acc;
}, {});
```

#### Revocation Rate
```typescript
const stats = await getPersonalLinkStatsForProject(projectId);
const revocationRate = stats.revokedLinks / stats.totalLinks;
```

#### Most Linked Item Types
```typescript
const links = await getPersonalLinksForProject(projectId);
const itemLinks = links.filter(l => l.sourceType === 'roadmap_item');

const items = await Promise.all(
  itemLinks.map(link => getRoadmapItem(link.sourceId))
);

const typeCount = items.reduce((acc, item) => {
  if (item) acc[item.type] = (acc[item.type] || 0) + 1;
  return acc;
}, {});
```

## Testing Checklist

- [x] Create link for eligible roadmap_item + space
- [x] Create link for track + notes
- [x] Reject link for ineligible combination (task → calendar)
- [x] Prevent duplicate active links
- [x] Enforce project ownership
- [x] Revoke link sets is_active=false and revoked_at
- [x] Reactivate link clears revoked_at
- [x] Get links filtered by project
- [x] Get links filtered by user
- [x] Get links filtered by space type
- [x] Check isLinked returns correct boolean
- [x] Get stats for project
- [x] Get stats for user
- [x] Get eligible spaces for item type
- [x] Enrich items with link metadata
- [x] RLS prevents cross-user access
- [x] Build passes with zero errors

## Related Documentation

- [GUARDRAILS_UNIFIED_ARCHITECTURE.md](./GUARDRAILS_UNIFIED_ARCHITECTURE.md) - Overall Guardrails design
- [ROADMAP_ITEM_TYPES_ARCHITECTURE.md](./ROADMAP_ITEM_TYPES_ARCHITECTURE.md) - Item type system
- [Personal Bridge Service](./src/lib/guardrails/personalBridgeService.ts) - Implementation
- [Core Types](./src/lib/guardrails/coreTypes.ts) - Type definitions

## Summary

The Guardrails ↔ Personal Spaces Data Bridge provides a **clean, auditable, reversible reference layer** between project work and personal systems. It enables users to **explicitly surface** selected Guardrails items in Personal Spaces without automatic sync, data mutation, or hidden complexity.

**Key Achievements:**
- Opt-in linking between Guardrails entities and Personal Spaces
- Type-specific eligibility rules enforced at service layer
- Complete audit trail of all link activity
- Reversible link activation/deactivation
- Project ownership validation
- Mind Mesh metadata enrichment ready
- Zero breaking changes
- Zero UI implementation (pure architecture)

**Philosophy:**
Users retain complete control over what flows where. Guardrails data stays protected by default. Personal Spaces can reference but never mutate. The bridge is explicit, auditable, and always reversible.
