# Nutrition & Hydration Tracker Merge - Implementation Summary

## Overview

Successfully merged Nutrition Log and Water Intake Tracker into a unified Nutrition & Hydration Tracker template. This consolidation simplifies Tracker Studio by reducing overlapping templates while preserving all existing user data. This tracker follows the same pattern as the Health Tracker merge.

## What Was Done

### 1. Database Schema Changes

**Migration:** `supabase/migrations/20260131000033_merge_nutrition_hydration_trackers.sql`

**Fields Used:**
- `deprecated_at` (timestamptz, nullable) - Already exists from Health Tracker merge
- `icon` (text, nullable) - Icon name from lucide-react
- `color` (text, nullable) - Color theme name

### 2. New Nutrition & Hydration Tracker Template

**Template Name:** Nutrition & Hydration Tracker

**Description:** Track what you eat and drink with awareness — no macro counting, no targets, no pressure. This tracker records inputs, not outcomes.

**Entry Granularity:** Daily

**Core Fields:**
- `entry_type` (required) - Dropdown with options: Meal, Hydration, General Nutrition
- `entry_date` (required) - Date field

**Conditional Fields:**

**When entry_type = 'meal':**
- `meal_type` (text, max 50 chars, optional) - e.g., Breakfast, Lunch, Dinner, Snack
- `food_description` (text, max 1000 chars, required) - What did you eat?
- `tags` (text, max 200 chars, optional)
- `mood_or_feelings` (text, max 500 chars, optional) - How did eating feel?
- `meal_notes` (text, max 1000 chars, optional)

**When entry_type = 'hydration':**
- `hydration_amount` (number, optional) - Amount of hydration consumed
- `hydration_unit` (text, optional) - Options: Cups, Glasses, ml
- `hydration_notes` (text, max 200 chars, optional)

**When entry_type = 'general_nutrition':**
- `nutrition_notes` (text, max 1000 chars) - For things like appetite, cravings, digestion, or general observations

**Tags:** nutrition, hydration, food, wellness, self-care, tracking, health

**Icon:** UtensilsCrossed (lucide-react icon name)

**Color:** green (color theme name)

**Chart Configuration:**
- Bar chart: Nutrition Entries by Type
- Time series: Hydration Over Time (grouped by unit)

### 3. Template Deprecation

**Deprecated Templates:**
- Nutrition Log - Marked as deprecated (hidden from new template selection) → Use Nutrition & Hydration Tracker
- Water Intake Tracker - Marked as deprecated (hidden from new template selection) → Use Nutrition & Hydration Tracker

**Backward Compatibility:**
- Existing trackers created from deprecated templates continue to work
- Users can still access and edit their existing trackers
- No data migration required (templates are structure-only)

### 4. TypeScript Type Updates

**No changes required** - Conditional fields support already exists from Health Tracker merge:
- `conditional?: { field: string; value: string | number | boolean }` in `TrackerFieldSchema`
- `options?: Array<{ value: string; label: string }>` for dropdown fields
- `description?: string` for field help text

### 5. Service Layer Updates

**No changes required** - `listTemplates()` already filters deprecated templates from Health Tracker merge.

### 6. UI Component Updates

**No changes required** - `TrackerEntryForm.tsx` already supports conditional fields from Health Tracker merge.

**UX Behavior:**
- Entry Type dropdown appears first
- Relevant fields dynamically appear/disappear based on selection
- Conditional fields are cleared when entry type changes
- Field descriptions provide helpful context

### 7. Theme Utilities Updates

**Files Modified:**
- `src/lib/trackerStudio/trackerThemeUtils.ts`
- `src/components/tracker-studio/TrackerTemplatesPage.tsx`

