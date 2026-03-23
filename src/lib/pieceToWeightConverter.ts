/**
 * Piece to Weight Converter
 * 
 * Converts "piece" units to measurable weights (grams) based on ingredient names.
 * This ensures recipes always have measurable units instead of vague "piece" measurements.
 */

import { getFoodItemName } from './foodItems';

/**
 * Typical weights for common ingredients (in grams per piece/item)
 * These are average/typical values for standard sizes
 */
const INGREDIENT_WEIGHTS: Record<string, number> = {
  // Meats (per piece/portion)
  'chicken breast': 170, // Average boneless, skinless chicken breast
  'chicken thigh': 85, // Average boneless chicken thigh
  'chicken wing': 90, // Average chicken wing
  'chicken drumstick': 100, // Average chicken drumstick
  'ground beef': 113, // 4oz patty
  'beef steak': 200, // Average steak portion
  'pork chop': 150, // Average pork chop
  'salmon fillet': 150, // Average salmon fillet
  'cod fillet': 150, // Average cod fillet
  'tuna steak': 150, // Average tuna steak
  
  // Vegetables (per piece)
  'onion': 150, // Medium onion
  'onions': 150,
  'garlic': 3, // Single clove
  'garlic clove': 3,
  'garlic cloves': 3,
  'clove': 3, // Garlic clove
  'cloves': 3,
  'bell pepper': 150, // Medium bell pepper
  'bell peppers': 150,
  'tomato': 150, // Medium tomato
  'tomatoes': 150,
  'potato': 200, // Medium potato
  'potatoes': 200,
  'carrot': 60, // Medium carrot
  'carrots': 60,
  'cucumber': 200, // Medium cucumber
  'cucumbers': 200,
  'zucchini': 200, // Medium zucchini
  'eggplant': 300, // Medium eggplant
  'avocado': 200, // Medium avocado
  'avocados': 200,
  'lemon': 60, // Medium lemon
  'lemons': 60,
  'lime': 50, // Medium lime
  'limes': 50,
  'apple': 180, // Medium apple
  'apples': 180,
  'banana': 120, // Medium banana
  'bananas': 120,
  'orange': 150, // Medium orange
  'oranges': 150,
  
  // Breads & Baked Goods
  'bread slice': 25, // Average slice of bread
  'bread slices': 25,
  'slice': 25, // Generic slice (bread)
  'slices': 25,
  'bagel': 105, // Average bagel
  'bagels': 105,
  'muffin': 60, // Average muffin
  'muffins': 60,
  'roll': 50, // Average dinner roll
  'rolls': 50,
  
  // Dairy & Eggs
  'egg': 50, // Large egg
  'eggs': 50,
  'cheese slice': 20, // Average cheese slice
  'cheese slices': 20,
  
  // Canned Goods (per can)
  'can': 400, // Average can (e.g., tomatoes, beans)
  'cans': 400,
  'tin': 400, // Same as can
  'tins': 400,
  
  // Other common items
  'fillet': 150, // Generic fish fillet
  'fillets': 150,
  'patty': 113, // Generic patty (burger, etc.)
  'patties': 113,
  'chop': 150, // Generic chop (pork, lamb)
  'chops': 150,
  'steak': 200, // Generic steak
  'steaks': 200,
};

/**
 * Normalize ingredient name for lookup
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Find weight for an ingredient by name
 * Uses fuzzy matching to find the best match
 */
function findIngredientWeight(ingredientName: string): number | null {
  const normalized = normalizeIngredientName(ingredientName);
  
  // Direct match
  if (INGREDIENT_WEIGHTS[normalized]) {
    return INGREDIENT_WEIGHTS[normalized];
  }
  
  // Partial match - check if any key is contained in the name or vice versa
  for (const [key, weight] of Object.entries(INGREDIENT_WEIGHTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return weight;
    }
  }
  
  // Try matching common patterns
  if (normalized.includes('chicken breast')) return INGREDIENT_WEIGHTS['chicken breast'];
  if (normalized.includes('chicken thigh')) return INGREDIENT_WEIGHTS['chicken thigh'];
  if (normalized.includes('chicken wing')) return INGREDIENT_WEIGHTS['chicken wing'];
  if (normalized.includes('ground beef') || normalized.includes('beef mince')) return INGREDIENT_WEIGHTS['ground beef'];
  if (normalized.includes('salmon')) return INGREDIENT_WEIGHTS['salmon fillet'];
  if (normalized.includes('cod')) return INGREDIENT_WEIGHTS['cod fillet'];
  if (normalized.includes('tuna')) return INGREDIENT_WEIGHTS['tuna steak'];
  if (normalized.includes('onion')) return INGREDIENT_WEIGHTS['onion'];
  if (normalized.includes('garlic') && (normalized.includes('clove') || normalized.includes('cloves'))) return INGREDIENT_WEIGHTS['garlic clove'];
  if (normalized.includes('bell pepper') || normalized.includes('pepper')) return INGREDIENT_WEIGHTS['bell pepper'];
  if (normalized.includes('tomato')) return INGREDIENT_WEIGHTS['tomato'];
  if (normalized.includes('potato')) return INGREDIENT_WEIGHTS['potato'];
  if (normalized.includes('carrot')) return INGREDIENT_WEIGHTS['carrot'];
  if (normalized.includes('egg')) return INGREDIENT_WEIGHTS['egg'];
  if (normalized.includes('bread') && (normalized.includes('slice') || normalized.includes('slices'))) return INGREDIENT_WEIGHTS['bread slice'];
  if (normalized.includes('fillet')) return INGREDIENT_WEIGHTS['fillet'];
  if (normalized.includes('steak')) return INGREDIENT_WEIGHTS['steak'];
  if (normalized.includes('chop')) return INGREDIENT_WEIGHTS['chop'];
  if (normalized.includes('patty') || normalized.includes('patties')) return INGREDIENT_WEIGHTS['patty'];
  if (normalized.includes('can') || normalized.includes('tin')) return INGREDIENT_WEIGHTS['can'];
  
  return null;
}

