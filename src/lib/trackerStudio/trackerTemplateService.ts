/**
 * Tracker Template Service
 * 
 * CRUD operations for tracker templates.
 * Templates are structure-only (no data).
 */

import { supabase } from '../supabase';
import type {
  TrackerTemplate,
  CreateTrackerTemplateInput,
  UpdateTrackerTemplateInput,
  TrackerTemplateScope,
} from './types';
import {
  validateCreateTemplateInput,
  validateFieldSchema,
  validateEntryGranularity,
  TrackerValidationError,
} from './validation';
import { isCurrentUserAdminOrDeveloper } from '../admin/adminUtils';

/**
 * Create a new tracker template
 * Defaults to user scope. Use createGlobalTemplate for global templates.
 */
export async function createTemplate(
  input: CreateTrackerTemplateInput
): Promise<TrackerTemplate> {
  // Validate input
  validateCreateTemplateInput(input);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Determine scope (default to 'user', only admins can set 'global')
  const scope: TrackerTemplateScope = input.scope || 'user';
  if (scope === 'global') {
    const isAdmin = await isCurrentUserAdminOrDeveloper();
    if (!isAdmin) {
      throw new Error('Only admins can create global templates');
    }
  }

  // Create template
  const { data, error } = await supabase
    .from('tracker_templates')
    .insert({
      owner_id: user.id,
      created_by: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      field_schema: input.field_schema,
      entry_granularity: input.entry_granularity || 'daily',
      is_system_template: scope === 'global', // Backward compatibility
      scope: scope,
      is_locked: scope === 'global', // Global templates are always locked
      published_at: input.published_at || (scope === 'global' ? new Date().toISOString() : null),
      chart_config: input.chart_config || null,
      tags: input.tags || [],
      version: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return data;
}

/**
 * List templates (global + user's templates)
 */
export async function listTemplates(includeArchived: boolean = false): Promise<TrackerTemplate[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Build query: global templates OR user's own templates
  let query = supabase
    .from('tracker_templates')
    .select('*')
    .or(`scope.eq.global,scope.eq.user`);

  // Filter by user ownership for user templates
  // RLS will handle this, but we can add explicit filter for clarity
  // Actually, RLS handles it, so we just need to filter archived
  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  // Filter out deprecated templates from new template selection
  // Deprecated templates are hidden from UI but remain accessible for existing trackers
  query = query.is('deprecated_at', null);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  // Sort templates: Habit Tracker first, then by created_at
  const sorted = (data || []).sort((a, b) => {
    // Habit Tracker always comes first
    if (a.name === 'Habit Tracker' && b.name !== 'Habit Tracker') return -1;
    if (a.name !== 'Habit Tracker' && b.name === 'Habit Tracker') return 1;
    // Otherwise sort by created_at (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sorted;
}

/**
 * Get a template by ID
 * Works for both global templates (visible to all) and user templates (visible to owner)
 */
export async function getTemplate(templateId: string): Promise<TrackerTemplate | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // RLS will handle access control (global templates visible to all, user templates to owner)
  const { data, error } = await supabase
    .from('tracker_templates')
    .select('*')
    .eq('id', templateId)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data;
}

/**
 * Update a template
 * 
 * Note: Templates should be versioned if they're referenced by trackers.
 * This function updates in-place, which is safe only if no trackers reference it.
 * 
 * For global templates, only admins can update.
 * For user templates, only the owner can update (if not locked).
 */
export async function updateTemplate(
  templateId: string,
  input: UpdateTrackerTemplateInput
): Promise<TrackerTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify template exists
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // Check permissions
  if (template.scope === 'global') {
    // Only admins can update global templates
    const isAdmin = await isCurrentUserAdminOrDeveloper();
    if (!isAdmin) {
      throw new Error('Only admins can update global templates');
    }
  } else {
    // User templates: owner can update if not locked
    if (template.created_by !== user.id) {
      throw new Error('Not authorized to update this template');
    }
    if (template.is_locked) {
      throw new Error('This template is locked and cannot be updated');
    }
  }

  // Validate field schema if provided
  if (input.field_schema) {
    validateFieldSchema(input.field_schema);
  }

  // Build update object
  const updates: Partial<TrackerTemplate> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name || input.name.trim() === '') {
      throw new TrackerValidationError('Template name cannot be empty');
    }
    updates.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.field_schema !== undefined) {
    updates.field_schema = input.field_schema;
  }

  if (input.entry_granularity !== undefined) {
    validateEntryGranularity(input.entry_granularity);
    updates.entry_granularity = input.entry_granularity;
  }

  if (input.chart_config !== undefined) {
    updates.chart_config = input.chart_config;
  }

  if (input.tags !== undefined) {
    updates.tags = input.tags;
  }

  // Update template (RLS will enforce permissions)
  const { data, error } = await supabase
    .from('tracker_templates')
    .update(updates)
    .eq('id', templateId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data;
}

/**
 * Archive a template
 * 
 * For global templates, only admins can archive.
 * For user templates, only the owner can archive.
 */
export async function archiveTemplate(templateId: string): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify template exists
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // Check permissions
  if (template.scope === 'global') {
    // Only admins can archive global templates
    const isAdmin = await isCurrentUserAdminOrDeveloper();
    if (!isAdmin) {
      throw new Error('Only admins can archive global templates');
    }
  } else {
    // User templates: owner can archive
    if (template.created_by !== user.id) {
      throw new Error('Not authorized to archive this template');
    }
  }

  // Archive template (RLS will enforce permissions)
  const { error } = await supabase
    .from('tracker_templates')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    throw new Error(`Failed to archive template: ${error.message}`);
  }
}

