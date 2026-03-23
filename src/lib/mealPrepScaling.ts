/**
 * Meal Prep Scaling Utilities
 * 
 * Functions for scaling recipe ingredients and nutrition values
 * based on meal prep scaling factors
 */

import type { Recipe, RecipeIngredient } from './recipeGeneratorTypes';
import type { MealLibraryItem } from './mealPlanner';
import type { PreparedMeal } from './mealPrepTypes';
import { scaleIngredientQuantity, scaleNutritionValue } from './mealPrepTypes';

/**
 * Scaled ingredient with original and scaled values
 */
export interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
  originalQuantity: number;
}

/**
 * Scaled nutrition values
 */
export interface ScaledNutrition {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
}

/**
 * Scale recipe ingredients for a prepared meal
 */
export function scaleRecipeIngredients(
  ingredients: RecipeIngredient[],
  scalingFactor: number
): ScaledIngredient[] {
  return ingredients.map(ingredient => ({
    ...ingredient,
    scaledQuantity: scaleIngredientQuantity(ingredient.quantity, scalingFactor),
    originalQuantity: ingredient.quantity,
  }));
}

/**
 * Scale meal library item ingredients
 */
export function scaleMealIngredients(
  ingredients: MealLibraryItem['ingredients'],
  scalingFactor: number
): Array<{
  food_item_id?: string;
  name?: string;
  quantity: string;
  unit: string;
  optional?: boolean;
  scaledQuantity: number;
  originalQuantity: string;
}> {
  return ingredients.map(ingredient => {
    // Parse quantity string to number
    const quantityNum = parseFloat(ingredient.quantity) || 0;
    const scaledQuantity = scaleIngredientQuantity(quantityNum, scalingFactor);
    
    return {
      ...ingredient,
      scaledQuantity,
      originalQuantity: ingredient.quantity,
    };
  });
}

/**
 * Scale recipe nutrition values
 */
export function scaleRecipeNutrition(
  recipe: Recipe,
  scalingFactor: number
): ScaledNutrition {
  return {
    calories: scaleNutritionValue(recipe.calories, scalingFactor),
    protein: scaleNutritionValue(recipe.protein, scalingFactor),
    carbs: scaleNutritionValue(recipe.carbs, scalingFactor),
    fat: scaleNutritionValue(recipe.fat, scalingFactor),
    fiber: scaleNutritionValue(recipe.fiber, scalingFactor),
    sodium: scaleNutritionValue(recipe.sodium, scalingFactor),
  };
}

/**
 * Scale meal library item nutrition
 */
export function scaleMealNutrition(
  meal: MealLibraryItem,
  scalingFactor: number
): ScaledNutrition {
  return {
    calories: scaleNutritionValue(meal.calories, scalingFactor),
    protein: scaleNutritionValue(meal.protein, scalingFactor),
    carbs: scaleNutritionValue(meal.carbs, scalingFactor),
    fat: scaleNutritionValue(meal.fat, scalingFactor),
    fiber: null, // Meal library items may not have fiber
    sodium: null, // Meal library items may not have sodium
  };
}

/**
 * Get scaled ingredients for a prepared meal
 * Returns ingredients with both original and scaled quantities
 */
export async function getScaledIngredientsForPreparedMeal(
  preparedMeal: PreparedMeal
): Promise<ScaledIngredient[] | null> {
  if (preparedMeal.recipe_id) {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*, versions:recipe_versions(*)')
      .eq('id', preparedMeal.recipe_id)
      .maybeSingle();
    
    if (error) throw error;
    if (!recipe) return null;
    
    // Get latest version
    const latestVersion = recipe.versions?.[0] || recipe;
    const ingredients = latestVersion.ingredients || [];
    
    return scaleRecipeIngredients(ingredients, preparedMeal.scaling_factor);
  }
  
  return null;
}

import { supabase } from './supabase';
