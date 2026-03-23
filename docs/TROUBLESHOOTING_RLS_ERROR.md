# Troubleshooting RLS Error for Todo Creation

## Error Message
```
403 (Forbidden)
new row violates row-level security policy for table "personal_todos"
```

## Possible Causes

### 1. Migration Not Run ⚠️ MOST LIKELY

The migration `20260220000000_add_todo_breakdown_system.sql` may not have been applied to your database.

**Solution**: Run the migration:
```bash
supabase migration up
```

Or apply it manually via Supabase dashboard SQL editor.

**Verify migration ran**:
```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'personal_todos'
AND column_name IN ('has_breakdown', 'breakdown_context', 'breakdown_generated_at');

-- Should return 3 rows
```

### 2. RLS Policy Issue

The RLS policy requires:
- `auth.uid() = user_id` (user creating the todo must match authenticated user)
- User must be an active member of the household

**Check user's household membership**:
```sql
-- Verify user is a member of the household
SELECT hm.*, h.type, h.name
FROM household_members hm
JOIN households h ON h.id = hm.household_id
WHERE hm.auth_user_id = auth.uid()
AND hm.status = 'active'
AND h.type = 'personal';
```

**If no rows returned**: User doesn't have a personal space. The `getPersonalSpace()` function should create one, but if it fails, todos can't be created.

### 3. Column Default Values

The migration sets `has_breakdown` with `NOT NULL DEFAULT false`, but Supabase RLS might need explicit values.

**Solution**: Already fixed in code - `createTodo()` now explicitly sets:
- `has_breakdown: false`
- `breakdown_context: null`
- `breakdown_generated_at: null`

### 4. RLS Policy Recursion

If the RLS policy references `household_members` and that table also has RLS, there might be recursion issues.

**Check**: The policy uses:
```sql
EXISTS (
  SELECT 1 FROM household_members
  WHERE household_id = personal_todos.household_id
  AND auth_user_id = auth.uid()
  AND status = 'active'
)
```

This should be safe, but if `household_members` has restrictive RLS, it might fail.

## Debugging Steps

### Step 1: Verify Migration
```sql
-- Run in Supabase SQL editor
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'personal_todos'
  AND column_name = 'has_breakdown'
) as migration_applied;
```

### Step 2: Check RLS Policies
```sql
-- List all policies on personal_todos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'personal_todos';
```

### Step 3: Test RLS Policy Directly
```sql
-- Test if you can insert (replace with your actual values)
INSERT INTO personal_todos (
  user_id,
  household_id,
  title,
  priority,
  order_index,
  has_breakdown,
  breakdown_context,
  breakdown_generated_at
) VALUES (
  auth.uid(),
  'YOUR_HOUSEHOLD_ID',
  'Test todo',
  'medium',
  0,
  false,
  null,
  null
);
```

### Step 4: Check User Context
```sql
-- Verify authenticated user
SELECT auth.uid() as current_user_id;

-- Verify household membership
SELECT 
  h.id as household_id,
  h.name,
  h.type,
  hm.status,
  hm.auth_user_id
FROM households h
JOIN household_members hm ON hm.household_id = h.id
WHERE hm.auth_user_id = auth.uid()
AND h.type = 'personal';
```

## Quick Fix

If migration hasn't been run, the columns don't exist and Supabase will reject the INSERT with the new columns.

**Temporary workaround** (until migration is run):
1. Comment out the new columns in `createTodo()`:
```typescript
// has_breakdown: false,
// breakdown_context: null,
// breakdown_generated_at: null,
```

2. Run the migration
3. Uncomment the columns

**Better solution**: Run the migration first, then the code will work.

## Verification After Fix

After running the migration, test:
1. Create a new todo - should work
2. Check that `has_breakdown` defaults to `false`
3. Generate a breakdown - should work
4. Verify micro-steps are saved correctly
