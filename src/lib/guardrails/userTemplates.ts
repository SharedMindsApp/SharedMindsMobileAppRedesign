import { supabase } from '../supabase';
import type {
  UserTrackTemplate,
  UserSubTrackTemplate,
  UserTrackTemplateWithSubTracks,
  CreateUserTrackTemplateInput,
  UpdateUserTrackTemplateInput,
  CreateUserSubTrackTemplateInput,
  UpdateUserSubTrackTemplateInput,
  CreateTrackFromUserTemplateInput,
  DomainType,
} from './templateTypes';
import type { Track } from './tracksTypes';
import type { SubTrack } from './subtracksTypes';

export async function createUserTrackTemplate(
  input: CreateUserTrackTemplateInput
): Promise<UserTrackTemplate> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User must be authenticated to create templates');
  }

  const { data, error } = await supabase
    .from('guardrails_user_track_templates')
    .insert({
      user_id: user.id,
      domain_type: input.domain_type,
      name: input.name,
      description: input.description,
      ordering_index: input.ordering_index ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserTrackTemplate(
  id: string,
  input: UpdateUserTrackTemplateInput
): Promise<UserTrackTemplate> {
  if (!id || typeof id !== 'string' || id === 'undefined') {
    console.error('updateUserTrackTemplate called with invalid ID:', id);
    throw new Error('Invalid template ID provided');
  }

  const { data, error } = await supabase
    .from('guardrails_user_track_templates')
    .update({
      name: input.name,
      description: input.description,
      ordering_index: input.ordering_index,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserTrackTemplate(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id === 'undefined') {
    console.error('deleteUserTrackTemplate called with invalid ID:', id);
    throw new Error('Invalid template ID provided');
  }

  const { error } = await supabase
    .from('guardrails_user_track_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUserTrackTemplates(
  domainType?: DomainType
): Promise<UserTrackTemplate[]> {
  let query = supabase
    .from('guardrails_user_track_templates')
    .select('*')
    .order('ordering_index', { ascending: true });

  if (domainType) {
    query = query.eq('domain_type', domainType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getUserTrackTemplateById(
  id: string
): Promise<UserTrackTemplate | null> {
  if (!id || id === 'undefined') {
    console.warn('getUserTrackTemplateById called with invalid ID:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('guardrails_user_track_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserTrackTemplatesWithSubTracks(
  domainType?: DomainType
): Promise<UserTrackTemplateWithSubTracks[]> {
  const trackTemplates = await getUserTrackTemplates(domainType);

  const templatesWithSubTracks = await Promise.all(
    trackTemplates.map(async (template) => {
      const subtracks = await getUserSubTrackTemplates(template.id);
      return {
        ...template,
        subtracks,
      };
    })
  );

  return templatesWithSubTracks;
}

export async function createUserSubTrackTemplate(
  input: CreateUserSubTrackTemplateInput
): Promise<UserSubTrackTemplate> {
  const { data, error } = await supabase
    .from('guardrails_user_subtrack_templates')
    .insert({
      user_track_template_id: input.user_track_template_id,
      name: input.name,
      description: input.description,
      ordering_index: input.ordering_index ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserSubTrackTemplate(
  id: string,
  input: UpdateUserSubTrackTemplateInput
): Promise<UserSubTrackTemplate> {
  if (!id || typeof id !== 'string' || id === 'undefined') {
    console.error('updateUserSubTrackTemplate called with invalid ID:', id);
    throw new Error('Invalid subtrack template ID provided');
  }

  const { data, error } = await supabase
    .from('guardrails_user_subtrack_templates')
    .update({
      name: input.name,
      description: input.description,
      ordering_index: input.ordering_index,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserSubTrackTemplate(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id === 'undefined') {
    console.error('deleteUserSubTrackTemplate called with invalid ID:', id);
    throw new Error('Invalid subtrack template ID provided');
  }

  const { error } = await supabase
    .from('guardrails_user_subtrack_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUserSubTrackTemplates(
  trackTemplateId: string
): Promise<UserSubTrackTemplate[]> {
  if (!trackTemplateId || typeof trackTemplateId !== 'string' || trackTemplateId === 'undefined') {
    console.warn('getUserSubTrackTemplates called with invalid track template ID:', trackTemplateId);
    return [];
  }

  const { data, error } = await supabase
    .from('guardrails_user_subtrack_templates')
    .select('*')
    .eq('user_track_template_id', trackTemplateId)
    .order('ordering_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTrackFromUserTemplate(
  input: CreateTrackFromUserTemplateInput
): Promise<Track> {
  if (!input.user_track_template_id || typeof input.user_track_template_id !== 'string' || input.user_track_template_id === 'undefined') {
    console.error('createTrackFromUserTemplate called with invalid template ID:', input.user_track_template_id);
    throw new Error('Invalid user template ID provided');
  }

  const template = await getUserTrackTemplateById(input.user_track_template_id);

  if (!template) {
    throw new Error(`User track template not found: ${input.user_track_template_id}`);
  }

  const trackName = input.custom_name || template.name;
  const trackColor = input.custom_color || '#3b82f6';

  const { data: track, error: trackError } = await supabase
    .from('guardrails_tracks')
    .insert({
      master_project_id: input.master_project_id,
      template_id: input.user_track_template_id,
      name: trackName,
      color: trackColor,
      description: template.description,
    })
    .select()
    .single();

  if (trackError) throw trackError;

  if (input.include_subtracks !== false) {
    const subtrackTemplates = await getUserSubTrackTemplates(template.id);

    if (subtrackTemplates.length > 0) {
      // Get existing subtracks for this parent track to calculate next ordering_index
      const { getTrackChildren } = await import('./trackService');
      const existingSubtracks = await getTrackChildren(track.id);
      const maxOrderingIndex = existingSubtracks.length > 0
        ? Math.max(...existingSubtracks.map(st => st.orderingIndex))
        : -1;

      // Create subtracks as tracks with parent_track_id set (hierarchical architecture)
      for (let i = 0; i < subtrackTemplates.length; i++) {
        const subtrackTemplate = subtrackTemplates[i];
        const subtrackOrderingIndex = maxOrderingIndex + 1 + i;

        const { data: subtrackData, error: subtrackError } = await supabase
          .from('guardrails_tracks')
          .insert({
            master_project_id: input.master_project_id,
            parent_track_id: track.id,
            name: subtrackTemplate.name,
            description: subtrackTemplate.description || null,
            ordering_index: subtrackOrderingIndex,
          })
          .select()
          .single();

        if (subtrackError) {
          console.error('Error creating subtrack from user template:', subtrackError);
          throw new Error(`Failed to create subtrack "${subtrackTemplate.name}": ${subtrackError.message}`);
        }
      }
    }
  }

  return track;
}

export async function duplicateUserTrackTemplate(
  templateId: string,
  newName?: string
): Promise<UserTrackTemplate> {
  if (!templateId || typeof templateId !== 'string' || templateId === 'undefined') {
    console.error('duplicateUserTrackTemplate called with invalid template ID:', templateId);
    throw new Error('Invalid template ID provided');
  }

  const template = await getUserTrackTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const subtracks = await getUserSubTrackTemplates(templateId);

  const duplicatedTemplate = await createUserTrackTemplate({
    domain_type: template.domain_type,
    name: newName || `${template.name} (Copy)`,
    description: template.description,
    ordering_index: template.ordering_index,
  });

  if (subtracks.length > 0) {
    await Promise.all(
      subtracks.map((subtrack) =>
        createUserSubTrackTemplate({
          user_track_template_id: duplicatedTemplate.id,
          name: subtrack.name,
          description: subtrack.description,
          ordering_index: subtrack.ordering_index,
        })
      )
    );
  }

  return duplicatedTemplate;
}

export async function isUserTrackTemplate(templateId: string): Promise<boolean> {
  if (!templateId || typeof templateId !== 'string' || templateId === 'undefined') {
    console.warn('isUserTrackTemplate called with invalid ID:', templateId);
    return false;
  }

  const { data, error } = await supabase
    .from('guardrails_user_track_templates')
    .select('id')
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
