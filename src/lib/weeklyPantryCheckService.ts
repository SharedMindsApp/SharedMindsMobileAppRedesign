/**
 * Weekly Pantry Check Service
 * 
 * Aggregates ingredients from all meal plans in a week, scales them based on servings,
 * and compares against pantry to determine what's in stock vs needs buying.
 */

import { getWeeklyMealPlan, type MealPlan } from './mealPlanner';
import { getPantryItems, type PantryItem } from './intelligentGrocery';
import { scaleIngredients, type ScaledIngredient } from './ingredientScaling';
import { getFoodItemName, normalizeFoodName } from './foodItems';
import type { RecipeIngredient } from './recipeGeneratorTypes';
import { supabase } from './supabase';

export interface WeeklyIngredientCheck {
  ingredientId?: string | null; // food_item_id if available
  name: string; // Ingredient name (from food_item or fallback)
  requiredQuantity?: number; // Numeric quantity (scaled)
  requiredQuantityDisplay?: string; // Formatted display string
  unit?: string; // Unit (e.g., "cups", "tbsp")
  inPantry: boolean; // Whether ingredient is in pantry
  pantryQuantity?: number; // Numeric quantity in pantry
  pantryQuantityDisplay?: string; // Formatted display string
  missingQuantity?: number; // How much more is needed
  missingQuantityDisplay?: string; // Formatted display string
  needsManualCheck: boolean; // For non-scalable ingredients (to taste, pinch, etc.)
  occurrences: number; // How many times this ingredient appears across meals
  // Portion tracking fields
  isPortionTracked?: boolean; // Whether this is a portion-tracked pantry item
  pantryItemId?: string | null; // ID of portion-tracked pantry item
  totalPortions?: number | null; // Total portions available
  remainingPortions?: number | null; // Remaining portions after this week
  portionUnit?: string | null; // Unit for portions (e.g., "serving", "slice")
  portionsRequired?: number; // Portions required this week
  willBeDepleted?: boolean; // True if this week will deplete the item
}

export interface WeeklyPantryCheckResult {
  ingredients: WeeklyIngredientCheck[];
  inStock: WeeklyIngredientCheck[];
  needsBuying: WeeklyIngredientCheck[];
  needsManualCheck: WeeklyIngredientCheck[];
  mealPlans: MealPlan[]; // All meal plans for the week
  summary: {
    totalIngredients: number;
    inStockCount: number;
    needsBuyingCount: number;
    needsManualCheckCount: number;
    allCovered: boolean; // True if everything is in stock (excluding manual check items)
  };
}

/**
 * Non-scalable units that should be marked for manual check
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
 * Check if a unit is non-scalable
 */
function isNonScalableUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalizedUnit = unit.toLowerCase().trim();
  return NON_SCALABLE_UNITS.some(nonScalable => 
    normalizedUnit.includes(nonScalable)
  );
}

/**
 * Parse quantity string to number (handles fractions, decimals, etc.)
 */
function parseQuantity(quantity: string | null | undefined): number | null {
  if (!quantity) return null;
  
  // Try direct parse
  const num = parseFloat(quantity);
  if (!isNaN(num) && isFinite(num) && num > 0) {
    return num;
  }
  
  // Try fraction parsing (e.g., "1/2", "3/4")
  const fractionMatch = quantity.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    if (denominator > 0) {
      return numerator / denominator;
    }
  }
  
  return null;
}

/**
 * Format quantity for display
 */
function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value <= 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  if (value < 1) return value.toFixed(2).replace(/\.?0+$/, '');
  return value.toFixed(1).replace(/\.0$/, '');
}

/**
 * Aggregate and scale ingredients from meal plans
 */
