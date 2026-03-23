import { supabase } from '../supabase';
import type { DomainType, SystemTrackTemplate, UserTrackTemplate, SystemSubTrackTemplate, UserSubTrackTemplate } from './templateTypes';

export interface ProjectTypeExampleText {
  idea?: string;
  startingPoint?: string;
  expectations?: string;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string | null;
  example_text: ProjectTypeExampleText | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTypeWithDomains extends ProjectType {
  domains: DomainType[];
}

export interface TemplateTag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TrackTemplateTag {
  id: string;
  track_template_id: string;
  tag_id: string;
  created_at: string;
}

export interface ProjectTypeTag {
  id: string;
  project_type_id: string;
  tag_id: string;
  created_at: string;
}

export interface ProjectTypeWithTags extends ProjectTypeWithDomains {
  tags: TemplateTag[];
}

export interface TrackTemplateWithSubTracksAndTags extends SystemTrackTemplate {
  subtracks: SystemSubTrackTemplate[];
  tags: TemplateTag[];
}

export interface UserTrackTemplateWithSubTracksAndTags extends UserTrackTemplate {
  subtracks: UserSubTrackTemplate[];
  tags: TemplateTag[];
}

export type AnyTrackTemplateWithSubTracksAndTags = TrackTemplateWithSubTracksAndTags | UserTrackTemplateWithSubTracksAndTags;

export async function getAllProjectTypes(): Promise<ProjectTypeWithDomains[]> {
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

export async function getProjectTypesForDomain(domainType: DomainType): Promise<ProjectTypeWithDomains[]> {
  const normalizedDomain = domainType.toLowerCase() as DomainType;

  const { data, error } = await supabase
    .from('guardrails_project_types')
    .select(`
      *,
      guardrails_project_type_domains!inner (domain_type)
    `)
    .eq('guardrails_project_type_domains.domain_type', normalizedDomain)
    .order('name');

  if (error) throw error;

  const matchingTypes = (data || []).map(pt => ({
    ...pt,
    domains: (pt.guardrails_project_type_domains || []).map((d: { domain_type: DomainType }) => d.domain_type),
  }));

  if (matchingTypes.length > 0) {
    return matchingTypes;
  }

  console.warn(`[PROJECT TYPES] No project types found for domain "${domainType}", falling back to all project types`);
  return getAllProjectTypes();
}

export async function getProjectTypeById(id: string): Promise<ProjectTypeWithDomains | null> {
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

export async function getTagsForProjectType(projectTypeId: string): Promise<TemplateTag[]> {
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

export async function getTagsForTrackTemplate(trackTemplateId: string): Promise<TemplateTag[]> {
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

export async function getTemplatesMatchingProjectType(projectTypeId: string): Promise<AnyTrackTemplateWithSubTracksAndTags[]> {
  const tags = await getTagsForProjectType(projectTypeId);

  if (tags.length === 0) {
    return [];
  }

  const tagNames = tags.map(t => t.name);

  const { data: trackTemplateTags, error: trackTemplateError } = await supabase
    .from('guardrails_track_template_tags')
    .select('track_template_id, tag_id, guardrails_template_tags!inner(name)')
    .in('guardrails_template_tags.name', tagNames);

  if (trackTemplateError) throw trackTemplateError;

  const trackTemplateIds = Array.from(new Set(
    (trackTemplateTags || []).map(t => t.track_template_id)
  ));

  if (trackTemplateIds.length === 0) {
    return [];
  }

  const { data: trackTemplates, error: templatesError } = await supabase
    .from('guardrails_track_templates')
    .select(`
      *,
      guardrails_subtrack_templates (
        *
      )
    `)
    .in('id', trackTemplateIds)
    .order('ordering_index');

  if (templatesError) throw templatesError;

  const templatesWithTags = await Promise.all(
    (trackTemplates || []).map(async (template) => {
      const templateTags = await getTagsForTrackTemplate(template.id);
      return {
        ...template,
        subtracks: template.guardrails_subtrack_templates || [],
        tags: templateTags,
      };
    })
  );

  return templatesWithTags as AnyTrackTemplateWithSubTracksAndTags[];
}

export async function getDefaultTemplatesMatchingProjectType(projectTypeId: string): Promise<AnyTrackTemplateWithSubTracksAndTags[]> {
  const allTemplates = await getTemplatesMatchingProjectType(projectTypeId);
  return allTemplates.filter(t => t.is_default);
}

export async function getAllTemplateTags(): Promise<TemplateTag[]> {
  const { data, error } = await supabase
    .from('guardrails_template_tags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getProjectTypeWithTags(projectTypeId: string): Promise<ProjectTypeWithTags | null> {
  const projectType = await getProjectTypeById(projectTypeId);
  if (!projectType) return null;

  const tags = await getTagsForProjectType(projectTypeId);
  return {
    ...projectType,
    tags,
  };
}

export async function getDomainsForProjectType(projectTypeId: string): Promise<DomainType[]> {
  const { data, error } = await supabase
    .from('guardrails_project_type_domains')
    .select('domain_type')
    .eq('project_type_id', projectTypeId);

  if (error) throw error;
  return (data || []).map(d => d.domain_type);
}

export async function createCustomProjectType(
  name: string,
  description: string | null,
  domainTypes: DomainType[]
): Promise<ProjectTypeWithDomains> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: projectType, error: createError } = await supabase
    .from('guardrails_project_types')
    .insert({
      name,
      description,
      created_by: user.id,
      is_system: false,
    })
    .select()
    .single();

  if (createError) throw createError;

  if (domainTypes.length > 0) {
    const { error: domainsError } = await supabase
      .from('guardrails_project_type_domains')
      .insert(
        domainTypes.map(domain_type => ({
          project_type_id: projectType.id,
          domain_type,
        }))
      );

    if (domainsError) {
      await supabase
        .from('guardrails_project_types')
        .delete()
        .eq('id', projectType.id);
      throw domainsError;
    }
  }

  return {
    ...projectType,
    domains: domainTypes,
  };
}
