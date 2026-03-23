/**
 * Unit Normalization System
 * 
 * Converts AI-provided ingredient units to canonical metric format before storage.
 * This ensures all recipes are stored in a consistent format.
 * 
 * Canonical units:
 * - Weight: g, kg
 * - Volume: ml, l
 * - Small measures: tsp, tbsp
 * - Count-based: clove, piece, egg (no conversion)
 */

export type CanonicalUnit = 
  // Weight
  | 'g' | 'kg'
  // Volume
  | 'ml' | 'l'
  // Small measures (preserved as-is)
  | 'tsp' | 'tbsp'
  // Count-based (no conversion)
  | 'clove' | 'piece' | 'egg' | 'whole' | 'item';

export interface NormalizedIngredient {
  value: number;
  unit: CanonicalUnit;
  originalQuantity?: string; // Preserve original for debugging
  originalUnit?: string;
}

/**
 * Conversion factors from common units to canonical metric
 */
const UNIT_CONVERSIONS_TO_CANONICAL: Record<string, { value: number; unit: CanonicalUnit }> = {
  // Weight conversions
  'oz': { value: 28.3495, unit: 'g' },
  'ounce': { value: 28.3495, unit: 'g' },
  'ounces': { value: 28.3495, unit: 'g' },
  'lb': { value: 453.592, unit: 'g' },
  'lbs': { value: 453.592, unit: 'g' },
  'pound': { value: 453.592, unit: 'g' },
  'pounds': { value: 453.592, unit: 'g' },
  
  // Volume conversions
  'cup': { value: 240, unit: 'ml' },
  'cups': { value: 240, unit: 'ml' },
  'c': { value: 240, unit: 'ml' },
  'fl oz': { value: 29.5735, unit: 'ml' },
  'fl_oz': { value: 29.5735, unit: 'ml' },
  'fluid ounce': { value: 29.5735, unit: 'ml' },
  'fluid ounces': { value: 29.5735, unit: 'ml' },
  'pint': { value: 473.176, unit: 'ml' },
  'pints': { value: 473.176, unit: 'ml' },
  'pt': { value: 473.176, unit: 'ml' },
  'quart': { value: 946.353, unit: 'ml' },
  'quarts': { value: 946.353, unit: 'ml' },
  'qt': { value: 946.353, unit: 'ml' },
  'gallon': { value: 3785.41, unit: 'ml' },
  'gallons': { value: 3785.41, unit: 'ml' },
  'gal': { value: 3785.41, unit: 'ml' },
  
  // Small measures (preserved as-is, but normalize spelling)
  'teaspoon': { value: 1, unit: 'tsp' },
  'teaspoons': { value: 1, unit: 'tsp' },
  't': { value: 1, unit: 'tsp' },
  'tablespoon': { value: 1, unit: 'tbsp' },
  'tablespoons': { value: 1, unit: 'tbsp' },
  'T': { value: 1, unit: 'tbsp' },
  'Tbsp': { value: 1, unit: 'tbsp' },
  'Tsp': { value: 1, unit: 'tsp' },
  
  // Count-based units (preserved as-is)
  'clove': { value: 1, unit: 'clove' },
  'cloves': { value: 1, unit: 'clove' },
  'piece': { value: 1, unit: 'piece' },
  'pieces': { value: 1, unit: 'piece' },
  'egg': { value: 1, unit: 'egg' },
  'eggs': { value: 1, unit: 'egg' },
  'whole': { value: 1, unit: 'whole' },
  'item': { value: 1, unit: 'item' },
  'items': { value: 1, unit: 'item' },
};

/**
 * Normalize ingredient quantity and unit to canonical format
 * 
 * @param quantity - Raw quantity string (e.g., "2", "1.5", "1/2")
 * @param unit - Raw unit string (e.g., "cup", "oz", "tbsp")
 * @returns Normalized ingredient with numeric value and canonical unit
 */
