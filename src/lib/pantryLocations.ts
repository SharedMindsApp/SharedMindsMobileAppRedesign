/**
 * Pantry Locations Service
 * 
 * Manages pantry locations (e.g. Fridge, Freezer, Cupboard) scoped to spaces.
 * Lightweight spatial organization without inventory pressure.
 * 
 * ADHD-First Principles:
 * - No pressure or required fields
 * - All actions are optional
 * - Locations are memory aids, not management tools
 * 
 * Ownership Invariant:
 * - exactly one of profile_id (personal) OR household_id (household)
 * - never both
 * - never neither
 * - ownership must match space context
 */

import { supabase } from './supabase';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';

const defaultLocationRequests = new Map<string, Promise<PantryLocation[]>>();
const DEFAULT_PANTRY_LOCATIONS = [
  { name: 'Fridge', icon: '🧊' },
  { name: 'Freezer', icon: '❄️' },
  { name: 'Cupboard', icon: '🧺' },
] as const;

export interface PantryLocation {
  id: string;
  space_id: string;
  profile_id: string | null; // For personal spaces
  household_id: string | null; // For household spaces
  name: string;
  icon: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
}

/**
 * Require authenticated user before performing authenticated operations
 * Single source of truth for auth readiness checks
 */
async function requireAuthenticatedUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error(
      '[pantry_locations] Attempted to perform authenticated operation before auth was ready'
    );
  }
  return data.user;
}

/**
 * Resolve ownership for a pantry location based on space type
 * Returns exactly one of: profile_id (personal) OR household_id (household)
 * 
 * Invariant:
 * - Personal spaces store profile ownership.
 * - Shared spaces store space-backed household ownership.
 *
 * In the V1 schema pantry data is scoped directly to spaces.id. Shared spaces
 * behave as the "household" boundary for pantry data.
 *
 * @param space - Space object from public.spaces
 * @param authUid - Authenticated user ID
 * @returns Ownership object with exactly one of profile_id or household_id set
 */
async function resolvePantryLocationOwnership(
  space: { id: string; type: 'personal' | 'shared' },
  authUid: string
): Promise<{ profile_id: string | null; household_id: string | null }> {
  if (space.type === 'shared') {
    return {
      household_id: space.id,
      profile_id: null,
    };
  }

  const profileId = await getProfileIdFromAuthUserId(authUid);
  if (!profileId) {
    throw new Error('[pantry_locations] Profile not found for authenticated user');
  }

  return {
    profile_id: profileId,
    household_id: null,
  };
}

/**
 * Validate pantry location ownership before insert
 * Ensures exactly one of profile_id or household_id is set
 * 
 * @param insertData - Insert payload to validate
 * @throws Error if ownership is invalid
 */
function validatePantryLocationOwnership(insertData: {
  profile_id?: string | null;
  household_id?: string | null;
}): void {
  const hasProfileId = insertData.profile_id !== null && insertData.profile_id !== undefined;
  const hasHouseholdId = insertData.household_id !== null && insertData.household_id !== undefined;

  if (hasProfileId && hasHouseholdId) {
    throw new Error(
      '[pantry_locations] Invalid ownership: both profile_id and household_id cannot be set. ' +
      'Exactly one must be set, never both.'
    );
  }

  if (!hasProfileId && !hasHouseholdId) {
    throw new Error(
      '[pantry_locations] Invalid ownership: neither profile_id nor household_id is set. ' +
      'Exactly one must be set, never neither.'
    );
  }
}

export interface CreatePantryLocationParams {
  spaceId: string;
  name: string;
  icon?: string;
}

export interface UpdatePantryLocationParams {
  name?: string;
  icon?: string;
  order_index?: number;
}

/**
 * Get all pantry locations for a space
 */
