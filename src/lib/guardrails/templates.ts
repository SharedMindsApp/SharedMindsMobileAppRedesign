import { supabase } from '../supabase';
import type {
  DomainType,
  TrackTemplate,
  SubTrackTemplate,
  TrackTemplateWithSubTracks,
  DomainTrackTemplateSet,
  TemplateSeedResult,
  CreateTrackFromTemplateInput,
  CreateSubTrackFromTemplateInput,
  AnyTrackTemplateWithSubTracks,
} from './templateTypes';
import type { Track } from './tracksTypes';
import type { SubTrack } from './subtracksTypes';
import {
  getUserTrackTemplatesWithSubTracks,
  getUserTrackTemplateById,
  isUserTrackTemplate,
} from './userTemplates';
import { getTracksByProject } from './trackService';

const DOMAIN_TYPE_MAPPING: Record<string, DomainType> = {
  'work': 'work',
  'personal': 'personal',
  'creative': 'startup',
  'health': 'personal',
  'passion': 'passion',
  'startup': 'startup',
};

const ALLOWED_TEMPLATES_BY_DOMAIN: Record<DomainType, string[]> = {
  startup: [
    'MVP Build',
    'Marketing',
    'Operations',
    'Product Roadmap',
    'Market Research',
    'Customer Development',
    'Growth Engine',
    'Funding & Finance',
    'Legal & Compliance',
    'Team & Hiring',
  ],
  work: [
    'Strategic Work',
    'Project Delivery',
    'Skill Growth',
    'Agile / Scrum Workflow',
    'Product Management',
    'Stakeholder Management',
    'Research & Analysis',
    'Implementation',
    'Career Development',
    'Leadership & Management',
  ],
  personal: [
    'Life Admin',
    'Health',
    'Learning',
    'Home Management',
    'Financial Planning',
    'Wellness',
    'Relationships',
    'Mental Health Care',
    'Home Cooking & Meal Planning',
    'Life Transformation Plans',
  ],
  passion: [
    'Creative Project',
    'Craft / Hobby',
    'Writing',
    'Video Production',
    'Photography',
    'Music Production',
    'Art & Illustration',
    'Game Design',
    'Content Creation',
    'Makerspace Builds',
  ],
};

export function mapDomainToTemplateType(domainName: string): DomainType {
  // Normalize domain name: lowercase and replace hyphens/spaces with nothing
  const normalized = domainName.toLowerCase().replace(/[-_ ]/g, '');
  
  // Try exact match first (case-sensitive)
  if (DOMAIN_TYPE_MAPPING[domainName]) {
    return DOMAIN_TYPE_MAPPING[domainName];
  }
  
  // Try lowercase match
  const lowercased = domainName.toLowerCase();
  if (DOMAIN_TYPE_MAPPING[lowercased]) {
    return DOMAIN_TYPE_MAPPING[lowercased];
  }
  
  // Try normalized match (handles "start-up" -> "startup", etc.)
  if (DOMAIN_TYPE_MAPPING[normalized]) {
    return DOMAIN_TYPE_MAPPING[normalized];
  }
  
  // Special handling for "start-up" variations (normalized removes hyphens)
  if (normalized === 'startup') {
    return 'startup';
  }
  
  // Default fallback
  return 'personal';
}

