/**
 * RecipeDetail - Component for displaying recipe details
 * 
 * Shows full recipe information with ingredients, instructions, and metadata
 * ADHD-first design: clear, calm, no pressure
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, Users, ChefHat, Edit, Trash2, X, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, Eye, Package, Calendar, ShoppingBag, Loader2, Minus, Plus, Home, Info } from 'lucide-react';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { getFoodItemsByIds, type FoodItem } from '../../lib/foodItems';
import { getValidationStatus, type RecipeValidationStatus } from '../../lib/recipeValidationService';
import { getRecipeUsageStats, trackRecipeView, type RecipeUsageStats } from '../../lib/recipeUsageStatsService';
import { RecipeFeedback } from './RecipeFeedback';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { convertIngredientForDisplay } from '../../lib/unitConversion';
import { convertIngredientPieceToGramsSync } from '../../lib/pieceToWeightConverter';
import { MealPrepModal } from '../meal-planner/MealPrepModal';
import { AddRecipeToMealModal } from '../meal-planner/AddRecipeToMealModal';
import { scaleIngredients, getScalingInfo, type ScaledIngredient } from '../../lib/ingredientScaling';
import { updateMealPlanPreparation } from '../../lib/mealPlanner';
import { findPortionTrackedItems } from '../../lib/pantryPortionService';
import { getOrCreateFoodItem } from '../../lib/foodItems';
import { addPantryItem } from '../../lib/intelligentGrocery';
import { showToast } from '../Toast';
import { supabase } from '../../lib/supabase';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  showActions?: boolean;
  isEditable?: boolean;
  spaceId?: string; // Optional spaceId for meal prep
  planServings?: number; // Optional servings from meal plan (for scaling)
  mealPlanId?: string; // Optional meal plan ID (indicates meal planner context)
  onMealAdded?: () => void; // Optional callback when meal is added to plan (for navigation/refresh)
}

export function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
  onClose,
  showActions = true,
  isEditable = false,
  spaceId,
  planServings, // Optional servings from meal plan
  mealPlanId, // Optional meal plan ID (indicates meal planner context)
  onMealAdded, // Optional callback when meal is added to plan
}: RecipeDetailProps) {
  const { measurementSystem } = useUIPreferences();
  const [foodItemMap, setFoodItemMap] = useState<Map<string, FoodItem>>(new Map());
  const [showNutrition, setShowNutrition] = useState(false);
  const [validationStatus, setValidationStatus] = useState<RecipeValidationStatus | null>(null);
  const [usageStats, setUsageStats] = useState<RecipeUsageStats | null>(null);
  const [showMealPrepModal, setShowMealPrepModal] = useState(false);
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);
  
  // Meal planner context state
  const isMealPlannerContext = !!mealPlanId;
  const [preparationMode, setPreparationMode] = useState<'scratch' | 'pre_bought'>('scratch');
  const [previousMode, setPreviousMode] = useState<'scratch' | 'pre_bought' | null>(null);
  const [pantryItemId, setPantryItemId] = useState<string | null>(null);
  const [pantryItem, setPantryItem] = useState<any>(null);
  const [loadingMealPlan, setLoadingMealPlan] = useState(false);
  const [updatingPreparation, setUpdatingPreparation] = useState(false);
  const [creatingPantryItem, setCreatingPantryItem] = useState(false);
  const [addingAnotherPantryItem, setAddingAnotherPantryItem] = useState(false);
  const [newPantryItemPortions, setNewPantryItemPortions] = useState<number>(6); // Default portions for new pantry item
  
  // Space context detection for pantry/pre-made functionality
  const [spaceContext, setSpaceContext] = useState<{ space_type: string | null } | null>(null);
  const [loadingSpaceContext, setLoadingSpaceContext] = useState(false);
  // Check if household space - shared spaces are household spaces (not personal)
  const isHouseholdSpace = spaceContext?.space_type?.toLowerCase() === 'shared' || spaceContext?.space_type?.toLowerCase() === 'household';
  
  // State safety: prevent duplicate operations
  const isAnyOperationInProgress = updatingPreparation || creatingPantryItem || addingAnotherPantryItem || loadingMealPlan;

  // Scale ingredients if planServings is provided (from meal planner)
  const effectiveServings = planServings ?? recipe.servings ?? 1;
  const scalingInfo = getScalingInfo(recipe.servings ?? 1, effectiveServings);
  
  const scaledIngredients = useMemo(() => {
    return scaleIngredients(
      recipe.ingredients,
      recipe.servings ?? 1,
      effectiveServings
    );
  }, [recipe.ingredients, recipe.servings, effectiveServings]);

  useEffect(() => {
    const loadFoodItems = async () => {
      const foodItemIds = recipe.ingredients.map(ing => ing.food_item_id);
      if (foodItemIds.length === 0) return;

      const items = await getFoodItemsByIds(foodItemIds);
      const map = new Map(items.map(item => [item.id, item]));
      setFoodItemMap(map);
    };

    const loadValidationStatus = async () => {
      try {
        const status = await getValidationStatus(recipe.id);
        setValidationStatus(status);
      } catch (error) {
        console.error('Error loading validation status:', error);
      }
    };

    const loadUsageStats = async () => {
      try {
        const stats = await getRecipeUsageStats(recipe.id, recipe.household_id || undefined);
        setUsageStats(stats);
      } catch (error) {
        console.error('Error loading usage stats:', error);
      }
    };

    const trackView = async () => {
      try {
        await trackRecipeView(recipe.id, recipe.household_id || undefined);
        await loadUsageStats(); // Refresh stats
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    loadFoodItems();
    loadValidationStatus();
    loadUsageStats();
    trackView(); // Track that recipe was viewed
  }, [recipe.ingredients, recipe.id, recipe.household_id]);

  // Load space context to determine if pantry/pre-made is available
  useEffect(() => {
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
          console.error('[RecipeDetail] Error loading space context:', error);
          setSpaceContext(null);
          return;
        }

        if (space) {
          const spaceType = (space as any).type;
          const isHousehold = spaceType?.toLowerCase() === 'shared' || spaceType?.toLowerCase() === 'household';
          console.log('[RecipeDetail] Space context loaded:', {
            spaceId,
            space_type: spaceType,
            isHousehold,
          });
          setSpaceContext({ space_type: spaceType });
        } else {
          console.warn('[RecipeDetail] Space not found:', spaceId);
          setSpaceContext(null);
        }
      } catch (error) {
        console.error('[RecipeDetail] Error loading space context:', error);
        setSpaceContext(null);
      } finally {
        setLoadingSpaceContext(false);
      }
    };

    loadSpaceContext();
  }, [spaceId]);

  // Load meal plan data if in meal planner context
  useEffect(() => {
    if (!isMealPlannerContext || !mealPlanId || !spaceId) return;

    const loadMealPlan = async () => {
      setLoadingMealPlan(true);
      try {
        const { data, error } = await supabase
          .from('meal_plans')
          .select('id, preparation_mode, pantry_item_id, servings')
          .eq('id', mealPlanId)
          .single();

        if (error) throw error;

        if (data) {
          const mode = (data.preparation_mode || 'scratch') as 'scratch' | 'pre_bought';
          setPreparationMode(mode);
          setPreviousMode(mode); // Track initial mode
          setPantryItemId(data.pantry_item_id || null);

          // Initialize new pantry item portions based on recipe servings
          const defaultPortions = recipe.servings || 6;
          if (newPantryItemPortions === 6 && defaultPortions !== 6) {
            setNewPantryItemPortions(defaultPortions);
          }

          // Load pantry item if pre_bought (only in household spaces)
          if (mode === 'pre_bought' && data.pantry_item_id && isHouseholdSpace) {
            const { data: pantryData, error: pantryError } = await supabase
              .from('household_pantry_items')
              .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
              .eq('id', data.pantry_item_id)
              .single();

            if (!pantryError && pantryData) {
              setPantryItem(pantryData);
            }
          }
        }
      } catch (error) {
        console.error('[RecipeDetail] Error loading meal plan:', error);
      } finally {
        setLoadingMealPlan(false);
      }
    };

    loadMealPlan();
  }, [isMealPlannerContext, mealPlanId, spaceId, recipe.servings, isHouseholdSpace]);

  // Find or create pantry item when switching to pre_bought
  const handlePreparationModeChange = async (newMode: 'scratch' | 'pre_bought') => {
    if (!isMealPlannerContext || !mealPlanId || !spaceId) return;
    
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
            const foodItem = await getOrCreateFoodItem(recipe.name);
            const existingItems = await findPortionTrackedItems(foodItem.id, spaceId);

          if (existingItems.length > 0) {
            // Use first available item
            targetPantryItemId = existingItems[0].id;
            setPantryItemId(targetPantryItemId);

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
            console.error('[RecipeDetail] Error finding pantry item:', error);
            // Continue anyway - allow mode change, user can create pantry item later
          }
        }
        // In personal spaces, we allow pre_bought mode but won't link to pantry items
      }

      // Update meal plan preparation mode (works in both personal and household spaces)
      // Preparation mode is just metadata - pantry item linking only happens in household spaces
      await updateMealPlanPreparation({
        mealPlanId,
        preparationMode: newMode,
        pantryItemId: targetPantryItemId, // Will be null in personal spaces or if no item found
        servings: effectiveServings,
      });

      setPreviousMode(preparationMode); // Track previous mode for confirmation message
      setPreparationMode(newMode);
      if (newMode === 'scratch') {
        setPantryItemId(null);
        setPantryItem(null);
      }

      showToast('success', newMode === 'pre_bought' ? 'Switched to pre-made mode' : 'Switched to cooking from scratch');
    } catch (error) {
      console.error('[RecipeDetail] Error updating preparation mode:', error);
      showToast('error', 'Failed to update preparation mode');
    } finally {
      setUpdatingPreparation(false);
    }
  };

  // Create pantry item and link to meal plan
  const handleCreatePantryItem = async () => {
    if (!isMealPlannerContext || !mealPlanId || !spaceId) return;

    // UI guard: prevent pantry item creation in personal spaces
    if (!isHouseholdSpace) {
      showToast('info', 'Pantry items belong to households. Switch to a household space to use pre-made meals.');
      return;
    }

    setCreatingPantryItem(true);
    try {
      // Get or create food item
      const foodItem = await getOrCreateFoodItem(recipe.name);

      // Create pantry item with user-specified portions
      const portionsToUse = newPantryItemPortions > 0 ? newPantryItemPortions : (recipe.servings || 6);
      const pantryItem = await addPantryItem({
        householdId: spaceId,
        foodItemId: foodItem.id,
        totalPortions: portionsToUse,
        portionUnit: 'serving',
        status: 'have',
      });

      setPantryItemId(pantryItem.id);

      // Load pantry item details
      const { data: pantryData, error: pantryError } = await supabase
        .from('household_pantry_items')
        .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
        .eq('id', pantryItem.id)
        .single();

      if (!pantryError && pantryData) {
        setPantryItem(pantryData);
      }

      // Update meal plan to link pantry item and allocate portions (only in household spaces)
      if (isHouseholdSpace) {
        await updateMealPlanPreparation({
          mealPlanId,
          preparationMode: 'pre_bought',
          pantryItemId: pantryItem.id,
          servings: effectiveServings,
        });
      }

      setPreparationMode('pre_bought');
      showToast('success', `Added ${recipe.name} to pantry (${portionsToUse} servings)`);
      // Reset portion input to default for next time
      setNewPantryItemPortions(recipe.servings || 6);
    } catch (error) {
      console.error('[RecipeDetail] Error creating pantry item:', error);
      showToast('error', 'Failed to add item to pantry');
    } finally {
      setCreatingPantryItem(false);
    }
  };

  const getFoodItemName = (foodItemId: string): string => {
    return foodItemMap.get(foodItemId)?.name || 'Loading...';
  };

  const getFoodItemEmoji = (foodItemId: string): string | null => {
    return foodItemMap.get(foodItemId)?.emoji || null;
  };

  const formatTime = (minutes: number | null | undefined): string => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const CUISINE_LABELS: Record<string, string> = {
    italian: 'Italian',
    indian: 'Indian',
    chinese: 'Chinese',
    thai: 'Thai',
    british: 'British',
    american: 'American',
    mexican: 'Mexican',
    mediterranean: 'Mediterranean',
    japanese: 'Japanese',
    french: 'French',
    greek: 'Greek',
    korean: 'Korean',
  };

  const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    home_cooked: 'Home Cooked',
    healthy: 'Healthy',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    gluten_free: 'Gluten Free',
    high_protein: 'High Protein',
    budget_friendly: 'Budget Friendly',
    takeaway: 'Takeaway',
  };

  const getStatusBadge = () => {
    const status = validationStatus?.status || recipe.validation_status;
    const qualityScore = validationStatus?.quality_score || recipe.quality_score;

    const statusConfig = {
      approved: { 
        label: 'Approved', 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-700 border-green-200' 
      },
      pending: { 
        label: 'Pending Review', 
        icon: HelpCircle, 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
      },
      needs_review: { 
        label: 'Needs Review', 
        icon: AlertTriangle, 
        color: 'bg-orange-100 text-orange-700 border-orange-200' 
      },
      draft: { 
        label: 'Draft', 
        icon: HelpCircle, 
        color: 'bg-gray-100 text-gray-700 border-gray-200' 
      },
      deprecated: { 
        label: 'Deprecated', 
        icon: AlertTriangle, 
        color: 'bg-red-100 text-red-700 border-red-200' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${config.color}`}>
        <Icon size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
        <span className="whitespace-nowrap">{config.label}</span>
        {qualityScore !== null && (
          <span className="ml-0.5 sm:ml-1 opacity-75 whitespace-nowrap">({(qualityScore * 100).toFixed(0)}%)</span>
        )}
      </div>
    );
  };

  // Parse instructions into individual steps
  const parseInstructions = (instructions: string): string[] => {
    if (!instructions) return [];

    // Try to split by numbered patterns (1., 2., etc.)
    const numberedPattern = /^\d+[\.\)]\s*/m;
    if (numberedPattern.test(instructions)) {
      return instructions
        .split(numberedPattern)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    // Try to split by bullet points
    const bulletPattern = /^[-•*]\s*/m;
    if (bulletPattern.test(instructions)) {
      return instructions
        .split(bulletPattern)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    // Try to split by double newlines (paragraph breaks)
    const paragraphs = instructions.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      return paragraphs.map(step => step.trim()).filter(step => step.length > 0);
    }

    // Try to split by single newlines
    const lines = instructions.split(/\n/);
    if (lines.length > 1) {
      return lines.map(step => step.trim()).filter(step => step.length > 0);
    }

    // If all else fails, return as single step
    return [instructions.trim()];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header - Mobile optimized */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-4 sm:py-6 text-white relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 className="text-2xl sm:text-3xl font-bold break-words pr-2">{recipe.name}</h2>
              <div className="flex-shrink-0">{getStatusBadge()}</div>
            </div>
            {recipe.description && (
              <p className="text-orange-100 text-sm sm:text-base leading-relaxed break-words">{recipe.description}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors flex-shrink-0 touch-manipulation"
              aria-label="Close recipe"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons - Top - Mobile optimized */}
      {spaceId && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Servings Reminder */}
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={16} className="sm:w-[18px] sm:h-[18px] text-orange-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                Makes <span className="text-orange-600 font-semibold">{recipe.servings}</span> {recipe.servings === 1 ? 'serving' : 'servings'}
              </span>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAddToMealModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <Calendar size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Add to Meal</span>
              </button>
              <button
                onClick={() => setShowMealPrepModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-white border-2 border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Meal Prep</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        {/* Metadata Row - Mobile optimized grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Prep Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Prep Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.prep_time)}
              </div>
            </div>
          </div>
          
          {/* Cook Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Cook Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.cook_time)}
              </div>
            </div>
          </div>
          
          {/* Total Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Total Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.total_time || (recipe.prep_time && recipe.cook_time ? recipe.prep_time + recipe.cook_time : null))}
              </div>
            </div>
          </div>
          
          {/* Servings - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Users size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-orange-600 font-semibold truncate">Servings</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-orange-700 break-words">{recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</div>
            </div>
          </div>
          
          {/* Difficulty - Mobile optimized */}
          {recipe.difficulty && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
                <ChefHat size={16} className="sm:w-5 sm:h-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Difficulty</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</div>
              </div>
            </div>
          )}
          
          {/* Cuisine - Mobile optimized */}
          {recipe.cuisine && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Cuisine</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{CUISINE_LABELS[recipe.cuisine] || recipe.cuisine}</div>
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        {recipe.categories && recipe.categories.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {recipe.categories.map(category => (
                <span
                  key={category}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                >
                  {CATEGORY_LABELS[category] || category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dietary Tags */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {recipe.dietary_tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                >
                  {tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preparation Mode Toggle - Only show in meal planner context */}
        {isMealPlannerContext && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <label className="block text-sm sm:text-base font-medium text-gray-900 mb-3">
              How is this meal prepared?
            </label>
            

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePreparationModeChange('scratch')}
                disabled={isAnyOperationInProgress}
                className={`px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation min-h-[60px] flex flex-col items-center justify-center gap-1 ${
                  preparationMode === 'scratch'
                    ? 'bg-green-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 border-2 border-green-200'
                } disabled:opacity-50`}
              >
                <span className="text-xl">👨‍🍳</span>
                <span>Cooking from scratch</span>
              </button>
              <button
                onClick={() => handlePreparationModeChange('pre_bought')}
                disabled={isAnyOperationInProgress}
                className={`px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation min-h-[60px] flex flex-col items-center justify-center gap-1 ${
                  preparationMode === 'pre_bought'
                    ? 'bg-green-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 border-2 border-green-200'
                } disabled:opacity-50`}
              >
                <span className="text-xl">🛒</span>
                <span>Pre-made / ready-made</span>
              </button>
            </div>
            {updatingPreparation && (
              <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                <span>Updating...</span>
              </div>
            )}
            {/* Inline confirmation messaging when switching modes */}
            {!updatingPreparation && !loadingMealPlan && preparationMode === 'pre_bought' && previousMode === 'scratch' && (
              <p className="text-xs text-gray-600 mt-3 opacity-75 text-center px-2">
                Ingredients will no longer be required for this meal. Portions will be taken from your pantry.
              </p>
            )}
            {!updatingPreparation && !loadingMealPlan && preparationMode === 'scratch' && previousMode === 'pre_bought' && (
              <p className="text-xs text-gray-600 mt-3 opacity-75 text-center px-2">
                Any allocated pantry portions will be released back to your pantry.
              </p>
            )}
            {preparationMode === 'pre_bought' && !pantryItemId && (
              <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                {!isHouseholdSpace && !loadingSpaceContext ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-1">
                          Pantry tracking is available in household spaces.
                        </p>
                        <p className="text-xs text-blue-800">
                          You can mark meals as pre-made here, but to track portions and inventory, switch to a household space.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-blue-900 mb-3 font-medium">
                      This item isn't in your pantry yet
                    </p>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How many portions in this item?
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNewPantryItemPortions(Math.max(1, newPantryItemPortions - 1))}
                          disabled={newPantryItemPortions <= 1}
                          className="w-10 h-10 bg-white border-2 border-blue-300 rounded-lg flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                          aria-label="Decrease portions"
                        >
                          <Minus size={16} className="text-blue-600" />
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
                          className="flex-1 px-3 py-2 text-center text-lg font-semibold bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => setNewPantryItemPortions(newPantryItemPortions + 1)}
                          className="w-10 h-10 bg-white border-2 border-blue-300 rounded-lg flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation"
                          aria-label="Increase portions"
                        >
                          <Plus size={16} className="text-blue-600" />
                        </button>
                      </div>
                    </div>
                    {isHouseholdSpace && (
                      <button
                        onClick={handleCreatePantryItem}
                        disabled={isAnyOperationInProgress}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
                      >
                        {creatingPantryItem ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Package size={16} />
                            <span>Add to pantry</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {preparationMode === 'pre_bought' && pantryItem && isHouseholdSpace && (
              <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={18} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Pantry Item</span>
                </div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>
                    <span className="font-medium">Item:</span> {pantryItem.food_item?.name || recipe.name}
                  </div>
                  <div>
                    <span className="font-medium">Remaining:</span> {pantryItem.remaining_portions || 0} / {pantryItem.total_portions || 0} {pantryItem.portion_unit || 'serving'}{(pantryItem.remaining_portions || 0) !== 1 ? 's' : ''}
                  </div>
                  <div>
                    <span className="font-medium">Using:</span> {effectiveServings} {pantryItem.portion_unit || 'serving'}{effectiveServings !== 1 ? 's' : ''}
                  </div>
                  {pantryItem.remaining_portions === 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-red-700 font-medium mb-3">
                        ⚠️ This item has been fully used.
                      </p>
                      {!isHouseholdSpace && !loadingSpaceContext ? (
                        <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800">
                              Pantry items are shared at the household level. Switch to a household space to add more.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              How many portions in this item?
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setNewPantryItemPortions(Math.max(1, newPantryItemPortions - 1))}
                                disabled={newPantryItemPortions <= 1}
                                className="w-10 h-10 bg-white border-2 border-blue-300 rounded-lg flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                                aria-label="Decrease portions"
                              >
                                <Minus size={16} className="text-blue-600" />
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
                                className="flex-1 px-3 py-2 text-center text-lg font-semibold bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => setNewPantryItemPortions(newPantryItemPortions + 1)}
                                className="w-10 h-10 bg-white border-2 border-blue-300 rounded-lg flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation"
                                aria-label="Increase portions"
                              >
                                <Plus size={16} className="text-blue-600" />
                              </button>
                            </div>
                          </div>
                          {isHouseholdSpace && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={async () => {
                                  if (isAnyOperationInProgress) return; // Guard against duplicate clicks
                                  setAddingAnotherPantryItem(true);
                                  try {
                                    await handleCreatePantryItem();
                                    // Reload pantry item after creation
                                    if (pantryItemId) {
                                      const { data: pantryData, error: pantryError } = await supabase
                                        .from('household_pantry_items')
                                        .select('id, total_portions, remaining_portions, portion_unit, food_item:food_items(name)')
                                        .eq('id', pantryItemId)
                                        .single();
                                      
                                      if (!pantryError && pantryData) {
                                        setPantryItem(pantryData);
                                      }
                                    }
                                  } finally {
                                    setAddingAnotherPantryItem(false);
                                  }
                                }}
                                disabled={isAnyOperationInProgress}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[36px]"
                              >
                                {addingAnotherPantryItem ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Adding...</span>
                                  </>
                                ) : (
                                  <>
                                    <Package size={14} />
                                    <span>Add another to pantry</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={async () => {
                                  if (isAnyOperationInProgress) return; // Guard against duplicate clicks
                                  setUpdatingPreparation(true);
                                  try {
                                    if (isHouseholdSpace) {
                                      await updateMealPlanPreparation({
                                        mealPlanId: mealPlanId!,
                                        preparationMode: 'scratch',
                                        pantryItemId: null,
                                        servings: effectiveServings,
                                      });
                                      showToast('success', 'Switched back to cooking from scratch');
                                    } else {
                                      // Personal space - just update local state, no backend call
                                      showToast('info', 'Switched back to cooking from scratch');
                                    }
                                    setPreviousMode('pre_bought');
                                    setPreparationMode('scratch');
                                    setPantryItemId(null);
                                    setPantryItem(null);
                                  } catch (error) {
                                    console.error('[RecipeDetail] Error switching to scratch:', error);
                                    showToast('error', 'Failed to switch mode');
                                  } finally {
                                    setUpdatingPreparation(false);
                                  }
                                }}
                                disabled={isAnyOperationInProgress}
                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[36px]"
                              >
                                <ChefHat size={14} />
                                <span>Switch back to scratch</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preparation Mode Badge - Show in header if pre_bought */}
        {isMealPlannerContext && preparationMode === 'pre_bought' && (
          <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-green-600" />
              <span className="font-medium text-green-900">Pre-made / Ready-made</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              This meal uses portions from your pantry, not ingredients.
            </p>
          </div>
        )}

        {/* Ingredients - Mobile optimized - Hide if pre_bought */}
        {!(isMealPlannerContext && preparationMode === 'pre_bought') && (
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Ingredients</h3>
              {scalingInfo.isScaled && (
                <span className="text-xs sm:text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium border border-orange-200">
                  Scaled for {effectiveServings} {effectiveServings === 1 ? 'portion' : 'portions'}
                </span>
              )}
            </div>
            {scalingInfo.isScaled && (
              <p className="text-xs sm:text-sm text-gray-500 mb-3 italic">
                Original recipe serves {recipe.servings ?? 1}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {scaledIngredients.map((ingredient, index) => {
              // Use scaled quantity if scaled, otherwise use original
              let displayQuantity = ingredient.isScaled ? ingredient.displayQuantity : ingredient.quantity;
              let displayUnit = ingredient.unit;
              
              // Convert piece units to grams if possible
              const ingredientName = getFoodItemName(ingredient.food_item_id);
              const pieceConverted = convertIngredientPieceToGramsSync({
                quantity: displayQuantity,
                unit: displayUnit,
                name: ingredientName,
                food_item_id: ingredient.food_item_id,
              });
              
              if (pieceConverted.converted) {
                displayQuantity = pieceConverted.quantity;
                displayUnit = pieceConverted.unit;
              }
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border transition-all ${
                    ingredient.optional
                      ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  {getFoodItemEmoji(ingredient.food_item_id) && (
                    <span className="text-xl sm:text-2xl flex-shrink-0">{getFoodItemEmoji(ingredient.food_item_id)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`font-semibold text-sm sm:text-base break-words ${ingredient.optional ? 'text-gray-500' : 'text-gray-900'}`}>
                        {getFoodItemName(ingredient.food_item_id)}
                      </span>
                      {ingredient.optional && (
                        <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          Optional
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                      {(() => {
                        const converted = convertIngredientForDisplay(
                          { quantity: displayQuantity, unit: displayUnit },
                          measurementSystem
                        );
                        return (
                          <>
                            <span className="font-medium">{converted.value}</span>
                            {converted.unit && ` ${converted.unit}`}
                            {ingredient.isScaled && ingredient.originalQuantity !== displayQuantity && (
                              <span className="text-gray-400 text-[10px] ml-1">
                                (was {ingredient.originalQuantity})
                              </span>
                            )}
                            {ingredient.notes && (
                              <span className="text-gray-500 italic"> • {ingredient.notes}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Instructions - Mobile optimized - Hide if pre_bought */}
        {recipe.instructions && !(isMealPlannerContext && preparationMode === 'pre_bought') && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Instructions</h3>
            <div className="space-y-3 sm:space-y-4">
              {parseInstructions(recipe.instructions).map((step, index) => (
                <div
                  key={index}
                  className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all"
                >
                  {/* Step Number - Mobile optimized */}
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-xs sm:text-sm">
                      {index + 1}
                    </div>
                  </div>
                  {/* Step Content - Mobile optimized */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition (collapsible) */}
        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat) && (
          <div>
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showNutrition ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              Nutrition Information
            </button>
            {showNutrition && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {recipe.calories && (
                  <div>
                    <div className="text-xs text-gray-500">Calories</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.calories}</div>
                  </div>
                )}
                {recipe.protein !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Protein</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.protein}g</div>
                  </div>
                )}
                {recipe.carbs !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Carbs</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.carbs}g</div>
                  </div>
                )}
                {recipe.fat !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Fat</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.fat}g</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage Stats */}
        {usageStats && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {usageStats.popularity_score > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-orange-500" />
                  <div>
                    <div className="text-xs text-gray-500">Popularity</div>
                    <div className="font-semibold text-gray-900">
                      {Math.round(usageStats.popularity_score)}
                    </div>
                  </div>
                </div>
              )}
              {usageStats.times_viewed > 0 && (
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Views</div>
                    <div className="font-semibold text-gray-900">
                      {usageStats.times_viewed}
                    </div>
                  </div>
                </div>
              )}
              {usageStats.times_added_to_plan > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Added to Plan</div>
                  <div className="font-semibold text-gray-900">
                    {usageStats.times_added_to_plan}x
                  </div>
                </div>
              )}
              {usageStats.times_made > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Times Made</div>
                  <div className="font-semibold text-gray-900">
                    {usageStats.times_made}x
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {recipe.household_id && (
          <div className="pt-4 border-t border-gray-200">
            <RecipeFeedback
              recipe={recipe}
              householdId={recipe.household_id}
            />
          </div>
        )}

        {/* Source Info */}
        {recipe.source && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Source: {recipe.source.source_name || recipe.source_type}
              {recipe.source.source_url && (
                <a
                  href={recipe.source.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:text-orange-700 ml-1"
                >
                  (View original)
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom - Mobile optimized */}
        {spaceId && (
          <div className="pt-4 border-t border-gray-200">
            {/* Servings Reminder - Mobile optimized */}
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-800">
                <Users size={14} className="sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
                <span className="break-words">
                  This recipe makes <span className="font-semibold">{recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</span>
                </span>
              </div>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddToMealModal(true)}
                className="w-full sm:flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                <Calendar size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span>Add to Meal Plan</span>
              </button>
              <button
                onClick={() => setShowMealPrepModal(true)}
                className="w-full sm:flex-1 px-4 py-3 bg-white border-2 border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                <Package size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span>Meal Prep</span>
              </button>
            </div>
          </div>
        )}

        {/* Edit/Delete Actions */}
        {showActions && (isEditable && (onEdit || onDelete)) && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 border-2 border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                Edit Recipe
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 border-2 border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meal Prep Modal */}
      {spaceId && (
        <MealPrepModal
          isOpen={showMealPrepModal}
          onClose={() => setShowMealPrepModal(false)}
          spaceId={spaceId}
          recipe={recipe}
          meal={null}
        />
      )}

      {/* Add to Meal Modal */}
      {spaceId && (
        <AddRecipeToMealModal
          isOpen={showAddToMealModal}
          onClose={() => setShowAddToMealModal(false)}
          recipe={recipe}
          spaceId={spaceId}
          onSuccess={() => {
            // Close the modal
            setShowAddToMealModal(false);
            // Call callback to navigate back and refresh meal planner
            if (onMealAdded) {
              onMealAdded();
            }
          }}
        />
      )}
    </div>
  );
}
