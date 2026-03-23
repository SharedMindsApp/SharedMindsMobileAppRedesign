# Teams INSERT Policy Fix - Application Guide

## Problem
Getting `403 Forbidden` error when creating teams:
```
new row violates row-level security policy for table "teams"
```

## Root Cause
The INSERT policy on `teams` was checking `auth.uid() = created_by`, but `created_by` stores a **profile ID** (from `profiles` table), not an auth user ID. This comparison always fails.

## Solution
Migration `20260131000011_fix_team_members_insert_recursion.sql`:
1. Drops old incorrect policies
2. Creates `can_create_team()` helper function that correctly compares profile IDs
3. Creates new INSERT policy using the helper function

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20260131000011_fix_team_members_insert_recursion.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 3: Manual Application
1. Copy the SQL from the migration file
2. Run it in your Supabase SQL Editor
3. Verify no errors occurred

## Verification Steps

After applying the migration, verify it worked:

### 1. Check Function Exists
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'can_create_team';
```
Should return 1 row with the function definition.

### 2. Check Policy Exists
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'teams' AND cmd = 'INSERT';
```
Should show policy "Authenticated users can create teams" with `with_check` containing `can_create_team(created_by)`.

### 3. Test the Function
```sql
-- Get your profile ID first
SELECT get_current_profile_id() as my_profile_id;

-- Then test (replace with your actual profile ID)
SELECT can_create_team('YOUR_PROFILE_ID_HERE'::uuid);
```
Should return `true` if you're authenticated.

### 4. Verify Old Policies Are Gone
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'teams' AND cmd = 'INSERT';
```
Should only show "Authenticated users can create teams" (the new one).

## Testing Team Creation

After applying the migration, try creating a team again in your app. It should work now.

If it still fails:
1. Check browser console for exact error message
2. Verify you're authenticated (check `auth.uid()` is not NULL)
3. Verify your profile exists (check `profiles` table)
4. Run the verification queries above

## Troubleshooting

### Still Getting 403 Error?

1. **Check if migration was applied:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE version = '20260131000011';
   ```
   If no rows returned, migration wasn't applied.

2. **Check if function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'can_create_team';
   ```
   If no rows, function wasn't created. Re-run the migration.

3. **Check current user context:**
   ```sql
   SELECT auth.uid() as auth_user_id, get_current_profile_id() as profile_id;
   ```
   Both should be non-NULL if you're authenticated.

4. **Test function directly:**
   ```sql
   -- Replace with your actual profile ID
   SELECT can_create_team('YOUR_PROFILE_ID'::uuid);
   ```
   Should return `true`.

### Function Returns False

If `can_create_team()` returns `false`:
- Check `auth.uid()` is not NULL (you're authenticated)
- Check profile exists: `SELECT * FROM profiles WHERE user_id = auth.uid();`
- Check `created_by` matches your profile ID

### Multiple Policies Conflict

If you see multiple INSERT policies:
```sql
-- Drop all and recreate
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;

-- Then re-run the CREATE POLICY from the migration
```

## Migration Safety

This migration is **safe** because:
- ✅ Only modifies RLS policies (no data changes)
- ✅ Uses `DROP POLICY IF EXISTS` (idempotent)
- ✅ Uses `CREATE OR REPLACE FUNCTION` (idempotent)
- ✅ Can be re-run without issues

## Rollback (If Needed)

If you need to rollback:
```sql
-- Drop the new policy
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;

-- Recreate old policy (if needed)
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (get_current_profile_id() = created_by);
```

Note: The old policy had the same logic issue, so rollback won't fix the original problem.