export async function getAllowedTemplates(
  domainType: DomainType
): Promise<AnyTrackTemplateWithSubTracks[]> {
  const allowedTemplateNames = ALLOWED_TEMPLATES_BY_DOMAIN[domainType];

  const { data: trackTemplates, error: trackError } = await supabase
    .from('guardrails_track_templates')
    .select('*')
    .eq('domain_type', domainType)
    .order('ordering_index', { ascending: true });

  if (trackError) {
    console.error('Error fetching track templates:', trackError);
    throw new Error('Failed to fetch track templates');
  }

  const filteredTemplates = (trackTemplates || []).filter((template) =>
    allowedTemplateNames.includes(template.name)
  );

  const trackIds = filteredTemplates.map((t) => t.id);

  let subtrackTemplates: SubTrackTemplate[] = [];
  if (trackIds.length > 0) {
    const { data, error: subtrackError } = await supabase
      .from('guardrails_subtrack_templates')
      .select('*')
      .in('track_template_id', trackIds)
      .order('ordering_index', { ascending: true });

    if (subtrackError) {
      console.error('Error fetching subtrack templates:', subtrackError);
      throw new Error('Failed to fetch subtrack templates');
    }
    subtrackTemplates = data || [];
  }

  const systemTemplatesWithSubtracks: TrackTemplateWithSubTracks[] = filteredTemplates.map(
    (track) => ({
      ...track,
      subtracks: subtrackTemplates
        .filter((st) => st.track_template_id === track.id)
        .filter((st) => {
          if (!st.id || typeof st.id !== 'string' || st.id === 'undefined') {
            console.warn(
              `Subtrack "${st.name}" in template "${track.name}" has invalid ID (${st.id}) and will be removed.`
            );
            return false;
          }
          return true;
        }),
    })
  );

  const userTemplates = await getUserTrackTemplatesWithSubTracks(domainType);

  userTemplates.forEach((template) => {
    template.subtracks = template.subtracks.filter((st) => {
      if (!st.id || typeof st.id !== 'string' || st.id === 'undefined') {
        console.warn(
          `User subtrack "${st.name}" in template "${template.name}" has invalid ID (${st.id}) — removed.`
        );
        return false;
      }
      return true;
    });
  });

  const allTemplates = [
    ...systemTemplatesWithSubtracks,
    ...userTemplates,
  ];

  const verifiedTemplates = allTemplates.filter((template) => {
    if (!template.id || typeof template.id !== 'string' || template.id === 'undefined') {
      console.warn(
        `Template "${template.name}" has invalid ID (${template.id}). This template will be filtered out.`
      );
      return false;
    }
    if (template.domain_type !== domainType) {
      console.warn(
        `Template "${template.name}" has domain_type "${template.domain_type}" but was requested for domain "${domainType}". This template will be filtered out.`
      );
      return false;
    }
    return true;
  });

  verifiedTemplates.sort((a, b) => {
    const aIsDefault = 'is_default' in a ? a.is_default : false;
    const bIsDefault = 'is_default' in b ? b.is_default : false;

    if (aIsDefault !== bIsDefault) {
      return aIsDefault ? -1 : 1;
    }
    return a.ordering_index - b.ordering_index;
  });

  return verifiedTemplates;
}

export async function getTemplatesForDomain(
  domainType: DomainType
): Promise<AnyTrackTemplateWithSubTracks[]> {
  return getAllowedTemplates(domainType);
}

