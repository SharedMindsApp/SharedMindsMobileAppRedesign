/**
 * Guardrails Task Service - Domain Entity Service
 * 
 * Phase 1: Domain entity service for Guardrails Tasks.
 * 
 * Responsibilities:
 * - CRUD operations on guardrails_tasks (domain table)
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

export type GuardrailsTaskStatus = 
  | 'not_started' 
  | 'pending' 
  | 'in_progress' 
  | 'blocked' 
  | 'on_hold' 
  | 'completed' 
  | 'cancelled';

export interface GuardrailsTask {
  id: string;
  masterProjectId: string;
  sideProjectId: string | null;
  title: string;
  description: string | null;
  status: GuardrailsTaskStatus;
  progress: number; // 0-100
  completedAt: string | null;
  dueAt: string | null;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateGuardrailsTaskInput {
  masterProjectId: string;
  title: string;
  description?: string;
  status?: GuardrailsTaskStatus;
  progress?: number;
  dueAt?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface UpdateGuardrailsTaskInput {
  title?: string;
  description?: string;
  status?: GuardrailsTaskStatus;
  progress?: number;
  completedAt?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  status?: GuardrailsTaskStatus;
  dueBefore?: string;
  dueAfter?: string;
  createdBy?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new Guardrails Task (domain entity)
 */
export async function createGuardrailsTask(
  input: CreateGuardrailsTaskInput
): Promise<GuardrailsTask> {
  // Validation
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Task title is required');
  }

  if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
    throw new Error('Task progress must be between 0 and 100');
  }

  // Set completed_at if status is completed
  const completedAt = input.status === 'completed' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('guardrails_tasks')
    .insert({
      master_project_id: input.masterProjectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status || 'pending',
      progress: input.progress ?? 0,
      completed_at: completedAt,
      due_at: input.dueAt || null,
      metadata: input.metadata || {},
      created_by: input.createdBy || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return transformFromDb(data);
}

/**
 * Get a Guardrails Task by ID
 */
export async function getGuardrailsTask(
  taskId: string
): Promise<GuardrailsTask | null> {
  const { data, error } = await supabase
    .from('guardrails_tasks')
    .select('*')
    .eq('id', taskId)
    .is('archived_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data ? transformFromDb(data) : null;
}

/**
 * Update a Guardrails Task (domain entity)
 */
export async function updateGuardrailsTask(
  taskId: string,
  input: UpdateGuardrailsTaskInput
): Promise<GuardrailsTask> {
  // Validation
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new Error('Task title cannot be empty');
  }

  if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
    throw new Error('Task progress must be between 0 and 100');
  }

  // Build update object
  const updateData: any = {};

  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
    // Set completed_at if status changed to completed
    if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (input.status !== 'completed') {
      updateData.completed_at = null;
    }
  }
  if (input.progress !== undefined) {
    updateData.progress = input.progress;
  }
  if (input.completedAt !== undefined) {
    updateData.completed_at = input.completedAt;
  }
  if (input.dueAt !== undefined) {
    updateData.due_at = input.dueAt;
  }
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata;
  }

  const { data, error } = await supabase
    .from('guardrails_tasks')
    .update(updateData)
    .eq('id', taskId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return transformFromDb(data);
}

/**
 * Archive a Guardrails Task (soft delete)
 */
export async function archiveGuardrailsTask(
  taskId: string
): Promise<GuardrailsTask> {
  const { data, error } = await supabase
    .from('guardrails_tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', taskId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive task: ${error.message}`);
  }

  return transformFromDb(data);
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all Guardrails Tasks for a project
 */
export async function getGuardrailsTasksByProject(
  projectId: string,
  filters?: TaskFilters
): Promise<GuardrailsTask[]> {
  let query = supabase
    .from('guardrails_tasks')
    .select('*')
    .eq('master_project_id', projectId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.dueBefore) {
    query = query.lte('due_at', filters.dueBefore);
  }
  if (filters?.dueAfter) {
    query = query.gte('due_at', filters.dueAfter);
  }
  if (filters?.createdBy) {
    query = query.eq('created_by', filters.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get tasks: ${error.message}`);
  }

  return (data || []).map(transformFromDb);
}

/**
 * Get completed tasks for a project
 */
export async function getCompletedTasksByProject(
  projectId: string,
  dateRange?: { start: string; end: string }
): Promise<GuardrailsTask[]> {
  let query = supabase
    .from('guardrails_tasks')
    .select('*')
    .eq('master_project_id', projectId)
    .eq('status', 'completed')
    .is('archived_at', null)
    .order('completed_at', { ascending: false });

  if (dateRange) {
    query = query
      .gte('completed_at', dateRange.start)
      .lte('completed_at', dateRange.end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get completed tasks: ${error.message}`);
  }

  return (data || []).map(transformFromDb);
}

/**
 * Get overdue tasks for a project
 */
export async function getOverdueTasks(projectId: string): Promise<GuardrailsTask[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('guardrails_tasks')
    .select('*')
    .eq('master_project_id', projectId)
    .neq('status', 'completed')
    .is('archived_at', null)
    .not('due_at', 'is', null)
    .lt('due_at', now)
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get overdue tasks: ${error.message}`);
  }

  return (data || []).map(transformFromDb);
}

// ============================================================================
// Helper Functions
// ============================================================================

function transformFromDb(row: any): GuardrailsTask {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    sideProjectId: row.side_project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    progress: row.progress,
    completedAt: row.completed_at,
    dueAt: row.due_at,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}
