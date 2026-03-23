# Unified Food System - Implementation Guide

## Overview

The Unified Food System establishes a single canonical source of truth for all food items across the application. This eliminates duplication and inconsistency between Pantry, Grocery List, and Meal Planner features.

## Core Principle

**There must be ONE canonical `food_item` entity used by:**
- Pantry (what I have)
- Grocery List (what I need to buy)
- Meal Planner (what recipes reference)

**No feature may create or store its own food strings independently.**

## Architecture

### 1. Canonical Food Items Table (`food_items`)

The `food_items` table is the single source of truth for all food references.

```sql
food_items {
  id: uuid (PK)
  name: text              -- Canonical display name (e.g., "Milk")
  normalized_name: text   -- Lowercase, trimmed for matching (e.g., "milk")
  category: text          -- dairy, produce, meat, pantry, etc.
  emoji: text             -- Optional emoji for visual identification
  created_at: timestamptz
  updated_at: timestamptz
}
```

**Key Features:**
- `normalized_name` ensures consistent matching and deduplication
- Unique constraint on `normalized_name` prevents duplicates
- Fuzzy search support via `pg_trgm` extension (with ILIKE fallback)

### 2. Pantry Items (`household_pantry_items`)

Pantry represents inventory - what the user currently has.

```sql
household_pantry_items {
  id: uuid (PK)
  food_item_id: uuid (FK → food_items)  -- REQUIRED
  household_id: uuid
  location: text                        -- 'fridge' | 'freezer' | 'cupboard'
  status: text                          -- 'have' | 'low' | 'out' (optional)
  quantity: text                         -- Optional, no precision pressure
  unit: text
  expiration_date: date
  notes: text
  added_by: uuid
  created_at: timestamptz
  updated_at: timestamptz
}
```

**Rules:**
- ✅ NEVER stores food names directly
- ✅ References `food_item_id` only
- ✅ Optional quantity tracking (no precision pressure)
- ✅ No required maintenance burden

### 3. Grocery List Items (`household_grocery_list_items`)

Grocery list represents intent - what the user needs to buy.

```sql
household_grocery_list_items {
  id: uuid (PK)
  food_item_id: uuid (FK → food_items)  -- REQUIRED
  household_id: uuid
  shopping_list_id: uuid
  quantity: text
  unit: text
  category: text
  checked: boolean
  -- ... other fields
}
```

**Behavior:**
- Adding an item: Search `food_items`, create if missing (once)
- Checking off an item: Optional prompt "Add to pantry?"
- Grocery list never owns food definitions

### 4. Meal Library Ingredients

Meal recipes reference `food_item_id` in their ingredients JSONB:

```json
{
  "ingredients": [
    {
      "food_item_id": "uuid",
      "quantity": "2",
      "unit": "cups",
      "optional": false
    }
  ]
}
```

**Migration:**
- Existing ingredients with `name` field are migrated to include `food_item_id`
- Both fields may exist during transition period

## Implementation Details

### Services

#### `foodItems.ts`
Core service for food item operations:
- `getOrCreateFoodItem(name, category?)` - Canonical way to create food items
- `searchFoodItems(query, limit?)` - Fuzzy search with relevance ranking
- `getRecentlyUsedFoodItems(householdId, limit?)` - Quick selection
- `getFoodItemById(id)` - Get single item
- `getFoodItemsByIds(ids[])` - Batch retrieval

#### `intelligentGrocery.ts` (Updated)
Updated to use `food_item_id`:
- All functions accept `foodItemId` parameter (preferred)
- Backward compatibility with `itemName` parameter (deprecated)
- Queries join with `food_items` table
- Returns `food_item` relation in results

### Components

#### `FoodPicker.tsx`
Shared component for selecting/creating food items:
- Used by Pantry, Grocery List, and Meal Planner
- Features:
  - Fast search with fuzzy matching
  - Recently used items shown first
  - Visual feedback with emojis
  - Create new items on-the-fly
  - No pressure to be precise