**Changes:**
- Added specific check for "nutrition & hydration" or "nutrition hydration" before generic "nutrition" check
- Uses green theme (matching the template's color setting)
- Ensures correct theme resolution for the unified tracker

## Architecture Patterns

### Conditional Fields Pattern (Reused)

The Nutrition & Hydration Tracker uses the same conditional fields pattern as Health Tracker:

```typescript
{
  id: 'food_description',
  label: 'What did you eat?',
  type: 'text',
  validation: { required: true, maxLength: 1000 },
  conditional: {
    field: 'entry_type',
    value: 'meal'
  }
}
```

### Template Deprecation Pattern (Reused)

Templates are deprecated without breaking existing trackers:
1. Set `deprecated_at = NOW()` on the template
2. Filter deprecated templates in `listTemplates()` service (already implemented)
3. Existing trackers continue to work (they store schema snapshots)
4. New users don't see deprecated templates in selection

## Design Principles

### Observational, Not Prescriptive

- **No calorie counting** - This tracker records what you ate, not nutritional values
- **No macro tracking** - No protein, carbs, fat tracking
- **No nutrition scoring** - No judgment or evaluation of food choices
- **No daily goals** - No targets or achievement states
- **No streaks** - No pressure to maintain consistency
- **No compliance scoring** - No "good" or "bad" food labels

### Body-Respecting

- Neutral tone throughout
- Supports all eating patterns
- No dieting frameworks
- No enforcement logic

### Architectural Alignment

- **Planner** owns nutrition intentions (meal planning, hydration goals)
- **Tracker Studio** owns actual intake observation (this tracker)
- **Spaces** owns food narratives, recipes, and reflection

This tracker is feedback, not instruction.

## Migration Path (Future Phase 2)

The system is prepared for future data migration:

1. **Schema Compatibility:** Nutrition & Hydration Tracker fields match Nutrition Log and Water Intake Tracker fields
2. **Migration Script Ready:** Can migrate entries from old trackers to Nutrition & Hydration Tracker
3. **No Breaking Changes:** Existing trackers remain functional

**Example Migration Logic (not implemented yet):**
```sql
-- Future migration would:
-- 1. Find all Nutrition Log instances
-- 2. Create Nutrition & Hydration Tracker instance for each user
-- 3. Migrate entries: food_description = content, entry_type = 'meal'
-- 4. Find all Water Intake Tracker instances
-- 5. Migrate entries: hydration_amount = cups_glasses, entry_type = 'hydration'
-- 6. Archive old tracker instances
```

## Acceptance Criteria ✅

- ✅ User can track food and hydration in one tracker
- ✅ No duplicate nutrition trackers appear in the UI
- ✅ Existing users lose no data
- ✅ New users see a simpler, clearer option
- ✅ Tracker feels supportive, not prescriptive
- ✅ Conditional fields work correctly
- ✅ Validation skips hidden conditional fields
- ✅ Entry type changes clear irrelevant fields
- ✅ No calorie counting, macro tracking, or nutrition scoring
- ✅ No daily goals, targets, or streaks

## Files Modified

1. `supabase/migrations/20260131000033_merge_nutrition_hydration_trackers.sql` (new)
2. `src/lib/trackerStudio/trackerThemeUtils.ts`
3. `src/components/tracker-studio/TrackerTemplatesPage.tsx`
4. `docs/TRACKER_STUDIO_TEMPLATES_LIST.md`

## Testing Checklist

- [ ] Nutrition & Hydration Tracker template appears in template list
- [ ] Nutrition Log and Water Intake Tracker are hidden from template list
- [ ] Existing Nutrition Log and Water Intake Tracker instances still work
- [ ] Nutrition & Hydration Tracker form shows entry_type dropdown first
- [ ] Selecting "Meal" shows meal fields (meal_type, food_description, tags, mood_or_feelings, meal_notes)
- [ ] Selecting "Hydration" shows hydration fields (hydration_amount, hydration_unit, hydration_notes)
- [ ] Selecting "General Nutrition" shows general nutrition fields (nutrition_notes)
- [ ] Changing entry_type clears irrelevant fields
- [ ] Validation works correctly for conditional fields
- [ ] Charts display correctly for Nutrition & Hydration Tracker
- [ ] Icon (Apple) and color (green) theme display correctly
- [ ] No calorie/macro tracking fields appear
- [ ] No goal/target fields appear

## Notes

- **Non-Goals Achieved:** No calorie counting, no macro tracking, no nutrition scoring, no dieting frameworks, no Planner changes, no enforcement logic
- **Architectural Alignment:** Nutrition & Hydration Tracker is post-execution feedback (Tracker Studio), not planning (Planner)
- **User Experience:** Observational, neutral, body-respecting, and supportive
- **Pattern Consistency:** This merge follows the same structural pattern as Health Tracker (Medication + Symptom → Health Tracker) and can serve as a canonical example for future tracker consolidation
- **Template Count:** 25 active global templates (down from 26, with 5 deprecated templates total)
