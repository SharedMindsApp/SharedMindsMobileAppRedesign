# Food Awareness Layer - Implementation

## Overview

A read-only, computed awareness layer that surfaces lightweight, optional suggestions across Pantry, Grocery List, and Meal Planner — without automation, pressure, or alerts.

## Core Principles

✅ **Suggestions only** - Never auto-actions  
✅ **User always initiates** - Nothing happens without a click  
✅ **No warnings** - No red/yellow states  
✅ **No pressure** - Optional information only  
✅ **ADHD-first** - Feels connected, not merged

## Implementation

### 1. Food Awareness Service (`foodAwareness.ts`)

**Read-only awareness signals:**
- `getFoodAwareness()` - Get full awareness for a single food item
- `getFoodAwarenessBatch()` - Batch awareness for multiple items
- `isInPantry()` - Simple boolean check
- `isOnGroceryList()` - Simple boolean check

**Awareness signals computed:**
- `inPantry` - Is this food item in pantry?
- `onGroceryList` - Is this on grocery list?
- `inUpcomingMeals` - Used in upcoming meal plans?
- `recentlyUsed` - Recently used in household?

**Key characteristics:**
- Computed on-demand, never cached
- No data mutations
- No blocking operations
- Silent failures (optional feature)

### 2. FoodPicker Enhancements

**Subtle awareness hints:**
- Shows "You already have this" when item is in pantry
- Only shown when `showAwareness={true}` prop is set
- Appears as subtle italic text, not blocking
- User can still select and add item

**Usage:**
```tsx
<FoodPicker
  showAwareness={true}
  // ... other props
/>
```

### 3. Grocery List Awareness

**When adding item already in pantry:**
- Subtle info toast: "Added to list (you already have this in pantry)"
- No blocking, no warnings
- Item is still added successfully
- User can choose to ignore or act on the hint

### 4. Meal Planner Awareness

**Recipe cards:**
- Subtle indicator showing ingredient availability
- Small checkmark icon for "All ingredients in pantry"
- Small package icon with count for missing items
- Optional "Add to list" link (not button) for missing ingredients
- No colored boxes or prominent warnings

**Example:**
```
✓ All ingredients in pantry
```
or
```
📦 2 missing • Add to list
```

### 5. Pantry Awareness

**Optional recipe suggestions footer:**
- Shows count: "You could make 2 meals with what you have"
- Expandable to see details
- Links to meal planner (no nagging)
- Only appears when suggestions exist
- Completely optional

## Technical Details

### No New Tables
- Uses existing `food_items`, `household_pantry_items`, `household_grocery_list_items`, `meal_plans`
- All awareness computed from existing relationships

### No Background Jobs
- All awareness computed on-demand
- No cron jobs or scheduled sync
- No caching (always fresh)

### Performance
- Batch operations for efficiency
- Parallel Promise.all() for multiple checks
- Silent failures don't block UI

## Acceptance Criteria Status

✅ User never feels corrected  
✅ Nothing happens without a click  
✅ Features feel connected, not merged  
✅ System feels like it remembers context  
✅ ADHD-first principles remain intact  
✅ No auto-actions  
✅ No warnings  
✅ No required upkeep  
✅ No red/yellow states  
✅ Suggestions only

## Usage Examples

### Check if item is in pantry
```typescript
const inPantry = await isInPantry(foodItemId, householdId);
if (inPantry) {
  // Show subtle hint, but still allow action
}
```

### Get full awareness
```typescript
const awareness = await getFoodAwareness(foodItemId, householdId);
// awareness.inPantry
// awareness.onGroceryList
// awareness.inUpcomingMeals
// awareness.recentlyUsed
```

### Batch awareness
```typescript
const awarenessMap = await getFoodAwarenessBatch(foodItemIds, householdId);
// Map of food_item_id -> FoodAwareness
```

## UI Patterns

### Subtle Hints
- Gray italic text
- Small icons (12-14px)
- Inline with existing content
- Never prominent

### Optional Actions
- Underlined text links (not buttons)
- Small, unobtrusive
- User-initiated only

### No Visual Hierarchy Changes
- Awareness doesn't change layout
- Doesn't add prominent sections
- Blends with existing UI

## Future Enhancements (Optional)

1. **Ingredient-level indicators in recipe detail view**
   - Small checkmarks per ingredient
   - Subtle, not prominent

2. **Cross-feature awareness**
   - "This is on your grocery list" in pantry
   - "Used in 2 upcoming meals" in pantry

3. **Usage patterns**
   - "You use this often" hints
   - "Haven't used in a while" (suggestion, not warning)

All enhancements must maintain:
- Read-only nature
- Optional display
- No pressure or warnings
- User-initiated actions only
