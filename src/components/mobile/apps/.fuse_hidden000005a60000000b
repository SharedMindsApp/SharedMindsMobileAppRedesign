import { useState, useEffect } from 'react';
import { ChevronLeft, UtensilsCrossed, Plus, X, Coffee, Sun, Moon, Heart, ChefHat, Edit, Trash2, Link as LinkIcon, Star, Search, Filter, ExternalLink, StickyNote } from 'lucide-react';
import { getWeeklyMealPlan, getMealLibrary, getHouseholdFavourites, addMealToPlan, removeMealFromPlan, toggleMealFavourite, isMealFavourite, getWeekStartDate, getCategoryBadgeColor, getCategoryLabel, createCustomMeal, updateCustomMeal, deleteCustomMeal, type MealLibraryItem, type MealPlan } from '../../../lib/mealPlanner';
import { getHouseholdRecipeLinks, createRecipeLink, deleteRecipeLink, toggleRecipeVote, updateRecipeIcon, getPlatformIcon, type RecipeLink } from '../../../lib/recipeLinks';
import { getRecipeIcon } from '../../../lib/recipeIcons';
import { MobileRecipeFormModal, type RecipeFormData } from '../../meal-planner/MobileRecipeFormModal';
import { MobileAddRecipeFromURLModal } from '../../meal-planner/MobileAddRecipeFromURLModal';
import { MobileRecipeIconPickerModal } from '../../meal-planner/MobileRecipeIconPickerModal';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

const CATEGORIES = [
  { id: 'home_cooked', label: 'Home Cooked' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'takeaway', label: 'Takeaway' }
];

