# Tracker Studio: Phase 3 - Template Sharing via Links

## Completion Summary

This document summarizes the completion of Phase 3 Prompt 2: Template Sharing via Links for Tracker Studio.

## Objectives Achieved

✅ **Database Schema**: Created `tracker_template_links` table for share links  
✅ **RLS Policies**: Secure access control for link creation, viewing, and usage  
✅ **Service Layer**: Complete CRUD operations for template links  
✅ **Share Link UI**: Modal for generating and managing share links  
✅ **Import Preview Page**: Public preview and import flow  
✅ **Name Conflict Resolution**: Safe handling of duplicate template names  

## Implementation Details

### 1. Database Schema

**File**: `supabase/migrations/20250131000004_create_tracker_template_links.sql`

**Table**: `tracker_template_links`
- `id`: Primary key
- `template_id`: Foreign key to `tracker_templates`
- `created_by`: User who created the link (auth.users.id)
- `share_token`: Unique, unguessable 32-character token
- `expires_at`: Optional expiry date (NULL = never expires)
- `max_uses`: Optional maximum imports (NULL = unlimited)
- `use_count`: Number of times link has been used
- `revoked_at`: Soft delete timestamp
- `created_at`: Creation timestamp

**Constraints**:
- `share_token` is unique
- `max_uses` must be positive if set
- `use_count` must be non-negative

**Indexes**:
- Unique index on `share_token` (active links only)
- Index on `template_id` (for listing)
- Index on `created_by` (for owner queries)

### 2. RLS Policies

**Link Management** (Owner Only):
- `Template owners can create links`: Only template owner can create links
- `Template owners can view their links`: Only owner can list links
- `Template owners can revoke their links`: Only owner can revoke

**Link Usage** (Token-Based):
- `Token holders can read active links`: Anyone with valid token can read link metadata
- Template access via tokens uses `get_template_by_share_token()` SECURITY DEFINER function (bypasses RLS)

**Helper Function**:
- `get_template_by_share_token(p_token)`: SECURITY DEFINER function that validates token and returns template (bypasses RLS)

### 3. Service Layer

**File**: `src/lib/trackerStudio/trackerTemplateLinkService.ts`

**Functions**:

1. **`createTemplateShareLink(input)`**
   - Validates template exists and user owns it
   - Generates secure 32-character token
   - Creates link with optional expiry and max uses
   - Returns link with share token

2. **`revokeTemplateShareLink(linkId)`**
   - Validates user created the link
   - Soft deletes link (sets `revoked_at`)

3. **`getTemplateLinkByToken(token)`**
   - Validates link is active (not revoked, not expired, not maxed out)
   - Returns template preview (structure only, no data)
   - Public access (no ownership check)

4. **`importTemplateFromToken(token)`**
   - Validates link is active
   - Increments `use_count` (optimistic locking)
   - Resolves name conflicts
   - Creates new template copy owned by importer
   - Returns imported template

5. **`listTemplateShareLinks(templateId)`**
   - Validates user owns template
   - Returns all links (active and revoked)

**Name Conflict Resolution**:
- Checks if base name is available
- If not, tries "Name (1)", "Name (2)", etc.
- Falls back to "Name (timestamp)" if needed
- Ensures unique names per user

### 4. Share Link UI

**File**: `src/components/tracker-studio/TemplateShareLinkModal.tsx`

**Features**:
- Create new share link with:
  - Optional expiry (days)
  - Optional max uses
- List existing links with:
  - Active/Inactive status
  - Use count and max uses
  - Expiry date
  - Creation date
- Copy link to clipboard
- Revoke links
- Visual indicators for:
  - Active links (green badge)
  - Revoked links (gray, with "Revoked" label)
  - Expired links (red label)
  - Max uses reached (red label)

**File**: `src/components/tracker-studio/TrackerTemplatesPage.tsx`
- Added "Share" button to user templates (owner only)
- Opens `TemplateShareLinkModal` when clicked
- Only visible for template owner

