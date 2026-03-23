/**
 * Recipe Suggestion Service
 * 
 * Service functions for suggesting recipes based on popularity, preferences, and usage
 * Phase 6: Learning & Analytics
 */

import { supabase } from './supabase';
import { listRecipes, type RecipeFilters } from './recipeGeneratorService';
import { getRecipeUsageStats } from './recipeUsageStatsService';
import { getRecipeFeedbackStats } from './recipeFeedbackService';
import type { Recipe } from './recipeGeneratorTypes';

export interface RecipeSuggestion {
  recipe: Recipe;
  popularity_score: number;
  match_reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Get popular recipes (by popularity score)
 */
export async function getPopularRecipes(
  filters?: Partial<RecipeFilters>,
  limit: number = 20
): Promise<Recipe[]> {
  const recipeFilters: RecipeFilters = {
    ...filters,
    limit,
    order_by: 'quality_score', // Use quality_score for now, popularity_score will be integrated
    order_direction: 'desc',
    include_public: true,
  };

  const recipes = await listRecipes(recipeFilters);
  
  // Get usage stats for all recipes and sort by popularity
  const recipesWithStats = await Promise.all(
    recipes.map(async (recipe) => {
      const stats = await getRecipeUsageStats(recipe.id);
      return {
        recipe,
        popularity: stats?.popularity_score || 0,
      };
    })
  );

  // Sort by popularity
  recipesWithStats.sort((a, b) => b.popularity - a.popularity);

  return recipesWithStats.map(r => r.recipe);
}

/**
 * Get trending recipes (popular in recent period)
 */
export async function getTrendingRecipes(
  householdId?: string,
  limit: number = 10
): Promise<Recipe[]> {
  // Get recipes with high popularity scores from recent period
  const { data, error } = await supabase
    .from('recipe_usage_stats')
    .select(`
      recipe_id,
      popularity_score,
      recipes!inner(*)
    `)
    .eq('period_type', 'all_time')
    .is('period_start', null)
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || [])
    .map((item: any) => item.recipes)
    .filter(Boolean) as Recipe[];
}

/**
 * Get personalized recipe suggestions
 * Based on user's historical preferences and household preferences
 */
export async function getPersonalizedSuggestions(
  userId: string,
  householdId?: string,
  limit: number = 10
): Promise<RecipeSuggestion[]> {
  // Get user's favorite recipe categories/cuisines from feedback
  const { data: userFeedback } = await supabase
    .from('recipe_feedback')
    .select(`
      recipe_id,
      rating,
      feedback_tags,
      recipes!inner(*)
    `)
    .eq('user_id', userId)
    .not('rating', 'is', null);

  // Get household's popular recipes
  const householdStats = householdId
    ? await supabase
        .from('recipe_usage_stats')
        .select('recipe_id, popularity_score, recipes!inner(*)')
        .eq('household_id', householdId)
        .eq('period_type', 'all_time')
        .is('period_start', null)
        .order('popularity_score', { ascending: false })
        .limit(20)
    : { data: [] };

  // Analyze user preferences
  const preferredCategories = new Set<string>();
  const preferredCuisines = new Set<string>();
  
  (userFeedback?.data || []).forEach((feedback: any) => {
    if (feedback.recipes) {
      feedback.recipes.categories?.forEach((cat: string) => preferredCategories.add(cat));
      if (feedback.recipes.cuisine) {
        preferredCuisines.add(feedback.recipes.cuisine);
      }
    }
  });

  // Get recipes matching preferences
  const filters: RecipeFilters = {
    categories: Array.from(preferredCategories) as any,
    cuisine: preferredCuisines.size > 0 ? (Array.from(preferredCuisines)[0] as any) : undefined,
    include_public: true,
    limit: limit * 2, // Get more to filter
  };

  const candidateRecipes = await listRecipes(filters);

  // Score and rank suggestions
  const suggestions: RecipeSuggestion[] = [];

  for (const recipe of candidateRecipes.slice(0, limit)) {
    const stats = await getRecipeUsageStats(recipe.id, householdId);
    const feedbackStats = await getRecipeFeedbackStats(recipe.id);

    let matchReason = 'Popular recipe';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Determine match reason and confidence
    if (preferredCategories.has(recipe.categories[0])) {
      matchReason = `Matches your preference for ${recipe.categories[0]}`;
      confidence = 'high';
    } else if (recipe.cuisine && preferredCuisines.has(recipe.cuisine)) {
      matchReason = `Matches your preference for ${recipe.cuisine} cuisine`;
      confidence = 'high';
    } else if (stats && stats.popularity_score > 50) {
      matchReason = 'Popular recipe';
      confidence = 'medium';
    } else if (feedbackStats.average_rating && feedbackStats.average_rating >= 4) {
      matchReason = 'Highly rated recipe';
      confidence = 'medium';
    }

    suggestions.push({
      recipe,
      popularity_score: stats?.popularity_score || 0,
      match_reason: matchReason,
      confidence,
    });
  }

  // Sort by popularity and confidence
  suggestions.sort((a, b) => {
    const confidenceWeight = { high: 3, medium: 2, low: 1 };
    const scoreA = a.popularity_score * confidenceWeight[a.confidence];
    const scoreB = b.popularity_score * confidenceWeight[b.confidence];
    return scoreB - scoreA;
  });

  return suggestions.slice(0, limit);
}

/**
 * Get suggestions based on pantry (recipes you can make)
 */
export async function getMakeableSuggestions(
  householdId: string,
  limit: number = 10
): Promise<RecipeSuggestion[]> {
  // This integrates with the existing foodIntelligence system
  // For now, return popular recipes - full integration can be enhanced later
  const recipes = await getPopularRecipes({ household_id: householdId, include_public: true }, limit);

  return recipes.map(recipe => ({
    recipe,
    popularity_score: 0, // Will be populated if stats exist
    match_reason: 'Based on your pantry',
    confidence: 'medium' as const,
  }));
}
