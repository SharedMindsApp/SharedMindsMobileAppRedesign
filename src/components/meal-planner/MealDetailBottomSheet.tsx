/**
 * MealDetailBottomSheet - View meal details and actions
 * 
 * ADHD-first: calm, optional actions, no pressure
 */

import { useState, useEffect } from 'react';
import { X, Clock, Edit, Trash2, ExternalLink, ChevronDown, ChevronUp, Minus, Plus, Package, ShoppingBag, Loader2, ChefHat, Home, Info } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import type { MealPlan, MealLibraryItem } from '../../lib/mealPlanner';
import { updateMealPlanServings, updateMealPlanPreparation } from '../../lib/mealPlanner';
import { showToast } from '../Toast';
import { getFoodItemsByIds, type FoodItem } from '../../lib/foodItems';
import { convertIngredientPieceToGramsSync } from '../../lib/pieceToWeightConverter';
import { supabase } from '../../lib/supabase';
import { findPortionTrackedItems } from '../../lib/pantryPortionService';
import { getOrCreateFoodItem } from '../../lib/foodItems';
import { addPantryItem } from '../../lib/intelligentGrocery';

interface MealDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlan: MealPlan;
  onReplace: () => void;
  onRemove: () => void;
  onViewRecipe?: (servings?: number) => void; // Optional servings parameter for scaling
  onServingsUpdated?: () => void; // Callback to refresh meal plans after servings update
}

