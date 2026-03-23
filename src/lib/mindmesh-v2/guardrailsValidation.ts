/**
 * Mind Mesh V2 Guardrails Validation Service
 *
 * Validates integrated container creation against Guardrails constraints.
 * This runs BEFORE plan execution to prevent invalid Guardrails mutations.
 *
 * CRITICAL RULES:
 * - Validation is read-only (no mutations)
 * - All validation errors are explicit
 * - No partial creation allowed
 * - Guardrails remains authoritative
 */

import { supabase } from '../supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CreateIntegratedTrackValidation {
  masterProjectId: string;
  name: string;
  description?: string;
  color?: string;
}

export interface CreateIntegratedSubtrackValidation {
  masterProjectId: string;
  parentTrackId: string;
  name: string;
  description?: string;
}

export interface CreateIntegratedTaskValidation {
  masterProjectId: string;
  parentTrackId: string;
  title: string;
  description?: string;
  dueAt?: string;
}

export interface CreateIntegratedEventValidation {
  masterProjectId: string;
  parentTrackId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates creating a top-level Track from Mind Mesh.
 *
 * Checks:
 * - Project exists and is accessible
 * - Name is not empty
 * - No duplicate track names (warning only)
 *
 * @param input - Track creation parameters
 * @returns Validation result with errors/warnings
 */
export async function validateIntegratedTrackCreation(
  input: CreateIntegratedTrackValidation
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Track name is required');
  }

  if (input.name && input.name.trim().length > 200) {
    errors.push('Track name must be 200 characters or less');
  }

  // Check project exists
  try {
    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', input.masterProjectId)
      .maybeSingle();

    if (projectError) {
      errors.push(`Failed to validate project: ${projectError.message}`);
    } else if (!project) {
      errors.push('Project not found');
    }
  } catch (error) {
    errors.push(`Project validation error: ${error}`);
  }

