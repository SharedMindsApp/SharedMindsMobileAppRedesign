/**
 * RecipeSearchWithAI - Enhanced recipe search with AI generation
 * 
 * Features:
 * - Search existing recipes with fuzzy matching
 * - Filter by tags (occasions, themes)
 * - Generate new recipes if not found
 * - Preview and review before saving
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Sparkles, X, Tag, Filter, ChevronDown, Clock, Users } from 'lucide-react';
import { RecipeList } from './RecipeList';
import { RecipePreviewModal } from './RecipePreviewModal';
import { RecipeDetail } from './RecipeDetail';
import { BottomSheet } from '../shared/BottomSheet';
import { searchRecipesFuzzy, listRecipes, type RecipeFilters } from '../../lib/recipeGeneratorService';
import { generateRecipeFromQuery, generateRecipeVariations, getHouseholdIdFromSpaceId, type RecipeGenerationRequest, type RecipeVariation } from '../../lib/recipeAIService';
import type { Recipe, MealType, CuisineType, CookingDifficulty } from '../../lib/recipeGeneratorTypes';
import { useAuth } from '../../contexts/AuthContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { getFoodProfile } from '../../lib/foodProfileService';
import type { UserFoodProfile } from '../../lib/foodProfileTypes';
import { getTagPreferences, toggleTagPreference, type UserTagPreference } from '../../lib/tagPreferencesService';
import { getUserPantryIngredients, getPantryItems, type PantryItem } from '../../lib/intelligentGrocery';
import { searchRecipesByIngredients, getPantryIngredientIds, type IngredientSearchResult } from '../../lib/recipeIngredientSearchService';
import { searchFoodItems, getRecentlyUsedFoodItems, type FoodItem } from '../../lib/foodItems';
import { getActiveUserProfileId } from '../../lib/profiles/getActiveUserProfile';
import { Package, X as XIcon } from 'lucide-react';

// Comprehensive tag list organized by category
const ALL_RECIPE_TAGS = [
  // Dietary & Lifestyle
  'vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'paleo',
  'low-carb', 'high-protein', 'low-fat', 'sugar-free', 'nut-free',
  'soy-free', 'egg-free', 'pescatarian', 'whole30',
  
  // Time & Convenience
  'quick-meal', '15-min', '30-min', 'one-pot', 'one-pan', 'sheet-pan',
  'slow-cooker', 'instant-pot', 'air-fryer', 'no-cook', 'make-ahead',
  'meal-prep', 'batch-cooking', 'freezer-friendly', 'leftovers',
  
  // Occasions & Events
  'holiday', 'birthday', 'anniversary', 'date-night', 'family-dinner',
  'party', 'picnic', 'brunch', 'special-occasion', 'weekend', 'weeknight',
  'valentines', 'christmas', 'thanksgiving', 'halloween', 'easter',
  'independence-day', 'new-year', 'mothers-day', 'fathers-day',
  
  // Seasons
  'summer', 'winter', 'spring', 'fall',
  
  // Cuisines
  'italian', 'mexican', 'asian', 'chinese', 'japanese', 'thai', 'indian',
  'mediterranean', 'french', 'greek', 'korean', 'american', 'british',
  'spanish', 'middle-eastern', 'latin-american',
  
  // Meal Types & Styles
  'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer',
  'side-dish', 'main-course', 'salad', 'soup', 'stew', 'casserole',
  'pasta', 'pizza', 'sandwich', 'wrap', 'bowl', 'skewer',
  
  // Characteristics
  'comfort-food', 'healthy', 'light', 'hearty', 'spicy', 'mild',
  'sweet', 'savory', 'creamy', 'crispy', 'grilled', 'roasted',
  'baked', 'fried', 'steamed', 'raw', 'fresh', 'warm', 'cold',
  
  // Audience
  'kid-friendly', 'family-friendly', 'adult-only', 'crowd-pleaser',
  'romantic', 'casual', 'elegant', 'budget-friendly', 'gourmet',
  
  // Special Diets
  'diabetic-friendly', 'heart-healthy', 'anti-inflammatory', 'gut-healthy',
  'energy-boosting', 'immune-boosting', 'detox', 'clean-eating',
];

// Function to get rotated top 10 tags (only changes on page load/refresh)
// This function reads the current rotation index but does NOT increment it
// The rotation index is only incremented once per page load in the component
function getTopTags(tagList: string[], count: number = 10, rotationIndex: number = 0): string[] {
  // Rotate by shifting the array
  const rotated = [...tagList];
  for (let i = 0; i < rotationIndex; i++) {
    rotated.push(rotated.shift()!);
  }
  
  return rotated.slice(0, count);
}

interface RecipeSearchWithAIProps {
  spaceId?: string; // Space ID (personal/household/team)
  onSelectRecipe?: (recipe: Recipe) => void;
  initialQuery?: string;
  mealType?: MealType;
}

export function RecipeSearchWithAI({
  spaceId,
  onSelectRecipe,
  initialQuery = '',
  mealType,
}: RecipeSearchWithAIProps) {
  const { user } = useAuth();
  const { recipeLocation, config } = useUIPreferences();
  const includeLocationInAI = config.includeLocationInAI !== false; // Default to true
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateOption, setShowGenerateOption] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeVariations, setRecipeVariations] = useState<RecipeVariation[]>([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<RecipeVariation | null>(null);
  const [showAllTagsBottomSheet, setShowAllTagsBottomSheet] = useState(false);
  const [foodProfile, setFoodProfile] = useState<UserFoodProfile | null>(null);
  const [aiFallbackSuggestions, setAiFallbackSuggestions] = useState<RecipeVariation[]>([]);
  const [isLoadingAiFallback, setIsLoadingAiFallback] = useState(false);
  const [hasCheckedInitialLoad, setHasCheckedInitialLoad] = useState(false);
  const [tagPreferences, setTagPreferences] = useState<Map<string, UserTagPreference>>(new Map());
  const [preferredTags, setPreferredTags] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Ingredient-based search state
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [pantryIngredientIds, setPantryIngredientIds] = useState<Set<string>>(new Set());
  const [ingredientSearchResults, setIngredientSearchResults] = useState<IngredientSearchResult[]>([]);
  const [ingredientSearchMode, setIngredientSearchMode] = useState(false);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [ingredientSearchSuggestions, setIngredientSearchSuggestions] = useState<FoodItem[]>([]);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [showPantryBrowser, setShowPantryBrowser] = useState(false);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loadingPantryItems, setLoadingPantryItems] = useState(false);
  
  // Cache for Perplexity API calls to prevent duplicate requests
  // Key: JSON string of search parameters (query, mealType, spaceId, foodProfile, recipeLocation)
  // Value: RecipeVariation[] results
  const variationsCacheRef = useRef<Map<string, RecipeVariation[]>>(new Map());
  const variationsLoadingRef = useRef<Set<string>>(new Set()); // Track in-flight requests
  
  // Load food profile when spaceId changes
  useEffect(() => {
    if (spaceId) {
      getFoodProfile(spaceId)
        .then(profile => setFoodProfile(profile))
        .catch(err => {
          console.error('Failed to load food profile:', err);
          // Don't block if food profile fails to load
        });
    } else {
      setFoodProfile(null);
    }
  }, [spaceId]);

  // Load tag preferences when spaceId changes
  useEffect(() => {
    if (spaceId) {
      loadTagPreferences();
    } else {
      setTagPreferences(new Map());
      setPreferredTags(new Set());
    }
  }, [spaceId]);

  // Load pantry ingredients when spaceId changes
  useEffect(() => {
    if (spaceId) {
      loadPantryIngredients();
    } else {
      setPantryIngredients([]);
      setPantryIngredientIds(new Set());
    }
  }, [spaceId]);

  const loadPantryIngredients = async () => {
    if (!spaceId) return;
    
    try {
      const [ingredientNames, ingredientIds] = await Promise.all([
        getUserPantryIngredients(spaceId),
        getPantryIngredientIds(spaceId),
      ]);
      
      setPantryIngredients(ingredientNames);
      setPantryIngredientIds(ingredientIds);
    } catch (error) {
      console.error('[RecipeSearchWithAI] Failed to load pantry ingredients:', error);
      setPantryIngredients([]);
      setPantryIngredientIds(new Set());
    }
  };

  const loadPantryItems = async () => {
    if (!spaceId) return;
    
    try {
      setLoadingPantryItems(true);
      const householdId = await getHouseholdIdFromSpaceId(spaceId);
      if (householdId) {
        const items = await getPantryItems(householdId);
        setPantryItems(items);
      }
    } catch (error) {
      console.error('[RecipeSearchWithAI] Failed to load pantry items:', error);
      setPantryItems([]);
    } finally {
      setLoadingPantryItems(false);
    }
  };

  const handleSelectPantryItem = (pantryItem: PantryItem) => {
    if (selectedIngredients.length >= 5) return;
    
    const itemName = pantryItem.food_item?.name || pantryItem.item_name;
    if (!itemName) return;
    
    // Check if already selected
    if (selectedIngredients.some(ing => 
      ing.toLowerCase().trim() === itemName.toLowerCase().trim()
    )) {
      return;
    }
    
    setSelectedIngredients(prev => [...prev, itemName]);
  };

  // Search for ingredient suggestions
  const searchIngredientSuggestions = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setIngredientSearchSuggestions([]);
      return;
    }

    try {
      // Search food items
      const foodItems = await searchFoodItems(query.trim(), 10);
      
      // Filter out already selected ingredients
      const filtered = foodItems.filter(item => 
        !selectedIngredients.some(sel => 
          sel.toLowerCase().trim() === item.name.toLowerCase().trim()
        )
      );
      
      setIngredientSearchSuggestions(filtered);
    } catch (error) {
      console.error('[RecipeSearchWithAI] Error searching ingredient suggestions:', error);
      setIngredientSearchSuggestions([]);
    }
  };

  // Generate recipe with selected ingredients via AI
  const handleGenerateWithIngredients = async () => {
    if (selectedIngredients.length < 2 || !user || !hasPerplexityKey) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Build query from ingredients
      const ingredientQuery = selectedIngredients.join(', ');
      const fullQuery = `recipe using ${ingredientQuery}`;

      // Combine ingredients and tags for the prompt
      // Pass ingredients first (for ingredient constraints), then tags (for preferences)
      const allTags = [...selectedTags];
      
      // Add meal type as a tag if not already present
      if (mealType && !allTags.includes(mealType)) {
        allTags.push(mealType);
      }

      // Pass ingredients first, then tags
      // The prompt service will detect ingredients from query keywords and use first items as ingredients
      // Remaining items will be used as preference tags
      const request: RecipeGenerationRequest = {
        query: fullQuery,
        meal_type: mealType,
        selected_tags: [...selectedIngredients, ...allTags], // Ingredients first, then tags
        servings: 4,
      };

      console.log('[RecipeSearchWithAI] Generating recipe with:', {
        ingredients: selectedIngredients,
        tags: selectedTags,
        mealType,
        allSelectedTags: request.selected_tags,
      });

      // Generate recipe with ingredient constraints and tags
      const generatedRecipe = await generateRecipeFromQuery(
        request,
        user.id,
        spaceId,
        undefined,
        includeLocationInAI
      );

      setGeneratedRecipe(generatedRecipe);
      setShowPreview(true);
      
      // After generation, re-run ingredient search to include the new recipe
      // This keeps UI consistent - the new recipe will appear in search results
      setTimeout(() => {
        performIngredientSearch();
      }, 1000);
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error generating recipe with ingredients:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recipe');
    } finally {
      setIsGenerating(false);
    }
  };

  // Cleanup long press timers on unmount
  useEffect(() => {
    return () => {
      // Clean up any active timers on unmount
      longPressTimerRef.current.forEach(timer => clearTimeout(timer));
      longPressTimerRef.current.clear();
    };
  }, []); // Only run on mount/unmount

  const loadTagPreferences = async () => {
    if (!spaceId) return;
    
    try {
      const preferences = await getTagPreferences(spaceId);
      const prefMap = new Map<string, UserTagPreference>();
      const preferredSet = new Set<string>();
      
      preferences.forEach(pref => {
        prefMap.set(pref.tag, pref);
        if (pref.is_preferred) {
          preferredSet.add(pref.tag);
        }
      });
      
      setTagPreferences(prefMap);
      setPreferredTags(preferredSet);
    } catch (err) {
      console.error('Failed to load tag preferences:', err);
      // Don't block if tag preferences fail to load
    }
  };
  
  // Get rotation index from sessionStorage (only changes on page load/refresh)
  // Initialize rotation index once per page load and increment for next page load
  const rotationIndex = useMemo(() => {
    const storageKey = 'recipe_tags_rotation_index';
    const storedIndex = sessionStorage.getItem(storageKey);
    const currentIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
    
    // Increment rotation for next page load/refresh (wrap around)
    const nextIndex = (currentIndex + 10) % ALL_RECIPE_TAGS.length;
    sessionStorage.setItem(storageKey, nextIndex.toString());
    
    // Return current index for this page load
    return currentIndex;
  }, []); // Empty deps - only runs once per component mount
  
  // Get top 10 tags (stable during session, only changes on page refresh)
  const topTags = useMemo(() => getTopTags(ALL_RECIPE_TAGS, 10, rotationIndex), [rotationIndex]);
  const displayedTags = topTags; // Always show top 10 tags in the main view

  // Check if Perplexity is available
  // NOTE: Perplexity uses server-side proxy, so we don't need client-side API key
  // The server proxy handles authentication. We just need to check if routing is configured.
  // This flag is kept for backward compatibility but should not block server-proxy calls.
  const hasPerplexityKey = (() => {
    // Perplexity uses server proxy, so client-side key is optional
    // The server proxy has its own API key configuration
    // We'll assume Perplexity is available if routing is configured (checked at call time)
    return true; // Always allow - server proxy will handle authentication
  })();

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Track if user has actively searched (to determine when to show "No recipes found")
  const [hasSearched, setHasSearched] = useState(false);

  // Load AI fallback suggestions when no database recipes are found
  const loadAiFallbackSuggestions = useCallback(async () => {
    if (!user || !mealType || mealType === 'snack' || !hasPerplexityKey || isLoadingAiFallback) {
      return;
    }

    // Create a generic query for the meal type
    const mealTypeQueries: Record<string, string> = {
      breakfast: 'top breakfast recipes',
      lunch: 'top lunch recipes',
      dinner: 'top dinner recipes',
    };

    const baseQuery = mealTypeQueries[mealType] || `${mealType} recipes`;
    
    // Create cache key from search parameters
    const cacheKey = JSON.stringify({
      query: baseQuery,
      mealType,
      spaceId,
      foodProfileId: foodProfile?.id || null,
      recipeLocation,
      fallback: true, // Mark as fallback to distinguish from regular searches
    });

    // Check if we have cached results
    if (variationsCacheRef.current.has(cacheKey)) {
      const cachedVariations = variationsCacheRef.current.get(cacheKey)!;
      setAiFallbackSuggestions(cachedVariations);
      console.log('[RecipeSearchWithAI] Using cached AI fallback suggestions:', {
        mealType,
        count: cachedVariations.length,
      });
      return;
    }

    // Check if a request is already in flight for this key
    if (variationsLoadingRef.current.has(cacheKey)) {
      console.log('[RecipeSearchWithAI] Request already in flight for fallback:', mealType);
      return;
    }

    setIsLoadingAiFallback(true);
    variationsLoadingRef.current.add(cacheKey);

    try {
      // Get recipe variations from Perplexity
      const variations = await generateRecipeVariations(
        baseQuery,
        mealType,
        undefined, // cuisine
        undefined, // dietary requirements
        user.id,
        spaceId,
        foodProfile, // Pass food profile to respect constraints
        includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
        undefined, // selectedTags
        includeLocationInAI // Pass preference to control location in prompt
      );

      // Cache the results
      variationsCacheRef.current.set(cacheKey, variations);
      setAiFallbackSuggestions(variations);
      console.log('[RecipeSearchWithAI] Loaded and cached AI fallback suggestions:', {
        mealType,
        count: variations.length,
      });
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error loading AI fallback suggestions:', err);
      setAiFallbackSuggestions([]);
    } finally {
      setIsLoadingAiFallback(false);
      variationsLoadingRef.current.delete(cacheKey);
    }
  }, [user, mealType, hasPerplexityKey, spaceId, foodProfile, recipeLocation, isLoadingAiFallback]);

  // Check initial load and load AI fallback if needed
  useEffect(() => {
    if (!hasCheckedInitialLoad && !debouncedSearchQuery.trim() && mealType && mealType !== 'snack' && spaceId) {
      // Check if we have any recipes for this meal type
      const checkInitialRecipes = async () => {
        try {
          // Load recipes to check if we have any
          const householdId = await getHouseholdIdFromSpaceId(spaceId);
          const filters: RecipeFilters = {
            meal_type: mealType,
            household_id: householdId,
            include_public: true,
            limit: 1, // Just check if any exist
          };

          const results = await listRecipes(filters);
          
          // If no recipes found, load AI fallback suggestions
          if (results.length === 0 && user && hasPerplexityKey) {
            await loadAiFallbackSuggestions();
          }
        } catch (err) {
          console.error('[RecipeSearchWithAI] Error checking initial load:', err);
        } finally {
          setHasCheckedInitialLoad(true);
        }
      };

      // Small delay to let RecipeList start loading
      const checkTimer = setTimeout(checkInitialRecipes, 500);
      return () => clearTimeout(checkTimer);
    }
  }, [hasCheckedInitialLoad, debouncedSearchQuery, mealType, spaceId, user, hasPerplexityKey, loadAiFallbackSuggestions]);

  // Manual search trigger - no automatic search
  // Users will click the search button to trigger searches
  const handleManualSearch = async () => {
    // If ingredients are selected, use ingredient search
    if (selectedIngredients.length >= 2) {
      setIngredientSearchMode(true);
      setHasSearched(true);
      await performIngredientSearch();
      return;
    }

    // Otherwise, use text search if there's a query
    if (debouncedSearchQuery.trim().length >= 2) {
      setIngredientSearchMode(false);
      setIngredientSearchResults([]);
      setHasSearched(true);
      await performSearch();
    }
  };

  // Check if search can be triggered
  const canSearch = selectedIngredients.length >= 2 || debouncedSearchQuery.trim().length >= 2;

  // Clear search results when inputs are cleared (but don't auto-search)
  useEffect(() => {
    // If ingredients are cleared, exit ingredient search mode
    if (selectedIngredients.length === 0) {
      setIngredientSearchMode(false);
      setIngredientSearchResults([]);
    }

    // If search query is cleared and we had searched, reset
    if (debouncedSearchQuery.trim().length === 0 && hasSearched && selectedIngredients.length === 0) {
      setHasSearched(false);
      setRecipes([]);
      setShowGenerateOption(false);
    }
  }, [debouncedSearchQuery, selectedIngredients, hasSearched]);

  // Perform ingredient-based search
  const performIngredientSearch = async () => {
    if (selectedIngredients.length < 2) {
      setIngredientSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileId = spaceId ? await getActiveUserProfileId() : undefined;
      const householdId = await getHouseholdIdFromSpaceId(spaceId);

      const results = await searchRecipesByIngredients({
        ingredients: selectedIngredients,
        spaceId,
        profileId,
        householdId,
        limit: 20,
        pantryIngredientIds,
      });

      console.log('[RecipeSearchWithAI] Ingredient search results:', {
        ingredientCount: selectedIngredients.length,
        resultCount: results.length,
        ingredients: selectedIngredients,
      });

      setIngredientSearchResults(results);
      
      // Convert to Recipe[] format for display
      const recipeResults = results.map(r => r.recipe);
      setRecipes(recipeResults);

      // Automatically trigger AI generation if no results found
      if (results.length === 0 && hasPerplexityKey && user) {
        console.log('[RecipeSearchWithAI] No results found, automatically generating with AI...');
        await handleGenerateWithIngredients();
      } else if (results.length < 5 && hasPerplexityKey) {
        // Show option to generate more if we have some results but not many
        setShowGenerateOption(true);
      } else {
        setShowGenerateOption(false);
      }
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error in ingredient search:', err);
      setError(err instanceof Error ? err.message : 'Failed to search by ingredients');
      setIngredientSearchResults([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!debouncedSearchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Convert spaceId to household_id (spaceId is spaces.id, household_id references households.id)
      const householdId = await getHouseholdIdFromSpaceId(spaceId);
      
      const filters: RecipeFilters = {
        meal_type: mealType,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        household_id: householdId, // null for personal spaces, household_id for household spaces, undefined if no space
        include_public: true,
        limit: 50, // Show more recipes by default in Library view
      };

      // Use fuzzy search for better matching (tolerant of misspellings)
      const results = await searchRecipesFuzzy(debouncedSearchQuery, filters, 0.3);

      if (results.length > 0) {
        console.log('[RecipeSearch] Found', results.length, 'recipes for:', debouncedSearchQuery);
      }

      setRecipes(results);
      // Show generate option if no results found and user has searched
      const shouldShowGenerate = results.length === 0 && debouncedSearchQuery.trim().length > 0;
      setShowGenerateOption(shouldShowGenerate);
      
      // If no results and we have a search query, try to generate variations
      if (shouldShowGenerate && debouncedSearchQuery.trim().length >= 2 && hasPerplexityKey) {
        loadRecipeVariations();
      } else {
        setRecipeVariations([]);
        setSelectedVariation(null);
      }
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error searching recipes:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        searchQuery: debouncedSearchQuery,
        spaceId,
        mealType,
        selectedTags,
      });
      setError(err instanceof Error ? err.message : 'Failed to search recipes');
      setRecipes([]);
      setShowGenerateOption(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAllRecipes = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert spaceId to household_id (spaceId is spaces.id, household_id references households.id)
      const householdId = await getHouseholdIdFromSpaceId(spaceId);
      
      const filters: RecipeFilters = {
        meal_type: mealType,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        household_id: householdId, // null for personal spaces, household_id for household spaces, undefined if no space
        include_public: true,
        limit: 50, // Show more recipes by default in Library view
      };

      const results = await listRecipes(filters);
      
      setRecipes(results);
      setShowGenerateOption(false);
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error loading recipes:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        spaceId,
        mealType,
        selectedTags,
      });
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeVariations = async () => {
    if (!debouncedSearchQuery.trim() || !hasPerplexityKey) return;

    // Create cache key from search parameters
    const cacheKey = JSON.stringify({
      query: debouncedSearchQuery.trim(),
      mealType,
      spaceId,
      foodProfileId: foodProfile?.id || null,
      recipeLocation,
    });

    // Check if we have cached results
    if (variationsCacheRef.current.has(cacheKey)) {
      const cachedVariations = variationsCacheRef.current.get(cacheKey)!;
      setRecipeVariations(cachedVariations);
      console.log('[RecipeSearchWithAI] Using cached recipe variations:', {
        query: debouncedSearchQuery,
        count: cachedVariations.length,
      });
      return;
    }

    // Check if a request is already in flight for this key
    if (variationsLoadingRef.current.has(cacheKey)) {
      console.log('[RecipeSearchWithAI] Request already in flight for:', debouncedSearchQuery);
      return;
    }

    setIsLoadingVariations(true);
    variationsLoadingRef.current.add(cacheKey);

    try {
      const variations = await generateRecipeVariations(
        debouncedSearchQuery,
        mealType,
        undefined, // cuisine
        undefined, // dietary requirements
        user?.id,
        spaceId,
        foodProfile, // Pass food profile
        includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
        selectedTags.length > 0 ? selectedTags : undefined, // Pass selected tags
        includeLocationInAI // Pass preference to control location in prompt
      );
      
      // Cache the results
      variationsCacheRef.current.set(cacheKey, variations);
      setRecipeVariations(variations);
      console.log('[RecipeSearchWithAI] Loaded and cached recipe variations:', {
        query: debouncedSearchQuery,
        count: variations.length,
      });
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error loading variations:', err);
      // Don't show error to user, just use fallback variations
      setRecipeVariations([]);
    } finally {
      setIsLoadingVariations(false);
      variationsLoadingRef.current.delete(cacheKey);
    }
  };

  const handleGenerateRecipe = async (variation?: RecipeVariation) => {
    if (!user) return;

    const queryToUse = variation?.query || debouncedSearchQuery;
    if (!queryToUse.trim()) return;

    setIsGenerating(true);
    setError(null);
    setSelectedVariation(variation || null);
    
    try {
      const request: RecipeGenerationRequest = {
        query: queryToUse,
        meal_type: mealType,
        selected_tags: selectedTags.length > 0 ? selectedTags : undefined, // Pass selected tags to ensure they're assigned to generated recipes
        food_profile: foodProfile, // Pass food profile to respect constraints
        location: includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
      };

      const generated = await generateRecipeFromQuery(request, user.id, spaceId, undefined, includeLocationInAI);
      setGeneratedRecipe(generated);
      // Show inline instead of modal
      setShowPreview(false);
      
      // Add to recipes list so it shows inline
      setRecipes(prev => {
        // Check if recipe already exists in list
        const exists = prev.some(r => r.id === generated.id);
        if (exists) {
          return prev.map(r => r.id === generated.id ? generated : r);
        }
        return [generated, ...prev];
      });
      setShowGenerateOption(false);
      
      // Scroll to the generated recipe
      setTimeout(() => {
        const element = document.querySelector(`[data-generated-recipe-id="${generated.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } catch (err) {
      console.error('Error generating recipe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recipe';
      
      // Provide user-friendly error message for missing API key
      if (errorMessage.includes('Perplexity API key not found')) {
        setError(
          'AI recipe generation is not configured. Please contact your administrator to set up the Perplexity API key.'
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !debouncedSearchQuery.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const request: RecipeGenerationRequest = {
        query: debouncedSearchQuery,
        meal_type: mealType,
        selected_tags: selectedTags.length > 0 ? selectedTags : undefined, // Pass selected tags to ensure they're assigned to generated recipes
        food_profile: foodProfile, // Pass food profile to respect constraints
        location: includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
      };

      const generated = await generateRecipeFromQuery(request, user.id, spaceId, undefined, includeLocationInAI);
      setGeneratedRecipe(generated);
    } catch (err) {
      console.error('Error regenerating recipe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate recipe';
      
      // Provide user-friendly error message for missing API key
      if (errorMessage.includes('Perplexity API key not found')) {
        setError(
          'AI recipe generation is not configured. Please contact your administrator to set up the Perplexity API key.'
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    // Recipe is already saved during generation, but we can trigger a refresh
    setRecipes(prev => {
      // Check if recipe already exists in list
      const exists = prev.some(r => r.id === recipe.id);
      if (exists) {
        return prev.map(r => r.id === recipe.id ? recipe : r);
      }
      return [recipe, ...prev];
    });
    setShowGenerateOption(false);
    setShowPreview(false);
    setGeneratedRecipe(null);

    if (onSelectRecipe) {
      onSelectRecipe(recipe);
    }
  };

  // Handle long press on mobile to toggle preference
  const handleTagLongPress = (tag: string) => {
    if (!spaceId) return;

    const timer = setTimeout(async () => {
      try {
        await toggleTagPreference(spaceId, tag);
        await loadTagPreferences(); // Reload preferences
      } catch (err) {
        console.error('Failed to toggle tag preference:', err);
      } finally {
        // Clean up timer reference
        longPressTimerRef.current.delete(tag);
      }
    }, 500); // 500ms long press

    longPressTimerRef.current.set(tag, timer);
  };

  const handleTagPressEnd = (tag: string) => {
    const timer = longPressTimerRef.current.get(tag);
    if (timer) {
      clearTimeout(timer);
      longPressTimerRef.current.delete(tag);
    }
  };

  const toggleTag = async (tag: string) => {
    // If tag is already selected, remove it
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
      return;
    }

    // Add tag to selected tags
    setSelectedTags(prev => [...prev, tag]);

    // Normalize tag for search (replace hyphens with spaces, convert to lowercase)
    const normalizedTag = tag.replace(/-/g, ' ').toLowerCase();
    
    // Set search query to the tag
    setSearchQuery(normalizedTag);
    
    // Trigger search with the tag
    setLoading(true);
    setError(null);
    
    try {
      // Convert spaceId to household_id
      const householdId = await getHouseholdIdFromSpaceId(spaceId);
      
      const filters: RecipeFilters = {
        meal_type: mealType,
        tags: [tag], // Use original tag format for database search
        household_id: householdId,
        include_public: true,
        limit: 50,
      };

      console.log('[RecipeSearchWithAI] Searching recipes by tag:', {
        tag,
        normalizedTag,
        filters,
      });

      // First, search for recipes with this exact tag in dietary_tags
      const tagFilteredResults = await listRecipes({
        ...filters,
        tags: [tag], // Use original tag format (e.g., 'quick-meal')
      });

      console.log('[RecipeSearchWithAI] Tag-filtered results:', {
        tag,
        count: tagFilteredResults.length,
        recipeNames: tagFilteredResults.map(r => r.name),
      });

      // If we found recipes with the tag, use those
      if (tagFilteredResults.length > 0) {
        setRecipes(tagFilteredResults);
        setShowGenerateOption(false);
        setRecipeVariations([]);
        return;
      }

      // If no exact tag matches, try fuzzy search on recipe names/descriptions
      const fuzzyResults = await searchRecipesFuzzy(normalizedTag, filters, 0.3);

      setRecipes(fuzzyResults);

      // If still no results found, show generate option and try to get variations
      if (fuzzyResults.length === 0) {
        setShowGenerateOption(true);
        
        // Try to generate recipe variations for this tag
        if (hasPerplexityKey && user) {
          // Create cache key from search parameters
          const cacheKey = JSON.stringify({
            query: normalizedTag,
            mealType,
            spaceId,
            foodProfileId: foodProfile?.id || null,
            recipeLocation,
          });

          // Check if we have cached results
          if (variationsCacheRef.current.has(cacheKey)) {
            const cachedVariations = variationsCacheRef.current.get(cacheKey)!;
            setRecipeVariations(cachedVariations);
            console.log('[RecipeSearchWithAI] Using cached variations for tag:', {
              tag,
              count: cachedVariations.length,
            });
            return;
          }

          // Check if a request is already in flight for this key
          if (variationsLoadingRef.current.has(cacheKey)) {
            console.log('[RecipeSearchWithAI] Request already in flight for tag:', tag);
            return;
          }

          try {
            setIsLoadingVariations(true);
            variationsLoadingRef.current.add(cacheKey);
            
            const variations = await generateRecipeVariations(
              normalizedTag,
              mealType,
              undefined,
              undefined,
              user.id,
              spaceId,
              foodProfile, // Pass food profile
              includeLocationInAI ? recipeLocation : null, // Only pass location if enabled
              undefined, // selectedTags
              includeLocationInAI // Pass preference to control location in prompt
            );
            
            // Cache the results
            variationsCacheRef.current.set(cacheKey, variations);
            setRecipeVariations(variations);
            console.log('[RecipeSearchWithAI] Loaded and cached variations for tag:', {
              tag,
              count: variations.length,
            });
          } catch (err) {
            console.error('[RecipeSearchWithAI] Error generating variations for tag:', err);
            // Don't show error to user, just use fallback
            setRecipeVariations([]);
          } finally {
            setIsLoadingVariations(false);
            variationsLoadingRef.current.delete(cacheKey);
          }
        }
      } else {
        setShowGenerateOption(false);
        setRecipeVariations([]);
      }
    } catch (err) {
      console.error('[RecipeSearchWithAI] Error searching by tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to search recipes');
      setRecipes([]);
      setShowGenerateOption(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="space-y-3">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSearch) {
                  e.preventDefault();
                  handleManualSearch();
                }
              }}
              placeholder="Search recipes or describe what you want to make..."
              className="w-full pl-11 pr-11 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base bg-white shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <X size={18} className="text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={handleManualSearch}
            disabled={!canSearch || loading}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            aria-label="Search recipes"
          >
            <Search size={18} />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Ingredient Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Package size={16} className="text-orange-500" />
              Search by Ingredients
            </label>
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => {
                  setSelectedIngredients([]);
                  setIngredientSearchMode(false);
                  setIngredientSearchResults([]);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Selected Ingredients */}
          {selectedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient, index) => {
                const isFromPantry = pantryIngredients.some(p => 
                  p.toLowerCase().includes(ingredient.toLowerCase()) || 
                  ingredient.toLowerCase().includes(p.toLowerCase())
                );
                
                return (
                  <div
                    key={`${ingredient}-${index}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                      isFromPantry
                        ? 'bg-green-100 border-2 border-green-500 text-green-700'
                        : 'bg-orange-100 border border-orange-300 text-orange-700'
                    }`}
                  >
                    {isFromPantry && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    )}
                    <span>{ingredient}</span>
                    <button
                      onClick={() => {
                        setSelectedIngredients(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${ingredient}`}
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ingredient Input */}
          {selectedIngredients.length < 5 && (
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={ingredientSearchQuery}
                  onChange={(e) => {
                    setIngredientSearchQuery(e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      searchIngredientSuggestions(e.target.value);
                    } else {
                      setIngredientSearchSuggestions([]);
                    }
                  }}
                  onFocus={() => {
                    if (ingredientSearchQuery.trim().length >= 2) {
                      searchIngredientSuggestions(ingredientSearchQuery);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && ingredientSearchQuery.trim().length >= 2) {
                      e.preventDefault();
                      // Try to add the first suggestion, or add the typed text
                      if (ingredientSearchSuggestions.length > 0) {
                        const firstSuggestion = ingredientSearchSuggestions[0];
                        if (!selectedIngredients.some(ing => 
                          ing.toLowerCase().trim() === firstSuggestion.name.toLowerCase().trim()
                        )) {
                          if (selectedIngredients.length < 5) {
                            setSelectedIngredients(prev => [...prev, firstSuggestion.name]);
                            setIngredientSearchQuery('');
                            setIngredientSearchSuggestions([]);
                          }
                        }
                      } else if (ingredientSearchQuery.trim() && selectedIngredients.length < 5) {
                        // Add the typed text directly if no suggestions
                        if (!selectedIngredients.some(ing => 
                          ing.toLowerCase().trim() === ingredientSearchQuery.trim().toLowerCase()
                        )) {
                          setSelectedIngredients(prev => [...prev, ingredientSearchQuery.trim()]);
                          setIngredientSearchQuery('');
                        }
                      }
                    }
                  }}
                  placeholder={selectedIngredients.length === 0 
                    ? "Add ingredients (e.g., chicken, garlic, onion)..."
                    : `Add more ingredients (${5 - selectedIngredients.length} remaining)...`
                  }
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                  disabled={selectedIngredients.length >= 5}
                />
                {ingredientSearchQuery && (
                  <button
                    onClick={() => {
                      setIngredientSearchQuery('');
                      setIngredientSearchSuggestions([]);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <XIcon size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
              
              {/* From Pantry Button */}
              <button
                onClick={async () => {
                  setShowPantryBrowser(true);
                  if (pantryItems.length === 0 && spaceId) {
                    await loadPantryItems();
                  }
                }}
                className="px-4 py-2 bg-green-50 hover:bg-green-100 active:bg-green-200 border border-green-300 text-green-700 font-medium rounded-lg transition-colors touch-manipulation flex items-center gap-2 whitespace-nowrap"
                title="Add ingredients from your pantry"
              >
                <Package size={16} />
                <span className="hidden sm:inline">From Pantry</span>
              </button>
              
              {/* Ingredient Suggestions Dropdown */}
              {ingredientSearchSuggestions.length > 0 && selectedIngredients.length < 5 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {ingredientSearchSuggestions.map((item) => {
                    const normalizedName = item.name.toLowerCase().trim();
                    const isSelected = selectedIngredients.some(ing => 
                      ing.toLowerCase().trim() === normalizedName
                    );
                    const isFromPantry = pantryIngredients.some(p => 
                      p.toLowerCase().trim() === normalizedName
                    );
                    
                    if (isSelected) return null;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (selectedIngredients.length < 5) {
                            setSelectedIngredients(prev => [...prev, item.name]);
                            setIngredientSearchQuery('');
                            setIngredientSearchSuggestions([]);
                          }
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {item.emoji && <span>{item.emoji}</span>}
                          <span>{item.name}</span>
                        </span>
                        {isFromPantry && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Package size={12} />
                            In pantry
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pantry Ingredients Quick Add */}
          {pantryIngredients.length > 0 && selectedIngredients.length < 5 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="font-semibold">From your pantry:</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pantryIngredients
                  .filter(ing => !selectedIngredients.some(sel => 
                    sel.toLowerCase().trim() === ing.toLowerCase().trim()
                  ))
                  .slice(0, 10) // Show top 10 pantry ingredients
                  .map((ingredient, index) => (
                    <button
                      key={`pantry-${ingredient}-${index}`}
                      onClick={() => {
                        if (selectedIngredients.length < 5) {
                          setSelectedIngredients(prev => [...prev, ingredient]);
                        }
                      }}
                      disabled={selectedIngredients.length >= 5}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <span className="w-1 h-1 rounded-full bg-green-500"></span>
                      {ingredient}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selectedIngredients.length >= 5 && (
            <p className="text-xs text-gray-500 text-center">
              Maximum 5 ingredients selected. Remove one to add another.
            </p>
          )}
        </div>

        {/* Tag Filters */}
        {ALL_RECIPE_TAGS.length > 0 && (
          <div className="space-y-3">
            {/* Preferred Tags Section */}
            {preferredTags.size > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Your Preferences</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(preferredTags).map(tag => (
                    <button
                      key={`pref-${tag}`}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      onTouchStart={() => handleTagLongPress(tag)}
                      onTouchEnd={() => handleTagPressEnd(tag)}
                      onMouseDown={() => handleTagLongPress(tag)}
                      onMouseUp={() => handleTagPressEnd(tag)}
                      onMouseLeave={() => handleTagPressEnd(tag)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all relative touch-manipulation ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-green-100 border-2 border-green-500 text-green-700 hover:bg-green-200 active:bg-green-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        {tag.replace(/-/g, ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Tags Section */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {displayedTags.map(tag => {
                  const isPreferred = preferredTags.has(tag);
                  const isSelected = selectedTags.includes(tag);
                  
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      onTouchStart={() => handleTagLongPress(tag)}
                      onTouchEnd={() => handleTagPressEnd(tag)}
                      onMouseDown={() => handleTagLongPress(tag)}
                      onMouseUp={() => handleTagPressEnd(tag)}
                      onMouseLeave={() => handleTagPressEnd(tag)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all relative touch-manipulation ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-sm'
                          : isPreferred
                          ? 'bg-green-50 border-2 border-green-400 text-green-700 hover:bg-green-100 active:bg-green-200'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isPreferred && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-white"></span>
                      )}
                      {tag.replace(/-/g, ' ')}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white touch-manipulation"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {/* Show All Tags Button */}
              <button
                onClick={() => setShowAllTagsBottomSheet(true)}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors touch-manipulation"
              >
                <ChevronDown size={16} />
                Show all tags
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Recipe Option with Variations */}
      {showGenerateOption && !loading && (
        <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="text-orange-600" size={20} />
              <h3 className="font-semibold text-gray-900">Recipe not found</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't find "{debouncedSearchQuery}" in your library.
            </p>
            {error && error.includes('API key') ? (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">AI Generation Not Available</p>
                <p className="text-xs text-yellow-700">
                  Perplexity is configured server-side. If AI recipe generation is not working, please check that the Perplexity proxy Edge Function is deployed and PERPLEXITY_API_KEY is set in Supabase environment variables.
                </p>
              </div>
            ) : null}
          </div>

          {/* Recipe Variations */}
          {isLoadingVariations ? (
            <div className="text-center py-8">
              <div className="inline-flex flex-col items-center gap-3 text-gray-600">
                <div className="relative">
                  <Sparkles className="text-orange-500 animate-pulse" size={32} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Finding recipe variations...</p>
                  <p className="text-xs text-gray-500 mt-1">Searching for the best options</p>
                </div>
              </div>
            </div>
          ) : recipeVariations.length > 0 ? (
            <div className="space-y-3 mb-4">
              <p className="text-sm font-medium text-gray-700 text-center mb-3">
                Choose a variation to generate:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recipeVariations.map((variation, index) => {
                  const isGeneratingThis = isGenerating && selectedVariation?.query === variation.query;
                  return (
                    <button
                      key={index}
                      onClick={() => handleGenerateRecipe(variation)}
                      disabled={isGenerating}
                      className={`p-4 text-left rounded-lg border-2 transition-all relative ${
                        selectedVariation?.query === variation.query
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isGeneratingThis && (
                        <div className="absolute top-2 right-2">
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <div className="font-semibold text-gray-900 mb-1">{variation.name}</div>
                      {variation.description && (
                        <div className="text-xs text-gray-600">{variation.description}</div>
                      )}
                      {isGeneratingThis && (
                        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                          <Sparkles size={12} className="animate-pulse" />
                          <span>Generating recipe...</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : hasPerplexityKey ? (
            <div className="text-center">
              {isGenerating ? (
                <div className="inline-flex flex-col items-center gap-3 py-4">
                  <div className="relative">
                    <Sparkles className="text-orange-500 animate-pulse" size={32} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">Generating recipe...</p>
                    <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateRecipe()}
                  disabled={error && error.includes('API key')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  <Sparkles size={16} />
                  Generate with AI
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium mb-1">Unable to generate recipe</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-3 text-gray-600">
            <div className="relative">
              <Search className="text-orange-500 animate-pulse" size={32} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Searching recipes...</p>
              <p className="text-xs text-gray-500 mt-1">Looking through your library</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Fallback Suggestions - Show when no database recipes found */}
      {!showGenerateOption && 
       !loading && 
       !hasSearched && 
       !debouncedSearchQuery.trim() && 
       aiFallbackSuggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            <span className="text-xs text-gray-500">(No recipes in database yet)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiFallbackSuggestions.map((variation, index) => (
              <button
                key={index}
                onClick={() => handleGenerateRecipe(variation)}
                disabled={isGenerating}
                className="p-4 text-left rounded-lg border-2 border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-gray-900 mb-1">{variation.name}</div>
                {variation.description && (
                  <div className="text-xs text-gray-600 line-clamp-2">{variation.description}</div>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                  <Sparkles size={12} />
                  <span>Generate recipe</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading AI Fallback */}
      {!showGenerateOption && 
       !loading && 
       !hasSearched && 
       !debouncedSearchQuery.trim() && 
       isLoadingAiFallback && (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-3 text-gray-600">
            <div className="relative">
              <Sparkles className="text-orange-500 animate-pulse" size={40} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Finding great {mealType} ideas...</p>
              <p className="text-xs text-gray-500 mt-1">Using AI to discover perfect recipes for you</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Recipe Inline Display */}
      {generatedRecipe && !showPreview && (
        <div className="space-y-4" data-generated-recipe-id={generatedRecipe.id}>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-green-600" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-900">Recipe Generated Successfully!</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Your recipe has been generated and saved. Review it below.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGeneratedRecipe(null);
                  setShowPreview(false);
                }}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Show generated recipe as full card */}
          <div className="bg-white border-2 border-orange-200 rounded-xl overflow-hidden shadow-lg">
            <RecipeDetail
              recipe={generatedRecipe}
              onClose={() => {
                setGeneratedRecipe(null);
                setShowPreview(false);
              }}
              showActions={true}
              isEditable={false}
              spaceId={spaceId}
            />
          </div>
          
          {/* Action buttons for selecting the recipe */}
          {onSelectRecipe && (
            <div className="flex items-center justify-center gap-3 pb-4">
              <button
                onClick={() => {
                  if (onSelectRecipe) {
                    onSelectRecipe(generatedRecipe);
                  }
                  setGeneratedRecipe(null);
                  setShowPreview(false);
                }}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
              >
                Select This Recipe
              </button>
              <button
                onClick={() => {
                  setGeneratedRecipe(null);
                  setShowPreview(false);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Searching
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recipe List or Empty State */}
      {!showGenerateOption && !generatedRecipe && (
        <>
          {/* Show ingredient search results with match info */}
          {ingredientSearchMode && ingredientSearchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Found {ingredientSearchResults.length} recipe{ingredientSearchResults.length !== 1 ? 's' : ''} with your ingredients
                </h3>
                {(ingredientSearchResults.length === 0 || ingredientSearchResults.length < 5) && hasPerplexityKey && (
                  <button
                    onClick={handleGenerateWithIngredients}
                    disabled={isGenerating}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    {isGenerating ? 'Generating...' : 'Generate more with AI'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ingredientSearchResults.map((result) => (
                  <div
                    key={result.recipe.id}
                    onClick={() => onSelectRecipe?.(result.recipe)}
                    className="bg-white rounded-xl border-2 border-gray-100 hover:border-orange-300 p-4 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 line-clamp-2">{result.recipe.name}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      {result.recipe.prep_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {result.recipe.prep_time} min
                        </span>
                      )}
                      {result.recipe.servings && (
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {result.recipe.servings}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                        Uses {result.matchedIngredientCount} of {result.totalIngredients} ingredients
                      </span>
                      {result.pantryMatchCount > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                          <Package size={10} />
                          {result.pantryMatchCount} from pantry
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : ingredientSearchMode && ingredientSearchResults.length === 0 && !loading ? (
            <div className="text-center py-16 text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2 text-gray-700">No recipes found with these ingredients</p>
              <p className="text-sm text-gray-500 mb-4">
                Try different ingredients or generate a new recipe
              </p>
              {hasPerplexityKey && (
                <button
                  onClick={handleGenerateWithIngredients}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  {isGenerating ? 'Generating...' : 'Generate Recipe with AI'}
                </button>
              )}
            </div>
          ) : !loading && hasSearched && debouncedSearchQuery.trim().length > 0 && recipes.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2 text-gray-700">No recipes found</p>
              <p className="text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <RecipeList
              onSelectRecipe={onSelectRecipe}
              spaceId={spaceId}
              filters={{
                search_query: debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery : undefined,
                meal_type: mealType,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                // CRITICAL FIX: Do NOT pass spaceId as household_id
                // RecipeList will convert spaceId prop to household_id internally
                // This ensures consistency with loadAllRecipes and performSearch
                include_public: true,
              }}
              showFilters={false}
              showSearch={false}
              limit={50}
            />
          )}
        </>
      )}

      {/* Recipe Preview Modal (fallback - only shown if showPreview is true) */}
      {generatedRecipe && showPreview && (
        <RecipePreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setGeneratedRecipe(null);
          }}
          recipe={generatedRecipe}
          onSave={handleSaveRecipe}
          onRegenerate={handleRegenerate}
          isGenerating={isGenerating}
        />
      )}

      {/* All Tags Bottom Sheet */}
      <BottomSheet
        isOpen={showAllTagsBottomSheet}
        onClose={() => setShowAllTagsBottomSheet(false)}
        title="All Tags"
        maxHeight="85vh"
      >
        <div className="p-4 pb-6">
          <p className="text-xs text-gray-500 mb-3">
            Tap to search • Hold to mark as preferred
          </p>
          <div className="flex flex-wrap gap-2 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            {ALL_RECIPE_TAGS.map((tag) => {
              const isPreferred = preferredTags.has(tag);
              const isSelected = selectedTags.includes(tag);
              
              return (
                <button
                  key={tag}
                  onClick={() => {
                    toggleTag(tag);
                  }}
                  onTouchStart={() => handleTagLongPress(tag)}
                  onTouchEnd={() => handleTagPressEnd(tag)}
                  onMouseDown={() => handleTagLongPress(tag)}
                  onMouseUp={() => handleTagPressEnd(tag)}
                  onMouseLeave={() => handleTagPressEnd(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all relative touch-manipulation ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : isPreferred
                      ? 'bg-green-50 border-2 border-green-400 text-green-700 hover:bg-green-100 active:bg-green-200'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100'
                  }`}
                >
                  {isPreferred && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-white"></span>
                  )}
                  {tag.replace(/-/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Pantry Browser Bottom Sheet */}
      <BottomSheet
        isOpen={showPantryBrowser}
        onClose={() => setShowPantryBrowser(false)}
        title="Select from Pantry"
        maxHeight="85vh"
      >
        <div className="px-4 pb-4">
          {loadingPantryItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Package size={32} className="mx-auto mb-2 text-gray-400 animate-pulse" />
                <p className="text-sm text-gray-500">Loading pantry items...</p>
              </div>
            </div>
          ) : pantryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mb-2">Your pantry is empty</p>
              <p className="text-xs text-gray-500">Add items to your pantry to search by ingredients</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                Select ingredients from your pantry to add to your search ({selectedIngredients.length}/5 selected)
              </p>
              <div className="max-h-[60vh] overflow-y-auto space-y-1">
                {pantryItems
                  .filter(item => {
                    const itemName = item.food_item?.name || item.item_name;
                    if (!itemName) return false;
                    // Filter out already selected ingredients
                    return !selectedIngredients.some(ing => 
                      ing.toLowerCase().trim() === itemName.toLowerCase().trim()
                    );
                  })
                  .map((item) => {
                    const itemName = item.food_item?.name || item.item_name || 'Unknown';
                    const isSelected = selectedIngredients.some(ing => 
                      ing.toLowerCase().trim() === itemName.toLowerCase().trim()
                    );
                    const canSelect = selectedIngredients.length < 5 && !isSelected;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => canSelect && handleSelectPantryItem(item)}
                        disabled={!canSelect}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all touch-manipulation ${
                          canSelect
                            ? 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 active:bg-green-200'
                            : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package size={18} className="text-green-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900">{itemName}</div>
                              {item.category && (
                                <div className="text-xs text-gray-500 mt-0.5">{item.category}</div>
                              )}
                            </div>
                          </div>
                          {canSelect && (
                            <div className="text-xs text-green-600 font-medium">Add</div>
                          )}
                          {isSelected && (
                            <div className="text-xs text-gray-400">Already added</div>
                          )}
                          {selectedIngredients.length >= 5 && !isSelected && (
                            <div className="text-xs text-gray-400">Limit reached</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
              {selectedIngredients.length >= 5 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-700">
                    You've reached the maximum of 5 ingredients. Remove one to add more.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