export function MealDetailBottomSheet({
  isOpen,
  onClose,
  mealPlan,
  onReplace,
  onRemove,
  onViewRecipe,
  onServingsUpdated,
}: MealDetailBottomSheetProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [servings, setServings] = useState(mealPlan.servings || 1);
  const [updatingServings, setUpdatingServings] = useState(false);
  const [foodItemMap, setFoodItemMap] = useState<Map<string, FoodItem>>(new Map());
  const [pantryItem, setPantryItem] = useState<any>(null);
  const [updatingPreparation, setUpdatingPreparation] = useState(false);
  const [creatingPantryItem, setCreatingPantryItem] = useState(false);
  const [newPantryItemPortions, setNewPantryItemPortions] = useState<number>(6); // Default portions for new pantry item
  
  // Editable preparation mode state
  const [preparationMode, setPreparationMode] = useState<'scratch' | 'pre_bought'>(
    (mealPlan as any).preparation_mode || 'scratch'
  );
  const isPreBought = preparationMode === 'pre_bought';
  const pantryItemId = (mealPlan as any).pantry_item_id;

  const meal = mealPlan.meal;
  const recipe = mealPlan.recipe;
  
  // Determine meal name based on meal source (same logic as renderMealSlot)
  // Priority: external_name > recipe.name > meal.name > custom_meal_name
  const mealName = mealPlan.external_name 
    || recipe?.name 
    || meal?.name 
    || mealPlan.custom_meal_name 
    || 'Unnamed meal';

  // Space context detection for pantry/pre-made functionality
  const [spaceContext, setSpaceContext] = useState<{ space_type: string | null } | null>(null);
  const [loadingSpaceContext, setLoadingSpaceContext] = useState(false);
  // Check if household space - shared spaces are household spaces (not personal)
  const isHouseholdSpace = spaceContext?.space_type?.toLowerCase() === 'shared' || spaceContext?.space_type?.toLowerCase() === 'household';

  // Load space context to determine if pantry/pre-made is available
  useEffect(() => {
    const spaceId = mealPlan.space_id;
    if (!spaceId) {
      setSpaceContext(null);
      return;
    }

    const loadSpaceContext = async () => {
      setLoadingSpaceContext(true);
      try {
        const { data: space, error } = await supabase
          .from('spaces')
          .select('type')
          .eq('id', spaceId)
          .maybeSingle();

        if (error) {
          console.error('[MealDetailBottomSheet] Error loading space context:', error);
          setSpaceContext(null);
          return;
        }

        if (space) {
          const spaceType = (space as any).type;
          const isHousehold = spaceType?.toLowerCase() === 'shared' || spaceType?.toLowerCase() === 'household';
          console.log('[MealDetailBottomSheet] Space context loaded:', {
            spaceId,
            space_type: spaceType,
            isHousehold,
          });
          setSpaceContext({ space_type: spaceType });
        } else {
          console.warn('[MealDetailBottomSheet] Space not found:', spaceId);
          // If space not found, assume it's not a household space (safer default)
          setSpaceContext(null);
        }
      } catch (error) {
        console.error('[MealDetailBottomSheet] Error loading space context:', error);
        setSpaceContext(null);
      } finally {
        setLoadingSpaceContext(false);
      }
    };

    loadSpaceContext();
  }, [mealPlan.space_id]);

  // Update local state when mealPlan changes (but only if it's actually different)
  useEffect(() => {
    if (mealPlan.servings && mealPlan.servings !== servings) {
      setServings(mealPlan.servings);
    }
    const currentMode = (mealPlan as any).preparation_mode || 'scratch';
    // Only update if it's actually different to avoid resetting during updates
    if (currentMode !== preparationMode) {
      setPreparationMode(currentMode);
    }
    // Initialize new pantry item portions based on recipe/meal servings
    const defaultPortions = recipe?.servings || meal?.servings || 6;
    if (newPantryItemPortions === 6 && defaultPortions !== 6) {
      setNewPantryItemPortions(defaultPortions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlan.id, mealPlan.servings, (mealPlan as any).preparation_mode]);

  // Load pantry item if pre_bought (reload when mode or pantryItemId changes) - Only in household spaces
  useEffect(() => {
    if (isPreBought && pantryItemId && isHouseholdSpace) {
      const loadPantryItem = async () => {
        try {
          const { data, error } = await supabase
            .from('household_pantry_items')
            .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
            .eq('id', pantryItemId)
            .single();
          
          if (!error && data) {
            setPantryItem(data);
          } else {
            setPantryItem(null);
          }
        } catch (error) {
          console.error('Error loading pantry item:', error);
          setPantryItem(null);
        }
      };
      
      loadPantryItem();
    } else {
      setPantryItem(null);
    }
  }, [isPreBought, pantryItemId, mealPlan.id, isHouseholdSpace]);

  // Load food items for ingredient names (only if not pre_bought)
  useEffect(() => {
    if (isPreBought) {
      setFoodItemMap(new Map());
      return;
    }
    
    const loadFoodItems = async () => {
      // Collect all food_item_ids from both meal and recipe ingredients
      const foodItemIds: string[] = [];
      
      if (meal?.ingredients) {
        meal.ingredients.forEach(ing => {
          if (ing.food_item_id) {
            foodItemIds.push(ing.food_item_id);
          }
        });
      }
      
      if (recipe?.ingredients) {
        recipe.ingredients.forEach(ing => {
          if (ing.food_item_id && !foodItemIds.includes(ing.food_item_id)) {
            foodItemIds.push(ing.food_item_id);
          }
        });
      }

      if (foodItemIds.length === 0) {
        setFoodItemMap(new Map());
        return;
      }

      try {
        const items = await getFoodItemsByIds(foodItemIds);
        const map = new Map(items.map(item => [item.id, item]));
        setFoodItemMap(map);
      } catch (error) {
        console.error('Error loading food items:', error);
        setFoodItemMap(new Map());
      }
    };

    loadFoodItems();
  }, [meal?.ingredients, recipe?.ingredients, isPreBought]);

  // Helper functions to get food item name and emoji
  const getFoodItemName = (foodItemId: string | null | undefined): string => {
    if (!foodItemId) return '';
    return foodItemMap.get(foodItemId)?.name || 'Loading...';
  };

  const getFoodItemEmoji = (foodItemId: string | null | undefined): string | null => {
    if (!foodItemId) return null;
    return foodItemMap.get(foodItemId)?.emoji || null;
  };

  const handleServingsChange = async (newServings: number) => {
    const validServings = Math.max(1, Math.min(12, Math.round(newServings)));
    setServings(validServings);

    // Only update if different from current
    if (validServings === mealPlan.servings) return;

    setUpdatingServings(true);
    try {
      // If pre_bought and we have a pantry item in household space, update portion allocation
      // In personal spaces or without pantry item, just update servings
      if (isPreBought && pantryItemId && isHouseholdSpace) {
        await updateMealPlanPreparation({
          mealPlanId: mealPlan.id,
          preparationMode: 'pre_bought',
          pantryItemId,
          servings: validServings,
        });
        // Reload pantry item to get updated portion counts
        const { data: pantryData, error: pantryError } = await supabase
          .from('household_pantry_items')
          .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
          .eq('id', pantryItemId)
          .single();
        
        if (!pantryError && pantryData) {
          setPantryItem(pantryData);
        }
      } else {
        // Update servings normally (works in both personal and household spaces)
        await updateMealPlanServings(mealPlan.id, validServings);
      }
      showToast('success', `Updated to ${validServings} ${validServings === 1 ? 'portion' : 'portions'}`);
      if (onServingsUpdated) {
        onServingsUpdated();
      }
    } catch (error) {
      console.error('Failed to update servings:', error);
      showToast('error', 'Failed to update portions');
      // Revert on error
      setServings(mealPlan.servings || 1);
    } finally {
      setUpdatingServings(false);
    }
  };

  const handlePreparationModeChange = async (newMode: 'scratch' | 'pre_bought') => {
    // Don't do anything if already in this mode
    if (newMode === preparationMode) {
      return;
    }

    setUpdatingPreparation(true);
    try {
      let targetPantryItemId: string | null = null;

      if (newMode === 'pre_bought') {
        // Try to find existing portion-tracked pantry item (only in household spaces)
        if (isHouseholdSpace) {
          try {
            const foodItem = await getOrCreateFoodItem(mealName);
            const spaceId = mealPlan.space_id;
            if (!spaceId) {
              throw new Error('No space ID available');
            }
            const existingItems = await findPortionTrackedItems(foodItem.id, spaceId);

          if (existingItems.length > 0) {
            // Use first available item
            targetPantryItemId = existingItems[0].id;

            // Load pantry item details
            const { data: pantryData, error: pantryError } = await supabase
              .from('household_pantry_items')
              .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
              .eq('id', targetPantryItemId)
              .single();

            if (!pantryError && pantryData) {
              setPantryItem(pantryData);
            }
          }
            // If no existing item, targetPantryItemId stays null
            // The mode will still be updated, and user can create pantry item via button
          } catch (error) {
            console.error('[MealDetailBottomSheet] Error finding pantry item:', error);
            // Continue anyway - allow mode change, user can create pantry item later
          }
        }
        // In personal spaces, we allow pre_bought mode but won't link to pantry items
      }

      // Update meal plan preparation mode (even if no pantry item yet for pre_bought)
      // This works in both personal and household spaces - preparation mode is just metadata
      await updateMealPlanPreparation({
        mealPlanId: mealPlan.id,
        preparationMode: newMode,
        pantryItemId: targetPantryItemId, // Will be null in personal spaces or if no item found
        servings,
      });

      // Update local state immediately for responsive UI
      setPreparationMode(newMode);
      if (newMode === 'scratch') {
        setPantryItem(null);
      } else if (targetPantryItemId) {
        // Reload pantry item to get updated portion counts
        const { data: pantryData, error: pantryError } = await supabase
          .from('household_pantry_items')
          .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
          .eq('id', targetPantryItemId)
          .single();
        
        if (!pantryError && pantryData) {
          setPantryItem(pantryData);
        }
      }

      showToast('success', newMode === 'pre_bought' ? 'Switched to pre-made mode' : 'Switched to cooking from scratch');
      if (onServingsUpdated) {
        onServingsUpdated();
      }
    } catch (error) {
      console.error('[MealDetailBottomSheet] Error updating preparation mode:', error);
      showToast('error', 'Failed to update preparation mode');
      // Revert state on error
      const currentMode = (mealPlan as any).preparation_mode || 'scratch';
      setPreparationMode(currentMode);
    } finally {
      setUpdatingPreparation(false);
    }
  };

  const handleCreatePantryItem = async () => {
    // Wait for space context to load if still loading
    if (loadingSpaceContext) {
      showToast('info', 'Loading space information...');
      return;
    }

    // UI guard: prevent pantry item creation in personal spaces
    if (!isHouseholdSpace) {
      console.warn('[MealDetailBottomSheet] Attempted to create pantry item in non-household space:', {
        spaceId: mealPlan.space_id,
        spaceContext,
        isHouseholdSpace,
      });
      showToast('info', 'Pantry items belong to households. Switch to a household space to use pre-made meals.');
      return;
    }

    setCreatingPantryItem(true);
    try {
      const spaceId = mealPlan.space_id;
      if (!spaceId) {
        throw new Error('No space ID available');
      }

      // Get or create food item
      const foodItem = await getOrCreateFoodItem(mealName);

      // Create pantry item with user-specified portions
      const portionsToUse = newPantryItemPortions > 0 ? newPantryItemPortions : (recipe?.servings || meal?.servings || 6);
      const pantryItem = await addPantryItem({
        householdId: spaceId,
        foodItemId: foodItem.id,
        totalPortions: portionsToUse,
        portionUnit: 'serving',
        status: 'have',
      });

      // Load pantry item details
      const { data: pantryData, error: pantryError } = await supabase
        .from('household_pantry_items')
        .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
        .eq('id', pantryItem.id)
        .single();

      if (!pantryError && pantryData) {
        setPantryItem(pantryData);
      }

      // Update meal plan to link pantry item and allocate portions
      await updateMealPlanPreparation({
        mealPlanId: mealPlan.id,
        preparationMode: 'pre_bought',
        pantryItemId: pantryItem.id,
        servings,
      });

      setPreparationMode('pre_bought');
      showToast('success', `Added ${mealName} to pantry (${portionsToUse} servings)`);
      // Reset portion input to default for next time
      setNewPantryItemPortions(recipe?.servings || meal?.servings || 6);
      if (onServingsUpdated) {
        onServingsUpdated();
      }
    } catch (error) {
      console.error('[MealDetailBottomSheet] Error creating pantry item:', error);
      showToast('error', 'Failed to add item to pantry');
    } finally {
      setCreatingPantryItem(false);
    }
  };

  const handleRemove = () => {
    if (window.confirm(`Remove "${mealName}" from your plan?`)) {
      onRemove();
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mealName}
      maxHeight="85vh"
    >
      <div className="px-3 sm:px-6 pb-6 overflow-x-hidden">
        {/* Meal Image */}
        {(meal?.image_url || recipe?.image_url) && (
          <div className="mb-5 rounded-xl overflow-hidden -mx-4 sm:-mx-6">
            <img
              src={meal?.image_url || recipe?.image_url || ''}
              alt={mealName}
              className="w-full h-40 sm:h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Preparation Mode Toggle - Only show if recipe or meal exists */}
        {(mealPlan.recipe_id || mealPlan.meal_id) && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
              How is this meal prepared?
            </label>
            

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => handlePreparationModeChange('scratch')}
                disabled={updatingPreparation || creatingPantryItem}
                className={`px-2 sm:px-3 py-3 sm:py-4 rounded-xl font-medium text-xs sm:text-sm transition-all touch-manipulation min-h-[64px] sm:min-h-[72px] flex flex-col items-center justify-center gap-1 sm:gap-2 ${
                  preparationMode === 'scratch'
                    ? 'bg-green-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 active:bg-green-100 border-2 border-green-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChefHat size={18} className="sm:w-[22px] sm:h-[22px] flex-shrink-0" />
                <span className="text-center leading-tight px-0.5">Cooking from scratch</span>
              </button>
              <button
                onClick={() => handlePreparationModeChange('pre_bought')}
                disabled={updatingPreparation || creatingPantryItem}
                className={`px-2 sm:px-3 py-3 sm:py-4 rounded-xl font-medium text-xs sm:text-sm transition-all touch-manipulation min-h-[64px] sm:min-h-[72px] flex flex-col items-center justify-center gap-1 sm:gap-2 ${
                  preparationMode === 'pre_bought'
                    ? 'bg-green-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 active:bg-green-100 border-2 border-green-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingBag size={18} className="sm:w-[22px] sm:h-[22px] flex-shrink-0" />
                <span className="text-center leading-tight px-0.5">Pre-made / ready-made</span>
              </button>
            </div>
            {updatingPreparation && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
                <Loader2 size={18} className="animate-spin" />
                <span>Updating...</span>
              </div>
            )}
            {preparationMode === 'pre_bought' && !pantryItemId && !creatingPantryItem && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                {loadingSpaceContext ? (
                  <div className="text-center py-2">
                    <Loader2 size={16} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-xs text-blue-800">Checking space...</p>
                  </div>
                ) : isHouseholdSpace ? (
                  <>
                    <p className="text-xs sm:text-sm text-blue-900 mb-3 sm:mb-4 font-semibold">
                      This item isn't in your pantry yet
                    </p>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">
                    How many portions in this item?
                  </label>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setNewPantryItemPortions(Math.max(1, newPantryItemPortions - 1))}
                      disabled={newPantryItemPortions <= 1}
                      className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 bg-white border-2 border-blue-300 rounded-xl flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation shadow-sm"
                      aria-label="Decrease portions"
                    >
                      <Minus size={18} className="sm:w-5 sm:h-5 text-blue-600" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={newPantryItemPortions}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0) {
                          setNewPantryItemPortions(value);
                        }
                      }}
                      className="flex-1 min-w-0 px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xl sm:text-2xl font-bold bg-white border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-blue-400 focus:border-blue-500 touch-manipulation"
                      style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)' }}
                    />
                    <button
                      onClick={() => setNewPantryItemPortions(newPantryItemPortions + 1)}
                      className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 bg-white border-2 border-blue-300 rounded-xl flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation shadow-sm"
                      aria-label="Increase portions"
                    >
                      <Plus size={18} className="sm:w-5 sm:h-5 text-blue-600" />
                    </button>
                  </div>
                </div>
                    <button
                      onClick={handleCreatePantryItem}
                      disabled={creatingPantryItem}
                      className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[48px] sm:min-h-[52px] shadow-md"
                    >
                      {creatingPantryItem ? (
                        <>
                          <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Add to pantry</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-xs sm:text-sm text-blue-800">
                    <p className="mb-1">
                      <Info size={14} className="inline mr-1.5 align-middle" />
                      Pantry tracking requires a household space. Switch to a household space to add this item to your pantry.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Portion Selector - Prominent for easy editing */}
        <div className="mb-4 sm:mb-5 p-3 sm:p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
            How many portions?
          </label>
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => handleServingsChange(servings - 1)}
              disabled={servings <= 1 || updatingServings || updatingPreparation}
              className="w-12 h-12 sm:w-14 sm:h-16 flex-shrink-0 bg-white border-2 border-orange-300 rounded-xl flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation shadow-sm"
              aria-label="Decrease portions"
            >
              <Minus size={20} className="sm:w-[22px] sm:h-[22px] text-orange-600" />
            </button>
            <div className="flex-1 text-center min-w-0">
              <div className="text-3xl sm:text-4xl font-bold text-orange-700 leading-none" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>{servings}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-1.5 font-medium">
                {servings === 1 ? 'portion' : 'portions'}
              </div>
            </div>
            <button
              onClick={() => handleServingsChange(servings + 1)}
              disabled={servings >= 12 || updatingServings || updatingPreparation}
              className="w-12 h-12 sm:w-14 sm:h-16 flex-shrink-0 bg-white border-2 border-orange-300 rounded-xl flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation shadow-sm"
              aria-label="Increase portions"
            >
              <Plus size={20} className="sm:w-[22px] sm:h-[22px] text-orange-600" />
            </button>
          </div>
          {updatingServings && (
            <p className="text-sm text-gray-500 text-center mt-3 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>Updating...</span>
            </p>
          )}
          {isPreBought && pantryItem && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 text-center font-medium">
                <span className="font-semibold">Pantry stock:</span> {pantryItem.remaining_portions || 0} / {pantryItem.total_portions || 0} {pantryItem.portion_unit || 'serving'}{(pantryItem.remaining_portions || 0) !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}
          {!isPreBought && (mealPlan.recipe_id || mealPlan.meal_id) && (
            <p className="text-sm text-gray-600 text-center mt-3">
              Ingredients will scale automatically when viewing the recipe
            </p>
          )}
        </div>

        {/* Pantry Item Info (Pre-bought only) - Show detailed info - Only in household spaces */}
        {isPreBought && pantryItem && isHouseholdSpace && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
              <Package size={18} className="sm:w-[22px] sm:h-[22px] text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-blue-900 text-sm sm:text-base">Pantry Item Details</span>
            </div>
            <div className="text-xs sm:text-sm text-blue-800 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between py-1 sm:py-1.5">
                <span className="font-semibold">Item:</span>
                <span className="text-blue-900 font-medium text-right text-xs sm:text-sm truncate ml-2">{pantryItem.food_item?.name || mealName}</span>
              </div>
              <div className="flex items-center justify-between py-1 sm:py-1.5">
                <span className="font-semibold">Total portions:</span>
                <span className="text-blue-900 font-medium text-xs sm:text-sm">{pantryItem.total_portions || 0} {pantryItem.portion_unit || 'serving'}{(pantryItem.total_portions || 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between py-1 sm:py-1.5">
                <span className="font-semibold">Remaining:</span>
                <span className={`font-bold text-base sm:text-lg ${(pantryItem.remaining_portions || 0) === 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {pantryItem.remaining_portions || 0} {pantryItem.portion_unit || 'serving'}{(pantryItem.remaining_portions || 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 sm:pt-3 border-t-2 border-blue-200">
                <span className="font-semibold">Using for this meal:</span>
                <span className="text-blue-900 font-bold text-base sm:text-lg">{servings} {pantryItem.portion_unit || 'serving'}{servings !== 1 ? 's' : ''}</span>
              </div>
              {pantryItem.remaining_portions === 0 && (
                <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 font-semibold text-xs sm:text-sm">
                  ⚠️ This item is depleted - you'll need to restock
                </div>
              )}
              {(pantryItem.remaining_portions || 0) > 0 && (pantryItem.remaining_portions || 0) < servings && (
                <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-orange-50 border-2 border-orange-200 rounded-lg text-orange-700 font-semibold text-xs sm:text-sm">
                  ⚠️ Not enough portions - only {pantryItem.remaining_portions} {pantryItem.portion_unit || 'serving'}{(pantryItem.remaining_portions || 0) !== 1 ? 's' : ''} remaining
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-gray-600 mb-5">
          {!isPreBought && (meal?.prep_time || recipe?.prep_time) && (
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-gray-500" />
              <span className="font-medium">{(meal?.prep_time || recipe?.prep_time || 0) + ((meal?.cook_time || recipe?.cook_time) || 0)} min</span>
            </div>
          )}
          {/* Show base recipe/meal servings if different from plan servings */}
          {!isPreBought && ((meal?.servings || recipe?.servings) && (meal?.servings || recipe?.servings || 1) !== servings) && (
            <span className="text-gray-500 font-medium">
              Base recipe: {meal?.servings || recipe?.servings || 1} {(meal?.servings || recipe?.servings || 1) === 1 ? 'serving' : 'servings'}
            </span>
          )}
        </div>

        {/* Categories/Tags */}
        {((meal?.categories && meal.categories.length > 0) || (recipe?.categories && recipe.categories.length > 0)) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {(meal?.categories || recipe?.categories || []).map(cat => (
              <span
                key={cat}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
              >
                {cat.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients (Collapsible) - Only show if not pre_bought */}
        {!isPreBought && ((meal?.ingredients && meal.ingredients.length > 0) || (recipe?.ingredients && recipe.ingredients.length > 0)) && (
          <div className="mb-5">
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-h-[52px]"
            >
              <span className="font-semibold text-base text-gray-900">Ingredients</span>
              {showIngredients ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </button>
            {showIngredients && (
              <div className="mt-3 space-y-2.5">
                {(meal?.ingredients || recipe?.ingredients || []).map((ing, idx) => {
                  // Get ingredient name: prefer food_item name, fallback to ing.name
                  const ingredientName = ing.food_item_id 
                    ? getFoodItemName(ing.food_item_id)
                    : (ing.name || 'Unknown ingredient');
                  
                  const ingredientEmoji = ing.food_item_id ? getFoodItemEmoji(ing.food_item_id) : null;

                  return (
                    <div key={idx} className="flex items-start gap-3 text-sm sm:text-base text-gray-700 p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      {ingredientEmoji && (
                        <span className="text-xl flex-shrink-0">{ingredientEmoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 break-words">
                          {ingredientName}
                        </div>
                        {(ing.quantity || ing.unit) && (() => {
                          // Convert piece units to grams if possible
                          const pieceConverted = convertIngredientPieceToGramsSync({
                            quantity: ing.quantity || '',
                            unit: ing.unit || '',
                            name: ingredientName,
                            food_item_id: ing.food_item_id,
                          });
                          
                          const displayQuantity = pieceConverted.converted ? pieceConverted.quantity : ing.quantity;
                          const displayUnit = pieceConverted.converted ? pieceConverted.unit : ing.unit;
                          
                          return (
                            <div className="text-sm text-gray-600 mt-1">
                              {displayQuantity && displayUnit ? (
                                <span className="font-medium">{displayQuantity} {displayUnit}</span>
                              ) : displayQuantity ? (
                                <span className="font-medium">{displayQuantity}</span>
                              ) : displayUnit ? (
                                <span className="font-medium">{displayUnit}</span>
                              ) : null}
                              {ing.notes && (
                                <span className="text-gray-500 italic ml-1"> • {ing.notes}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Instructions (if available) - Only show if not pre_bought */}
        {!isPreBought && (meal?.instructions || recipe?.instructions) && (
          <div className="mb-5">
            <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-3">Instructions</h4>
            <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{meal?.instructions || recipe?.instructions}</p>
          </div>
        )}

        {/* Nutrition (Hidden by default, ADHD-first) */}
        {((meal && (meal.calories || meal.protein || meal.carbs || meal.fat)) || (recipe && (recipe.calories || recipe.protein || recipe.carbs || recipe.fat))) && (
          <div className="mb-5">
            <button
              onClick={() => setShowNutrition(!showNutrition)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-h-[52px]"
            >
              <span className="font-semibold text-base text-gray-900">Nutrition</span>
              {showNutrition ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </button>
            {showNutrition && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(meal?.calories || recipe?.calories) && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1.5 font-medium">Calories</div>
                    <div className="text-xl font-bold text-gray-900">{meal?.calories || recipe?.calories}</div>
                  </div>
                )}
                {(meal?.protein || recipe?.protein) && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1.5 font-medium">Protein</div>
                    <div className="text-xl font-bold text-gray-900">{meal?.protein || recipe?.protein}g</div>
                  </div>
                )}
                {(meal?.carbs || recipe?.carbs) && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1.5 font-medium">Carbs</div>
                    <div className="text-xl font-bold text-gray-900">{meal?.carbs || recipe?.carbs}g</div>
                  </div>
                )}
                {(meal?.fat || recipe?.fat) && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1.5 font-medium">Fat</div>
                    <div className="text-xl font-bold text-gray-900">{meal?.fat || recipe?.fat}g</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-5 border-t-2 border-gray-200">
          {/* Show View Recipe button if recipe_id exists (recipe from recipes table) - First priority */}
          {onViewRecipe && mealPlan.recipe_id && (
            <button
              onClick={() => {
                // Pass current servings (may have been updated) to recipe view for scaling
                onViewRecipe(servings);
                onClose();
              }}
              className="w-full px-5 py-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold text-base rounded-xl transition-colors touch-manipulation flex items-center justify-center gap-2.5 min-h-[52px] shadow-sm"
            >
              <ExternalLink size={20} />
              View Full Recipe
            </button>
          )}

          <button
            onClick={() => {
              onReplace();
              onClose();
            }}
            className="w-full px-5 py-4 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-semibold text-base rounded-xl transition-colors touch-manipulation flex items-center justify-center gap-2.5 min-h-[52px] shadow-sm"
          >
            <Edit size={20} />
            Replace Meal
          </button>

          <button
            onClick={handleRemove}
            className="w-full px-5 py-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-semibold text-base rounded-xl transition-colors touch-manipulation flex items-center justify-center gap-2.5 min-h-[52px] shadow-sm"
          >
            <Trash2 size={20} />
            Remove from Plan
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