/**
 * Create a global template (admin only)
 */
export async function createGlobalTemplate(
  input: CreateTrackerTemplateInput
): Promise<TrackerTemplate> {
  // Check admin permissions
  const isAdmin = await isCurrentUserAdminOrDeveloper();
  if (!isAdmin) {
    throw new Error('Only admins can create global templates');
  }

  // Validate input
  validateCreateTemplateInput(input);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Create global template
  const { data, error } = await supabase
    .from('tracker_templates')
    .insert({
      owner_id: null, // Global templates have no owner
      created_by: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      field_schema: input.field_schema,
      entry_granularity: input.entry_granularity || 'daily',
      is_system_template: true, // Backward compatibility
      scope: 'global',
      is_locked: true, // Global templates are always locked
      published_at: input.published_at || new Date().toISOString(),
      chart_config: input.chart_config || null,
      tags: input.tags || [],
      version: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create global template: ${error.message}`);
  }

  return data;
}

/**
 * Update a global template (admin only)
 */
export async function updateGlobalTemplate(
  templateId: string,
  input: UpdateTrackerTemplateInput
): Promise<TrackerTemplate> {
  // Check admin permissions
  const isAdmin = await isCurrentUserAdminOrDeveloper();
  if (!isAdmin) {
    throw new Error('Only admins can update global templates');
  }

  // Verify template exists and is global
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.scope !== 'global') {
    throw new Error('This function can only update global templates');
  }

  // Use the regular update function (it will check permissions)
  return updateTemplate(templateId, input);
}

/**
 * Archive a global template (admin only)
 */
export async function archiveGlobalTemplate(templateId: string): Promise<void> {
  // Check admin permissions
  const isAdmin = await isCurrentUserAdminOrDeveloper();
  if (!isAdmin) {
    throw new Error('Only admins can archive global templates');
  }

  // Verify template exists and is global
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.scope !== 'global') {
    throw new Error('This function can only archive global templates');
  }

  // Use the regular archive function (it will check permissions)
  return archiveTemplate(templateId);
}

/**
 * Promote a user template to global (admin only)
 * 
 * This converts a user template into a global template that's visible to all users.
 * The template becomes locked and cannot be edited by non-admins.
 */
export async function promoteTemplateToGlobal(templateId: string): Promise<TrackerTemplate> {
  // Check admin permissions
  const isAdmin = await isCurrentUserAdminOrDeveloper();
  if (!isAdmin) {
    throw new Error('Only admins can promote templates to global');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify template exists
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.scope === 'global') {
    throw new Error('Template is already global');
  }

  // Promote to global
  const { data, error } = await supabase
    .from('tracker_templates')
    .update({
      scope: 'global',
      is_locked: true,
      owner_id: null, // Global templates have no owner
      is_system_template: true, // Backward compatibility
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to promote template: ${error.message}`);
  }

  return data;
}

/**
 * Duplicate a template (create a user-owned copy)
 * 
 * Used by users to copy global templates into their personal templates.
 * Also works for duplicating user templates.
 */
export async function duplicateTemplate(templateId: string, newName?: string): Promise<TrackerTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get source template
  const sourceTemplate = await getTemplate(templateId);
  if (!sourceTemplate) {
    throw new Error('Template not found');
  }

  // Determine new name (handle conflicts)
  let finalName = newName || sourceTemplate.name;
  if (!newName) {
    // Auto-append suffix if name conflicts
    finalName = await resolveNameConflict(sourceTemplate.name, user.id);
  }

  // Create duplicate as user template
  const { data, error } = await supabase
    .from('tracker_templates')
    .insert({
      owner_id: user.id,
      created_by: user.id,
      name: finalName,
      description: sourceTemplate.description,
      field_schema: sourceTemplate.field_schema,
      entry_granularity: sourceTemplate.entry_granularity,
      is_system_template: false,
      scope: 'user',
      is_locked: false,
      published_at: null,
      tags: sourceTemplate.tags || [],
      version: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to duplicate template: ${error.message}`);
  }

  return data;
}

/**
 * Resolve name conflicts when duplicating templates
 */
async function resolveNameConflict(baseName: string, userId: string): Promise<string> {
  // Check if base name is available
  const { data: existing } = await supabase
    .from('tracker_templates')
    .select('id')
    .eq('created_by', userId)
    .eq('name', baseName)
    .eq('scope', 'user')
    .is('archived_at', null)
    .maybeSingle();

  if (!existing) {
    return baseName;
  }

  // Try with suffix
  let counter = 1;
  while (counter < 100) {
    const candidateName = `${baseName} (${counter})`;
    const { data: existingWithSuffix } = await supabase
      .from('tracker_templates')
      .select('id')
      .eq('created_by', userId)
      .eq('name', candidateName)
      .eq('scope', 'user')
      .is('archived_at', null)
      .maybeSingle();

    if (!existingWithSuffix) {
      return candidateName;
    }

    counter++;
  }

  // Fallback: append timestamp
  return `${baseName} (${Date.now()})`;
}
