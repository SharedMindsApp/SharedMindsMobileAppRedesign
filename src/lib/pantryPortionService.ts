/**
 * Pantry Portion Service
 * 
 * Manages portion-based pantry items that can be consumed across multiple meal plans.
 * Handles allocation, release, and validation of portions.
 */

import { supabase } from './supabase';

export interface PantryPortionItem {
  id: string;
  food_item_id: string | null;
  total_portions: number | null;
  remaining_portions: number | null;
  portion_unit: string | null;
  household_id: string;
}

export interface PortionAllocationResult {
  success: boolean;
  pantryItemId: string;
  portionsAllocated: number;
  remainingAfterAllocation: number;
  error?: string;
}

export interface PortionReleaseResult {
  success: boolean;
  portionsReleased: number;
  remainingAfterRelease: number;
  error?: string;
}

/**
 * Check if a pantry item is portion-tracked
 */
export function isPortionTracked(item: PantryPortionItem): boolean {
  return item.total_portions !== null && item.total_portions !== undefined;
}

/**
 * Find portion-tracked pantry items by food_item_id
 */
export async function findPortionTrackedItems(
  foodItemId: string,
  householdId: string
): Promise<PantryPortionItem[]> {
  const { data, error } = await supabase
    .from('household_pantry_items')
    .select('id, food_item_id, total_portions, remaining_portions, portion_unit, household_id')
    .eq('food_item_id', foodItemId)
    .eq('household_id', householdId)
    .not('total_portions', 'is', null)
    .gt('remaining_portions', 0)
    .order('remaining_portions', { ascending: false });

  if (error) {
    console.error('[findPortionTrackedItems] Error:', error);
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    food_item_id: item.food_item_id,
    total_portions: item.total_portions,
    remaining_portions: item.remaining_portions,
    portion_unit: item.portion_unit,
    household_id: item.household_id,
  }));
}

/**
 * Allocate portions from a pantry item to a meal plan
 */
