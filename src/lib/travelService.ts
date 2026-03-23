import { supabase } from './supabase';

// Types
export type TripType = 'solo' | 'couple' | 'family' | 'group' | 'event' | 'tour';
export type TripVisibility = 'personal' | 'shared';
export type TripStatus = 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'archived';
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface Trip {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  trip_type: TripType;
  start_date: string | null;
  end_date: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  cover_image_url: string | null;
  notes: string | null;
  context_id: string | null;  // Optional link to context for container/nested events
  created_at: string;
  updated_at: string;
}

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string | null;
  joined_at: string;
}

export interface TripDestination {
  id: string;
  trip_id: string;
  name: string;
  country: string | null;
  city: string | null;
  timezone: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  order_index: number;
  notes: string | null;
  created_at: string;
}

export interface TripItineraryItem {
  id: string;
  trip_id: string;
  destination_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  category: 'travel' | 'activity' | 'food' | 'reservation' | 'milestone';
  location: string | null;
  booking_reference: string | null;
  cost: number | null;
  assigned_to: string[] | null;
  notes: string | null;
  order_index: number;
  created_at: string;
}

export interface TripAccommodation {
  id: string;
  trip_id: string;
  destination_id: string | null;
  name: string;
  type: 'hotel' | 'airbnb' | 'hostel' | 'resort' | 'camping' | 'other';
  address: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  booking_reference: string | null;
  cost: number | null;
  currency: string;
  assigned_travellers: string[] | null;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
}

export interface TripPlace {
  id: string;
  trip_id: string;
  destination_id: string | null;
  name: string;
  category: 'food' | 'activity' | 'landmark' | 'shopping' | 'nature' | 'culture';
  priority: 'must_see' | 'want_to_see' | 'if_time' | 'maybe';
  address: string | null;
  notes: string | null;
  suggested_by: string | null;
  votes: number;
  visited: boolean;
  visited_date: string | null;
  created_at: string;
}

export interface TripPackingList {
  id: string;
  trip_id: string;
  name: string;
  owner_id: string | null;
  is_master: boolean;
  is_template: boolean;
  created_at: string;
}

export interface TripPackingItem {
  id: string;
  packing_list_id: string;
  category: 'clothing' | 'toiletries' | 'documents' | 'electronics' | 'medication' | 'other';
  item_name: string;
  quantity: number;
  packed: boolean;
  notes: string | null;
  order_index: number;
  created_at: string;
}

