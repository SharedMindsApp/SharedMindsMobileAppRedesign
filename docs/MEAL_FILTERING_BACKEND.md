# Meal Filtering Backend Logic

This document describes the backend logic for filtering meals based on household dietary profiles.

## Overview

The meal filtering system validates meals against dietary restrictions, allergies, avoid lists, fasting schedules, and weekly availability schedules stored in `household_diet_profiles`.

## Core Functions

### `getDietProfiles(householdId: string): Promise<DietProfile[]>`

Retrieves all diet profiles for a household. This is the starting point for all filtering operations.

```typescript
const profiles = await getDietProfiles(householdId);
```

### `mealMatchesDiet(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Checks if a meal is compatible with all diet types in the household. Validates against:

- **Vegan**: No animal products (meat, dairy, eggs, honey)
- **Vegetarian**: No meat or fish
- **Pescatarian**: No meat (fish allowed)
- **Halal**: No pork, alcohol, non-halal gelatin
- **Kosher**: No pork, shellfish, mixing meat and dairy
- **Keto**: No high-carb foods (bread, pasta, rice, sugar)
- **Paleo**: No dairy, grains, legumes, processed foods
- **Low-FODMAP**: No high-FODMAP ingredients (onion, garlic, wheat, beans)
- **Gluten-free**: No wheat, barley, rye, gluten
- **Dairy-free**: No milk, cheese, butter, cream, yogurt
- **Diabetic-friendly**: No high sugar content

Returns:
```typescript
{
  allowed: boolean,
  reasons: string[] // e.g., ["Contains meat (vegetarian restriction)"]
}
```

### `mealMatchesAllergies(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Checks if a meal contains any allergens from any household member. Validates against comprehensive allergen keywords:

- **Nuts**: nut, almond, walnut, cashew, pecan, pistachio, hazelnut, macadamia
- **Peanuts**: peanut, peanut butter
- **Tree nuts**: almond, walnut, cashew, pecan, etc.
- **Dairy**: milk, cheese, butter, cream, yogurt, whey, casein, lactose
- **Gluten**: wheat, barley, rye, gluten, flour
- **Soy**: soy, tofu, edamame, miso, tempeh, soy sauce
- **Eggs**: egg, mayonnaise
- **Shellfish**: shrimp, crab, lobster, crayfish, prawn
- **Fish**: fish, salmon, tuna, cod, tilapia, trout
- **Sesame**: sesame, tahini
- And more...

Returns same structure as `mealMatchesDiet()`.

### `mealMatchesAvoidList(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Checks if a meal contains any custom items from household members' avoid lists. Uses substring matching to catch variations.

Example: If someone avoids "mushrooms", it will match "mushroom soup", "mushrooms", etc.

### `isMealSkippedDueToFasting(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Checks if a meal falls within a fasting window. Uses meal type to determine typical meal time:
- Breakfast: 08:00
- Lunch: 12:00
- Dinner: 18:00

Handles overnight fasting windows correctly (e.g., 20:00 - 12:00).

### `isMealSkippedDueToAvailability(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Checks if any household member is marked as "away" for the meal on that day of the week.

### `filterMeal(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult`

Comprehensive filter that runs all checks in sequence:
1. Diet type compatibility
2. Allergen check
3. Avoid list check
4. Fasting schedule check
5. Availability check

Returns on first failure for efficiency.

### `filterMeals(meals: Meal[], householdId: string): Promise<FilteredMeals>`

Batch filtering function that categorizes meals into allowed and filtered.

Returns:
```typescript
{
  allowed: Meal[],
  filtered: Array<{ meal: Meal, reasons: string[] }>
}
```

## Helper Functions

### `getQuickMealSuggestions(meals: Meal[], dietProfiles: DietProfile[]): Meal[]`

Returns only meals that:
- Pass all dietary filters
- Have prep time of 30 minutes or less

Useful for "quick meal only" availability slots.

### `getMealsForDay(meals: Meal[], dayOfWeek: string, dietProfiles: DietProfile[]): DayMeals`

Returns filtered meals organized by meal type for a specific day:

```typescript
{
  breakfast: Meal[],
  lunch: Meal[],
  dinner: Meal[]
}
```

## Meal Type

The `Meal` type structure:

```typescript
type Meal = {
  id: string;
  name: string;
  ingredients?: string[];     // e.g., ["chicken", "rice", "broccoli"]
  tags?: string[];            // e.g., ["gluten-free", "high-protein"]
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  dayOfWeek?: string;         // e.g., "monday"
  prepTime?: number;          // minutes
  description?: string;
};
```

