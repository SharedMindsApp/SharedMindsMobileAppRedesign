# Unified Permissions Management System

## Summary

This document describes the implementation of a comprehensive, unified permissions management system that applies consistently across all modules:
- Guardrails (projects, roadmap items, tracks, subtracks, offshoot ideas, side projects, mind mesh nodes)
- Planner + Personal Spaces (personal calendar + events + projections)
- Shared Spaces (shared calendar + shared items)
- Trips (trip context, container, nested itinerary)

## Core Principles

### Non-Negotiable Principles

1. **Users control permissions. Calendar type does NOT imply permission.**
2. **Linking ≠ sharing.**
3. **Container projection ≠ nested projection.**
4. **Visibility + editability are separate.**
5. **Every view model must return explicit permission flags** (can_view/can_edit/can_manage + detail_level + scope).
6. **Everything should be shareable via ONE UI pattern.**

## Architecture

### 1. Canonical Permission Types

**File:** `src/lib/permissions/types.ts`

Defines canonical primitives used everywhere:

- `PermissionRole`: 'owner' | 'editor' | 'commenter' | 'viewer'
- `PermissionAccess`: 'view' | 'comment' | 'edit' | 'manage'
- `DetailLevel`: 'overview' | 'detailed'
- `ShareScope`: 'this_only' | 'include_children'
- `PermissionSubjectType`: 'user' | 'contact' | 'group' | 'space' | 'link'
- `PermissionFlags`: Complete permission object with all flags

**Helper Functions:**
- `roleToFlags(role)`: Maps role to permission flags
- `flagsToRoleApprox(flags)`: Approximates flags to role
- `hasAccess(flags, access)`: Checks if flags allow access
- `mergePermissionFlags(parent, child)`: Merges for inheritance

### 2. Universal Sharing Drawer UI

**File:** `src/components/sharing/SharingDrawer.tsx`

A reusable UI component that works via adapters:

- **Slide-over drawer** (mobile friendly)
- **Tabs:** Access | Visibility | Invites
- **Search input** to add people (contacts + users) and groups/spaces
- **Per-grantee controls:**
  - Role dropdown (owner/editor/commenter/viewer)
  - Detail dropdown (overview/detailed)
  - Scope dropdown (this_only/include_children)
  - Remove access button
- **Effective access summary** at top

**Adapter-Driven:**
- No hardcoded entity types
- Works via `ShareAdapter` interface
- Same UI pattern for all entities

### 3. Share Adapter Interface

**File:** `src/lib/permissions/adapter.ts`

Generic interface for sharing any entity:

```typescript
interface ShareAdapter {
  entityType: string;
  entityId: string;
  getEntityTitle(): Promise<string>;
  listGrants(): Promise<PermissionGrantWithDisplay[]>;
  upsertGrant(input): Promise<void>;
  revokeGrant(subject_type, subject_id): Promise<void>;
  previewScopeImpact?(scope): Promise<{ affected_count: number; sample: string[] }>;
  canManagePermissions(): Promise<boolean>;
}
```

**Adapter Registry:**
- Central registry for all adapters
- Accessed via `adapterRegistry.get(entityType, entityId)`

### 4. Contacts + Groups Foundation

**Database Tables:**
- `contacts`: User-owned contacts (can link to auth.users)
- `contact_groups`: User-owned groups of contacts
- `contact_group_members`: Many-to-many relationship

**Services:**
- `src/lib/contacts/contactsService.ts`: CRUD + search
- `src/lib/contacts/groupsService.ts`: CRUD + membership

**Features:**
- Search contacts by name/email
- "Invite by email" placeholder contact creation
- Group management for bulk sharing

### 5. Permission Flags in View Models

**Updated Calendar View Models:**
- `PersonalCalendarEvent`: Includes `permissions?: PermissionFlags`
- `ContainerCalendarBlock`: Includes `permissions: PermissionFlags`
- `NestedCalendarItem`: Includes `permissions: PermissionFlags`

