/**
 * Tracker Template Link Service
 * 
 * Manages share links for tracker templates.
 * Templates are structure-only (no data).
 * Import always creates a copy owned by the importer.
 */

import { supabase } from '../supabase';
import { getTemplate } from './trackerTemplateService';
import { createTemplate } from './trackerTemplateService';
import type { TrackerTemplate, CreateTrackerTemplateInput } from './types';

export interface TrackerTemplateLink {
  id: string;
  templateId: string;
  createdBy: string;
  shareToken: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateTemplateLinkInput {
  templateId: string;
  expiresAt?: string | null; // ISO date string or null
  maxUses?: number | null;
}

export interface TemplateLinkPreview {
  template: TrackerTemplate;
  link: TrackerTemplateLink;
}

/**
 * Generate a secure random token
 */
function generateShareToken(): string {
  // Generate a 32-character alphanumeric token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

/**
 * Create a share link for a template
 * Only template owner can create links
 */
export async function createTemplateShareLink(
  input: CreateTemplateLinkInput
): Promise<TrackerTemplateLink> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify template exists and user owns it
  const template = await getTemplate(input.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.owner_id !== user.id) {
    throw new Error('Only template owner can create share links');
  }

  if (template.archived_at) {
    throw new Error('Cannot create links for archived templates');
  }

  // Generate secure token
  const shareToken = generateShareToken();

  // Create link
  const { data, error } = await supabase
    .from('tracker_template_links')
    .insert({
      template_id: input.templateId,
      created_by: user.id,
      share_token: shareToken,
      expires_at: input.expiresAt || null,
      max_uses: input.maxUses || null,
      use_count: 0,
      revoked_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create share link: ${error.message}`);
  }

  return {
    id: data.id,
    templateId: data.template_id,
    createdBy: data.created_by,
    shareToken: data.share_token,
    expiresAt: data.expires_at,
    maxUses: data.max_uses,
    useCount: data.use_count,
    revokedAt: data.revoked_at,
    createdAt: data.created_at,
  };
}

/**
 * Revoke a share link
 * Only link creator can revoke
 */
export async function revokeTemplateShareLink(linkId: string): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify link exists and user created it
  const { data: link, error: linkError } = await supabase
    .from('tracker_template_links')
    .select('created_by')
    .eq('id', linkId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error('Link not found');
  }

  if (link.created_by !== user.id) {
    throw new Error('Only link creator can revoke links');
  }

  // Revoke link
  const { error } = await supabase
    .from('tracker_template_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId);

  if (error) {
    throw new Error(`Failed to revoke link: ${error.message}`);
  }
}

/**
 * Get template link by token (for preview/import)
 * Returns template preview if link is valid
 */
export async function getTemplateLinkByToken(
  token: string
): Promise<TemplateLinkPreview> {
  // Get link
  const { data: link, error: linkError } = await supabase
    .from('tracker_template_links')
    .select('*')
    .eq('share_token', token)
    .is('revoked_at', null)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error('Invalid or revoked link');
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error('Link has expired');
  }

  // Check max uses
  if (link.max_uses !== null && link.use_count >= link.max_uses) {
    throw new Error('Link has reached maximum uses');
  }

  // Get template via SECURITY DEFINER function (bypasses RLS)
  const { data: templateRows, error: templateError } = await supabase
    .rpc('get_template_by_share_token', { p_token: token });

  if (templateError || !templateRows || templateRows.length === 0) {
    throw new Error('Template not found or link is invalid');
  }

  const template = templateRows[0] as TrackerTemplate;

  return {
    template,
    link: {
      id: link.id,
      templateId: link.template_id,
      createdBy: link.created_by,
      shareToken: link.share_token,
      expiresAt: link.expires_at,
      maxUses: link.max_uses,
      useCount: link.use_count,
      revokedAt: link.revoked_at,
      createdAt: link.created_at,
    },
  };
}

/**
 * Import a template from a share link
 * Creates a new template copy owned by the importer
 */
export async function importTemplateFromToken(
  token: string
): Promise<TrackerTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get link and validate
  const preview = await getTemplateLinkByToken(token);
  const { template, link } = preview;

  // Increment use count (using RPC or direct update with proper checks)
  const { error: updateError } = await supabase
    .from('tracker_template_links')
    .update({ use_count: link.useCount + 1 })
    .eq('id', link.id)
    .eq('use_count', link.useCount); // Optimistic locking

  if (updateError) {
    // Link may have been revoked or max uses reached between check and update
    throw new Error('Link is no longer valid');
  }

  // Handle name conflicts
  const importedName = await resolveNameConflict(template.name, user.id);

  // Create new template copy
  const importInput: CreateTrackerTemplateInput = {
    name: importedName,
    description: template.description,
    field_schema: template.field_schema,
    entry_granularity: template.entry_granularity,
  };

  const importedTemplate = await createTemplate(importInput);

  return importedTemplate;
}

/**
 * Resolve name conflicts when importing
 * Returns "Name", "Name (1)", "Name (2)", etc.
 */
async function resolveNameConflict(
  baseName: string,
  userId: string
): Promise<string> {
  // Check if base name is available
  const { data: existing } = await supabase
    .from('tracker_templates')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', baseName)
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
      .eq('owner_id', userId)
      .eq('name', candidateName)
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

/**
 * List share links for a template
 * Only template owner can list links
 */
export async function listTemplateShareLinks(
  templateId: string
): Promise<TrackerTemplateLink[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify template exists and user owns it
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.owner_id !== user.id) {
    throw new Error('Only template owner can list share links');
  }

  // Get links
  const { data: links, error } = await supabase
    .from('tracker_template_links')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list links: ${error.message}`);
  }

  return (links || []).map((link) => ({
    id: link.id,
    templateId: link.template_id,
    createdBy: link.created_by,
    shareToken: link.share_token,
    expiresAt: link.expires_at,
    maxUses: link.max_uses,
    useCount: link.use_count,
    revokedAt: link.revoked_at,
    createdAt: link.created_at,
  }));
}
