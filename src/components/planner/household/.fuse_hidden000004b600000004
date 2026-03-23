import { useState, useEffect } from 'react';
import { UtensilsCrossed, Coffee, Sun, Moon, X, Plus, Calendar, BookOpen, Heart, ChefHat, Clock, Edit, Trash2, Link as LinkIcon, Star, Search, Filter, ExternalLink, StickyNote } from 'lucide-react';
import { getWeeklyMealPlan, addMealToPlan, addRecipeToPlan, removeMealFromPlan, getWeekStartDate, getMealLibrary, getHouseholdFavourites, toggleMealFavourite, createCustomMeal, updateCustomMeal, deleteCustomMeal, type MealLibraryItem, type MealPlan } from '../../../lib/mealPlanner';
import { getHouseholdRecipeLinks, createRecipeLink, deleteRecipeLink, toggleRecipeVote, updateRecipeIcon, getPlatformIcon, type RecipeLink } from '../../../lib/recipeLinks';
import { getRecipeIcon } from '../../../lib/recipeIcons';
import { MealPickerModal } from '../../meal-planner/MealPickerModal';
import { RecipeFormModal, type RecipeFormData } from '../../meal-planner/RecipeFormModal';
import { AddRecipeFromURLModal } from '../../meal-planner/AddRecipeFromURLModal';
import { RecipeIconPickerModal } from '../../meal-planner/RecipeIconPickerModal';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { PlannerShell } from '../PlannerShell';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

type MealPlannerTab = 'week' | 'library' | 'favourites' | 'recipes';

