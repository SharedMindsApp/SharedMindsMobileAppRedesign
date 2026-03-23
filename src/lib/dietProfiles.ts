import { supabase } from './supabase';

function isDietProfilesUnavailable(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;

  return error.code === 'PGRST205' ||
    error.code === '42P01' ||
    Boolean(error.message && error.message.includes("Could not find the table 'public.household_diet_profiles'"));
}

export type DietProfile = {
  id: string;
  space_id: string;
  household_id?: string;
  profile_id: string;
  diet_type: string[];
  allergies: string[];
  avoid_list: string[];
  fasting_schedule: {
    type?: string;
    start?: string;
    end?: string;
  };
  weekly_schedule: {
    [day: string]: {
      breakfast?: string;
      lunch?: string;
      dinner?: string;
    };
  };
  created_at: string;
};

export async function getDietProfile(householdId: string, profileId: string): Promise<DietProfile | null> {
  const { data, error } = await supabase
    .from('household_diet_profiles')
    .select('*')
    .eq('space_id', householdId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (isDietProfilesUnavailable(error)) return null;
  if (error) throw error;
  return data ? { ...data, household_id: data.space_id } : null;
}

export async function getAllHouseholdDietProfiles(householdId: string): Promise<DietProfile[]> {
  const { data, error } = await supabase
    .from('household_diet_profiles')
    .select('*')
    .eq('space_id', householdId);

  if (isDietProfilesUnavailable(error)) return [];
  if (error) throw error;
  return (data || []).map((profile) => ({
    ...profile,
    household_id: profile.space_id,
  }));
}

export async function upsertDietProfile(profile: Partial<DietProfile>): Promise<DietProfile> {
  const spaceId = profile.space_id || profile.household_id;

  if (!spaceId || !profile.profile_id) {
    throw new Error('Diet profile requires both space_id and profile_id');
  }

  const { data, error } = await supabase
    .from('household_diet_profiles')
    .upsert({
      space_id: spaceId,
      profile_id: profile.profile_id,
      diet_type: profile.diet_type || [],
      allergies: profile.allergies || [],
      avoid_list: profile.avoid_list || [],
      fasting_schedule: profile.fasting_schedule || {},
      weekly_schedule: profile.weekly_schedule || {},
    }, {
      onConflict: 'space_id,profile_id',
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, household_id: data.space_id };
}

export async function deleteDietProfile(householdId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('household_diet_profiles')
    .delete()
    .eq('space_id', householdId)
    .eq('profile_id', profileId);

  if (error) throw error;
}

export const DIET_TYPES = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'halal',
  'kosher',
  'keto',
  'paleo',
  'low-FODMAP',
  'gluten-free',
  'dairy-free',
  'diabetic-friendly',
] as const;

export const ALLERGIES = [
  'nuts',
  'peanuts',
  'tree nuts',
  'dairy',
  'milk',
  'gluten',
  'wheat',
  'soy',
  'eggs',
  'shellfish',
  'fish',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'sulfites',
] as const;

export const FASTING_TYPES = [
  { value: 'none', label: 'None' },
  { value: '16:8', label: '16:8 (16h fast, 8h eating)' },
  { value: '18:6', label: '18:6 (18h fast, 6h eating)' },
  { value: '20:4', label: '20:4 (20h fast, 4h eating)' },
  { value: 'OMAD', label: 'OMAD (One Meal A Day)' },
  { value: '5:2', label: '5:2 (5 days normal, 2 days restricted)' },
] as const;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'] as const;

export const MEAL_AVAILABILITY_OPTIONS = [
  { value: 'normal', label: 'Normal', color: 'bg-green-100 text-green-800' },
  { value: 'away', label: 'Away', color: 'bg-gray-100 text-gray-800' },
  { value: 'training', label: 'Training', color: 'bg-blue-100 text-blue-800' },
  { value: 'quick', label: 'Quick Meal', color: 'bg-yellow-100 text-yellow-800' },
] as const;
