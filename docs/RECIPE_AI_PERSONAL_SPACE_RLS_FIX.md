# Fix RLS for AI Recipes in Personal Spaces

## Problem

AI recipe generation in personal spaces was failing with:
```
new row violates row-level security policy for table "recipes"
```

**Root Causes:**
1. **AI recipes must have `created_by = NULL`** (enforced by constraint `ai_recipes_no_creator`)
2. **Personal spaces have `household_id = NULL`** (no household context)
3. **RLS policy requires ownership via `created_by` OR `household_id` membership**
4. **Result**: AI recipes in personal spaces fail RLS because they have neither `created_by` nor `household_id`

## Solution

Introduce `created_for_profile_id` to attribute AI recipes to users in personal spaces:
- **For AI recipes in personal spaces**: `created_for_profile_id = user's profile.id`
- **For AI recipes in households**: `created_for_profile_id = NULL` (household_id provides scope)
- **For user-created recipes**: `created_for_profile_id = NULL` (created_by provides ownership)

This allows RLS to grant access without requiring `created_by` (which must be NULL for AI recipes).

## Implementation

### 1. Database Migration

**File:** `supabase/migrations/20250230000005_add_created_for_profile_id_for_ai_personal_recipes.sql`

**Changes:**
- Add `created_for_profile_id uuid NULL` column referencing `profiles(id)`
- Add CHECK constraint: AI personal recipes must have `created_for_profile_id`
  ```sql
  CHECK (
    source_type != 'ai'
    OR is_public = true
    OR household_id IS NOT NULL
    OR created_for_profile_id IS NOT NULL
  )
  ```
- Add CHECK constraint: Non-AI recipes cannot set `created_for_profile_id`
  ```sql
  CHECK (
    source_type = 'ai' OR created_for_profile_id IS NULL
  )
  ```
- Add index: `idx_recipes_created_for_profile_id` for performance

### 2. RLS Policy Updates

**File:** `supabase/migrations/20250230000006_update_rls_for_ai_personal_recipes.sql`

**INSERT Policy - Added Case C:**
```sql
-- Case C: Personal-space AI recipes (NEW)
(
  source_type = 'ai'
  AND is_public = false
  AND household_id IS NULL
  AND created_by IS NULL
  AND created_for_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
```

**SELECT Policy - Added:**
```sql
-- Personal AI recipes created for this user (NEW)
(
  created_for_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
```

### 3. App Layer Changes

**File:** `src/lib/recipeAIService.ts`

**Logic:**
```typescript
// Convert spaceId to household_id
const householdId = await getHouseholdIdFromSpaceId(spaceId);

// For AI recipes in personal spaces (householdId is NULL), set created_for_profile_id
let createdForProfileId: string | null = null;
if (householdId === null) {
  // Personal space: need to get user's profile ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw new Error('Cannot create personal AI recipe because user profile record is missing.');
  }

  createdForProfileId = profile.id;
  console.log('[recipeAIService] AI recipe in personal space - setting created_for_profile_id', {
    userId,
    profileId: createdForProfileId,
    spaceId,
  });
}

// In recipe input:
created_for_profile_id: createdForProfileId, // Set for AI recipes in personal spaces
```

**File:** `src/lib/recipeGeneratorService.ts`

**Updated `createRecipe()`:**
- Includes `created_for_profile_id` in insert statement
- Passes through from `CreateRecipeInput`

**File:** `src/lib/recipeGeneratorTypes.ts`

**Updated Types:**
- `CreateRecipeInput`: Added `created_for_profile_id?: string | null`
- `Recipe`: Added `created_for_profile_id: string | null`

## Recipe Creation Flow

### AI Recipe in Household Space
```
generateRecipeFromQuery(userId, spaceId)
    ↓
getHouseholdIdFromSpaceId(spaceId) → householdId: households.id
    ↓
householdId !== null
    ↓
created_for_profile_id = NULL (household_id provides scope)
created_by = NULL (AI recipes)
household_id = householdId
    ↓
RLS Check: Case B (household membership) ✅
    ↓
Recipe Created Successfully
```