async function aggregateIngredients(
  mealPlans: MealPlan[]
): Promise<Map<string, WeeklyIngredientCheck>> {
  const ingredientMap = new Map<string, WeeklyIngredientCheck>();
  
  for (const plan of mealPlans) {
    // Skip external meals (no ingredients)
    if (plan.meal_source === 'external') continue;
    
    // Skip pre_bought meals (use portion tracking, not ingredients)
    if ((plan as any).preparation_mode === 'pre_bought') continue;
    
    // Get ingredients from recipe or meal
    let ingredients: RecipeIngredient[] = [];
    let recipeServings = 1;
    
    if (plan.recipe_id && plan.recipe?.ingredients) {
      ingredients = plan.recipe.ingredients;
      recipeServings = plan.recipe.servings || 1;
    } else if (plan.meal_id && plan.meal?.ingredients) {
      // Meal library items may have different structure
      // Filter out ingredients without food_item_id (can't match reliably)
      const mealIngredients = (plan.meal.ingredients || []).filter((ing: any) => ing.food_item_id);
      if (mealIngredients.length === 0) continue; // Skip if no valid ingredients
      
      ingredients = mealIngredients.map((ing: any) => ({
        food_item_id: ing.food_item_id || '',
        quantity: ing.quantity || '',
        unit: ing.unit || '',
        optional: ing.optional || false,
        notes: ing.notes || '',
      }));
      recipeServings = plan.meal.servings || 1;
    } else {
      // No ingredients available (custom meal, external meal, etc.)
      continue;
    }
    
    if (ingredients.length === 0) continue;
    
    // Convert piece units to grams BEFORE scaling (so we scale grams, not pieces)
    const { convertIngredientPieceToGramsSync } = await import('./pieceToWeightConverter');
    const ingredientsWithGrams = await Promise.all(
      ingredients.map(async (ing) => {
        // If unit is "piece" or "pieces", try to convert to grams
        const normalizedUnit = (ing.unit || '').toLowerCase().trim();
        if (normalizedUnit === 'piece' || normalizedUnit === 'pieces') {
          // Get ingredient name for conversion
          let ingredientName = 'Unknown ingredient';
          if (ing.food_item_id) {
            try {
              ingredientName = await getFoodItemName(ing.food_item_id);
            } catch (error) {
              console.warn(`Failed to get food item name for ${ing.food_item_id}:`, error);
            }
          }
          
          const converted = convertIngredientPieceToGramsSync({
            quantity: ing.quantity || '',
            unit: ing.unit || '',
            name: ingredientName,
            food_item_id: ing.food_item_id,
          });
          
          if (converted.converted) {
            return {
              ...ing,
              quantity: converted.quantity,
              unit: converted.unit, // Should be 'g' after conversion
            };
          }
        }
        // If unit is empty or undefined, default to 'g' for consistency
        return {
          ...ing,
          unit: ing.unit || 'g',
        };
      })
    );
    
    // Scale ingredients based on plan servings (now in grams where applicable)
    const planServings = plan.servings || 1;
    const scaledIngredients = scaleIngredients(ingredientsWithGrams, recipeServings, planServings);
    
    // Aggregate scaled ingredients
    for (const ing of scaledIngredients) {
      // Skip optional ingredients for now (can be added later if needed)
      if (ing.optional) continue;
      
      // Skip ingredients without food_item_id (can't match reliably)
      if (!ing.food_item_id) {
        continue;
      }
      
      const ingredientKey = ing.food_item_id;
      
      // Check if non-scalable
      const needsManualCheck = isNonScalableUnit(ing.unit) || !isNumericQuantity(ing.quantity);
      
      // Get or create ingredient check
      let check = ingredientMap.get(ingredientKey);
      
      if (!check) {
        // Get ingredient name from food_item_id
        let ingredientName = 'Unknown ingredient';
        try {
          ingredientName = await getFoodItemName(ing.food_item_id);
        } catch (error) {
          console.warn(`Failed to get food item name for ${ing.food_item_id}:`, error);
        }
        
        check = {
          ingredientId: ing.food_item_id,
          name: ingredientName,
          requiredQuantity: 0,
          requiredQuantityDisplay: '',
          unit: ing.unit || 'g', // Default to 'g' if no unit (after piece conversion, should be 'g')
          inPantry: false,
          needsManualCheck,
          occurrences: 0,
        };
        ingredientMap.set(ingredientKey, check);
      }
      
      // Update unit if it's missing (should have been set during piece conversion, but ensure it's there)
      if (!check.unit && ing.unit) {
        check.unit = ing.unit;
      } else if (!check.unit) {
        check.unit = 'g'; // Default to grams if still missing
      }
      
      // Aggregate quantities (only for scalable ingredients)
      if (!needsManualCheck) {
        // Use scaled quantity if available, otherwise try to parse original
        const quantityToUse = ing.isScaled && ing.displayQuantity 
          ? parseQuantity(ing.displayQuantity)
          : parseQuantity(ing.quantity || ing.originalQuantity);
        
        if (quantityToUse !== null) {
          check.requiredQuantity = (check.requiredQuantity || 0) + quantityToUse;
        }
      }
      
      check.occurrences += 1;
    }
  }
  
  // Format display quantities
  // Note: Piece units should already be converted to grams before this point (during ingredient processing)
  // This is just for formatting the final display values
  for (const check of ingredientMap.values()) {
    if (check.requiredQuantity !== undefined && check.requiredQuantity > 0) {
      check.requiredQuantityDisplay = formatQuantity(check.requiredQuantity);
      // Ensure unit is always set (default to 'g' if missing)
      if (!check.unit) {
        check.unit = 'g';
      }
    }
  }
  
  return ingredientMap;
}

