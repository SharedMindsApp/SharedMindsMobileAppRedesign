import { supabase } from '../supabase';
import type { TemplateTag } from '../guardrails/projectTypes';

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  name?: string;
}

export interface TagUsage {
  project_type_count: number;
  template_count: number;
}

export async function getAllTagsAdmin(): Promise<TemplateTag[]> {
  const { data, error } = await supabase
    .from('guardrails_template_tags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getTagByIdAdmin(id: string): Promise<TemplateTag | null> {
  const { data, error } = await supabase
    .from('guardrails_template_tags')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTag(input: CreateTagInput): Promise<TemplateTag> {
  const { data, error } = await supabase
    .from('guardrails_template_tags')
    .insert({
      name: input.name,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTag(id: string, input: UpdateTagInput): Promise<TemplateTag> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;

  const { data, error } = await supabase
    .from('guardrails_template_tags')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_template_tags')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getTagUsage(tagId: string): Promise<TagUsage> {
  const { data: projectTypeData, error: ptError } = await supabase
    .from('guardrails_project_type_tags')
    .select('id')
    .eq('tag_id', tagId);

  if (ptError) throw ptError;

  const { data: templateData, error: tmplError } = await supabase
    .from('guardrails_track_template_tags')
    .select('id')
    .eq('tag_id', tagId);

  if (tmplError) throw tmplError;

  return {
    project_type_count: projectTypeData?.length || 0,
    template_count: templateData?.length || 0,
  };
}
