/**
 * Recipe Ingredient Search Service
 * 
 * Searches recipes by ingredients with pantry-aware ranking.
 * Respects RLS and reuses existing recipe query infrastructure.
 */

import { supabase } from './supabase';
import { listRecipes, type RecipeFilters } from './recipeGeneratorService';
import { getHouseholdIdFromSpaceId } from './recipeAIService';
import type { Recipe, RecipeIngredient } from './recipeGeneratorTypes';
import { getPantryItems } from './intelligentGrocery';
import { getFoodItemsByIds } from './foodItems';

/**
 * Normalize ingredient name for matching (consistent with recipeCompatibilityService)
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if a recipe ingredient name matches a search ingredient (fuzzy match)
 */
function ingredientNameMatches(
  recipeIngredientName: string,
  searchIngredient: string
): boolean {
  const normalizedRecipe = normalizeIngredientName(recipeIngredientName);
  const normalizedSearch = normalizeIngredientName(searchIngredient);
  
  // Exact match
  if (normalizedRecipe === normalizedSearch) {
    return true;
  }
  
  // Substring match (recipe contains search or vice versa)
  if (normalizedRecipe.includes(normalizedSearch) || normalizedSearch.includes(normalizedRecipe)) {
    return true;
  }
  
  // Word boundary match (e.g., "chicken breast" matches "chicken")
  const recipeWords = normalizedRecipe.split(/\s+/);
  const searchWords = normalizedSearch.split(/\s+/);
  
  return searchWords.some(searchWord => 
    recipeWords.some(recipeWord => 
      recipeWord.includes(searchWord) || searchWord.includes(recipeWord)
    )
  );
}

export interface IngredientSearchResult {
  recipe: Recipe;
  matchedIngredientCount: number;
  pantryMatchCount: number;
  totalIngredients: number;
  matchPercentage: number;
}

export interface SearchRecipesByIngredientsParams {
  ingredients: string[]; // Normalized ingredient names
  spaceId?: string;
  profileId?: string;
  householdId?: string | null;
  limit?: number;
  pantryIngredientIds?: Set<string>; // Optional: food_item_ids from pantry for scoring
}

/**
 * Search recipes by ingredients
 * 
 * Matches recipes containing at least 2 of the selected ingredients.
 * Ranks by number of matched ingredients and pantry overlap.
 * Respects existing RLS policies.
 */
