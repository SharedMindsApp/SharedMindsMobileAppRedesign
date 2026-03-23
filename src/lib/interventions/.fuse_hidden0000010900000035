/**
 * Stage 3.1: Intervention Registry Service
 *
 * Service layer for CRUD operations on interventions registry.
 * Includes lifecycle tracking and Safe Mode integration.
 *
 * CRITICAL: This is infrastructure only - NO delivery, triggers, or notifications.
 * Interventions can be "active" but nothing executes them (Stage 3.2+).
 *
 * FORBIDDEN in this stage:
 * - Trigger evaluation
 * - Scheduling engines
 * - Notification systems
 * - "intervention fired" events
 * - Adherence or effectiveness metrics
 * - System recommendations
 */

import { supabase } from '../supabase';
import type {
  InterventionRegistryEntry,
  CreateInterventionInput,
  UpdateInterventionInput,
  ListInterventionsFilters,
  LifecycleEvent,
  ListLifecycleEventsFilters,
} from './stage3_1-types';
import { validateUserParameters } from './stage3_1-validate';

export class InterventionServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'InterventionServiceError';
  }
}

async function recordLifecycleEvent(
  userId: string,
  interventionId: string | null,
  eventType: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from('intervention_lifecycle_events')
    .insert({
      user_id: userId,
      intervention_id: interventionId,
      event_type: eventType,
      actor: 'user',
      meta,
    });

  if (error) {
    console.error('Failed to record lifecycle event:', error);
  }
}

export async function createIntervention(
  userId: string,
  input: CreateInterventionInput
): Promise<InterventionRegistryEntry> {
  try {
    const validation = validateUserParameters(input.intervention_key, input.user_parameters);

    if (!validation.valid) {
      if (import.meta.env.DEV) {
        console.warn('[Stage3 Service] Validation failed:', validation.errors);
      }
      throw new InterventionServiceError(
        `Invalid user parameters: ${(validation.errors ?? []).join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    const { data, error } = await supabase
      .from('interventions_registry')
      .insert({
        user_id: userId,
        intervention_key: input.intervention_key,
        why_text: input.why_text || null,
        user_parameters: input.user_parameters,
        consent_scope: input.consent_scope,
        status: 'paused',
        created_by: 'user',
        last_modified_by: 'user',
      })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[Stage3 Service] Database error:', error);
      }
      throw new InterventionServiceError(
        `Failed to create intervention: ${error.message}`,
        'CREATE_ERROR'
      );
    }

    if (!data) {
      throw new InterventionServiceError(
        'No data returned after creating intervention',
        'NO_DATA'
      );
    }

    await recordLifecycleEvent(userId, data.id, 'intervention_created', {
      intervention_key: input.intervention_key,
    });

    return data as InterventionRegistryEntry;
  } catch (error) {
    if (error instanceof InterventionServiceError) {
      throw error;
    }
    if (import.meta.env.DEV) {
      console.error('[Stage3 Service] Unexpected error:', error);
    }
    throw new InterventionServiceError(
      'An unexpected error occurred while creating intervention',
      'UNKNOWN_ERROR'
    );
  }
}

export async function listInterventions(
  userId: string,
  filters?: ListInterventionsFilters
): Promise<InterventionRegistryEntry[]> {
  let query = supabase
    .from('interventions_registry')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.intervention_key) {
    query = query.eq('intervention_key', filters.intervention_key);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new InterventionServiceError(
      `Failed to list interventions: ${error.message}`,
      'LIST_ERROR'
    );
  }

  return (data as InterventionRegistryEntry[]) || [];
}

export async function getIntervention(
  userId: string,
  interventionId: string
): Promise<InterventionRegistryEntry | null> {
  const { data, error } = await supabase
    .from('interventions_registry')
    .select('*')
    .eq('id', interventionId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new InterventionServiceError(
      `Failed to get intervention: ${error.message}`,
      'GET_ERROR'
    );
  }

  return data as InterventionRegistryEntry | null;
}

export async function updateIntervention(
  userId: string,
  interventionId: string,
  input: UpdateInterventionInput
): Promise<InterventionRegistryEntry> {
  const existing = await getIntervention(userId, interventionId);

  if (!existing) {
    throw new InterventionServiceError('Intervention not found', 'NOT_FOUND');
  }

  const updatedParams = input.user_parameters
    ? { ...existing.user_parameters, ...input.user_parameters }
    : existing.user_parameters;

  if (input.user_parameters) {
    const validation = validateUserParameters(existing.intervention_key, updatedParams);

    if (!validation.valid) {
      throw new InterventionServiceError(
        `Invalid user parameters: ${validation.errors?.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
  }

  const { data, error } = await supabase
    .from('interventions_registry')
    .update({
      why_text: input.why_text !== undefined ? input.why_text : existing.why_text,
      user_parameters: updatedParams,
      last_modified_at: new Date().toISOString(),
      last_modified_by: 'user',
    })
    .eq('id', interventionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new InterventionServiceError(
      `Failed to update intervention: ${error.message}`,
      'UPDATE_ERROR'
    );
  }

  await recordLifecycleEvent(userId, interventionId, 'intervention_edited');

  return data as InterventionRegistryEntry;
}

export async function enableIntervention(
  userId: string,
  interventionId: string
): Promise<InterventionRegistryEntry> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('safe_mode_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.safe_mode_enabled) {
    throw new InterventionServiceError(
      'Interventions are paused while Safe Mode is active.',
      'SAFE_MODE_ACTIVE'
    );
  }

  const { data, error } = await supabase
    .from('interventions_registry')
    .update({
      status: 'active',
      enabled_at: new Date().toISOString(),
      paused_by_safe_mode: false,
      last_modified_at: new Date().toISOString(),
    })
    .eq('id', interventionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new InterventionServiceError(
      `Failed to enable intervention: ${error.message}`,
      'ENABLE_ERROR'
    );
  }

  await recordLifecycleEvent(userId, interventionId, 'intervention_enabled');

  return data as InterventionRegistryEntry;
}

export async function pauseIntervention(
  userId: string,
  interventionId: string
): Promise<InterventionRegistryEntry> {
  const { data, error } = await supabase
    .from('interventions_registry')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
    })
    .eq('id', interventionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new InterventionServiceError(
      `Failed to pause intervention: ${error.message}`,
      'PAUSE_ERROR'
    );
  }

  await recordLifecycleEvent(userId, interventionId, 'intervention_paused');

  return data as InterventionRegistryEntry;
}

