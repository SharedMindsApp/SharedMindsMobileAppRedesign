/**
 * Food Intelligence Service
 * 
 * Provides suggestive intelligence for meal planning:
 * - Compare recipe ingredients against pantry
 * - Suggest missing items to grocery list
 * - Suggest recipes based on pantry items
 * 
 * ADHD-First Principles:
 * - All suggestions are optional
 * - No warnings or pressure
 * - Soft messaging only
 * - Never block planning
 */

import { getPantryItems, type PantryItem } from './intelligentGrocery';
import { getFoodItemNames, getFoodItemsByIds, type FoodItem } from './foodItems';
import { getMealLibrary, type MealLibraryItem } from './mealPlanner';

export interface IngredientAvailability {
  food_item_id: string;
  name: string;
  inPantry: boolean;
  pantryItem?: PantryItem;
}

export interface RecipePantryMatch {
  recipe: MealLibraryItem;
  availableCount: number;
  missingCount: number;
  availableIngredients: IngredientAvailability[];
  missingIngredients: IngredientAvailability[];
  matchPercentage: number; // 0-100
}

/**
 * Compare recipe ingredients against pantry
 * Returns which ingredients are available and which are missing
 */
export async function compareRecipeAgainstPantry(
  recipe: MealLibraryItem,
  householdId: string
): Promise<RecipePantryMatch> {
  const pantryItems = await getPantryItems(householdId);
  const pantryFoodItemIds = new Set(
    pantryItems
      .map(item => item.food_item_id)
      .filter(Boolean) as string[]
  );

  const availableIngredients: IngredientAvailability[] = [];
  const missingIngredients: IngredientAvailability[] = [];

  // Process each ingredient
  for (const ingredient of recipe.ingredients) {
    const foodItemId = ingredient.food_item_id;
    const ingredientName = ingredient.name || 'Unknown';

    if (!foodItemId) {
      // If no food_item_id, we can't match it - treat as missing
      missingIngredients.push({
        food_item_id: '',
        name: ingredientName,
        inPantry: false,
      });
      continue;
    }

    const inPantry = pantryFoodItemIds.has(foodItemId);
    const pantryItem = pantryItems.find(item => item.food_item_id === foodItemId);

    const availability: IngredientAvailability = {
      food_item_id: foodItemId,
      name: ingredientName,
      inPantry,
      pantryItem: pantryItem || undefined,
    };

    if (inPantry) {
      availableIngredients.push(availability);
    } else {
      missingIngredients.push(availability);
    }
  }

  const totalIngredients = recipe.ingredients.length;
  const availableCount = availableIngredients.length;
  const missingCount = missingIngredients.length;
  const matchPercentage = totalIngredients > 0 
    ? Math.round((availableCount / totalIngredients) * 100)
    : 0;

  return {
    recipe,
    availableCount,
    missingCount,
    availableIngredients,
    missingIngredients,
    matchPercentage,
  };
}

/**
 * Get pantry-based recipe suggestions
 * Returns recipes that use items currently in pantry
 */