  // Check for duplicate track names (warning only)
  if (input.name && input.name.trim().length > 0) {
    try {
      const { data: existingTracks, error: trackError } = await supabase
        .from('guardrails_tracks')
        .select('id, title')
        .eq('master_project_id', input.masterProjectId)
        .is('parent_track_id', null)
        .ilike('title', input.name.trim());

      if (trackError) {
        warnings.push(`Could not check for duplicate track names: ${trackError.message}`);
      } else if (existingTracks && existingTracks.length > 0) {
        warnings.push(`A track with similar name already exists: "${existingTracks[0].title}"`);
      }
    } catch (error) {
      warnings.push(`Could not check for duplicate track names: ${error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates creating a Subtrack from Mind Mesh.
 *
 * Checks:
 * - Parent track exists and is accessible
 * - Parent track belongs to the same project
 * - Name is not empty
 * - No duplicate subtrack names under same parent (warning only)
 * - Maximum depth not exceeded
 *
 * @param input - Subtrack creation parameters
 * @returns Validation result with errors/warnings
 */
export async function validateIntegratedSubtrackCreation(
  input: CreateIntegratedSubtrackValidation
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Subtrack name is required');
  }

  if (input.name && input.name.trim().length > 200) {
    errors.push('Subtrack name must be 200 characters or less');
  }

  // Check parent track exists and belongs to correct project
  try {
    const { data: parentTrack, error: parentError } = await supabase
      .from('guardrails_tracks')
      .select('id, title, master_project_id, parent_track_id')
      .eq('id', input.parentTrackId)
      .maybeSingle();

    if (parentError) {
      errors.push(`Failed to validate parent track: ${parentError.message}`);
    } else if (!parentTrack) {
      errors.push('Parent track not found');
    } else if (parentTrack.master_project_id !== input.masterProjectId) {
      errors.push('Parent track belongs to a different project');
    }

    // Check depth (max 3 levels: track → subtrack → sub-subtrack)
    if (parentTrack && parentTrack.parent_track_id) {
      const depth = await calculateTrackDepth(input.parentTrackId);
      if (depth >= 2) {
        errors.push('Maximum subtrack depth exceeded (max 3 levels)');
      }
    }
  } catch (error) {
    errors.push(`Parent track validation error: ${error}`);
  }

  // Check for duplicate subtrack names under same parent (warning only)
  if (input.name && input.name.trim().length > 0) {
    try {
      const { data: existingSubtracks, error: subtrackError } = await supabase
        .from('guardrails_tracks')
        .select('id, title')
        .eq('parent_track_id', input.parentTrackId)
        .ilike('title', input.name.trim());

      if (subtrackError) {
        warnings.push(`Could not check for duplicate subtrack names: ${subtrackError.message}`);
      } else if (existingSubtracks && existingSubtracks.length > 0) {
        warnings.push(`A subtrack with similar name already exists: "${existingSubtracks[0].title}"`);
      }
    } catch (error) {
      warnings.push(`Could not check for duplicate subtrack names: ${error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates the depth of a track in the hierarchy.
 * Used to enforce maximum depth constraints.
 *
 * @param trackId - Track to calculate depth for
 * @returns Depth (0 = top-level, 1 = subtrack, 2 = sub-subtrack)
 */
async function calculateTrackDepth(trackId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = trackId;

  // Prevent infinite loops
  const maxIterations = 10;
  let iterations = 0;

  while (currentId && iterations < maxIterations) {
    const { data, error } = await supabase
      .from('guardrails_tracks')
      .select('parent_track_id')
      .eq('id', currentId)
      .maybeSingle();

    if (error || !data) break;

    currentId = data.parent_track_id;
    if (currentId) depth++;
    iterations++;
  }

  return depth;
}

/**
 * Validates creating a Task from Mind Mesh.
 *
 * Checks:
 * - Project exists
 * - Parent track exists and is integrated
 * - Title is not empty
 * - dueAt is valid date if provided
 *
 * @param input - Task creation parameters
 * @returns Validation result with errors/warnings
 */
export async function validateIntegratedTaskCreation(
  input: CreateIntegratedTaskValidation
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate title
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Task title is required');
  }

  if (input.title && input.title.trim().length > 200) {
    errors.push('Task title must be 200 characters or less');
  }

  // Check project exists
  try {
    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', input.masterProjectId)
      .maybeSingle();

    if (projectError) {
      errors.push(`Failed to validate project: ${projectError.message}`);
    } else if (!project) {
      errors.push('Project not found');
    }
  } catch (error) {
    errors.push(`Project validation error: ${error}`);
  }

  // Check parent track exists and is integrated
  try {
    const { data: parentTrack, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('id, title, master_project_id')
      .eq('id', input.parentTrackId)
      .maybeSingle();

    if (trackError) {
      errors.push(`Failed to validate parent track: ${trackError.message}`);
    } else if (!parentTrack) {
      errors.push('Parent track not found');
    } else if (parentTrack.master_project_id !== input.masterProjectId) {
      errors.push('Parent track belongs to a different project');
    }
  } catch (error) {
    errors.push(`Parent track validation error: ${error}`);
  }

  // Validate dueAt if provided
  if (input.dueAt) {
    const dueDate = new Date(input.dueAt);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates creating an Event from Mind Mesh.
 *
 * Checks:
 * - Project exists
 * - Parent track exists and is integrated
 * - Title is not empty
 * - startsAt is required and valid
 * - endsAt is valid and >= startsAt if provided
 *
 * @param input - Event creation parameters
 * @returns Validation result with errors/warnings
 */
export async function validateIntegratedEventCreation(
  input: CreateIntegratedEventValidation
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate title
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Event title is required');
  }

  if (input.title && input.title.trim().length > 200) {
    errors.push('Event title must be 200 characters or less');
  }

  // Validate startsAt (required for events)
  if (!input.startsAt) {
    errors.push('Event start time is required');
  } else {
    const startsDate = new Date(input.startsAt);
    if (isNaN(startsDate.getTime())) {
      errors.push('Invalid start time format');
    }
  }

  // Validate endsAt if provided
  if (input.endsAt) {
    const endsDate = new Date(input.endsAt);
    if (isNaN(endsDate.getTime())) {
      errors.push('Invalid end time format');
    } else if (input.startsAt) {
      const startsDate = new Date(input.startsAt);
      if (endsDate < startsDate) {
        errors.push('Event end time must be after start time');
      }
    }
  }

  // Check project exists
  try {
    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', input.masterProjectId)
      .maybeSingle();

    if (projectError) {
      errors.push(`Failed to validate project: ${projectError.message}`);
    } else if (!project) {
      errors.push('Project not found');
    }
  } catch (error) {
    errors.push(`Project validation error: ${error}`);
  }

  // Check parent track exists and is integrated
  try {
    const { data: parentTrack, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('id, title, master_project_id')
      .eq('id', input.parentTrackId)
      .maybeSingle();

    if (trackError) {
      errors.push(`Failed to validate parent track: ${trackError.message}`);
    } else if (!parentTrack) {
      errors.push('Parent track not found');
    } else if (parentTrack.master_project_id !== input.masterProjectId) {
      errors.push('Parent track belongs to a different project');
    }
  } catch (error) {
    errors.push(`Parent track validation error: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
