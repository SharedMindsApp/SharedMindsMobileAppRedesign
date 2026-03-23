/**
 * Places Service
 * 
 * Service functions for managing places, orders, and meal slot assignments
 */

import { supabase } from './supabase';
import type { 
  Place, 
  PlaceOrder, 
  MealSlotAssignment, 
  WeeklyMealPreference,
  PlaceInput,
  PlaceOrderInput,
  MealSlotAssignmentInput,
  WeeklyMealPreferenceInput,
} from './placesTypes';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';

/**
 * Get all places for a space
 */
export async function getPlaces(spaceId: string, options?: {
  favourite?: boolean;
  type?: string;
  search?: string;
}): Promise<Place[]> {
  let query = supabase
    .from('places')
    .select('*')
    .eq('space_id', spaceId)
    .order('favourite', { ascending: false })
    .order('name', { ascending: true });

  if (options?.favourite !== undefined) {
    query = query.eq('favourite', options.favourite);
  }

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(place => ({
    ...place,
    tags: (place.tags || []) as string[],
  }));
}

/**
 * Get a single place by ID
 */
export async function getPlace(placeId: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', placeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    tags: (data.tags || []) as string[],
  };
}

/**
 * Create a new place
 */
export async function createPlace(spaceId: string, input: PlaceInput): Promise<Place> {
  // Determine if this is a household or personal space
  const { data: space } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  const placeData: any = {
    space_id: spaceId,
    name: input.name,
    type: input.type,
    tags: input.tags || [],
    cuisine: input.cuisine || null,
    favourite: input.favourite ?? false,
    location_text: input.location_text || null,
    website_url: input.website_url || null,
    notes: input.notes || null,
  };

  if (space.context_type === 'household') {
    placeData.household_id = space.context_id;
    placeData.profile_id = null;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profileId = await getProfileIdFromAuthUserId(user.id);
    if (!profileId) {
      throw new Error('Profile not found for authenticated user');
    }
    placeData.profile_id = profileId;
    placeData.household_id = null;
  }

  const { data, error } = await supabase
    .from('places')
    .insert(placeData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    tags: (data.tags || []) as string[],
  };
}

/**
 * Update a place
 */
export async function updatePlace(placeId: string, input: Partial<PlaceInput>): Promise<Place> {
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.cuisine !== undefined) updateData.cuisine = input.cuisine;
  if (input.favourite !== undefined) updateData.favourite = input.favourite;
  if (input.location_text !== undefined) updateData.location_text = input.location_text;
  if (input.website_url !== undefined) updateData.website_url = input.website_url;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('places')
    .update(updateData)
    .eq('id', placeId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    tags: (data.tags || []) as string[],
  };
}

/**
 * Delete a place
 */
export async function deletePlace(placeId: string): Promise<void> {
  const { error } = await supabase
    .from('places')
    .delete()
    .eq('id', placeId);

  if (error) {
    throw error;
  }
}

/**
 * Get orders for a place
 */
export async function getPlaceOrders(placeId: string): Promise<PlaceOrder[]> {
  const { data, error } = await supabase
    .from('place_orders')
    .select('*')
    .eq('place_id', placeId)
    .order('favourite', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(order => ({
    ...order,
    dietary_tags: (order.dietary_tags || []) as string[],
  }));
}

/**
 * Create a place order
 */
export async function createPlaceOrder(placeId: string, input: PlaceOrderInput): Promise<PlaceOrder> {
  const { data, error } = await supabase
    .from('place_orders')
    .insert({
      place_id: placeId,
      name: input.name,
      notes: input.notes || null,
      dietary_tags: input.dietary_tags || [],
      favourite: input.favourite ?? false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    dietary_tags: (data.dietary_tags || []) as string[],
  };
}

/**
 * Update a place order
 */
export async function updatePlaceOrder(orderId: string, input: Partial<PlaceOrderInput>): Promise<PlaceOrder> {
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.dietary_tags !== undefined) updateData.dietary_tags = input.dietary_tags;
  if (input.favourite !== undefined) updateData.favourite = input.favourite;

  const { data, error } = await supabase
    .from('place_orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    dietary_tags: (data.dietary_tags || []) as string[],
  };
}

/**
 * Delete a place order
 */
export async function deletePlaceOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('place_orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    throw error;
  }
}

/**
 * Get meal slot assignments for a week
 */
export async function getMealSlotAssignments(
  spaceId: string,
  weekStartDate: string
): Promise<MealSlotAssignment[]> {
  const { data, error } = await supabase
    .from('meal_slot_assignments')
    .select(`
      *,
      recipe:recipes(*),
      prepared_meal:prepared_meals(*),
      place:places(*),
      place_order:place_orders(*)
    `)
    .eq('space_id', spaceId)
    .eq('week_start_date', weekStartDate)
    .order('day_of_week', { ascending: true })
    .order('meal_slot_id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(assignment => ({
    ...assignment,
    tags: assignment.place?.tags ? (assignment.place.tags as string[]) : [],
  })) as MealSlotAssignment[];
}

/**
 * Create or update a meal slot assignment
 */
