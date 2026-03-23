# Migration Application Instructions

## Problem
You're seeing RLS policy violations because the database migrations haven't been applied yet. The code changes are ready, but the database schema needs to be updated.

## Required Migrations (Apply in Order)

### 1. Add `created_for_profile_id` Column
**File:** `supabase/migrations/20250230000005_add_created_for_profile_id_for_ai_personal_recipes.sql`

**What it does:**
- Adds `created_for_profile_id` column to `recipes` table
- Adds CHECK constraints to enforce attribution rules
- Adds index for performance

### 2. Update Recipes RLS Policies
**File:** `supabase/migrations/20250230000006_update_rls_for_ai_personal_recipes.sql`

**What it does:**
- Updates INSERT policy to allow AI recipes in personal spaces
- Updates SELECT policy to allow users to view their personal AI recipes

### 3. Update Recipe Versions RLS Policies
**File:** `supabase/migrations/20250230000007_fix_recipe_versions_rls_for_ai_personal_recipes.sql`

**What it does:**
- Updates INSERT policy to allow automatic version creation for AI recipes
- Updates SELECT policy to allow viewing versions of personal AI recipes
- Updates UPDATE policy to use profile lookup
- Fixes ID type mismatch (uses profile.id instead of auth.uid())

### 4. Update Recipe Validation Status RLS Policies
**File:** `supabase/migrations/20250230000008_fix_recipe_validation_status_rls_for_ai_personal_recipes.sql`

**What it does:**
- Updates INSERT policy to allow automatic validation status creation for AI recipes
- Updates SELECT policy to allow viewing validation status of personal AI recipes
- Updates UPDATE policy to use profile lookup
- Fixes ID type mismatch (uses profile.id instead of auth.uid())

### 5. Update Recipe Usage Stats RLS Policies
**File:** `supabase/migrations/20250230000009_fix_recipe_usage_stats_rls_for_ai_personal_recipes.sql`

**What it does:**
- Updates INSERT policy to allow tracking views for personal AI recipes
- Updates SELECT policy to allow viewing usage stats of personal AI recipes
- Updates UPDATE policy to use profile lookup
- Fixes ID type mismatch (uses profile.id instead of auth.uid())

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Apply Migration 1**
   - Open `supabase/migrations/20250230000005_add_created_for_profile_id_for_ai_personal_recipes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

3. **Apply Migration 2**
   - Open `supabase/migrations/20250230000006_update_rls_for_ai_personal_recipes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

4. **Apply Migration 3** (Required for recipe versions)
   - Open `supabase/migrations/20250230000007_fix_recipe_versions_rls_for_ai_personal_recipes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

5. **Apply Migration 4** (Required for validation status)
   - Open `supabase/migrations/20250230000008_fix_recipe_validation_status_rls_for_ai_personal_recipes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

6. **Apply Migration 5** (Required for usage stats tracking)
   - Open `supabase/migrations/20250230000009_fix_recipe_usage_stats_rls_for_ai_personal_recipes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

4. **Verify Success**
   - Check for any errors in the SQL Editor output
   - Verify the column exists:
     ```sql
     SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'recipes' AND column_name = 'created_for_profile_id';
     ```
   - Verify the policies exist:
     ```sql
     SELECT policyname, cmd, qual, with_check
     FROM pg_policies
     WHERE tablename = 'recipes';
     ```

### Option 2: Supabase CLI

If you have Supabase CLI set up:

```bash
# Make sure you're in the project root
cd "C:\Users\maket\OneDrive\Documents\Shared Minds Documents\Main Project Files\project"

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
npx supabase db push
```

### Option 3: Manual SQL Execution

If you prefer to run SQL directly:

1. Connect to your Supabase database
2. Run the SQL from each migration file in order
3. Verify the changes were applied

## Verification Queries

After applying migrations, run these to verify:

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipes' 
  AND column_name = 'created_for_profile_id';

-- Check constraints exist
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'recipes'::regclass
  AND conname IN ('ai_personal_recipes_require_created_for', 'non_ai_recipes_no_created_for');

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recipes' 
  AND indexname = 'idx_recipes_created_for_profile_id';

-- Check policies exist
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'recipes'
  AND policyname IN ('Users can create recipes', 'Users can view accessible recipes');
```

## Expected Results

After applying migrations:

1. **Column exists:**
   - `created_for_profile_id` should be `uuid` type, nullable

2. **Constraints exist:**
   - `ai_personal_recipes_require_created_for`
   - `non_ai_recipes_no_created_for`

3. **Index exists:**
   - `idx_recipes_created_for_profile_id`

4. **Policies updated:**
   - INSERT policy includes Case C (personal AI recipes)
   - SELECT policy includes `created_for_profile_id` check

## Troubleshooting

### Error: "column already exists"
- The migration was already applied
- Skip to the next migration

### Error: "policy already exists"
- The policy was already updated
- The migration will drop and recreate it (this is safe)

### Error: "constraint already exists"
- The constraint was already added
- The migration checks for existence before creating (safe to re-run)

### Still Getting RLS Violations

1. **Check if migrations were applied:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'recipes' AND column_name = 'created_for_profile_id';
   ```
   - If this returns no rows, the migration wasn't applied

2. **Check the current policy:**
   ```sql
   SELECT with_check FROM pg_policies 
   WHERE tablename = 'recipes' AND policyname = 'Users can create recipes';
   ```
   - Should include the Case C condition for personal AI recipes

3. **Check browser console logs:**
   - Look for `[recipeAIService] AI recipe in personal space - setting created_for_profile_id`
   - Look for `[recipeGeneratorService] Creating recipe with:` to see what values are being sent

4. **Verify profile exists:**
   ```sql
   SELECT id FROM profiles WHERE user_id = auth.uid();
   ```
   - Should return a profile ID for the current user

## Next Steps

After applying migrations:

1. **Test AI recipe generation in personal space**
   - Should succeed without RLS violations
   - Check browser console for logging

2. **Test AI recipe generation in household space**
   - Should still work as before

3. **Verify RLS security**
   - Users should only see their own personal AI recipes
   - Users should not see other users' personal AI recipes

## Support

If you continue to see issues after applying migrations:

1. Check the browser console for detailed error messages
2. Check the Supabase logs for database errors
3. Verify all migrations were applied successfully
4. Ensure the code changes are deployed (refresh browser if needed)