export function MobileMealPlannerApp({ householdId, onClose }: MobileAppProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'week' | 'library' | 'favourites' | 'recipes'>('week');
  const [mealPlans, setMealPlans] = useState<Record<string, MealPlan>>({});
  const [meals, setMeals] = useState<MealLibraryItem[]>([]);
  const [favourites, setFavourites] = useState<MealLibraryItem[]>([]);
  const [recipes, setRecipes] = useState<MealLibraryItem[]>([]);
  const [favouriteMealIds, setFavouriteMealIds] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<{ dayIndex: number; dayName: string; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MealLibraryItem | undefined>(undefined);
  const [recipeLinks, setRecipeLinks] = useState<RecipeLink[]>([]);
  const [showAddRecipeURL, setShowAddRecipeURL] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'votes'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeLink | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingIconRecipe, setEditingIconRecipe] = useState<RecipeLink | null>(null);
  const weekStartDate = getWeekStartDate();

  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId]);

  useEffect(() => {
    loadMeals();
  }, [searchQuery, selectedCategories]);

  const loadData = async () => {
    await Promise.all([
      loadMealPlans(),
      loadMeals(),
      loadFavourites(),
      loadRecipes(),
      loadRecipeLinks()
    ]);
  };

  const loadMealPlans = async () => {
    if (!householdId) return;

    const plans = await getWeeklyMealPlan(householdId, weekStartDate);
    const plansMap: Record<string, MealPlan> = {};

    plans.forEach(plan => {
      const key = `${plan.day_of_week}-${plan.meal_type}`;
      plansMap[key] = plan;
    });

    setMealPlans(plansMap);
  };

  const loadMeals = async () => {
    const filters: any = {};

    if (selectedCategories.length > 0) {
      filters.categories = selectedCategories;
    }

    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    const data = await getMealLibrary(filters);
    setMeals(data);
  };

  const loadFavourites = async () => {
    if (!householdId || !user) return;

    const data = await getHouseholdFavourites(householdId);
    setFavourites(data.map(f => f.meal).filter(Boolean) as MealLibraryItem[]);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      const favIds = new Set<string>();
      for (const fav of data) {
        const isFav = await isMealFavourite(fav.meal_id, householdId, profile.id);
        if (isFav) favIds.add(fav.meal_id);
      }
      setFavouriteMealIds(favIds);
    }
  };

  const loadRecipes = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return;

    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .eq('created_by', profile.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load recipes:', error);
      return;
    }

    setRecipes(data || []);
  };

  const handleSelectMeal = async (meal: MealLibraryItem) => {
    if (!selectedSlot || !householdId || !user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return;

    await addMealToPlan(
      householdId,
      meal.id,
      null,
      selectedSlot.mealType,
      selectedSlot.dayIndex,
      weekStartDate,
      profile.id
    );

    await loadMealPlans();
    setSelectedSlot(null);
  };

  const handleRemoveMeal = async (planId: string) => {
    await removeMealFromPlan(planId);
    await loadMealPlans();
  };

  const handleToggleFavourite = async (mealId: string) => {
    if (!householdId || !user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return;

    const isFav = await toggleMealFavourite(mealId, householdId, profile.id);

    setFavouriteMealIds(prev => {
      const next = new Set(prev);
      if (isFav) {
        next.add(mealId);
      } else {
        next.delete(mealId);
      }
      return next;
    });

    await loadFavourites();
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
      await loadMeals();
      setShowRecipeForm(false);
      setEditingRecipe(undefined);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Delete this recipe?')) return;

    try {
      await deleteCustomMeal(recipeId);
      await loadRecipes();
      await loadMeals();
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
    if (!confirm('Delete this recipe?')) return;

    try {
      await deleteRecipeLink(recipeId);
      await loadRecipeLinks();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'recipes') {
      loadRecipeLinks();
    }
  }, [searchQuery, selectedTags, sortBy, activeTab]);

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

  const getMealIcon = (mealType: string, size = 18) => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={size} className="text-amber-600" />;
      case 'lunch':
        return <Sun size={size} className="text-orange-600" />;
      case 'dinner':
        return <Moon size={size} className="text-blue-600" />;
      default:
        return null;
    }
  };

  if (selectedSlot) {
    const displayMeals = activeTab === 'favourites' ? favourites : meals;

    return (
      <div className="h-full bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-orange-500">
          <button
            onClick={() => setSelectedSlot(null)}
            className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">
            {selectedSlot.dayName} - {selectedSlot.mealType}
          </h1>
          <div className="w-10" />
        </div>

        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400"
          />
        </div>

        <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-200">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategories(prev =>
                  prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategories.includes(cat.id)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {displayMeals.map(meal => (
              <button
                key={meal.id}
                onClick={() => handleSelectMeal(meal)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-400 transition-all text-left relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavourite(meal.id);
                  }}
                  className="absolute top-3 right-3 p-1"
                >
                  <Heart
                    size={20}
                    className={favouriteMealIds.has(meal.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                  />
                </button>

                <h3 className="font-bold text-gray-900 mb-2 pr-8">{meal.name}</h3>

                <div className="flex flex-wrap gap-1 mb-2">
                  {meal.categories.slice(0, 3).map(cat => (
                    <span
                      key={cat}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(cat)}`}
                    >
                      {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>

                {meal.calories && (
                  <p className="text-sm text-gray-600">{meal.calories} calories</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Meal Planner</h1>
        <div className="w-10" />
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'week'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'library'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600'
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setActiveTab('favourites')}
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'favourites'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600'
          }`}
        >
          Favourites
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'recipes'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600'
          }`}
        >
          Recipes
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'week' ? (
          <div className="space-y-3">
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200">
                <h3 className="font-bold text-gray-900 mb-2">{day}</h3>
                <div className="space-y-2">
                  {MEAL_TYPES.map(mealType => {
                    const plan = getMealPlan(dayIndex, mealType);

                    return (
                      <div
                        key={mealType}
                        onClick={() => !plan && setSelectedSlot({ dayIndex, dayName: day, mealType })}
                        className={`p-3 rounded-lg border-2 ${
                          plan
                            ? 'bg-white border-green-400'
                            : 'bg-white border-dashed border-gray-300'
                        }`}
                      >
                        {plan ? (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getMealIcon(mealType, 16)}
                                <span className="text-xs text-gray-600 capitalize">{mealType}</span>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {plan.meal?.name || plan.custom_meal_name}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMeal(plan.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 py-2 text-gray-400">
                            <Plus size={20} />
                            <span className="capitalize">{mealType}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'library' ? (
          <div className="space-y-3">
            {meals.map(meal => (
              <div
                key={meal.id}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 flex-1">{meal.name}</h3>
                  <button
                    onClick={() => handleToggleFavourite(meal.id)}
                    className="p-1"
                  >
                    <Heart
                      size={20}
                      className={favouriteMealIds.has(meal.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                    />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {meal.categories.map(cat => (
                    <span
                      key={cat}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(cat)}`}
                    >
                      {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'favourites' ? (
          <div className="space-y-3">
            {favourites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Heart size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">No favourite meals yet</p>
              </div>
            ) : (
              favourites.map(meal => (
                <div
                  key={meal.id}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <h3 className="font-bold text-gray-900 mb-2">{meal.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {meal.categories.map(cat => (
                      <span
                        key={cat}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(cat)}`}
                      >
                        {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRecipeURL(true)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <LinkIcon size={20} />
                Add from URL
              </button>
              <button
                onClick={handleCreateRecipe}
                className="flex-1 px-4 py-3 border-2 border-orange-500 text-orange-600 font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <ChefHat size={20} />
                Create
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-lg font-medium flex items-center gap-1 ${
                    showFilters ? 'bg-orange-500 text-white' : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  <Filter size={16} />
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'votes')}
                  className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="recent">Recent</option>
                  <option value="votes">Loved</option>
                </select>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-2">
                  {['vegan', 'vegetarian', 'gluten-free', 'quick-meal', '15-min'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {recipeLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ChefHat size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No recipes yet</p>
                <p className="text-sm text-gray-400 mt-2">Add from TikTok, Instagram, or any recipe site</p>
              </div>
            ) : (
              recipeLinks.map(recipe => (
                <div key={recipe.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {recipe.image_url && (
                    <div className="relative h-32 bg-gray-100">
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
                        className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm active:bg-white rounded-lg p-1.5 transition-all active:scale-95 shadow-md"
                        title="Change icon"
                      >
                        <span className="text-xl animate-fadeIn">
                          {getRecipeIcon(recipe.icon_name) || '⚪'}
                        </span>
                      </button>
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                        <span>{getPlatformIcon(recipe.source_platform)}</span>
                        {recipe.source_platform}
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 flex-1 line-clamp-2 text-sm">{recipe.title}</h3>
                      <button
                        onClick={() => handleToggleRecipeVote(recipe.id)}
                        className="p-1 text-gray-400 flex-shrink-0"
                      >
                        <Star
                          size={18}
                          className={recipe.user_voted ? 'fill-orange-500 text-orange-500' : ''}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <Star size={12} className="fill-orange-400 text-orange-400" />
                      <span className="font-semibold">{recipe.vote_count || 0}</span>
                      {recipe.notes && (
                        <>
                          <span>•</span>
                          <StickyNote size={12} />
                        </>
                      )}
                    </div>

                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recipe.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <a
                        href={recipe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-xs flex items-center justify-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                      <button
                        onClick={() => setSelectedRecipe(recipe)}
                        className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 font-medium rounded-lg text-xs"
                      >
                        Add to Plan
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteRecipeLink(recipe.id)}
                      className="w-full mt-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {recipes.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Custom Recipes</h3>
                {recipes.map(meal => (
                  <div key={meal.id} className="bg-white border border-blue-200 rounded-xl p-3 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 flex-1 text-sm">{meal.name}</h3>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditRecipe(meal)} className="p-1 text-gray-400">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteRecipe(meal.id)} className="p-1 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
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
                      className="w-full px-3 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg text-xs"
                    >
                      Add to This Week
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showRecipeForm && (
        <MobileRecipeFormModal
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
        <MobileAddRecipeFromURLModal
          isOpen={showAddRecipeURL}
          onClose={() => setShowAddRecipeURL(false)}
          onSave={handleAddRecipeFromURL}
        />
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add to Meal Plan</h2>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-3 text-sm">Choose which day to add <span className="font-bold">{selectedRecipe.title}</span></p>
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
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 text-gray-900 font-medium rounded-lg text-sm"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showIconPicker && editingIconRecipe && (
        <MobileRecipeIconPickerModal
          isOpen={showIconPicker}
          onClose={() => {
            setShowIconPicker(false);
            setEditingIconRecipe(null);
          }}
          currentIconName={editingIconRecipe.icon_name}
          onSave={handleSaveRecipeIcon}
        />
      )}
    </div>
  );
}
