import { supabase } from './supabase';

function isMealLibraryUnavailable(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;

  return error.code === 'PGRST205' ||
    error.code === '42P01' ||
    Boolean(error.message && error.message.includes("Could not find the table 'public.meal_library'"));
}

const MEAL_PLAN_SELECT_FALLBACK = `
  *,
  meal:meal_id (*)
`;

const MEAL_FAVOURITE_SELECT_FALLBACK = `
  *,
  meal:meal_id (*)
`;

function isRecipesTableUnavailable(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;

  return error.code === 'PGRST205' ||
    error.code === '42P01' ||
    Boolean(error.message && error.message.includes("Could not find the table 'public.recipes'"));
}

async function loadRecipesByIds(recipeIds: string[]): Promise<Map<string, Recipe>> {
  const uniqueRecipeIds = [...new Set(recipeIds.filter(Boolean))];
  if (uniqueRecipeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .in('id', uniqueRecipeIds);

  if (error) {
    if (isRecipesTableUnavailable(error)) {
      return new Map();
    }
    console.warn('[mealPlanner] Failed to load recipes for meal plans/favourites:', error);
    return new Map();
  }

  return new Map((data || []).map((recipe) => [recipe.id, recipe as Recipe]));
}

async function attachRecipesToMealPlans(plans: MealPlan[]): Promise<MealPlan[]> {
  const recipeMap = await loadRecipesByIds(plans.map((plan) => plan.recipe_id).filter(Boolean) as string[]);

  return plans.map((plan) => ({
    ...plan,
    recipe: plan.recipe_id ? recipeMap.get(plan.recipe_id) || null : null,
  }));
}

async function attachRecipesToMealFavourites(favourites: MealFavourite[]): Promise<MealFavourite[]> {
  const recipeMap = await loadRecipesByIds(favourites.map((favourite) => favourite.recipe_id).filter(Boolean) as string[]);

  return favourites.map((favourite) => ({
    ...favourite,
    recipe: favourite.recipe_id ? recipeMap.get(favourite.recipe_id) || null : null,
  }));
}

async function selectMealPlansWithFallback(
  buildQuery: (selectClause: string) => Promise<{ data: MealPlan[] | null; error: any }>
): Promise<MealPlan[]> {
  const fallback = await buildQuery(MEAL_PLAN_SELECT_FALLBACK);
  if (fallback.error) throw fallback.error;
  return attachRecipesToMealPlans((fallback.data || []).map((plan) => ({ ...plan, recipe: null })));
}

async function selectSingleMealPlanWithFallback(
  buildQuery: (selectClause: string) => Promise<{ data: MealPlan | null; error: any }>
): Promise<MealPlan> {
  const fallback = await buildQuery(MEAL_PLAN_SELECT_FALLBACK);
  if (fallback.error) throw fallback.error;
  if (!fallback.data) {
    throw new Error('Meal plan query returned no data');
  }
  const [plan] = await attachRecipesToMealPlans([{ ...fallback.data, recipe: null }]);
  return plan;
}

async function selectMealFavouritesWithFallback(
  buildQuery: (selectClause: string) => Promise<{ data: MealFavourite[] | null; error: any }>
): Promise<MealFavourite[]> {
  const fallback = await buildQuery(MEAL_FAVOURITE_SELECT_FALLBACK);
  if (fallback.error) throw fallback.error;
  return attachRecipesToMealFavourites((fallback.data || []).map((favourite) => ({ ...favourite, recipe: null })));
}

export interface MealLibraryItem {
  id: string;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  categories: string[];
  cuisine: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  ingredients: Array<{ 
    food_item_id?: string; // Preferred - use this
    name?: string; // Deprecated - kept for backward compatibility
    quantity: string; 
    unit: string;
    optional?: boolean;
  }>;
  instructions: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  allergies: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

import type { Recipe } from './recipeGeneratorTypes';

export type MealCourseType =
  | 'starter'
  | 'side'
  | 'main'
  | 'dessert'
  | 'shared'
  | 'snack';

export interface MealPlan {
  id: string;
  space_id: string;
  household_id?: string; // Alternative name for space_id
  meal_id: string | null;
  recipe_id: string | null; // New: support for recipe_id
  custom_meal_name: string | null;
  meal_source?: 'recipe' | 'meal_library' | 'external' | 'custom'; // Source type
  external_name?: string | null; // Name of external meal (shop/restaurant)
  external_vendor?: string | null; // Vendor/source (e.g., "Tesco", "Nando's")
  external_type?: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other' | null; // Type of external meal
  is_prepared?: boolean; // Whether meal requires preparation (false for external)
  scheduled_at?: string | null; // Optional specific time for meal
  servings: number; // Number of portions user intends to make/eat (default: 1)
  course_type: MealCourseType; // Type of dish/course: starter, side, main, dessert, shared, snack
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_of_week: number;
  week_start_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  meal?: MealLibraryItem;
  recipe?: Recipe; // New: recipe data when recipe_id is set
}

export interface MealFavourite {
  id: string;
  meal_id: string | null;
  recipe_id: string | null; // New: support for recipe_id
  space_id: string;
  household_id?: string; // Alternative name for space_id
  user_id: string;
  vote_count: number;
  created_at: string;
  meal?: MealLibraryItem;
  recipe?: Recipe; // New: recipe data when recipe_id is set
}

export async function getMealLibrary(filters?: {
  mealType?: string;
  categories?: string[];
  searchQuery?: string;
}): Promise<MealLibraryItem[]> {
  let query = supabase.from('meal_library').select('*');

  if (filters?.mealType) {
    query = query.eq('meal_type', filters.mealType);
  }

  if (filters?.categories && filters.categories.length > 0) {
    query = query.overlaps('categories', filters.categories);
  }

  if (filters?.searchQuery) {
    query = query.ilike('name', `%${filters.searchQuery}%`);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    if (isMealLibraryUnavailable(error)) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function getMealById(mealId: string): Promise<MealLibraryItem | null> {
  const { data, error } = await supabase
    .from('meal_library')
    .select('*')
    .eq('id', mealId)
    .maybeSingle();

  if (error) {
    if (isMealLibraryUnavailable(error)) {
      return null;
    }
    throw error;
  }

  return data;
}

export async function getWeeklyMealPlan(
  householdId: string,
  weekStartDate: string
): Promise<MealPlan[]> {
  console.log('[getWeeklyMealPlan] Querying meal plans:', {
    space_id: householdId,
    week_start_date: weekStartDate,
  });
  
  // First, let's check what meal plans exist for this space (for debugging)
  const { data: allPlans, error: allPlansError } = await supabase
    .from('meal_plans')
    .select('id, space_id, week_start_date, meal_type, day_of_week')
    .eq('space_id', householdId)
    .limit(20);
  
  if (!allPlansError && allPlans) {
    console.log('[getWeeklyMealPlan] All meal plans for this space:', {
      count: allPlans.length,
      uniqueWeekStartDates: [...new Set(allPlans.map(p => p.week_start_date))],
      samplePlans: allPlans.slice(0, 5).map(p => ({
        id: p.id,
        week_start_date: p.week_start_date,
        meal_type: p.meal_type,
        day_of_week: p.day_of_week,
      })),
    });
  }
  
  let data: MealPlan[];
  try {
    data = await selectMealPlansWithFallback((selectClause) =>
      supabase
        .from('meal_plans')
        .select(selectClause)
        .eq('space_id', householdId)
        .eq('week_start_date', weekStartDate)
        .order('day_of_week', { ascending: true })
        .order('meal_type', { ascending: true })
    );
  } catch (error) {
    console.error('[getWeeklyMealPlan] Query error:', error);
    throw error;
  }

  console.log('[getWeeklyMealPlan] Query result:', {
    count: data?.length || 0,
    mealPlans: data?.map(p => ({
      id: p.id,
      space_id: p.space_id,
      week_start_date: p.week_start_date,
      meal_type: p.meal_type,
      day_of_week: p.day_of_week,
    })),
  });

  return data || [];
}

/**
 * Verify that a mealId exists in meal_library table
 * This prevents foreign key violations when mealId is set
 */
async function verifyMealExists(mealId: string): Promise<boolean> {
  if (!mealId || mealId.trim() === '') {
    return false;
  }

  const { data, error } = await supabase
    .from('meal_library')
    .select('id')
    .eq('id', mealId)
    .maybeSingle();

  if (error) {
    if (isMealLibraryUnavailable(error)) {
      return false;
    }
    console.error('[verifyMealExists] Error checking meal:', error);
    return false;
  }

  return !!data;
}

export async function addMealToPlan(
  householdId: string,
  mealId: string | null,
  customMealName: string | null,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dayOfWeek: number,
  weekStartDate: string,
  createdBy: string,
  recipeId?: string | null, // New: optional recipe_id parameter
  servings: number = 1, // Number of portions (default: 1, individual-friendly)
  courseType: MealCourseType = 'main', // Type of dish/course (default: 'main' for backward compatibility)
  pantryItemId?: string | null, // Optional: link to portion-tracked pantry item
  preparationMode: 'scratch' | 'pre_bought' = 'scratch' // How the meal is prepared
): Promise<MealPlan> {
  // Defensive validation: if mealId is provided, verify it exists in meal_library
  if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
    const mealExists = await verifyMealExists(mealId);
    if (!mealExists) {
      throw new Error(
        `[addMealToPlan] Invalid mealId "${mealId}": not found in meal_library. ` +
        `meal_id must only reference meal_library.id. ` +
        `If adding a recipe, use recipeId parameter instead. ` +
        `If adding a custom meal, use customMealName parameter instead.`
      );
    }
  }

  // Check for existing meal plan with the same unique constraint fields
  // The unique constraint is on (space_id, week_start_date, day_of_week, meal_type, course_type)
  // This means only ONE meal can exist per slot per course type
  // If a meal already exists for this slot/course, we should update it (replace it)
  // rather than trying to insert a duplicate
  // Get full existing record to check for pantry allocations
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id, preparation_mode, pantry_item_id')
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .eq('course_type', courseType)
    .maybeSingle();

  // Validate servings
  const validServings = Math.max(1, Math.min(12, Math.round(servings || 1)));

  // Validate preparation mode
  if (preparationMode === 'pre_bought' && !pantryItemId) {
    throw new Error('pantryItemId is required when preparationMode is "pre_bought"');
  }
  if (preparationMode === 'scratch' && pantryItemId) {
    throw new Error('pantryItemId must be null when preparationMode is "scratch"');
  }

  // If an existing meal plan exists for this slot/course, update it (replace the meal)
  // The unique constraint only allows one meal per slot per course type
  // This replaces whatever meal was previously in this slot/course
  if (existing) {
    // Release old pantry portions if the existing meal had pre_bought mode
    if (existing.preparation_mode === 'pre_bought' && existing.pantry_item_id) {
      try {
        const { releasePantryPortions } = await import('./pantryPortionService');
        const releaseResults = await releasePantryPortions(existing.id);
        
        // Check if any releases failed
        const releaseFailed = releaseResults.some(r => !r.success);
        if (releaseFailed) {
          console.warn('[addMealToPlan] Some pantry portion releases failed:', releaseResults);
          // Continue anyway - the meal replacement should still proceed
        }
      } catch (portionError) {
        console.warn('[addMealToPlan] Error releasing old pantry portions:', portionError);
        // Continue anyway - the meal replacement should still proceed
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      servings: validServings, // Store user-selected portion count
      course_type: courseType, // Store course type
      preparation_mode: preparationMode, // Store preparation mode
      pantry_item_id: preparationMode === 'pre_bought' ? pantryItemId : null, // Only set when pre_bought
    };

    // Prioritize recipe_id over meal_id if both are provided
    // Ensure at least one of meal_id, recipe_id, or custom_meal_name is set (constraint requirement)
    // Always explicitly set both to null first, then set the appropriate one
    updateData.meal_id = null;
    updateData.recipe_id = null;
    
    // Set meal_source based on what's being updated (required by constraint)
    if (recipeId !== undefined && recipeId !== null && recipeId.trim() !== '') {
      updateData.recipe_id = recipeId;
      updateData.meal_source = 'recipe';
      // meal_id already set to null above
    } else if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
      updateData.meal_id = mealId;
      updateData.meal_source = 'meal_library';
      // recipe_id already set to null above
    } else if (customMealName && customMealName.trim() !== '') {
      updateData.meal_source = 'custom';
    }
    // custom_meal_name can be set regardless (it's part of the constraint check)
    updateData.custom_meal_name = customMealName || null;

    console.log('[addMealToPlan] Update data for existing record:', JSON.stringify(updateData, null, 2));

    let data: MealPlan;
    try {
      data = await selectSingleMealPlanWithFallback((selectClause) =>
        supabase
          .from('meal_plans')
          .update(updateData)
          .eq('id', existing.id)
          .select(selectClause)
          .single()
      );
    } catch (error) {
      console.error('[addMealToPlan] Update failed:', error);
      throw error;
    }

    // Allocate new pantry portions if pre_bought mode
    if (preparationMode === 'pre_bought' && pantryItemId && data.id && validServings > 0) {
      try {
        const { allocatePantryPortions } = await import('./pantryPortionService');
        const allocationResult = await allocatePantryPortions({
          pantryItemId,
          mealPlanId: data.id,
          portionsRequired: validServings,
        });

        if (!allocationResult.success) {
          console.warn('[addMealToPlan] Failed to allocate pantry portions:', allocationResult.error);
          // Don't throw - meal was replaced successfully, but portion allocation failed
          // User can manually fix this later
        }
      } catch (portionError) {
        console.warn('[addMealToPlan] Error allocating pantry portions:', portionError);
        // Don't throw - meal was replaced successfully, but portion allocation failed
      }
    }

    // Mark as replaced for UI feedback
    (data as any).wasReplaced = true;
    return data;
  }

  // Build insert data with explicit null handling
  const insertData: any = {
    space_id: householdId,
    meal_type: mealType,
    day_of_week: dayOfWeek,
    week_start_date: weekStartDate,
    created_by: createdBy,
    servings: validServings, // Store user-selected portion count
    course_type: courseType, // Store course type
    preparation_mode: preparationMode, // Store preparation mode
    pantry_item_id: preparationMode === 'pre_bought' ? pantryItemId : null, // Only set when pre_bought
    // Explicitly set all three fields to ensure constraint is satisfied
    meal_id: null,
    recipe_id: null,
    custom_meal_name: customMealName || null,
  };

  // Prioritize recipe_id over meal_id if both are provided
  // Ensure at least one of meal_id, recipe_id, or custom_meal_name is set (constraint requirement)
  // Set meal_source based on what's being inserted (required by constraint)
  if (recipeId !== undefined && recipeId !== null && recipeId.trim() !== '') {
    insertData.recipe_id = recipeId;
    insertData.meal_id = null; // Explicitly null
    insertData.meal_source = 'recipe';
  } else if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
    insertData.meal_id = mealId;
    insertData.recipe_id = null; // Explicitly null
    insertData.meal_source = 'meal_library';
  } else if (customMealName && customMealName.trim() !== '') {
    // If neither recipe_id nor meal_id, ensure custom_meal_name is set
    insertData.meal_id = null;
    insertData.recipe_id = null;
    insertData.meal_source = 'custom';
  } else {
    // Fallback: if nothing is provided, this will fail the constraint
    throw new Error('Cannot create meal plan: must provide recipe_id, meal_id, or custom_meal_name');
  }

  console.log('[addMealToPlan] Insert data:', {
    space_id: insertData.space_id,
    meal_id: insertData.meal_id,
    recipe_id: insertData.recipe_id,
    custom_meal_name: insertData.custom_meal_name,
    meal_type: insertData.meal_type,
    day_of_week: insertData.day_of_week,
    week_start_date: insertData.week_start_date,
  });

  console.log('[addMealToPlan] Final insert data before database:', JSON.stringify(insertData, null, 2));

  let data: MealPlan;
  try {
    data = await selectSingleMealPlanWithFallback((selectClause) =>
      supabase
        .from('meal_plans')
        .insert(insertData)
        .select(selectClause)
        .single()
    );
  } catch (error) {
    console.error('[addMealToPlan] Insert failed:', {
      error,
      insertData,
      recipeId,
      mealId,
      customMealName,
    });
    throw error;
  }

  // Allocate pantry portions if pre_bought mode
  if (preparationMode === 'pre_bought' && pantryItemId && data.id && validServings > 0) {
    try {
      const { allocatePantryPortions } = await import('./pantryPortionService');
      const allocationResult = await allocatePantryPortions({
        pantryItemId,
        mealPlanId: data.id,
        portionsRequired: validServings,
      });

      if (!allocationResult.success) {
        console.warn('[addMealToPlan] Failed to allocate pantry portions:', allocationResult.error);
        // Don't throw - meal was created successfully, but portion allocation failed
        // User can manually fix this later
      }
    } catch (portionError) {
      console.warn('[addMealToPlan] Error allocating pantry portions:', portionError);
      // Don't throw - meal was created successfully, but portion allocation failed
    }
  }

  return data;
}

/**
 * Add a recipe to meal plan (convenience function)
 */
export async function addRecipeToPlan(
  householdId: string,
  recipeId: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dayOfWeek: number,
  weekStartDate: string,
  createdBy: string,
  servings: number = 1, // Number of portions (default: 1, individual-friendly)
  courseType: MealCourseType = 'main', // Type of dish/course (default: 'main' for backward compatibility)
  pantryItemId?: string | null, // Optional: link to portion-tracked pantry item
  preparationMode: 'scratch' | 'pre_bought' = 'scratch' // How the meal is prepared
): Promise<MealPlan> {
  // Validate recipeId is provided
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('recipeId is required to add a recipe to meal plan');
  }

  return addMealToPlan(
    householdId,
    null, // mealId - not used when adding a recipe
    null, // customMealName - not used when adding a recipe
    mealType,
    dayOfWeek,
    weekStartDate,
    createdBy,
    recipeId, // This will be used
    servings,
    courseType,
    pantryItemId,
    preparationMode
  );
}

export async function removeMealFromPlan(mealPlanId: string): Promise<void> {
  // Get meal plan to check if it's pre_bought
  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('preparation_mode, pantry_item_id')
    .eq('id', mealPlanId)
    .single();

  // Release pantry portions if pre_bought
  if (mealPlan?.preparation_mode === 'pre_bought' && mealPlan.pantry_item_id) {
    try {
      const { releasePantryPortions } = await import('./pantryPortionService');
      await releasePantryPortions(mealPlanId);
    } catch (portionError) {
      console.warn('[removeMealFromPlan] Error releasing pantry portions:', portionError);
      // Don't throw - continue with meal deletion even if portion release fails
    }
  }

  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId);

  if (error) throw error;
}

