# Mind Mesh Duplicate Container Repair Script

## Purpose

This is a **one-time repair script** to clean up existing duplicate Mind Mesh containers caused by earlier ghost materialisation bugs. After running this script, the reconciliation system will prevent future duplicates from occurring.

## What It Does

1. **Detects Duplicate Groups** - Scans `mindmesh_container_references` table and identifies entities with multiple containers
2. **Chooses Canonical Container** - Keeps the oldest container (by `created_at`) for each entity
3. **Soft-Deletes Duplicates** - Sets `archived_at` timestamp on duplicate containers (safe, reversible)
4. **Removes Orphaned References** - Deletes references pointing to archived containers
5. **Logs All Actions** - Detailed console output for auditing

## Prerequisites

- Supabase CLI installed (for deployment)
- Admin/service role access to database
- Valid authentication token

## Installation

The repair script is located at:
```
supabase/functions/repair-mindmesh-duplicates/index.ts
```

No installation needed - it's already in the project.

## Usage

### Step 1: Preview Changes (Dry Run)

**ALWAYS run in dry-run mode first** to see what will be changed:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/repair-mindmesh-duplicates' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "dryRun": true
  }'
```

This will:
- Detect all duplicate groups
- Log what would be removed
- Make **no changes** to the database

### Step 2: Review Output

Example dry-run output:
```json
{
  "success": true,
  "dryRun": true,
  "totalDuplicateGroups": 3,
  "totalContainersRemoved": 5,
  "totalReferencesRemoved": 5,
  "actions": [
    {
      "entityType": "track",
      "entityId": "abc-123",
      "workspaceId": "workspace-xyz",
      "keptContainerId": "container-oldest",
      "keptContainerCreatedAt": "2024-12-01T10:00:00Z",
      "removedContainerIds": ["container-dup1", "container-dup2"],
      "removedReferenceIds": ["ref-1", "ref-2"]
    }
  ],
  "errors": []
}
```

### Step 3: Execute Cleanup (If Safe)

Once you've reviewed the dry-run output and confirmed it's safe, execute the cleanup:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/repair-mindmesh-duplicates' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "dryRun": false
  }'
```

This will:
- Soft-delete duplicate containers (sets `archived_at`)
- Delete orphaned references
- Return detailed action log

### Step 4: Verify Results

1. Check Mind Mesh UI - the reconciliation error should be gone
2. Refresh the page - no new duplicates should be created
3. Review the returned action log for confirmation

## Options

### Filter by Workspace

To repair only a specific workspace:

```json
{
  "dryRun": true,
  "workspaceId": "specific-workspace-id"
}
```

### Default Behavior

- `dryRun` defaults to `true` (safe by default)
- `workspaceId` defaults to `undefined` (processes all workspaces)

## Cleanup Strategy

The script uses **soft-delete** for safety:

- Duplicate containers: Set `archived_at = now()` (reversible)
- Orphaned references: Hard-deleted (safe, can be recreated)

### Why Soft-Delete?

- **Reversible** - Can restore containers if needed
- **Auditable** - Archived containers remain in database for investigation
- **Safe** - No permanent data loss

### Canonical Selection Logic

For each duplicate group:
1. Fetch all containers for the entity
2. Sort by `created_at` ASC
3. Keep **first** (oldest) container
4. Archive all others

This is **deterministic** - running multiple times produces the same result.

## Rollback Strategy (If Needed)

If you need to undo the repair (restore archived containers):

### 1. Identify Archived Containers

```sql
SELECT id, workspace_id, title, created_at, archived_at
FROM mindmesh_containers
WHERE archived_at IS NOT NULL
ORDER BY archived_at DESC;
```

### 2. Restore Specific Container

```sql
-- Restore a single container
UPDATE mindmesh_containers
SET archived_at = NULL
WHERE id = 'container-id-to-restore';
```

### 3. Recreate Reference (If Needed)

If the reference was deleted, recreate it:

```sql
INSERT INTO mindmesh_container_references (
  workspace_id,
  container_id,
  entity_type,
  entity_id,
  is_primary
)
VALUES (
  'workspace-id',
  'container-id',
  'track', -- or 'subtrack', etc.
  'entity-id',
  false
);
```

### 4. Verify Restoration

After restoring, verify Mind Mesh loads correctly:
- Check the UI for the restored container
- Verify no reconciliation errors
- Test that the entity displays properly

**IMPORTANT**: Restoring containers may recreate the duplicate problem. Only rollback if the repair caused unintended data loss.

## Safety Features

1. **Dry-run by default** - Must explicitly set `dryRun: false`
2. **Detailed logging** - Every action is logged to console
3. **Error handling** - Failed groups don't block others
4. **Soft-delete** - Changes are reversible
5. **Authentication required** - Service role key needed

## After Running

Once the repair is complete:

1. **Reconciliation passes** - No blocking errors in Mind Mesh UI
2. **Normal operation resumes** - Mind Mesh loads correctly
3. **Duplicates prevented** - New reconciliation system blocks future duplicates
4. **Idempotent ghost materialisation** - Refreshing page is safe

## Cleanup (After Success)

Once you've verified the repair worked, you can optionally remove the repair function:

```bash
# Optional: Remove the repair function
rm -rf supabase/functions/repair-mindmesh-duplicates
```

Or leave it in place for future reference (it won't run automatically).

## Troubleshooting

### Error: "Unauthorized"

- Check your service role key is correct
- Ensure the Authorization header is properly formatted

### Error: "No containers found for group"

- Containers may have been manually deleted
- References are orphaned - script will clean them up
- This is not a critical error

### No Duplicates Found

- Database is already clean
- Script output will show: `"totalDuplicateGroups": 0`
- No action needed

### Partial Success

If some groups fail:
- Check `errors` array in response
- Failed groups are logged
- Successful groups are still processed
- Re-run the script to retry failed groups

## Technical Details

### Detection Query

```typescript
// Groups references by entity
SELECT entity_type, entity_id, COUNT(*) as container_count
FROM mindmesh_container_references
GROUP BY entity_type, entity_id
HAVING COUNT(*) > 1
```

### Soft-Delete Query

```sql
UPDATE mindmesh_containers
SET archived_at = NOW()
WHERE id IN (duplicate_container_ids)
```

### Reference Cleanup Query

```sql
DELETE FROM mindmesh_container_references
WHERE container_id IN (archived_container_ids)
```

## Support

If you encounter issues:

1. Run with `dryRun: true` first
2. Check console logs for detailed diagnostics
3. Review the `errors` array in response
4. Contact system administrator if data corruption suspected

## Important Notes

- This is a **one-time script**, not runtime logic
- Must be **manually executed** by developer
- **Always dry-run first** before executing
- Changes are **logged** for audit trail
- Soft-delete is **reversible** if needed
- After success, future duplicates are **automatically prevented** by reconciliation system
