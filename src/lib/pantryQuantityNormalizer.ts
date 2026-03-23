/**
 * Pantry Quantity Normalizer
 * 
 * Normalizes quantities to logical whole units that match how items are typically
 * sold/packaged in stores. This ensures pantry items are added in realistic quantities
 * (e.g., "1L bottle of olive oil" instead of "0.5L" or "1.2L").
 */

import { getFoodItemName } from './foodItems';

export interface NormalizedQuantity {
  quantityValue: string;
  quantityUnit: string;
}

/**
 * Normalize quantity to logical whole units based on item type
 */
export async function normalizePantryQuantity(
  quantityValue: string | null | undefined,
  quantityUnit: string | null | undefined,
  foodItemId?: string | null,
  foodItemName?: string | null
): Promise<NormalizedQuantity> {
  // If no quantity provided, default to 1
  if (!quantityValue || quantityValue.trim() === '') {
    return { quantityValue: '1', quantityUnit: quantityUnit || '' };
  }

  // Get food item name if not provided
  let itemName = foodItemName;
  if (!itemName && foodItemId) {
    try {
      itemName = await getFoodItemName(foodItemId);
    } catch (error) {
      console.warn('[normalizePantryQuantity] Failed to get food item name:', error);
    }
  }

  const normalizedName = (itemName || '').toLowerCase();
  const unit = (quantityUnit || '').toLowerCase().trim();
  const quantity = parseFloat(quantityValue);

  if (isNaN(quantity) || quantity <= 0) {
    return { quantityValue: '1', quantityUnit: quantityUnit || '' };
  }

  // Handle different item types
  const result = normalizeByItemType(normalizedName, quantity, unit);
  
  return {
    quantityValue: result.quantity.toString(),
    quantityUnit: result.unit,
  };
}

/**
 * Normalize quantity based on item type and common packaging
 */
function normalizeByItemType(
  itemName: string,
  quantity: number,
  unit: string
): { quantity: number; unit: string } {
  // Oils and liquids (bottles)
  if (isOilOrLiquid(itemName, unit)) {
    return normalizeLiquid(quantity, unit);
  }

  // Produce - whole items (onions, cabbage, etc.)
  if (isWholeProduce(itemName, unit)) {
    return normalizeWholeProduce(quantity, itemName);
  }

  // Produce - weight-based (carrots, potatoes, etc.)
  if (isWeightBasedProduce(itemName, unit)) {
    return normalizeWeightBasedProduce(quantity, unit);
  }

  // Meat - weight-based
  if (isMeat(itemName, unit)) {
    return normalizeMeat(quantity, unit);
  }

  // Dairy - weight or volume
  if (isDairy(itemName, unit)) {
    return normalizeDairy(quantity, unit);
  }

  // Pantry staples - weight or count
  if (isPantryStaple(itemName, unit)) {
    return normalizePantryStaple(quantity, unit, itemName);
  }

  // Default: round to nearest whole number if unit suggests counting
  if (isCountableUnit(unit)) {
    return { quantity: Math.round(quantity), unit };
  }

  // Default: keep as-is but round to reasonable precision
  return { quantity: roundToReasonablePrecision(quantity), unit };
}

/**
 * Check if item is oil or liquid
 */
function isOilOrLiquid(itemName: string, unit: string): boolean {
  const oilKeywords = ['oil', 'vinegar', 'sauce', 'juice', 'milk', 'broth', 'stock', 'water'];
  const liquidUnits = ['l', 'litre', 'liter', 'ml', 'millilitre', 'milliliter', 'fl oz', 'cup'];
  
  return oilKeywords.some(keyword => itemName.includes(keyword)) ||
         liquidUnits.some(u => unit.includes(u));
}

/**
 * Normalize liquid quantities to common bottle sizes
 */
