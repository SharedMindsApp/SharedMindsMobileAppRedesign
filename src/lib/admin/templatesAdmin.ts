import { supabase } from '../supabase';
import type { DomainType, SystemTrackTemplate, SystemSubTrackTemplate } from '../guardrails/templateTypes';
import type { TemplateTag } from '../guardrails/projectTypes';

export interface CreateTrackTemplateInput {
  name: string;
  domain_type: DomainType;
  description?: string;
  is_default?: boolean;
  ordering_index?: number;
}

export interface UpdateTrackTemplateInput {
  name?: string;
  domain_type?: DomainType;
  description?: string;
  is_default?: boolean;
  ordering_index?: number;
}

export interface CreateSubTrackTemplateInput {
  track_template_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  ordering_index?: number;
}

export interface UpdateSubTrackTemplateInput {
  name?: string;
  description?: string;
  is_default?: boolean;
  ordering_index?: number;
}

export async function getAllTrackTemplatesAdmin(): Promise<SystemTrackTemplate[]> {
  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .select('*')
    .order('domain_type, ordering_index, name');

  if (error) throw error;
  return data || [];
}

export async function getTrackTemplateByIdAdmin(id: string): Promise<SystemTrackTemplate | null> {
  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTrackTemplateWithSubtracks(id: string): Promise<(SystemTrackTemplate & { subtracks: SystemSubTrackTemplate[] }) | null> {
  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .select(`
      *,
      guardrails_subtrack_templates (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    ...data,
    subtracks: data.guardrails_subtrack_templates || [],
  };
}

export async function createTrackTemplate(input: CreateTrackTemplateInput): Promise<SystemTrackTemplate> {
  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .insert({
      name: input.name,
      domain_type: input.domain_type,
      description: input.description || null,
      is_default: input.is_default ?? false,
      ordering_index: input.ordering_index ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrackTemplate(id: string, input: UpdateTrackTemplateInput): Promise<SystemTrackTemplate> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.domain_type !== undefined) updateData.domain_type = input.domain_type;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.is_default !== undefined) updateData.is_default = input.is_default;
  if (input.ordering_index !== undefined) updateData.ordering_index = input.ordering_index;

  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrackTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_track_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getAllSubTrackTemplatesAdmin(): Promise<SystemSubTrackTemplate[]> {
  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .order('track_template_id, ordering_index, name');

  if (error) throw error;
  return data || [];
}

export async function getSubTrackTemplatesByTrackId(trackTemplateId: string): Promise<SystemSubTrackTemplate[]> {
  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .eq('track_template_id', trackTemplateId)
    .order('ordering_index, name');

  if (error) throw error;
  return data || [];
}

export async function getSubTrackTemplateByIdAdmin(id: string): Promise<SystemSubTrackTemplate | null> {
  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createSubTrackTemplate(input: CreateSubTrackTemplateInput): Promise<SystemSubTrackTemplate> {
  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .insert({
      track_template_id: input.track_template_id,
      name: input.name,
      description: input.description || null,
      is_default: input.is_default ?? false,
      ordering_index: input.ordering_index ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubTrackTemplate(id: string, input: UpdateSubTrackTemplateInput): Promise<SystemSubTrackTemplate> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.is_default !== undefined) updateData.is_default = input.is_default;
  if (input.ordering_index !== undefined) updateData.ordering_index = input.ordering_index;

  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubTrackTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_subtrack_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getTrackTemplateTagsAdmin(trackTemplateId: string): Promise<TemplateTag[]> {
  const { data, error } = await supabase
    .from('guardrails_track_template_tags')
    .select(`
      tag_id,
      guardrails_template_tags:tag_id (
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('track_template_id', trackTemplateId);

  if (error) throw error;

  return (data || [])
    .map(item => item.guardrails_template_tags)
    .filter((tag): tag is TemplateTag => tag !== null) as TemplateTag[];
}

export async function assignTagToTrackTemplate(trackTemplateId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_track_template_tags')
    .insert({
      track_template_id: trackTemplateId,
      tag_id: tagId,
    });

  if (error) throw error;
}

export async function removeTagFromTrackTemplate(trackTemplateId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_track_template_tags')
    .delete()
    .eq('track_template_id', trackTemplateId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

export async function setTrackTemplateTags(trackTemplateId: string, tagIds: string[]): Promise<void> {
  await supabase
    .from('guardrails_track_template_tags')
    .delete()
    .eq('track_template_id', trackTemplateId);

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('guardrails_track_template_tags')
      .insert(
        tagIds.map(tagId => ({
          track_template_id: trackTemplateId,
          tag_id: tagId,
        }))
      );

    if (error) throw error;
  }
}