/**
 * Check if quantity is numeric
 */
function isNumericQuantity(quantity: string | null | undefined): boolean {
  if (!quantity) return false;
  return parseQuantity(quantity) !== null;
}

/**
 * Aggregate portion usage from meal plans
 */
async function aggregatePortionUsage(
  mealPlans: MealPlan[]
): Promise<Map<string, { pantryItemId: string; portionsRequired: number; mealPlanIds: string[] }>> {
  const portionMap = new Map<string, { pantryItemId: string; portionsRequired: number; mealPlanIds: string[] }>();
  
  // Get portion usage for all meal plans
  const { getMealPlanPortionUsage } = await import('./pantryPortionService');
  
  for (const plan of mealPlans) {
    try {
      const usage = await getMealPlanPortionUsage(plan.id);
      
      for (const usageRecord of usage) {
        if (!usageRecord.pantryItem?.food_item_id) continue;
        
        const foodItemId = usageRecord.pantryItem.food_item_id;
        const existing = portionMap.get(foodItemId);
        
        if (existing) {
          existing.portionsRequired += usageRecord.portionsUsed;
          existing.mealPlanIds.push(plan.id);
        } else {
          portionMap.set(foodItemId, {
            pantryItemId: usageRecord.pantryItemId,
            portionsRequired: usageRecord.portionsUsed,
            mealPlanIds: [plan.id],
          });
        }
      }
    } catch (error) {
      console.warn(`[aggregatePortionUsage] Error getting portion usage for meal plan ${plan.id}:`, error);
      // Continue with other meal plans
    }
  }
  
  return portionMap;
}

/**
 * Compare aggregated ingredients with pantry (including portion-tracked items)
 */
