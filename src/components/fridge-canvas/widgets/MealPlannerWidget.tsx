import { useState, useEffect, useRef, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Coffee, Sun, Moon, X, Plus, Calendar, BookOpen, Heart, ChefHat, Clock, Edit, Trash2, Link as LinkIcon, Star, Search, Filter, ExternalLink, StickyNote, ShoppingCart, CheckCircle2, AlertCircle, Sparkles, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Package } from 'lucide-react';
import type { WidgetViewMode, MealPlannerContent } from '../../../lib/fridgeCanvasTypes';
import { getWeeklyMealPlan, addMealToPlan, removeMealFromPlan, getWeekStartDate, getMealLibrary, getHouseholdFavourites, getCurrentUserFavourites, toggleMealFavourite, createCustomMeal, updateCustomMeal, deleteCustomMeal, getMealTypeLabel, type MealLibraryItem, type MealPlan, type MealFavourite, type MealCourseType } from '../../../lib/mealPlanner';
import { getHouseholdRecipeLinks, createRecipeLink, updateRecipeLink, deleteRecipeLink, toggleRecipeVote, updateRecipeIcon, getPlatformIcon, type RecipeLink } from '../../../lib/recipeLinks';
import { getRecipeIcon } from '../../../lib/recipeIcons';
import { MealPickerModal } from '../../meal-planner/MealPickerModal';
import { RecipeFormModal, type RecipeFormData } from '../../meal-planner/RecipeFormModal';
import { AddRecipeFromURLModal } from '../../meal-planner/AddRecipeFromURLModal';
import { RecipeIconPickerModal } from '../../meal-planner/RecipeIconPickerModal';
import { AddMealPanel } from '../../meal-planner/AddMealBottomSheet';
import { addExternalMealToPlan } from '../../../lib/mealPlanner';
import { MealDetailBottomSheet } from '../../meal-planner/MealDetailBottomSheet';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { 
  compareRecipeAgainstPantry, 
  getPantryBasedRecipeSuggestions,
  getMissingIngredientsForRecipe,
  getRecipeAvailabilityMessage,
  type RecipePantryMatch 
} from '../../../lib/foodIntelligence';
import { addGroceryItem, getOrCreateDefaultList } from '../../../lib/intelligentGrocery';
import { showToast } from '../../Toast';
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';
import { SpaceContextSwitcher } from '../../shared/SpaceContextSwitcher';
import { MakeableRecipesModal } from '../../shared/MakeableRecipesModal';
import { BottomSheet } from '../../shared/BottomSheet';
import { RecipeSearchWithAI } from '../../recipes/RecipeSearchWithAI';
import type { Recipe } from '../../../lib/recipeGeneratorTypes';
import { useMealSchedule } from '../../../hooks/useMealSchedule';
import { isFastingSlot, type MealSlot } from '../../../lib/mealScheduleTypes';
import { Moon as MoonIcon, Settings as SettingsIcon } from 'lucide-react';
import { MealPlannerSettings } from '../../meal-planner/MealPlannerSettings';
import { WeeklyPantryCheckSheet } from '../../meal-planner/WeeklyPantryCheckSheet';
import { performWeeklyPantryCheck } from '../../../lib/weeklyPantryCheckService';
import { getMealAssignments, getPreparedMeals } from '../../../lib/mealPrepService';
import type { MealAssignment, PreparedMeal } from '../../../lib/mealPrepTypes';
import { MealAssignmentModal } from '../../meal-planner/MealAssignmentModal';
import { MealPlannerSkeleton } from '../../common/Skeleton';
import { MealPlannerMarks } from '../../../lib/performance';
import { staleWhileRevalidate, CacheKeys } from '../../../lib/dataCache';

/**
 * Full-screen overlay wrapper for AddMealPanel that properly manages scroll lock
 * This ensures body scroll is locked when open and restored when closed
 */
function AddMealPanelOverlay({
  onClose,
  onSelectMeal,
  onSelectExternalMeal,
  spaceId,
  dayName,
  mealType,
}: {
  onClose: () => void;
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
}) {
  // Lock body scroll when overlay is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    document.body.style.overflow = 'hidden';
    // Prevent scroll position jump on mobile
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      // Restore body scroll on unmount/close
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-white safe-top safe-bottom"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        height: '100dvh', // Use dynamic viewport height for mobile (falls back to 100vh)
      }}
    >
      {/* Single scroll container for the entire overlay */}
      <div 
        className="h-full overflow-y-auto"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          minHeight: '100%', // Ensure full height
        }}
      >
        <div className="max-w-2xl mx-auto h-full flex flex-col">
          <AddMealPanel
            onClose={onClose}
            onSelectMeal={onSelectMeal}
            onSelectExternalMeal={onSelectExternalMeal}
            spaceId={spaceId}
            dayName={dayName}
            mealType={mealType}
          />
        </div>
      </div>
    </div>
  );
}

interface MealPlannerWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
  content: MealPlannerContent;
  onContentChange?: (content: MealPlannerContent) => void;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Note: MEAL_TYPES is deprecated - use meal schedule slots instead
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

// Helper function to get the next 7 days starting from today
function getNext7Days(startDate: Date = new Date()): Array<{ date: Date; dayName: string; dayOfWeek: number; weekStartDate: string }> {
  const days: Array<{ date: Date; dayName: string; dayOfWeek: number; weekStartDate: string }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Calculate week_start_date (Sunday of the week containing this date)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    const weekStartDate = weekStart.toISOString().split('T')[0];
    
    days.push({
      date,
      dayName,
      dayOfWeek,
      weekStartDate,
    });
  }
  
  return days;
}

type MealPlannerTab = 'week' | 'library' | 'favourites' | 'recipes';