export function HouseholdMeals() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mealPlans, setMealPlans] = useState<Record<string, MealPlan>>({});
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<MealPlannerTab>('week');
  const [allMeals, setAllMeals] = useState<MealLibraryItem[]>([]);
  const [favouriteMeals, setFavouriteMeals] = useState<MealLibraryItem[]>([]);
  const [recipeMeals, setRecipeMeals] = useState<MealLibraryItem[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; dayIndex: number; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const weekStartDate = getWeekStartDate();
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MealLibraryItem | undefined>(undefined);
  const [recipeLinks, setRecipeLinks] = useState<RecipeLink[]>([]);
  const [showAddRecipeURL, setShowAddRecipeURL] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'votes'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeLink | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingIconRecipe, setEditingIconRecipe] = useState<RecipeLink | null>(null);

  useEffect(() => {
    loadHousehold();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLibraryMeals();
      loadRecipes();
    }
  }, [user]);

  useEffect(() => {
    if (householdId) {
      loadMealPlans();
      loadFavourites();
      loadRecipeLinks();
    }
  }, [householdId, weekStartDate]);

  const loadHousehold = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const { data: membership } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership?.space_id) {
        setHouseholdId(membership.space_id);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  };

  const loadMealPlans = async () => {
    setLoading(true);
    try {
      const plans = await getWeeklyMealPlan(householdId, weekStartDate);
      const plansMap: Record<string, MealPlan> = {};

      plans.forEach(plan => {
        const key = `${plan.day_of_week}-${plan.meal_type}`;
        plansMap[key] = plan;
      });

      setMealPlans(plansMap);
    } catch (error) {
      console.error('Failed to load meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLibraryMeals = async () => {
    try {
      const meals = await getMealLibrary();
      setAllMeals(meals);
    } catch (error) {
      console.error('Failed to load meal library:', error);
    }
  };

  const loadFavourites = async () => {
    try {
      const favourites = await getHouseholdFavourites(householdId);
      const meals = favourites.map(f => f.meal).filter(Boolean) as MealLibraryItem[];
      setFavouriteMeals(meals);
      setFavouriteIds(new Set(meals.map(m => m.id)));
    } catch (error) {
      console.error('Failed to load favourites:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
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

  const handleAddMeal = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setSelectedSlot({ day: DAYS[dayIndex], dayIndex, mealType });
    setShowMealPicker(true);
  };

  const handleSelectMeal = async (meal: MealLibraryItem | null, customName?: string, recipeId?: string) => {
    if (!selectedSlot || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      // If recipeId is provided, use addRecipeToPlan; otherwise use addMealToPlan
      if (recipeId) {
        await addRecipeToPlan(
          householdId,
          recipeId,
          selectedSlot.mealType,
          selectedSlot.dayIndex,
          weekStartDate,
          profile.id
        );
      } else {
        await addMealToPlan(
          householdId,
          meal?.id || null,
          customName || null,
          selectedSlot.mealType,
          selectedSlot.dayIndex,
          weekStartDate,
          profile.id
        );
      }

      await loadMealPlans();
    } catch (error) {
      console.error('Failed to add meal:', error);
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
      await toggleMealFavourite(mealId, householdId, user.id);
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
        .eq('user_id', user.id)
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
          calories: recipeData.calories,
          protein: recipeData.protein,
          carbs: recipeData.carbs,
          fat: recipeData.fat,
          allergies: recipeData.allergies
        });
      } else {
        await createCustomMeal(
          recipeData.name,
          recipeData.mealType,
          householdId,
          profile.id,
          {
            categories: recipeData.categories,
            cuisine: recipeData.cuisine,
            difficulty: recipeData.difficulty,
            prepTime: recipeData.prepTime,
            cookTime: recipeData.cookTime,
            servings: recipeData.servings,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            calories: recipeData.calories,
            protein: recipeData.protein,
            carbs: recipeData.carbs,
            fat: recipeData.fat,
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
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      await deleteCustomMeal(recipeId);
      await loadRecipes();
      await loadLibraryMeals();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const loadRecipeLinks = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const links = await getHouseholdRecipeLinks(householdId, {
        searchQuery,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        userId: profile.id
      });

      setRecipeLinks(links);
    } catch (error) {
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
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      await createRecipeLink(householdId, profile.id, data);
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
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      await toggleRecipeVote(recipeId, profile.id);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to toggle vote:', error);
    }
  };

  const handleDeleteRecipeLink = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      await deleteRecipeLink(recipeId);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'recipes' && householdId) {
      loadRecipeLinks();
    }
  }, [searchQuery, selectedTags, sortBy, activeTab, householdId]);

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

  const getMealPlan = (dayIndex: number, mealType: string): MealPlan | null => {
    const key = `${dayIndex}-${mealType}`;
    return mealPlans[key] || null;
  };

  const getTotalMeals = () => {
    return Object.keys(mealPlans).length;
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

  return (
    <PlannerShell>
      <div className="h-full flex flex-col bg-orange-50">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <UtensilsCrossed size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Meal Planner</h2>
              <p className="text-orange-100 text-sm">
                {activeTab === 'week' ? `${getTotalMeals()} meals planned this week` :
                 activeTab === 'library' ? `${allMeals.length} meals available` :
                 activeTab === 'favourites' ? `${favouriteMeals.length} favourites` :
                 `${recipeMeals.length} custom recipes`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('week')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'week'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Calendar size={18} />
              Week
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <BookOpen size={18} />
              Library
            </button>
            <button
              onClick={() => setActiveTab('favourites')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'favourites'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Heart size={18} />
              Favourites
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'recipes'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ChefHat size={18} />
              Recipes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'week' && (
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-orange-600">Loading meals...</div>
                </div>
              ) : (
                DAYS.map((day, dayIndex) => (
                  <div key={day} className="bg-white rounded-xl p-4 shadow-sm border-2 border-orange-100">
                    <h3 className="font-bold text-gray-900 mb-3 text-base">{day}</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {MEAL_TYPES.map(mealType => {
                        const plan = getMealPlan(dayIndex, mealType);

                        return (
                          <div
                            key={mealType}
                            onClick={() => !plan && handleAddMeal(dayIndex, mealType)}
                            className={`relative border-2 rounded-lg p-3 min-h-[110px] transition-all ${
                              plan
                                ? 'bg-orange-50 border-orange-300 cursor-default'
                                : 'border-gray-300 border-dashed hover:bg-orange-50/50 hover:border-orange-400 cursor-pointer'
                            }`}
                          >
                            {plan ? (
                              <div className="flex flex-col h-full">
                                <div className="flex items-start justify-between gap-1 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    {getMealIcon(mealType)}
                                    <span className="text-xs font-semibold text-gray-700 capitalize">{mealType}</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMeal(plan.id);
                                    }}
                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-colors"
                                    aria-label={`Remove ${mealType} meal`}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <p className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                                  {plan.recipe?.name || plan.meal?.name || plan.custom_meal_name || 'Unnamed meal'}
                                </p>
                                {((plan.recipe?.categories && plan.recipe.categories.length > 0) || (plan.meal?.categories && plan.meal.categories.length > 0)) && (
                                  <div className="mt-auto">
                                    <div className="flex flex-wrap gap-1">
                                      {(plan.recipe?.categories || plan.meal?.categories || []).slice(0, 2).map(cat => (
                                        <span key={cat} className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded font-medium">
                                          {cat.replace(/_/g, ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                <Plus size={24} className="text-gray-400 mb-2" />
                                <span className="text-xs font-medium text-gray-700 capitalize">{mealType}</span>
                                <span className="text-xs text-gray-500 mt-1">Click to add</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMeals.map(meal => (
                  <div key={meal.id} className="bg-white rounded-xl p-4 border-2 border-orange-100 hover:border-orange-300 transition-all shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900">{meal.name}</h4>
                      <button
                        onClick={() => handleToggleFavourite(meal.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Heart
                          size={20}
                          className={favouriteIds.has(meal.id) ? 'fill-red-500 text-red-500' : ''}
                        />
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
                    <div className="flex flex-wrap gap-1">
                      {meal.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded font-medium">
                          {cat.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favourites' && (
            <div className="p-6">
              {favouriteMeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Heart size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No favourites yet</p>
                  <p className="text-sm">Add meals to your favourites from the Library tab</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favouriteMeals.map(meal => (
                    <div key={meal.id} className="bg-white rounded-xl p-4 border-2 border-orange-100 hover:border-orange-300 transition-all shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{meal.name}</h4>
                        <button
                          onClick={() => handleToggleFavourite(meal.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
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
                      <div className="flex flex-wrap gap-1">
                        {meal.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded font-medium">
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="p-6">
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setShowAddRecipeURL(true)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors flex items-center gap-2"
                >
                  <LinkIcon size={20} />
                  Add Recipe from URL
                </button>
                <button
                  onClick={handleCreateRecipe}
                  className="px-4 py-2 border-2 border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
                >
                  <ChefHat size={20} />
                  Create Custom Recipe
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recipeLinks.map(recipe => (
                    <div key={recipe.id} className="bg-white rounded-xl overflow-hidden border-2 border-gray-100 hover:border-orange-300 transition-all shadow-sm group">
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
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                          >
                            <ExternalLink size={14} />
                            Open
                          </a>
                          <button
                            onClick={() => setSelectedRecipe(recipe)}
                            className="flex-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded-lg transition-colors text-sm"
                          >
                            Add to Plan
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteRecipeLink(recipe.id)}
                          className="w-full mt-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipeMeals.map(meal => (
                      <div key={meal.id} className="bg-white rounded-xl p-4 border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900 flex-1">{meal.name}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditRecipe(meal)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipe(meal.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
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
                        <button
                          onClick={async () => {
                            if (!user) return;
                            const { data: profile } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('user_id', user.id)
                              .maybeSingle();
                            if (profile) {
                              await addMealToPlan(householdId, meal.id, null, meal.meal_type as any, 0, weekStartDate, profile.id);
                              await loadMealPlans();
                              setActiveTab('week');
                            }
                          }}
                          className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition-colors text-sm"
                        >
                          Add to This Week
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add to Meal Plan</h2>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">Choose which day to add <span className="font-bold">{selectedRecipe.title}</span> to this week's meal plan.</p>
              <div className="space-y-2">
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    onClick={async () => {
                      if (!user) return;
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('user_id', user.id)
                        .maybeSingle();
                      if (profile) {
                        await addMealToPlan(householdId, null, selectedRecipe.title, 'dinner', index, weekStartDate, profile.id);
                        await loadMealPlans();
                        setSelectedRecipe(null);
                        setActiveTab('week');
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300 text-gray-900 font-medium rounded-lg transition-all"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMealPicker && selectedSlot && (
        <MealPickerModal
          isOpen={showMealPicker}
          onClose={() => {
            setShowMealPicker(false);
            setSelectedSlot(null);
          }}
          onSelectMeal={handleSelectMeal}
          householdId={householdId}
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
    </PlannerShell>
  );
}