function normalizeLiquid(quantity: number, unit: string): { quantity: number; unit: string } {
  // Convert to milliliters for easier comparison
  let ml = convertToMilliliters(quantity, unit);
  
  // Common bottle sizes (in ml): 250, 500, 750, 1000, 1500, 2000
  const commonSizes = [250, 500, 750, 1000, 1500, 2000];
  
  // Find closest common size
  let closest = commonSizes[0];
  let minDiff = Math.abs(ml - closest);
  
  for (const size of commonSizes) {
    const diff = Math.abs(ml - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }
  
  // If very close to a common size (within 10%), use it
  if (minDiff / closest < 0.1) {
    if (closest >= 1000) {
      return { quantity: closest / 1000, unit: 'L' };
    } else {
      return { quantity: closest, unit: 'ml' };
    }
  }
  
  // Otherwise, round to nearest reasonable size
  if (ml >= 1000) {
    return { quantity: Math.round(ml / 100) / 10, unit: 'L' }; // Round to 0.1L
  } else {
    return { quantity: Math.round(ml / 50) * 50, unit: 'ml' }; // Round to 50ml
  }
}

/**
 * Check if item is whole produce (counted individually)
 */
function isWholeProduce(itemName: string, unit: string): boolean {
  const wholeProduce = [
    'onion', 'cabbage', 'lettuce', 'head', 'cauliflower', 'broccoli head',
    'cucumber', 'zucchini', 'eggplant', 'pepper', 'bell pepper', 'chili',
    'apple', 'orange', 'lemon', 'lime', 'avocado', 'mango', 'banana'
  ];
  
  const countUnits = ['piece', 'pieces', 'whole', 'each', 'item', 'items', ''];
  
  return wholeProduce.some(keyword => itemName.includes(keyword)) ||
         (countUnits.includes(unit) && !isWeightBasedProduce(itemName, unit));
}

/**
 * Normalize whole produce to logical counts
 */
function normalizeWholeProduce(quantity: number, itemName: string): { quantity: number; unit: string } {
  // Round to nearest whole number
  const rounded = Math.round(quantity);
  
  // For onions and similar, common bag sizes are: 1, 3, 5, 10, 15, 20
  if (itemName.includes('onion')) {
    const commonCounts = [1, 3, 5, 10, 15, 20];
    const closest = commonCounts.reduce((prev, curr) => 
      Math.abs(curr - rounded) < Math.abs(prev - rounded) ? curr : prev
    );
    return { quantity: closest, unit: '' };
  }
  
  // For single items like cabbage, always round to 1 if less than 1.5
  if (itemName.includes('cabbage') || itemName.includes('lettuce') || itemName.includes('head')) {
    return { quantity: rounded < 1.5 ? 1 : rounded, unit: '' };
  }
  
  // Default: round to whole number
  return { quantity: rounded, unit: '' };
}

/**
 * Check if item is weight-based produce
 */
function isWeightBasedProduce(itemName: string, unit: string): boolean {
  const weightProduce = ['carrot', 'potato', 'tomato', 'mushroom', 'spinach', 'kale', 'celery'];
  const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds'];
  
  return weightProduce.some(keyword => itemName.includes(keyword)) ||
         weightUnits.some(u => unit.includes(u));
}

/**
 * Normalize weight-based produce to common package sizes
 */
function normalizeWeightBasedProduce(quantity: number, unit: string): { quantity: number; unit: string } {
  // Convert to grams
  let grams = convertToGrams(quantity, unit);
  
  // Common package sizes (in grams): 250, 500, 750, 1000, 1500, 2000
  const commonSizes = [250, 500, 750, 1000, 1500, 2000];
  
  // Find closest common size
  let closest = commonSizes[0];
  let minDiff = Math.abs(grams - closest);
  
  for (const size of commonSizes) {
    const diff = Math.abs(grams - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }
  
  // If very close to a common size (within 10%), use it
  if (minDiff / closest < 0.1) {
    if (closest >= 1000) {
      return { quantity: closest / 1000, unit: 'kg' };
    } else {
      return { quantity: closest, unit: 'g' };
    }
  }
  
  // Otherwise, round to nearest reasonable size
  if (grams >= 1000) {
    return { quantity: Math.round(grams / 100) / 10, unit: 'kg' }; // Round to 0.1kg
  } else {
    return { quantity: Math.round(grams / 50) * 50, unit: 'g' }; // Round to 50g
  }
}

/**
 * Check if item is meat
 */
function isMeat(itemName: string, unit: string): boolean {
  const meatKeywords = ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'ground', 'steak', 'breast', 'thigh', 'mince'];
  return meatKeywords.some(keyword => itemName.includes(keyword));
}

/**
 * Normalize meat quantities to common package sizes
 */
function normalizeMeat(quantity: number, unit: string): { quantity: number; unit: string } {
  // Convert to grams
  let grams = convertToGrams(quantity, unit);
  
  // Common meat package sizes (in grams): 250, 300, 400, 500, 750, 1000
  const commonSizes = [250, 300, 400, 500, 750, 1000];
  
  // Find closest common size
  let closest = commonSizes[0];
  let minDiff = Math.abs(grams - closest);
  
  for (const size of commonSizes) {
    const diff = Math.abs(grams - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }
  
  // If very close to a common size (within 15%), use it
  if (minDiff / closest < 0.15) {
    if (closest >= 1000) {
      return { quantity: closest / 1000, unit: 'kg' };
    } else {
      return { quantity: closest, unit: 'g' };
    }
  }
  
  // Otherwise, round to nearest reasonable size
  if (grams >= 1000) {
    return { quantity: Math.round(grams / 100) / 10, unit: 'kg' }; // Round to 0.1kg
  } else {
    return { quantity: Math.round(grams / 50) * 50, unit: 'g' }; // Round to 50g
  }
}

/**
 * Check if item is dairy
 */
function isDairy(itemName: string, unit: string): boolean {
  const dairyKeywords = ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream'];
  return dairyKeywords.some(keyword => itemName.includes(keyword));
}

/**
 * Normalize dairy quantities
 */
function normalizeDairy(quantity: number, unit: string): { quantity: number; unit: string } {
  // For liquids (milk, cream), use liquid normalization
  if (unit.includes('l') || unit.includes('ml') || unit.includes('cup')) {
    return normalizeLiquid(quantity, unit);
  }
  
  // For weight-based (cheese, butter), use weight normalization
  return normalizeWeightBasedProduce(quantity, unit);
}

/**
 * Check if item is pantry staple
 */
function isPantryStaple(itemName: string, unit: string): boolean {
  const stapleKeywords = ['flour', 'sugar', 'rice', 'pasta', 'noodle', 'cereal', 'bread'];
  return stapleKeywords.some(keyword => itemName.includes(keyword));
}

/**
 * Normalize pantry staple quantities
 */
function normalizePantryStaple(quantity: number, unit: string, itemName: string): { quantity: number; unit: string } {
  // For bread, count by loaf/slice
  if (itemName.includes('bread')) {
    if (unit.includes('slice') || unit.includes('loaf')) {
      return { quantity: Math.round(quantity), unit };
    }
  }
  
  // For weight-based staples, use weight normalization
  if (unit.includes('g') || unit.includes('kg') || unit.includes('oz') || unit.includes('lb')) {
    return normalizeWeightBasedProduce(quantity, unit);
  }
  
  // Default: round to whole number
  return { quantity: Math.round(quantity), unit };
}

/**
 * Check if unit suggests counting
 */
function isCountableUnit(unit: string): boolean {
  const countableUnits = ['piece', 'pieces', 'whole', 'each', 'item', 'items', 'loaf', 'loaves', 'slice', 'slices', ''];
  return countableUnits.some(u => unit.includes(u));
}

/**
 * Convert quantity to milliliters
 */
function convertToMilliliters(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (normalizedUnit.includes('l') && !normalizedUnit.includes('ml')) {
    return quantity * 1000; // Liters to ml
  }
  if (normalizedUnit.includes('ml') || normalizedUnit.includes('millilitre') || normalizedUnit.includes('milliliter')) {
    return quantity;
  }
  if (normalizedUnit.includes('cup')) {
    return quantity * 240; // 1 cup ≈ 240ml
  }
  if (normalizedUnit.includes('fl oz') || normalizedUnit.includes('fluid ounce')) {
    return quantity * 29.5735; // 1 fl oz ≈ 29.5735ml
  }
  
  // Default: assume ml if no unit or unknown
  return quantity;
}

/**
 * Convert quantity to grams
 */
function convertToGrams(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (normalizedUnit.includes('kg') || normalizedUnit.includes('kilogram')) {
    return quantity * 1000; // kg to grams
  }
  if (normalizedUnit.includes('g') || normalizedUnit.includes('gram')) {
    return quantity;
  }
  if (normalizedUnit.includes('oz') || normalizedUnit.includes('ounce')) {
    return quantity * 28.3495; // 1 oz ≈ 28.3495g
  }
  if (normalizedUnit.includes('lb') || normalizedUnit.includes('pound')) {
    return quantity * 453.592; // 1 lb ≈ 453.592g
  }
  
  // Default: assume grams if no unit or unknown
  return quantity;
}

/**
 * Round to reasonable precision (max 2 decimal places, remove trailing zeros)
 */
function roundToReasonablePrecision(value: number): number {
  if (value >= 1) {
    return Math.round(value * 100) / 100; // 2 decimal places
  } else {
    return Math.round(value * 1000) / 1000; // 3 decimal places for small values
  }
}