export async function searchRecipesByIngredients(
  params: SearchRecipesByIngredientsParams
): Promise<IngredientSearchResult[]> {
  const {
    ingredients,
    spaceId,
    profileId,
    householdId: providedHouseholdId,
    limit = 20,
    pantryIngredientIds,
  } = params;

  // Validate minimum ingredients
  if (!ingredients || ingredients.length < 2) {
    console.warn('[searchRecipesByIngredients] Need at least 2 ingredients for search');
    return [];
  }

  // Normalize ingredient names
  const normalizedIngredients = ingredients.map(normalizeIngredientName);

  // First, try to map ingredient names to food_item_ids for better matching
  // This helps when users type ingredient names that might not match exactly
  const { searchFoodItems } = await import('./foodItems');
  const ingredientToFoodItemMap = new Map<string, string>(); // ingredient name -> food_item_id
  
  for (const ingredient of ingredients) {
    try {
      const foodItems = await searchFoodItems(ingredient, 1);
      if (foodItems.length > 0) {
        ingredientToFoodItemMap.set(ingredient.toLowerCase().trim(), foodItems[0].id);
      }
    } catch (error) {
      // Continue if search fails
      console.warn('[searchRecipesByIngredients] Failed to search food item for ingredient:', ingredient);
    }
  }

  // Convert spaceId to householdId if needed
  let householdId: string | null | undefined = providedHouseholdId;
  if (spaceId && !householdId) {
    householdId = await getHouseholdIdFromSpaceId(spaceId);
  }

  // Build base filters
  const filters: RecipeFilters = {
    household_id: householdId || undefined,
    include_public: true, // Include public recipes
    limit,
  };

  // Get all recipes (respects RLS)
  const allRecipes = await listRecipes(filters);

  // Collect all unique food_item_ids from all recipes
  const allFoodItemIds = new Set<string>();
  for (const recipe of allRecipes) {
    if (recipe.ingredients) {
      recipe.ingredients.forEach(ing => {
        if (ing.food_item_id) {
          allFoodItemIds.add(ing.food_item_id);
        }
      });
    }
  }

  // Batch fetch food item names
  const foodItemNames = await getFoodItemsByIds(Array.from(allFoodItemIds));
  const foodItemNameMap = new Map<string, string>();
  foodItemNames.forEach(item => {
    foodItemNameMap.set(item.id, item.name);
  });

  // Filter and score recipes by ingredient matches
  const results: IngredientSearchResult[] = [];

  for (const recipe of allRecipes) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      continue;
    }

    // Get ingredient food_item_ids and names from recipe
    const recipeIngredientIds = recipe.ingredients
      .map(ing => ing.food_item_id)
      .filter(Boolean) as string[];

    const recipeIngredientNames = recipeIngredientIds
      .map(id => foodItemNameMap.get(id))
      .filter(Boolean) as string[];

    // Count ingredient matches (both by name and by food_item_id)
    let matchedCount = 0;
    const matchedIngredients: string[] = [];

    for (let i = 0; i < ingredients.length; i++) {
      const searchIngredient = ingredients[i];
      const normalizedSearch = normalizedIngredients[i];
      
      // First, try matching by food_item_id (more accurate)
      const searchFoodItemId = ingredientToFoodItemMap.get(searchIngredient.toLowerCase().trim());
      if (searchFoodItemId && recipeIngredientIds.includes(searchFoodItemId)) {
        matchedCount++;
        const matchedName = foodItemNameMap.get(searchFoodItemId);
        if (matchedName) {
          matchedIngredients.push(matchedName);
        }
        continue;
      }
      
      // Fallback: match by name (fuzzy)
      const found = recipeIngredientNames.some(recipeIngredientName => {
        if (ingredientNameMatches(recipeIngredientName, normalizedSearch)) {
          matchedIngredients.push(recipeIngredientName);
          return true;
        }
        return false;
      });
      if (found) {
        matchedCount++;
      }
    }

    // Minimum threshold: at least 2 ingredients must match
    if (matchedCount < 2) {
      continue;
    }

    // Count pantry matches
    let pantryMatchCount = 0;
    if (pantryIngredientIds && pantryIngredientIds.size > 0) {
      pantryMatchCount = recipeIngredientIds.filter(id => 
        pantryIngredientIds.has(id)
      ).length;
    }

    const matchPercentage = recipe.ingredients.length > 0
      ? Math.round((matchedCount / recipe.ingredients.length) * 100)
      : 0;

    results.push({
      recipe,
      matchedIngredientCount: matchedCount,
      pantryMatchCount,
      totalIngredients: recipe.ingredients.length,
      matchPercentage,
    });
  }

  // Sort by: matched ingredients (desc), pantry matches (desc), match percentage (desc)
  results.sort((a, b) => {
    // Primary: matched ingredient count
    if (b.matchedIngredientCount !== a.matchedIngredientCount) {
      return b.matchedIngredientCount - a.matchedIngredientCount;
    }
    // Secondary: pantry matches
    if (b.pantryMatchCount !== a.pantryMatchCount) {
      return b.pantryMatchCount - a.pantryMatchCount;
    }
    // Tertiary: match percentage
    return b.matchPercentage - a.matchPercentage;
  });

  return results.slice(0, limit);
}

/**
 * Get pantry food_item_ids for scoring
 * Helper to fetch pantry items and extract food_item_ids
 */
export async function getPantryIngredientIds(spaceId: string): Promise<Set<string>> {
  const householdId = await getHouseholdIdFromSpaceId(spaceId);
  
  if (!householdId) {
    return new Set();
  }

  try {
    const pantryItems = await getPantryItems(householdId);
    return new Set(
      pantryItems
        .map(item => item.food_item_id)
        .filter(Boolean) as string[]
    );
  } catch (error) {
    console.error('[getPantryIngredientIds] Failed to load pantry:', error);
    return new Set();
  }
}
