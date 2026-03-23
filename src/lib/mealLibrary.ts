import { supabase } from './supabase';

export interface MealLibraryItem {
  id: string;
  household_id: string | null;
  title: string;
  category: string | null;
  ingredients: string[];
  tags: string[];
  created_by: string | null;
  created_at: string;
  average_rating?: number;
  vote_count?: number;
  user_rating?: number;
}

export interface MealVote {
  id: string;
  meal_id: string;
  profile_id: string;
  rating: number;
  created_at: string;
}

export async function getMealsForHousehold(householdId: string): Promise<MealLibraryItem[]> {
  const { data: meals, error } = await supabase
    .from('meal_library')
    .select('*')
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }

  const mealsWithRatings = await Promise.all(
    (meals || []).map(async (meal) => {
      const stats = await getMealRatingStats(meal.id);
      return {
        ...meal,
        average_rating: stats.average,
        vote_count: stats.count,
        user_rating: stats.userRating
      };
    })
  );

  return mealsWithRatings;
}

export async function getMealsByCategory(householdId: string, category: string): Promise<MealLibraryItem[]> {
  const allMeals = await getMealsForHousehold(householdId);
  return allMeals.filter(meal => meal.category === category);
}

export async function getFamilyFavourites(householdId: string, minVotes: number = 2): Promise<MealLibraryItem[]> {
  const allMeals = await getMealsForHousehold(householdId);

  return allMeals
    .filter(meal => (meal.vote_count || 0) >= minVotes)
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
}

export async function getHealthyMeals(householdId: string): Promise<MealLibraryItem[]> {
  const allMeals = await getMealsForHousehold(householdId);

  return allMeals.filter(meal =>
    meal.category === 'healthy' ||
    meal.tags.includes('healthy') ||
    meal.tags.includes('high-protein') ||
    meal.tags.includes('low-calorie') ||
    meal.tags.includes('whole-grain')
  );
}

export async function getQuickMeals(householdId: string): Promise<MealLibraryItem[]> {
  const allMeals = await getMealsForHousehold(householdId);

  return allMeals.filter(meal =>
    meal.category === 'quick' ||
    meal.tags.includes('quick') ||
    meal.tags.includes('15-min') ||
    meal.tags.includes('30-min')
  );
}

export async function createMeal(meal: {
  household_id: string | null;
  title: string;
  category?: string;
  ingredients?: string[];
  tags?: string[];
}): Promise<MealLibraryItem> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('meal_library')
    .insert({
      ...meal,
      created_by: user?.user?.id,
      ingredients: meal.ingredients || [],
      tags: meal.tags || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meal:', error);
    throw error;
  }

  return data;
}

export async function updateMeal(mealId: string, updates: {
  title?: string;
  category?: string;
  ingredients?: string[];
  tags?: string[];
}): Promise<MealLibraryItem> {
  const { data, error } = await supabase
    .from('meal_library')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meal:', error);
    throw error;
  }

  return data;
}

export async function deleteMeal(mealId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_library')
    .delete()
    .eq('id', mealId);

  if (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
}

export async function voteMeal(mealId: string, rating: number): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user?.id) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('meal_votes')
    .upsert({
      meal_id: mealId,
      profile_id: user.user.id,
      rating
    }, {
      onConflict: 'meal_id,profile_id'
    });

  if (error) {
    console.error('Error voting on meal:', error);
    throw error;
  }
}

export async function getMealRatingStats(mealId: string): Promise<{
  average: number;
  count: number;
  userRating: number | null;
}> {
  const { data: user } = await supabase.auth.getUser();

  const { data: votes, error } = await supabase
    .from('meal_votes')
    .select('rating, profile_id')
    .eq('meal_id', mealId);

  if (error) {
    console.error('Error fetching meal votes:', error);
    return { average: 0, count: 0, userRating: null };
  }

  if (!votes || votes.length === 0) {
    return { average: 0, count: 0, userRating: null };
  }

  const totalRating = votes.reduce((sum, vote) => sum + vote.rating, 0);
  const average = totalRating / votes.length;
  const userVote = votes.find(v => v.profile_id === user?.user?.id);

  return {
    average: Math.round(average * 10) / 10,
    count: votes.length,
    userRating: userVote?.rating || null
  };
}

export async function getUserVote(mealId: string): Promise<number | null> {
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('meal_votes')
    .select('rating')
    .eq('meal_id', mealId)
    .eq('profile_id', user.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user vote:', error);
    return null;
  }

  return data?.rating || null;
}
