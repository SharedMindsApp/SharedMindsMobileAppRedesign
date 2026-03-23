# Project Users RLS Infinite Recursion Fix

## Problem

The `project_users` table had RLS policies that created infinite recursion, causing 500 errors across the application.

### Root Cause

The RLS policies referenced the same table they were protecting:

```sql
CREATE POLICY "Users can view members of their projects"
  ON project_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu  -- ❌ Recursion!
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
    )
  );
```

When Postgres tried to read from `project_users`, it triggered the policy, which tried to read from `project_users` again, which triggered the policy again, creating infinite recursion.

### Impact

This affected all tables that check project membership:
- `taskflow_tasks` - couldn't query tasks
- `roadmap_items` - couldn't query roadmap
- `mind_mesh_nodes` - couldn't query nodes
- Any other project-scoped tables

Users saw 500 Internal Server errors when trying to access project data.

## Solution

Created SECURITY DEFINER functions that bypass RLS when checking membership:

```sql
-- Helper function bypasses RLS to check membership
CREATE FUNCTION is_project_member(p_user_id uuid, p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_users
    WHERE user_id = p_user_id
      AND master_project_id = p_project_id
      AND archived_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then updated policies to use these functions:

```sql
-- New non-recursive policy
CREATE POLICY "Users can view project members"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL AND
    is_project_member(auth.uid(), master_project_id)  -- ✅ No recursion
  );
```

## Migration Applied

**File:** `20251216220000_fix_project_users_infinite_recursion.sql`

**Changes:**
1. Dropped 4 recursive policies
2. Created 2 SECURITY DEFINER helper functions:
   - `is_project_member()` - Check if user belongs to project
   - `is_project_owner_check()` - Check if user is project owner
3. Created 4 new non-recursive policies using these functions

## Security Maintained

The new policies maintain the same security model:
- Users can only view projects they belong to
- Only owners can add/remove users
- Only owners can change user roles
- All access checks still apply

The SECURITY DEFINER functions are safe because:
- They only check membership, no data modification
- They still respect the `archived_at` check
- They're called from policies that already verify `auth.uid()`

## Verification

After applying this migration:
- ✅ Build completes successfully
- ✅ No RLS recursion errors
- ✅ Project-scoped queries work correctly
- ✅ Security model unchanged

## Pattern for Future

**Golden Rule:** Never have an RLS policy query the same table it's protecting.

**If you need to check the same table:**
1. Create a SECURITY DEFINER function
2. Have the function do the check (bypassing RLS)
3. Call the function from the policy

**Example:**
```sql
-- ❌ Bad: Recursive
CREATE POLICY "..." ON table_a USING (
  EXISTS (SELECT 1 FROM table_a WHERE ...)
);

-- ✅ Good: Use SECURITY DEFINER function
CREATE FUNCTION check_access() RETURNS boolean SECURITY DEFINER AS $$
  -- Check table_a without triggering RLS
END;

CREATE POLICY "..." ON table_a USING (
  check_access()
);
```

## Related Issues

This same pattern was previously fixed for:
- `household_members` table (Stage 2)
- `space_members` table (Stage 2)
- `fridge_widgets` table (Stage 2)

This fix completes the pattern across all collaborative tables in the system.
