/**
 * Meal Prep Types
 * 
 * Types for meal preparation, scaling, and leftovers tracking
 */

export interface PreparedMeal {
  id: string;
  space_id: string;
  recipe_id: string | null;
  meal_library_id: string | null;
  
  // Recipe reference info
  recipe_name: string;
  base_servings: number;
  prepared_servings: number;
  remaining_servings: number;
  scaling_factor: number;
  
  // Metadata
  prepared_at: string;
  prepared_by: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface MealAssignment {
  id: string;
  prepared_meal_id: string;
  
  // Assignment target
  space_id: string;
  week_start_date: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  
  // Portion consumed
  servings_used: number;
  
  // Metadata
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface CreatePreparedMealInput {
  space_id: string;
  recipe_id?: string | null;
  meal_library_id?: string | null;
  prepared_servings: number;
  notes?: string | null;
}

export interface CreateMealAssignmentInput {
  prepared_meal_id: string;
  space_id: string;
  week_start_date: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings_used: number;
  notes?: string | null;
}

export interface MealPrepWithAssignments extends PreparedMeal {
  assignments: MealAssignment[];
}

/**
 * Calculate scaling factor for a prepared meal
 */
export function calculateScalingFactor(baseServings: number, preparedServings: number): number {
  if (baseServings <= 0) {
    throw new Error('Base servings must be greater than 0');
  }
  if (preparedServings <= 0) {
    throw new Error('Prepared servings must be greater than 0');
  }
  return preparedServings / baseServings;
}

/**
 * Scale an ingredient quantity by a scaling factor
 */
export function scaleIngredientQuantity(quantity: number, scalingFactor: number): number {
  return quantity * scalingFactor;
}

/**
 * Scale nutrition values by a scaling factor
 */
export function scaleNutritionValue(value: number | null, scalingFactor: number): number | null {
  if (value === null) return null;
  return value * scalingFactor;
}
