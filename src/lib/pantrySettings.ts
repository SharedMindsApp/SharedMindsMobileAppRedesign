import { supabase } from './supabase';

export type PantrySpaceSettings = {
  space_id: string;
  auto_add_replacements_to_shopping_list: boolean;
  pricing_city: string | null;
  pricing_country: string | null;
};

const DEFAULT_PANTRY_SPACE_SETTINGS = {
  auto_add_replacements_to_shopping_list: false,
  pricing_city: null,
  pricing_country: null,
};

export async function getPantrySpaceSettings(spaceId: string): Promise<PantrySpaceSettings> {
  const { data, error } = await supabase
    .from('pantry_space_settings')
    .select('space_id, auto_add_replacements_to_shopping_list, pricing_city, pricing_country')
    .eq('space_id', spaceId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      space_id: spaceId,
      ...DEFAULT_PANTRY_SPACE_SETTINGS,
    };
  }

  return data;
}

export async function updatePantrySpaceSettings(
  spaceId: string,
  updates: Partial<Omit<PantrySpaceSettings, 'space_id'>>
): Promise<PantrySpaceSettings> {
  const payload = {
    space_id: spaceId,
    ...DEFAULT_PANTRY_SPACE_SETTINGS,
    ...updates,
  };

  const { data, error } = await supabase
    .from('pantry_space_settings')
    .upsert(payload, { onConflict: 'space_id' })
    .select('space_id, auto_add_replacements_to_shopping_list, pricing_city, pricing_country')
    .single();

  if (error) throw error;
  return data;
}