## Filtering Rules

### Rule Priority

1. **Diet Type**: Checked first as it's the most fundamental restriction
2. **Allergies**: Critical safety concern, filters immediately
3. **Avoid List**: Personal preferences
4. **Fasting**: Time-based restrictions
5. **Availability**: Schedule-based restrictions

### Multi-Member Logic

The system uses an "everyone compatible" approach:
- If ANY member has a restriction, the meal must satisfy it
- Meals are only shown if ALL members can eat them
- This ensures household-wide meal planning

Future UI enhancements can allow per-member meal selection.

### Keyword Matching

The system uses substring matching for flexibility:
- Searches meal name, ingredients, and tags
- Case-insensitive matching
- Handles plural forms and variations

Examples:
- "chicken breast" matches "chicken"
- "gluten-free bread" matches "gluten" but is marked gluten-free in tags
- System checks tags first to allow properly labeled substitutions

## Usage Examples

### Example 1: Filter a single meal

```typescript
import { filterMeal, getDietProfiles } from './lib/mealFiltering';

const meal = {
  id: '1',
  name: 'Chicken Pasta',
  ingredients: ['chicken', 'pasta', 'cream', 'parmesan'],
  mealType: 'dinner',
  prepTime: 45
};

const profiles = await getDietProfiles(householdId);
const result = filterMeal(meal, profiles);

if (!result.allowed) {
  console.log('Meal rejected:', result.reasons);
  // e.g., ["Contains gluten", "Contains dairy"]
}
```

### Example 2: Filter meal list

```typescript
import { filterMeals } from './lib/mealFiltering';

const meals = [
  { id: '1', name: 'Grilled Salmon', ingredients: ['salmon', 'lemon'] },
  { id: '2', name: 'Beef Tacos', ingredients: ['beef', 'tortilla', 'cheese'] },
  { id: '3', name: 'Tofu Stir Fry', ingredients: ['tofu', 'vegetables', 'soy sauce'] }
];

const { allowed, filtered } = await filterMeals(meals, householdId);

console.log(`${allowed.length} meals available`);
console.log(`${filtered.length} meals filtered out`);

filtered.forEach(({ meal, reasons }) => {
  console.log(`${meal.name}: ${reasons.join(', ')}`);
});
```

### Example 3: Get quick meals for training day

```typescript
import { getQuickMealSuggestions, getDietProfiles } from './lib/mealFiltering';

const profiles = await getDietProfiles(householdId);
const quickMeals = getQuickMealSuggestions(allMeals, profiles);

// Returns only meals that:
// - Pass all dietary filters
// - Can be prepared in 30 minutes or less
```

### Example 4: Weekly meal planning

```typescript
import { getMealsForDay, getDietProfiles } from './lib/mealFiltering';

const profiles = await getDietProfiles(householdId);
const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const weekPlan = weekDays.map(day => {
  const dayMeals = getMealsForDay(allMeals, day, profiles);
  return {
    day,
    breakfast: dayMeals.breakfast,
    lunch: dayMeals.lunch,
    dinner: dayMeals.dinner
  };
});
```

## Integration Points

### Where to use this logic:

1. **Meal Planner Widget**: Filter meal suggestions before displaying
2. **Weekly Calendar**: Hide/show meals based on availability
3. **Recipe Suggestions**: Only show compatible recipes
4. **Shopping List Generator**: Only include ingredients for compatible meals
5. **Meal Prep Dashboard**: Plan meals that everyone can eat

## Performance Considerations

- **Batch filtering**: Use `filterMeals()` for bulk operations
- **Cache profiles**: Load diet profiles once per session/operation
- **Lazy evaluation**: `filterMeal()` returns on first failure
- **Indexing**: Consider indexing meals by tags/ingredients for large datasets

## Future Enhancements

Potential improvements for future iterations:

1. **Per-member filtering**: Allow meal selection for specific members
2. **Substitution suggestions**: Recommend ingredient swaps to make meals compatible
3. **Meal scoring**: Rank meals by how many members can eat them
4. **Nutritional filtering**: Add calorie, macro, and micronutrient constraints
5. **Seasonal filtering**: Consider ingredient seasonality and availability
6. **Budget filtering**: Filter by cost per serving
7. **Skill level filtering**: Match to household cooking experience

## Testing

Test cases should cover:
- Each diet type individually
- Multiple diet types combined
- Each allergen type
- Fasting window edge cases (overnight, all-day)
- Availability schedules (away, training, quick meals)
- Empty diet profiles (no restrictions)
- Complex meals with many ingredients
- Edge cases (missing data, malformed meals)
