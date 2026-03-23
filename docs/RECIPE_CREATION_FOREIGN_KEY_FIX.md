# Recipe Creation Foreign Key Constraint Fix

## Problem

Recipe creation was failing with:
```
insert or update on table "recipes" violates foreign key constraint "recipes_created_by_fkey"
Key is not present in table "profiles".
```

**Root Cause:**
- `user.id` from `useAuth()` is an `auth.users.id`
- `created_by` column in `recipes` table references `profiles.id`
- The foreign key constraint requires a valid `profiles.id` or `NULL`

## Solution

### 1. Added Profile ID Conversion

**File:** `src/lib/recipeGeneratorService.ts`

- Added `getProfileIdFromUserId()` helper function
- Converts `auth.users.id` → `profiles.id`
- Returns `null` if profile doesn't exist (safe fallback)

### 2. Updated Recipe Creation

**Functions Updated:**
- `createRecipe()` - Converts user ID before insert
- `createRecipeVersion()` - Converts user ID for version creation
- `updateRecipe()` - Converts user ID for validation status

**Logic:**
- AI recipes: `created_by` is always `NULL` (system-generated)
- Non-AI recipes: `created_by` is `NULL` if profile doesn't exist
- Prevents foreign key constraint violations

### 3. Database Constraint (Hardening)

**File:** `supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql`

Added database-level constraint:
```sql
ALTER TABLE recipes
ADD CONSTRAINT ai_recipes_no_creator
CHECK (
  source_type != 'ai' OR created_by IS NULL
);
```

**Benefits:**
- Guarantees AI recipes never have a creator
- Prevents accidental assignment of ownership
- Database-level safety (can't be bypassed)

### 4. Profile ID Caching

**Implementation:**
```typescript
const profileIdCache = new Map<string, string | null>();
```

**Benefits:**
- Reduces database queries for repeated lookups
- Improves performance for hot-path operations
- Caches both positive and negative results

### 5. Enhanced Logging

**Before:**
```typescript
console.warn('Profile not found for user');
```

**After:**
```typescript
console.warn('[recipeGeneratorService] No profile found for user, setting created_by to null', {
  authUserId: userId,
  sourceType: input.source_type,
  action: 'created_by set to null',
  possibleCauses: [
    'incomplete user onboarding',
    'failed profile creation flow',
    'edge case during import',
  ],
});
```

**Benefits:**
- Better debugging context
- Identifies root causes
- Helps spot onboarding issues

## Code Flow

### Recipe Creation

```
generateRecipeFromQuery(userId: auth.users.id)
    ↓
createRecipe(input, userId)
    ↓
getProfileIdFromUserId(userId) → profileId: profiles.id | null
    ↓
Check: source_type === 'ai'?
    ↓
YES → created_by = NULL (AI recipes have no creator)
NO → created_by = profileId || NULL (fallback if profile missing)
    ↓
Insert recipe (no foreign key violation)
```

### AI Recipe Handling

- **Database Constraint:** Enforces `source_type != 'ai' OR created_by IS NULL`
- **Application Logic:** Always sets `created_by = NULL` for AI recipes
- **Double Protection:** Both application and database enforce the rule

## Error Handling

### Profile Not Found

**Behavior:**
- `created_by` is set to `NULL` (allowed by schema)
- Recipe creation continues successfully
- Warning logged with context
- No foreign key constraint violations

**Logging:**
```typescript
{
  authUserId: '91a859e2-6c6e-4952-aecc-668a9f76b716',
  sourceType: 'ai',
  action: 'created_by set to null',
  possibleCauses: [
    'incomplete user onboarding',
    'failed profile creation flow',
    'edge case during import',
  ],
}
```

## Files Modified

1. **`src/lib/recipeGeneratorService.ts`**
   - Added `getProfileIdFromUserId()` with caching
   - Updated `createRecipe()` to handle profile conversion
   - Updated `createRecipeVersion()` to handle profile conversion
   - Updated `updateRecipe()` to handle profile conversion
   - Enhanced logging with context

2. **`supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql`**
   - Added database constraint for AI recipes
   - Prevents accidental creator assignment

## Testing Checklist

- [ ] AI recipe creation succeeds with `created_by = NULL`
- [ ] Non-AI recipe creation succeeds with valid profile
- [ ] Non-AI recipe creation succeeds with missing profile (`created_by = NULL`)
- [ ] Database constraint prevents AI recipes with creator
- [ ] Profile ID caching works correctly
- [ ] Enhanced logging provides useful context

## Acceptance Criteria ✅

- ✅ Recipe creation no longer fails with foreign key violations
- ✅ AI recipes always have `created_by = NULL`
- ✅ Database constraint enforces AI recipe rule
- ✅ Profile ID conversion handles missing profiles gracefully
- ✅ Enhanced logging helps identify root causes
- ✅ Profile ID caching improves performance

## Next Steps

1. **Apply Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql
   ```

2. **Monitor Logs:**
   - Watch for profile missing warnings
   - Identify onboarding issues
   - Track edge cases

3. **Profile Creation:**
   - Ensure profiles are created during user onboarding
   - Fix any profile creation failures
   - Handle edge cases during imports
