/**
 * Ingredient Scaling Utility
 * 
 * Pure, deterministic scaling of recipe ingredients based on portion count.
 * This is render-time only - never mutates recipe data.
 */

import type { RecipeIngredient } from './recipeGeneratorTypes';
import { convertIngredientPieceToGramsSync } from './pieceToWeightConverter';

/**
 * Units that should never be scaled (text-only, qualitative)
 */
const NON_SCALABLE_UNITS = [
  'to taste',
  'pinch',
  'dash',
  'as needed',
  'optional',
  'for garnish',
  'for serving',
];

/**
 * Check if a unit should be scaled
 */
function isScalableUnit(unit: string): boolean {
  if (!unit) return true; // If no unit, assume scalable
  const normalizedUnit = unit.toLowerCase().trim();
  return !NON_SCALABLE_UNITS.some(nonScalable => 
    normalizedUnit.includes(nonScalable)
  );
}

/**
 * Check if a quantity is numeric (can be scaled)
 */
function isNumericQuantity(quantity: string): boolean {
  if (!quantity) return false;
  // Try to parse as number, but exclude text-only quantities
  const num = parseFloat(quantity);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Format ingredient quantity with sensible rounding
 * 
 * Rules:
 * - Integers stay integers where possible
 * - < 1 → round to 1 decimal place
 * - ≥ 1 → round to nearest 0.5 or whole
 * - Avoid ugly values like 0.333333
 */
export function formatIngredientQuantity(value: number): string {
  if (value <= 0) return '0';
  
  // If it's already a whole number, return as-is
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  // For values < 1, round to 1 decimal place
  if (value < 1) {
    return value.toFixed(1).replace(/\.0$/, ''); // Remove trailing .0
  }
  
  // For values ≥ 1, round to nearest 0.5 or whole
  const rounded = Math.round(value * 2) / 2; // Round to nearest 0.5
  
  // If it's a whole number, return without decimals
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }
  
  // Otherwise return with one decimal (e.g., 1.5, 2.5)
  return rounded.toFixed(1);
}

/**
 * Scaled ingredient with original and scaled quantities
 */
export interface ScaledIngredient extends RecipeIngredient {
  originalQuantity: string; // Original quantity for reference
  scaledQuantity: number; // Numeric scaled quantity
  displayQuantity: string; // Formatted string for UI display
  isScaled: boolean; // Whether this ingredient was actually scaled
}

/**
 * Scale recipe ingredients based on portion count
 * 
 * @param ingredients - Original recipe ingredients
 * @param recipeServings - Base servings from recipe (defaults to 1 if missing/0)
 * @param planServings - Selected servings from meal plan (defaults to 1 if missing)
 * @returns Scaled ingredients with original quantities preserved
 */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  recipeServings: number,
  planServings: number
): ScaledIngredient[] {
  // Defensive defaults
  const baseServings = recipeServings && recipeServings > 0 ? recipeServings : 1;
  const targetServings = planServings && planServings > 0 ? planServings : 1;
  
  // If servings are the same, no scaling needed
  if (baseServings === targetServings) {
    return ingredients.map(ing => ({
      ...ing,
      originalQuantity: ing.quantity,
      scaledQuantity: parseFloat(ing.quantity) || 0,
      displayQuantity: ing.quantity,
      isScaled: false,
    }));
  }
  
  const scalingFactor = targetServings / baseServings;
  
  return ingredients.map(ing => {
    const originalQuantity = ing.quantity || '';
    const unit = ing.unit || '';
    
    // Check if this ingredient should be scaled
    const shouldScale = 
      isNumericQuantity(originalQuantity) && 
      isScalableUnit(unit);
    
    if (!shouldScale) {
      // Text-only or non-scalable ingredient - return as-is
      return {
        ...ing,
        originalQuantity,
        scaledQuantity: parseFloat(originalQuantity) || 0,
        displayQuantity: originalQuantity,
        isScaled: false,
      };
    }
    
    // Scale the quantity
    const baseQuantity = parseFloat(originalQuantity);
    const scaledValue = baseQuantity * scalingFactor;
    const displayQuantity = formatIngredientQuantity(scaledValue);
    
    return {
      ...ing,
      originalQuantity,
      scaledQuantity: scaledValue,
      displayQuantity,
      isScaled: true,
    };
  });
}

/**
 * Get scaling information for display
 */
export function getScalingInfo(
  recipeServings: number,
  planServings: number
): {
  isScaled: boolean;
  scalingFactor: number;
  effectiveServings: number;
} {
  const baseServings = recipeServings && recipeServings > 0 ? recipeServings : 1;
  const targetServings = planServings && planServings > 0 ? planServings : 1;
  const isScaled = baseServings !== targetServings;
  const scalingFactor = isScaled ? targetServings / baseServings : 1;
  
  return {
    isScaled,
    scalingFactor,
    effectiveServings: targetServings,
  };
}

/**
 * TODO: Future integration points
 * 
 * Shopping List Generation:
 * - When generating shopping lists from meal plans, use scaledIngredients()
 *   with plan.servings to get correct quantities
 * - Example: const scaled = scaleIngredients(recipe.ingredients, recipe.servings, plan.servings);
 * 
 * Pantry Deduction:
 * - When checking pantry availability or deducting ingredients, use scaled quantities
 * - Example: Check pantry against scaled quantities, not base recipe quantities
 * 
 * Nutrition Calculations:
 * - If nutrition per serving is stored, multiply by plan.servings for total nutrition
 * - Example: totalCalories = (recipe.calories || 0) * (plan.servings / recipe.servings)
 */
