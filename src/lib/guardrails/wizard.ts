import { supabase } from '../supabase';
import { createMasterProject } from '../guardrails';
import type {
  CreateProjectWizardInput,
  ProjectWizardResult,
  TemplateResolutionInput,
  RoadmapItemPreview,
} from './wizardTypes';
import type { Track } from './tracksTypes';
import type { SubTrack } from './subtracksTypes';
import type { AnyTrackTemplate } from './templateTypes';
import { saveUniversalTrackInfo } from './universalTrackInfo';
import {
  getDefaultTemplatesForDomain,
  getTrackTemplateById,
  validateTemplateForDomain,
  createTrackFromTemplate,
  getTemplatesForDomain,
} from './templates';
import {
  getUserTrackTemplateById,
  isUserTrackTemplate,
  createTrackFromUserTemplate as createTrackFromUserTemplateUtil,
} from './userTemplates';
import { getTracksByProject, getTrackChildren } from './trackService';

async function resolveTemplatesForWizard(
  input: TemplateResolutionInput
): Promise<AnyTrackTemplate[]> {
  const {
    domain_type,
    use_default_templates = false,
    selected_default_template_ids = [],
    selected_system_template_ids = [],
    selected_user_template_ids = [],
  } = input;

  const validDefaultIds = selected_default_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );
  const validSystemIds = selected_system_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );
  const validUserIds = selected_user_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );

  if (validDefaultIds.length !== selected_default_template_ids.length) {
    console.warn(
      'Some default template IDs were invalid and have been filtered out:',
      selected_default_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }
  if (validSystemIds.length !== selected_system_template_ids.length) {
    console.warn(
      'Some system template IDs were invalid and have been filtered out:',
      selected_system_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }
  if (validUserIds.length !== selected_user_template_ids.length) {
    console.warn(
      'Some user template IDs were invalid and have been filtered out:',
      selected_user_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }

  const resolvedTemplates: AnyTrackTemplate[] = [];
  const templateIds = new Set<string>();

  if (use_default_templates && validDefaultIds.length === 0) {
    const defaultTemplates = await getDefaultTemplatesForDomain(domain_type);
    for (const template of defaultTemplates) {
      if (template.id && !templateIds.has(template.id)) {
        resolvedTemplates.push(template);
        templateIds.add(template.id);
      }
    }
  }

  for (const templateId of validDefaultIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  for (const templateId of validSystemIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  for (const templateId of validUserIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getUserTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  resolvedTemplates.sort((a, b) => {
    const aIsDefault = 'is_default' in a ? a.is_default : false;
    const bIsDefault = 'is_default' in b ? b.is_default : false;

    if (aIsDefault !== bIsDefault) {
      return aIsDefault ? -1 : 1;
    }
    return a.ordering_index - b.ordering_index;
  });

  return resolvedTemplates;
}

export async function createProjectWithWizard(
  input: CreateProjectWizardInput
): Promise<ProjectWizardResult> {
  const {
    domain_id,
    domain_type,
    name,
    description,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
    generate_initial_roadmap = false,
    quick_goal,
    first_priority_track_template_id,
    wizard_track_setup,
  } = input;

  if (!domain_type) {
    throw new Error('Domain type is required for project creation');
  }

  const validDomainTypes = ['work', 'personal', 'passion', 'startup'];
  if (!validDomainTypes.includes(domain_type)) {
    throw new Error(`Invalid domain type: ${domain_type}`);
  }

  const project = await createMasterProject(domain_id, name, description);

  await supabase
    .from('master_projects')
    .update({ has_completed_wizard: true })
    .eq('id', project.id);

  const resolvedTemplates = await resolveTemplatesForWizard({
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  });

  console.log('[WIZARD] Resolved templates:', {
    count: resolvedTemplates.length,
    templates: resolvedTemplates.map(t => ({ id: t.id, name: t.name })),
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  });

  const tracks: Track[] = [];
  const subtracks: SubTrack[] = [];
  const roadmapPreview: RoadmapItemPreview[] = [];

  if (resolvedTemplates.length === 0) {
    console.warn('[WIZARD] No templates resolved! Tracks will not be created.');
  }

  for (const template of resolvedTemplates) {
    if (!template.id || typeof template.id !== 'string' || template.id === 'undefined') {
      console.warn('Skipping template with invalid ID:', template);
      continue;
    }

    const isUser = await isUserTrackTemplate(template.id);

    if (isUser) {
      const track = await createTrackFromUserTemplateUtil({
        master_project_id: project.id,
        user_track_template_id: template.id,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: track.id,
        masterProjectId: track.master_project_id,
        name: track.name,
        description: track.description,
        color: track.color,
        orderingIndex: track.ordering_index || 0,
        isDefault: track.is_default || false,
        createdAt: track.created_at,
        updatedAt: track.updated_at,
      };

      tracks.push(createdTrack);

      // Query subtracks from guardrails_tracks using parent_track_id (hierarchical architecture)
      const createdSubtrackTracks = await getTrackChildren(track.id);
      
      // Convert Track[] to SubTrack[] format
      const createdSubtracks: SubTrack[] = createdSubtrackTracks.map((subtrackTrack) => ({
        id: subtrackTrack.id,
        track_id: subtrackTrack.parentTrackId!,
        name: subtrackTrack.name,
        description: subtrackTrack.description || null,
        ordering_index: subtrackTrack.orderingIndex,
        is_default: subtrackTrack.metadata?.is_default ?? false,
        start_date: subtrackTrack.metadata?.start_date || null,
        end_date: subtrackTrack.metadata?.end_date || null,
        created_at: subtrackTrack.createdAt,
        updated_at: subtrackTrack.updatedAt,
      }));

      if (createdSubtracks.length > 0) {
        subtracks.push(...createdSubtracks);

        if (generate_initial_roadmap) {
          const isPriorityTrack = first_priority_track_template_id === template.id;
          for (const subtrack of createdSubtracks) {
            // Generate smarter title using subtrack name
            let itemTitle = subtrack.name;
            if (!itemTitle.toLowerCase().startsWith('complete')) {
              itemTitle = `Complete ${itemTitle}`;
            }
            
            // Enhance with quick goal if provided and applicable
            if (quick_goal && isPriorityTrack) {
              // Could use quick_goal to enhance description, but for now just use for priority
            }
            
            roadmapPreview.push({
              track_id: track.id,
              subtrack_id: subtrack.id,
              title: itemTitle,
              status: 'not_started',
              metadata: isPriorityTrack ? { priority: true } : undefined,
            });
          }
        }
      }
    } else {
      const result = await createTrackFromTemplate({
        master_project_id: project.id,
        track_template_id: template.id,
        domain_type,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: result.track.id,
        masterProjectId: result.track.master_project_id,
        name: result.track.name,
        description: result.track.description,
        color: result.track.color,
        orderingIndex: result.track.ordering_index || 0,
        isDefault: result.track.is_default || false,
        createdAt: result.track.created_at,
        updatedAt: result.track.updated_at,
      };

      tracks.push(createdTrack);
      subtracks.push(...result.subtracks);

      if (generate_initial_roadmap && result.subtracks.length > 0) {
        const isPriorityTrack = first_priority_track_template_id === template.id;
        for (const subtrack of result.subtracks) {
          // Generate smarter title using subtrack name
          let itemTitle = subtrack.name;
          if (!itemTitle.toLowerCase().startsWith('complete')) {
            itemTitle = `Complete ${itemTitle}`;
          }
          
          roadmapPreview.push({
            track_id: result.track.id,
            subtrack_id: subtrack.id,
            title: itemTitle,
            status: 'not_started',
            metadata: isPriorityTrack ? { priority: true } : undefined,
          });
        }
      }
    }
  }

  // Save universal track info for all tracks (Quick Setup Step 3 data)
  if (wizard_track_setup && wizard_track_setup.length > 0) {
    // Build template ID to track ID mapping
    const templateToTrackMap = new Map<string, string>();
    
    // Fetch template_id from database for all tracks
    const trackIds = tracks.map(t => t.id);
    if (trackIds.length > 0) {
      const { data: tracksWithTemplate, error } = await supabase
        .from('guardrails_tracks')
        .select('id, template_id, name')
        .in('id', trackIds);
      
      if (!error && tracksWithTemplate) {
        for (const dbTrack of tracksWithTemplate) {
          if (dbTrack.template_id) {
            templateToTrackMap.set(dbTrack.template_id, dbTrack.id);
          }
        }
      }
    }
    
    // Fallback: match by name for any tracks that weren't matched by template_id
    const trackIdsInMap = new Set(templateToTrackMap.values());
    for (const track of tracks) {
      if (!trackIdsInMap.has(track.id)) {
        const matchingSetup = wizard_track_setup.find(
          setup => {
            const template = resolvedTemplates.find(t => t.id === setup.track_template_id);
            return template && template.name === track.name;
          }
        );
        if (matchingSetup) {
          templateToTrackMap.set(matchingSetup.track_template_id, track.id);
          trackIdsInMap.add(track.id);
        }
      }
    }

    // Save universal track info for each track
    console.log('[WIZARD] Saving universal track info:', {
      wizardTrackSetupCount: wizard_track_setup.length,
      templateToTrackMapSize: templateToTrackMap.size,
      templateToTrackMap: Array.from(templateToTrackMap.entries()),
    });

    for (const setup of wizard_track_setup) {
      const trackId = templateToTrackMap.get(setup.track_template_id);
      if (trackId) {
        try {
          console.log('[WIZARD] Saving universal track info for track:', {
            trackId,
            templateId: setup.track_template_id,
            objective: setup.objective,
            definition_of_done: setup.definition_of_done,
            time_mode: setup.time_mode,
          });
          await saveUniversalTrackInfo({
            master_project_id: project.id,
            track_id: trackId,
            objective: setup.objective,
            definition_of_done: setup.definition_of_done,
            time_mode: setup.time_mode,
            start_date: setup.start_date || null,
            end_date: setup.end_date || null,
            target_date: setup.target_date || null,
          });
          console.log('[WIZARD] Successfully saved universal track info for track:', trackId);
        } catch (error) {
          console.error(`Failed to save universal track info for track ${trackId}:`, error);
          // Continue with other tracks even if one fails
        }
      } else {
        console.warn('[WIZARD] No track ID found for template:', setup.track_template_id);
      }
    }
  }

  return {
    project,
    tracks,
    subtracks,
    roadmap_preview: roadmapPreview,
    applied_templates: resolvedTemplates,
  };
}

export async function addTracksToProject(input: {
  project_id: string;
  domain_type: DomainType;
  use_default_templates?: boolean;
  selected_default_template_ids?: string[];
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
}): Promise<{
  tracks: Track[];
  subtracks: SubTrack[];
  applied_templates: AnyTrackTemplate[];
}> {
  const {
    project_id,
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  } = input;

  const resolvedTemplates = await resolveTemplatesForWizard({
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  });

  const tracks: Track[] = [];
  const subtracks: SubTrack[] = [];

  for (const template of resolvedTemplates) {
    if (!template.id || typeof template.id !== 'string' || template.id === 'undefined') {
      console.warn('Skipping template with invalid ID:', template);
      continue;
    }

    const isUser = await isUserTrackTemplate(template.id);

    if (isUser) {
      const track = await createTrackFromUserTemplateUtil({
        master_project_id: project_id,
        user_track_template_id: template.id,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: track.id,
        masterProjectId: track.master_project_id,
        name: track.name,
        description: track.description,
        color: track.color,
        orderingIndex: track.ordering_index || 0,
        isDefault: track.is_default || false,
        createdAt: track.created_at,
        updatedAt: track.updated_at,
      };

      tracks.push(createdTrack);

      // Query subtracks from guardrails_tracks using parent_track_id (hierarchical architecture)
      const createdSubtrackTracks = await getTrackChildren(track.id);
      
      // Convert Track[] to SubTrack[] format
      const createdSubtracks: SubTrack[] = createdSubtrackTracks.map((subtrackTrack) => ({
        id: subtrackTrack.id,
        track_id: subtrackTrack.parentTrackId!,
        name: subtrackTrack.name,
        description: subtrackTrack.description || null,
        ordering_index: subtrackTrack.orderingIndex,
        is_default: subtrackTrack.metadata?.is_default ?? false,
        start_date: subtrackTrack.metadata?.start_date || null,
        end_date: subtrackTrack.metadata?.end_date || null,
        created_at: subtrackTrack.createdAt,
        updated_at: subtrackTrack.updatedAt,
      }));

      if (createdSubtracks.length > 0) {
        subtracks.push(...createdSubtracks);
      }
    } else {
      const result = await createTrackFromTemplate({
        master_project_id: project_id,
        track_template_id: template.id,
      });

      const createdTrack: Track = {
        id: result.track.id,
        masterProjectId: result.track.master_project_id,
        name: result.track.name,
        description: result.track.description || null,
        color: result.track.color,
        orderingIndex: result.track.ordering_index || 0,
        isDefault: result.track.is_default || false,
        createdAt: result.track.created_at,
        updatedAt: result.track.updated_at,
      };

      tracks.push(createdTrack);
      subtracks.push(...result.subtracks);
    }
  }

  await supabase
    .from('master_projects')
    .update({ has_completed_wizard: true })
    .eq('id', project_id);

  return {
    tracks,
    subtracks,
    applied_templates: resolvedTemplates,
  };
}

export interface AppliedTemplateIds {
  defaultTemplateIds: string[];
  systemTemplateIds: string[];
  userTemplateIds: string[];
}

export async function getAppliedTemplateIdsForProject(
  projectId: string,
  domainType?: DomainType
): Promise<AppliedTemplateIds> {
  const tracks = await getTracksByProject(projectId);
  
  const defaultTemplateIds: string[] = [];
  const systemTemplateIds: string[] = [];
  const userTemplateIds: string[] = [];
  
  // Get all available templates for name matching fallback (for existing tracks without template_id)
  let allTemplates: AnyTrackTemplate[] = [];
  if (domainType) {
    try {
      allTemplates = await getTemplatesForDomain(domainType);
    } catch (error) {
      console.error('Failed to load templates for name matching:', error);
    }
  }
  
  for (const track of tracks) {
    let matchedTemplateId: string | null = null;
    
    // First try to match by template_id if it exists
    if (track.templateId) {
      matchedTemplateId = track.templateId;
    } else if (domainType && allTemplates.length > 0) {
      // Fallback: match by track name to template name (exact match)
      const matchingTemplate = allTemplates.find(t => t.name === track.name);
      if (matchingTemplate && matchingTemplate.id) {
        matchedTemplateId = matchingTemplate.id;
      }
    }
    
    if (!matchedTemplateId) continue;
    
    const isUser = await isUserTrackTemplate(matchedTemplateId);
    
    if (isUser) {
      userTemplateIds.push(matchedTemplateId);
    } else {
      // Check if it's a default template
      const template = await getTrackTemplateById(matchedTemplateId);
      if (template && template.is_default) {
        defaultTemplateIds.push(matchedTemplateId);
      } else {
        systemTemplateIds.push(matchedTemplateId);
      }
    }
  }
  
  return {
    defaultTemplateIds: Array.from(new Set(defaultTemplateIds)),
    systemTemplateIds: Array.from(new Set(systemTemplateIds)),
    userTemplateIds: Array.from(new Set(userTemplateIds)),
  };
}

export async function getWizardTemplatePreview(domain_type: string) {
  const input: TemplateResolutionInput = {
    domain_type: domain_type as any,
    use_default_templates: true,
  };

  const templates = await resolveTemplatesForWizard(input);

  return {
    domain_type,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      is_default: 'is_default' in t ? t.is_default : false,
      is_user_template: !('is_default' in t),
      subtrack_count: 'subtracks' in t ? t.subtracks.length : 0,
    })),
  };
}
