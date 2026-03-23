/**
 * Meal Prep Service
 * 
 * Service functions for managing meal preparations and assignments
 */

import { supabase } from './supabase';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';
import type {
  PreparedMeal,
  MealAssignment,
  CreatePreparedMealInput,
  CreateMealAssignmentInput,
  MealPrepWithAssignments,
} from './mealPrepTypes';
import { calculateScalingFactor } from './mealPrepTypes';
import type { Recipe } from './recipeGeneratorTypes';
import type { MealLibraryItem } from './mealPlanner';

/**
 * Get recipe or meal library item for meal prep
 */
async function getRecipeOrMeal(
  recipeId?: string | null,
  mealLibraryId?: string | null
): Promise<{ name: string; servings: number } | null> {
  if (recipeId) {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('name, servings')
      .eq('id', recipeId)
      .maybeSingle();
    
    if (error) throw error;
    if (!recipe) return null;
    
    return {
      name: recipe.name,
      servings: recipe.servings || 4, // Default to 4 if not set
    };
  }
  
  if (mealLibraryId) {
    const { data: meal, error } = await supabase
      .from('meal_library')
      .select('name, servings')
      .eq('id', mealLibraryId)
      .maybeSingle();
    
    if (error) throw error;
    if (!meal) return null;
    
    return {
      name: meal.name,
      servings: meal.servings || 4, // Default to 4 if not set
    };
  }
  
  return null;
}

/**
 * Create a prepared meal
 */
export async function createPreparedMeal(
  userId: string,
  input: CreatePreparedMealInput
): Promise<PreparedMeal> {
  // Get recipe or meal info
  const recipeOrMeal = await getRecipeOrMeal(input.recipe_id, input.meal_library_id);
  if (!recipeOrMeal) {
    throw new Error('Recipe or meal not found');
  }
  
  const baseServings = recipeOrMeal.servings;
  const scalingFactor = calculateScalingFactor(baseServings, input.prepared_servings);
  
  // Get profile ID
  const profileId = await getProfileIdFromAuthUserId(userId);
  
  const insertData: any = {
    space_id: input.space_id,
    recipe_id: input.recipe_id || null,
    meal_library_id: input.meal_library_id || null,
    recipe_name: recipeOrMeal.name,
    base_servings: baseServings,
    prepared_servings: input.prepared_servings,
    remaining_servings: input.prepared_servings, // Initially all servings are remaining
    scaling_factor: scalingFactor,
    prepared_by: profileId,
    notes: input.notes || null,
  };
  
  const { data, error } = await supabase
    .from('prepared_meals')
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get prepared meals for a space
 */
export async function getPreparedMeals(
  spaceId: string,
  includeExhausted: boolean = false
): Promise<PreparedMeal[]> {
  let query = supabase
    .from('prepared_meals')
    .select('*')
    .eq('space_id', spaceId)
    .order('prepared_at', { ascending: false });
  
  if (!includeExhausted) {
    query = query.gt('remaining_servings', 0);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a prepared meal by ID with its assignments
 */
export async function getPreparedMealWithAssignments(
  preparedMealId: string
): Promise<MealPrepWithAssignments | null> {
  const { data: meal, error: mealError } = await supabase
    .from('prepared_meals')
    .select('*')
    .eq('id', preparedMealId)
    .maybeSingle();
  
  if (mealError) throw mealError;
  if (!meal) return null;
  
  const { data: assignments, error: assignmentsError } = await supabase
    .from('meal_assignments')
    .select('*')
    .eq('prepared_meal_id', preparedMealId)
    .order('week_start_date', { ascending: true })
    .order('day_of_week', { ascending: true });
  
  if (assignmentsError) throw assignmentsError;
  
  return {
    ...meal,
    assignments: assignments || [],
  };
}

/**
 * Create a meal assignment
 */
export async function createMealAssignment(
  userId: string,
  input: CreateMealAssignmentInput
): Promise<MealAssignment> {
  // Verify prepared meal has enough remaining servings
  const { data: preparedMeal, error: mealError } = await supabase
    .from('prepared_meals')
    .select('remaining_servings')
    .eq('id', input.prepared_meal_id)
    .single();
  
  if (mealError) throw mealError;
  if (!preparedMeal) {
    throw new Error('Prepared meal not found');
  }
  
  if (preparedMeal.remaining_servings < input.servings_used) {
    throw new Error(
      `Not enough servings remaining. Available: ${preparedMeal.remaining_servings}, Requested: ${input.servings_used}`
    );
  }
  
  // Get profile ID
  const profileId = await getProfileIdFromAuthUserId(userId);
  
  const insertData: any = {
    prepared_meal_id: input.prepared_meal_id,
    space_id: input.space_id,
    week_start_date: input.week_start_date,
    day_of_week: input.day_of_week,
    meal_type: input.meal_type,
    servings_used: input.servings_used,
    assigned_by: profileId,
    notes: input.notes || null,
  };
  
  const { data, error } = await supabase
    .from('meal_assignments')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    // Handle unique constraint violation (duplicate assignment)
    if (error.code === '23505') {
      throw new Error('This meal slot already has an assignment from this preparation');
    }
    throw error;
  }
  
  return data;
}

/**
 * Get meal assignments for a date range
 */
export async function getMealAssignments(
  spaceId: string,
  weekStartDate: string,
  dayOfWeek?: number
): Promise<MealAssignment[]> {
  let query = supabase
    .from('meal_assignments')
    .select('*')
    .eq('space_id', spaceId)
    .eq('week_start_date', weekStartDate);
  
  if (dayOfWeek !== undefined) {
    query = query.eq('day_of_week', dayOfWeek);
  }
  
  query = query.order('day_of_week', { ascending: true });
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update a meal assignment
 */
export async function updateMealAssignment(
  assignmentId: string,
  updates: { servings_used?: number; notes?: string | null }
): Promise<MealAssignment> {
  // If updating servings, verify we have enough remaining
  if (updates.servings_used !== undefined) {
    const { data: assignment, error: assignmentError } = await supabase
      .from('meal_assignments')
      .select('prepared_meal_id, servings_used')
      .eq('id', assignmentId)
      .single();
    
    if (assignmentError) throw assignmentError;
    
    const { data: preparedMeal, error: mealError } = await supabase
      .from('prepared_meals')
      .select('remaining_servings')
      .eq('id', assignment.prepared_meal_id)
      .single();
    
    if (mealError) throw mealError;
    
    // Calculate new remaining after this update
    const currentUsed = assignment.servings_used;
    const newUsed = updates.servings_used;
    const available = preparedMeal.remaining_servings + currentUsed; // Add back current, then subtract new
    
    if (available < newUsed) {
      throw new Error(
        `Not enough servings remaining. Available: ${available}, Requested: ${newUsed}`
      );
    }
  }
  
  const { data, error } = await supabase
    .from('meal_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a meal assignment
 */
export async function deleteMealAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_assignments')
    .delete()
    .eq('id', assignmentId);
  
  if (error) throw error;
}

/**
 * Delete a prepared meal (cascades to assignments)
 */
export async function deletePreparedMeal(preparedMealId: string): Promise<void> {
  const { error } = await supabase
    .from('prepared_meals')
    .delete()
    .eq('id', preparedMealId);
  
  if (error) throw error;
}

/**
 * Get meal assignments for a specific meal slot
 */
export async function getMealAssignmentForSlot(
  spaceId: string,
  weekStartDate: string,
  dayOfWeek: number,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<MealAssignment | null> {
  const { data, error } = await supabase
    .from('meal_assignments')
    .select('*')
    .eq('space_id', spaceId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}