export async function getPantryLocations(spaceId: string): Promise<PantryLocation[]> {
  const { data, error } = await supabase
    .from('pantry_locations')
    .select('*')
    .eq('space_id', spaceId)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new pantry location
 * 
 * Note: If a location with the same name already exists for this space,
 * this will throw a unique constraint error. Use ensureDefaultLocations
 * for idempotent default creation.
 */
export async function createPantryLocation(
  params: CreatePantryLocationParams
): Promise<PantryLocation> {
  // 1️⃣ HARD AUTH GATE: Block ALL inserts until auth is ready
  // This ensures auth.uid() is available in RLS policies
  const user = await requireAuthenticatedUser();
  const authUid = user.id;

  // 2️⃣ Resolve space and ownership explicitly
  const { data: space } = await supabase
    .from('spaces')
    .select('id, type')
    .eq('id', params.spaceId)
    .maybeSingle();

  if (!space) {
    throw new Error(`[pantry_locations] Space ${params.spaceId} not found`);
  }

  // 3️⃣ Resolve ownership explicitly (exactly one of profile_id OR household_id)
  const ownership = await resolvePantryLocationOwnership(space, authUid);

  // 4️⃣ Construct insert payload with explicit ownership
  const insertData: {
    space_id: string;
    profile_id: string | null;
    household_id: string | null;
    name: string;
    icon: string | null;
    order_index: number;
  } = {
    space_id: params.spaceId,
    ...ownership,
    name: params.name,
    icon: params.icon || null,
    order_index: 0, // Will be updated below
  };

  // 5️⃣ Validate ownership before insert
  validatePantryLocationOwnership(insertData);

  // Get the next order_index
  const existingLocations = await getPantryLocations(params.spaceId);
  insertData.order_index = existingLocations.length > 0
    ? Math.max(...existingLocations.map(l => l.order_index)) + 1
    : 0;

  // 6️⃣ Insert with explicit ownership
  // Dev-only diagnostic logging
  if (process.env.NODE_ENV === 'development') {
    console.debug('[pantry_locations insert]', {
      spaceId: params.spaceId,
      spaceType: space.type,
      resolvedOwnership: ownership,
      insertData: {
        space_id: insertData.space_id,
        profile_id: insertData.profile_id,
        household_id: insertData.household_id,
        name: insertData.name,
      },
    });
  }

  const { data, error } = await supabase
    .from('pantry_locations')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Check if this is a conflict error (unique constraint violation)
    // These are expected in concurrent scenarios and should be handled by the caller
    const isConflictError = 
      error?.code === '23505' || 
      error?.code === 'PGRST204' || 
      error?.status === 409 ||
      error?.statusCode === 409 ||
      (error?.message && (
        error.message.includes('unique constraint') ||
        error.message.includes('duplicate key') ||
        error.message.includes('already exists') ||
        error.message.toLowerCase().includes('conflict')
      ));

    // Only log non-conflict errors (conflict errors are expected and handled by callers)
    if (!isConflictError) {
      console.error('[pantry_locations] Insert failed:', {
        error,
        insertData: {
          space_id: insertData.space_id,
          profile_id: insertData.profile_id,
          household_id: insertData.household_id,
          name: insertData.name,
        },
      });
    }
    throw error;
  }

  return data;
}

/**
 * Update a pantry location
 */
export async function updatePantryLocation(
  id: string,
  updates: UpdatePantryLocationParams
): Promise<PantryLocation> {
  const { data, error } = await supabase
    .from('pantry_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a pantry location
 * Items with this location will have location_id set to NULL (handled by FK constraint)
 */
export async function deletePantryLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('pantry_locations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder locations
 */
export async function reorderPantryLocations(
  spaceId: string,
  locationIds: string[]
): Promise<PantryLocation[]> {
  // Update order_index for each location
  const updates = locationIds.map((id, index) => ({
    id,
    order_index: index,
  }));

  for (const update of updates) {
    await updatePantryLocation(update.id, { order_index: update.order_index });
  }

  return getPantryLocations(spaceId);
}

/**
 * Ensure default locations exist for a space
 * Creates default locations silently if none exist
 * This is called automatically on first pantry load
 * 
 * Idempotent: Safe to call multiple times, handles conflicts gracefully
 */
export async function ensureDefaultLocations(spaceId: string): Promise<PantryLocation[]> {
  const inFlight = defaultLocationRequests.get(spaceId);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const existingLocations = await getPantryLocations(spaceId);
    if (existingLocations.length > 0) {
      return existingLocations;
    }

    const user = await requireAuthenticatedUser();
    const authUid = user.id;

    const { data: space } = await supabase
      .from('spaces')
      .select('id, type')
      .eq('id', spaceId)
      .maybeSingle();

    if (!space) {
      throw new Error(`[pantry_locations] Space ${spaceId} not found`);
    }

    const ownership = await resolvePantryLocationOwnership(space, authUid);
    const defaultLocationsPayload = DEFAULT_PANTRY_LOCATIONS.map((location, index) => ({
      space_id: spaceId,
      ...ownership,
      name: location.name,
      icon: location.icon,
      order_index: index,
    }));

    defaultLocationsPayload.forEach(validatePantryLocationOwnership);

    const { error } = await supabase
      .from('pantry_locations')
      .upsert(defaultLocationsPayload, {
        onConflict: 'space_id,name',
        ignoreDuplicates: false,
      });

    if (error) {
      throw error;
    }

    return getPantryLocations(spaceId);
  })();

  defaultLocationRequests.set(spaceId, request);

  try {
    return await request;
  } finally {
    defaultLocationRequests.delete(spaceId);
  }
}
