/**
 * Meal Schedule Service
 * 
 * Service functions for managing user meal schedules
 * 
 * RLS Policy Architecture:
 * - Personal and household meal schedules use SEPARATE INSERT policies to prevent NULL/OR traps
 * - Split policies ensure PostgreSQL only evaluates the relevant policy branch
 * - This prevents complex boolean logic from causing unexpected failures
 * - See migration 20250230000036_split_meal_schedules_insert_policies.sql for details
 * 
 * Why Split Policies?
 * A single monolithic policy with complex OR chains can cause PostgreSQL to evaluate
 * branches you expect to be skipped. Boolean + NULL logic inside RLS is not short-circuited
 * like in application code. Split policies prevent these issues by ensuring only one
 * policy is evaluated per insert, making evaluation deterministic and predictable.
 */

import { supabase } from './supabase';
import type { MealSchedule, DailyMealSchedule, MealSlot } from './mealScheduleTypes';
import { getDefaultMealSchedule, schedulesOverlap } from './mealScheduleTypes';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';
import type { SupabaseClient } from '@supabase/supabase-js';

function isMealSchedulesUnavailable(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;

  return error.code === 'PGRST205' ||
    Boolean(error.message && error.message.includes("Could not find the table 'public.meal_schedules'"));
}

/**
 * Require authenticated user before performing authenticated operations
 * Single source of truth for auth readiness checks
 * 
 * Uses getUser() which is more reliable than getSession() because it:
 * - Validates the token with the server
 * - Returns null if token is invalid/expired
 * - Ensures auth.uid() will be available in RLS policies
 * 
 * @param supabaseClient - Supabase client instance
 * @returns Authenticated user object
 * @throws Error if auth is not ready or user is not authenticated
 */
export async function requireAuthenticatedUser(
  supabaseClient: SupabaseClient = supabase
): Promise<{ id: string }> {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data?.user) {
    throw new Error(
      '[Auth] Attempted to perform authenticated operation before auth was ready. ' +
      `Error: ${error?.message || 'No user found'}`
    );
  }

  return data.user;
}

/**
 * Resolve ownership for a meal schedule based on space type
 * Returns exactly one of: profile_id (personal) OR household_id (household)
 * 
 * Invariant:
 * - Spaces are NOT households
 * - Household ownership is always via space.context_id
 * - Invalid household references are legacy data and must degrade safely
 * 
 * CRITICAL: household_id must come from space.context_id, NOT space.id
 * Spaces are not households - context_id references the actual household
 * 
 * @param space - Space object with context_type and context_id
 * @param authUid - Authenticated user ID
 * @returns Ownership object with exactly one of profile_id or household_id set
 */
