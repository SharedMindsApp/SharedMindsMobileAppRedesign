/**
 * Category Color Settings Service
 * 
 * Manages user-defined color presets for tag categories.
 * Stores settings in user_ui_preferences.custom_overrides.category_colors
 */

import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export type CategoryType = 'goal' | 'habit' | 'project' | 'trip' | 'task' | 'meeting' | 'event' | 'track' | 'subtrack';

export interface CategoryColorSettings {
  goal: string;
  habit: string;
  project: string;
  trip: string;
  task: string;
  meeting: string;
  event: string;
  track: string;
  subtrack: string;
}

// Default category colors
export const DEFAULT_CATEGORY_COLORS: CategoryColorSettings = {
  goal: 'blue',
  habit: 'green',
  project: 'purple',
  trip: 'orange',
  task: 'yellow',
  meeting: 'red',
  event: 'pink',
  track: 'indigo',
  subtrack: 'cyan',
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get category color settings for a user
 */
export async function getCategoryColorSettings(userId: string): Promise<CategoryColorSettings> {
  try {
    const { data, error } = await supabase
      .from('user_ui_preferences')
      .select('custom_overrides')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[categoryColorSettings] Error fetching settings:', error);
      return DEFAULT_CATEGORY_COLORS;
    }

    if (!data || !data.custom_overrides) {
      return DEFAULT_CATEGORY_COLORS;
    }

    const categoryColors = (data.custom_overrides as any)?.category_colors;
    if (!categoryColors) {
      return DEFAULT_CATEGORY_COLORS;
    }

    // Merge with defaults to ensure all categories have colors
    return {
      ...DEFAULT_CATEGORY_COLORS,
      ...categoryColors,
    };
  } catch (err) {
    console.error('[categoryColorSettings] Error fetching settings:', err);
    return DEFAULT_CATEGORY_COLORS;
  }
}

/**
 * Update category color settings for a user
 */
export async function updateCategoryColorSettings(
  userId: string,
  settings: Partial<CategoryColorSettings>
): Promise<void> {
  try {
    // Get current preferences
    const { data: existing, error: fetchError } = await supabase
      .from('user_ui_preferences')
      .select('custom_overrides')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const currentOverrides = existing?.custom_overrides || {};
    const currentCategoryColors = (currentOverrides as any)?.category_colors || {};

    // Merge new settings with existing
    const updatedCategoryColors = {
      ...currentCategoryColors,
      ...settings,
    };

    const updatedOverrides = {
      ...currentOverrides,
      category_colors: updatedCategoryColors,
    };

    // Upsert preferences
    const { error: upsertError } = await supabase
      .from('user_ui_preferences')
      .upsert({
        user_id: userId,
        custom_overrides: updatedOverrides,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      throw upsertError;
    }
  } catch (err) {
    console.error('[categoryColorSettings] Error updating settings:', err);
    throw err;
  }
}

/**
 * Get color for a specific category
 */
export async function getCategoryColor(userId: string, category: CategoryType): Promise<string> {
  const settings = await getCategoryColorSettings(userId);
  return settings[category] || DEFAULT_CATEGORY_COLORS[category];
}