export interface TripBudgetCategory {
  id: string;
  trip_id: string;
  category: 'transport' | 'accommodation' | 'food' | 'activities' | 'shopping' | 'other';
  budgeted_amount: number;
  currency: string;
  created_at: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  budget_category_id: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_between: string[] | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

// Trip CRUD
export async function getUserTrips(userId: string): Promise<Trip[]> {
  const { data: ownedTrips, error: ownedError } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', userId);

  if (ownedError) throw ownedError;

  const { data: collaborations, error: collabError } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', userId);

  if (collabError) throw collabError;

  const collaboratedTripIds = collaborations?.map(c => c.trip_id) || [];

  let collaboratedTrips: Trip[] = [];
  if (collaboratedTripIds.length > 0) {
    const { data: collabTrips, error: collabTripsError } = await supabase
      .from('trips')
      .select('*')
      .in('id', collaboratedTripIds);

    if (collabTripsError) throw collabTripsError;
    collaboratedTrips = collabTrips || [];
  }

  const allTrips = [...(ownedTrips || []), ...collaboratedTrips];
  const uniqueTrips = Array.from(
    new Map(allTrips.map(trip => [trip.id, trip])).values()
  );

  uniqueTrips.sort((a, b) => {
    if (a.start_date && b.start_date) {
      return b.start_date.localeCompare(a.start_date);
    }
    if (a.start_date) return -1;
    if (b.start_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return uniqueTrips;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrip(trip: Partial<Trip>): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single();

  if (error) throw error;
  
  // Non-blocking: Ensure context and container event exist
  // Failures are logged but don't block trip creation
  if (data) {
    import('./personalSpaces/tripContextIntegration').then(async (module) => {
      try {
        await module.ensureTripContext(data.id);
        if (data.start_date && data.end_date) {
          await module.ensureTripContainerEvent(data.id);
        }
      } catch (err) {
        console.warn('[travelService] Failed to create trip context/container (non-fatal):', err);
      }
    }).catch(() => {
      // Module import failed - non-fatal
    });
  }
  
  return data;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tripId);

  if (error) throw error;
  
  // Non-blocking: Sync container event if dates changed
  if (updates.start_date !== undefined || updates.end_date !== undefined || updates.name !== undefined) {
    import('./personalSpaces/tripContextIntegration').then(async (module) => {
      try {
        const { data: trip } = await supabase
          .from('trips')
          .select('start_date, end_date')
          .eq('id', tripId)
          .single();
        
        if (trip?.start_date && trip?.end_date) {
          await module.ensureTripContainerEvent(tripId);
        }
      } catch (err) {
        console.warn('[travelService] Failed to sync trip container (non-fatal):', err);
      }
    }).catch(() => {
      // Module import failed - non-fatal
    });
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) throw error;
}

// Collaborators
export async function getTripCollaborators(tripId: string): Promise<TripCollaborator[]> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('*')
    .eq('trip_id', tripId);

  if (error) throw error;
  return data || [];
}

export async function addCollaborator(
  tripId: string,
  userId: string,
  role: CollaboratorRole,
  invitedBy: string
): Promise<TripCollaborator> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .insert({ trip_id: tripId, user_id: userId, role, invited_by: invitedBy })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole
): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .update({ role })
    .eq('id', collaboratorId);

  if (error) throw error;
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) throw error;
}