async function compareWithPantry(
  ingredientMap: Map<string, WeeklyIngredientCheck>,
  pantryItems: PantryItem[],
  portionUsageMap: Map<string, { pantryItemId: string; portionsRequired: number; mealPlanIds: string[] }>,
  householdId: string
): Promise<WeeklyIngredientCheck[]> {
  // Create pantry lookup by food_item_id
  const pantryByFoodItemId = new Map<string, PantryItem>();
  // Also track portion-tracked items by pantry item ID
  const portionTrackedItemsById = new Map<string, any>();
  
  // Load portion-tracked pantry items from database
  // This includes the new portion columns (total_portions, remaining_portions, portion_unit)
  const { data: portionTrackedPantryItems, error: portionError } = await supabase
    .from('household_pantry_items')
    .select('id, food_item_id, total_portions, remaining_portions, portion_unit, household_id')
    .eq('household_id', householdId)
    .not('total_portions', 'is', null);
  
  if (!portionError && portionTrackedPantryItems) {
    for (const item of portionTrackedPantryItems) {
      if (item.food_item_id) {
        portionTrackedItemsById.set(item.id, item);
      }
    }
  }
  
  for (const item of pantryItems) {
    if (item.food_item_id) {
      pantryByFoodItemId.set(item.food_item_id, item);
    }
  }
  
  // Note: We primarily match by food_item_id, which is more reliable
  // Name matching is kept as a fallback but may not be needed if all ingredients have food_item_id
  
  const results: WeeklyIngredientCheck[] = [];
  
  for (const check of ingredientMap.values()) {
    // Find matching pantry item by food_item_id
    let pantryItem: PantryItem | undefined;
    
    if (check.ingredientId) {
      pantryItem = pantryByFoodItemId.get(check.ingredientId);
    }
    
    // Check if this ingredient has portion usage
    const portionUsage = check.ingredientId ? portionUsageMap.get(check.ingredientId) : undefined;
    
    if (portionUsage) {
      // This is a portion-tracked item
      check.isPortionTracked = true;
      check.pantryItemId = portionUsage.pantryItemId;
      check.portionsRequired = portionUsage.portionsRequired;
      
      // Find the portion-tracked pantry item
      const portionPantryItem = portionTrackedItemsById.get(portionUsage.pantryItemId);
      
      if (portionPantryItem) {
        check.inPantry = true;
        
        // Get portion info from pantry item
        const totalPortions = portionPantryItem.total_portions;
        const remainingPortions = portionPantryItem.remaining_portions;
        const portionUnit = portionPantryItem.portion_unit;
        
        if (totalPortions !== null && totalPortions !== undefined) {
          check.totalPortions = totalPortions;
          check.remainingPortions = remainingPortions || 0;
          check.portionUnit = portionUnit || 'serving';
          
          // Calculate remaining after this week
          const remainingAfterWeek = (remainingPortions || 0) - portionUsage.portionsRequired;
          check.willBeDepleted = remainingAfterWeek <= 0;
          
          // Set pantry quantity display for portions
          check.pantryQuantity = remainingPortions || 0;
          check.pantryQuantityDisplay = `${remainingPortions || 0} ${portionUnit || 'serving'}${(remainingPortions || 0) !== 1 ? 's' : ''}`;
          
          // Calculate missing portions
          if (remainingPortions < portionUsage.portionsRequired) {
            check.missingQuantity = portionUsage.portionsRequired - remainingPortions;
            check.missingQuantityDisplay = `${check.missingQuantity} ${portionUnit || 'serving'}${check.missingQuantity !== 1 ? 's' : ''}`;
          }
        }
      } else {
        check.inPantry = false;
        check.missingQuantity = portionUsage.portionsRequired;
        check.missingQuantityDisplay = `${portionUsage.portionsRequired} ${check.portionUnit || 'serving'}${portionUsage.portionsRequired !== 1 ? 's' : ''}`;
      }
    } else if (pantryItem) {
      // Regular ingredient-based pantry item
      check.inPantry = true;
      
      // Try to parse pantry quantity
      const pantryQty = parseQuantity(
        pantryItem.quantity_value || pantryItem.quantity
      );
      
      if (pantryQty !== null) {
        check.pantryQuantity = pantryQty;
        check.pantryQuantityDisplay = formatQuantity(pantryQty);
        // Ensure unit is preserved for pantry quantity display
        if (!check.unit) {
          check.unit = 'g'; // Default to grams if unit is missing
        }
        
        // Calculate missing quantity (both must be in same units for comparison)
        if (check.requiredQuantity !== undefined && check.requiredQuantity > 0 && pantryQty !== null) {
          // Ensure units match - if check is in grams but pantry is in different unit, we can't compare
          // For now, assume pantry quantity is already in the same unit as required (or convert if needed)
          const missing = check.requiredQuantity - pantryQty;
          if (missing > 0) {
            check.missingQuantity = missing;
            check.missingQuantityDisplay = formatQuantity(missing);
            // Ensure unit is set for missing quantity display
            if (!check.unit) {
              check.unit = 'g';
            }
          }
        }
      } else {
        // Pantry has item but quantity is non-numeric - assume covered
        check.pantryQuantityDisplay = pantryItem.quantity_value || pantryItem.quantity || 'Available';
        // Still ensure unit is set
        if (!check.unit) {
          check.unit = 'g';
        }
      }
    } else {
      check.inPantry = false;
      
      // If we have a required quantity, that's what's missing
      if (check.requiredQuantity !== undefined && check.requiredQuantity > 0) {
        check.missingQuantity = check.requiredQuantity;
        check.missingQuantityDisplay = check.requiredQuantityDisplay;
        // Ensure unit is set for missing quantity
        if (!check.unit) {
          check.unit = 'g';
        }
      }
    }
    
    results.push(check);
  }
  
  return results;
}