**Service Layer Enforcement:**
- Filter by `can_view` (service layer, not UI)
- Filter nested events by `scope` (service layer)
- Strip detail fields by `detail_level` (service layer)
- Block mutations by `can_edit` (service layer)

### 6. Implemented Adapters

#### Trip Adapter
**File:** `src/lib/permissions/adapters/tripAdapter.ts`

- Uses context projections for permissions
- Supports container and nested event sharing
- Maps `nested_scope` to `ShareScope`
- Preview shows nested itinerary items count

#### Guardrails Project Adapter
**File:** `src/lib/permissions/adapters/guardrailsProjectAdapter.ts`

- Maps `project_users` roles to canonical roles
- Supports `include_children` scope (tracks/roadmap items)
- Preview shows affected tracks and items count

## Files Created/Modified

### New Files

**Permission System:**
- `src/lib/permissions/types.ts` - Canonical permission types
- `src/lib/permissions/adapter.ts` - ShareAdapter interface
- `src/lib/permissions/adapters/tripAdapter.ts` - Trip adapter
- `src/lib/permissions/adapters/guardrailsProjectAdapter.ts` - Guardrails adapter
- `src/lib/permissions/adapters/index.ts` - Adapter registry

**Contacts System:**
- `supabase/migrations/20260103000010_create_contacts_and_groups.sql` - Database tables
- `src/lib/contacts/contactsService.ts` - Contacts service
- `src/lib/contacts/groupsService.ts` - Groups service

**UI:**
- `src/components/sharing/SharingDrawer.tsx` - Universal sharing drawer

### Modified Files

**Calendar Services:**
- `src/lib/contextSovereign/types.ts` - Re-export canonical PermissionFlags
- `src/lib/contextSovereign/containerCalendarService.ts` - Use PermissionFlags
- `src/lib/personalSpaces/calendarService.ts` - Use PermissionFlags

## Usage

### Opening Sharing Drawer

```typescript
import { SharingDrawer } from '../components/sharing/SharingDrawer';
import { adapterRegistry } from '../lib/permissions/adapter';

// Get adapter
const adapter = adapterRegistry.get('trip', tripId);

// Open drawer
<SharingDrawer
  adapter={adapter}
  isOpen={isSharingOpen}
  onClose={() => setIsSharingOpen(false)}
/>
```

### Creating a New Adapter

```typescript
import { ShareAdapter } from '../lib/permissions/adapter';
import { adapterRegistry } from '../lib/permissions/adapter';

class MyEntityAdapter implements ShareAdapter {
  entityType = 'my_entity';
  entityId: string;
  
  // Implement all required methods
  // ...
}

// Register
adapterRegistry.register('my_entity', (id) => new MyEntityAdapter(id));
```

## Next Steps

### Pending: Wire Share Buttons into UI

Add Share buttons in:
- TripDetailPage
- Guardrails Project header (or settings)
- Roadmap item modal
- Track/subtrack panel (at least track level first)
- Personal calendar event details modal (personal events)

**Example:**
```typescript
<button onClick={() => setIsSharingOpen(true)}>
  Share
</button>
```

## Safety & Compatibility

- ✅ Additive changes only (no breaking existing behavior)
- ✅ Feature-flag any new permission enforcement if needed
- ✅ Do not refactor existing modules wholesale; use adapters
- ✅ Do not invent new permission systems per module
- ✅ Backward compatible with existing trips/projects
- ✅ No auto-sharing or implicit permissions

## Verification Checklist

- [x] Canonical permission types defined
- [x] Universal SharingDrawer UI component created
- [x] ShareAdapter interface defined
- [x] Contacts + Groups database and services created
- [x] Permission flags added to calendar view models
- [x] Trip adapter implemented
- [x] Guardrails Project adapter implemented
- [x] Adapters registered in registry
- [ ] Share buttons wired into UI (pending)
- [ ] Testing and validation (pending)

