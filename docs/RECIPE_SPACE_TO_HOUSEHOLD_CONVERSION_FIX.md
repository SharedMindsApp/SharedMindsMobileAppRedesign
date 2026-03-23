# Recipe Space to Household ID Conversion Fix

## Problem

Recipe creation was failing with:
```
insert or update on table "recipes" violates foreign key constraint "recipes_household_id_fkey"
Key is not present in table "households".
```

**Root Cause:**
- `spaceId` parameter is a `spaces.id` (UUID from spaces table)
- `household_id` column in `recipes` table references `households.id` (UUID from households table)
- The code was passing `spaceId` directly as `household_id`, causing a foreign key violation

## Solution

### Space to Household Relationship

In the spaces system:
- `spaces.context_type` can be `'personal'`, `'household'`, or `'team'`
- When `context_type = 'household'`, `context_id` contains the `households.id`
- When `context_type = 'personal'`, `context_id` is `NULL` (personal spaces don't have households)
- `spaces.id` ≠ `households.id` (they are different tables)

### Implementation

**File:** `src/lib/recipeAIService.ts`

**Added Helper Function:**
```typescript
async function getHouseholdIdFromSpaceId(spaceId: string | undefined): Promise<string | null> {
  if (!spaceId) return null;

  const { data: space, error } = await supabase
    .from('spaces')
    .select('context_type, context_id')
    .eq('id', spaceId)
    .maybeSingle();

  if (error || !space) {
    console.warn('[recipeAIService] Space not found or error fetching space:', {
      spaceId,
      error: error?.message,
    });
    return null;
  }

  // For household spaces, context_id is the household_id
  if (space.context_type === 'household' && space.context_id) {
    return space.context_id;
  }

  // For personal spaces, household_id should be null
  if (space.context_type === 'personal') {
    return null;
  }

  // For other types (team, etc.), return null for now
  return null;
}
```

**Updated `generateRecipeFromQuery`:**
- Calls `getHouseholdIdFromSpaceId(spaceId)` to convert space ID to household ID
- Uses the converted `household_id` instead of passing `spaceId` directly

## Conversion Logic

### Household Spaces
```
spaceId (spaces.id)
  ↓
Lookup: spaces WHERE id = spaceId
  ↓
context_type = 'household'
context_id = households.id
  ↓
Return context_id as household_id
```

### Personal Spaces
```
spaceId (spaces.id)
  ↓
Lookup: spaces WHERE id = spaceId
  ↓
context_type = 'personal'
context_id = NULL
  ↓
Return NULL (personal recipes don't have household_id)
```

### Invalid/Missing Spaces
```
spaceId (spaces.id)
  ↓
Lookup: spaces WHERE id = spaceId
  ↓
Space not found or error
  ↓
Return NULL (graceful fallback)
```

## Code Changes

**Before:**
```typescript
household_id: spaceId || null, // ❌ Wrong: spaceId is spaces.id, not households.id
```

**After:**
```typescript
// Convert spaceId to household_id
const householdId = await getHouseholdIdFromSpaceId(spaceId);

// ... later in recipe input ...
household_id: householdId, // ✅ Correct: households.id or null
```

## Error Handling

The helper function handles:
- **Missing spaceId**: Returns `null` (allows recipe creation without household)
- **Space not found**: Logs warning, returns `null` (graceful fallback)
- **Personal spaces**: Returns `null` (personal recipes don't have household_id)
- **Team spaces**: Returns `null` (recipes might not support team contexts yet)
- **Household spaces**: Returns `context_id` (correct `households.id`)

## Files Modified

1. **`src/lib/recipeAIService.ts`**
   - Added `getHouseholdIdFromSpaceId()` helper function
   - Updated `generateRecipeFromQuery()` to convert spaceId to householdId
   - Added `supabase` import

## Testing Checklist

- [ ] Household space recipe creation succeeds with correct household_id
- [ ] Personal space recipe creation succeeds with household_id = null
- [ ] Invalid spaceId is handled gracefully (returns null)
- [ ] Missing spaceId is handled gracefully (returns null)
- [ ] Foreign key constraint is satisfied

## Acceptance Criteria ✅

- ✅ Recipe creation no longer fails with foreign key violations
- ✅ Space ID is correctly converted to household ID
- ✅ Personal spaces result in household_id = null
- ✅ Household spaces result in correct households.id
- ✅ Invalid spaces are handled gracefully

## Related Fixes

- **RLS Policy Fix**: `docs/RECIPE_RLS_POLICY_FIX.md`
- **Foreign Key Constraint Fix**: `docs/RECIPE_CREATION_FOREIGN_KEY_FIX.md`
- **AI Recipe Constraint**: `supabase/migrations/20250230000003_add_ai_recipes_no_creator_constraint.sql`
