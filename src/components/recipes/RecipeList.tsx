/**
 * RecipeList - Component for displaying a list of recipes with filtering and search
 * 
 * Supports grid/list view, filtering, search, and pagination
 * ADHD-first design: calm, clear, no pressure
 */

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, Clock, Users, ChefHat, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, Heart } from 'lucide-react';
import type { Recipe, RecipeFilters } from '../../lib/recipeGeneratorTypes';
import { listRecipes, searchRecipesFuzzy } from '../../lib/recipeGeneratorService';
import { getHouseholdIdFromSpaceId } from '../../lib/recipeAIService';
import { getPreferredTags } from '../../lib/tagPreferencesService';
import type { MealType, MealCategory, CuisineType, CookingDifficulty } from '../../lib/recipeGeneratorTypes';
import { getValidationStatus, type RecipeValidationStatus } from '../../lib/recipeValidationService';
import { getRecipeUsageStats, type RecipeUsageStats } from '../../lib/recipeUsageStatsService';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../Toast';
import { 
  addRecipeFavouriteForCurrentUser, 
  removeRecipeFavouriteForCurrentUser,
  getCurrentUserRecipeFavourites 
} from '../../lib/mealFavouritesService';

interface RecipeListProps {
  onSelectRecipe?: (recipe: Recipe) => void;
  filters?: Partial<RecipeFilters>;
  showFilters?: boolean;
  showSearch?: boolean;
  viewMode?: 'grid' | 'list';
  limit?: number;
  spaceId?: string; // Optional spaceId for conversion to household_id
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const CATEGORIES: MealCategory[] = [
  'home_cooked',
  'healthy',
  'vegetarian',
  'vegan',
  'gluten_free',
  'high_protein',
  'budget_friendly',
  'takeaway',
];

const CATEGORY_LABELS: Record<MealCategory, string> = {
  home_cooked: 'Home Cooked',
  healthy: 'Healthy',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten Free',
  high_protein: 'High Protein',
  budget_friendly: 'Budget Friendly',
  takeaway: 'Takeaway',
};

const CUISINES: CuisineType[] = [
  'italian',
  'indian',
  'chinese',
  'thai',
  'british',
  'american',
  'mexican',
  'mediterranean',
  'japanese',
  'french',
  'greek',
  'korean',
];

const CUISINE_LABELS: Record<CuisineType, string> = {
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

const DIFFICULTIES: CookingDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<CookingDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function RecipeList({
  onSelectRecipe,
  filters: initialFilters = {},
  showFilters = true,
  showSearch = true,
  viewMode: initialViewMode = 'grid',
  limit = 50, // Increased default limit to show more recipes in Library
  spaceId, // Optional spaceId for conversion
}: RecipeListProps) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search_query || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [validationStatuses, setValidationStatuses] = useState<Map<string, RecipeValidationStatus>>(new Map());
  const [usageStatsMap, setUsageStatsMap] = useState<Map<string, RecipeUsageStats>>(new Map());
  const [favouriteRecipeIds, setFavouriteRecipeIds] = useState<Set<string>>(new Set());

  // Filters
  const [mealType, setMealType] = useState<MealType | ''>(initialFilters.meal_type || '');
  const [selectedCategories, setSelectedCategories] = useState<MealCategory[]>(initialFilters.categories || []);
  const [cuisine, setCuisine] = useState<CuisineType | ''>(initialFilters.cuisine || '');
  const [difficulty, setDifficulty] = useState<CookingDifficulty | ''>(initialFilters.difficulty || '');
  const [preferredTags, setPreferredTags] = useState<string[]>([]);

  const { user } = useAuth();

  // Load preferred tags when spaceId is available
  const loadPreferredTags = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    try {
      const tags = await getPreferredTags(spaceId);
      setPreferredTags(tags);
    } catch (error) {
      console.error('[RecipeList] Error loading preferred tags:', error);
      // Don't throw - just log and continue without preferred tags
      setPreferredTags([]);
    }
  }, [spaceId]);

  useEffect(() => {
    if (spaceId) {
      loadPreferredTags();
    }
  }, [spaceId, loadPreferredTags]);

  // Load favorite status for recipes from database
  const loadFavouriteStatuses = useCallback(async () => {
    if (!user || !spaceId) return;

    try {
      // Fetch all favorites for current user in this space
      const favourites = await getCurrentUserRecipeFavourites(spaceId);
      setFavouriteRecipeIds(favourites);
    } catch (error) {
      console.error('[RecipeList] Error loading favorite statuses:', error);
      // Don't throw - just log and continue with empty set
      setFavouriteRecipeIds(new Set());
    }
  }, [user, spaceId]);

  // Load favorite statuses on mount and when spaceId changes
  useEffect(() => {
    if (user && spaceId) {
      loadFavouriteStatuses();
    }
  }, [user, spaceId, loadFavouriteStatuses]);

  // Handle favorite toggle - authoritative flow
  const handleToggleFavourite = useCallback(async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!user || !spaceId) {
      showToast('info', 'Please sign in to favorite recipes');
      return;
    }

    // Derive favorite state from database (authoritative source)
    const isFavourited = favouriteRecipeIds.has(recipeId);

    try {
      if (isFavourited) {
        // Remove from favorites - await database operation first
        await removeRecipeFavouriteForCurrentUser(recipeId, spaceId);
        
        // Update state only after successful database operation
        setFavouriteRecipeIds(prev => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        
        showToast('success', 'Recipe removed from favorites');
      } else {
        // Add to favorites - await database operation first
        await addRecipeFavouriteForCurrentUser(recipeId, spaceId);
        
        // Update state only after successful database operation
        setFavouriteRecipeIds(prev => new Set(prev).add(recipeId));
        
        showToast('success', 'Recipe added to favorites');

        // Track analytics (non-blocking, must not block UI)
        try {
          const householdId = await getHouseholdIdFromSpaceId(spaceId);
          if (householdId) {
            const { trackRecipeFavorited } = await import('../../lib/recipeUsageStatsService');
            await trackRecipeFavorited(recipeId, householdId);
          }
        } catch (error) {
          // Silently fail - analytics must never block UI
          console.warn('[RecipeList] Failed to track favorite analytics:', error);
        }
      }
    } catch (error) {
      console.error('[RecipeList] Error toggling favorite:', {
        error,
        recipeId,
        spaceId,
        isFavourited,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      showToast('error', `Failed to update favorite: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reload favorites from database to ensure UI matches reality
      await loadFavouriteStatuses();
    }
  }, [user, spaceId, favouriteRecipeIds, loadFavouriteStatuses]);

  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, mealType, selectedCategories, cuisine, difficulty, spaceId, limit, preferredTags]);

  // Ensure recipes load on initial mount even if spaceId is not yet available
  useEffect(() => {
    if (recipes.length === 0 && !loading) {
      console.log('[RecipeList] No recipes loaded on mount, triggering load...');
      loadRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadRecipes = async () => {
    setLoading(true);
    console.log('[RecipeList] Loading recipes...', {
      searchQuery,
      mealType,
      selectedCategories,
      cuisine,
      difficulty,
      limit,
      hasInitialFilters: Object.keys(initialFilters).length > 0,
      initialFilters,
    });

    try {
      // CRITICAL FIX: Convert spaceId to household_id
      // spaceId (spaces.id) must be converted to household_id (households.id or null)
      // Priority: use spaceId prop if provided, otherwise check initialFilters.household_id
      let householdId: string | null | undefined = initialFilters.household_id;
      
      // If spaceId prop is provided, use it for conversion
      if (spaceId) {
        console.log('[RecipeList] Converting spaceId to household_id:', { spaceId });
        householdId = await getHouseholdIdFromSpaceId(spaceId);
        console.log('[RecipeList] Space to household conversion result:', {
          spaceId,
          householdId,
          isPersonalSpace: householdId === null,
        });
      } else if (householdId && typeof householdId === 'string') {
        // Defensive check: if household_id looks like it might be a spaceId, convert it
        // We detect this by attempting conversion - if it's a valid spaceId, it will convert
        // If it's already a household_id, the conversion will return null or the same value
        console.warn('[RecipeList] household_id provided in filters, verifying it\'s not a spaceId...', {
          providedValue: householdId,
        });
        const convertedHouseholdId = await getHouseholdIdFromSpaceId(householdId);
        // If conversion returns a different value, it was likely a spaceId
        if (convertedHouseholdId !== householdId && convertedHouseholdId !== null) {
          console.error('[RecipeList] ERROR: spaceId was passed as household_id! Converting...', {
            originalValue: householdId,
            convertedValue: convertedHouseholdId,
          });
          householdId = convertedHouseholdId;
        } else if (convertedHouseholdId === null && householdId !== null) {
          // Conversion returned null, meaning it was a personal spaceId
          console.error('[RecipeList] ERROR: spaceId (personal space) was passed as household_id! Converting to null...', {
            originalValue: householdId,
          });
          householdId = null;
        }
      }
      
      // Use preferred tags if available, otherwise use tags from initialFilters
      // Preferred tags are used to prioritize recipes, but we still show all recipes
      // IMPORTANT: Only use tags if they exist - don't filter if no preferred tags
      const tagsToUse = preferredTags.length > 0 
        ? preferredTags 
        : (initialFilters.tags && initialFilters.tags.length > 0 ? initialFilters.tags : undefined);

      const filters: RecipeFilters = {
        search_query: searchQuery || undefined,
        meal_type: mealType || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        cuisine: cuisine || undefined,
        difficulty: difficulty || undefined,
        tags: tagsToUse, // Use preferred tags if available, otherwise undefined (show all)
        include_public: true,
        limit,
        order_by: 'created_at',
        order_direction: 'desc',
        ...initialFilters,
        household_id: householdId, // Use converted household_id (null, UUID, or undefined)
      };
      
      console.log('[RecipeList] Using filters with preferred tags:', {
        preferredTagsCount: preferredTags.length,
        preferredTags,
        tagsToUse,
        householdId,
        willFilterByTags: tagsToUse !== undefined,
      });

      console.log('[RecipeList] Calling recipe service with filters:', {
        ...filters,
        household_id: filters.household_id, // Explicitly log household_id to catch issues
        household_idType: typeof filters.household_id,
        household_idIsNull: filters.household_id === null,
        household_idIsUndefined: filters.household_id === undefined,
        wasConverted: spaceId !== undefined || (initialFilters.household_id && initialFilters.household_id !== householdId),
      });

      // Use fuzzy search if search query is provided, otherwise use regular list
      const results = searchQuery && searchQuery.trim().length >= 2
        ? await searchRecipesFuzzy(searchQuery, filters, 0.3)
        : await listRecipes(filters);
      
      console.log('[RecipeList] Recipes loaded successfully:', {
        count: results.length,
        recipeNames: results.map(r => r.name),
        recipeIds: results.map(r => r.id),
        usedFuzzySearch: searchQuery && searchQuery.trim().length >= 2,
      });
      
      setRecipes(results);

      // Load validation statuses for all recipes
      const statusPromises = results.map(recipe => 
        getValidationStatus(recipe.id).catch(() => null)
      );
      const statuses = await Promise.all(statusPromises);
      
      const statusMap = new Map<string, RecipeValidationStatus>();
      statuses.forEach((status, index) => {
        if (status) {
          statusMap.set(results[index].id, status);
        }
      });
      setValidationStatuses(statusMap);

      // Load usage stats for all recipes
      const statsPromises = results.map(recipe => 
        getRecipeUsageStats(recipe.id, recipe.household_id || undefined).catch(() => null)
      );
      const statsList = await Promise.all(statsPromises);
      
      const statsMap = new Map<string, RecipeUsageStats>();
      statsList.forEach((stats, index) => {
        if (stats) {
          statsMap.set(results[index].id, stats);
        }
      });
      setUsageStatsMap(statsMap);
      
      console.log('[RecipeList] Recipe loading complete:', {
        recipeCount: results.length,
        validationStatusCount: statusMap.size,
        usageStatsCount: statsMap.size,
        filters: {
          household_id: filters.household_id,
          meal_type: filters.meal_type,
          include_public: filters.include_public,
          limit: filters.limit,
        },
      });
    } catch (error) {
      console.error('[RecipeList] Error loading recipes:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
        errorStack: error instanceof Error ? error.stack : undefined,
        filters: {
          household_id,
          searchQuery,
          mealType,
          selectedCategories,
          cuisine,
          difficulty,
          include_public: true,
          limit,
        },
        spaceId,
      });
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: MealCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const formatTime = (minutes: number | null | undefined): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };


  const handleRecipeClick = useCallback((recipe: Recipe) => {
    if (onSelectRecipe) {
      // If onSelectRecipe callback is provided, use it (for meal planner, etc.)
      onSelectRecipe(recipe);
    } else {
      // Otherwise, navigate to the recipe detail page
      navigate(`/recipes/${recipe.id}`);
    }
  }, [onSelectRecipe, navigate]);

  // Dedicated Recipe Card Component for Grid View - ensures React identity
  // Pass all needed data as props to prevent closure issues
  const RecipeGridCard = memo(({ recipe, validationStatuses, usageStats, onRecipeClick, isFavourite, onToggleFavourite }: { 
    recipe: Recipe; 
    validationStatuses: Map<string, RecipeValidationStatus>;
    usageStats: RecipeUsageStats | undefined;
    onRecipeClick: (recipe: Recipe) => void;
    isFavourite: boolean;
    onToggleFavourite: (recipeId: string, e: React.MouseEvent) => void;
  }) => {
    const status = validationStatuses.get(recipe.id)?.status || recipe.validation_status;
    const qualityScore = validationStatuses.get(recipe.id)?.quality_score || recipe.quality_score;

    const statusConfig = {
      approved: { 
        icon: CheckCircle2, 
        color: 'text-green-600' 
      },
      pending: { 
        icon: HelpCircle, 
        color: 'text-yellow-600' 
      },
      needs_review: { 
        icon: AlertTriangle, 
        color: 'text-orange-600' 
      },
      draft: { 
        icon: HelpCircle, 
        color: 'text-gray-500' 
      },
      deprecated: { 
        icon: AlertTriangle, 
        color: 'text-red-600' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    const statusBadge = (
      <div className={`flex items-center gap-1 ${config.color}`} title={`Status: ${status}, Quality: ${qualityScore !== null ? (qualityScore * 100).toFixed(0) + '%' : 'N/A'}`}>
        <Icon size={14} />
        {qualityScore !== null && (
          <span className="text-xs">{(Math.round(qualityScore * 100))}%</span>
        )}
      </div>
    );
    
    return (
      <article
        className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-200 cursor-pointer active:scale-[0.98] group block"
        data-recipe-id={recipe.id}
        onClick={() => onRecipeClick(recipe)}
      >
        {/* Debug ID - visible in dev */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-id text-[8px] text-gray-300 mb-1 font-mono opacity-50">
            ID: {recipe.id.substring(0, 8)}
          </div>
        )}
        
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 flex-1 group-hover:text-orange-600 transition-colors">
            {recipe.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onToggleFavourite(recipe.id, e)}
              className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
                isFavourite
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label={isFavourite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={18} className={isFavourite ? 'fill-red-500' : ''} />
            </button>
            {statusBadge}
          </div>
        </div>
        {recipe.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {/* Show prep and cook time separately if available, otherwise show total time */}
          {recipe.prep_time || recipe.cook_time ? (
            <>
              {recipe.prep_time && (
                <div className="flex items-center gap-1" title="Preparation time">
                  <Clock size={14} />
                  Prep: {formatTime(recipe.prep_time)}
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-1" title="Cooking time">
                  <Clock size={14} />
                  Cook: {formatTime(recipe.cook_time)}
                </div>
              )}
            </>
          ) : recipe.total_time ? (
            <div className="flex items-center gap-1" title="Total time">
              <Clock size={14} />
              {formatTime(recipe.total_time)}
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <Users size={14} />
            {recipe.servings}
          </div>
          {recipe.difficulty && (
            <div className="flex items-center gap-1">
              <ChefHat size={14} />
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </div>
          )}
          {usageStats?.popularity_score && usageStats.popularity_score > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <TrendingUp size={14} />
              {Math.round(usageStats.popularity_score)}
            </div>
          )}
        </div>
        {/* Categories */}
        {recipe.categories && recipe.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.categories.slice(0, 2).map(category => (
              <span
                key={`${recipe.id}-${category}`}
                className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs"
              >
                {CATEGORY_LABELS[category]}
              </span>
            ))}
          </div>
        )}
        {/* Dietary Tags */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.dietary_tags.map(tag => (
              <span
                key={`${recipe.id}-tag-${tag}`}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200"
              >
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </article>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison - only re-render if recipe data actually changed
    const prevStatus = prevProps.validationStatuses.get(prevProps.recipe.id)?.status;
    const nextStatus = nextProps.validationStatuses.get(nextProps.recipe.id)?.status;
    const prevQuality = prevProps.validationStatuses.get(prevProps.recipe.id)?.quality_score;
    const nextQuality = nextProps.validationStatuses.get(nextProps.recipe.id)?.quality_score;
    
    return prevProps.recipe.id === nextProps.recipe.id &&
           prevProps.recipe.name === nextProps.recipe.name &&
           prevProps.recipe.description === nextProps.recipe.description &&
           prevProps.recipe.updated_at === nextProps.recipe.updated_at &&
           prevStatus === nextStatus &&
           prevQuality === nextQuality &&
           prevProps.usageStats?.popularity_score === nextProps.usageStats?.popularity_score &&
           prevProps.isFavourite === nextProps.isFavourite;
  });
  RecipeGridCard.displayName = 'RecipeGridCard';

  // Dedicated Recipe Card Component for List View - ensures React identity
  // Pass all needed data as props to prevent closure issues
  const RecipeListCard = memo(({ recipe, validationStatuses, usageStats, onRecipeClick, isFavourite, onToggleFavourite }: { 
    recipe: Recipe; 
    validationStatuses: Map<string, RecipeValidationStatus>;
    usageStats: RecipeUsageStats | undefined;
    onRecipeClick: (recipe: Recipe) => void;
    isFavourite: boolean;
    onToggleFavourite: (recipeId: string, e: React.MouseEvent) => void;
  }) => {
    const status = validationStatuses.get(recipe.id)?.status || recipe.validation_status;
    const qualityScore = validationStatuses.get(recipe.id)?.quality_score || recipe.quality_score;

    const statusConfig = {
      approved: { 
        icon: CheckCircle2, 
        color: 'text-green-600' 
      },
      pending: { 
        icon: HelpCircle, 
        color: 'text-yellow-600' 
      },
      needs_review: { 
        icon: AlertTriangle, 
        color: 'text-orange-600' 
      },
      draft: { 
        icon: HelpCircle, 
        color: 'text-gray-500' 
      },
      deprecated: { 
        icon: AlertTriangle, 
        color: 'text-red-600' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    const statusBadge = (
      <div className={`flex items-center gap-1 ${config.color}`} title={`Status: ${status}, Quality: ${qualityScore !== null ? (qualityScore * 100).toFixed(0) + '%' : 'N/A'}`}>
        <Icon size={14} />
        {qualityScore !== null && (
          <span className="text-xs">{(Math.round(qualityScore * 100))}%</span>
        )}
      </div>
    );
      
      // Condensed list view - minimal information for quick scanning
      const totalTime = recipe.total_time || 
        ((recipe.prep_time || 0) + (recipe.cook_time || 0)) || 
        null;

      return (
        <article
          className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-2.5 hover:shadow-md hover:border-orange-300 transition-all duration-200 cursor-pointer active:scale-[0.99] group"
          data-recipe-id={recipe.id}
          onClick={() => onRecipeClick(recipe)}
        >
          {/* Debug ID - visible in dev */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-id text-[8px] text-gray-300 mb-1 font-mono opacity-50">
              ID: {recipe.id.substring(0, 8)}
            </div>
          )}
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <h3 className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                {recipe.name}
              </h3>
              {totalTime && (
                <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                  <Clock size={12} />
                  {formatTime(totalTime)}
                </div>
              )}
            </div>
            <button
              onClick={(e) => onToggleFavourite(recipe.id, e)}
              className={`p-1.5 rounded-lg transition-colors touch-manipulation flex-shrink-0 ${
                isFavourite
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label={isFavourite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={16} className={isFavourite ? 'fill-red-500' : ''} />
            </button>
          </div>
        </article>
      );
  }, (prevProps, nextProps) => {
    // Custom comparison - only re-render if recipe data actually changed
    // Simplified comparison for condensed list view (only checks essential fields)
    const prevTotalTime = prevProps.recipe.total_time || 
      ((prevProps.recipe.prep_time || 0) + (prevProps.recipe.cook_time || 0)) || 
      null;
    const nextTotalTime = nextProps.recipe.total_time || 
      ((nextProps.recipe.prep_time || 0) + (nextProps.recipe.cook_time || 0)) || 
      null;
    
    return prevProps.recipe.id === nextProps.recipe.id &&
           prevProps.recipe.name === nextProps.recipe.name &&
           prevTotalTime === nextTotalTime &&
           prevProps.isFavourite === nextProps.isFavourite;
  });
  RecipeListCard.displayName = 'RecipeListCard';

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="space-y-3">
        {showSearch && (
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter size={16} />
              Filters
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && showFilters && (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                {MEAL_TYPES.map(type => (
                  <option key={type} value={type}>
                    {MEAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value as CuisineType | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  {CUISINES.map(c => (
                    <option key={c} value={c}>
                      {CUISINE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as CookingDifficulty | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading recipes...
        </div>
      )}

      {/* Empty State - Only show if not being used by RecipeSearchWithAI */}
      {!loading && recipes.length === 0 && showSearch && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-2">No recipes found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Recipe Grid */}
      {!loading && recipes.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(recipe => (
            <RecipeGridCard 
              key={recipe.id} 
              recipe={recipe}
              validationStatuses={validationStatuses}
              usageStats={usageStatsMap.get(recipe.id)}
              onRecipeClick={handleRecipeClick}
              isFavourite={favouriteRecipeIds.has(recipe.id)}
              onToggleFavourite={handleToggleFavourite}
            />
          ))}
        </div>
      )}

      {/* Recipe List - Condensed view for quick scanning */}
      {!loading && recipes.length > 0 && viewMode === 'list' && (
        <div className="space-y-1.5">
          {recipes.map(recipe => (
            <RecipeListCard 
              key={recipe.id} 
              recipe={recipe}
              validationStatuses={validationStatuses}
              usageStats={usageStatsMap.get(recipe.id)}
              onRecipeClick={handleRecipeClick}
              isFavourite={favouriteRecipeIds.has(recipe.id)}
              onToggleFavourite={handleToggleFavourite}
            />
          ))}
        </div>
      )}

    </div>
  );
}
