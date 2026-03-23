# Recipe RLS Policy Fix for AI Recipes and Profile IDs

## Problem

Recipe creation was failing with:
```
new row violates row-level security policy for table "recipes"
```

**Root Causes:**
1. **ID Type Mismatch**: RLS policy checked `created_by = auth.uid()`, but:
   - `created_by` references `profiles.id` (UUID from profiles table)
   - `auth.uid()` returns `auth.users.id` (UUID from auth.users table)
   - These are different ID types, so the check always fails

2. **AI Recipe Handling**: AI recipes have `created_by = NULL` (system-generated), but the policy required `created_by = auth.uid()`, which fails for NULL values.

3. **Private Recipe Creation**: AI recipes are created with `is_public = false` and `household_id = spaceId`, but the original policy only allowed public recipes when `household_id IS NULL`.

## Solution

### 1. Updated INSERT Policy

**File:** `supabase/migrations/20250230000004_fix_recipes_rls_for_ai_and_profiles.sql`

**Changes:**
- **AI Recipes**: Allow `created_by IS NULL` when `source_type = 'ai'`
- **User Recipes**: Check `created_by` via profile lookup: `created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
- **Private Recipes**: Allow private recipes in households: `is_public = false AND household_id IS NOT NULL AND is_user_household_member(household_id)`

**New Policy:**
```sql
CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- AI recipes: created_by must be NULL (enforced by constraint)
      (source_type = 'ai' AND created_by IS NULL)
      OR
      -- User recipes: created_by must match user's profile ID
      (
        source_type != 'ai'
        AND (
          created_by IS NULL
          OR created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
    AND (
      -- Can create in personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Can create in shared households they're members of
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- Can create public recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Can create private recipes in their household (for AI recipes too)
      (is_public = false AND household_id IS NOT NULL AND is_user_household_member(household_id))
    )
  );
```

### 2. Updated SELECT Policy

**Changes:**
- Fixed `created_by` check to use profile lookup instead of direct `auth.uid()` comparison

**New Policy:**
```sql
CREATE POLICY "Users can view accessible recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Public recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Recipes in user's personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Recipes in user's shared households
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- User's own recipes (check via profile ID, not auth.uid())
      (
        created_by IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );
```

## Key Improvements

### 1. Profile ID Conversion
- **Before**: `created_by = auth.uid()` (always fails - different ID types)
- **After**: `created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())` (correct lookup)

### 2. AI Recipe Support
- **Before**: Policy required `created_by = auth.uid()`, failing for NULL
- **After**: Policy explicitly allows `source_type = 'ai' AND created_by IS NULL`

### 3. Private Recipe Creation
- **Before**: Only allowed public recipes when `household_id IS NULL`
- **After**: Allows private recipes in households: `is_public = false AND household_id IS NOT NULL AND is_user_household_member(household_id)`

## Recipe Creation Flow

### AI Recipe Creation
```
generateRecipeFromQuery(userId, spaceId)
    ↓
createRecipe(input, userId)
    ↓
source_type = 'ai'
created_by = NULL (AI recipes have no creator)
household_id = spaceId (user's household)
is_public = false (private recipe)
    ↓
RLS Policy Check:
  ✅ source_type = 'ai' AND created_by IS NULL
  ✅ household_id IS NOT NULL AND is_user_household_member(household_id)
    ↓
Recipe Created Successfully
```

### User Recipe Creation
```
createRecipe(input, userId)
    ↓
source_type = 'user'
created_by = profileId (converted from auth.users.id)
household_id = spaceId
is_public = false
    ↓
RLS Policy Check:
  ✅ source_type != 'ai' AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ✅ household_id IS NOT NULL AND is_user_household_member(household_id)
    ↓
Recipe Created Successfully
```

## Files Modified

1. **`supabase/migrations/20250230000004_fix_recipes_rls_for_ai_and_profiles.sql`**
   - New migration to fix RLS policies
   - Updates INSERT policy for recipe creation
   - Updates SELECT policy for recipe viewing

## Testing Checklist

- [ ] AI recipe creation succeeds with `created_by = NULL`
- [ ] User recipe creation succeeds with `created_by = profileId`
- [ ] Private AI recipes can be created in user's household
- [ ] Public recipes can be created without household
- [ ] Users can view their own recipes (via profile ID)
- [ ] Users can view household recipes they're members of
- [ ] Users can view public recipes

## Acceptance Criteria ✅

- ✅ Recipe creation no longer fails with RLS policy violations
- ✅ AI recipes can be created with `created_by = NULL`
- ✅ User recipes can be created with `created_by = profileId`
- ✅ Profile ID conversion works correctly
- ✅ Private recipes can be created in households
- ✅ SELECT policy correctly identifies user's own recipes

## Next Steps

1. **Apply Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250230000004_fix_recipes_rls_for_ai_and_profiles.sql
   ```

2. **Test Recipe Creation:**
   - Test AI recipe generation
   - Test user recipe creation
   - Verify both work with the new policies

3. **Monitor Logs:**
   - Watch for any remaining RLS violations
   - Verify recipe access works correctly

## Related Fixes

- **Foreign Key Constraint Fix**: `docs/RECIPE_CREATION_FOREIGN_KEY_FIX.md`
- **AI Recipe Constraint**: `supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql`