export async function getPantryBasedRecipeSuggestions(
  recipes: MealLibraryItem[],
  householdId: string,
  minMatchPercentage: number = 50
): Promise<RecipePantryMatch[]> {
  const matches: RecipePantryMatch[] = [];

  for (const recipe of recipes) {
    const match = await compareRecipeAgainstPantry(recipe, householdId);
    if (match.matchPercentage >= minMatchPercentage) {
      matches.push(match);
    }
  }

  // Sort by match percentage (highest first)
  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Get missing ingredients for a recipe as food items
 * Useful for adding to grocery list
 */
export async function getMissingIngredientsForRecipe(
  recipe: MealLibraryItem,
  householdId: string
): Promise<FoodItem[]> {
  const match = await compareRecipeAgainstPantry(recipe, householdId);
  
  const missingFoodItemIds = match.missingIngredients
    .map(ing => ing.food_item_id)
    .filter(Boolean) as string[];

  if (missingFoodItemIds.length === 0) {
    return [];
  }

  return await getFoodItemsByIds(missingFoodItemIds);
}

/**
 * Get soft messaging for recipe availability
 * Returns user-friendly messages (no warnings, just info)
 */
export function getRecipeAvailabilityMessage(match: RecipePantryMatch): {
  message: string;
  tone: 'positive' | 'neutral' | 'info';
} {
  if (match.matchPercentage === 100) {
    return {
      message: 'You have all the ingredients!',
      tone: 'positive',
    };
  }

  if (match.matchPercentage >= 75) {
    return {
      message: `You have most ingredients (${match.availableCount}/${match.availableCount + match.missingCount})`,
      tone: 'positive',
    };
  }

  if (match.matchPercentage >= 50) {
    return {
      message: `You have some ingredients (${match.availableCount}/${match.availableCount + match.missingCount})`,
      tone: 'neutral',
    };
  }

  return {
    message: `Missing ${match.missingCount} ingredient${match.missingCount !== 1 ? 's' : ''}`,
    tone: 'info',
  };
}

/**
 * Makeable Recipe Result
 * Represents recipes that can be made now or almost can be made
 */
export interface MakeableRecipeResult {
  recipe: MealLibraryItem;
  missingCount: number;
  totalRequired: number;
  matchPercentage: number;
}

export interface GetMakeableRecipesResult {
  canMakeNow: MakeableRecipeResult[];
  almostCanMake: MakeableRecipeResult[];
}

/**
 * Get recipes that can be made right now based on pantry items
 * 
 * This is the single source of truth for "What Can I Make?" functionality.
 * Used by both PantryWidget and MealPlannerWidget.
 * 
 * @param spaceId - The space ID (household/personal/team) to check pantry for
 * @param includePartial - Whether to include "almost can make" recipes (default: false)
 * @param partialThreshold - Minimum match percentage for "almost can make" (default: 0.8 = 80%)
 * @returns Structured results with canMakeNow and optionally almostCanMake
 */
export async function getMakeableRecipes(
  spaceId: string,
  options: {
    includePartial?: boolean;
    partialThreshold?: number;
  } = {}
): Promise<GetMakeableRecipesResult> {
  const { includePartial = false, partialThreshold = 0.8 } = options;

  // Load pantry items for this space
  const pantryItems = await getPantryItems(spaceId);
  const pantryFoodItemIds = new Set(
    pantryItems
      .map(item => item.food_item_id)
      .filter(Boolean) as string[]
  );

  // Load all recipes from meal library
  const allRecipes = await getMealLibrary();

  const canMakeNow: MakeableRecipeResult[] = [];
  const almostCanMake: MakeableRecipeResult[] = [];

  // Evaluate each recipe
  for (const recipe of allRecipes) {
    // Get required ingredients (exclude optional ones)
    const requiredIngredients = recipe.ingredients.filter(
      ing => !ing.optional && ing.food_item_id
    );

    // Skip recipes with no required ingredients
    if (requiredIngredients.length === 0) {
      continue;
    }

    // Count how many required ingredients are in pantry
    const availableCount = requiredIngredients.filter(ing =>
      pantryFoodItemIds.has(ing.food_item_id!)
    ).length;

    const totalRequired = requiredIngredients.length;
    const missingCount = totalRequired - availableCount;
    const matchPercentage = totalRequired > 0
      ? availableCount / totalRequired
      : 0;

    const result: MakeableRecipeResult = {
      recipe,
      missingCount,
      totalRequired,
      matchPercentage,
    };

    // 100% match = can make now
    if (matchPercentage === 1.0) {
      canMakeNow.push(result);
    }
    // Partial match (if enabled) = almost can make
    else if (includePartial && matchPercentage >= partialThreshold) {
      almostCanMake.push(result);
    }
  }

  // Sort by match percentage (highest first), then by recipe name
  canMakeNow.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return a.recipe.name.localeCompare(b.recipe.name);
  });

  almostCanMake.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return a.recipe.name.localeCompare(b.recipe.name);
  });

  return {
    canMakeNow,
    almostCanMake,
  };
}
