import { supabase } from './supabase';

export interface RecipeLink {
  id: string;
  space_id: string;
  url: string;
  title: string;
  image_url: string | null;
  source_platform: string | null;
  tags: string[];
  notes: string | null;
  icon_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vote_count?: number;
  user_voted?: boolean;
}

export interface RecipeMetadata {
  title: string;
  image: string | null;
  siteName: string | null;
  url: string;
}

export async function fetchRecipeMetadata(url: string): Promise<RecipeMetadata> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/fetch-recipe-metadata`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch metadata');
  }

  return response.json();
}

export async function getHouseholdRecipeLinks(
  householdId: string,
  filters?: {
    tags?: string[];
    searchQuery?: string;
    sortBy?: 'recent' | 'votes';
    onlyFavourites?: boolean;
    userId?: string;
  }
): Promise<RecipeLink[]> {
  let query = supabase
    .from('recipe_links')
    .select(`
      *,
      vote_count:recipe_votes(count)
    `)
    .eq('space_id', householdId);

  if (filters?.searchQuery) {
    query = query.ilike('title', `%${filters.searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  let recipes = (data || []).map((item: any) => ({
    ...item,
    vote_count: item.vote_count?.[0]?.count || 0,
    tags: item.tags || []
  }));

  if (filters?.tags && filters.tags.length > 0) {
    recipes = recipes.filter((recipe: RecipeLink) =>
      filters.tags!.some(tag => recipe.tags.includes(tag))
    );
  }

  if (filters?.userId) {
    const { data: votes } = await supabase
      .from('recipe_votes')
      .select('recipe_id')
      .eq('user_id', filters.userId);

    const votedIds = new Set((votes || []).map(v => v.recipe_id));

    recipes = recipes.map((recipe: RecipeLink) => ({
      ...recipe,
      user_voted: votedIds.has(recipe.id)
    }));

    if (filters?.onlyFavourites) {
      recipes = recipes.filter((recipe: RecipeLink) => recipe.user_voted);
    }
  }

  if (filters?.sortBy === 'votes') {
    recipes.sort((a: RecipeLink, b: RecipeLink) => (b.vote_count || 0) - (a.vote_count || 0));
  } else {
    recipes.sort((a: RecipeLink, b: RecipeLink) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return recipes;
}

export async function createRecipeLink(
  householdId: string,
  createdBy: string,
  data: {
    url: string;
    title: string;
    imageUrl?: string | null;
    sourcePlatform?: string | null;
    tags?: string[];
    notes?: string | null;
  }
): Promise<RecipeLink> {
  const { data: recipe, error } = await supabase
    .from('recipe_links')
    .insert({
      space_id: householdId,
      url: data.url,
      title: data.title,
      image_url: data.imageUrl || null,
      source_platform: data.sourcePlatform || null,
      tags: data.tags || [],
      notes: data.notes || null,
      created_by: createdBy
    })
    .select()
    .single();

  if (error) throw error;
  return { ...recipe, vote_count: 0, user_voted: false };
}

export async function updateRecipeLink(
  recipeId: string,
  updates: {
    title?: string;
    imageUrl?: string | null;
    tags?: string[];
    notes?: string | null;
  }
): Promise<RecipeLink> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('recipe_links')
    .update(updateData)
    .eq('id', recipeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecipeLink(recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('recipe_links')
    .delete()
    .eq('id', recipeId);

  if (error) throw error;
}

export async function updateRecipeIcon(
  recipeId: string,
  iconName: string | null
): Promise<void> {
  const { error } = await supabase
    .from('recipe_links')
    .update({
      icon_name: iconName,
      updated_at: new Date().toISOString()
    })
    .eq('id', recipeId);

  if (error) throw error;
}

export async function toggleRecipeVote(
  recipeId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('recipe_votes')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('recipe_votes')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('recipe_votes')
    .insert({
      recipe_id: recipeId,
      user_id: userId
    });

  if (error) throw error;
  return true;
}

export async function getRecipeVoteCount(recipeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('recipe_votes')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId);

  if (error) throw error;
  return count || 0;
}

export function getPlatformIcon(platform: string | null): string {
  if (!platform) return '🌐';

  const lower = platform.toLowerCase();
  if (lower.includes('tiktok')) return '📱';
  if (lower.includes('instagram')) return '📷';
  if (lower.includes('pinterest')) return '📌';
  if (lower.includes('youtube')) return '📺';
  if (lower.includes('facebook')) return '👥';

  return '🌐';
}

export const COMMON_RECIPE_TAGS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'keto',
  'paleo',
  'quick-meal',
  '15-min',
  '30-min',
  'batch-cooking',
  'meal-prep',
  'kid-friendly',
  'healthy',
  'comfort-food',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'italian',
  'mexican',
  'asian',
  'mediterranean',
  'indian'
];
