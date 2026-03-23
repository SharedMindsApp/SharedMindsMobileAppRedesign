/**
 * RecipeDetailPage - Full page view for a single recipe
 * 
 * Navigate to /recipes/:recipeId to view a recipe in full page mode
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getRecipeById } from '../../lib/recipeGeneratorService';
import { RecipeDetail } from './RecipeDetail';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { showToast } from '../Toast';
import { useSpaceContext } from '../../hooks/useSpaceContext';
import { getUserHousehold } from '../../lib/household';

export function RecipeDetailPage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string>('');
  
  // Get meal plan context from location state (if opened from meal planner)
  const mealPlanContext = location.state as { 
    planServings?: number;
    mealPlanId?: string;
    spaceId?: string;
  } | null;
  const planServings = mealPlanContext?.planServings;
  const mealPlanId = mealPlanContext?.mealPlanId;
  const mealPlanSpaceId = mealPlanContext?.spaceId;
  
  // Get current space for meal prep functionality
  const { currentSpaceId } = useSpaceContext(householdId);
  
  // Load household ID for space context
  useEffect(() => {
    const loadHousehold = async () => {
      try {
        const household = await getUserHousehold();
        if (household) {
          setHouseholdId(household.id);
        }
      } catch (error) {
        console.error('Failed to load household:', error);
      }
    };
    loadHousehold();
  }, []);

  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId]);

  const loadRecipe = async () => {
    if (!recipeId) return;

    try {
      setLoading(true);
      setError(null);
      const loadedRecipe = await getRecipeById(recipeId, { includeSource: true });
      
      if (!loadedRecipe) {
        setError('Recipe not found');
        showToast('error', 'Recipe not found');
        navigate(-1); // Go back to previous page
        return;
      }

      setRecipe(loadedRecipe);
    } catch (err) {
      console.error('Error loading recipe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recipe';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Handle meal added - navigate back to meal planner and refresh
  const handleMealAdded = () => {
    // If we came from meal planner (indicated by mealPlanId in location state), navigate back
    if (mealPlanId || mealPlanContext) {
      navigate(-1); // Navigate back to meal planner
      // The meal planner widget will automatically refresh when it re-renders
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-orange-500" size={32} />
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recipe Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The recipe you are looking for does not exist or has been deleted.'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button - Mobile optimized */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors group touch-manipulation"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base font-medium">Back to Recipes</span>
          </button>
        </div>
      </div>

      {/* Recipe Detail - Mobile optimized padding */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <RecipeDetail
          recipe={recipe}
          showActions={true}
          isEditable={false}
          spaceId={mealPlanSpaceId || currentSpaceId}
          planServings={planServings} // Pass meal plan servings for scaling
          mealPlanId={mealPlanId} // Pass meal plan ID for preparation mode controls
          onMealAdded={handleMealAdded} // Handle navigation back to meal planner
        />
      </div>
    </div>
  );
}