export async function disableIntervention(
  userId: string,
  interventionId: string
): Promise<InterventionRegistryEntry> {
  const { data, error } = await supabase
    .from('interventions_registry')
    .update({
      status: 'disabled',
      disabled_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
    })
    .eq('id', interventionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new InterventionServiceError(
      `Failed to disable intervention: ${error.message}`,
      'DISABLE_ERROR'
    );
  }

  await recordLifecycleEvent(userId, interventionId, 'intervention_disabled');

  return data as InterventionRegistryEntry;
}

export async function deleteIntervention(
  userId: string,
  interventionId: string
): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_intervention', {
    p_intervention_id: interventionId,
    p_user_id: userId,
  });

  if (error) {
    throw new InterventionServiceError(
      `Failed to delete intervention: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

export async function getLifecycleEvents(
  userId: string,
  filters?: ListLifecycleEventsFilters
): Promise<LifecycleEvent[]> {
  let query = supabase
    .from('intervention_lifecycle_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.intervention_id) {
    query = query.eq('intervention_id', filters.intervention_id);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new InterventionServiceError(
      `Failed to get lifecycle events: ${error.message}`,
      'LIFECYCLE_ERROR'
    );
  }

  return (data as LifecycleEvent[]) || [];
}

export async function countInterventions(
  userId: string,
  status?: 'active' | 'paused' | 'disabled'
): Promise<number> {
  let query = supabase
    .from('interventions_registry')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (status) {
    query = query.eq('status', status);
  }

  const { count, error } = await query;

  if (error) {
    throw new InterventionServiceError(
      `Failed to count interventions: ${error.message}`,
      'COUNT_ERROR'
    );
  }

  return count || 0;
}

export async function pauseAllInterventionsForSafeMode(userId: string): Promise<void> {
  const { error } = await supabase.rpc('pause_all_interventions_for_safe_mode', {
    p_user_id: userId,
  });

  if (error) {
    throw new InterventionServiceError(
      `Failed to pause interventions for Safe Mode: ${error.message}`,
      'SAFE_MODE_PAUSE_ERROR'
    );
  }
}

export async function clearSafeModePauseFlags(userId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_safe_mode_pause_flags', {
    p_user_id: userId,
  });

  if (error) {
    throw new InterventionServiceError(
      `Failed to clear Safe Mode pause flags: ${error.message}`,
      'SAFE_MODE_CLEAR_ERROR'
    );
  }
}