export function normalizeIngredientQuantity(
  quantity: string,
  unit: string
): NormalizedIngredient {
  const originalQuantity = quantity;
  const originalUnit = unit;
  
  // Normalize unit to lowercase and trim
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Parse quantity to number
  let numericValue: number;
  
  try {
    // Handle fractions (e.g., "1/2", "3/4")
    if (quantity.includes('/')) {
      const [numerator, denominator] = quantity.split('/').map(s => parseFloat(s.trim()));
      if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        throw new Error(`Invalid fraction: ${quantity}`);
      }
      numericValue = numerator / denominator;
    } else {
      numericValue = parseFloat(quantity.trim());
      if (isNaN(numericValue)) {
        throw new Error(`Invalid quantity: ${quantity}`);
      }
    }
  } catch (error) {
    console.warn('[unitNormalization] Failed to parse quantity, using 1 as fallback:', {
      quantity,
      unit,
      error: error instanceof Error ? error.message : String(error),
    });
    numericValue = 1; // Safe fallback
  }
  
  // Check if unit needs conversion
  const conversion = UNIT_CONVERSIONS_TO_CANONICAL[normalizedUnit];
  
  if (conversion) {
    // Convert to canonical unit
    const convertedValue = numericValue * conversion.value;
    
    // For large values, convert to larger unit (e.g., 2000g -> 2kg, 2000ml -> 2l)
    if (conversion.unit === 'g' && convertedValue >= 1000) {
      return {
        value: convertedValue / 1000,
        unit: 'kg',
        originalQuantity,
        originalUnit,
      };
    }
    
    if (conversion.unit === 'ml' && convertedValue >= 1000) {
      return {
        value: convertedValue / 1000,
        unit: 'l',
        originalQuantity,
        originalUnit,
      };
    }
    
    return {
      value: convertedValue,
      unit: conversion.unit,
      originalQuantity,
      originalUnit,
    };
  }
  
  // Unit is already canonical or unknown - preserve as-is
  // Check if it's a known canonical unit
  const canonicalUnits: CanonicalUnit[] = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'clove', 'piece', 'egg', 'whole', 'item'];
  const isCanonical = canonicalUnits.includes(normalizedUnit as CanonicalUnit);
  
  if (!isCanonical) {
    console.warn('[unitNormalization] Unknown unit, preserving as-is:', {
      unit: normalizedUnit,
      quantity: originalQuantity,
    });
  }
  
  return {
    value: numericValue,
    unit: (normalizedUnit as CanonicalUnit) || 'piece', // Fallback to 'piece' for unknown units
    originalQuantity,
    originalUnit,
  };
}

/**
 * Normalize a full recipe ingredient
 * 
 * @param ingredient - Recipe ingredient with quantity and unit
 * @returns Ingredient with normalized quantity and unit
 */
export function normalizeIngredient(ingredient: {
  quantity: string;
  unit: string;
  [key: string]: any;
}): {
  quantity: string; // Converted to string for storage
  unit: string;
  [key: string]: any;
} {
  const normalized = normalizeIngredientQuantity(ingredient.quantity, ingredient.unit);
  
  return {
    ...ingredient,
    quantity: normalized.value.toString(),
    unit: normalized.unit,
  };
}

/**
 * Normalize all ingredients in a recipe
 * 
 * @param ingredients - Array of recipe ingredients
 * @returns Array of normalized ingredients
 */
export function normalizeRecipeIngredients(
  ingredients: Array<{ quantity: string; unit: string; [key: string]: any }>
): Array<{ quantity: string; unit: string; [key: string]: any }> {
  return ingredients.map(ingredient => normalizeIngredient(ingredient));
}

/**
 * Convert piece-based units to grams for ingredients
 * This is a post-processing step that should be called after normalizeRecipeIngredients
 * when you have ingredient names or food_item_ids available
 * 
 * @param ingredients - Array of normalized ingredients (must have food_item_id or name)
 * @returns Array of ingredients with piece units converted to grams where possible
 */
export async function convertPieceUnitsToGrams(
  ingredients: Array<{ 
    quantity: string; 
    unit: string; 
    food_item_id?: string;
    name?: string;
    [key: string]: any;
  }>
): Promise<Array<{ quantity: string; unit: string; [key: string]: any }>> {
  const { convertPieceToGrams, convertPieceToGramsSync } = await import('./pieceToWeightConverter');
  
  const converted = await Promise.all(
    ingredients.map(async (ingredient) => {
      // Only convert if unit is "piece" or "pieces"
      const normalizedUnit = ingredient.unit.toLowerCase().trim();
      if (normalizedUnit !== 'piece' && normalizedUnit !== 'pieces') {
        return ingredient;
      }
      
      // Try to convert piece to grams
      const quantityNum = parseFloat(ingredient.quantity);
      if (isNaN(quantityNum)) {
        return ingredient; // Can't convert if quantity is not numeric
      }
      
      let convertedGrams: number | null = null;
      
      // Try with ingredient name first (if available)
      if (ingredient.name) {
        convertedGrams = convertPieceToGramsSync(quantityNum, ingredient.name);
      }
      
      // If that didn't work and we have food_item_id, try async lookup
      if (!convertedGrams && ingredient.food_item_id) {
        convertedGrams = await convertPieceToGrams(quantityNum, undefined, ingredient.food_item_id);
      }
      
      // If conversion succeeded, update the ingredient
      if (convertedGrams !== null && convertedGrams > 0) {
        // Round to reasonable precision (no decimals for large values, 1 decimal for smaller)
        const roundedGrams = convertedGrams >= 100 
          ? Math.round(convertedGrams)
          : Math.round(convertedGrams * 10) / 10;
        
        return {
          ...ingredient,
          quantity: roundedGrams.toString(),
          unit: 'g',
        };
      }
      
      // Conversion not possible, return as-is
      return ingredient;
    })
  );
  
  return converted;
}
