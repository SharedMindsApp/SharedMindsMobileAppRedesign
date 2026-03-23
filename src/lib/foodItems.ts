/**
 * Unified Food Items Service
 * 
 * Single source of truth for food items across Pantry, Grocery List, and Meal Planner.
 * All food references must go through this service.
 */

import { supabase } from './supabase';
import { getFoodEmoji } from './foodEmojis';

export interface FoodItem {
  id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodItemWithUsage extends FoodItem {
  last_used?: string;
}

/**
 * Get or create a food item by name.
 * This is the canonical way to create food items - never create them directly.
 */
export async function getOrCreateFoodItem(
  name: string,
  category?: string | null
): Promise<FoodItem> {
  const normalizedName = normalizeFoodName(name);
  
  // Try to find existing item
  const { data: existing, error: searchError } = await supabase
    .from('food_items')
    .select('*')
    .eq('normalized_name', normalizedName)
    .maybeSingle();

  if (searchError && searchError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine
    throw searchError;
  }

  if (existing) {
    return existing;
  }

  // Get emoji for the food item
  const emoji = getFoodEmoji(name, category);
  
  // Create new food item
  const { data: newItem, error: createError } = await supabase
    .from('food_items')
    .insert({
      name: name.trim(),
      normalized_name: normalizedName,
      category: category || null,
      emoji: emoji || null,
    })
    .select()
    .single();

  if (createError) throw createError;
  return newItem;
}

/**
 * Search food items with fuzzy matching
 */
export async function searchFoodItems(
  query: string,
  limit: number = 20
): Promise<FoodItem[]> {
  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_food_items', {
    search_query: query,
    limit_count: limit,
  });

  if (error) {
    console.error('Error searching food items:', error);
    // Fallback to simple ILIKE search
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('food_items')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }

  return data || [];
}

/**
 * Get recently used food items for a household
 */
export async function getRecentlyUsedFoodItems(
  householdId: string,
  limit: number = 10
): Promise<FoodItemWithUsage[]> {
  const { data, error } = await supabase.rpc('get_recently_used_food_items', {
    household_id_input: householdId,
    limit_count: limit,
  });

  if (error) {
    console.error('Error getting recently used food items:', error);
    return [];
  }

  return data || [];
}

/**
 * Get food item by ID
 */
export async function getFoodItemById(id: string): Promise<FoodItem | null> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get food items by IDs (batch)
 */
export async function getFoodItemsByIds(ids: string[]): Promise<FoodItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

/**
 * Update food item (limited - typically only category/emoji)
 */
export async function updateFoodItem(
  id: string,
  updates: {
    category?: string | null;
    emoji?: string | null;
  }
): Promise<FoodItem> {
  const { data, error } = await supabase
    .from('food_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Normalize food name for consistent matching
 */
export function normalizeFoodName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Get food item name from ID (with fallback)
 */
export async function getFoodItemName(id: string): Promise<string> {
  const item = await getFoodItemById(id);
  return item?.name || 'Unknown Item';
}

/**
 * Get food item names from IDs (batch)
 */
export async function getFoodItemNames(ids: string[]): Promise<Record<string, string>> {
  const items = await getFoodItemsByIds(ids);
  const names: Record<string, string> = {};
  
  items.forEach(item => {
    names[item.id] = item.name;
  });
  
  // Fill in missing IDs with fallback
  ids.forEach(id => {
    if (!names[id]) {
      names[id] = 'Unknown Item';
    }
  });
  
  return names;
}
