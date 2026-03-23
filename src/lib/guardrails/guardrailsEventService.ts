/**
 * Guardrails Event Service - Domain Entity Service
 * 
 * Phase 1: Domain entity service for Guardrails Events.
 * 
 * Responsibilities:
 * - CRUD operations on guardrails_events (domain table)
 * - Enforce permissions via RLS
 * - Enforce validation
 * - NO roadmap logic (roadmap is projection layer)
 * 
 * Phase 0 Rule: Domain entities own semantics, lifecycle, validation.
 */

import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export interface GuardrailsEvent {
  id: string;
  masterProjectId: string;
  sideProjectId: string | null;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  location: string | null;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateGuardrailsEventInput {
  masterProjectId: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface UpdateGuardrailsEventInput {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  metadata?: Record<string, any>;
}

export interface EventFilters {
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
  location?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new Guardrails Event (domain entity)
 */
export async function createGuardrailsEvent(
  input: CreateGuardrailsEventInput
): Promise<GuardrailsEvent> {
  // Validation
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Event title is required');
  }

  // Validate temporal constraints
  if (input.startAt && input.endAt) {
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (end < start) {
      throw new Error('Event end time must be after start time');
    }
  }

  const { data, error } = await supabase
    .from('guardrails_events')
    .insert({
      master_project_id: input.masterProjectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_at: input.startAt || null,
      end_at: input.endAt || null,
      timezone: input.timezone || 'UTC',
      location: input.location?.trim() || null,
      metadata: input.metadata || {},
      created_by: input.createdBy || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  return transformFromDb(data);
}

/**
 * Get a Guardrails Event by ID
 */
export async function getGuardrailsEvent(
  eventId: string
): Promise<GuardrailsEvent | null> {
  const { data, error } = await supabase
    .from('guardrails_events')
    .select('*')
    .eq('id', eventId)
    .is('archived_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get event: ${error.message}`);
  }

  return data ? transformFromDb(data) : null;
}

/**
 * Update a Guardrails Event (domain entity)
 */
export async function updateGuardrailsEvent(
  eventId: string,
  input: UpdateGuardrailsEventInput
): Promise<GuardrailsEvent> {
  // Validation
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new Error('Event title cannot be empty');
  }

  // Validate temporal constraints
  const startAt = input.startAt;
  const endAt = input.endAt;
  if (startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end < start) {
      throw new Error('Event end time must be after start time');
    }
  }

  // Build update object
  const updateData: any = {};

  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.startAt !== undefined) {
    updateData.start_at = input.startAt;
  }
  if (input.endAt !== undefined) {
    updateData.end_at = input.endAt;
  }
  if (input.timezone !== undefined) {
    updateData.timezone = input.timezone;
  }
  if (input.location !== undefined) {
    updateData.location = input.location?.trim() || null;
  }
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata;
  }

  const { data, error } = await supabase
    .from('guardrails_events')
    .update(updateData)
    .eq('id', eventId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  return transformFromDb(data);
}

/**
 * Archive a Guardrails Event (soft delete)
 */
export async function archiveGuardrailsEvent(
  eventId: string
): Promise<GuardrailsEvent> {
  const { data, error } = await supabase
    .from('guardrails_events')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', eventId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive event: ${error.message}`);
  }

  return transformFromDb(data);
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all Guardrails Events for a project
 */
export async function getGuardrailsEventsByProject(
  projectId: string,
  filters?: EventFilters
): Promise<GuardrailsEvent[]> {
  let query = supabase
    .from('guardrails_events')
    .select('*')
    .eq('master_project_id', projectId)
    .is('archived_at', null)
    .order('start_at', { ascending: true, nullsFirst: false });

  if (filters?.startAfter) {
    query = query.gte('start_at', filters.startAfter);
  }
  if (filters?.startBefore) {
    query = query.lte('start_at', filters.startBefore);
  }
  if (filters?.endAfter) {
    query = query.gte('end_at', filters.endAfter);
  }
  if (filters?.endBefore) {
    query = query.lte('end_at', filters.endBefore);
  }
  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get events: ${error.message}`);
  }

  return (data || []).map(transformFromDb);
}

/**
 * Get events in a date range for a project
 */
export async function getEventsInDateRange(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<GuardrailsEvent[]> {
  const { data, error } = await supabase
    .from('guardrails_events')
    .select('*')
    .eq('master_project_id', projectId)
    .is('archived_at', null)
    .gte('start_at', startDate)
    .lte('start_at', endDate)
    .order('start_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get events in date range: ${error.message}`);
  }

  return (data || []).map(transformFromDb);
}

// ============================================================================
// Helper Functions
// ============================================================================

function transformFromDb(row: any): GuardrailsEvent {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    sideProjectId: row.side_project_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone || 'UTC',
    location: row.location,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}