// Destinations
export async function getTripDestinations(tripId: string): Promise<TripDestination[]> {
  const { data, error } = await supabase
    .from('trip_destinations')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createDestination(destination: Partial<TripDestination>): Promise<TripDestination> {
  const { data, error } = await supabase
    .from('trip_destinations')
    .insert(destination)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDestination(destinationId: string, updates: Partial<TripDestination>): Promise<void> {
  const { error } = await supabase
    .from('trip_destinations')
    .update(updates)
    .eq('id', destinationId);

  if (error) throw error;
}

export async function deleteDestination(destinationId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_destinations')
    .delete()
    .eq('id', destinationId);

  if (error) throw error;
}

// Itinerary
export async function getTripItinerary(tripId: string): Promise<TripItineraryItem[]> {
  const { data, error } = await supabase
    .from('trip_itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createItineraryItem(item: Partial<TripItineraryItem>): Promise<TripItineraryItem> {
  const { data, error } = await supabase
    .from('trip_itinerary_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  
  // Non-blocking: Sync to nested events
  if (data && data.trip_id) {
    import('./personalSpaces/tripContextIntegration').then(async (module) => {
      try {
        await module.syncItineraryToNestedEvents(data.trip_id);
      } catch (err) {
        console.warn('[travelService] Failed to sync itinerary to nested events (non-fatal):', err);
      }
    }).catch(() => {
      // Module import failed - non-fatal
    });
  }
  
  return data;
}

export async function updateItineraryItem(itemId: string, updates: Partial<TripItineraryItem>): Promise<void> {
  // Get trip_id before update
  const { data: item } = await supabase
    .from('trip_itinerary_items')
    .select('trip_id')
    .eq('id', itemId)
    .single();
  
  const { error } = await supabase
    .from('trip_itinerary_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
  
  // Non-blocking: Sync to nested events
  if (item?.trip_id) {
    import('./personalSpaces/tripContextIntegration').then(async (module) => {
      try {
        await module.syncItineraryToNestedEvents(item.trip_id);
      } catch (err) {
        console.warn('[travelService] Failed to sync itinerary update (non-fatal):', err);
      }
    }).catch(() => {
      // Module import failed - non-fatal
    });
  }
}

export async function deleteItineraryItem(itemId: string): Promise<void> {
  // Get trip_id before delete
  const { data: item } = await supabase
    .from('trip_itinerary_items')
    .select('trip_id')
    .eq('id', itemId)
    .single();
  
  const { error } = await supabase
    .from('trip_itinerary_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  
  // Non-blocking: Sync to nested events (will delete orphaned nested event)
  if (item?.trip_id) {
    import('./personalSpaces/tripContextIntegration').then(async (module) => {
      try {
        await module.syncItineraryToNestedEvents(item.trip_id);
      } catch (err) {
        console.warn('[travelService] Failed to sync itinerary delete (non-fatal):', err);
      }
    }).catch(() => {
      // Module import failed - non-fatal
    });
  }
}

// Accommodations
export async function getTripAccommodations(tripId: string): Promise<TripAccommodation[]> {
  const { data, error } = await supabase
    .from('trip_accommodations')
    .select('*')
    .eq('trip_id', tripId)
    .order('check_in_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function createAccommodation(accommodation: Partial<TripAccommodation>): Promise<TripAccommodation> {
  const { data, error } = await supabase
    .from('trip_accommodations')
    .insert(accommodation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccommodation(accommodationId: string, updates: Partial<TripAccommodation>): Promise<void> {
  const { error } = await supabase
    .from('trip_accommodations')
    .update(updates)
    .eq('id', accommodationId);

  if (error) throw error;
}

export async function deleteAccommodation(accommodationId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_accommodations')
    .delete()
    .eq('id', accommodationId);

  if (error) throw error;
}

// Places to Visit
export async function getTripPlaces(tripId: string): Promise<TripPlace[]> {
  const { data, error } = await supabase
    .from('trip_places_to_visit')
    .select('*')
    .eq('trip_id', tripId)
    .order('priority', { ascending: true })
    .order('votes', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPlace(place: Partial<TripPlace>): Promise<TripPlace> {
  const { data, error } = await supabase
    .from('trip_places_to_visit')
    .insert(place)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlace(placeId: string, updates: Partial<TripPlace>): Promise<void> {
  const { error } = await supabase
    .from('trip_places_to_visit')
    .update(updates)
    .eq('id', placeId);

  if (error) throw error;
}

export async function deletePlace(placeId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_places_to_visit')
    .delete()
    .eq('id', placeId);

  if (error) throw error;
}

export async function voteForPlace(placeId: string): Promise<void> {
  const { error } = await supabase.rpc('increment', {
    row_id: placeId,
    table_name: 'trip_places_to_visit',
    column_name: 'votes'
  });

  if (error) {
    // Fallback if function doesn't exist
    const { data: place } = await supabase
      .from('trip_places_to_visit')
      .select('votes')
      .eq('id', placeId)
      .single();

    if (place) {
      await supabase
        .from('trip_places_to_visit')
        .update({ votes: (place.votes || 0) + 1 })
        .eq('id', placeId);
    }
  }
}

// Packing Lists
export async function getTripPackingLists(tripId: string): Promise<TripPackingList[]> {
  const { data, error } = await supabase
    .from('trip_packing_lists')
    .select('*')
    .eq('trip_id', tripId);

  if (error) throw error;
  return data || [];
}

export async function createPackingList(list: Partial<TripPackingList>): Promise<TripPackingList> {
  const { data, error } = await supabase
    .from('trip_packing_lists')
    .insert(list)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPackingItems(listId: string): Promise<TripPackingItem[]> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .select('*')
    .eq('packing_list_id', listId)
    .order('category', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createPackingItem(item: Partial<TripPackingItem>): Promise<TripPackingItem> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePackingItem(itemId: string, updates: Partial<TripPackingItem>): Promise<void> {
  const { error } = await supabase
    .from('trip_packing_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_packing_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

// Budget
export async function getTripBudget(tripId: string): Promise<TripBudgetCategory[]> {
  const { data, error } = await supabase
    .from('trip_budget_categories')
    .select('*')
    .eq('trip_id', tripId);

  if (error) throw error;
  return data || [];
}

export async function createBudgetCategory(category: Partial<TripBudgetCategory>): Promise<TripBudgetCategory> {
  const { data, error } = await supabase
    .from('trip_budget_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBudgetCategory(categoryId: string, updates: Partial<TripBudgetCategory>): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .update(updates)
    .eq('id', categoryId);

  if (error) throw error;
}

export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

export async function getTripExpenses(tripId: string): Promise<TripExpense[]> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createExpense(expense: Partial<TripExpense>): Promise<TripExpense> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpense(expenseId: string, updates: Partial<TripExpense>): Promise<void> {
  const { error } = await supabase
    .from('trip_expenses')
    .update(updates)
    .eq('id', expenseId);

  if (error) throw error;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

// Trip Summary Counts (for efficient list views)
export interface TripSummaryCounts {
  trip_id: string;
  destinations_count: number;
  accommodations_count: number;
  itinerary_items_count: number;
  places_count: number;
}

export async function getTripSummaryCounts(tripIds: string[]): Promise<Record<string, TripSummaryCounts>> {
  if (tripIds.length === 0) {
    return {};
  }

  // Fetch all counts in parallel
  const [destinationsData, accommodationsData, itineraryData, placesData] = await Promise.all([
    supabase
      .from('trip_destinations')
      .select('trip_id')
      .in('trip_id', tripIds),
    supabase
      .from('trip_accommodations')
      .select('trip_id')
      .in('trip_id', tripIds),
    supabase
      .from('trip_itinerary_items')
      .select('trip_id')
      .in('trip_id', tripIds),
    supabase
      .from('trip_places_to_visit')
      .select('trip_id')
      .in('trip_id', tripIds),
  ]);

  // Initialize counts for all trips
  const counts: Record<string, TripSummaryCounts> = {};
  tripIds.forEach(tripId => {
    counts[tripId] = {
      trip_id: tripId,
      destinations_count: 0,
      accommodations_count: 0,
      itinerary_items_count: 0,
      places_count: 0,
    };
  });

  // Count destinations
  (destinationsData.data || []).forEach((row: any) => {
    if (counts[row.trip_id]) {
      counts[row.trip_id].destinations_count++;
    }
  });

  // Count accommodations
  (accommodationsData.data || []).forEach((row: any) => {
    if (counts[row.trip_id]) {
      counts[row.trip_id].accommodations_count++;
    }
  });

  // Count itinerary items
  (itineraryData.data || []).forEach((row: any) => {
    if (counts[row.trip_id]) {
      counts[row.trip_id].itinerary_items_count++;
    }
  });

  // Count places
  (placesData.data || []).forEach((row: any) => {
    if (counts[row.trip_id]) {
      counts[row.trip_id].places_count++;
    }
  });

  return counts;
}

// Calendar Integration
export async function addTripToCalendars(
  tripId: string,
  options: {
    addToPersonal: boolean;
    addToHousehold: boolean;
    householdId?: string;
    addToSpace: boolean;
    spaceId?: string;
  },
  userId: string
): Promise<void> {
  const trip = await getTrip(tripId);
  if (!trip || !trip.start_date || !trip.end_date) return;

  if (options.addToHousehold && options.householdId) {
    await supabase.from('calendar_events').insert({
      household_id: options.householdId,
      created_by: userId,
      title: trip.name,
      description: trip.description || `Trip: ${trip.name}`,
      start_at: trip.start_date,
      end_at: trip.end_date,
      all_day: true,
      color: 'orange',
    });
  }
}
