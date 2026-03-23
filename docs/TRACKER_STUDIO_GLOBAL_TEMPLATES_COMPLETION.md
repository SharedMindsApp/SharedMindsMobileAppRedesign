# Tracker Studio: Global Templates Implementation

## Summary

Successfully implemented Global Tracker Templates (Admin-Only) using Option A approach, extending the existing `tracker_templates` table with scope-based access control rather than creating a separate table.

## Implementation Details

### 1. Database Schema Changes

**Migration**: `20250131000005_add_global_templates.sql`

**New Fields Added to `tracker_templates`**:
- `scope` (text, NOT NULL, DEFAULT 'user'): Template scope - 'user' or 'global'
- `created_by` (uuid, nullable): User who created the template (auth.uid)
- `is_locked` (boolean, NOT NULL, DEFAULT false): Prevents non-admin edits
- `published_at` (timestamptz, nullable): Timestamp when template was published (for rollout/versioning)

**Constraints**:
- `check_scope_valid`: Ensures scope is either 'user' or 'global'
- `check_global_locked`: Global templates must have `is_locked = true`
- Indexes on `scope` and `published_at` for performance

**Data Migration**:
- Existing user templates: Set `scope='user'`, `created_by=owner_id`
- Existing system templates: Set `scope='global'`, `is_locked=true`, `created_by=NULL`

### 2. RLS Policies

**Helper Function**: `is_admin_or_developer()`
- SECURITY DEFINER function that checks if current user has 'admin' or 'developer' role

**Policies**:
- **SELECT**: Everyone can see global templates, users can see their own templates
- **INSERT**: Users can create user templates, admins can create global templates
- **UPDATE**: Users can update their own unlocked templates, admins can update global templates
- **DELETE**: Users can delete their own templates, global templates cannot be deleted (archive instead)

### 3. TypeScript Types

**Updated `TrackerTemplate` interface**:
- Added `scope: TrackerTemplateScope` ('user' | 'global')
- Added `created_by: string | null`
- Added `is_locked: boolean`
- Added `published_at: string | null`

**New Type**:
- `TrackerTemplateScope`: Union type for 'user' | 'global'

### 4. Service Layer

**Updated Functions**:
- `createTemplate()`: Now supports optional `scope` parameter (defaults to 'user', only admins can set 'global')
- `listTemplates()`: Returns both global templates (visible to all) and user templates (visible to owner)
- `getTemplate()`: Works for both global and user templates (RLS handles access)
- `updateTemplate()`: Checks permissions based on scope (global = admin only, user = owner only if not locked)
- `archiveTemplate()`: Checks permissions based on scope

**New Functions**:
- `createGlobalTemplate()`: Admin-only function to create global templates
- `updateGlobalTemplate()`: Admin-only function to update global templates
- `archiveGlobalTemplate()`: Admin-only function to archive global templates
- `promoteTemplateToGlobal()`: Admin-only function to promote user templates to global
- `duplicateTemplate()`: Allows users to copy global templates (or any template) to their personal templates

**Helper Function**:
- `resolveNameConflict()`: Handles name conflicts when duplicating templates (appends (1), (2), etc.)

### 5. Admin Utilities

**New Function in `adminUtils.ts`**:
- `isCurrentUserAdminOrDeveloper()`: Checks if current user has 'admin' or 'developer' role

### 6. UI Changes

**TrackerTemplatesPage Updates**:
- Split templates into two sections:
  - **Featured Templates (Global)**: Shows all global templates with "Featured" badge
  - **My Templates**: Shows user's own templates
- Admin-only "Create Global Template" button in Featured section
- Template cards show different actions based on scope:
  - Global templates: "Create Tracker", "Duplicate" buttons
  - User templates: "Create Tracker", "Share" (if owner), "Promote to Global" (if admin), "Archive" buttons
- Lock badge shown on global templates

**New Page**: `CreateGlobalTemplatePage.tsx`
- Admin-only page for creating global templates
- Similar UI to `CreateTrackerFromScratchPage` but creates a template instead of a tracker
- Automatically sets `scope='global'`, `is_locked=true`, `published_at=now()`
- Redirects non-admin users back to templates page

**New Route**: `/tracker-studio/templates/create-global`
- Protected route for creating global templates (admin check in component)

### 7. User Features

**Duplicate Template**:
- Users can duplicate any template (global or user) to their personal templates
- Creates a new user-owned template with same structure
- Handles name conflicts automatically
- Accessible via "Duplicate" button on global templates

**Promote to Global** (Admin Only):
- Admins can promote their own user templates to global
- Template becomes locked and visible to all users
- Ownership moves to system (owner_id = NULL)
- Confirmation dialog before promotion

## Access Control Summary

### Regular Users
- ✅ Can view global templates
- ✅ Can create trackers from global templates
- ✅ Can duplicate global templates to personal templates
- ❌ Cannot create or modify global templates
- ❌ Cannot overwrite or modify global original

### Admins / Developers
- ✅ Can create templates directly as global
- ✅ Can promote existing templates to global
- ✅ Can edit global templates
- ✅ Can archive global templates
- ✅ Can manage all template operations

## Validation Checklist

✅ Admin can create global template
✅ Global templates visible to all users
✅ Users cannot edit global templates
✅ Users can duplicate global template to personal
✅ Trackers created from global templates work normally
✅ No data is ever shared via templates (structure only)
✅ Existing user templates remain unaffected
✅ Promotion flow works correctly
✅ Archive flow works correctly
✅ Name conflicts handled safely

## Architecture Principles Maintained

- **Templates never contain data**: Global templates are structure-only, just like user templates
- **Single source of truth**: One `tracker_templates` table with scope-based access
- **RLS enforcement**: All access control at database level
- **Service-layer validation**: Additional checks in service layer for admin operations
- **Backward compatibility**: Existing templates migrated correctly, old fields still supported

## Future Enhancements (Not Implemented)

- Template versioning (version number, deprecated_at, supersedes_template_id)
- Template marketplace browsing
- Ratings / comments
- Paid templates
- User-submitted global templates
- Data migration between template versions

## Files Modified/Created

**Migrations**:
- `supabase/migrations/20250131000005_add_global_templates.sql`

**TypeScript Types**:
- `src/lib/trackerStudio/types.ts`

**Services**:
- `src/lib/trackerStudio/trackerTemplateService.ts`
- `src/lib/admin/adminUtils.ts`

**UI Components**:
- `src/components/tracker-studio/TrackerTemplatesPage.tsx`
- `src/components/tracker-studio/CreateGlobalTemplatePage.tsx` (new)

**Routes**:
- `src/App.tsx`

## Notes

- The implementation uses `is_system_template` for backward compatibility but `scope` is the authoritative field
- Global templates are always locked (`is_locked = true`)
- The `created_by` field tracks who created the template (useful for global templates created by admins)
- The `published_at` field is set automatically for global templates but can be customized for rollout control