/**
 * Update meal plan servings (portion count)
 */
export async function updateMealPlanServings(
  mealPlanId: string,
  servings: number,
  pantryItemId?: string | null // Optional: pantry item to update allocation for
): Promise<MealPlan> {
  // Validate servings
  const validServings = Math.max(1, Math.min(12, Math.round(servings || 1)));

  // Get current meal plan to check preparation mode and portion allocation
  const { data: currentMealPlan } = await supabase
    .from('meal_plans')
    .select('id, preparation_mode, pantry_item_id')
    .eq('id', mealPlanId)
    .single();

  // Update pantry portion allocation if pre_bought
  if (currentMealPlan?.preparation_mode === 'pre_bought' && currentMealPlan.pantry_item_id) {
    try {
      const { updatePantryPortionAllocation } = await import('./pantryPortionService');
      const allocationResult = await updatePantryPortionAllocation({
        mealPlanId,
        newPortionsRequired: validServings,
        pantryItemId: currentMealPlan.pantry_item_id,
      });

      if (!allocationResult.success) {
        console.warn('[updateMealPlanServings] Failed to update pantry portion allocation:', allocationResult.error);
        // Don't throw - continue with servings update
      }
    } catch (portionError) {
      console.warn('[updateMealPlanServings] Error updating pantry portion allocation:', portionError);
      // Don't throw - continue with servings update
    }
  }

  return selectSingleMealPlanWithFallback((selectClause) =>
    supabase
      .from('meal_plans')
      .update({
        servings: validServings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealPlanId)
      .select(selectClause)
      .single()
  );
}

/**
 * Update meal plan preparation mode and pantry item link
 */
export async function updateMealPlanPreparation({
  mealPlanId,
  preparationMode,
  pantryItemId,
  servings,
}: {
  mealPlanId: string;
  preparationMode: 'scratch' | 'pre_bought';
  pantryItemId?: string | null;
  servings?: number;
}): Promise<MealPlan> {
  // Validate preparation mode
  // Allow pre_bought without pantryItemId initially (user can add pantry item later)
  // Only require pantryItemId if we're actually allocating portions
  if (preparationMode === 'scratch' && pantryItemId) {
    throw new Error('pantryItemId must be null when preparationMode is "scratch"');
  }

  // Get current meal plan
  const { data: currentMealPlan, error: fetchError } = await supabase
    .from('meal_plans')
    .select('id, preparation_mode, pantry_item_id, servings')
    .eq('id', mealPlanId)
    .single();

  if (fetchError || !currentMealPlan) {
    throw new Error(`Meal plan not found: ${fetchError?.message || 'Unknown error'}`);
  }

  const currentServings = servings ?? currentMealPlan.servings ?? 1;
  const validServings = Math.max(1, Math.min(12, Math.round(currentServings)));

  // Handle mode switching
  const wasPreBought = currentMealPlan.preparation_mode === 'pre_bought';
  const isPreBought = preparationMode === 'pre_bought';

  // If switching from pre_bought to scratch, release portions
  if (wasPreBought && !isPreBought && currentMealPlan.pantry_item_id) {
    try {
      const { releasePantryPortions } = await import('./pantryPortionService');
      await releasePantryPortions(mealPlanId);
    } catch (portionError) {
      console.warn('[updateMealPlanPreparation] Error releasing pantry portions:', portionError);
      // Don't throw - continue with mode update
    }
  }

  // If switching to pre_bought and pantry item exists, allocate portions
  if (isPreBought && pantryItemId) {
    try {
      const { allocatePantryPortions } = await import('./pantryPortionService');
      const allocationResult = await allocatePantryPortions({
        pantryItemId,
        mealPlanId,
        portionsRequired: validServings,
      });

      if (!allocationResult.success) {
        console.warn('[updateMealPlanPreparation] Failed to allocate pantry portions:', allocationResult.error);
        // Don't throw - continue with mode update, but user should be aware
      }
    } catch (portionError) {
      console.warn('[updateMealPlanPreparation] Error allocating pantry portions:', portionError);
      // Don't throw - continue with mode update
    }
  }
  // If switching to pre_bought without pantryItemId, just update the mode
  // User can add pantry item later via the UI

  // If updating servings in pre_bought mode, update allocation
  if (isPreBought && pantryItemId && servings && servings !== currentMealPlan.servings) {
    try {
      const { updatePantryPortionAllocation } = await import('./pantryPortionService');
      await updatePantryPortionAllocation({
        mealPlanId,
        newPortionsRequired: validServings,
        pantryItemId,
      });
    } catch (portionError) {
      console.warn('[updateMealPlanPreparation] Error updating pantry portion allocation:', portionError);
      // Don't throw - continue with update
    }
  }

  // Update meal plan
  const updateData: any = {
    preparation_mode: preparationMode,
    pantry_item_id: preparationMode === 'pre_bought' ? pantryItemId : null,
    updated_at: new Date().toISOString(),
  };

  // Update servings if provided
  if (servings !== undefined) {
    updateData.servings = validServings;
  }

  return selectSingleMealPlanWithFallback((selectClause) =>
    supabase
      .from('meal_plans')
      .update(updateData)
      .eq('id', mealPlanId)
      .select(selectClause)
      .single()
  );
}

/**
 * Add an external meal (bought/restaurant) to meal plan
 */
export async function addExternalMealToPlan({
  name,
  vendor,
  type,
  mealType,
  dayOfWeek,
  weekStartDate,
  profileId,
  householdId,
  scheduledAt,
  notes,
  servings = 1, // Number of portions (default: 1, individual-friendly)
  courseType = 'main', // Type of dish/course (default: 'main' for backward compatibility)
}: {
  name: string;
  vendor?: string | null;
  type: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dayOfWeek: number;
  weekStartDate: string;
  profileId: string;
  householdId: string;
  scheduledAt?: string | null; // Optional specific time
  notes?: string | null;
  servings?: number; // Number of portions (default: 1)
  courseType?: MealCourseType; // Type of dish/course (default: 'main')
}): Promise<MealPlan> {
  if (!name || name.trim() === '') {
    throw new Error('External meal name is required');
  }

  // Check for existing meal plan with the same unique constraint fields
  // The unique constraint is on (space_id, week_start_date, day_of_week, meal_type, course_type)
  // This means only ONE meal can exist per slot per course type
  // If a meal already exists for this slot/course, we should update it (replace it)
  // Get full existing record to check for pantry allocations
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id, preparation_mode, pantry_item_id')
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .eq('course_type', courseType)
    .maybeSingle();

  // Validate servings
  const validServings = Math.max(1, Math.min(12, Math.round(servings || 1)));

  const mealData: any = {
    space_id: householdId,
    meal_source: 'external',
    external_name: name.trim(),
    external_vendor: vendor?.trim() || null,
    external_type: type,
    is_prepared: false, // External meals are not prepared by user
    servings: validServings, // Store user-selected portion count
    course_type: courseType, // Store course type
    meal_type: mealType,
    day_of_week: dayOfWeek,
    week_start_date: weekStartDate,
    scheduled_at: scheduledAt || null,
    notes: notes || null,
    created_by: profileId,
    // Explicitly set other fields to null for external meals
    meal_id: null,
    recipe_id: null,
    custom_meal_name: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Release old pantry portions if the existing meal had pre_bought mode
    if (existing.preparation_mode === 'pre_bought' && existing.pantry_item_id) {
      try {
        const { releasePantryPortions } = await import('./pantryPortionService');
        const releaseResults = await releasePantryPortions(existing.id);
        
        // Check if any releases failed
        const releaseFailed = releaseResults.some(r => !r.success);
        if (releaseFailed) {
          console.warn('[addExternalMealToPlan] Some pantry portion releases failed:', releaseResults);
          // Continue anyway - the meal replacement should still proceed
        }
      } catch (portionError) {
        console.warn('[addExternalMealToPlan] Error releasing old pantry portions:', portionError);
        // Continue anyway - the meal replacement should still proceed
      }
    }

    // Update existing meal (external meals don't use pantry items, so no allocation needed)
    let data: MealPlan;
    try {
      data = await selectSingleMealPlanWithFallback((selectClause) =>
        supabase
          .from('meal_plans')
          .update(mealData)
          .eq('id', existing.id)
          .select(selectClause)
          .single()
      );
    } catch (error) {
      console.error('[addExternalMealToPlan] Update failed:', error);
      throw error;
    }

    // Mark as replaced for UI feedback
    (data as any).wasReplaced = true;
    return data;
  }

  // Insert new meal
  let data: MealPlan;
  try {
    data = await selectSingleMealPlanWithFallback((selectClause) =>
      supabase
        .from('meal_plans')
        .insert(mealData)
        .select(selectClause)
        .single()
    );
  } catch (error) {
    console.error('[addExternalMealToPlan] Insert failed:', {
      error,
      mealData,
    });
    throw error;
  }

  return data;
}

export async function getHouseholdFavourites(householdId: string): Promise<MealFavourite[]> {
  return selectMealFavouritesWithFallback((selectClause) =>
    supabase
      .from('meal_favourites')
      .select(selectClause)
      .eq('space_id', householdId)
      .order('vote_count', { ascending: false })
  );
}

/**
 * Get current user's favorites (both meals and recipes) for a space
 * Uses the current authenticated user's profile ID
 */
export async function getCurrentUserFavourites(spaceId: string, userId?: string): Promise<MealFavourite[]> {
  // If userId is provided, use it; otherwise fetch from auth context
  let profileId = userId;
  
  if (!profileId) {
    // Get current user's profile ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!profile) return [];
    profileId = profile.id;
  }

  try {
    return await selectMealFavouritesWithFallback((selectClause) =>
      supabase
        .from('meal_favourites')
        .select(selectClause)
        .eq('user_id', profileId)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
    );
  } catch (error) {
    console.error('[getCurrentUserFavourites] Error fetching favorites:', error);
    throw error;
  }
}

export async function toggleMealFavourite(
  mealId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('meal_id', mealId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_favourites')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('meal_favourites')
    .insert({
      meal_id: mealId,
      space_id: householdId,
      user_id: userId,
      vote_count: 1
    });

  if (error) throw error;
  return true;
}

/**
 * Toggle recipe favorite (convenience function)
 */
export async function toggleRecipeFavourite(
  recipeId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_favourites')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('meal_favourites')
    .insert({
      recipe_id: recipeId,
      space_id: householdId,
      user_id: userId,
      vote_count: 1
    });

  if (error) throw error;
  return true;
}

export async function isMealFavourite(
  mealId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('meal_id', mealId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Check if recipe is favorited
 */
export async function isRecipeFavourite(
  recipeId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek] || '';
}

export function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  };
  return labels[mealType] || mealType;
}

export function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    home_cooked: 'bg-blue-100 text-blue-800',
    healthy: 'bg-green-100 text-green-800',
    vegetarian: 'bg-emerald-100 text-emerald-800',
    vegan: 'bg-lime-100 text-lime-800',
    gluten_free: 'bg-amber-100 text-amber-800',
    high_protein: 'bg-red-100 text-red-800',
    budget_friendly: 'bg-purple-100 text-purple-800',
    takeaway: 'bg-orange-100 text-orange-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    home_cooked: 'Home Cooked',
    healthy: 'Healthy',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    gluten_free: 'Gluten Free',
    high_protein: 'High Protein',
    budget_friendly: 'Budget Friendly',
    takeaway: 'Takeaway'
  };
  return labels[category] || category;
}