async function resolveMealScheduleOwnership(
  space: { id: string; context_type: string; context_id: string | null },
  authUid: string
): Promise<{ profile_id: string | null; household_id: string | null }> {
  if (space.context_type === 'household') {
    // Household schedule: use household_id from space.context_id (NOT space.id)
    if (!space.context_id) {
      // Invalid state: household space with null context_id
      // Gracefully downgrade to personal ownership
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[meal_schedules] Household space ${space.id} has null context_id. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal schedule
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[meal_schedules] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    // Validate that context_id references an existing household space
    // For household spaces, context_id = space.id (self-reference)
    // So we check if a space exists with id = context_id and context_type = 'household'
    const { data: householdSpace, error: householdError } = await supabase
      .from('spaces')
      .select('id, type')
      .eq('id', space.id)
      .eq('type', 'shared')
      .maybeSingle();

    if (householdError) {
      // Database error - log but don't crash, downgrade to personal
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[meal_schedules] Failed to validate household space ${space.context_id}: ${householdError.message}. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal schedule
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[meal_schedules] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    if (!householdSpace) {
      // Invalid state: household space doesn't exist (legacy data)
      // Gracefully downgrade to personal ownership
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[meal_schedules] Household ${space.context_id} referenced by space ${space.id} does not exist. ` +
          'This is likely legacy data. Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal schedule
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[meal_schedules] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    // Validate household membership explicitly (pre-insert check)
    // This ensures failures happen before hitting RLS
    const { data: membershipCheck, error: membershipError } = await supabase
      .rpc('is_user_household_member', { hid: space.context_id });

    if (membershipError) {
      // RPC error - log but don't crash, downgrade to personal
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[meal_schedules] Failed to check household membership: ${membershipError.message}. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal schedule
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[meal_schedules] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    if (!membershipCheck) {
      // User is not a member - this is a security check, throw error
      throw new Error(
        `[meal_schedules] User is not a member of household ${space.context_id} associated with space ${space.id}. ` +
        'Cannot create meal schedule without household membership.'
      );
    }

    // All validations passed - return household ownership
    return {
      household_id: space.context_id, // Use context_id, NOT space.id
      profile_id: null,
    };
  } else {
    // Personal schedule: resolve profile_id from auth user
    const profileId = await getProfileIdFromAuthUserId(authUid);
    if (!profileId) {
      throw new Error('[meal_schedules] Profile not found for authenticated user');
    }
    return {
      profile_id: profileId,
      household_id: null,
    };
  }
}

/**
 * Validate meal schedule ownership before insert
 * Ensures exactly one of profile_id or household_id is set
 * 
 * @param insertData - Insert payload to validate
 * @throws Error if ownership is invalid
 */
function validateMealScheduleOwnership(insertData: {
  profile_id?: string | null;
  household_id?: string | null;
}): void {
  const hasProfileId = insertData.profile_id !== null && insertData.profile_id !== undefined;
  const hasHouseholdId = insertData.household_id !== null && insertData.household_id !== undefined;

  if (hasProfileId && hasHouseholdId) {
    throw new Error(
      '[meal_schedules] Invalid ownership: both profile_id and household_id set. ' +
      'Exactly one must be set: profile_id for personal schedules, household_id for household schedules.'
    );
  }

  if (!hasProfileId && !hasHouseholdId) {
    throw new Error(
      '[meal_schedules] Invalid ownership: neither profile_id nor household_id set. ' +
      'Exactly one must be set: profile_id for personal schedules, household_id for household schedules.'
    );
  }
}

/**
 * Get the default meal schedule for a space
 * Creates one if it doesn't exist
 */
export async function getDefaultMealScheduleForSpace(spaceId: string): Promise<MealSchedule> {
  // First, check if ANY schedules exist for this space
  const { data: allSchedules, error: allSchedulesError } = await supabase
    .from('meal_schedules')
    .select('*')
    .eq('space_id', spaceId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (allSchedulesError) {
    if (isMealSchedulesUnavailable(allSchedulesError)) {
      const fallbackSchedule = getDefaultMealSchedule();
      fallbackSchedule.space_id = spaceId;
      return fallbackSchedule;
    }
    throw allSchedulesError;
  }

  // If schedules exist, return the default one (or first one if no default)
  if (allSchedules && allSchedules.length > 0) {
    const defaultSchedule = allSchedules.find(s => s.is_default) || allSchedules[0];
    return {
      ...defaultSchedule,
      schedules: defaultSchedule.schedules as DailyMealSchedule[],
    };
  }

  // No schedules exist at all - create a default one
  const defaultSchedule = getDefaultMealSchedule();
  defaultSchedule.space_id = spaceId;

  // 1️⃣ HARD AUTH GATE: Block ALL inserts until auth is ready
  // This ensures auth.uid() is available in RLS policies
  const user = await requireAuthenticatedUser(supabase);
  const authUid = user.id;

  // 2️⃣ Resolve space and ownership explicitly
  // Fetch full space record to get id, context_type and context_id
  const { data: space } = await supabase
    .from('spaces')
    .select('id, type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  // 3️⃣ Resolve ownership explicitly (exactly one of profile_id OR household_id)
  // CRITICAL: household_id comes from space.context_id, NOT space.id
  // Spaces are not households - context_id references the actual household
  const ownership = await resolveMealScheduleOwnership(space, authUid);

  // 4️⃣ Construct insert payload with explicit ownership
  const insertData: {
    space_id: string;
    profile_id: string | null;
    household_id: string | null;
    name: string;
    is_default: boolean;
    is_active: boolean;
    start_date: null;
    end_date: null;
    schedules: DailyMealSchedule[];
  } = {
    space_id: spaceId,
    ...ownership, // Explicit ownership: exactly one of profile_id or household_id
    name: defaultSchedule.name,
    is_default: true,
    is_active: true,
    start_date: null,
    end_date: null,
    schedules: defaultSchedule.schedules,
  };

  // 5️⃣ Defensive validation: ensure ownership is correct before insert
  validateMealScheduleOwnership(insertData);

  // 6️⃣ Diagnostic logging (dev only) - must never log authUid: null
  if (process.env.NODE_ENV === 'development') {
    console.debug('[meal_schedules insert]', {
      spaceId: space.id,
      spaceContextType: space.context_type,
      spaceContextId: space.context_id,
      resolvedOwnership: {
        profileId: insertData.profile_id,
        householdId: insertData.household_id,
      },
      // Never log auth.uid() in production - only in dev
      authUid: user.id, // Must never be null at this point
      validation: {
        hasProfileId: insertData.profile_id !== null,
        hasHouseholdId: insertData.household_id !== null,
        exactlyOneOwner: (insertData.profile_id !== null) !== (insertData.household_id !== null),
      },
    });
  }

  const { data: created, error: createError } = await supabase
    .from('meal_schedules')
    .insert(insertData)
    .select()
    .single();

  if (createError) {
    // Preflight diagnostics for RLS failures (403/42501)
    // Only call debug function on RLS errors to avoid spamming logs on success
    let rlsDebugInfo = null;
    if (createError.code === '42501' || createError.code === 'PGRST301' || (createError.message && createError.message.includes('row-level security'))) {
      // This is an RLS policy violation - call debug function to see which condition failed
      try {
        const { data: debugData, error: debugError } = await supabase.rpc('debug_can_insert_meal_schedule', {
          created_for_profile_id: insertData.profile_id || null,
          household_id: insertData.household_id || null,
        });
        
        if (!debugError && debugData) {
          rlsDebugInfo = debugData;
        } else {
          console.warn('[mealScheduleService] Debug function call failed:', debugError);
        }
      } catch (debugErr) {
        console.warn('[mealScheduleService] Error calling debug function:', debugErr);
      }
    }

    // Get current session user ID for diagnostics
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const currentAuthUserId = currentUser?.id || null;

    console.error('[mealScheduleService] Meal schedule insert failed:', {
      error: createError,
      errorCode: createError.code,
      errorMessage: createError.message,
      errorDetails: createError.details,
      errorHint: createError.hint,
      insertPayload: {
        space_id: insertData.space_id,
        profile_id: insertData.profile_id,
        household_id: insertData.household_id,
        name: insertData.name,
        is_default: insertData.is_default,
        is_active: insertData.is_active,
        start_date: insertData.start_date,
        end_date: insertData.end_date,
      },
      currentAuthUserId,
      rlsDebugInfo, // Debug function output showing which policy conditions passed/failed
      diagnosticNote: createError.code === '42501' || createError.code === 'PGRST301'
        ? 'RLS policy violation - check rlsDebugInfo above to see which policy condition failed. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch (personal vs household).'
        : 'Check error details above.',
    });
    throw createError;
  }

  return {
    ...created,
    schedules: created.schedules as DailyMealSchedule[],
  };
}

/**
 * Get all meal schedules for a space
 */
export async function getMealSchedulesForSpace(spaceId: string): Promise<MealSchedule[]> {
  const { data, error } = await supabase
    .from('meal_schedules')
    .select('*')
    .eq('space_id', spaceId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMealSchedulesUnavailable(error)) {
      const fallbackSchedule = getDefaultMealSchedule();
      fallbackSchedule.space_id = spaceId;
      return [fallbackSchedule];
    }
    throw error;
  }

  return (data || []).map(schedule => ({
    ...schedule,
    schedules: schedule.schedules as DailyMealSchedule[],
  }));
}

/**
 * Create a new meal schedule
 */
export async function createMealSchedule(
  spaceId: string,
  name: string,
  schedules: DailyMealSchedule[],
  options?: {
    isDefault?: boolean;
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<MealSchedule> {
  const isDefault = options?.isDefault ?? false;
  const isActive = options?.isActive ?? true;
  const startDate = options?.startDate || null;
  const endDate = options?.endDate || null;

  // If this is being set as default, unset other defaults
  if (isDefault) {
    await supabase
      .from('meal_schedules')
      .update({ is_default: false })
      .eq('space_id', spaceId)
      .eq('is_default', true);
  }

  // 1️⃣ HARD AUTH GATE: Block ALL inserts until auth is ready
  // This ensures auth.uid() is available in RLS policies
  const user = await requireAuthenticatedUser(supabase);
  const authUid = user.id;

  // 2️⃣ Resolve space and ownership explicitly
  // Fetch full space record to get id, context_type and context_id
  const { data: space } = await supabase
    .from('spaces')
    .select('id, type')
    .eq('id', spaceId)
    .single();

  if (!space) {
    throw new Error(`Space ${spaceId} not found`);
  }

  // 3️⃣ Resolve ownership explicitly (exactly one of profile_id OR household_id)
  // CRITICAL: household_id comes from space.context_id, NOT space.id
  // Spaces are not households - context_id references the actual household
  const ownership = await resolveMealScheduleOwnership(space, authUid);

  // 4️⃣ Construct insert payload with explicit ownership
  const insertData: {
    space_id: string;
    profile_id: string | null;
    household_id: string | null;
    name: string;
    is_default: boolean;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    schedules: DailyMealSchedule[];
  } = {
    space_id: spaceId,
    ...ownership, // Explicit ownership: exactly one of profile_id or household_id
    name,
    is_default: isDefault,
    is_active: isActive,
    start_date: startDate,
    end_date: endDate,
    schedules,
  };

  // 5️⃣ Defensive validation: ensure ownership is correct before insert
  validateMealScheduleOwnership(insertData);

  // 6️⃣ Diagnostic logging (dev only) - must never log authUid: null
  if (process.env.NODE_ENV === 'development') {
    console.debug('[meal_schedules insert]', {
      spaceId: space.id,
      spaceContextType: space.context_type,
      spaceContextId: space.context_id,
      resolvedOwnership: {
        profileId: insertData.profile_id,
        householdId: insertData.household_id,
      },
      // Never log auth.uid() in production - only in dev
      authUid: user.id, // Must never be null at this point
      validation: {
        hasProfileId: insertData.profile_id !== null,
        hasHouseholdId: insertData.household_id !== null,
        exactlyOneOwner: (insertData.profile_id !== null) !== (insertData.household_id !== null),
      },
    });
  }

  const { data, error } = await supabase
    .from('meal_schedules')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Preflight diagnostics for RLS failures (403/42501)
    // Only call debug function on RLS errors to avoid spamming logs on success
    let rlsDebugInfo = null;
    if (error.code === '42501' || error.code === 'PGRST301' || (error.message && error.message.includes('row-level security'))) {
      // This is an RLS policy violation - call debug function to see which condition failed
      try {
        const { data: debugData, error: debugError } = await supabase.rpc('debug_can_insert_meal_schedule', {
          created_for_profile_id: insertData.profile_id || null,
          household_id: insertData.household_id || null,
        });
        
        if (!debugError && debugData) {
          rlsDebugInfo = debugData;
        } else {
          console.warn('[mealScheduleService] Debug function call failed:', debugError);
        }
      } catch (debugErr) {
        console.warn('[mealScheduleService] Error calling debug function:', debugErr);
      }
    }

    // Get current session user ID for diagnostics
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const currentAuthUserId = currentUser?.id || null;

    console.error('[mealScheduleService] Meal schedule insert failed:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      insertPayload: {
        space_id: insertData.space_id,
        profile_id: insertData.profile_id,
        household_id: insertData.household_id,
        name: insertData.name,
        is_default: insertData.is_default,
        is_active: insertData.is_active,
        start_date: insertData.start_date,
        end_date: insertData.end_date,
      },
      currentAuthUserId,
      rlsDebugInfo, // Debug function output showing which policy conditions passed/failed
      diagnosticNote: error.code === '42501' || error.code === 'PGRST301'
        ? 'RLS policy violation - check rlsDebugInfo above to see which policy condition failed. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch (personal vs household).'
        : 'Check error details above.',
    });
    throw error;
  }

  return {
    ...data,
    schedules: data.schedules as DailyMealSchedule[],
  };
}

/**
 * Check for conflicting schedules
 */
export async function checkScheduleConflicts(
  spaceId: string,
  scheduleId: string | null,
  startDate: string | null,
  endDate: string | null,
  isActive: boolean
): Promise<{ hasConflict: boolean; conflictingSchedules: MealSchedule[] }> {
  if (!isActive) {
    return { hasConflict: false, conflictingSchedules: [] };
  }

  // Get all active schedules for this space
  const { data: schedules, error } = await supabase
    .from('meal_schedules')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_active', true);

  if (error) {
    if (isMealSchedulesUnavailable(error)) {
      return { hasConflict: false, conflictingSchedules: [] };
    }
    throw error;
  }

  const allSchedules = (schedules || []).map(s => ({
    ...s,
    schedules: s.schedules as DailyMealSchedule[],
  })) as MealSchedule[];

  // Filter out the current schedule if editing
  const otherSchedules = scheduleId
    ? allSchedules.filter(s => s.id !== scheduleId)
    : allSchedules;

  // Check for overlaps
  const testSchedule: MealSchedule = {
    id: scheduleId || 'temp',
    space_id: spaceId,
    name: 'Test',
    is_default: false,
    is_active: isActive,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    schedules: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const conflictingSchedules = otherSchedules.filter(s => schedulesOverlap(testSchedule, s));

  return {
    hasConflict: conflictingSchedules.length > 0,
    conflictingSchedules,
  };
}

/**
 * Update a meal schedule
 */
export async function updateMealSchedule(
  scheduleId: string,
  updates: {
    name?: string;
    schedules?: DailyMealSchedule[];
    is_default?: boolean;
    is_active?: boolean;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<MealSchedule> {
  // If this is being set as default, unset other defaults
  if (updates.is_default) {
    const { data: schedule } = await supabase
      .from('meal_schedules')
      .select('space_id')
      .eq('id', scheduleId)
      .single();

    if (schedule) {
      await supabase
        .from('meal_schedules')
        .update({ is_default: false })
        .eq('space_id', schedule.space_id)
        .eq('is_default', true)
        .neq('id', scheduleId);
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.schedules !== undefined) updateData.schedules = updates.schedules;
  if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;

  const { data, error } = await supabase
    .from('meal_schedules')
    .update(updateData)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    schedules: data.schedules as DailyMealSchedule[],
  };
}

/**
 * Delete a meal schedule
 */
export async function deleteMealSchedule(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    throw error;
  }
}

/**
 * Set a schedule as the default
 */
export async function setDefaultMealSchedule(scheduleId: string): Promise<MealSchedule> {
  // Get the schedule to find its space_id
  const { data: schedule } = await supabase
    .from('meal_schedules')
    .select('space_id')
    .eq('id', scheduleId)
    .single();

  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`);
  }

  // Unset other defaults
  await supabase
    .from('meal_schedules')
    .update({ is_default: false })
    .eq('space_id', schedule.space_id)
    .eq('is_default', true)
    .neq('id', scheduleId);

  // Set this one as default
  return updateMealSchedule(scheduleId, { is_default: true });
}