**Usage:**
```tsx
<FoodPicker
  isOpen={showPicker}
  onClose={() => setShowPicker(false)}
  onSelect={(foodItem) => handleSelect(foodItem)}
  householdId={householdId}
  excludeIds={existingIds}
/>
```

### Migration Strategy

The migration (`20260221000000_create_unified_food_system.sql`) handles:

1. **Creates `food_items` table** with proper structure
2. **Migrates existing data:**
   - Pantry items → `food_items`
   - Grocery list items → `food_items`
   - Meal library ingredients → `food_items`
   - Grocery templates → `food_items`
   - Purchase history → `food_items`
3. **Updates tables:**
   - Adds `food_item_id` column to `household_pantry_items`
   - Adds `food_item_id` column to `household_grocery_list_items`
   - Populates `food_item_id` from existing `item_name` data
   - Updates meal library ingredients JSONB to include `food_item_id`
4. **Creates helper functions:**
   - `get_or_create_food_item(name, category?)` - Database function
   - `search_food_items(query, limit?)` - Fuzzy search
   - `get_recently_used_food_items(householdId, limit?)` - Recent items
5. **Sets up RLS policies** for `food_items` table

**Backward Compatibility:**
- `item_name` columns remain but are deprecated
- Services provide both `foodItemId` and `itemName` parameters
- Components can work with either during transition

## ADHD-First Principles

### Pantry Design
- ✅ Not a task list
- ✅ No red states
- ✅ No "accuracy pressure"
- ✅ Updates happen through normal actions (shopping, cooking, planning)
- ✅ User feels: "The app remembers for me — I don't manage it."

### Intelligence Rules
- ✅ Suggestive, not authoritative
- ✅ Optional, not enforced
- ✅ Examples:
  - If item added to grocery list repeatedly → suggest marking as "always keep"
  - If pantry item unused for long time → suggest recipe
  - If recipe planned → suggest missing items to grocery list
- ❌ Never:
  - Auto-delete pantry items
  - Auto-add grocery items
  - Show warnings or alerts

## Usage Examples

### Adding Item to Grocery List

```typescript
// Using FoodPicker component
const handleSelectFood = async (foodItem: FoodItem) => {
  await addGroceryItem({
    householdId,
    foodItemId: foodItem.id, // Use food_item_id
    quantity: '1',
    unit: 'lb',
  });
};

// Or directly with name (backward compatibility)
await addGroceryItem({
  householdId,
  itemName: 'Milk', // Will create food_item if needed
  quantity: '1',
  unit: 'gallon',
});
```

### Adding Item to Pantry

```typescript
const handleAddToPantry = async (foodItem: FoodItem) => {
  await addPantryItem({
    householdId,
    foodItemId: foodItem.id,
    location: 'fridge',
    status: 'have',
  });
};
```

### Checking Off Grocery Item (Optional: Add to Pantry)

```typescript
const handleCheckOff = async (item: GroceryItem) => {
  await toggleItemChecked(item.id, true);
  
  // Optional prompt: "Add to pantry?"
  if (confirm('Add to pantry?')) {
    await moveToPantry(item, householdId);
  }
};
```

## Acceptance Criteria

✅ Only one food list exists (`food_items` table)
✅ Pantry, Grocery List, and Meal Planner reference the same items
✅ No duplicated food strings anywhere
✅ Pantry feels invisible unless needed
✅ Grocery list remains fast and simple
✅ Meal planner gains intelligence without complexity
✅ ADHD-first principles preserved
✅ Backward compatibility maintained during transition

## Next Steps

1. Update `GroceryListWidget` to use `FoodPicker`
2. Update `MealPlannerWidget` to use `food_items` for ingredients
3. Create Pantry widget/component using `FoodPicker`
4. Remove deprecated `item_name` parameters after full migration
5. Add pantry intelligence features (suggestions, recipe matching)

## Notes

- The migration preserves all existing data
- Food items are deduplicated by `normalized_name`
- Fuzzy search works even if `pg_trgm` extension is not available (uses ILIKE fallback)
- All food item creation goes through `getOrCreateFoodItem` to ensure consistency