export async function allocatePantryPortions({
  pantryItemId,
  mealPlanId,
  portionsRequired,
}: {
  pantryItemId: string;
  mealPlanId: string;
  portionsRequired: number;
}): Promise<PortionAllocationResult> {
  if (portionsRequired <= 0) {
    return {
      success: false,
      pantryItemId,
      portionsAllocated: 0,
      remainingAfterAllocation: 0,
      error: 'portionsRequired must be greater than 0',
    };
  }

  try {
    // Get current pantry item state
    const { data: pantryItem, error: fetchError } = await supabase
      .from('household_pantry_items')
      .select('id, total_portions, remaining_portions, portion_unit')
      .eq('id', pantryItemId)
      .single();

    if (fetchError || !pantryItem) {
      return {
        success: false,
        pantryItemId,
        portionsAllocated: 0,
        remainingAfterAllocation: 0,
        error: `Pantry item not found: ${fetchError?.message || 'Unknown error'}`,
      };
    }

    // Validate it's portion-tracked
    if (pantryItem.total_portions === null || pantryItem.total_portions === undefined) {
      return {
        success: false,
        pantryItemId,
        portionsAllocated: 0,
        remainingAfterAllocation: pantryItem.remaining_portions || 0,
        error: 'Pantry item is not portion-tracked',
      };
    }

    // Check availability
    const currentRemaining = pantryItem.remaining_portions || 0;
    if (currentRemaining < portionsRequired) {
      return {
        success: false,
        pantryItemId,
        portionsAllocated: 0,
        remainingAfterAllocation: currentRemaining,
        error: `Insufficient portions: ${currentRemaining} remaining, ${portionsRequired} required`,
      };
    }

    // Update pantry item (decrement remaining_portions)
    const newRemaining = currentRemaining - portionsRequired;
    const { error: updateError } = await supabase
      .from('household_pantry_items')
      .update({ remaining_portions: newRemaining })
      .eq('id', pantryItemId);

    if (updateError) {
      console.error('[allocatePantryPortions] Error updating pantry item:', updateError);
      return {
        success: false,
        pantryItemId,
        portionsAllocated: 0,
        remainingAfterAllocation: currentRemaining,
        error: `Failed to update pantry item: ${updateError.message}`,
      };
    }

    // Create or update usage record
    const { error: usageError } = await supabase
      .from('pantry_portion_usage')
      .upsert(
        {
          pantry_item_id: pantryItemId,
          meal_plan_id: mealPlanId,
          portions_used: portionsRequired,
        },
        {
          onConflict: 'pantry_item_id,meal_plan_id',
        }
      );

    if (usageError) {
      // Rollback pantry item update
      await supabase
        .from('household_pantry_items')
        .update({ remaining_portions: currentRemaining })
        .eq('id', pantryItemId);

      console.error('[allocatePantryPortions] Error creating usage record:', usageError);
      return {
        success: false,
        pantryItemId,
        portionsAllocated: 0,
        remainingAfterAllocation: currentRemaining,
        error: `Failed to create usage record: ${usageError.message}`,
      };
    }

    return {
      success: true,
      pantryItemId,
      portionsAllocated: portionsRequired,
      remainingAfterAllocation: newRemaining,
    };
  } catch (error) {
    console.error('[allocatePantryPortions] Unexpected error:', error);
    return {
      success: false,
      pantryItemId,
      portionsAllocated: 0,
      remainingAfterAllocation: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Release portions back to pantry when a meal plan is removed or servings change
 */
export async function releasePantryPortions(mealPlanId: string): Promise<PortionReleaseResult[]> {
  try {
    // Get all usage records for this meal plan
    const { data: usageRecords, error: fetchError } = await supabase
      .from('pantry_portion_usage')
      .select('id, pantry_item_id, portions_used')
      .eq('meal_plan_id', mealPlanId);

    if (fetchError) {
      console.error('[releasePantryPortions] Error fetching usage records:', fetchError);
      return [{
        success: false,
        portionsReleased: 0,
        remainingAfterRelease: 0,
        error: `Failed to fetch usage records: ${fetchError.message}`,
      }];
    }

    if (!usageRecords || usageRecords.length === 0) {
      // No portions to release
      return [];
    }

    const results: PortionReleaseResult[] = [];

    // Release portions for each pantry item
    for (const usage of usageRecords) {
      try {
        // Get current pantry item state
        const { data: pantryItem, error: itemError } = await supabase
          .from('household_pantry_items')
          .select('id, total_portions, remaining_portions')
          .eq('id', usage.pantry_item_id)
          .single();

        if (itemError || !pantryItem) {
          results.push({
            success: false,
            portionsReleased: 0,
            remainingAfterRelease: 0,
            error: `Pantry item not found: ${itemError?.message || 'Unknown error'}`,
          });
          continue;
        }

        // Restore portions
        const currentRemaining = pantryItem.remaining_portions || 0;
        const portionsToRestore = usage.portions_used;
        const newRemaining = Math.min(
          (pantryItem.total_portions || 0),
          currentRemaining + portionsToRestore
        );

        // Update pantry item
        const { error: updateError } = await supabase
          .from('household_pantry_items')
          .update({ remaining_portions: newRemaining })
          .eq('id', usage.pantry_item_id);

        if (updateError) {
          results.push({
            success: false,
            portionsReleased: 0,
            remainingAfterRelease: currentRemaining,
            error: `Failed to update pantry item: ${updateError.message}`,
          });
          continue;
        }

        // Delete usage record
        const { error: deleteError } = await supabase
          .from('pantry_portion_usage')
          .delete()
          .eq('id', usage.id);

        if (deleteError) {
          // Rollback pantry item update
          await supabase
            .from('household_pantry_items')
            .update({ remaining_portions: currentRemaining })
            .eq('id', usage.pantry_item_id);

          results.push({
            success: false,
            portionsReleased: 0,
            remainingAfterRelease: currentRemaining,
            error: `Failed to delete usage record: ${deleteError.message}`,
          });
          continue;
        }

        results.push({
          success: true,
          portionsReleased: portionsToRestore,
          remainingAfterRelease: newRemaining,
        });
      } catch (error) {
        results.push({
          success: false,
          portionsReleased: 0,
          remainingAfterRelease: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[releasePantryPortions] Unexpected error:', error);
    return [{
      success: false,
      portionsReleased: 0,
      remainingAfterRelease: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }];
  }
}

/**
 * Update portion allocation when meal plan servings change
 */
export async function updatePantryPortionAllocation({
  mealPlanId,
  newPortionsRequired,
  pantryItemId,
}: {
  mealPlanId: string;
  newPortionsRequired: number;
  pantryItemId: string;
}): Promise<PortionAllocationResult> {
  // First, release existing allocation
  const releaseResults = await releasePantryPortions(mealPlanId);
  
  // Check if release was successful
  const releaseFailed = releaseResults.some(r => !r.success);
  if (releaseFailed) {
    console.warn('[updatePantryPortionAllocation] Some releases failed, continuing anyway');
  }

  // Then, allocate new portions
  if (newPortionsRequired > 0) {
    return await allocatePantryPortions({
      pantryItemId,
      mealPlanId,
      portionsRequired: newPortionsRequired,
    });
  }

  // If newPortionsRequired is 0, just return success (already released)
  return {
    success: true,
    pantryItemId,
    portionsAllocated: 0,
    remainingAfterAllocation: 0,
  };
}

/**
 * Get portion usage for a meal plan
 */
export async function getMealPlanPortionUsage(mealPlanId: string): Promise<Array<{
  pantryItemId: string;
  portionsUsed: number;
  pantryItem: PantryPortionItem | null;
}>> {
  const { data, error } = await supabase
    .from('pantry_portion_usage')
    .select(`
      pantry_item_id,
      portions_used,
      pantry_item:household_pantry_items(
        id,
        food_item_id,
        total_portions,
        remaining_portions,
        portion_unit,
        household_id
      )
    `)
    .eq('meal_plan_id', mealPlanId);

  if (error) {
    console.error('[getMealPlanPortionUsage] Error:', error);
    throw error;
  }

  return (data || []).map(usage => ({
    pantryItemId: usage.pantry_item_id,
    portionsUsed: usage.portions_used,
    pantryItem: usage.pantry_item ? {
      id: usage.pantry_item.id,
      food_item_id: usage.pantry_item.food_item_id,
      total_portions: usage.pantry_item.total_portions,
      remaining_portions: usage.pantry_item.remaining_portions,
      portion_unit: usage.pantry_item.portion_unit,
      household_id: usage.pantry_item.household_id,
    } : null,
  }));
}