/**
 * Perform weekly pantry check for a household
 */
export async function performWeeklyPantryCheck(
  householdId: string,
  weekStartDate: string
): Promise<WeeklyPantryCheckResult> {
  try {
    // Load meal plans for the week
    // Note: weekStartDate might be Monday-based, but meal plans might be stored with Sunday-based dates
    // Try both Monday and Sunday week starts to handle the mismatch
    const mondayWeekStart = weekStartDate;
    const sundayWeekStart = (() => {
      const date = new Date(mondayWeekStart);
      date.setDate(date.getDate() - 1); // Go back one day to get Sunday
      return date.toISOString().split('T')[0];
    })();
    
    console.log('[performWeeklyPantryCheck] Querying with both week start dates:', {
      mondayWeekStart,
      sundayWeekStart,
      householdId,
    });
    
    // Try both week start dates
    const [mondayPlans, sundayPlans] = await Promise.all([
      getWeeklyMealPlan(householdId, mondayWeekStart),
      getWeeklyMealPlan(householdId, sundayWeekStart),
    ]);
    
    // Combine and deduplicate by ID
    const allPlansMap = new Map<string, MealPlan>();
    [...mondayPlans, ...sundayPlans].forEach(plan => {
      allPlansMap.set(plan.id, plan);
    });
    const mealPlans = Array.from(allPlansMap.values());
    
    console.log('[performWeeklyPantryCheck] Loaded meal plans:', {
      mondayPlansCount: mondayPlans.length,
      sundayPlansCount: sundayPlans.length,
      totalUniquePlans: mealPlans.length,
      mealPlans: mealPlans.map(p => ({
        id: p.id,
        name: p.external_name || p.recipe?.name || p.meal?.name || p.custom_meal_name,
        meal_type: p.meal_type,
        day_of_week: p.day_of_week,
        week_start_date: p.week_start_date,
      })),
      householdId,
      weekStartDate,
    });
    
    // Load pantry items
    const pantryItems = await getPantryItems(householdId);
    
    // Aggregate ingredients from all meal plans
    const ingredientMap = await aggregateIngredients(mealPlans);
    
    // Aggregate portion usage from meal plans
    const portionUsageMap = await aggregatePortionUsage(mealPlans);
    
    // Compare with pantry (including portion-tracked items)
    const allIngredients = await compareWithPantry(ingredientMap, pantryItems, portionUsageMap, householdId);
    
    // Categorize results
    // For portion-tracked items: in stock if remaining >= required, needs buying if remaining < required
    // For regular items: same as before
    const inStock = allIngredients.filter(ing => {
      if (ing.isPortionTracked) {
        return ing.inPantry && ing.remainingPortions !== undefined && 
               ing.remainingPortions >= (ing.portionsRequired || 0);
      }
      return ing.inPantry && (!ing.missingQuantity || ing.missingQuantity <= 0);
    });
    
    const needsBuying = allIngredients.filter(ing => {
      if (ing.needsManualCheck) return false;
      if (ing.isPortionTracked) {
        return !ing.inPantry || (ing.remainingPortions !== undefined && 
               ing.remainingPortions < (ing.portionsRequired || 0));
      }
      return !ing.inPantry || (ing.missingQuantity && ing.missingQuantity > 0);
    });
    
    const needsManualCheck = allIngredients.filter(ing => ing.needsManualCheck);
    
    // Calculate summary
    const summary = {
      totalIngredients: allIngredients.length,
      inStockCount: inStock.length,
      needsBuyingCount: needsBuying.length,
      needsManualCheckCount: needsManualCheck.length,
      allCovered: needsBuying.length === 0,
    };
    
    return {
      ingredients: allIngredients,
      inStock,
      needsBuying,
      needsManualCheck,
      mealPlans, // Include meal plans in the result
      summary,
    };
  } catch (error) {
    console.error('[performWeeklyPantryCheck] Error:', error);
    throw error;
  }
}