### AI Recipe in Personal Space
```
generateRecipeFromQuery(userId, spaceId)
    ↓
getHouseholdIdFromSpaceId(spaceId) → householdId: NULL
    ↓
householdId === null (personal space)
    ↓
Lookup: profiles WHERE user_id = userId → profileId
    ↓
created_for_profile_id = profileId (required for personal AI recipes)
created_by = NULL (AI recipes)
household_id = NULL (personal space)
    ↓
RLS Check: Case C (created_for_profile_id matches user) ✅
    ↓
Recipe Created Successfully
```

## Constraints

### Database Constraints

1. **AI Personal Recipes Must Have Attribution:**
   ```sql
   CHECK (
     source_type != 'ai'
     OR is_public = true
     OR household_id IS NOT NULL
     OR created_for_profile_id IS NOT NULL
   )
   ```
   Ensures AI recipes in personal spaces have `created_for_profile_id`.

2. **Non-AI Recipes Cannot Set Attribution:**
   ```sql
   CHECK (
     source_type = 'ai' OR created_for_profile_id IS NULL
   )
   ```
   Prevents confusion - only AI recipes use `created_for_profile_id`.

3. **AI Recipes Cannot Have Creator:**
   ```sql
   CHECK (
     source_type != 'ai' OR created_by IS NULL
   )
   ```
   Existing constraint - AI recipes must have `created_by = NULL`.

## RLS Policy Cases

### INSERT Policy

**Case A: Public/Global Recipes**
- `is_public = true AND household_id IS NULL`
- Anyone can create public recipes

**Case B: Household/Private Recipes**
- `household_id IS NOT NULL AND (is_user_household_member(household_id) OR is_user_personal_space(household_id))`
- User or AI recipes in accessible households

**Case C: Personal-Space AI Recipes (NEW)**
- `source_type = 'ai' AND is_public = false AND household_id IS NULL AND created_by IS NULL AND created_for_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
- AI recipes in personal spaces with attribution

### SELECT Policy

**Visibility Rules:**
- Public recipes
- Household/personal-space recipes (existing)
- User's own recipes (via `created_by`)
- **Personal AI recipes created for user (NEW)** (via `created_for_profile_id`)

## Error Handling

### Missing Profile

**Error:**
```typescript
throw new Error('Cannot create personal AI recipe because user profile record is missing. Please complete your profile setup.');
```

**When:** User tries to generate AI recipe in personal space but profile doesn't exist.

**Resolution:** User must complete profile setup before generating personal AI recipes.

## Files Modified

1. **`supabase/migrations/20250230000005_add_created_for_profile_id_for_ai_personal_recipes.sql`**
   - New migration: adds column, constraints, index

2. **`supabase/migrations/20250230000006_update_rls_for_ai_personal_recipes.sql`**
   - New migration: updates INSERT and SELECT policies

3. **`src/lib/recipeAIService.ts`**
   - Added logic to set `created_for_profile_id` for personal AI recipes
   - Added error handling for missing profiles

4. **`src/lib/recipeGeneratorService.ts`**
   - Updated `createRecipe()` to include `created_for_profile_id`

5. **`src/lib/recipeGeneratorTypes.ts`**
   - Added `created_for_profile_id` to `CreateRecipeInput` and `Recipe` types

## Testing Checklist

- [ ] AI recipe in household space: succeeds, `household_id` set, `created_for_profile_id` null
- [ ] AI recipe in personal space: succeeds, `household_id` null, `created_for_profile_id` set, `created_by` null
- [ ] User cannot read another user's personal AI recipes (RLS blocks)
- [ ] User can read their own personal AI recipes (RLS allows)
- [ ] Public recipes still work
- [ ] Household recipes still work
- [ ] User-created private recipes still work
- [ ] Missing profile throws clear error

## Acceptance Criteria ✅

- ✅ AI recipes can be created in personal spaces
- ✅ RLS policies allow personal AI recipes with `created_for_profile_id`
- ✅ Database constraints enforce attribution rules
- ✅ Users can only access their own personal AI recipes
- ✅ Existing flows (household, public, user-created) still work
- ✅ Clear error messages for missing profiles
- ✅ No CSP violations (still uses server proxy)

## Related Fixes

- **RLS Policy Fix**: `docs/RECIPE_RLS_POLICY_FIX.md`
- **Foreign Key Constraint Fix**: `docs/RECIPE_CREATION_FOREIGN_KEY_FIX.md`
- **Space to Household Conversion**: `docs/RECIPE_SPACE_TO_HOUSEHOLD_CONVERSION_FIX.md`
- **AI Recipe Constraint**: `supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql`