export function MealPlannerWidget({ householdId, viewMode, onViewModeChange, onFullscreenChange }: MealPlannerWidgetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRecipeRoute = location.pathname.startsWith('/recipes/');
  
  // Do not render MealPlannerWidget on recipe routes - let RecipeDetailPage render normally
  if (isRecipeRoute) {
    return null;
  }
  
  const { user } = useAuth();
  
  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  // Load meal schedule for current space
  const { schedule: mealSchedule, getSlotsForDay, loading: scheduleLoading } = useMealSchedule(currentSpaceId);

  // Performance: Separate loading states for critical vs deferred
  const [loadingCritical, setLoadingCritical] = useState(true); // Meal plans (critical)
  const [loadingDeferred, setLoadingDeferred] = useState(false); // Favorites, library (deferred)
  // Support multiple meals per time slot: Record<date-mealType, MealPlan[]>
  const [mealPlans, setMealPlans] = useState<Record<string, MealPlan[]>>({});
  const [mealAssignments, setMealAssignments] = useState<Record<string, any>>({}); // date-mealType -> assignment
  const [preparedMeals, setPreparedMeals] = useState<any[]>([]);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<MealPlannerTab>('week');
  const [showPantryCheck, setShowPantryCheck] = useState(false);
  const [pantryCheckStatus, setPantryCheckStatus] = useState<'all-covered' | 'some-missing' | 'loading' | null>(null);
  const [allMeals, setAllMeals] = useState<MealLibraryItem[]>([]);
  const [favouriteMeals, setFavouriteMeals] = useState<MealLibraryItem[]>([]);
  const [favouriteRecipes, setFavouriteRecipes] = useState<Recipe[]>([]);
  const [recipeMeals, setRecipeMeals] = useState<MealLibraryItem[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<{ 
    day: string; 
    dayIndex: number; 
    mealType: 'breakfast' | 'lunch' | 'dinner';
    date?: string;
    weekStartDate?: string;
    dayOfWeek?: number;
  } | null>(null);
  // Start from today's date instead of week start
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFullView, setShowFullView] = useState(false);
  const [showAddMealSheet, setShowAddMealSheet] = useState(false);
  const [showMealDetailSheet, setShowMealDetailSheet] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MealLibraryItem | undefined>(undefined);
  const [recipeLinks, setRecipeLinks] = useState<RecipeLink[]>([]);
  const [showAddRecipeURL, setShowAddRecipeURL] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'votes'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeLink | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingIconRecipe, setEditingIconRecipe] = useState<RecipeLink | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  
  // Food Intelligence state
  const [recipePantryMatches, setRecipePantryMatches] = useState<Map<string, RecipePantryMatch>>(new Map());
  const [pantrySuggestions, setPantrySuggestions] = useState<RecipePantryMatch[]>([]);
  const [showPantrySuggestions, setShowPantrySuggestions] = useState(false);
  const [selectedRecipeForIntelligence, setSelectedRecipeForIntelligence] = useState<MealLibraryItem | null>(null);
  
  // Makeable recipes modal state
  const [showMakeableRecipes, setShowMakeableRecipes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);
  const previousSpaceIdRef = useRef<string | null>(null);
  const previousPathnameRef = useRef<string | null>(null);

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);

  // Clear all space-specific data and reload when space changes
  // This ensures seamless switching between households/spaces
  useEffect(() => {
    // Only refresh if space actually changed (not on initial mount)
    const spaceChanged = previousSpaceIdRef.current !== null && previousSpaceIdRef.current !== currentSpaceId;
    
    if (currentSpaceId && spaceChanged) {
      console.log('[MealPlanner] Space changed, refreshing data:', {
        previous: previousSpaceIdRef.current,
        current: currentSpaceId,
        isSwitching: isSwitching()
      });
      
      // Clear existing data immediately to avoid showing stale data from previous space
      setMealPlans({});
      setMealAssignments({});
      setPreparedMeals([]);
      setPantryCheckStatus(null);
      setFavouriteMeals([]);
      setFavouriteRecipes([]);
      setFavouriteIds(new Set());
      setRecipeLinks([]);
      // Close any open modals/sheets when switching spaces
      setShowMealPicker(false);
      setShowAddMealSheet(false);
      setShowMealDetailSheet(false);
      setSelectedMealPlan(null);
      setSelectedSlot(null);
      // Set loading state to show we're loading new data
      setLoadingCritical(true);
      
      // Use a small delay to ensure state clears first, then reload
      const refreshTimer = setTimeout(() => {
        console.log('[MealPlanner] Executing refresh for space:', currentSpaceId);
        // Reload meal plans for the new space immediately
        loadMealPlans();
        
        // Also reload data for the current tab if it's space-specific
        if (activeTab === 'favourites') {
          loadFavourites();
        } else if (activeTab === 'recipes') {
          loadRecipeLinks();
        }
      }, 50); // Small delay to let state clear
      
      return () => {
        clearTimeout(refreshTimer);
      };
    }
    
    // Update previous space ID ref AFTER checking for changes
    // This ensures we can detect the change on the next render
    if (currentSpaceId) {
      previousSpaceIdRef.current = currentSpaceId;
    }
  }, [currentSpaceId, startDate, activeTab]);

  // Refresh meal plans when navigating back from recipe page
  // This ensures the meal planner shows the newly added meal
  useEffect(() => {
    if (!currentSpaceId) return;
    
    const currentPathname = location.pathname;
    const previousPathname = previousPathnameRef.current;
    
    // Check if we transitioned FROM a recipe route TO a non-recipe route
    const wasOnRecipeRoute = previousPathname?.startsWith('/recipes/');
    const isOnRecipeRoute = currentPathname.startsWith('/recipes/');
    
    // If we navigated back from a recipe page, refresh meal plans
    if (wasOnRecipeRoute && !isOnRecipeRoute && previousPathname) {
      console.log('[MealPlanner] Navigated back from recipe page, refreshing meal plans');
      // Small delay to ensure navigation is complete
      const refreshTimer = setTimeout(() => {
        loadMealPlans();
      }, 100);
      
      // Update ref for next comparison
      previousPathnameRef.current = currentPathname;
      
      return () => clearTimeout(refreshTimer);
    }
    
    // Update ref for next comparison
    previousPathnameRef.current = currentPathname;
  }, [location.pathname, currentSpaceId]);

  // Load data for current tab when widget mounts or tab changes
  // This handles initial load and tab switches (but not space changes - that's handled above)
  useEffect(() => {
    if (!currentSpaceId) return;
    
    // Skip if we just switched spaces (handled by the space change effect above)
    // Only skip if space actually changed (not on initial mount)
    const spaceJustChanged = previousSpaceIdRef.current !== null && previousSpaceIdRef.current !== currentSpaceId;
    if (spaceJustChanged) {
      // Space change effect will handle the refresh
      return;
    }
    
    // For initial load or tab changes, load the appropriate data
    if (activeTab === 'week') {
      loadMealPlans();
    } else if (activeTab === 'library') {
      loadLibraryMeals();
    } else if (activeTab === 'favourites') {
      loadFavourites();
    } else if (activeTab === 'recipes') {
      loadRecipes();
      loadRecipeLinks();
    }
  }, [activeTab, currentSpaceId]);

  useEffect(() => {
    const isFullscreen = viewMode === 'xlarge';
    setShowFullView(isFullscreen);
    onFullscreenChange?.(isFullscreen);

    if (isFullscreen && !isSwitching()) {
      // Reset edit states when entering fullscreen or context changes
      setEditingRecipe(undefined);
      setSelectedRecipe(null);
      setSelectedSlot(null);
      
      loadLibraryMeals();
      loadFavourites();
      loadRecipes();
      if (activeTab === 'recipes') {
        loadRecipeLinks();
      }
      loadPantryIntelligence();
    }
  }, [viewMode, onFullscreenChange, currentSpaceId]);

  const loadPantryIntelligence = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();
    
    if (!currentSpaceId || !showFullView || isSwitching()) return;
    
    try {
      // Load pantry matches for all recipes
      const allRecipes = [...allMeals, ...recipeMeals];
      if (allRecipes.length === 0) return;
      
      const matches = new Map<string, RecipePantryMatch>();
      
      for (const recipe of allRecipes) {
        // Check if context changed during loop
        if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
          return;
        }
        
        const match = await compareRecipeAgainstPantry(recipe, currentSpaceId);
        matches.set(recipe.id, match);
      }
      
      // Verify still in same context before updating state
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }
      
      setRecipePantryMatches(matches);
      
      // Load pantry-based suggestions
      const suggestions = await getPantryBasedRecipeSuggestions(allRecipes, currentSpaceId, 50);
      
      // Final check before updating state
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }
      
      setPantrySuggestions(suggestions.slice(0, 5)); // Top 5 suggestions
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load pantry intelligence:', error);
    }
  };

  useEffect(() => {
    if ((showFullView || activeTab === 'library') && allMeals.length > 0 && !isSwitching()) {
      loadPantryIntelligence();
    }
  }, [showFullView, activeTab, allMeals.length, currentSpaceId]);
  
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibraryMeals();
    }
  }, [librarySearchQuery, selectedCategories, activeTab, currentSpaceId]);
  
  useEffect(() => {
    if (activeTab === 'favourites' && currentSpaceId && !isSwitching()) {
      loadFavourites();
    }
  }, [activeTab, currentSpaceId]);
  
  useEffect(() => {
    if (activeTab === 'recipes' && currentSpaceId && !isSwitching()) {
      loadRecipes();
      loadRecipeLinks();
    }
  }, [activeTab, currentSpaceId, searchQuery, selectedTags, sortBy]);

  const handleAddMissingIngredientsToGrocery = async (recipe: MealLibraryItem) => {
    try {
      const missingIngredients = await getMissingIngredientsForRecipe(recipe, currentSpaceId);
      if (missingIngredients.length === 0) {
        showToast('info', 'All ingredients are in your pantry!');
        return;
      }

      const defaultList = await getOrCreateDefaultList(currentSpaceId);
      
      for (const foodItem of missingIngredients) {
        await addGroceryItem({
          householdId: currentSpaceId,
          listId: defaultList.id,
          foodItemId: foodItem.id,
          source: 'meal_planner',
        });
      }

      showToast('success', `Added ${missingIngredients.length} missing ingredient${missingIngredients.length !== 1 ? 's' : ''} to grocery list`);
      setSelectedRecipeForIntelligence(null);
    } catch (error) {
      console.error('Failed to add missing ingredients:', error);
      showToast('error', 'Failed to add ingredients to grocery list');
    }
  };

  const loadMealPlans = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();
    
    MealPlannerMarks.start();
    setLoadingCritical(true);
    try {
      // Load meal plans for all week_start_dates that the 7 days span
      const allPlans: MealPlan[] = [];
      
      for (const weekStartDate of weekStartDates) {
        const plans = await getWeeklyMealPlan(currentSpaceId, weekStartDate);
        allPlans.push(...plans);
      }
      
      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }
      
      // Support multiple meals per slot: collect all meals for each date-mealType combination
      const plansMap: Record<string, MealPlan[]> = {};

      // Map plans by their actual date (week_start_date + day_of_week offset)
      allPlans.forEach(plan => {
        const planDate = new Date(plan.week_start_date);
        planDate.setDate(planDate.getDate() + plan.day_of_week);
        const dateKey = planDate.toISOString().split('T')[0];
        const key = `${dateKey}-${plan.meal_type}`;
        
        // Initialize array if it doesn't exist, then push the plan
        if (!plansMap[key]) {
          plansMap[key] = [];
        }
        plansMap[key].push(plan);
      });

      setMealPlans(plansMap);
      MealPlannerMarks.dataLoaded();
      
      // Check pantry status for the current week (non-blocking)
      if (weekStartDates.length > 0) {
        checkPantryStatus(weekStartDates[0], expectedSpaceId);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load meal plans:', error);
    } finally {
      // Only update loading state if context hasn't changed
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoadingCritical(false);
        MealPlannerMarks.interactive();
      }
    }
  };

  // Check pantry status (non-blocking, updates badge)
  const checkPantryStatus = async (weekStartDate: string, spaceId: string) => {
    try {
      setPantryCheckStatus('loading');
      const result = await performWeeklyPantryCheck(spaceId, weekStartDate);
      
      // Update badge status
      if (result.summary.allCovered) {
        setPantryCheckStatus('all-covered');
      } else if (result.summary.needsBuyingCount > 0) {
        setPantryCheckStatus('some-missing');
      } else {
        setPantryCheckStatus('all-covered'); // Only manual check items remain
      }
    } catch (error) {
      console.error('Failed to check pantry status:', error);
      setPantryCheckStatus(null); // Hide badge on error
    }
  };

  const loadLibraryMeals = async () => {
    try {
      const filters: any = {};
      
      if (librarySearchQuery) {
        filters.searchQuery = librarySearchQuery;
      }
      
      if (selectedCategories.length > 0) {
        filters.categories = selectedCategories;
      }
      
      const meals = await getMealLibrary(filters);
      setAllMeals(meals);
    } catch (error) {
      console.error('Failed to load meal library:', error);
    }
  };
  
  const navigateDays = (direction: 'prev' | 'next') => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setStartDate(currentDate.toISOString().split('T')[0]);
  };
  
  const goToToday = () => {
    setStartDate(new Date().toISOString().split('T')[0]);
  };
  
  // Get the 7 days starting from startDate
  const displayDays = getNext7Days(new Date(startDate));
  
  // Get unique week_start_dates from the 7 days (in case they span multiple weeks)
  const weekStartDates = Array.from(new Set(displayDays.map(d => d.weekStartDate)));

  const loadFavourites = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();
    
    if (!user || !currentSpaceId) return;
    
    try {
      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profile) {
        console.warn('[loadFavourites] No profile found for user');
        setFavouriteMeals([]);
        setFavouriteRecipes([]);
        setFavouriteIds(new Set());
        return;
      }
      
      // Fetch current user's favorites (both meals and recipes)
      const favourites = await getCurrentUserFavourites(currentSpaceId, profile.id);
      
      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }
      
      // Separate meals and recipes
      const meals = favourites
        .filter(f => f.meal_id && f.meal)
        .map(f => f.meal!)
        .filter(Boolean) as MealLibraryItem[];
      
      const recipes = favourites
        .filter(f => f.recipe_id && f.recipe)
        .map(f => f.recipe!)
        .filter(Boolean) as Recipe[];
      
      setFavouriteMeals(meals);
      setFavouriteRecipes(recipes);
      
      // Combine IDs for favorite tracking
      const allIds = new Set<string>();
      meals.forEach(m => allIds.add(m.id));
      recipes.forEach(r => allIds.add(r.id));
      setFavouriteIds(allIds);
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load favourites:', error);
      setFavouriteMeals([]);
      setFavouriteRecipes([]);
      setFavouriteIds(new Set());
    }
  };

  const loadRecipes = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!profile) return;

      const { data, error } = await supabase
        .from('meal_library')
        .select('*')
        .eq('created_by', profile.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setRecipeMeals(data || []);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  };

  const handleAddMeal = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | string) => {
    // Check if this is a fasting slot - don't allow adding meals
    if (mealSchedule && !scheduleLoading) {
      const slots = getSlotsForDayIndex(dayIndex);
      const slot = slots.find(s => (s.mealTypeMapping || s.id) === mealType);
      if (slot && isFastingSlot(slot)) {
        showToast('info', 'Cannot add meals during fasting period');
        return;
      }
    }
    
    // For schedule-driven slots, mealType might be a slot ID
    // Map it to a valid meal type for backward compatibility
    const validMealType = (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') 
      ? mealType 
      : 'dinner'; // Default fallback
    
    const dayInfo = displayDays[dayIndex];
    setSelectedSlot({ 
      day: dayInfo.dayName, 
      dayIndex, 
      mealType: validMealType as 'breakfast' | 'lunch' | 'dinner',
      date: dayInfo.date.toISOString().split('T')[0],
      weekStartDate: dayInfo.weekStartDate,
      dayOfWeek: dayInfo.dayOfWeek
    });
    setShowAddMealSheet(true);
  };

  const handleMealCardClick = (plan: MealPlan) => {
    setSelectedMealPlan(plan);
    setShowMealDetailSheet(true);
  };

  const handleSelectMeal = async (
    meal: MealLibraryItem | null,
    customName?: string,
    recipeId?: string,
    servings: number = 1,
    courseType: MealCourseType = 'main',
    preparationMode: 'scratch' | 'pre_bought' = 'scratch',
    pantryItemId?: string | null
  ) => {
    if (!selectedSlot || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      // Use the date-specific weekStartDate and dayOfWeek if available, otherwise fall back to calculated values
      const dayInfo = displayDays[selectedSlot.dayIndex];
      if (!dayInfo) {
        showToast('error', 'Invalid day selected');
        return;
      }
      const weekStartDate = selectedSlot.weekStartDate || dayInfo.weekStartDate;
      const dayOfWeek = selectedSlot.dayOfWeek !== undefined ? selectedSlot.dayOfWeek : dayInfo.dayOfWeek;

      // Route by semantic type, not by id presence
      // meal_library items → mealId
      // recipes → recipeId
      // custom meals → customMealName
      
      // Determine source: if recipeId is explicitly provided, it's a recipe
      // If meal is provided and has source property, use that
      // Otherwise, infer from context
      const mealSource = (meal as any)?.source;
      const isRecipe = recipeId !== undefined && recipeId !== null && recipeId.trim() !== '';
      const isMealLibrary = meal !== null && mealSource !== 'recipe' && !isRecipe;
      const isCustom = customName !== undefined && customName !== null && customName.trim() !== '';

      console.log('[handleSelectMeal]', {
        id: meal?.id || recipeId || 'custom',
        name: meal?.name || customName,
        source: mealSource || (isRecipe ? 'recipe' : isMealLibrary ? 'meal_library' : 'custom'),
        isRecipe,
        isMealLibrary,
        isCustom,
        recipeId,
        mealId: meal?.id,
        customMealName: customName,
      });

      // Explicit branching based on source
      let result: any;
      if (isRecipe) {
        // Recipe from recipes table → use recipeId
        result = await addMealToPlan(
          currentSpaceId,
          null, // mealId = null for recipes
          null, // customMealName = null for recipes
          selectedSlot.mealType,
          dayOfWeek,
          weekStartDate,
          profile.id,
          recipeId, // recipeId parameter
          servings, // portion count
          courseType, // course type
          pantryItemId, // pantry item ID (for pre_bought mode)
          preparationMode // preparation mode
        );
      } else if (isMealLibrary && meal) {
        // Meal from meal_library → use mealId
        result = await addMealToPlan(
          currentSpaceId,
          meal.id, // mealId from meal_library
          null, // customMealName = null
          selectedSlot.mealType,
          dayOfWeek,
          weekStartDate,
          profile.id,
          null, // recipeId = null
          servings, // portion count
          courseType, // course type
          pantryItemId, // pantry item ID (for pre_bought mode)
          preparationMode // preparation mode
        );
      } else if (isCustom) {
        // Custom meal → use customMealName
        result = await addMealToPlan(
          currentSpaceId,
          null, // mealId = null
          customName, // customMealName
          selectedSlot.mealType,
          dayOfWeek,
          weekStartDate,
          profile.id,
          null, // recipeId = null
          servings, // portion count
          courseType, // course type
          pantryItemId, // pantry item ID (for pre_bought mode)
          preparationMode // preparation mode
        );
      } else {
        throw new Error('[handleSelectMeal] Unknown item type: must provide meal, recipeId, or customMealName');
      }

      await loadMealPlans();
      setShowAddMealSheet(false);
      setSelectedSlot(null);
      
      const wasReplaced = (result as any)?.wasReplaced;
      if (wasReplaced) {
        showToast('success', isRecipe ? 'Recipe replaced in plan' : isCustom ? 'Custom meal replaced in plan' : 'Meal replaced in plan');
      } else {
        showToast('success', isRecipe ? 'Recipe added to plan' : isCustom ? 'Custom meal added to plan' : 'Meal added to plan');
      }
    } catch (error: any) {
      console.error('Failed to add meal/recipe:', error);
      // Only show error if it's not a duplicate key error (which should be handled by replacement)
      if (error.code === '23505') {
        // This shouldn't happen anymore, but if it does, show a friendly message
        showToast('error', 'A meal already exists in this slot. Please try again.');
      } else {
        showToast('error', error.message || 'Failed to add to plan');
      }
    }
  };

  const handleSelectExternalMeal = async (params: {
    name: string;
    vendor?: string | null;
    type: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other';
    scheduledAt?: string | null;
    notes?: string | null;
    servings?: number;
    courseType?: MealCourseType;
  }) => {
    if (!selectedSlot || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      const dayInfo = displayDays[selectedSlot.dayIndex];
      if (!dayInfo) {
        showToast('error', 'Invalid day selected');
        return;
      }
      const weekStartDate = selectedSlot.weekStartDate || dayInfo.weekStartDate;
      const dayOfWeek = selectedSlot.dayOfWeek !== undefined ? selectedSlot.dayOfWeek : dayInfo.dayOfWeek;

      const result = await addExternalMealToPlan({
        name: params.name,
        vendor: params.vendor,
        type: params.type,
        mealType: selectedSlot.mealType,
        dayOfWeek,
        weekStartDate,
        profileId: profile.id,
        householdId: currentSpaceId,
        scheduledAt: params.scheduledAt,
        notes: params.notes,
        servings: params.servings || 1, // Include portion count (default: 1)
        courseType: params.courseType || 'main', // Include course type (default: 'main')
      });

      await loadMealPlans();
      setShowAddMealSheet(false);
      setSelectedSlot(null);
      
      const wasReplaced = (result as any)?.wasReplaced;
      if (wasReplaced) {
        showToast('success', 'External meal replaced in plan');
      } else {
        showToast('success', 'External meal added to plan');
      }
    } catch (error: any) {
      console.error('Failed to add external meal:', error);
      // Only show error if it's not a duplicate key error (which should be handled by replacement)
      if (error.code === '23505') {
        // This shouldn't happen anymore, but if it does, show a friendly message
        showToast('error', 'A meal already exists in this slot. Please try again.');
      } else {
        showToast('error', error.message || 'Failed to add external meal to plan');
      }
    }
  };

  const handleRemoveMeal = async (mealPlanId: string) => {
    try {
      await removeMealFromPlan(mealPlanId);
      await loadMealPlans();
    } catch (error) {
      console.error('Failed to remove meal:', error);
    }
  };

  const handleToggleFavourite = async (mealId: string) => {
    if (!user) return;

    try {
      await toggleMealFavourite(mealId, currentSpaceId, user.id);
      await loadFavourites();
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    }
  };

  const handleCreateRecipe = () => {
    setEditingRecipe(undefined);
    setShowRecipeForm(true);
  };

  const handleEditRecipe = (recipe: MealLibraryItem) => {
    setEditingRecipe(recipe);
    setShowRecipeForm(true);
  };

  const handleSaveRecipe = async (recipeData: RecipeFormData) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      if (editingRecipe) {
        await updateCustomMeal(editingRecipe.id, {
          name: recipeData.name,
          mealType: recipeData.mealType,
          categories: recipeData.categories,
          cuisine: recipeData.cuisine,
          difficulty: recipeData.difficulty,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          servings: recipeData.servings,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          calories: recipeData.calories ?? undefined,
          protein: recipeData.protein ?? undefined,
          carbs: recipeData.carbs ?? undefined,
          fat: recipeData.fat ?? undefined,
          allergies: recipeData.allergies
        });
      } else {
        await createCustomMeal(
          recipeData.name,
          recipeData.mealType,
          currentSpaceId,
          profile.id,
          {
            categories: recipeData.categories,
            cuisine: recipeData.cuisine,
            difficulty: recipeData.difficulty,
            prepTime: recipeData.prepTime ?? undefined,
            cookTime: recipeData.cookTime ?? undefined,
            servings: recipeData.servings,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions ?? undefined,
            calories: recipeData.calories ?? undefined,
            protein: recipeData.protein ?? undefined,
            carbs: recipeData.carbs ?? undefined,
            fat: recipeData.fat ?? undefined,
            allergies: recipeData.allergies
          }
        );
      }

      await loadRecipes();
      await loadLibraryMeals();
      setShowRecipeForm(false);
      setEditingRecipe(undefined);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    // Confirmation is now handled in the UI button click handler
    try {
      await deleteCustomMeal(recipeId);
      await loadRecipes();
      await loadLibraryMeals();
      showToast('success', 'Recipe deleted');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showToast('error', 'Failed to delete recipe');
    }
  };

  const handleAddRecipeToPlanner = (recipe: MealLibraryItem) => {
    // recipe.meal_type is now an array, use first value
    const primaryMealType = Array.isArray(recipe.meal_type) && recipe.meal_type.length > 0
      ? recipe.meal_type[0]
      : 'dinner';
    setSelectedSlot({ day: 'Monday', dayIndex: 0, mealType: primaryMealType as any });
    setShowMealPicker(true);
  };

  const loadRecipeLinks = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();
    
    if (!user || !currentSpaceId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      const links = await getHouseholdRecipeLinks(currentSpaceId, {
        searchQuery,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        userId: profile.id
      });
      
      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }

      setRecipeLinks(links);
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load recipe links:', error);
    }
  };

  const handleAddRecipeFromURL = async (data: {
    url: string;
    title: string;
    imageUrl: string | null;
    sourcePlatform: string | null;
    tags: string[];
    notes: string | null;
  }) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      await createRecipeLink(currentSpaceId, profile.id, data);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to add recipe:', error);
      throw error;
    }
  };

  const handleToggleRecipeVote = async (recipeId: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      await toggleRecipeVote(recipeId, profile.id);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to toggle vote:', error);
    }
  };

  const handleDeleteRecipeLink = async (recipeId: string) => {
    // Confirmation is now handled in the UI button click handler
    try {
      await deleteRecipeLink(recipeId);
      await loadRecipeLinks();
      showToast('success', 'Recipe deleted');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showToast('error', 'Failed to delete recipe');
    }
  };

  useEffect(() => {
    if (showFullView && activeTab === 'recipes') {
      loadRecipeLinks();
    }
  }, [searchQuery, selectedTags, sortBy, activeTab, showFullView, currentSpaceId]);

  const handleEditRecipeIcon = (recipe: RecipeLink) => {
    setEditingIconRecipe(recipe);
    setShowIconPicker(true);
  };

  const handleSaveRecipeIcon = async (iconName: string | null) => {
    if (!editingIconRecipe) return;

    try {
      await updateRecipeIcon(editingIconRecipe.id, iconName);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to update icon:', error);
      throw error;
    }
  };

  // Get all meals for a slot (supports multiple meals per time slot)
  const getMealPlans = (dayIndex: number, mealType: string): MealPlan[] => {
    // Use date-based key for lookup
    const dayInfo = displayDays[dayIndex];
    if (!dayInfo) return [];
    const dateKey = dayInfo.date.toISOString().split('T')[0];
    const key = `${dateKey}-${mealType}`;
    return mealPlans[key] || [];
  };

  // Legacy helper for backward compatibility (returns first meal or null)
  const getMealPlan = (dayIndex: number, mealType: string): MealPlan | null => {
    const plans = getMealPlans(dayIndex, mealType);
    return plans.length > 0 ? plans[0] : null;
  };

  const getMealAssignment = (dayIndex: number, mealType: string): (MealAssignment & { preparedMeal: PreparedMeal }) | null => {
    // Use date-based key for lookup
    const dayInfo = displayDays[dayIndex];
    if (!dayInfo) return null;
    const dateKey = dayInfo.date.toISOString().split('T')[0];
    const key = `${dateKey}-${mealType}`;
    return mealAssignments[key] || null;
  };

  const getTotalMeals = () => {
    // Count all meals across all slots (mealPlans is now Record<string, MealPlan[]>)
    return Object.values(mealPlans).reduce((total, plans) => total + plans.length, 0);
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={14} className="text-amber-600" />;
      case 'lunch':
        return <Sun size={14} className="text-orange-600" />;
      case 'dinner':
        return <Moon size={14} className="text-blue-600" />;
      default:
        return null;
    }
  };

  // Get slots for a day - use schedule if available, fallback to default
  const getSlotsForDayIndex = (dayIndex: number): MealSlot[] => {
    if (mealSchedule && !scheduleLoading) {
      // Use the actual dayOfWeek from displayDays
      const dayInfo = displayDays[dayIndex];
      if (dayInfo) {
        return getSlotsForDay(dayInfo.dayOfWeek);
      }
    }
    // Fallback to default meal types
    return MEAL_TYPES.map((type, idx) => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      type: 'meal' as const,
      default: true,
      order: idx,
      mealTypeMapping: type as any,
    }));
  };

  // Render a meal slot (meal or fasting) - supports multiple meals per slot
  const renderMealSlot = (
    slot: MealSlot,
    dayIndex: number,
    isFullscreen: boolean = false
  ) => {
    const isFasting = isFastingSlot(slot);
    const mealType = slot.mealTypeMapping || slot.id;
    const assignment = getMealAssignment(dayIndex, mealType);
    const plans = getMealPlans(dayIndex, mealType); // Get all meals for this slot
    const hasMeals = plans.length > 0;
    
    // External meal type icons and labels
    const externalTypeConfig = {
      shop: { icon: '🛍️', label: 'Shop', color: 'bg-blue-100 text-blue-700' },
      restaurant: { icon: '🍽️', label: 'Restaurant', color: 'bg-purple-100 text-purple-700' },
      cafe: { icon: '☕', label: 'Café', color: 'bg-amber-100 text-amber-700' },
      takeaway: { icon: '🥡', label: 'Takeaway', color: 'bg-orange-100 text-orange-700' },
      other: { icon: '📦', label: 'Bought', color: 'bg-gray-100 text-gray-700' },
    };

    // Color scheme per meal type (ADHD-first: calm, soft)
    const mealTypeStyles: Record<string, any> = {
      breakfast: {
        bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
        border: 'border-amber-200',
        icon: '🍳',
        text: 'text-amber-700',
      },
      lunch: {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        border: 'border-green-200',
        icon: '🥪',
        text: 'text-green-700',
      },
      dinner: {
        bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
        border: 'border-purple-200',
        icon: '🍲',
        text: 'text-purple-700',
      },
    };

    const styles = mealTypeStyles[mealType] || {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: '🍽️',
      text: 'text-gray-700',
    };

    // Helper function to render a single meal card
    const renderMealCard = (plan: MealPlan, index: number) => {
      const isExternalMeal = plan.meal_source === 'external';
      const mealName = isExternalMeal 
        ? plan.external_name 
        : assignment?.preparedMeal.recipe_name || plan.meal?.name || plan.recipe?.name || plan.custom_meal_name;
      const isPreparedMeal = !!assignment;
      const externalConfig = plan.external_type ? externalTypeConfig[plan.external_type] : externalTypeConfig.other;

      return (
        <button
          key={plan.id || index}
          onClick={() => handleMealCardClick(plan)}
          className={`w-full text-left ${styles.bg} ${styles.border} border-2 rounded-xl ${isFullscreen ? 'p-4' : 'p-3'} hover:shadow-md active:scale-[0.98] transition-all mb-2`}
          style={{ touchAction: 'pan-y' }}
        >
          <div className="flex items-start gap-3">
            {/* Meal Image or Icon */}
            {isExternalMeal ? (
              <div className={`${isFullscreen ? 'w-20 h-20' : 'w-16 h-16'} ${styles.bg} ${styles.border} border-2 rounded-lg flex items-center justify-center text-3xl flex-shrink-0`}>
                {externalConfig.icon}
              </div>
            ) : plan.meal?.image_url || plan.recipe?.image_url ? (
              <img
                src={(plan.meal?.image_url || plan.recipe?.image_url) || undefined}
                alt={mealName || undefined}
                className={`${isFullscreen ? 'w-20 h-20' : 'w-16 h-16'} rounded-lg object-cover flex-shrink-0`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`${isFullscreen ? 'w-20 h-20' : 'w-16 h-16'} ${styles.bg} ${styles.border} border-2 rounded-lg flex items-center justify-center text-3xl flex-shrink-0`}>
                {styles.icon}
              </div>
            )}

            {/* Meal Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={`font-semibold text-gray-900 ${isFullscreen ? 'text-base' : 'text-sm'} line-clamp-2`}>
                  {mealName}
                </h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Prominent Portion Indicator */}
                  {plan.servings && plan.servings > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-300">
                      {plan.servings}x
                    </span>
                  )}
                  {/* Preparation Mode Badge */}
                  {(plan as any).preparation_mode === 'pre_bought' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-300">
                      🛒 Pre-made
                    </span>
                  )}
                  {isExternalMeal && (
                    <span className={`px-2 py-0.5 ${externalConfig.color} text-xs font-medium rounded-full`}>
                      {externalConfig.icon} {externalConfig.label}
                    </span>
                  )}
                  {isPreparedMeal && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      🥘 Prep
                    </span>
                  )}
                </div>
              </div>

              {/* External meal vendor */}
              {isExternalMeal && plan.external_vendor && (
                <p className="text-xs text-gray-600 mb-1">
                  {plan.external_vendor}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span className="capitalize font-medium">{slot.label}</span>
                {isPreparedMeal && assignment && (
                  <>
                    <span>•</span>
                    <span>{assignment.servings_used} serving{assignment.servings_used !== 1 ? 's' : ''}</span>
                    {assignment.preparedMeal.remaining_servings > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">{assignment.preparedMeal.remaining_servings} left</span>
                      </>
                    )}
                  </>
                )}
                {!isPreparedMeal && !isExternalMeal && (plan?.meal?.prep_time || plan?.recipe?.prep_time) && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{(plan.meal?.prep_time || plan.recipe?.prep_time || 0) + ((plan.meal?.cook_time || plan.recipe?.cook_time) || 0)} min</span>
                    </div>
                  </>
                )}
              </div>

              {/* Tags */}
              {((plan.meal?.categories && plan.meal.categories.length > 0) || (plan.recipe?.categories && plan.recipe.categories.length > 0)) && (
                <div className="flex flex-wrap gap-1">
                  {((plan.meal?.categories || plan.recipe?.categories) || []).slice(0, 2).map(cat => (
                    <span
                      key={cat}
                      className="text-xs px-2 py-0.5 bg-white/60 backdrop-blur-sm text-gray-600 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      );
    };

    // Fasting slot rendering
    if (isFasting) {
      return (
        <div
          key={slot.id}
          className={`w-full ${isFullscreen ? 'p-4' : 'p-3'} ${styles.bg} ${styles.border} border-2 rounded-xl flex items-center gap-3 opacity-75`}
        >
          <div className={`w-12 h-12 sm:w-16 sm:h-16 ${styles.bg} ${styles.border} border-2 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
            <MoonIcon size={20} className="text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-600 text-sm sm:text-base">
              {slot.label}
            </h4>
            <p className="text-xs text-gray-500 mt-1">No meals scheduled</p>
            {slot.startTime && slot.endTime && (
              <p className="text-xs text-gray-400 mt-1">
                {slot.startTime} → {slot.endTime}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Course order for logical grouping
    const COURSE_ORDER: MealCourseType[] = ['starter', 'main', 'side', 'shared', 'dessert', 'snack'];
    const COURSE_LABELS: Record<MealCourseType, string> = {
      starter: 'Starter',
      main: 'Main',
      side: 'Side',
      shared: 'Shared',
      dessert: 'Dessert',
      snack: 'Snack',
    };
    const COURSE_ICONS: Record<MealCourseType, string> = {
      starter: '🥟',
      main: '🍲',
      side: '🥗',
      shared: '🍞',
      dessert: '🍰',
      snack: '🍪',
    };

    // Group plans by course_type
    const plansByCourse = plans.reduce((acc, plan) => {
      const course = (plan.course_type || 'main') as MealCourseType; // Defensive fallback
      if (!acc[course]) {
        acc[course] = [];
      }
      acc[course].push(plan);
      return acc;
    }, {} as Record<MealCourseType, MealPlan[]>);

    // Regular meal slot rendering - supports multiple meals grouped by course
    // Note: This is called from within a meal type section, so we don't need to show meal type header here
    return (
      <div key={slot.id} className="space-y-3">
        {/* Render meals grouped by course */}
        {COURSE_ORDER.map(courseType => {
          const coursePlans = plansByCourse[courseType] || [];
          if (coursePlans.length === 0) return null;

          return (
            <div key={courseType} className="space-y-2">
              {/* Course Label - only show if there are multiple courses or more than one dish in this course */}
              {(Object.keys(plansByCourse).length > 1 || coursePlans.length > 1) && (
                <div className="flex items-center gap-2 px-2">
                  <span className="text-lg">{COURSE_ICONS[courseType]}</span>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {COURSE_LABELS[courseType]}
                  </span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
              )}
              
              {/* Render meals in this course */}
              {coursePlans.map((plan, index) => renderMealCard(plan, index))}
            </div>
          );
        })}
        
        {/* Add Dish Button - always visible, allows adding more dishes */}
        <button
          onClick={() => {
            if (!isFasting) {
              handleAddMeal(dayIndex, mealType);
            }
          }}
          disabled={isFasting}
          className={`w-full text-left ${styles.bg} ${styles.border} border-2 ${hasMeals ? 'border-solid' : 'border-dashed'} rounded-xl ${isFullscreen ? 'p-3' : 'p-2.5'} hover:shadow-md active:scale-[0.98] transition-all ${isFasting ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ touchAction: 'pan-y' }}
        >
          <div className="flex items-center gap-2">
            <div className={`${isFullscreen ? 'w-10 h-10' : 'w-8 h-8'} ${styles.bg} ${styles.border} border-2 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Plus size={isFullscreen ? 18 : 16} className={styles.text} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${styles.text} font-medium`}>
                {hasMeals ? 'Add another dish' : 'Tap to add dish'}
              </p>
            </div>
          </div>
        </button>
      </div>
    );
  };

  if (viewMode === 'xlarge' || showFullView) {
    const fullscreenContent = (
      <>
        {/* Fullscreen modal - proper scroll container setup */}
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-0 sm:p-6 safe-top safe-bottom">
          {/* Main container - overflow-hidden prevents body scroll, inner container handles scrolling */}
          <div className="bg-orange-50 rounded-0 sm:rounded-2xl w-full h-full sm:max-w-5xl sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0 sticky top-0 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Meal Planner</h2>
                    {availableSpaces.length > 0 && !spacesLoading && (
                      <p className="text-orange-100 text-xs sm:text-sm truncate">
                        {availableSpaces.find(s => s.id === currentSpaceId)?.name || 'Personal'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowMakeableRecipes(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium"
                    title="What can I make?"
                  >
                    <ChefHat size={16} />
                    What can I make?
                  </button>
                  {availableSpaces.length > 1 && !spacesLoading && (
                    <div className="hidden sm:block">
                      <SpaceContextSwitcher
                        currentSpaceId={currentSpaceId}
                        onSpaceChange={setCurrentSpace}
                        availableSpaces={availableSpaces}
                        className="[&_button]:bg-white/20 [&_button]:border-white/30 [&_button]:text-white [&_button:hover]:bg-white/30"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowFullView(false);
                      onViewModeChange?.('large');
                      onFullscreenChange?.(false);
                    }}
                    className="text-white hover:bg-white/20 active:bg-white/30 rounded-xl p-2 transition-colors touch-manipulation"
                    aria-label="Close meal planner"
                  >
                    <X size={24} className="sm:w-7 sm:h-7" />
                  </button>
                </div>
              </div>

              {/* Week Navigation */}
              {activeTab === 'week' && (
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-2 mb-3">
                  <button
                    onClick={() => navigateDays('prev')}
                    className="p-1.5 sm:p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors touch-manipulation"
                    aria-label="Previous 7 days"
                  >
                    <ChevronLeft size={18} className="sm:w-5 sm:h-5 text-white" />
                  </button>
                  <div className="flex-1 text-center">
                    <button
                      onClick={goToToday}
                      className="text-white hover:underline text-sm sm:text-base font-medium"
                    >
                      {new Date(startDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: new Date(startDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })} - {new Date(displayDays[6].date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </button>
                    <p className="text-orange-100 text-xs mt-0.5">Next 7 days</p>
                  </div>
                  <button
                    onClick={() => navigateDays('next')}
                    className="p-1.5 sm:p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors touch-manipulation"
                    aria-label="Next 7 days"
                  >
                    <ChevronRight size={18} className="sm:w-5 sm:h-5 text-white" />
                  </button>
                </div>
              )}

              <div 
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide overscroll-contain"
                style={{
                  touchAction: 'pan-x',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <button
                  onClick={() => setActiveTab('week')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all flex-shrink-0 touch-manipulation ${
                    activeTab === 'week'
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                  }`}
                >
                  <Calendar size={18} />
                  <span className="hidden sm:inline">Week</span>
                </button>
                <button
                  onClick={() => setActiveTab('library')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all flex-shrink-0 touch-manipulation ${
                    activeTab === 'library'
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                  }`}
                >
                  <BookOpen size={18} />
                  <span className="hidden sm:inline">Library</span>
                </button>
                <button
                  onClick={() => setActiveTab('favourites')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all flex-shrink-0 touch-manipulation ${
                    activeTab === 'favourites'
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                  }`}
                >
                  <Heart size={18} />
                  <span className="hidden sm:inline">Favourites</span>
                </button>
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all flex-shrink-0 touch-manipulation ${
                    activeTab === 'recipes'
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                  }`}
                >
                  <ChefHat size={18} />
                  <span className="hidden sm:inline">Recipes</span>
                </button>
              </div>
            </div>

            {/* Main scroll container - only one scroll authority for mobile */}
            <div 
              className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50 to-white"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              {activeTab === 'week' && (
                <div className="p-4 sm:p-6 space-y-4">
                  {loadingCritical ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-orange-600">Loading meals...</div>
                    </div>
                  ) : (
                    displayDays.map((dayInfo, dayIndex) => {
                      const today = new Date();
                      const isToday = dayInfo.date.toDateString() === today.toDateString();
                      const dateStr = dayInfo.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      });
                      
                      return (
                        <div key={`${dayInfo.date.toISOString()}-${dayIndex}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          {/* Day Header */}
                          <div className={`px-4 py-3 border-b border-gray-100 ${isToday ? 'bg-gradient-to-r from-orange-50 to-amber-50' : 'bg-gray-50'}`}>
                            <h3 className={`font-bold text-base sm:text-lg ${isToday ? 'text-orange-900' : 'text-gray-900'}`}>
                              {dayInfo.dayName}
                              {isToday && <span className="ml-2 text-sm font-normal text-orange-600">(Today)</span>}
                              <span className="ml-2 text-sm font-normal text-gray-500">{dateStr}</span>
                            </h3>
                          </div>

                          {/* Meal Cards - Grouped by Meal Type (Breakfast, Lunch, Dinner) */}
                          <div className="p-3 sm:p-4 space-y-4">
                            {/* Always show Breakfast, Lunch, Dinner sections */}
                            {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
                              // Find or create the slot for this meal type
                              const slots = getSlotsForDayIndex(dayIndex);
                              let slot = slots.find(s => {
                                const slotMealType = s.mealTypeMapping || s.id;
                                return slotMealType === mealType;
                              });

                              // If no slot exists, create a default one
                              if (!slot) {
                                slot = {
                                  id: mealType,
                                  label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                                  type: 'meal' as const,
                                  default: true,
                                  order: mealType === 'breakfast' ? 0 : mealType === 'lunch' ? 1 : 2,
                                  mealTypeMapping: mealType as any,
                                };
                              }

                              // Meal type styling
                              const mealTypeStyles: Record<string, any> = {
                                breakfast: {
                                  bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
                                  border: 'border-amber-200',
                                  icon: '🍳',
                                  text: 'text-amber-700',
                                  label: 'Breakfast',
                                },
                                lunch: {
                                  bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
                                  border: 'border-green-200',
                                  icon: '🥪',
                                  text: 'text-green-700',
                                  label: 'Lunch',
                                },
                                dinner: {
                                  bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
                                  border: 'border-purple-200',
                                  icon: '🍲',
                                  text: 'text-purple-700',
                                  label: 'Dinner',
                                },
                              };

                              const styles = mealTypeStyles[mealType] || {
                                bg: 'bg-gray-50',
                                border: 'border-gray-200',
                                icon: '🍽️',
                                text: 'text-gray-700',
                                label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                              };

                              return (
                                <div key={mealType} className="space-y-2">
                                  {/* Meal Type Header - Always visible */}
                                  <div className="flex items-center gap-2 px-2 pb-1">
                                    <span className="text-lg">{styles.icon}</span>
                                    <h4 className={`text-sm font-bold ${styles.text} uppercase tracking-wide`}>
                                      {styles.label}
                                    </h4>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                  </div>

                                  {/* Render meals for this meal type */}
                                  {renderMealSlot(slot, dayIndex, true)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'library' && (
                /* Library tab content - inherits scroll from parent, no nested scroll */
                <div className="p-6">
                  <RecipeSearchWithAI
                    spaceId={currentSpaceId}
                    // No onSelectRecipe - recipes navigate directly to detail page
                  />
                </div>
              )}

              {activeTab === 'favourites' && (
                <div className="p-6">
                  {favouriteMeals.length === 0 && favouriteRecipes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Heart size={48} className="mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No favourites yet</p>
                      <p className="text-sm">Add meals or recipes to your favourites from the Library or Recipes tab</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Display meal favorites */}
                      {favouriteMeals.map(meal => {
                        const pantryMatch = recipePantryMatches.get(meal.id);
                        
                        // CRITICAL: Use touch-action: pan-y to allow scrolling when dragging on meal cards
                        return (
                          <div key={meal.id} className="bg-white rounded-xl p-4 border-2 border-orange-100 hover:border-orange-300 active:scale-[0.98] transition-all shadow-sm" style={{ touchAction: 'pan-y' }}>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-gray-900 flex-1 pr-2">{meal.name}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavourite(meal.id);
                                }}
                                className="text-red-500 hover:text-red-600 active:scale-110 transition-all flex-shrink-0 touch-manipulation"
                                aria-label="Remove from favourites"
                              >
                                <Heart size={20} className="fill-red-500" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span className="capitalize">{meal.meal_type}</span>
                              {meal.prep_time && (
                                <>
                                  <span>•</span>
                                  <Clock size={14} />
                                  <span>{meal.prep_time + (meal.cook_time || 0)} min</span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {meal.categories.slice(0, 3).map(cat => (
                                <span key={cat} className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded font-medium">
                                  {cat.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                            
                            {/* Pantry Awareness */}
                            {pantryMatch && (
                              <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                                {pantryMatch.matchPercentage === 100 ? (
                                  <>
                                    <CheckCircle2 size={12} className="text-green-500" />
                                    <span>All ingredients in pantry</span>
                                  </>
                                ) : pantryMatch.missingCount > 0 ? (
                                  <>
                                    <Package size={12} className="text-gray-400" />
                                    <span>{pantryMatch.missingCount} missing</span>
                                  </>
                                ) : null}
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (!user) return;
                                  const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('id')
                                    .eq('id', user.id)
                                    .maybeSingle();
                                  if (profile) {
                                    const todayDayInfo = displayDays[0];
                                    await addMealToPlan(currentSpaceId, meal.id, null, meal.meal_type as any, todayDayInfo.dayOfWeek, todayDayInfo.weekStartDate, profile.id, undefined, 1, 'main');
                                    await loadMealPlans();
                                    setActiveTab('week');
                                    showToast('success', 'Meal added to plan');
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                              >
                                Add to Week
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSlot({ day: 'Monday', dayIndex: 0, mealType: meal.meal_type as any });
                                  setShowMealPicker(true);
                                }}
                                className="px-3 py-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                                aria-label="Choose day"
                              >
                                Choose Day
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Display recipe favorites */}
                      {favouriteRecipes.map(recipe => {
                        const pantryMatch = recipePantryMatches.get(recipe.id);
                        
                        // CRITICAL: Use touch-action: pan-y to allow scrolling when dragging on recipe cards
                        return (
                          <div key={`recipe-${recipe.id}`} className="bg-white rounded-xl p-4 border-2 border-orange-100 hover:border-orange-300 active:scale-[0.98] transition-all shadow-sm" style={{ touchAction: 'pan-y' }}>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-gray-900 flex-1 pr-2">{recipe.name}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Add remove recipe favorite handler
                                  navigate(`/recipes/${recipe.id}`);
                                }}
                                className="text-red-500 hover:text-red-600 active:scale-110 transition-all flex-shrink-0 touch-manipulation"
                                aria-label="View recipe"
                              >
                                <Heart size={20} className="fill-red-500" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span>Recipe</span>
                              {recipe.total_time && (
                                <>
                                  <span>•</span>
                                  <Clock size={14} />
                                  <span>{recipe.total_time} min</span>
                                </>
                              )}
                            </div>
                            
                            {/* Pantry Awareness */}
                            {pantryMatch && (
                              <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                                {pantryMatch.matchPercentage === 100 ? (
                                  <>
                                    <CheckCircle2 size={12} className="text-green-500" />
                                    <span>All ingredients in pantry</span>
                                  </>
                                ) : pantryMatch.missingCount > 0 ? (
                                  <>
                                    <Package size={12} className="text-gray-400" />
                                    <span>{pantryMatch.missingCount} missing</span>
                                  </>
                                ) : null}
                              </div>
                            )}
                            
                            <button
                              onClick={() => {
                                navigate(`/recipes/${recipe.id}`);
                              }}
                              className="w-full px-3 py-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                            >
                              View Recipe
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recipes' && (
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button
                      onClick={() => setShowAddRecipeURL(true)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 transition-colors flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <LinkIcon size={20} />
                      <span className="hidden sm:inline">Add Recipe from URL</span>
                      <span className="sm:hidden">Add from URL</span>
                    </button>
                    <button
                      onClick={handleCreateRecipe}
                      className="flex-1 px-4 py-2.5 border-2 border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-colors flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <ChefHat size={20} />
                      <span className="hidden sm:inline">Create Custom Recipe</span>
                      <span className="sm:hidden">Create Recipe</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search recipes..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                          showFilters ? 'bg-orange-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Filter size={18} />
                        Filters
                      </button>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'recent' | 'votes')}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-medium"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="votes">Most Loved</option>
                      </select>
                    </div>

                    {showFilters && (
                      <div className="flex flex-wrap gap-2">
                        {['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'quick-meal', '15-min', 'healthy', 'kid-friendly'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTags(prev =>
                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedTags.includes(tag)
                                ? 'bg-orange-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {recipeLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <ChefHat size={48} className="mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No recipes yet</p>
                      <p className="text-sm">Add recipes from TikTok, Instagram, Pinterest, or any recipe website</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recipeLinks.map(recipe => (
                        // CRITICAL: Use touch-action: pan-y to allow scrolling when dragging on recipe cards
                        <div key={recipe.id} className="bg-white rounded-xl overflow-hidden border-2 border-gray-100 hover:border-orange-300 active:scale-[0.98] transition-all shadow-sm group" style={{ touchAction: 'pan-y' }}>
                          {recipe.image_url && (
                            <div className="relative h-40 bg-gray-100">
                              <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <button
                                onClick={() => handleEditRecipeIcon(recipe)}
                                className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg p-2 transition-all hover:scale-110 shadow-md"
                                title="Change icon"
                              >
                                <span className="text-2xl animate-fadeIn">
                                  {getRecipeIcon(recipe.icon_name) || '⚪'}
                                </span>
                              </button>
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <span>{getPlatformIcon(recipe.source_platform)}</span>
                                {recipe.source_platform}
                              </div>
                            </div>
                          )}

                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-gray-900 flex-1 line-clamp-2">{recipe.title}</h4>
                              <button
                                onClick={() => handleToggleRecipeVote(recipe.id)}
                                className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors rounded flex-shrink-0"
                              >
                                <Star
                                  size={18}
                                  className={recipe.user_voted ? 'fill-orange-500 text-orange-500' : ''}
                                />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                              <Star size={14} className="fill-orange-400 text-orange-400" />
                              <span className="font-semibold">{recipe.vote_count || 0}</span>
                              {recipe.notes && (
                                <>
                                  <span>•</span>
                                  <StickyNote size={14} />
                                </>
                              )}
                            </div>

                            {recipe.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {recipe.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                                    {tag}
                                  </span>
                                ))}
                                {recipe.tags.length > 3 && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                                    +{recipe.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <a
                                href={recipe.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-1 touch-manipulation"
                              >
                                <ExternalLink size={14} />
                                Open
                              </a>
                              <button
                                onClick={() => setSelectedRecipe(recipe)}
                                className="flex-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                              >
                                Add to Plan
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
                                  handleDeleteRecipeLink(recipe.id);
                                }
                              }}
                              className="w-full mt-2 px-3 py-1.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors text-sm font-medium touch-manipulation"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-lg">Custom Recipes</h3>
                    </div>

                    {recipeMeals.length === 0 ? (
                      <p className="text-gray-500 text-sm">No custom recipes created yet</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recipeMeals.map(meal => (
                          // CRITICAL: Use touch-action: pan-y to allow scrolling when dragging on meal cards
                          <div key={meal.id} className="bg-white rounded-xl p-4 border-2 border-blue-100 hover:border-blue-300 active:scale-[0.98] transition-all shadow-sm" style={{ touchAction: 'pan-y' }}>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-gray-900 flex-1">{meal.name}</h4>
                              <div className="flex gap-1">
                                {/* Small action buttons: touch-manipulation is OK for discrete actions like edit/delete */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRecipe(meal);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors rounded touch-manipulation"
                                  aria-label="Edit recipe"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete "${meal.name}"?`)) {
                                      handleDeleteRecipe(meal.id);
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors rounded touch-manipulation"
                                  aria-label="Delete recipe"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span className="capitalize">{meal.meal_type}</span>
                              {meal.prep_time && (
                                <>
                                  <span>•</span>
                                  <Clock size={14} />
                                  <span>{meal.prep_time + (meal.cook_time || 0)} min</span>
                                </>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (!user) return;
                                  const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('id')
                                    .eq('id', user.id)
                                    .maybeSingle();
                                  if (profile) {
                                    const todayDayInfo = displayDays[0];
                                    await addMealToPlan(currentSpaceId, meal.id, null, meal.meal_type as any, todayDayInfo.dayOfWeek, todayDayInfo.weekStartDate, profile.id, undefined, 1, 'main');
                                    await loadMealPlans();
                                    setActiveTab('week');
                                    showToast('success', 'Recipe added to plan');
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                              >
                                Add to Week
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSlot({ day: 'Monday', dayIndex: 0, mealType: meal.meal_type as any });
                                  setShowMealPicker(true);
                                }}
                                className="px-3 py-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                                aria-label="Choose day"
                              >
                                Choose Day
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showRecipeForm && (
          <RecipeFormModal
            isOpen={showRecipeForm}
            onClose={() => {
              setShowRecipeForm(false);
              setEditingRecipe(undefined);
            }}
            onSave={handleSaveRecipe}
            existingRecipe={editingRecipe}
            householdId={currentSpaceId}
          />
        )}

        {showAddRecipeURL && (
          <AddRecipeFromURLModal
            isOpen={showAddRecipeURL}
            onClose={() => setShowAddRecipeURL(false)}
            onSave={handleAddRecipeFromURL}
          />
        )}

        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4 safe-top safe-bottom">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{selectedRecipe.title}</h2>
                  {selectedRecipe.notes && (
                    <p className="text-orange-100 text-sm mt-1 line-clamp-2">{selectedRecipe.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg p-2 transition-colors flex-shrink-0 touch-manipulation ml-2"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Recipe detail content - inherits scroll from parent modal container */}
              <div className="p-6">
                {/* Recipe Info */}
                <div className="mb-6">
                  {selectedRecipe.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={selectedRecipe.image_url}
                        alt={selectedRecipe.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="fill-orange-400 text-orange-400" />
                      <span className="font-semibold">{selectedRecipe.vote_count || 0}</span>
                    </div>
                    {selectedRecipe.source_platform && (
                      <div className="flex items-center gap-1">
                        <span>{getPlatformIcon(selectedRecipe.source_platform)}</span>
                        <span>{selectedRecipe.source_platform}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedRecipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedRecipe.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Meal Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => (
                      <button
                        key={mealType}
                        onClick={() => setSelectedMealType(mealType)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium transition-all touch-manipulation flex items-center justify-center gap-1 ${
                          selectedMealType === mealType
                            ? 'bg-orange-100 border-orange-400 text-orange-700'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {getMealIcon(mealType)}
                        <span className="capitalize text-sm">{mealType}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose Day</label>
                  <div className="space-y-2">
                    {displayDays.map((dayInfo, index) => {
                      const dateStr = dayInfo.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      });
                      return (
                        <button
                          key={`${dayInfo.date.toISOString()}-${index}`}
                          onClick={async () => {
                            if (!user) return;
                            const { data: profile } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('id', user.id)
                              .maybeSingle();
                            if (profile) {
                              await addMealToPlan(currentSpaceId, null, selectedRecipe.title, selectedMealType, dayInfo.dayOfWeek, dayInfo.weekStartDate, profile.id, undefined, 1, 'main');
                              await loadMealPlans();
                              setSelectedRecipe(null);
                              setActiveTab('week');
                              showToast('success', 'Recipe added to meal plan');
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-orange-50 active:bg-orange-100 border-2 border-gray-200 hover:border-orange-300 text-gray-900 font-medium rounded-lg transition-all touch-manipulation"
                        >
                          {dayInfo.dayName} {dateStr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-200 flex gap-2 flex-shrink-0">
                <a
                  href={selectedRecipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 touch-manipulation"
                >
                  <ExternalLink size={16} />
                  View Recipe
                </a>
                <button
                  onClick={() => {
                    setSelectedRecipe(null);
                    setSelectedMealType('dinner'); // Reset to default
                  }}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Meal Panel - Full-screen overlay with proper scroll lock */}
        {showAddMealSheet && selectedSlot && (
          <AddMealPanelOverlay
            onClose={() => {
              setShowAddMealSheet(false);
              setSelectedSlot(null);
            }}
            onSelectMeal={handleSelectMeal}
            onSelectExternalMeal={handleSelectExternalMeal}
            spaceId={currentSpaceId}
            dayName={selectedSlot.day}
            mealType={selectedSlot.mealType}
          />
        )}

        {/* Weekly Pantry Check Sheet */}
        {showPantryCheck && weekStartDates.length > 0 && (
          <WeeklyPantryCheckSheet
            isOpen={showPantryCheck}
            onClose={() => setShowPantryCheck(false)}
            householdId={currentSpaceId}
            weekStartDate={weekStartDates[0]} // Use first week start date (primary week)
            onPantryUpdated={() => {
              // Refresh pantry status after pantry update
              if (weekStartDates.length > 0) {
                checkPantryStatus(weekStartDates[0], currentSpaceId);
              }
            }}
            onGroceryListUpdated={() => {
              // Could refresh grocery list widget if needed
            }}
          />
        )}

        {/* Meal Detail Bottom Sheet */}
        {showMealDetailSheet && selectedMealPlan && (
          <MealDetailBottomSheet
            isOpen={showMealDetailSheet}
            onClose={() => {
              setShowMealDetailSheet(false);
              setSelectedMealPlan(null);
            }}
            mealPlan={selectedMealPlan}
            onReplace={() => {
              // Find the dayIndex that matches this meal plan's date
              const planDate = new Date(selectedMealPlan.week_start_date);
              planDate.setDate(planDate.getDate() + selectedMealPlan.day_of_week);
              const dateKey = planDate.toISOString().split('T')[0];
              const dayIndex = displayDays.findIndex(d => d.date.toISOString().split('T')[0] === dateKey);
              
              if (dayIndex >= 0) {
                const dayInfo = displayDays[dayIndex];
                const mealType = selectedMealPlan.meal_type as 'breakfast' | 'lunch' | 'dinner';
                setSelectedSlot({ 
                  day: dayInfo.dayName, 
                  dayIndex, 
                  mealType,
                  date: dayInfo.date.toISOString().split('T')[0],
                  weekStartDate: dayInfo.weekStartDate,
                  dayOfWeek: dayInfo.dayOfWeek
                });
                setShowAddMealSheet(true);
              }
            }}
            onRemove={async () => {
              await handleRemoveMeal(selectedMealPlan.id);
            }}
            onViewRecipe={() => {
              // Navigate to recipe detail page if recipe_id exists
              if (selectedMealPlan.recipe_id) {
                navigate(`/recipes/${selectedMealPlan.recipe_id}`);
              }
            }}
          />
        )}

        {/* Legacy Meal Picker Modal (fallback) */}
        {showMealPicker && selectedSlot && (
          <MealPickerModal
            isOpen={showMealPicker}
            onClose={() => {
              setShowMealPicker(false);
              setSelectedSlot(null);
            }}
            onSelectMeal={handleSelectMeal}
            householdId={currentSpaceId}
            dayName={selectedSlot.day}
            mealType={selectedSlot.mealType}
          />
        )}

        {showIconPicker && editingIconRecipe && (
          <RecipeIconPickerModal
            isOpen={showIconPicker}
            onClose={() => {
              setShowIconPicker(false);
              setEditingIconRecipe(null);
            }}
            currentIconName={editingIconRecipe.icon_name}
            onSave={handleSaveRecipeIcon}
          />
        )}

        {/* Makeable Recipes Modal */}
        <MakeableRecipesModal
          isOpen={showMakeableRecipes}
          onClose={() => setShowMakeableRecipes(false)}
          spaceId={currentSpaceId}
          onAddToMealPlan={(recipe) => {
            setShowMakeableRecipes(false);
            // Optionally reload meal plans
            loadMealPlans();
          }}
        />

        {/* Meal Planner Settings */}
        {showSettings && (
          <MealPlannerSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            spaceId={currentSpaceId}
          />
        )}

        {/* Weekly Pantry Check Sheet (for widget view) */}
        {showPantryCheck && weekStartDates.length > 0 && (
          <WeeklyPantryCheckSheet
            isOpen={showPantryCheck}
            onClose={() => setShowPantryCheck(false)}
            householdId={currentSpaceId}
            weekStartDate={weekStartDates[0]} // Use first week start date (primary week)
            onPantryUpdated={() => {
              // Refresh pantry status after pantry update
              if (weekStartDates.length > 0) {
                checkPantryStatus(weekStartDates[0], currentSpaceId);
              }
            }}
            onGroceryListUpdated={() => {
              // Could refresh grocery list widget if needed
            }}
          />
        )}
      </>
    );

    return createPortal(fullscreenContent, document.body);
  }

  if (viewMode === 'icon') {
    const totalMeals = getTotalMeals();
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 border-orange-600 border-2 rounded-2xl flex flex-col items-center justify-center shadow-lg">
        <UtensilsCrossed size={32} className="text-white" />
        {totalMeals > 0 && (
          <div className="absolute top-1 right-1 bg-white text-orange-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {totalMeals}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    const totalMeals = getTotalMeals();
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 border-2 rounded-2xl p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <UtensilsCrossed size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-orange-900 text-sm">Meal Plan</h3>
          </div>
          <span className="text-xs font-semibold text-orange-600 bg-orange-200 px-2 py-0.5 rounded-full">
            {totalMeals}
          </span>
        </div>

        {loadingCritical ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-xs text-orange-600 italic">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1.5">
              {displayDays.slice(0, 3).map((dayInfo, index) => {
                const slots = getSlotsForDayIndex(index);
                const mealSlots = slots.filter(s => s.type === 'meal');
                const dayMeals = mealSlots.filter(slot => {
                  const mealType = slot.mealTypeMapping || slot.id;
                  return getMealPlan(index, mealType) !== null;
                }).length;
                return (
                  <div key={`${dayInfo.date.toISOString()}-${index}`} className="bg-white/60 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">{dayInfo.dayName.slice(0, 3)}</span>
                      <span className="text-xs text-orange-600">{dayMeals}/{mealSlots.length}</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 text-center mt-2">+{displayDays.length - 3} more days</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default widget view - Mobile-first vertical card design
  return (
    <>
      {/* Default widget view - single scroll container for mobile */}
      <div className="w-full h-full bg-gradient-to-b from-orange-50 to-white border-orange-300 border-2 rounded-2xl flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-left w-full">
                  <button
                    onClick={() => setShowTabMenu(true)}
                    className="text-left w-full"
                  >
                    <h3 className="font-bold text-white text-sm">Meal Planner</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {activeTab === 'week' && <Calendar size={12} className="text-orange-100" />}
                      {activeTab === 'library' && <BookOpen size={12} className="text-orange-100" />}
                      {activeTab === 'favourites' && <Heart size={12} className="text-orange-100" />}
                      {activeTab === 'recipes' && <ChefHat size={12} className="text-orange-100" />}
                      <p className="text-orange-100 text-xs truncate capitalize">
                        {activeTab === 'week' ? 'Week' : activeTab === 'library' ? 'Library' : activeTab === 'favourites' ? 'Favourites' : 'Recipes'}
                      </p>
                      {availableSpaces.length === 1 && !spacesLoading && (
                        <>
                          <span className="text-orange-200">•</span>
                          <p className="text-orange-100 text-xs truncate">
                            {availableSpaces.find(s => s.id === currentSpaceId)?.name || 'Personal'}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                  {availableSpaces.length > 1 && !spacesLoading && (
                    <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-orange-200 text-xs">•</span>
                      <SpaceContextSwitcher
                        currentSpaceId={currentSpaceId}
                        onSpaceChange={setCurrentSpace}
                        availableSpaces={availableSpaces}
                        className="[&_button]:bg-white/20 [&_button]:border-white/30 [&_button]:text-white [&_button:hover]:bg-white/30 [&_button]:text-xs [&_button]:px-2 [&_button]:py-0.5 [&_button]:h-auto [&_button]:min-h-0 [&_button_span]:text-orange-100 [&_button_span]:font-normal [&_button_svg]:text-orange-100 [&_button_svg]:w-3 [&_button_svg]:h-3 [&_div]:text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowMakeableRecipes(true)}
                className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg px-2 py-1 text-xs font-medium transition-colors touch-manipulation flex items-center gap-1"
                title="What can I make?"
              >
                <Sparkles size={12} />
                <span className="hidden sm:inline">What can I make?</span>
              </button>
              <button
                onClick={() => setShowPantryCheck(true)}
                className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg p-1.5 transition-colors touch-manipulation relative"
                title="Check pantry for this week's meals"
                aria-label="Weekly Pantry Check"
              >
                <Package size={16} />
                {/* Badge indicator */}
                {pantryCheckStatus === 'all-covered' && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
                )}
                {pantryCheckStatus === 'some-missing' && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg p-1.5 transition-colors touch-manipulation"
                title="Settings"
                aria-label="Meal Planner Settings"
              >
                <SettingsIcon size={16} />
              </button>
              <button
                onClick={() => {
                  setShowFullView(true);
                  setActiveTab('library');
                  onViewModeChange?.('xlarge');
                  onFullscreenChange?.(true);
                }}
                className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg px-2 py-1 text-xs font-medium transition-colors touch-manipulation"
              >
                View All
              </button>
            </div>
          </div>

          {/* Date Navigation - Only show for Week tab */}
          {activeTab === 'week' && (
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-1.5 mt-2">
              <button
                onClick={() => navigateDays('prev')}
                className="p-1 hover:bg-white/20 active:bg-white/30 rounded transition-colors touch-manipulation"
                aria-label="Previous 7 days"
              >
                <ChevronLeft size={16} className="text-white" />
              </button>
              <button
                onClick={() => setShowWeekPicker(true)}
                className="text-white text-xs font-medium hover:bg-white/20 active:bg-white/30 rounded px-3 py-1.5 flex-1 text-center transition-colors touch-manipulation flex items-center justify-center gap-1.5"
              >
                <Calendar size={14} />
                {new Date(startDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })} - {new Date(displayDays[6].date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}
              </button>
              <button
                onClick={() => navigateDays('next')}
                className="p-1 hover:bg-white/20 active:bg-white/30 rounded transition-colors touch-manipulation"
                aria-label="Next 7 days"
              >
                <ChevronRight size={16} className="text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Content based on active tab - SINGLE scroll authority for mobile */}
        <div 
          className="flex-1 overflow-y-auto p-3"
          style={{
            overscrollBehavior: 'contain', // Prevent scroll chaining
            WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
            touchAction: 'pan-y', // Allow vertical scrolling only
          }}
        >
          {activeTab === 'week' && (
            <div className="space-y-3">
              {loadingCritical ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-orange-600 text-sm">Loading meals...</div>
                </div>
              ) : (
                <>
                  {/* Empty state message (only shown when no meals, but slots are still visible) */}
                  {getTotalMeals() === 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl text-center">
                      <div className="text-4xl mb-2">🍽️</div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm">Your meal plan starts here</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Tap any meal slot below to add something delicious
                      </p>
                      <button
                        onClick={() => setShowMakeableRecipes(true)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium rounded-lg transition-colors text-xs touch-manipulation flex items-center gap-2 mx-auto"
                      >
                        <Sparkles size={14} />
                        What can I make?
                      </button>
                    </div>
                  )}
                  
                  {/* Weekly View - Always show meal slots */}
                  {displayDays.map((dayInfo, dayIndex) => {
              const today = new Date();
              const isToday = dayInfo.date.toDateString() === today.toDateString();
              const dateStr = dayInfo.date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
              
              return (
                <div key={`${dayInfo.date.toISOString()}-${dayIndex}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Day Header */}
                  <div className={`px-3 py-2 border-b border-gray-100 ${isToday ? 'bg-gradient-to-r from-orange-50 to-amber-50' : 'bg-gray-50'}`}>
                    <h4 className={`font-bold text-sm ${isToday ? 'text-orange-900' : 'text-gray-900'}`}>
                      {dayInfo.dayName}
                      {isToday && <span className="ml-1.5 text-xs font-normal text-orange-600">(Today)</span>}
                      <span className="ml-1.5 text-xs font-normal text-gray-500">{dateStr}</span>
                    </h4>
                  </div>

                  {/* Meal Cards - Grouped by Meal Type (Breakfast, Lunch, Dinner) */}
                  <div className="p-2 space-y-3">
                    {/* Always show Breakfast, Lunch, Dinner sections */}
                    {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
                      // Find or create the slot for this meal type
                      const slots = getSlotsForDayIndex(dayIndex);
                      let slot = slots.find(s => {
                        const slotMealType = s.mealTypeMapping || s.id;
                        return slotMealType === mealType;
                      });

                      // If no slot exists, create a default one
                      if (!slot) {
                        slot = {
                          id: mealType,
                          label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                          type: 'meal' as const,
                          default: true,
                          order: mealType === 'breakfast' ? 0 : mealType === 'lunch' ? 1 : 2,
                          mealTypeMapping: mealType as any,
                        };
                      }

                      // Meal type styling
                      const mealTypeStyles: Record<string, any> = {
                        breakfast: {
                          bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
                          border: 'border-amber-200',
                          icon: '🍳',
                          text: 'text-amber-700',
                          label: 'Breakfast',
                        },
                        lunch: {
                          bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
                          border: 'border-green-200',
                          icon: '🥪',
                          text: 'text-green-700',
                          label: 'Lunch',
                        },
                        dinner: {
                          bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
                          border: 'border-purple-200',
                          icon: '🍲',
                          text: 'text-purple-700',
                          label: 'Dinner',
                        },
                      };

                      const styles = mealTypeStyles[mealType] || {
                        bg: 'bg-gray-50',
                        border: 'border-gray-200',
                        icon: '🍽️',
                        text: 'text-gray-700',
                        label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                      };

                      return (
                        <div key={mealType} className="space-y-1.5">
                          {/* Meal Type Header - Always visible */}
                          <div className="flex items-center gap-1.5 px-1.5 pb-0.5">
                            <span className="text-base">{styles.icon}</span>
                            <h4 className={`text-xs font-bold ${styles.text} uppercase tracking-wide`}>
                              {styles.label}
                            </h4>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>

                          {/* Render meals for this meal type */}
                          {renderMealSlot(slot, dayIndex, false)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
                </>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            /* Library tab - inherits scroll from parent, no nested scroll */
            <RecipeSearchWithAI
              spaceId={currentSpaceId}
              // No onSelectRecipe - recipes navigate directly to detail page
            />
          )}

          {activeTab === 'favourites' && (
            <div className="space-y-4">
              {loadingDeferred ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-orange-600 text-sm">Loading...</div>
                </div>
              ) : favouriteMeals.length === 0 && favouriteRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
                  <Heart size={48} className="text-gray-300 mb-4" />
                  <h4 className="font-semibold text-gray-900 mb-2">No favourites yet</h4>
                  <p className="text-sm text-gray-500">
                    Add meals or recipes to favourites from the Library or Recipes tab
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Display meal favorites */}
                  {favouriteMeals.slice(0, 10).map(meal => (
                    <button
                      key={`meal-${meal.id}`}
                      onClick={() => {
                        setSelectedSlot({ day: 'Monday', dayIndex: 0, mealType: meal.meal_type as any });
                        setShowAddMealSheet(true);
                      }}
                      className="w-full text-left bg-white rounded-xl p-3 border-2 border-red-100 hover:border-red-300 active:scale-[0.98] transition-all"
                      style={{ touchAction: 'pan-y' }}
                    >
                      <div className="flex items-center gap-3">
                        {meal.image_url ? (
                          <img
                            src={meal.image_url}
                            alt={meal.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                            ❤️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{meal.name}</h5>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{meal.meal_type}</span>
                            {meal.prep_time && (
                              <>
                                <span>•</span>
                                <Clock size={10} />
                                <span>{meal.prep_time + (meal.cook_time || 0)} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Display recipe favorites */}
                  {favouriteRecipes.slice(0, 10 - favouriteMeals.length).map(recipe => (
                    <button
                      key={`recipe-${recipe.id}`}
                      onClick={() => {
                        navigate(`/recipes/${recipe.id}`);
                      }}
                      className="w-full text-left bg-white rounded-xl p-3 border-2 border-red-100 hover:border-red-300 active:scale-[0.98] transition-all"
                      style={{ touchAction: 'pan-y' }}
                    >
                      <div className="flex items-center gap-3">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                            ❤️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{recipe.name}</h5>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Recipe</span>
                            {recipe.total_time && (
                              <>
                                <span>•</span>
                                <Clock size={10} />
                                <span>{recipe.total_time} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {(favouriteMeals.length + favouriteRecipes.length) > 10 && (
                    <button
                      onClick={() => {
                        setShowFullView(true);
                        setActiveTab('favourites');
                        onViewModeChange?.('xlarge');
                        onFullscreenChange?.(true);
                      }}
                      className="w-full px-4 py-3 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                    >
                      View all {favouriteMeals.length + favouriteRecipes.length} favourites
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="space-y-4">
              {loadingDeferred ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-orange-600 text-sm">Loading...</div>
                </div>
              ) : recipeMeals.length === 0 && recipeLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
                  <ChefHat size={48} className="text-gray-300 mb-4" />
                  <h4 className="font-semibold text-gray-900 mb-2">No recipes yet</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Add recipes from URLs or create custom recipes
                  </p>
                  <button
                    onClick={() => {
                      setShowFullView(true);
                      setActiveTab('recipes');
                      onViewModeChange?.('xlarge');
                      onFullscreenChange?.(true);
                    }}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                  >
                    Add Recipe
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipeMeals.slice(0, 5).map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setSelectedSlot({ day: 'Monday', dayIndex: 0, mealType: meal.meal_type as any });
                        setShowAddMealSheet(true);
                      }}
                      className="w-full text-left bg-white rounded-xl p-3 border-2 border-blue-100 hover:border-blue-300 active:scale-[0.98] transition-all"
                      style={{ touchAction: 'pan-y' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                          🍳
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{meal.name}</h5>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{meal.meal_type}</span>
                            {meal.prep_time && (
                              <>
                                <span>•</span>
                                <Clock size={10} />
                                <span>{meal.prep_time + (meal.cook_time || 0)} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {(recipeMeals.length > 5 || recipeLinks.length > 0) && (
                    <button
                      onClick={() => {
                        setShowFullView(true);
                        setActiveTab('recipes');
                        onViewModeChange?.('xlarge');
                        onFullscreenChange?.(true);
                      }}
                      className="w-full px-4 py-3 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors text-sm touch-manipulation"
                    >
                      View all recipes
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Meal Panel */}
      {/* Add Meal Panel - Full-screen overlay with proper scroll lock */}
      {showAddMealSheet && selectedSlot && (
        <AddMealPanelOverlay
          onClose={() => {
            setShowAddMealSheet(false);
            setSelectedSlot(null);
          }}
          onSelectMeal={handleSelectMeal}
          spaceId={currentSpaceId}
          dayName={selectedSlot.day}
          mealType={selectedSlot.mealType}
        />
      )}

      {/* Meal Detail Bottom Sheet */}
      {showMealDetailSheet && selectedMealPlan && (
        <MealDetailBottomSheet
          isOpen={showMealDetailSheet}
          onClose={() => {
            setShowMealDetailSheet(false);
            setSelectedMealPlan(null);
          }}
          mealPlan={selectedMealPlan}
          onReplace={() => {
            // Find the dayIndex that matches this meal plan's date
            const planDate = new Date(selectedMealPlan.week_start_date);
            planDate.setDate(planDate.getDate() + selectedMealPlan.day_of_week);
            const dateKey = planDate.toISOString().split('T')[0];
            const dayIndex = displayDays.findIndex(d => d.date.toISOString().split('T')[0] === dateKey);
            
            if (dayIndex >= 0) {
              const dayInfo = displayDays[dayIndex];
              const mealType = selectedMealPlan.meal_type as 'breakfast' | 'lunch' | 'dinner';
              setSelectedSlot({ 
                day: dayInfo.dayName, 
                dayIndex, 
                mealType,
                date: dayInfo.date.toISOString().split('T')[0],
                weekStartDate: dayInfo.weekStartDate,
                dayOfWeek: dayInfo.dayOfWeek
              });
              setShowAddMealSheet(true);
            }
          }}
          onRemove={async () => {
            await handleRemoveMeal(selectedMealPlan.id);
          }}
          onViewRecipe={(currentServings) => {
            // Navigate to recipe detail page if recipe_id exists
            // Pass meal plan context via location state for preparation mode controls
            // Use currentServings from bottom sheet (may have been updated) or fallback to meal plan servings
            if (selectedMealPlan.recipe_id) {
              navigate(`/recipes/${selectedMealPlan.recipe_id}`, {
                state: { 
                  planServings: currentServings ?? selectedMealPlan.servings,
                  mealPlanId: selectedMealPlan.id,
                  spaceId: currentSpaceId,
                },
              });
            }
          }}
          onServingsUpdated={async () => {
            // Reload meal plans to reflect updated servings
            await loadMealPlans();
            // Update selectedMealPlan with fresh data to reflect new servings
            let updated = null;
            const primaryResult = await supabase
              .from('meal_plans')
              .select(`
                *,
                meal:meal_id (*),
                recipe:recipe_id (*)
              `)
              .eq('id', selectedMealPlan.id)
              .single();

            if (
              primaryResult.error?.code === 'PGRST200' &&
              primaryResult.error.message?.includes("relationship between 'meal_plans' and 'recipe_id'")
            ) {
              const fallbackResult = await supabase
                .from('meal_plans')
                .select(`
                  *,
                  meal:meal_id (*)
                `)
                .eq('id', selectedMealPlan.id)
                .single();

              if (!fallbackResult.error && fallbackResult.data) {
                updated = { ...fallbackResult.data, recipe: null };
              }
            } else if (!primaryResult.error && primaryResult.data) {
              updated = primaryResult.data;
            }

            if (updated) {
              setSelectedMealPlan(updated);
            }
          }}
        />
      )}

      {/* Legacy Meal Picker Modal (fallback) */}
      {showMealPicker && selectedSlot && (
        <MealPickerModal
          isOpen={showMealPicker}
          onClose={() => {
            setShowMealPicker(false);
            setSelectedSlot(null);
          }}
          onSelectMeal={handleSelectMeal}
          householdId={currentSpaceId}
          dayName={selectedSlot.day}
          mealType={selectedSlot.mealType}
        />
      )}

      {/* Makeable Recipes Modal */}
      <MakeableRecipesModal
        isOpen={showMakeableRecipes}
        onClose={() => setShowMakeableRecipes(false)}
        spaceId={currentSpaceId}
        onAddToMealPlan={(recipe) => {
          setShowMakeableRecipes(false);
          loadMealPlans();
        }}
      />

      {/* Tab Selection Bottom Sheet Menu */}
      <BottomSheet
        isOpen={showTabMenu}
        onClose={() => setShowTabMenu(false)}
        title="Meal Planner"
        maxHeight="75vh"
      >
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={() => {
              setActiveTab('week');
              setShowTabMenu(false);
              if (activeTab !== 'week') {
                loadMealPlans();
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation ${
              activeTab === 'week'
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-white border-2 border-gray-100 hover:border-gray-200 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'week' ? 'bg-orange-200' : 'bg-gray-100'
              }`}>
                <Calendar size={20} className={activeTab === 'week' ? 'text-orange-700' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Week</h4>
                <p className="text-xs text-gray-500">View your weekly meal plan</p>
              </div>
              {activeTab === 'week' && (
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('library');
              setShowTabMenu(false);
              if (activeTab !== 'library') {
                loadLibraryMeals();
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation ${
              activeTab === 'library'
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-white border-2 border-gray-100 hover:border-gray-200 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'library' ? 'bg-orange-200' : 'bg-gray-100'
              }`}>
                <BookOpen size={20} className={activeTab === 'library' ? 'text-orange-700' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Library</h4>
                <p className="text-xs text-gray-500">Browse all available meals</p>
              </div>
              {activeTab === 'library' && (
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('favourites');
              setShowTabMenu(false);
              if (activeTab !== 'favourites') {
                loadFavourites();
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation ${
              activeTab === 'favourites'
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-white border-2 border-gray-100 hover:border-gray-200 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'favourites' ? 'bg-orange-200' : 'bg-gray-100'
              }`}>
                <Heart size={20} className={activeTab === 'favourites' ? 'text-orange-700 fill-orange-700' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Favourites</h4>
                <p className="text-xs text-gray-500">Your saved favourite meals</p>
              </div>
              {activeTab === 'favourites' && (
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('recipes');
              setShowTabMenu(false);
              if (activeTab !== 'recipes') {
                loadRecipes();
                loadRecipeLinks();
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation ${
              activeTab === 'recipes'
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-white border-2 border-gray-100 hover:border-gray-200 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'recipes' ? 'bg-orange-200' : 'bg-gray-100'
              }`}>
                <ChefHat size={20} className={activeTab === 'recipes' ? 'text-orange-700' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Recipes</h4>
                <p className="text-xs text-gray-500">Custom recipes and links</p>
              </div>
              {activeTab === 'recipes' && (
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              )}
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Meal Planner Settings Modal */}
      {showSettings && currentSpaceId && (
        <MealPlannerSettings
          spaceId={currentSpaceId}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Weekly Pantry Check Sheet (for widget view) */}
      {showPantryCheck && weekStartDates.length > 0 && (
        <WeeklyPantryCheckSheet
          isOpen={showPantryCheck}
          onClose={() => setShowPantryCheck(false)}
          householdId={currentSpaceId}
          weekStartDate={weekStartDates[0]} // Use first week start date (primary week)
          onPantryUpdated={() => {
            // Refresh pantry status after pantry update
            if (weekStartDates.length > 0) {
              checkPantryStatus(weekStartDates[0], currentSpaceId);
            }
          }}
          onGroceryListUpdated={() => {
            // Could refresh grocery list widget if needed
          }}
        />
      )}

      {/* Week Picker Modal */}
      {showWeekPicker && (
        <WeekPickerModal
          currentDate={new Date(startDate)}
          onSelectWeek={(date: Date) => {
            setStartDate(date.toISOString().split('T')[0]);
            setShowWeekPicker(false);
          }}
          onClose={() => setShowWeekPicker(false)}
        />
      )}
    </>
  );
}

/**
 * Week Picker Modal Component
 * Allows users to select a week from a calendar view
 */
function WeekPickerModal({
  currentDate,
  onSelectWeek,
  onClose,
}: {
  currentDate: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
}) {
  // Get week start for current date
  const getWeekStart = (date: Date): Date => {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const [viewDate, setViewDate] = useState(new Date(currentDate));
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getWeekStart(currentDate));

  // Get the first day of the month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the first day of the week for the calendar grid (Sunday = 0)
  const startDay = firstDay.getDay();
  
  // Generate all days in the month
  const daysInMonth = lastDay.getDate();
  const days: (Date | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }


  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if a date is in the current week being viewed
  const isInCurrentWeek = (date: Date): boolean => {
    const currentWeekStart = getWeekStart(currentDate);
    const weekStart = getWeekStart(date);
    return weekStart.getTime() === currentWeekStart.getTime();
  };

  // Check if a date is in the selected week
  const isInSelectedWeek = (date: Date): boolean => {
    if (!selectedWeekStart) return false;
    const weekStart = getWeekStart(date);
    return weekStart.getTime() === selectedWeekStart.getTime();
  };

  const handleDateClick = (date: Date) => {
    const weekStart = getWeekStart(date);
    setSelectedWeekStart(weekStart);
  };

  const handleConfirm = () => {
    onSelectWeek(selectedWeekStart);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedWeekStart(getWeekStart(today));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-top safe-bottom">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-full sm:max-w-md w-full mx-4 my-4 max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Select Week</h2>
            <p className="text-orange-100 text-xs sm:text-sm mt-0.5">
              Choose a week to view
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg p-2 transition-colors touch-manipulation flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Calendar - inherits scroll from parent modal container */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          style={{
            overscrollBehavior: 'contain', // Prevent scroll chaining
            WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
            touchAction: 'pan-y', // Allow vertical scrolling only
          }}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
              aria-label="Next month"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isSelectedWeek = isInSelectedWeek(date);
              const isCurrentWeek = isInCurrentWeek(date);
              const isTodayDate = isToday(date);
              const dayOfWeek = date.getDay();
              const isWeekStart = dayOfWeek === 0; // Sunday
              const isWeekEnd = dayOfWeek === 6; // Saturday

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all touch-manipulation relative ${
                    isSelectedWeek
                      ? 'bg-orange-500 text-white shadow-md'
                      : isCurrentWeek
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                      : isTodayDate
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  } ${
                    isSelectedWeek
                      ? isWeekStart
                        ? 'rounded-l-lg'
                        : isWeekEnd
                        ? 'rounded-r-lg'
                        : ''
                      : ''
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Selected Week Preview */}
          {selectedWeekStart && (
            <div className="mt-4 p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <p className="text-xs font-medium text-orange-800 mb-1">Selected Week</p>
              <p className="text-sm text-orange-700">
                {selectedWeekStart.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })} - {(() => {
                  const weekEnd = new Date(selectedWeekStart);
                  weekEnd.setDate(weekEnd.getDate() + 6);
                  return weekEnd.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  });
                })()}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={goToToday}
              className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation font-medium"
            >
              Go to Today
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-4 flex gap-3 justify-end flex-shrink-0 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors touch-manipulation text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors touch-manipulation text-sm"
          >
            Select Week
          </button>
        </div>
      </div>
    </div>
  );
}