export async function upsertMealSlotAssignment(
  spaceId: string,
  input: MealSlotAssignmentInput
): Promise<MealSlotAssignment> {
  const assignmentData: any = {
    space_id: spaceId,
    week_start_date: input.week_start_date,
    day_of_week: input.day_of_week,
    meal_slot_id: input.meal_slot_id,
    fulfillment_type: input.fulfillment_type,
    recipe_id: input.recipe_id || null,
    prepared_meal_id: input.prepared_meal_id || null,
    servings_used: input.servings_used || null,
    place_id: input.place_id || null,
    place_order_id: input.place_order_id || null,
    eat_out_notes: input.eat_out_notes || null,
    freeform_label: input.freeform_label || null,
    freeform_notes: input.freeform_notes || null,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from('meal_slot_assignments')
    .upsert(assignmentData, {
      onConflict: 'space_id,week_start_date,day_of_week,meal_slot_id',
    })
    .select(`
      *,
      recipe:recipes(*),
      prepared_meal:prepared_meals(*),
      place:places(*),
      place_order:place_orders(*)
    `)
    .single();

  if (error) {
    throw error;
  }

  return data as MealSlotAssignment;
}

/**
 * Delete a meal slot assignment
 */
export async function deleteMealSlotAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_slot_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    throw error;
  }
}

/**
 * Get weekly meal preferences for a space
 */
export async function getWeeklyMealPreferences(spaceId: string): Promise<WeeklyMealPreference[]> {
  const { data, error } = await supabase
    .from('weekly_meal_preferences')
    .select(`
      *,
      recipe:recipes(*),
      prepared_meal:prepared_meals(*),
      place:places(*),
      place_order:place_orders(*)
    `)
    .eq('space_id', spaceId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('meal_slot_id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as WeeklyMealPreference[];
}

/**
 * Create or update a weekly meal preference
 */
export async function upsertWeeklyMealPreference(
  spaceId: string,
  input: WeeklyMealPreferenceInput
): Promise<WeeklyMealPreference> {
  // Determine if this is a household or personal space
  const { data: space } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  const preferenceData: any = {
    space_id: spaceId,
    day_of_week: input.day_of_week,
    meal_slot_id: input.meal_slot_id,
    fulfillment_type: input.fulfillment_type,
    recipe_id: input.recipe_id || null,
    prepared_meal_id: input.prepared_meal_id || null,
    servings_used: input.servings_used || null,
    place_id: input.place_id || null,
    place_order_id: input.place_order_id || null,
    eat_out_notes: input.eat_out_notes || null,
    freeform_label: input.freeform_label || null,
    freeform_notes: input.freeform_notes || null,
    is_active: input.is_active ?? true,
  };

  if (space.context_type === 'household') {
    preferenceData.household_id = space.context_id;
    preferenceData.profile_id = null;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profileId = await getProfileIdFromAuthUserId(user.id);
    if (!profileId) {
      throw new Error('Profile not found for authenticated user');
    }
    preferenceData.profile_id = profileId;
    preferenceData.household_id = null;
  }

  const { data, error } = await supabase
    .from('weekly_meal_preferences')
    .upsert(preferenceData, {
      onConflict: 'space_id,day_of_week,meal_slot_id',
    })
    .select(`
      *,
      recipe:recipes(*),
      prepared_meal:prepared_meals(*),
      place:places(*),
      place_order:place_orders(*)
    `)
    .single();

  if (error) {
    throw error;
  }

  return data as WeeklyMealPreference;
}

/**
 * Delete a weekly meal preference
 */
export async function deleteWeeklyMealPreference(preferenceId: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_meal_preferences')
    .delete()
    .eq('id', preferenceId);

  if (error) {
    throw error;
  }
}

/**
 * Apply weekly preferences to a week (auto-fill empty slots)
 */
export async function applyWeeklyPreferences(
  spaceId: string,
  weekStartDate: string
): Promise<void> {
  const preferences = await getWeeklyMealPreferences(spaceId);
  
  // Get existing assignments for this week
  const existingAssignments = await getMealSlotAssignments(spaceId, weekStartDate);
  const existingKeys = new Set(
    existingAssignments.map(a => `${a.day_of_week}-${a.meal_slot_id}`)
  );

  // Apply preferences to empty slots
  for (const preference of preferences) {
    const key = `${preference.day_of_week}-${preference.meal_slot_id}`;
    
    // Skip if slot already has an assignment
    if (existingKeys.has(key)) {
      continue;
    }

    // Create assignment from preference
    await upsertMealSlotAssignment(spaceId, {
      week_start_date: weekStartDate,
      day_of_week: preference.day_of_week,
      meal_slot_id: preference.meal_slot_id,
      fulfillment_type: preference.fulfillment_type,
      recipe_id: preference.recipe_id,
      prepared_meal_id: preference.prepared_meal_id,
      servings_used: preference.servings_used,
      place_id: preference.place_id,
      place_order_id: preference.place_order_id,
      eat_out_notes: preference.eat_out_notes,
      freeform_label: preference.freeform_label,
      freeform_notes: preference.freeform_notes,
    });
  }
}