export async function createCustomMeal(
  name: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  householdId: string,
  createdBy: string,
  options?: {
    categories?: string[];
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{ 
      food_item_id?: string;
      name?: string; // Deprecated - kept for backward compatibility
      quantity: string; 
      unit: string;
      optional?: boolean;
    }>;
    instructions?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergies?: string[];
    imageUrl?: string;
  }
): Promise<MealLibraryItem> {
  const { data, error } = await supabase
    .from('meal_library')
    .insert({
      name,
      meal_type: mealType,
      household_id: householdId,
      created_by: createdBy,
      is_public: false,
      categories: options?.categories || [],
      cuisine: options?.cuisine || null,
      difficulty: options?.difficulty || 'medium',
      prep_time: options?.prepTime || null,
      cook_time: options?.cookTime || null,
      servings: options?.servings || 4,
      ingredients: options?.ingredients || [],
      instructions: options?.instructions || null,
      calories: options?.calories || null,
      protein: options?.protein || null,
      carbs: options?.carbs || null,
      fat: options?.fat || null,
      allergies: options?.allergies || [],
      image_url: options?.imageUrl || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomMeal(
  mealId: string,
  updates: {
    name?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    categories?: string[];
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{ 
      food_item_id?: string;
      name?: string; // Deprecated - kept for backward compatibility
      quantity: string; 
      unit: string;
      optional?: boolean;
    }>;
    instructions?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergies?: string[];
    imageUrl?: string;
  }
): Promise<MealLibraryItem> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.mealType) updateData.meal_type = updates.mealType;
  if (updates.categories) updateData.categories = updates.categories;
  if (updates.cuisine !== undefined) updateData.cuisine = updates.cuisine;
  if (updates.difficulty) updateData.difficulty = updates.difficulty;
  if (updates.prepTime !== undefined) updateData.prep_time = updates.prepTime;
  if (updates.cookTime !== undefined) updateData.cook_time = updates.cookTime;
  if (updates.servings) updateData.servings = updates.servings;
  if (updates.ingredients) updateData.ingredients = updates.ingredients;
  if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
  if (updates.calories !== undefined) updateData.calories = updates.calories;
  if (updates.protein !== undefined) updateData.protein = updates.protein;
  if (updates.carbs !== undefined) updateData.carbs = updates.carbs;
  if (updates.fat !== undefined) updateData.fat = updates.fat;
  if (updates.allergies) updateData.allergies = updates.allergies;
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from('meal_library')
    .update(updateData)
    .eq('id', mealId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomMeal(mealId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_library')
    .delete()
    .eq('id', mealId);

  if (error) throw error;
}
