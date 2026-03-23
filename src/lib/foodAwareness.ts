/**
 * Food Awareness Layer
 * 
 * Read-only, computed awareness signals about food items.
 * Never mutates data, never blocks actions, never shows warnings.
 * 
 * ADHD-First Principles:
 * - All signals are optional information
 * - User always initiates any changes
 * - No pressure, no alerts, no automation
 */

import { getPantryItems, getGroceryItems, getOrCreateDefaultList, type PantryItem, type GroceryItem } from './intelligentGrocery';
import { getWeeklyMealPlan, getWeekStartDate, type MealPlan } from './mealPlanner';
import { getRecentlyUsedFoodItems, type FoodItemWithUsage } from './foodItems';

export interface FoodAwareness {
  food_item_id: string;
  inPantry: boolean;
  onGroceryList: boolean;
  inUpcomingMeals: boolean;
  recentlyUsed: boolean;
  pantryItem?: PantryItem;
  groceryItems?: GroceryItem[];
  mealPlans?: MealPlan[];
  lastUsed?: string;
}

export interface FoodAwarenessMap {
  [food_item_id: string]: FoodAwareness;
}

/**
 * Get awareness for a single food item
 * Computed on-demand, never cached or stored
 */
export async function getFoodAwareness(
  foodItemId: string,
  householdId: string
): Promise<FoodAwareness> {
  const weekStartDate = getWeekStartDate();
  const [pantryItems, groceryItems, mealPlans, recentItems] = await Promise.all([
    getPantryItems(householdId),
    getGroceryItems(householdId),
    getWeeklyMealPlan(householdId, weekStartDate),
    getRecentlyUsedFoodItems(householdId, 50),
  ]);

  const pantryItem = pantryItems.find(item => item.food_item_id === foodItemId);
  const groceryItemList = groceryItems.filter(item => item.food_item_id === foodItemId);
  
  // Check if food item is used in any meal plan ingredients
  const inMeals = mealPlans.some(plan => {
    if (!plan.meal) return false;
    return plan.meal.ingredients.some(ing => ing.food_item_id === foodItemId);
  });
  
  const mealPlansWithItem = mealPlans.filter(plan => {
    if (!plan.meal) return false;
    return plan.meal.ingredients.some(ing => ing.food_item_id === foodItemId);
  });

  const recentItem = recentItems.find(item => item.id === foodItemId);

  return {
    food_item_id: foodItemId,
    inPantry: !!pantryItem,
    onGroceryList: groceryItemList.length > 0,
    inUpcomingMeals: inMeals,
    recentlyUsed: !!recentItem,
    pantryItem: pantryItem || undefined,
    groceryItems: groceryItemList.length > 0 ? groceryItemList : undefined,
    mealPlans: mealPlansWithItem.length > 0 ? mealPlansWithItem : undefined,
    lastUsed: recentItem?.last_used,
  };
}

/**
 * Get awareness for multiple food items (batch)
 * More efficient than calling getFoodAwareness multiple times
 */
export async function getFoodAwarenessBatch(
  foodItemIds: string[],
  householdId: string
): Promise<FoodAwarenessMap> {
  if (foodItemIds.length === 0) return {};

  const weekStartDate = getWeekStartDate();
  const [pantryItems, groceryItems, mealPlans, recentItems] = await Promise.all([
    getPantryItems(householdId),
    getGroceryItems(householdId),
    getWeeklyMealPlan(householdId, weekStartDate),
    getRecentlyUsedFoodItems(householdId, 100),
  ]);

  const awarenessMap: FoodAwarenessMap = {};

  // Create lookup maps for efficiency
  const pantryByFoodId = new Map<string, PantryItem>();
  pantryItems.forEach(item => {
    if (item.food_item_id) {
      pantryByFoodId.set(item.food_item_id, item);
    }
  });

  const groceryByFoodId = new Map<string, GroceryItem[]>();
  groceryItems.forEach(item => {
    if (item.food_item_id) {
      if (!groceryByFoodId.has(item.food_item_id)) {
        groceryByFoodId.set(item.food_item_id, []);
      }
      groceryByFoodId.get(item.food_item_id)!.push(item);
    }
  });

  const recentByFoodId = new Map<string, FoodItemWithUsage>();
  recentItems.forEach(item => {
    recentByFoodId.set(item.id, item);
  });

  const mealPlansByFoodId = new Map<string, MealPlan[]>();
  mealPlans.forEach(plan => {
    if (plan.meal?.ingredients) {
      plan.meal.ingredients.forEach(ing => {
        if (ing.food_item_id) {
          if (!mealPlansByFoodId.has(ing.food_item_id)) {
            mealPlansByFoodId.set(ing.food_item_id, []);
          }
          mealPlansByFoodId.get(ing.food_item_id)!.push(plan);
        }
      });
    }
  });

  // Build awareness for each food item
  foodItemIds.forEach(foodItemId => {
    awarenessMap[foodItemId] = {
      food_item_id: foodItemId,
      inPantry: pantryByFoodId.has(foodItemId),
      onGroceryList: groceryByFoodId.has(foodItemId),
      inUpcomingMeals: mealPlansByFoodId.has(foodItemId),
      recentlyUsed: recentByFoodId.has(foodItemId),
      pantryItem: pantryByFoodId.get(foodItemId),
      groceryItems: groceryByFoodId.get(foodItemId),
      mealPlans: mealPlansByFoodId.get(foodItemId),
      lastUsed: recentByFoodId.get(foodItemId)?.last_used,
    };
  });

  return awarenessMap;
}

/**
 * Check if a food item is in pantry (simple boolean check)
 */
export async function isInPantry(
  foodItemId: string,
  householdId: string
): Promise<boolean> {
  const pantryItems = await getPantryItems(householdId);
  return pantryItems.some(item => item.food_item_id === foodItemId);
}

/**
 * Check if a food item is on grocery list (simple boolean check)
 */
export async function isOnGroceryList(
  foodItemId: string,
  householdId: string
): Promise<boolean> {
  const groceryItems = await getGroceryItems(householdId);
  return groceryItems.some(item => item.food_item_id === foodItemId);
}

/**
 * Get count of recipes that can be made with pantry items
 * Used for optional pantry suggestions
 */
export async function getPantryRecipeCount(
  householdId: string,
  minMatchPercentage: number = 50
): Promise<number> {
  // This would use the existing foodIntelligence service
  // For now, return 0 to avoid circular dependency
  // Can be implemented later if needed
  return 0;
}