export async function getTrackTemplates(
  domainType?: DomainType
): Promise<TrackTemplate[]> {
  let query = supabase
    .from('guardrails_track_templates')
    .select('*')
    .order('ordering_index', { ascending: true });

  if (domainType) {
    query = query.eq('domain_type', domainType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching track templates:', error);
    throw new Error('Failed to fetch track templates');
  }

  if (!data) {
    return [];
  }

  if (domainType) {
    const allowedTemplateNames = ALLOWED_TEMPLATES_BY_DOMAIN[domainType];
    return data.filter((template) =>
      allowedTemplateNames.includes(template.name)
    );
  }

  return data;
}

export async function getSubTrackTemplates(
  trackTemplateId: string
): Promise<SubTrackTemplate[]> {
  const { data, error } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .eq('track_template_id', trackTemplateId)
    .order('ordering_index', { ascending: true });

  if (error) {
    console.error('Error fetching subtrack templates:', error);
    throw new Error('Failed to fetch subtrack templates');
  }

  return data || [];
}

export async function getAllTemplates(): Promise<DomainTrackTemplateSet[]> {
  const domains: DomainType[] = ['work', 'personal', 'passion', 'startup'];

  const results = await Promise.all(
    domains.map(async (domain) => ({
      domain_type: domain,
      tracks: await getTemplatesForDomain(domain),
    }))
  );

  return results;
}

export async function getTemplateStructureForDomain(domainType: DomainType): Promise<{
  tracks: Array<{
    templateId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    subtracks: Array<{
      templateId: string;
      name: string;
      description?: string;
      ordering_index: number;
      isDefault: boolean;
    }>;
  }>;
}> {
  const templates = await getTemplatesForDomain(domainType);

  return {
    tracks: templates.map((track) => ({
      templateId: track.id,
      name: track.name,
      description: track.description,
      isDefault: track.is_default,
      subtracks: track.subtracks.map((st) => ({
        templateId: st.id,
        name: st.name,
        description: st.description,
        ordering_index: st.ordering_index,
        isDefault: st.is_default,
      })),
    })),
  };
}

export async function seedDomainTrackTemplates(): Promise<TemplateSeedResult> {
  try {
    const { error } = await supabase.rpc('seed_track_templates');

    if (error) {
      console.error('Error seeding templates:', error);
      return {
        success: false,
        tracksSeeded: 0,
        subtracksSeeded: 0,
        errors: [error.message],
      };
    }

    const allTemplates = await getAllTemplates();
    const tracksSeeded = allTemplates.reduce(
      (sum, domain) => sum + domain.tracks.length,
      0
    );
    const subtracksSeeded = allTemplates.reduce(
      (sum, domain) =>
        sum + domain.tracks.reduce((s, t) => s + t.subtracks.length, 0),
      0
    );

    return {
      success: true,
      tracksSeeded,
      subtracksSeeded,
    };
  } catch (error) {
    console.error('Error seeding templates:', error);
    return {
      success: false,
      tracksSeeded: 0,
      subtracksSeeded: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function ensureTemplatesExist(): Promise<boolean> {
  const { data, error } = await supabase
    .from('guardrails_track_templates')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error checking templates:', error);
    return false;
  }

  if (!data || data.length === 0) {
    const result = await seedDomainTrackTemplates();
    return result.success;
  }

  return true;
}

export async function getDefaultTemplatesForDomain(
  domainType: DomainType
): Promise<TrackTemplateWithSubTracks[]> {
  const templates = await getTemplatesForDomain(domainType);
  return templates.filter((t) => t.is_default);
}

export async function getTrackTemplateById(
  templateId: string
): Promise<TrackTemplateWithSubTracks | null> {
  if (!templateId || templateId === 'undefined') {
    console.warn('getTrackTemplateById called with invalid ID:', templateId);
    return null;
  }

  const { data: trackTemplate, error: trackError } = await supabase
    .from('guardrails_track_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (trackError) {
    console.error('Error fetching track template:', trackError);
    throw new Error('Failed to fetch track template');
  }

  if (!trackTemplate) {
    return null;
  }

  const { data: subtrackTemplates, error: subtrackError } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .eq('track_template_id', templateId)
    .order('ordering_index', { ascending: true });

  if (subtrackError) {
    console.error('Error fetching subtrack templates:', subtrackError);
    throw new Error('Failed to fetch subtrack templates');
  }

  return {
    ...trackTemplate,
    subtracks: subtrackTemplates || [],
  };
}

export async function validateTemplateForDomain(
  domainType: DomainType,
  trackTemplateId: string
): Promise<boolean> {
  if (!trackTemplateId || typeof trackTemplateId !== 'string' || trackTemplateId === 'undefined') {
    console.error('validateTemplateForDomain called with invalid ID:', trackTemplateId);
    throw new Error('Invalid template ID provided');
  }

  const isUser = await isUserTrackTemplate(trackTemplateId);

  if (isUser) {
    const userTemplate = await getUserTrackTemplateById(trackTemplateId);

    if (!userTemplate) {
      throw new Error('Track template not found');
    }

    if (userTemplate.domain_type !== domainType) {
      throw new Error(
        `This template does not belong to the selected domain. Template is for "${userTemplate.domain_type}" but project is "${domainType}".`
      );
    }

    return true;
  }

  const template = await getTrackTemplateById(trackTemplateId);

  if (!template) {
    throw new Error('Track template not found');
  }

  if (template.domain_type !== domainType) {
    throw new Error(
      `This template does not belong to the selected domain. Template is for "${template.domain_type}" but project is "${domainType}".`
    );
  }

  const allowedTemplateNames = ALLOWED_TEMPLATES_BY_DOMAIN[domainType];
  if (!allowedTemplateNames.includes(template.name)) {
    throw new Error(
      `This template ("${template.name}") is not allowed for the "${domainType}" domain.`
    );
  }

  return true;
}

export async function createTrackFromTemplate(
  input: CreateTrackFromTemplateInput
): Promise<{ track: Track; subtracks: SubTrack[] }> {
  if (!input.track_template_id || typeof input.track_template_id !== 'string' || input.track_template_id === 'undefined') {
    console.error('createTrackFromTemplate called with invalid template ID:', input.track_template_id);
    throw new Error('Invalid template ID provided');
  }

  const isUser = await isUserTrackTemplate(input.track_template_id);

  if (isUser) {
    const userTemplate = await getUserTrackTemplateById(input.track_template_id);

    if (!userTemplate) {
      throw new Error('Track template not found');
    }

    if (input.domain_type) {
      await validateTemplateForDomain(input.domain_type, input.track_template_id);
    }

    // Calculate next ordering_index
    const existingTracks = await getTracksByProject(input.master_project_id);
    const nextOrderingIndex = existingTracks.length > 0
      ? Math.max(...existingTracks.map(t => t.orderingIndex)) + 1
      : 0;

    const { data: trackData, error: trackError } = await supabase
      .from('guardrails_tracks')
      .insert({
        master_project_id: input.master_project_id,
        template_id: input.track_template_id,
        name: input.custom_name || userTemplate.name,
        color: input.custom_color || null,
        ordering_index: nextOrderingIndex,
      })
      .select()
      .single();

    if (trackError || !trackData) {
      console.error('Error creating track from user template:', trackError);
      throw new Error('Failed to create track from user template');
    }

    const track: Track = {
      id: trackData.id,
      masterProjectId: trackData.master_project_id,
      name: trackData.name,
      description: trackData.description,
      color: trackData.color,
      orderingIndex: trackData.ordering_index,
      isDefault: trackData.metadata?.is_default ?? false,
      createdAt: trackData.created_at,
      updatedAt: trackData.updated_at,
    };

    const subtracks: SubTrack[] = [];

    if (input.include_subtracks !== false) {
      const { data: userSubtracks, error: userSubtracksError } = await supabase
        .from('guardrails_user_subtrack_templates')
        .select('*')
        .eq('user_track_template_id', userTemplate.id)
        .order('ordering_index', { ascending: true });

      if (userSubtracksError) {
        console.error('Error fetching user subtrack templates:', userSubtracksError);
      } else if (userSubtracks && userSubtracks.length > 0) {
        // Get existing subtracks for this parent track to calculate next ordering_index
        const { getTrackChildren } = await import('./trackService');
        const existingSubtracks = await getTrackChildren(trackData.id);
        const maxOrderingIndex = existingSubtracks.length > 0
          ? Math.max(...existingSubtracks.map(st => st.orderingIndex))
          : -1;

        for (let i = 0; i < userSubtracks.length; i++) {
          const subtrackTemplate = userSubtracks[i];
          const subtrackOrderingIndex = maxOrderingIndex + 1 + i;

          const { data: subtrackData, error: subtrackError } = await supabase
            .from('guardrails_tracks')
            .insert({
              master_project_id: input.master_project_id,
              parent_track_id: trackData.id,
              name: subtrackTemplate.name,
              description: subtrackTemplate.description || null,
              ordering_index: subtrackOrderingIndex,
            })
            .select()
            .single();

          if (subtrackError) {
            console.error('Error creating subtrack from user template:', subtrackError);
            throw new Error(`Failed to create subtrack "${subtrackTemplate.name}": ${subtrackError.message}`);
          } else if (subtrackData) {
            subtracks.push({
              id: subtrackData.id,
              track_id: subtrackData.parent_track_id!,
              name: subtrackData.name,
              description: subtrackData.description,
              ordering_index: subtrackData.ordering_index,
              created_at: subtrackData.created_at,
              updated_at: subtrackData.updated_at,
            });
          }
        }
      }
    }

    return { track, subtracks };
  }

  const template = await getTrackTemplateById(input.track_template_id);

  if (!template) {
    throw new Error('Track template not found');
  }

  if (input.domain_type) {
    await validateTemplateForDomain(input.domain_type, input.track_template_id);
  }

  // Calculate next ordering_index
  const existingTracks = await getTracksByProject(input.master_project_id);
  const nextOrderingIndex = existingTracks.length > 0
    ? Math.max(...existingTracks.map(t => t.orderingIndex)) + 1
    : 0;

  const { data: trackData, error: trackError } = await supabase
    .from('guardrails_tracks')
    .insert({
      master_project_id: input.master_project_id,
      template_id: input.track_template_id,
      name: input.custom_name || template.name,
      color: input.custom_color || null,
      ordering_index: nextOrderingIndex,
    })
    .select()
    .single();

  if (trackError || !trackData) {
    console.error('Error creating track from template:', trackError);
    throw new Error('Failed to create track from template');
  }

  const track: Track = {
    id: trackData.id,
    masterProjectId: trackData.master_project_id,
    name: trackData.name,
    description: trackData.description,
    color: trackData.color,
    orderingIndex: trackData.ordering_index,
    isDefault: trackData.metadata?.is_default ?? false,
    createdAt: trackData.created_at,
    updatedAt: trackData.updated_at,
  };

  const subtracks: SubTrack[] = [];

  if (input.include_subtracks !== false && template.subtracks.length > 0) {
    // Get existing subtracks for this parent track to calculate next ordering_index
    const { getTrackChildren } = await import('./trackService');
    const existingSubtracks = await getTrackChildren(trackData.id);
    const maxOrderingIndex = existingSubtracks.length > 0
      ? Math.max(...existingSubtracks.map(st => st.orderingIndex))
      : -1;

    for (let i = 0; i < template.subtracks.length; i++) {
      const subtrackTemplate = template.subtracks[i];
      const subtrackOrderingIndex = maxOrderingIndex + 1 + i;

      const { data: subtrackData, error: subtrackError } = await supabase
        .from('guardrails_tracks')
        .insert({
          master_project_id: input.master_project_id,
          parent_track_id: trackData.id,
          name: subtrackTemplate.name,
          description: subtrackTemplate.description || null,
          ordering_index: subtrackOrderingIndex,
        })
        .select()
        .single();

      if (subtrackError) {
        console.error('Error creating subtrack from template:', subtrackError);
        throw new Error(`Failed to create subtrack "${subtrackTemplate.name}": ${subtrackError.message}`);
      } else if (subtrackData) {
        subtracks.push({
          id: subtrackData.id,
          track_id: subtrackData.parent_track_id!,
          name: subtrackData.name,
          description: subtrackData.description,
          ordering_index: subtrackData.ordering_index,
          created_at: subtrackData.created_at,
          updated_at: subtrackData.updated_at,
        });
      }
    }
  }

  return { track, subtracks };
}

export async function createSubTrackFromTemplate(
  input: CreateSubTrackFromTemplateInput
): Promise<SubTrack> {
  const { data: template, error: templateError } = await supabase
    .from('guardrails_subtrack_templates')
    .select('*')
    .eq('id', input.subtrack_template_id)
    .maybeSingle();

  if (templateError || !template) {
    console.error('Error fetching subtrack template:', templateError);
    throw new Error('Subtrack template not found');
  }

  const { data: parentTrack, error: parentError } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id')
    .eq('id', input.track_id)
    .single();

  if (parentError || !parentTrack) {
    throw new Error('Parent track not found');
  }

  const { data: subtrackData, error: subtrackError } = await supabase
    .from('guardrails_tracks')
    .insert({
      master_project_id: parentTrack.master_project_id,
      parent_track_id: input.track_id,
      name: input.custom_name || template.name,
      description: template.description || null,
      ordering_index: 0,
      metadata: {},
    })
    .select()
    .single();

  if (subtrackError || !subtrackData) {
    console.error('Error creating subtrack from template:', subtrackError);
    throw new Error('Failed to create subtrack from template');
  }

  return {
    id: subtrackData.id,
    track_id: subtrackData.parent_track_id!,
    name: subtrackData.name,
    description: subtrackData.description,
    ordering_index: subtrackData.ordering_index,
    created_at: subtrackData.created_at,
    updated_at: subtrackData.updated_at,
  };
}

export async function createTracksFromDefaultTemplates(
  masterProjectId: string,
  domainType: DomainType
): Promise<{ tracks: Track[]; subtracks: SubTrack[] }> {
  const defaultTemplates = await getDefaultTemplatesForDomain(domainType);

  const tracks: Track[] = [];
  const subtracks: SubTrack[] = [];

  for (const template of defaultTemplates) {
    const result = await createTrackFromTemplate({
      master_project_id: masterProjectId,
      track_template_id: template.id,
      include_subtracks: true,
    });

    tracks.push(result.track);
    subtracks.push(...result.subtracks);
  }

  return { tracks, subtracks };
}

export async function getTemplateStatistics(): Promise<{
  totalTemplates: number;
  templatesByDomain: Record<DomainType, number>;
  totalSubtracks: number;
}> {
  const { data: trackTemplates, error: trackError } = await supabase
    .from('guardrails_track_templates')
    .select('domain_type');

  if (trackError) {
    console.error('Error fetching template statistics:', trackError);
    throw new Error('Failed to fetch template statistics');
  }

  const { data: subtrackTemplates, error: subtrackError } = await supabase
    .from('guardrails_subtrack_templates')
    .select('id');

  if (subtrackError) {
    console.error('Error fetching subtrack statistics:', subtrackError);
    throw new Error('Failed to fetch subtrack statistics');
  }

  const templatesByDomain: Record<DomainType, number> = {
    work: 0,
    personal: 0,
    passion: 0,
    startup: 0,
  };

  (trackTemplates || []).forEach((t) => {
    templatesByDomain[t.domain_type as DomainType]++;
  });

  return {
    totalTemplates: trackTemplates?.length || 0,
    templatesByDomain,
    totalSubtracks: subtrackTemplates?.length || 0,
  };
}
