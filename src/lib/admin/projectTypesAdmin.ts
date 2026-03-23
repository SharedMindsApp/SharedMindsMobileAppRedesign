import { supabase } from '../supabase';
import type { ProjectTypeWithDomains, TemplateTag, ProjectTypeExampleText } from '../guardrails/projectTypes';
import type { DomainType } from '../guardrails/templateTypes';

export type { ProjectTypeExampleText };

export interface CreateProjectTypeInput {
  name: string;
  domains: DomainType[];
  description?: string;
  example_text?: ProjectTypeExampleText;
}

export interface UpdateProjectTypeInput {
  name?: string;
  description?: string;
  example_text?: ProjectTypeExampleText | null;
}

export async function getAllProjectTypesAdmin(): Promise<ProjectTypeWithDomains[]> {
  const { data, error } = await supabase
    .from('guardrails_project_types')
    .select(`
      *,
      guardrails_project_type_domains (domain_type)
    `)
    .order('name');

  if (error) throw error;

  return (data || []).map(pt => ({
    ...pt,
    domains: (pt.guardrails_project_type_domains || []).map((d: { domain_type: DomainType }) => d.domain_type),
  }));
}

export async function getProjectTypeByIdAdmin(id: string): Promise<ProjectTypeWithDomains | null> {
  const { data, error } = await supabase
    .from('guardrails_project_types')
    .select(`
      *,
      guardrails_project_type_domains (domain_type)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    domains: (data.guardrails_project_type_domains || []).map((d: { domain_type: DomainType }) => d.domain_type),
  };
}

export async function createProjectType(input: CreateProjectTypeInput): Promise<ProjectTypeWithDomains> {
  // Only include example_text if at least one field is provided
  const hasExampleText = input.example_text && (
    input.example_text.idea?.trim() || 
    input.example_text.startingPoint?.trim() || 
    input.example_text.expectations?.trim()
  );

  const { data, error } = await supabase
    .from('guardrails_project_types')
    .insert({
      name: input.name,
      description: input.description || null,
      example_text: hasExampleText ? input.example_text : null,
    })
    .select()
    .single();

  if (error) throw error;

  if (input.domains.length > 0) {
    await setProjectTypeDomains(data.id, input.domains);
  }

  return {
    ...data,
    domains: input.domains,
  };
}

export async function updateProjectType(id: string, input: UpdateProjectTypeInput): Promise<ProjectTypeWithDomains> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.example_text !== undefined) {
    // Only include example_text if at least one field is provided, otherwise set to null to clear it
    const hasExampleText = input.example_text && (
      input.example_text.idea?.trim() || 
      input.example_text.startingPoint?.trim() || 
      input.example_text.expectations?.trim()
    );
    updateData.example_text = hasExampleText ? input.example_text : null;
  }

  const { data, error } = await supabase
    .from('guardrails_project_types')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      guardrails_project_type_domains (domain_type)
    `)
    .single();

  if (error) throw error;

  return {
    ...data,
    domains: (data.guardrails_project_type_domains || []).map((d: { domain_type: DomainType }) => d.domain_type),
  };
}

export async function deleteProjectType(id: string): Promise<void> {
  const { data: projects, error: checkError } = await supabase
    .from('master_projects')
    .select('id')
    .eq('project_type_id', id)
    .limit(1);

  if (checkError) throw checkError;

  if (projects && projects.length > 0) {
    throw new Error('Cannot delete project type that is in use by existing projects');
  }

  const { error } = await supabase
    .from('guardrails_project_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getProjectTypeTagsAdmin(projectTypeId: string): Promise<TemplateTag[]> {
  const { data, error } = await supabase
    .from('guardrails_project_type_tags')
    .select(`
      tag_id,
      guardrails_template_tags:tag_id (
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('project_type_id', projectTypeId);

  if (error) throw error;

  return (data || [])
    .map(item => item.guardrails_template_tags)
    .filter((tag): tag is TemplateTag => tag !== null) as TemplateTag[];
}

export async function assignTagToProjectType(projectTypeId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_project_type_tags')
    .insert({
      project_type_id: projectTypeId,
      tag_id: tagId,
    });

  if (error) throw error;
}

export async function removeTagFromProjectType(projectTypeId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_project_type_tags')
    .delete()
    .eq('project_type_id', projectTypeId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

export async function setProjectTypeTags(projectTypeId: string, tagIds: string[]): Promise<void> {
  await supabase
    .from('guardrails_project_type_tags')
    .delete()
    .eq('project_type_id', projectTypeId);

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('guardrails_project_type_tags')
      .insert(
        tagIds.map(tagId => ({
          project_type_id: projectTypeId,
          tag_id: tagId,
        }))
      );

    if (error) throw error;
  }
}

export async function getProjectTypeDomainsAdmin(projectTypeId: string): Promise<DomainType[]> {
  const { data, error } = await supabase
    .from('guardrails_project_type_domains')
    .select('domain_type')
    .eq('project_type_id', projectTypeId);

  if (error) throw error;
  return (data || []).map(d => d.domain_type);
}

export async function assignDomainToProjectType(projectTypeId: string, domainType: DomainType): Promise<void> {
  const { error } = await supabase
    .from('guardrails_project_type_domains')
    .insert({
      project_type_id: projectTypeId,
      domain_type: domainType,
    });

  if (error) throw error;
}

export async function removeDomainFromProjectType(projectTypeId: string, domainType: DomainType): Promise<void> {
  const { error } = await supabase
    .from('guardrails_project_type_domains')
    .delete()
    .eq('project_type_id', projectTypeId)
    .eq('domain_type', domainType);

  if (error) throw error;
}

export async function setProjectTypeDomains(projectTypeId: string, domains: DomainType[]): Promise<void> {
  await supabase
    .from('guardrails_project_type_domains')
    .delete()
    .eq('project_type_id', projectTypeId);

  if (domains.length > 0) {
    const { error } = await supabase
      .from('guardrails_project_type_domains')
      .insert(
        domains.map(domain => ({
          project_type_id: projectTypeId,
          domain_type: domain,
        }))
      );

    if (error) throw error;
  }
}