### 5. Import Preview Page

**File**: `src/components/tracker-studio/TemplateImportPage.tsx`

**Route**: `/tracker-studio/templates/import/:token`

**Features**:
- Displays template preview:
  - Name and description
  - Entry granularity
  - Field list with types
  - Field validation rules (if any)
- Shows import information:
  - What happens when importing
  - Structure-only (no data)
  - Creates copy owned by importer
- "Import Template" button
- Error handling for:
  - Invalid token
  - Revoked link
  - Expired link
  - Max uses reached
  - Archived template

**File**: `src/App.tsx`
- Added route for template import page

## Architecture Principles Maintained

✅ **Templates never contain data** (structure only)  
✅ **Import always creates a copy** (new template record)  
✅ **No permissions over original** (importer owns copy)  
✅ **Token-based access** (unguessable, secure)  
✅ **Service-level validation** (all checks in services)  
✅ **RLS at database level** (defense in depth)  

## Security Features

1. **Unguessable Tokens**: 32-character alphanumeric random tokens
2. **Expiry Support**: Links can expire after set number of days
3. **Max Uses**: Links can be limited to N imports
4. **Revocation**: Owners can revoke links immediately
5. **Soft Delete**: Revoked links are soft-deleted (can be restored if needed)
6. **Optimistic Locking**: Use count increment uses optimistic locking to prevent race conditions
7. **RLS Enforcement**: Database-level policies prevent unauthorized access

## Quality Checks

✅ **Template owner can generate a share link**  
✅ **Link opens a preview without requiring special access** (via token)  
✅ **Import creates a new user-owned template copy**  
✅ **Imported template contains zero data** (structure only)  
✅ **Name conflicts handled safely** ("Name", "Name (1)", etc.)  
✅ **Revoked links stop working**  
✅ **Expired links stop working**  
✅ **Max-use links stop working after limit**  
✅ **No coupling between original and imported templates**  

## Files Created

1. `supabase/migrations/20250131000004_create_tracker_template_links.sql`
2. `src/lib/trackerStudio/trackerTemplateLinkService.ts`
3. `src/components/tracker-studio/TemplateShareLinkModal.tsx`
4. `src/components/tracker-studio/TemplateImportPage.tsx`
5. `docs/TRACKER_STUDIO_PHASE3_TEMPLATE_SHARING_COMPLETION.md` (this file)

## Files Modified

1. `src/components/tracker-studio/TrackerTemplatesPage.tsx` - Added share button
2. `src/App.tsx` - Added import route

## Usage

### Sharing a Template

1. Navigate to Tracker Templates page
2. Click "Share" button on a user template (owner only)
3. Optionally set expiry (days) and max uses
4. Click "Create Link"
5. Link is automatically copied to clipboard
6. Share link with others

### Importing a Template

1. Open share link: `/tracker-studio/templates/import/:token`
2. Preview template structure (name, description, fields)
3. Click "Import Template"
4. Template is copied to user's templates
5. Redirected to templates page
6. Can now create trackers from imported template

### Managing Share Links

1. Open share modal for a template
2. View all existing links
3. Copy link URL
4. Revoke links (stops working immediately)
5. See use count and status

## Link States

- **Active**: Not revoked, not expired, not maxed out
- **Revoked**: Owner revoked the link
- **Expired**: Past expiry date
- **Max Uses Reached**: Use count >= max uses

## Next Steps (Out of Scope)

The following are explicitly deferred:
- Template marketplace browsing
- Community uploads / moderation
- Ratings / comments
- Sharing trackers via links (already have direct sharing)
- Including tracker instance data in template sharing
- Calendar integration
- Analytics

## Notes

- Tokens are 32 characters, alphanumeric, cryptographically random
- Links work for authenticated users (AuthGuard on route)
- Import always creates version 1 template (fresh start)
- Name conflicts resolved automatically
- No metadata stored about import source (per requirements)
- Template structure is copied exactly (field_schema, entry_granularity)
- Imported templates are completely independent from originals
