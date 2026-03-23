/**
 * WeeklyPantryCheckSheet - Bottom sheet for checking pantry against weekly meal plans
 * 
 * Shows all meals planned for the week, ingredients needed, what's in stock, and what needs buying.
 * Allows adding missing items to grocery list or pantry.
 */

import { useState, useEffect } from 'react';
import { Package, CheckCircle2, AlertCircle, ShoppingCart, Plus, X, Loader2, UtensilsCrossed } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import { performWeeklyPantryCheck, type WeeklyPantryCheckResult, type WeeklyIngredientCheck } from '../../lib/weeklyPantryCheckService';
import { addGroceryItem, getOrCreateDefaultList } from '../../lib/intelligentGrocery';
import { addPantryItem } from '../../lib/intelligentGrocery';
import { showToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { MealPlan } from '../../lib/mealPlanner';
import { getDayName } from '../../lib/mealPlanner';

interface WeeklyPantryCheckSheetProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  weekStartDate: string;
  onPantryUpdated?: () => void; // Callback when pantry is updated
  onGroceryListUpdated?: () => void; // Callback when grocery list is updated
}

export function WeeklyPantryCheckSheet({
  isOpen,
  onClose,
  householdId,
  weekStartDate,
  onPantryUpdated,
  onGroceryListUpdated,
}: WeeklyPantryCheckSheetProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<WeeklyPantryCheckResult | null>(null);
  const [addingToGrocery, setAddingToGrocery] = useState<Set<string>>(new Set());
  const [addingToPantry, setAddingToPantry] = useState<Set<string>>(new Set());
  const [showAddToPantryInput, setShowAddToPantryInput] = useState<string | null>(null);
  const [showAddToGroceryInput, setShowAddToGroceryInput] = useState<string | null>(null);
  const [pantryQuantityInput, setPantryQuantityInput] = useState('');
  const [groceryQuantityInput, setGroceryQuantityInput] = useState('');

  // Load pantry check when sheet opens or week changes
  useEffect(() => {
    if (isOpen && householdId && weekStartDate) {
      loadPantryCheck();
    }
  }, [isOpen, householdId, weekStartDate]);

  const loadPantryCheck = async () => {
    setLoading(true);
    try {
      const result = await performWeeklyPantryCheck(householdId, weekStartDate);
      console.log('[WeeklyPantryCheckSheet] Loaded result:', {
        mealPlansCount: result.mealPlans?.length || 0,
        mealPlans: result.mealPlans,
        ingredientsCount: result.ingredients.length,
        householdId,
        weekStartDate,
      });
      setCheckResult(result);
    } catch (error) {
      console.error('Failed to perform meal check:', error);
      showToast('error', 'Failed to check meals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGroceryList = async (ingredient: WeeklyIngredientCheck) => {
    if (!user || addingToGrocery.has(ingredient.ingredientId || '')) return;

    const quantity = groceryQuantityInput.trim() || ingredient.missingQuantityDisplay || ingredient.requiredQuantityDisplay || '1';
    
    setAddingToGrocery(prev => new Set(prev).add(ingredient.ingredientId || ''));
    setShowAddToGroceryInput(null);
    setGroceryQuantityInput('');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        showToast('error', 'User profile not found');
        return;
      }

      // Parse quantity and unit
      const quantityMatch = quantity.match(/^(\d+(?:\.\d+)?)\s*(.+)?$/);
      const quantityValue = quantityMatch ? quantityMatch[1] : quantity;
      const quantityUnit = quantityMatch && quantityMatch[2] ? quantityMatch[2].trim() : ingredient.unit || undefined;

      const defaultList = await getOrCreateDefaultList(householdId, profile.id);
      
      await addGroceryItem({
        householdId,
        listId: defaultList.id,
        foodItemId: ingredient.ingredientId || undefined,
        quantity: `${quantityValue}${quantityUnit ? ` ${quantityUnit}` : ''}`,
        unit: quantityUnit,
        memberId: profile.id,
        source: 'meal_planner_pantry_check',
      });

      showToast('success', `Added ${ingredient.name} to grocery list`);
      
      // Refresh check to update status
      await loadPantryCheck();
      
      if (onGroceryListUpdated) {
        onGroceryListUpdated();
      }
    } catch (error) {
      console.error('Failed to add to grocery list:', error);
      showToast('error', 'Failed to add to grocery list');
    } finally {
      setAddingToGrocery(prev => {
        const next = new Set(prev);
        next.delete(ingredient.ingredientId || '');
        return next;
      });
    }
  };

  const handleAddAllToGroceryList = async () => {
    if (!checkResult || !user || checkResult.needsBuying.length === 0) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        showToast('error', 'User profile not found');
        return;
      }

      const defaultList = await getOrCreateDefaultList(householdId, profile.id);
      
      // Add all missing ingredients
      const promises = checkResult.needsBuying.map(ingredient =>
        addGroceryItem({
          householdId,
          listId: defaultList.id,
          foodItemId: ingredient.ingredientId || undefined,
          quantity: ingredient.missingQuantityDisplay || ingredient.requiredQuantityDisplay || undefined,
          unit: ingredient.unit || undefined,
          memberId: profile.id,
          source: 'meal_planner_pantry_check',
        })
      );

      await Promise.all(promises);
      showToast('success', `Added ${checkResult.needsBuying.length} items to grocery list`);
      
      // Refresh check
      await loadPantryCheck();
      
      if (onGroceryListUpdated) {
        onGroceryListUpdated();
      }
    } catch (error) {
      console.error('Failed to add all to grocery list:', error);
      showToast('error', 'Failed to add items to grocery list');
    }
  };

  const handleAddToPantry = async (ingredient: WeeklyIngredientCheck) => {
    if (!user || !ingredient.ingredientId) return;

    const quantity = pantryQuantityInput.trim() || ingredient.missingQuantityDisplay || ingredient.requiredQuantityDisplay || '1';
    
    setAddingToPantry(prev => new Set(prev).add(ingredient.ingredientId || ''));
    setShowAddToPantryInput(null);
    setPantryQuantityInput('');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        showToast('error', 'User profile not found');
        return;
      }

      // Parse quantity and unit
      const quantityMatch = quantity.match(/^(\d+(?:\.\d+)?)\s*(.+)?$/);
      let quantityValue = quantityMatch ? quantityMatch[1] : quantity;
      let quantityUnit = quantityMatch && quantityMatch[2] ? quantityMatch[2].trim() : ingredient.unit || undefined;

      // Note: addPantryItem will automatically normalize the quantity to logical whole units
      // (e.g., 1L bottle, 15 onions, 1kg carrots, 500g ground beef)
      await addPantryItem({
        householdId,
        foodItemId: ingredient.ingredientId,
        quantityValue,
        quantityUnit,
        memberId: profile.id,
      });

      showToast('success', `Added ${ingredient.name} to pantry`);
      
      // Refresh check
      await loadPantryCheck();
      
      if (onPantryUpdated) {
        onPantryUpdated();
      }
    } catch (error) {
      console.error('Failed to add to pantry:', error);
      showToast('error', 'Failed to add to pantry');
    } finally {
      setAddingToPantry(prev => {
        const next = new Set(prev);
        next.delete(ingredient.ingredientId || '');
        return next;
      });
    }
  };

  const renderIngredientRow = (ingredient: WeeklyIngredientCheck, isInStock: boolean) => {
    const isAddingToGrocery = addingToGrocery.has(ingredient.ingredientId || '');
    const isAddingToPantry = addingToPantry.has(ingredient.ingredientId || '');
    const showPantryInput = showAddToPantryInput === ingredient.ingredientId;
    const showGroceryInput = showAddToGroceryInput === ingredient.ingredientId;

    return (
      <div
        key={ingredient.ingredientId || ingredient.name}
        className={`p-3 sm:p-4 rounded-lg border-2 ${
          isInStock
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                {ingredient.name}
              </h4>
              {isInStock && (
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
              )}
              {!isInStock && !ingredient.needsManualCheck && (
                <AlertCircle size={16} className="text-orange-600 flex-shrink-0" />
              )}
            </div>

            {/* Quantity info */}
            <div className="text-xs sm:text-sm text-gray-600 space-y-0.5">
              {ingredient.isPortionTracked ? (
                // Portion-tracked item display
                <>
                  <div>
                    <span className="font-medium">Portions needed:</span>{' '}
                    {ingredient.portionsRequired || 0} {ingredient.portionUnit || 'serving'}{(ingredient.portionsRequired || 0) !== 1 ? 's' : ''}
                  </div>
                  {ingredient.inPantry && ingredient.remainingPortions !== undefined && (
                    <div>
                      <span className="font-medium">Remaining:</span>{' '}
                      {ingredient.remainingPortions} / {ingredient.totalPortions} {ingredient.portionUnit || 'serving'}{ingredient.remainingPortions !== 1 ? 's' : ''}
                    </div>
                  )}
                  {ingredient.willBeDepleted && (
                    <div className="text-amber-700 font-medium">
                      ⚠️ Will be depleted this week
                    </div>
                  )}
                  {ingredient.missingQuantityDisplay && (
                    <div className="text-orange-700 font-medium">
                      <span>Need {ingredient.missingQuantityDisplay}</span>
                      {ingredient.portionUnit ? ` ${ingredient.portionUnit}` : ' servings'}
                    </div>
                  )}
                </>
              ) : (
                // Regular ingredient display
                <>
                  {ingredient.requiredQuantityDisplay && (
                    <div>
                      <span className="font-medium">Needed:</span>{' '}
                      {ingredient.requiredQuantityDisplay} {ingredient.unit || 'g'}
                    </div>
                  )}
                  {ingredient.inPantry && ingredient.pantryQuantityDisplay && (
                    <div>
                      <span className="font-medium">In pantry:</span>{' '}
                      {ingredient.pantryQuantityDisplay} {ingredient.unit || 'g'}
                    </div>
                  )}
                  {ingredient.missingQuantityDisplay && (
                    <div className="text-orange-700 font-medium">
                      <span>Need {ingredient.missingQuantityDisplay}</span>
                      {ingredient.unit ? ` ${ingredient.unit}` : ' (unit not specified)'}
                    </div>
                  )}
                  {ingredient.needsManualCheck && (
                    <div className="text-gray-500 italic">
                      Check manually (e.g., "to taste", "pinch")
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!isInStock && !ingredient.needsManualCheck && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {showPantryInput ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={pantryQuantityInput}
                    onChange={(e) => setPantryQuantityInput(e.target.value)}
                    placeholder={ingredient.missingQuantityDisplay || 'Quantity'}
                    className="w-full sm:w-32 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToPantry(ingredient)}
                      disabled={isAddingToPantry}
                      className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      {isAddingToPantry ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddToPantryInput(null);
                        setPantryQuantityInput('');
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showGroceryInput ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={groceryQuantityInput}
                    onChange={(e) => setGroceryQuantityInput(e.target.value)}
                    placeholder={ingredient.missingQuantityDisplay || 'Quantity'}
                    className="w-full sm:w-32 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToGroceryList(ingredient)}
                      disabled={isAddingToGrocery}
                      className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      {isAddingToGrocery ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddToGroceryInput(null);
                        setGroceryQuantityInput('');
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowAddToGroceryInput(ingredient.ingredientId || null);
                      setGroceryQuantityInput(ingredient.missingQuantityDisplay || '');
                    }}
                    disabled={isAddingToGrocery}
                    className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
                    title="Add to grocery list"
                  >
                    {isAddingToGrocery ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        <span>Grocery</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddToPantryInput(ingredient.ingredientId || null);
                      setPantryQuantityInput(ingredient.missingQuantityDisplay || '');
                    }}
                    disabled={isAddingToPantry}
                    className="px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
                    title="Add to pantry"
                  >
                    {isAddingToPantry ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Pantry</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
          {isInStock && (
            <div className="flex items-center gap-1 text-green-700 text-xs font-medium">
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">Covered</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Meal Check"
      maxHeight="90vh"
    >
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-orange-500" size={24} />
            <span className="ml-2 text-gray-600">Checking meals and pantry...</span>
          </div>
        ) : !checkResult ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No data available</p>
          </div>
        ) : !checkResult.mealPlans || checkResult.mealPlans.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No meals planned</h3>
            <p className="text-gray-600">Plan some meals to check pantry needs</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Meals for the Week Section - Always show if meal plans exist */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Meals This Week ({checkResult.mealPlans.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checkResult.mealPlans.map((plan: MealPlan) => {
                    // Calculate the actual date for this meal
                    const planDate = new Date(plan.week_start_date);
                    planDate.setDate(planDate.getDate() + plan.day_of_week);
                    const dayName = getDayName(plan.day_of_week);
                    
                    // Get meal name
                    const mealName = plan.external_name || 
                                     plan.recipe?.name || 
                                     plan.meal?.name || 
                                     plan.custom_meal_name || 
                                     'Unnamed Meal';
                    
                    // Get meal type label
                    const mealTypeLabel = plan.meal_type.charAt(0).toUpperCase() + plan.meal_type.slice(1);
                    
                    return (
                      <div
                        key={plan.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{mealName}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {dayName} • {mealTypeLabel}
                              {plan.servings && plan.servings > 1 && (
                                <span className="ml-1">({plan.servings} portions)</span>
                              )}
                            </div>
                            {plan.course_type && plan.course_type !== 'main' && (
                              <div className="text-xs text-gray-500 mt-0.5 capitalize">
                                {plan.course_type}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* Summary */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Package size={20} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Ingredient Summary</h3>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Based on {checkResult.mealPlans.length} meal{checkResult.mealPlans.length !== 1 ? 's' : ''} planned for this week
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Total ingredients</div>
                  <div className="text-lg font-bold text-gray-900">{checkResult.summary.totalIngredients}</div>
                </div>
                <div>
                  <div className="text-gray-600">In stock</div>
                  <div className="text-lg font-bold text-green-600">{checkResult.summary.inStockCount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Needs buying</div>
                  <div className="text-lg font-bold text-orange-600">{checkResult.summary.needsBuyingCount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Check manually</div>
                  <div className="text-lg font-bold text-gray-600">{checkResult.summary.needsManualCheckCount}</div>
                </div>
              </div>
              {checkResult.summary.allCovered && (
                <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 font-medium text-center">
                  ✅ Everything is covered!
                </div>
              )}
            </div>

            {/* In Stock Section */}
            {checkResult.inStock.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <h3 className="font-bold text-gray-900">In Stock ({checkResult.inStock.length})</h3>
                </div>
                <div className="space-y-2">
                  {checkResult.inStock.map(ingredient => renderIngredientRow(ingredient, true))}
                </div>
              </div>
            )}

            {/* Needs Buying Section */}
            {checkResult.needsBuying.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-600" />
                    <h3 className="font-bold text-gray-900">Needs Buying ({checkResult.needsBuying.length})</h3>
                  </div>
                  <button
                    onClick={handleAddAllToGroceryList}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 touch-manipulation"
                  >
                    <ShoppingCart size={14} />
                    <span>Add All</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {checkResult.needsBuying.map(ingredient => renderIngredientRow(ingredient, false))}
                </div>
              </div>
            )}

            {/* Manual Check Section */}
            {checkResult.needsManualCheck.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={18} className="text-gray-500" />
                  <h3 className="font-bold text-gray-900">Check Manually ({checkResult.needsManualCheck.length})</h3>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  These ingredients need manual checking (e.g., "to taste", "pinch")
                </p>
                <div className="space-y-2">
                  {checkResult.needsManualCheck.map(ingredient => (
                    <div
                      key={ingredient.ingredientId || ingredient.name}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="font-medium text-gray-900 text-sm">{ingredient.name}</div>
                      {ingredient.unit && (
                        <div className="text-xs text-gray-600 mt-1">{ingredient.unit}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
