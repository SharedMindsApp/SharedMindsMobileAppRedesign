/**
 * AddMealPanel - Inline panel for adding/replacing meals
 * 
 * ADHD-first design: calm, optional, no pressure
 * 
 * Note: Recipe cards navigate to full page (/recipes/:id), not a bottom sheet.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Sparkles, CheckCircle2, Package, X, Tag, ShoppingBag, Utensils, Search, Minus, Plus } from 'lucide-react';
import { getMealLibrary, getHouseholdFavourites, getCurrentUserFavourites, type MealLibraryItem, type MealCourseType } from '../../lib/mealPlanner';
import { compareRecipeAgainstPantry, type RecipePantryMatch } from '../../lib/foodIntelligence';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { RecipeSearchWithAI } from '../recipes/RecipeSearchWithAI';
import { listRecipes } from '../../lib/recipeGeneratorService';
import { getHouseholdIdFromSpaceId, generateRecipeVariations, type RecipeVariation } from '../../lib/recipeAIService';
import type { RecipeFilters } from '../../lib/recipeGeneratorTypes';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { getFoodProfile } from '../../lib/foodProfileService';
import type { UserFoodProfile } from '../../lib/foodProfileTypes';
import { getPreferredTags, batchUpsertTagPreferences, type TagPreferenceInput } from '../../lib/tagPreferencesService';
import { showToast } from '../Toast';

interface AddMealPanelProps {
  onSelectMeal: (meal: MealLibraryItem | null, customName?: string, recipeId?: string, servings?: number, courseType?: MealCourseType, preparationMode?: 'scratch' | 'pre_bought', pantryItemId?: string | null) => void;
  onSelectExternalMeal?: (params: {
    name: string;
    vendor?: string | null;
    type: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other';
    scheduledAt?: string | null;
    notes?: string | null;
    servings?: number;
    courseType?: MealCourseType;
  }) => void;
  spaceId: string;
  dayName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  replacingMealId?: string;
  onClose?: () => void; // Optional - for closing the panel if needed by parent
}

const MEAL_TYPE_ICONS = {
  breakfast: '🍳',
  lunch: '🥪',
  dinner: '🍲',
  snack: '🍪',
};

export function AddMealPanel({
  onSelectMeal,
  onSelectExternalMeal,
  spaceId,
  dayName,
  mealType,
  replacingMealId,
  onClose,
}: AddMealPanelProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'quick' | 'search' | 'favourites' | 'external'>('quick');
  const [searchQuery] = useState(''); // Kept for potential future use with RecipeSearchWithAI
  // External meal form state
  const [externalMealName, setExternalMealName] = useState('');
  const [externalVendor, setExternalVendor] = useState('');
  const [externalType, setExternalType] = useState<'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other'>('shop');
  const [externalNotes, setExternalNotes] = useState('');
  // Portion selector state (shared across all meal types)
  const [servings, setServings] = useState(1);
  // Course type selector state (shared across all meal types, sticky selection)
  const [courseType, setCourseType] = useState<MealCourseType>('main');
  // Preparation mode state (scratch vs pre_bought)
  const [preparationMode, setPreparationMode] = useState<'scratch' | 'pre_bought'>('scratch');
  // Pantry item state for pre_bought mode
  const [selectedPantryItemId, setSelectedPantryItemId] = useState<string | null>(null);
  const [recentMeals, setRecentMeals] = useState<(MealLibraryItem & { source?: 'meal_library' | 'recipe' })[]>([]);
  const [favourites, setFavourites] = useState<(MealLibraryItem & { source?: 'meal_library' | 'recipe' })[]>([]);
  const [favouriteMeals, setFavouriteMeals] = useState<(MealLibraryItem & { source?: 'meal_library' })[]>([]);
  const [favouriteRecipes, setFavouriteRecipes] = useState<(Recipe & { source?: 'recipe' })[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<(MealLibraryItem & { source?: 'recipe' })[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<RecipeVariation[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const [generatingVariationIndex, setGeneratingVariationIndex] = useState<number | null>(null);
  const [pantryMatches, setPantryMatches] = useState<Map<string, RecipePantryMatch>>(new Map());
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { recipeLocation, config } = useUIPreferences();
  const includeLocationInAI = config.includeLocationInAI !== false; // Default to true
  const [foodProfile, setFoodProfile] = useState<UserFoodProfile | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Cache for Perplexity API calls to prevent duplicate requests
  // Key: JSON string of search parameters (query, mealType, spaceId, foodProfile, recipeLocation)
  // Value: RecipeVariation[] results
  const variationsCacheRef = useRef<Map<string, RecipeVariation[]>>(new Map());
  const variationsLoadingRef = useRef<Set<string>>(new Set()); // Track in-flight requests

  // Get top 5 healthy/relevant tags for the meal type
  const getTopSuggestedTags = (): string[] => {
    const healthyTagsByMealType: Record<string, string[]> = {
      breakfast: ['healthy', 'high-protein', 'quick-meal', 'vegetarian', 'gluten-free'],
      lunch: ['healthy', 'light', 'quick-meal', 'vegetarian', 'salad'],
      dinner: ['healthy', 'high-protein', 'comfort-food', 'vegetarian', 'one-pot'],
      snack: ['healthy', 'quick-meal', 'no-cook', 'vegetarian', 'gluten-free'],
    };
    return healthyTagsByMealType[mealType] || ['healthy', 'quick-meal', 'vegetarian', 'gluten-free', 'high-protein'];
  };

  const topSuggestedTags = getTopSuggestedTags();

  // Handle tag selection - reload AI suggestions with new tags
  const handleTagToggle = async (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newSelectedTags);

    // Save preferences
    if (spaceId && newSelectedTags.length > 0) {
      try {
        const tagPreferences: TagPreferenceInput[] = newSelectedTags.map(t => ({
          tag: t,
          is_preferred: true,
        }));
        await batchUpsertTagPreferences(spaceId, tagPreferences);
      } catch (error) {
        console.error('[AddMealPanel] Failed to save tag preferences:', error);
      }
    }

    // Reload AI suggestions with new tags if we have any selected
    if (newSelectedTags.length > 0 && user && mealType !== 'snack') {
      // Clear cache for this meal type to force reload with new tags
      const cacheKeysToDelete: string[] = [];
      variationsCacheRef.current.forEach((_, key) => {
        const cacheData = JSON.parse(key);
        if (cacheData.mealType === mealType && cacheData.source === 'addMealPanel') {
          cacheKeysToDelete.push(key);
        }
      });
      cacheKeysToDelete.forEach(key => variationsCacheRef.current.delete(key));
      
      // Reload suggestions with new tags
      loadAISuggestions();
    } else if (newSelectedTags.length === 0) {
      // If no tags selected, reload without tags
      const cacheKeysToDelete: string[] = [];
      variationsCacheRef.current.forEach((_, key) => {
        const cacheData = JSON.parse(key);
        if (cacheData.mealType === mealType && cacheData.source === 'addMealPanel') {
          cacheKeysToDelete.push(key);
        }
      });
      cacheKeysToDelete.forEach(key => variationsCacheRef.current.delete(key));
      loadAISuggestions();
    }
  };

  useEffect(() => {
    if (spaceId) {
      loadFoodProfile();
      if (activeSection === 'quick') {
        loadQuickSuggestions();
      } else if (activeSection === 'favourites') {
        loadFavourites();
      }
    }
  }, [spaceId, mealType, activeSection, courseType]); // Reload when mealType, activeSection, or courseType changes

  // Load food profile for AI suggestions
  const loadFoodProfile = async () => {
    try {
      const profile = await getFoodProfile(spaceId);
      setFoodProfile(profile);
    } catch (error) {
      console.error('Failed to load food profile:', error);
      // Don't block if food profile fails to load
    }
  };

  // Search is now handled by RecipeSearchWithAI component

  const loadQuickSuggestions = async () => {
    setLoading(true);
    let filteredFavs: MealLibraryItem[] = [];
    let recent: MealLibraryItem[] = [];
    
    // Load favourites (non-blocking - continue even if it fails)
    try {
      const favs = await getHouseholdFavourites(spaceId);
      const favMeals = favs.map(f => f.meal).filter(Boolean) as MealLibraryItem[];
      // Mark favourites as meal_library source (they come from meal_library table)
      filteredFavs = favMeals
        .filter(m => {
          // For meal_library items, meal_type is a single value
          // For recipes, meal_type is now an array
          const mealTypes = Array.isArray(m.meal_type) ? m.meal_type : [m.meal_type];
          return mealTypes.includes(mealType) || mealType === 'snack';
        })
        .map(m => ({ ...m, source: 'meal_library' as const }));
      setFavourites(filteredFavs.slice(0, 6));
    } catch (err) {
      console.error('Failed to load favourites:', err);
      setFavourites([]);
    }

    // Load recent meals (non-blocking - continue even if it fails)
    try {
      const allMeals = await getMealLibrary({});
      // Mark recent meals as meal_library source (they come from meal_library table)
      recent = allMeals
        .filter(m => {
          // For meal_library items, meal_type is a single value
          // For recipes, meal_type is now an array
          const mealTypes = Array.isArray(m.meal_type) ? m.meal_type : [m.meal_type];
          return mealTypes.includes(mealType) || mealType === 'snack';
        })
        .map(m => ({ ...m, source: 'meal_library' as const }))
        .slice(0, 6);
      setRecentMeals(recent);
    } catch (err) {
      console.error('Failed to load recent meals:', err);
      setRecentMeals([]);
    }

    // Load recipes from new recipe system - THIS IS CRITICAL
    // Always load recipes to ensure we have at least 5 options
    // This runs independently of favourites/recent meals
    try {
      const householdId = await getHouseholdIdFromSpaceId(spaceId);
      const filters: RecipeFilters = {
        meal_type: mealType === 'snack' ? undefined : mealType,
        household_id: householdId,
        include_public: true,
        limit: 20, // Load more to ensure we have enough after filtering
      };
      
      const recipes = await listRecipes(filters);
      
      // Convert recipes to MealLibraryItem format
      // IMPORTANT: Mark these as 'recipe' source so they route to recipeId, not mealId
      // Note: recipe.meal_type is now an array, but MealLibraryItem expects a single value
      // We'll use the first meal_type for compatibility, or the one matching the current filter
      const recipeMeals: (MealLibraryItem & { source?: 'recipe' })[] = recipes.map(recipe => {
        // Get the primary meal_type (first in array, or one matching current filter)
        const primaryMealType = recipe.meal_type.includes(mealType) 
          ? mealType 
          : recipe.meal_type[0] || 'dinner';
        
        return {
        id: recipe.id,
        name: recipe.name,
        meal_type: primaryMealType, // Use single value for compatibility
        servings: recipe.servings,
        prep_time: recipe.prep_time || null,
        cook_time: recipe.cook_time || null,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine || null,
        categories: recipe.categories,
        image_url: recipe.image_url || null,
        ingredients: recipe.ingredients.map(ing => ({
          food_item_id: ing.food_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional || false,
        })),
        instructions: recipe.instructions || null,
        calories: recipe.calories || null,
        protein: recipe.protein || null,
        carbs: recipe.carbs || null,
        fat: recipe.fat || null,
        allergies: recipe.allergies || [],
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
        source: 'recipe' as const, // Discriminator: this is from recipes table, not meal_library
        };
      });

      // Filter out recipes that are already in favourites or recent meals
      const existingIds = new Set([
        ...filteredFavs.map(m => m.id),
        ...recent.map(m => m.id),
      ]);
      const uniqueRecipes = recipeMeals.filter(r => !existingIds.has(r.id));
      
      // Ensure we have at least 5 total suggestions
      // If no favourites/recent meals, show at least 5 recipes
      // Otherwise, fill up to 5 total
      const totalExisting = filteredFavs.length + recent.length;
      const needed = totalExisting === 0 ? 5 : Math.max(0, 5 - totalExisting);
      
      // Always show at least 5 recipes if we have no other suggestions
      const minRecipes = totalExisting === 0 ? 5 : Math.max(needed, 0);
      const recipesToShow = uniqueRecipes.slice(0, Math.max(minRecipes, uniqueRecipes.length > 0 ? 5 : 0));
      setRecipeSuggestions(recipesToShow);

      // If we still don't have enough suggestions, query Perplexity AI
      // Also check if courseType is set to something other than 'main' - in that case, 
      // prioritize AI suggestions since database doesn't have course_type filtering
      const totalSuggestions = filteredFavs.length + recent.length + recipesToShow.length;
      const shouldUseAI = totalSuggestions === 0 || (courseType && courseType !== 'main');
      
      if (shouldUseAI && user && mealType !== 'snack') {
        // No suggestions at all, or course type is specified (database can't filter by course_type)
        // Load AI suggestions which can respect course type
        loadAISuggestions();
      }
    } catch (err) {
      console.error('Failed to load recipe suggestions:', err);
      setRecipeSuggestions([]);
      
      // If loading failed and we have no suggestions, try AI
      const totalSuggestions = filteredFavs.length + recent.length;
      const shouldUseAI = totalSuggestions === 0 || (courseType && courseType !== 'main');
      
      if (shouldUseAI && user && mealType !== 'snack') {
        loadAISuggestions();
      }
    }

    // Load pantry intelligence for favourites (non-blocking)
    if (filteredFavs.length > 0) {
      try {
        const matches = new Map<string, RecipePantryMatch>();
        for (const meal of filteredFavs.slice(0, 6)) {
          try {
            const match = await compareRecipeAgainstPantry(meal, spaceId);
            if (match) {
              matches.set(meal.id, match);
            }
          } catch (e) {
            // Silent fail for individual matches
          }
        }
        setPantryMatches(matches);
      } catch (e) {
        // Silent fail for pantry intelligence
      }
    }
    
    setLoading(false);
  };

  // Load AI-generated suggestions from Perplexity
  const loadAISuggestions = async () => {
    if (!user || mealType === 'snack') return;

    // Get user's preferred tags for this meal type, plus any selected tags
    // Include courseType to guide AI suggestions
    let preferredTagsForMeal: string[] = [];
    try {
      if (spaceId) {
        const allPreferredTags = await getPreferredTags(spaceId);
        // Filter tags relevant to this meal type
        const mealTypeTagMap: Record<string, string[]> = {
          breakfast: ['breakfast', 'quick-meal', '15-min', '30-min', 'healthy', 'high-protein', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'comfort-food', 'light', 'kid-friendly', 'family-friendly', 'make-ahead', 'meal-prep'],
          lunch: ['lunch', 'quick-meal', '15-min', '30-min', 'healthy', 'light', 'salad', 'vegetarian', 'vegan', 'gluten-free', 'make-ahead', 'meal-prep', 'leftovers', 'one-pot', 'sandwich', 'wrap', 'bowl', 'kid-friendly', 'family-friendly'],
          dinner: ['dinner', 'comfort-food', 'hearty', 'family-dinner', 'date-night', 'romantic', 'one-pot', 'slow-cooker', 'instant-pot', 'make-ahead', 'meal-prep', 'vegetarian', 'vegan', 'gluten-free', 'high-protein', 'kid-friendly', 'family-friendly'],
        };
        const relevantTags = mealTypeTagMap[mealType] || [];
        preferredTagsForMeal = allPreferredTags.filter(tag => relevantTags.includes(tag));
      }
    } catch (error) {
      console.error('[AddMealPanel] Failed to load tag preferences:', error);
    }

    // Combine user preferences with selected tags (selected tags take priority)
    const tagsToUse = selectedTags.length > 0 ? selectedTags : preferredTagsForMeal;

    // Create a query for the meal type, incorporating course type if specified
    const mealTypeQueries: Record<string, string> = {
      breakfast: 'top breakfast recipes',
      lunch: 'top lunch recipes',
      dinner: 'top dinner recipes',
    };

    let baseQuery = mealTypeQueries[mealType] || `${mealType} recipes`;
    
    // If course type is specified and not 'main', modify the query to be more specific
    if (courseType && courseType !== 'main') {
      const courseTypeLabels: Record<string, string> = {
        starter: 'starter',
        side: 'side dish',
        main: 'main course',
        dessert: 'dessert',
        shared: 'shared dish',
        snack: 'snack',
      };
      const courseLabel = courseTypeLabels[courseType] || courseType;
      baseQuery = `top ${courseLabel} recipes for ${mealType}`;
    }
    
    // Create cache key from search parameters (include tags and courseType to cache different suggestions)
    const cacheKey = JSON.stringify({
      query: baseQuery,
      mealType,
      spaceId,
      foodProfileId: foodProfile?.id || null,
      recipeLocation,
      preferredTags: tagsToUse.sort().join(','), // Include tags in cache key
      courseType, // Include course type in cache key so different course types get different suggestions
      source: 'addMealPanel', // Mark as from AddMealPanel to distinguish from other sources
    });

    // Check if we have cached results
    if (variationsCacheRef.current.has(cacheKey)) {
      const cachedVariations = variationsCacheRef.current.get(cacheKey)!;
      setAiSuggestions(cachedVariations);
      console.log('[AddMealPanel] Using cached AI suggestions:', {
        mealType,
        count: cachedVariations.length,
      });
      return;
    }

    // Check if a request is already in flight for this key
    if (variationsLoadingRef.current.has(cacheKey)) {
      console.log('[AddMealPanel] Request already in flight for:', mealType);
      return;
    }

    setLoadingAiSuggestions(true);
    variationsLoadingRef.current.add(cacheKey);

    try {
      // Get recipe variations from Perplexity, including user's preferred tags and course type
      const variations = await generateRecipeVariations(
        baseQuery,
        mealType,
        undefined, // cuisine
        undefined, // dietary requirements
        user.id,
        spaceId,
        foodProfile, // Pass food profile to respect constraints
        includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
        tagsToUse, // Pass selected tags or user's preferred tags for this meal type
        includeLocationInAI, // Pass preference to control location in prompt
        courseType // Pass course type to filter AI suggestions (e.g., "dessert", "starter")
      );

      // Cache the results
      variationsCacheRef.current.set(cacheKey, variations);
      setAiSuggestions(variations);
      console.log('[AddMealPanel] Loaded and cached AI suggestions:', {
        mealType,
        count: variations.length,
      });
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
      setAiSuggestions([]);
    } finally {
      setLoadingAiSuggestions(false);
      variationsLoadingRef.current.delete(cacheKey);
    }
  };

  // Handle selecting an AI suggestion - generate the full recipe
  const handleSelectAISuggestion = async (variation: RecipeVariation, index: number) => {
    if (!user) return;

    setGeneratingVariationIndex(index);
    setLoading(true);
    try {
      // Import generateRecipeFromQuery
      const { generateRecipeFromQuery } = await import('../../lib/recipeAIService');
      
      const request = {
        query: variation.query,
        meal_type: mealType,
        food_profile: foodProfile, // Pass food profile
        location: includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
      };

      const generatedRecipe = await generateRecipeFromQuery(request, user.id, spaceId, undefined, includeLocationInAI);
      
      // Convert to MealLibraryItem and select it
      // AI-generated recipes are from recipes table, so mark as 'recipe' source
      // Get the primary meal_type (first in array, or one matching current filter)
      const primaryMealType = generatedRecipe.meal_type.includes(mealType) 
        ? mealType 
        : generatedRecipe.meal_type[0] || 'dinner';
      
      const mealItem: MealLibraryItem & { source?: 'recipe' } = {
        id: generatedRecipe.id,
        name: generatedRecipe.name,
        meal_type: primaryMealType, // Use single value for compatibility
        servings: generatedRecipe.servings,
        prep_time: generatedRecipe.prep_time || null,
        cook_time: generatedRecipe.cook_time || null,
        difficulty: generatedRecipe.difficulty,
        cuisine: generatedRecipe.cuisine || null,
        categories: generatedRecipe.categories,
        image_url: generatedRecipe.image_url || null,
        ingredients: generatedRecipe.ingredients.map(ing => ({
          food_item_id: ing.food_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional || false,
        })),
        instructions: generatedRecipe.instructions || null,
        calories: generatedRecipe.calories || null,
        protein: generatedRecipe.protein || null,
        carbs: generatedRecipe.carbs || null,
        fat: generatedRecipe.fat || null,
        allergies: generatedRecipe.allergies || [],
        created_at: generatedRecipe.created_at,
        updated_at: generatedRecipe.updated_at,
        source: 'recipe' as const, // AI-generated recipes are from recipes table
      };

      handleSelectMeal(mealItem);
    } catch (err) {
      console.error('Failed to generate recipe from AI suggestion:', err);
      // Show error but don't block UI
    } finally {
      setLoading(false);
      setGeneratingVariationIndex(null);
    }
  };

  // Load favorites filtered by meal type
  const loadFavourites = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profile) {
        setFavouriteMeals([]);
        setFavouriteRecipes([]);
        setLoading(false);
        return;
      }
      
      // Fetch current user's favorites (both meals and recipes)
      const favourites = await getCurrentUserFavourites(spaceId, profile.id);
      
      // Filter by meal type and separate meals from recipes
      const meals = favourites
        .filter(f => {
          if (!f.meal_id || !f.meal) return false;
          // For meal_library items, meal_type is a single value
          const mealTypes = Array.isArray(f.meal.meal_type) ? f.meal.meal_type : [f.meal.meal_type];
          return mealTypes.includes(mealType) || mealType === 'snack';
        })
        .map(f => ({ ...f.meal!, source: 'meal_library' as const }))
        .filter(Boolean) as (MealLibraryItem & { source?: 'meal_library' })[];
      
      // For recipes, filter by meal_type if available, or show all if snack
      const recipes = favourites
        .filter(f => f.recipe_id && f.recipe)
        .map(f => f.recipe!)
        .filter(recipe => {
          // recipe.meal_type is now an array
          if (mealType === 'snack') return true;
          return recipe.meal_type.includes(mealType) || recipe.meal_type.length === 0;
        })
        .map(r => ({ ...r, source: 'recipe' as const }))
        .filter(Boolean) as (Recipe & { source?: 'recipe' })[];
      
      setFavouriteMeals(meals);
      setFavouriteRecipes(recipes);
      
      // Also update pantry matches for favorites
      // Convert recipes to MealLibraryItem format for pantry comparison
      const allFavorites: MealLibraryItem[] = [
        ...meals,
        ...recipes.map(recipe => {
          // Get the primary meal_type (first in array, or one matching current filter)
          const primaryMealType = recipe.meal_type.includes(mealType) 
            ? mealType 
            : recipe.meal_type[0] || mealType;
          
          return {
          id: recipe.id,
          name: recipe.name,
          meal_type: primaryMealType, // Use single value for compatibility
          servings: recipe.servings || 4,
          prep_time: recipe.prep_time || null,
          cook_time: recipe.cook_time || null,
          difficulty: recipe.difficulty || 'medium',
          cuisine: recipe.cuisine || null,
          categories: recipe.categories || [],
          image_url: recipe.image_url || null,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || null,
          calories: recipe.calories || null,
          protein: recipe.protein || null,
          carbs: recipe.carbs || null,
          fat: recipe.fat || null,
          allergies: recipe.allergies || [],
          created_at: recipe.created_at || new Date().toISOString(),
          updated_at: recipe.updated_at || new Date().toISOString(),
          };
        })
      ];
      
      if (allFavorites.length > 0) {
        const matches = new Map<string, RecipePantryMatch>();
        for (const item of allFavorites) {
          try {
            const match = await compareRecipeAgainstPantry(item, spaceId);
            matches.set(item.id, match);
          } catch (err) {
            console.error(`Failed to compare ${item.id} against pantry:`, err);
          }
        }
        setPantryMatches(matches);
      }
    } catch (error) {
      console.error('Failed to load favourites:', error);
      setFavouriteMeals([]);
      setFavouriteRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Search is now handled by RecipeSearchWithAI component

  const handleSelectMeal = async (meal: MealLibraryItem & { source?: 'meal_library' | 'recipe' }) => {
    // Route by semantic type, not by id presence
    // meal_library items → mealId
    // recipes → recipeId
    // custom meals → customMealName
    const source = meal.source || 'meal_library'; // Default to meal_library for backward compatibility
    
    console.log('[handleSelectMeal]', {
      id: meal.id,
      name: meal.name,
      source,
      isRecipe: source === 'recipe',
      isMealLibrary: source === 'meal_library',
      servings,
      preparationMode,
      selectedPantryItemId,
    });

    // If pre_bought mode, ensure pantry item is selected or created
    if (preparationMode === 'pre_bought' && !selectedPantryItemId) {
      try {
        const { findPortionTrackedItems } = await import('../../lib/pantryPortionService');
        const { getOrCreateFoodItem } = await import('../../lib/foodItems');
        const { addPantryItem } = await import('../../lib/intelligentGrocery');
        
        // Get food item for the recipe/meal
        const foodItem = await getOrCreateFoodItem(meal.name);
        
        // Look for existing portion-tracked pantry items
        const existingItems = await findPortionTrackedItems(foodItem.id, spaceId);
        
        if (existingItems.length > 0) {
          // Use first available item
          setSelectedPantryItemId(existingItems[0].id);
          // Continue with selection using the found item
          if (source === 'recipe') {
            onSelectMeal(null, undefined, meal.id, servings, courseType, preparationMode, existingItems[0].id);
          } else {
            onSelectMeal(meal, undefined, undefined, servings, courseType, preparationMode, existingItems[0].id);
          }
          if (onClose) onClose();
          return;
        } else {
          // Auto-create a pantry item with default portions
          // Default: 6 portions, unit: "serving"
          const pantryItem = await addPantryItem({
            householdId: spaceId,
            foodItemId: foodItem.id,
            totalPortions: 6,
            portionUnit: 'serving',
            status: 'have',
          });
          
          setSelectedPantryItemId(pantryItem.id);
          
          // Continue with selection using the newly created item
          if (source === 'recipe') {
            onSelectMeal(null, undefined, meal.id, servings, courseType, preparationMode, pantryItem.id);
          } else {
            onSelectMeal(meal, undefined, undefined, servings, courseType, preparationMode, pantryItem.id);
          }
          if (onClose) onClose();
          showToast('success', `Created pantry item: ${meal.name} (6 servings)`);
          return;
        }
      } catch (error) {
        console.error('[handleSelectMeal] Error finding/creating pantry item:', error);
        showToast('error', 'Please add this item to your pantry first with portion tracking enabled');
        return;
      }
    }

    // Pass the source information to parent via the existing callback signature
    // Include servings, courseType, preparationMode, and pantryItemId
    if (source === 'recipe') {
      // Pass as recipeId parameter
      onSelectMeal(null, undefined, meal.id, servings, courseType, preparationMode, selectedPantryItemId);
    } else {
      // Pass as mealId (meal_library item)
      onSelectMeal(meal, undefined, undefined, servings, courseType, preparationMode, selectedPantryItemId);
    }
    
    if (onClose) onClose();
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    // Close the panel immediately, then navigate to full recipe page
    if (onClose) {
      onClose();
    }
    // Navigate immediately - parent component will detect route change and close panel
    navigate(`/recipes/${recipe.id}`);
  };

  const handleExternalMeal = () => {
    if (externalMealName.trim() && onSelectExternalMeal) {
      onSelectExternalMeal({
        name: externalMealName.trim(),
        vendor: externalVendor.trim() || null,
        type: externalType,
        notes: externalNotes.trim() || null,
        servings: servings, // Include portion count for external meals
        courseType: courseType, // Include course type for external meals
      });
      if (onClose) onClose();
    }
  };

  const getMealTypeColor = () => {
    const colors = {
      breakfast: 'bg-amber-50 border-amber-200 text-amber-700',
      lunch: 'bg-green-50 border-green-200 text-green-700',
      dinner: 'bg-purple-50 border-purple-200 text-purple-700',
      snack: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return colors[mealType];
  };

  const renderMealCard = (meal: MealLibraryItem & { source?: 'meal_library' | 'recipe' }, showPantryInfo = false) => {
    const pantryMatch = pantryMatches.get(meal.id);
    
    return (
      <button
        key={meal.id}
        onClick={() => handleSelectMeal(meal)}
        className="w-full text-left bg-white rounded-xl p-3 sm:p-4 border-2 border-gray-100 active:border-gray-300 active:scale-[0.98] transition-all touch-manipulation min-h-[80px] sm:min-h-0"
      >
        <div className="flex items-start gap-3">
          {meal.image_url ? (
            <img
              src={meal.image_url}
              alt={meal.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg ${getMealTypeColor()} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}>
              {MEAL_TYPE_ICONS[mealType]}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 line-clamp-2 sm:line-clamp-1">{meal.name}</h4>
            
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs text-gray-500 mb-2">
              {meal.prep_time ? (
                <div className="flex items-center gap-1" title="Preparation time">
                  <Clock size={12} />
                  <span>Prep: {meal.prep_time} min</span>
                </div>
              ) : null}
              {meal.cook_time ? (
                <div className="flex items-center gap-1" title="Cooking time">
                  <Clock size={12} />
                  <span>Cook: {meal.cook_time} min</span>
                </div>
              ) : null}
              {!meal.prep_time && !meal.cook_time && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={12} />
                  <span>Time not specified</span>
                </div>
              )}
            </div>

            {meal.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {meal.categories.slice(0, 2).map(cat => (
                  <span key={cat} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {showPantryInfo && pantryMatch && (
              <div className="flex items-center gap-1 text-xs mt-2">
                {pantryMatch.matchPercentage === 100 ? (
                  <>
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-green-600">Can make now</span>
                  </>
                ) : pantryMatch.missingCount > 0 ? (
                  <>
                    <Package size={12} className="text-gray-400" />
                    <span className="text-gray-500">Missing {pantryMatch.missingCount} ingredient{pantryMatch.missingCount !== 1 ? 's' : ''}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Recipe cards are now rendered by RecipeSearchWithAI component

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg h-full sm:max-h-none flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0 bg-white z-10">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {replacingMealId ? `Replace ${mealType}` : `Add ${mealType}`}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Content - Scrollable on mobile, with bottom padding for safe areas */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-safe"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', // Ensure content isn't cut off on mobile
        }}
      >
        {/* Course Type Selector - Show for all sections except external (external has its own) */}
        {activeSection !== 'external' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
            <label className="block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">
              Dish type
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'main' as MealCourseType, label: 'Main', icon: '🍲' },
                { value: 'starter' as MealCourseType, label: 'Starter', icon: '🥟' },
                { value: 'side' as MealCourseType, label: 'Side', icon: '🥗' },
                { value: 'shared' as MealCourseType, label: 'Shared', icon: '🍞' },
                { value: 'dessert' as MealCourseType, label: 'Dessert', icon: '🍰' },
                { value: 'snack' as MealCourseType, label: 'Snack', icon: '🍪' },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setCourseType(value)}
                  className={`flex-1 min-w-[80px] sm:min-w-[100px] px-3 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation ${
                    courseType === value
                      ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                      : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-blue-200'
                  }`}
                  aria-label={`Select ${label}`}
                >
                  <span className="text-lg sm:text-xl mr-1.5">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Portion Selector - Show for all sections except external (external has its own) */}
        {activeSection !== 'external' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
            <label className="block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">
              How many portions are you making?
            </label>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                aria-label="Decrease portions"
              >
                <Minus size={18} className="text-orange-600" />
              </button>
              <div className="flex-1 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-700">{servings}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {servings === 1 ? 'portion' : 'portions'}
                </div>
              </div>
              <button
                onClick={() => setServings(Math.min(12, servings + 1))}
                disabled={servings >= 12}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                aria-label="Increase portions"
              >
                <Plus size={18} className="text-orange-600" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              {servings === 1 
                ? "Making this just for yourself? Perfect! Ingredients will scale automatically."
                : `Cooking for ${servings}? Ingredients will scale automatically.`}
            </p>
          </div>
        )}

        {/* Preparation Mode Toggle - Show for recipes only (not external meals) */}
        {activeSection !== 'external' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <label className="block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">
              How are you having this?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPreparationMode('scratch');
                  setSelectedPantryItemId(null);
                }}
                className={`px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation min-h-[60px] flex flex-col items-center justify-center gap-1 ${
                  preparationMode === 'scratch'
                    ? 'bg-green-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 border-2 border-green-200'
                }`}
              >
                <span className="text-xl">👨‍🍳</span>
                <span>Making from scratch</span>
              </button>
              <button
                onClick={() => setPreparationMode('pre_bought')}
                className={`px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation min-h-[60px] flex flex-col items-center justify-center gap-1 ${
                  preparationMode === 'pre_bought'
                    ? 'bg-green-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-green-50 border-2 border-green-200'
                }`}
              >
                <span className="text-xl">🛒</span>
                <span>Pre-bought / ready-made</span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              {preparationMode === 'scratch'
                ? "We'll check ingredients from your pantry."
                : "We'll track portions from your pantry item."}
            </p>
          </div>
        )}

        {/* Section Tabs - Horizontally scrollable on mobile */}
        <div className="mb-4 sm:mb-6">
          <div 
            className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 sm:pb-0"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
            }}
          >
            <div 
              className="flex gap-2 sm:gap-3 min-w-max sm:min-w-0 border-b border-gray-200"
              style={{
                scrollbarWidth: 'none', // Firefox
              }}
            >
              <button
                onClick={() => setActiveSection('quick')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors border-b-2 min-w-[60px] sm:min-w-0 touch-manipulation ${
                  activeSection === 'quick'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 active:text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Sparkles size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Quick</span>
              </button>
              <button
                onClick={() => setActiveSection('search')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors border-b-2 min-w-[60px] sm:min-w-0 touch-manipulation ${
                  activeSection === 'search'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 active:text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Search size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Search</span>
              </button>
              <button
                onClick={() => setActiveSection('favourites')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors border-b-2 min-w-[60px] sm:min-w-0 touch-manipulation ${
                  activeSection === 'favourites'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 active:text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Heart size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Favourites</span>
              </button>
              <button
                onClick={() => setActiveSection('external')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium transition-colors border-b-2 min-w-[60px] sm:min-w-0 touch-manipulation ${
                  activeSection === 'external'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 active:text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                <ShoppingBag size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Bought</span>
              </button>
            </div>
          </div>
          {/* Hide scrollbar for webkit browsers */}
          <style>{`
            div[style*="overflow-x-auto"]::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>

        {/* Quick Suggestions */}
        {activeSection === 'quick' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Top 5 Suggested Tags Section - Always show for Quick tab */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-orange-600 flex-shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Refine your search</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Select tags to find more personalized {mealType} suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {topSuggestedTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 sm:px-4 py-2 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation active:scale-[0.98] min-h-[36px] sm:min-h-0 ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white border border-orange-200 text-gray-700 active:border-orange-300 active:bg-orange-50'
                      }`}
                    >
                      {tag.replace(/-/g, ' ')}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTags([]);
                      // Reload without tags
                      const cacheKeysToDelete: string[] = [];
                      variationsCacheRef.current.forEach((_, key) => {
                        const cacheData = JSON.parse(key);
                        if (cacheData.mealType === mealType && cacheData.source === 'addMealPanel') {
                          cacheKeysToDelete.push(key);
                        }
                      });
                      cacheKeysToDelete.forEach(key => variationsCacheRef.current.delete(key));
                      loadAISuggestions();
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-500 active:text-gray-700 border border-gray-200 active:border-gray-300 bg-white touch-manipulation active:scale-[0.98] min-h-[36px] sm:min-h-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-orange-600 mt-2">
                  ✓ {selectedTags.length} filter{selectedTags.length !== 1 ? 's' : ''} active
                </p>
              )}
            </div>

            {/* Favourites */}
            {favourites.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-red-500 flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Favourites</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {favourites.map(meal => renderMealCard(meal, true))}
                </div>
              </div>
            )}

            {/* Recent */}
            {recentMeals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-gray-500 flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Recent</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {recentMeals.map(meal => renderMealCard(meal))}
                </div>
              </div>
            )}

            {/* Pantry Suggestions */}
            {Array.from(pantryMatches.values()).filter(m => m.matchPercentage === 100).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-orange-500 flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">What you can make</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {favourites
                    .filter(meal => pantryMatches.get(meal.id)?.matchPercentage === 100)
                    .map(meal => renderMealCard(meal, true))}
                </div>
              </div>
            )}

            {/* Recipe Suggestions - Show if we need more options */}
            {recipeSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-orange-500 flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Suggestions</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {recipeSuggestions.map(meal => renderMealCard(meal))}
                </div>
              </div>
            )}

            {/* AI-Generated Suggestions - Show when no other suggestions */}
            {aiSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-orange-500" />
                  <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
                </div>
                <div className="space-y-2">
                  {aiSuggestions.map((variation, index) => {
                    const isGeneratingThis = generatingVariationIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAISuggestion(variation, index)}
                        disabled={loading}
                        className="w-full text-left bg-white rounded-xl p-3 sm:p-4 border-2 border-orange-200 active:border-orange-300 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed relative min-h-[80px] sm:min-h-0"
                      >
                        {isGeneratingThis && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg ${getMealTypeColor()} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}>
                            {MEAL_TYPE_ICONS[mealType]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 line-clamp-2">{variation.name}</h4>
                            {variation.description && (
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{variation.description}</p>
                            )}
                            {isGeneratingThis && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-orange-600">
                                <Sparkles size={12} className="animate-pulse" />
                                <span>Generating recipe...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {favourites.length === 0 && 
             recentMeals.length === 0 && 
             recipeSuggestions.length === 0 && 
             aiSuggestions.length === 0 && 
             !loading && 
             !loadingAiSuggestions && (
              <div className="text-center py-8 sm:py-12 px-4 text-gray-500">
                <p className="text-sm sm:text-base">No suggestions yet</p>
                <p className="text-xs sm:text-sm mt-1">Try searching or adding a simple meal</p>
              </div>
            )}

            {loadingAiSuggestions && (
              <div className="text-center py-8 sm:py-12">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Sparkles size={16} className="animate-pulse text-orange-500" />
                  <p className="text-sm sm:text-base">Finding great {mealType} ideas...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search - Using RecipeSearchWithAI for Library integration */}
        {activeSection === 'search' && (
          <div className="space-y-4 sm:space-y-6">
            <RecipeSearchWithAI
              spaceId={spaceId}
              onSelectRecipe={handleSelectRecipe}
              initialQuery={searchQuery}
              mealType={mealType}
            />
          </div>
        )}

        {/* External Meal (Bought/Restaurant) */}
        {activeSection === 'external' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-800">
                Add meals you're buying or eating out. No cooking required!
              </p>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Meal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={externalMealName}
                onChange={(e) => setExternalMealName(e.target.value)}
                placeholder="e.g., Chicken Caesar Sandwich, Pad Thai, Meal Deal"
                className="w-full px-4 py-3.5 sm:py-3 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent touch-manipulation"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && externalMealName.trim()) {
                    handleExternalMeal();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Source Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {(['shop', 'restaurant', 'cafe', 'takeaway', 'other'] as const).map((type) => {
                  const icons = {
                    shop: <ShoppingBag size={18} className="sm:w-4 sm:h-4" />,
                    restaurant: <Utensils size={18} className="sm:w-4 sm:h-4" />,
                    cafe: <Package size={18} className="sm:w-4 sm:h-4" />,
                    takeaway: <Package size={18} className="sm:w-4 sm:h-4" />,
                    other: <Package size={18} className="sm:w-4 sm:h-4" />,
                  };
                  const labels = {
                    shop: 'Shop',
                    restaurant: 'Restaurant',
                    cafe: 'Café',
                    takeaway: 'Takeaway',
                    other: 'Other',
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExternalType(type)}
                      className={`px-3 sm:px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation active:scale-[0.98] min-h-[44px] sm:min-h-0 ${
                        externalType === type
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white border border-gray-300 text-gray-700 active:border-orange-300 active:bg-orange-50'
                      }`}
                    >
                      {icons[type]}
                      <span>{labels[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Vendor (Optional)
              </label>
              <input
                type="text"
                value={externalVendor}
                onChange={(e) => setExternalVendor(e.target.value)}
                placeholder="e.g., Tesco, Nando's, Local Cafe"
                className="w-full px-4 py-3.5 sm:py-3 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent touch-manipulation"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={externalNotes}
                onChange={(e) => setExternalNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-4 py-3.5 sm:py-3 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none touch-manipulation"
              />
            </div>

            {/* Course Type Selector for External Meals */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
              <label className="block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">
                Dish type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'main' as MealCourseType, label: 'Main', icon: '🍲' },
                  { value: 'starter' as MealCourseType, label: 'Starter', icon: '🥟' },
                  { value: 'side' as MealCourseType, label: 'Side', icon: '🥗' },
                  { value: 'shared' as MealCourseType, label: 'Shared', icon: '🍞' },
                  { value: 'dessert' as MealCourseType, label: 'Dessert', icon: '🍰' },
                  { value: 'snack' as MealCourseType, label: 'Snack', icon: '🍪' },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setCourseType(value)}
                    className={`flex-1 min-w-[80px] sm:min-w-[100px] px-3 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all touch-manipulation ${
                      courseType === value
                        ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                        : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-blue-200'
                    }`}
                    aria-label={`Select ${label}`}
                  >
                    <span className="text-lg sm:text-xl mr-1.5">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Portion Selector for External Meals */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
              <label className="block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">
                How many portions?
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  aria-label="Decrease portions"
                >
                  <Minus size={18} className="text-orange-600" />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-orange-700">{servings}</div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    {servings === 1 ? 'portion' : 'portions'}
                  </div>
                </div>
                <button
                  onClick={() => setServings(Math.min(12, servings + 1))}
                  disabled={servings >= 12}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  aria-label="Increase portions"
                >
                  <Plus size={18} className="text-orange-600" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {servings === 1 
                  ? "Just one? Perfect!"
                  : `Getting ${servings}? Great!`}
              </p>
            </div>

            <button
              onClick={handleExternalMeal}
              disabled={!externalMealName.trim() || !onSelectExternalMeal}
              className="w-full px-4 py-3.5 sm:py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors touch-manipulation min-h-[44px] text-base sm:text-sm"
            >
              Add to {dayName}
            </button>
            <p className="text-xs sm:text-sm text-gray-500 text-center">
              Perfect for meal deals, takeaways, and restaurant meals.
            </p>
          </div>
        )}

        {/* Favourites */}
        {activeSection === 'favourites' && (
          <div className="space-y-4 sm:space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm sm:text-base text-gray-500">Loading favourites...</div>
              </div>
            ) : favouriteMeals.length === 0 && favouriteRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Heart size={48} className="text-gray-300 mb-4" />
                <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">No favourites yet</h3>
                <p className="text-sm sm:text-base text-gray-500">
                  Add meals or recipes to your favourites from the Library or Recipes tab
                </p>
              </div>
            ) : (
              <>
                {/* Meal Favourites */}
                {favouriteMeals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={16} className="text-red-500 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">Meal Favourites</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {favouriteMeals.map(meal => renderMealCard(meal, true))}
                    </div>
                  </div>
                )}

                {/* Recipe Favourites */}
                {favouriteRecipes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={16} className="text-red-500 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">Recipe Favourites</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {favouriteRecipes.map(recipe => {
                        // Convert recipe to MealLibraryItem format for renderMealCard
                        // Get the primary meal_type (first in array, or one matching current filter)
                        const primaryMealType = recipe.meal_type.includes(mealType) 
                          ? mealType 
                          : recipe.meal_type[0] || mealType;
                        
                        const mealItem: MealLibraryItem & { source?: 'recipe' } = {
                          id: recipe.id,
                          name: recipe.name,
                          meal_type: primaryMealType, // Use single value for compatibility
                          servings: recipe.servings || 4,
                          prep_time: recipe.prep_time || null,
                          cook_time: recipe.cook_time || null,
                          difficulty: recipe.difficulty || 'medium',
                          cuisine: recipe.cuisine || null,
                          categories: recipe.categories || [],
                          image_url: recipe.image_url || null,
                          ingredients: recipe.ingredients || [],
                          instructions: recipe.instructions || null,
                          calories: recipe.calories || null,
                          protein: recipe.protein || null,
                          carbs: recipe.carbs || null,
                          fat: recipe.fat || null,
                          allergies: recipe.allergies || [],
                          created_at: recipe.created_at || new Date().toISOString(),
                          updated_at: recipe.updated_at || new Date().toISOString(),
                          source: 'recipe' as const,
                        };
                        return renderMealCard(mealItem, true);
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Backward compatibility export (deprecated - use AddMealPanel)
export const AddMealBottomSheet = AddMealPanel;