/**
 * Convert piece-based quantity to grams
 * 
 * @param quantity - Number of pieces
 * @param ingredientName - Name of the ingredient (e.g., "chicken breast", "onion")
 * @param foodItemId - Optional food item ID to look up name if ingredientName is not provided
 * @returns Weight in grams, or null if conversion not possible
 */
export async function convertPieceToGrams(
  quantity: number,
  ingredientName?: string,
  foodItemId?: string
): Promise<number | null> {
  let name = ingredientName;
  
  // If no name provided but we have foodItemId, try to get it
  if (!name && foodItemId) {
    try {
      name = await getFoodItemName(foodItemId);
    } catch (error) {
      console.warn('[convertPieceToGrams] Failed to get food item name:', error);
      return null;
    }
  }
  
  if (!name) {
    return null;
  }
  
  const weightPerPiece = findIngredientWeight(name);
  
  if (!weightPerPiece) {
    return null;
  }
  
  return quantity * weightPerPiece;
}

/**
 * Check if an ingredient name likely represents a piece-based measurement
 * that should be converted to weight
 */
export function shouldConvertPieceToWeight(ingredientName: string): boolean {
  const normalized = normalizeIngredientName(ingredientName);
  
  // Ingredients that are commonly measured by piece and should be converted
  const convertiblePatterns = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'cod',
    'onion', 'garlic', 'pepper', 'tomato', 'potato', 'carrot',
    'egg', 'bread', 'fillet', 'steak', 'chop', 'patty',
  ];
  
  return convertiblePatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Synchronous version that uses ingredient name only (no async food item lookup)
 * Use this when you already have the ingredient name
 */
export function convertPieceToGramsSync(
  quantity: number,
  ingredientName: string
): number | null {
  const weightPerPiece = findIngredientWeight(ingredientName);
  
  if (!weightPerPiece) {
    return null;
  }
  
  return quantity * weightPerPiece;
}

/**
 * Convert ingredient unit from "piece" to "g" if possible
 * Returns the converted ingredient or the original if conversion isn't possible
 * 
 * @param ingredient - Ingredient with quantity, unit, and optional name/food_item_id
 * @returns Ingredient with converted unit (piece -> g) if conversion succeeded
 */
export function convertIngredientPieceToGramsSync(ingredient: {
  quantity: string | number;
  unit: string;
  name?: string;
  food_item_id?: string;
}): {
  quantity: string;
  unit: string;
  converted: boolean;
} {
  const normalizedUnit = ingredient.unit.toLowerCase().trim();
  
  // Only convert if unit is "piece" or "pieces"
  if (normalizedUnit !== 'piece' && normalizedUnit !== 'pieces') {
    return {
      quantity: typeof ingredient.quantity === 'string' ? ingredient.quantity : ingredient.quantity.toString(),
      unit: ingredient.unit,
      converted: false,
    };
  }
  
  // Parse quantity
  const quantityNum = typeof ingredient.quantity === 'string' 
    ? parseFloat(ingredient.quantity)
    : ingredient.quantity;
  
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return {
      quantity: typeof ingredient.quantity === 'string' ? ingredient.quantity : ingredient.quantity.toString(),
      unit: ingredient.unit,
      converted: false,
    };
  }
  
  // Try to convert if we have ingredient name
  if (ingredient.name) {
    const convertedGrams = convertPieceToGramsSync(quantityNum, ingredient.name);
    
    if (convertedGrams !== null && convertedGrams > 0) {
      // Round to reasonable precision
      const roundedGrams = convertedGrams >= 100 
        ? Math.round(convertedGrams)
        : Math.round(convertedGrams * 10) / 10;
      
      return {
        quantity: roundedGrams.toString(),
        unit: 'g',
        converted: true,
      };
    }
  }
  
  // Conversion not possible
  return {
    quantity: typeof ingredient.quantity === 'string' ? ingredient.quantity : ingredient.quantity.toString(),
    unit: ingredient.unit,
    converted: false,
  };
}
