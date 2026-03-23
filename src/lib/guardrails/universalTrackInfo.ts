import { supabase } from '../supabase';

export interface UniversalTrackInfo {
  id: string;
  master_project_id: string;
  track_id: string;
  track_category_id: string | null;
  objective: string;
  definition_of_done: string;
  time_mode: 'unscheduled' | 'target' | 'ranged' | 'ongoing';
  start_date: string | null;
  end_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUniversalTrackInfoInput {
  master_project_id: string;
  track_id: string;
  track_category_id?: string | null;
  objective: string;
  definition_of_done: string;
  time_mode: 'unscheduled' | 'target' | 'ranged' | 'ongoing';
  start_date?: string | null;
  end_date?: string | null;
  target_date?: string | null;
}

export interface UpdateUniversalTrackInfoInput {
  objective?: string;
  definition_of_done?: string;
  time_mode?: 'unscheduled' | 'target' | 'ranged' | 'ongoing';
  start_date?: string | null;
  end_date?: string | null;
  target_date?: string | null;
}

/**
 * Save universal track info for a track
 * Creates new record or updates existing one
 */
export async function saveUniversalTrackInfo(
  input: CreateUniversalTrackInfoInput
): Promise<UniversalTrackInfo> {
  // Check if record already exists
  const { data: existing } = await supabase
    .from('universal_track_info')
    .select('id')
    .eq('track_id', input.track_id)
    .maybeSingle();

  // Build payload - try to include track_category_id, but omit it if PostgREST doesn't recognize it
  const basePayload: any = {
    objective: input.objective,
    definition_of_done: input.definition_of_done,
    time_mode: input.time_mode,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    target_date: input.target_date || null,
  };

  // Try to include track_category_id if provided (may fail if PostgREST schema cache is stale)
  if (input.track_category_id !== undefined && input.track_category_id !== null) {
    basePayload.track_category_id = input.track_category_id;
  }

  if (existing) {
    // Update existing record
    let updatePayload = {
      ...basePayload,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('universal_track_info')
      .update(updatePayload)
      .eq('track_id', input.track_id)
      .select()
      .single();

    // If error is due to track_category_id column not found, retry without it
    if (error && error.code === 'PGRST204' && error.message?.includes('track_category_id')) {
      const { track_category_id, ...payloadWithoutCategory } = updatePayload;
      const retryResult = await supabase
        .from('universal_track_info')
        .update(payloadWithoutCategory)
        .eq('track_id', input.track_id)
        .select()
        .single();

      if (retryResult.error) {
        console.error('Error updating universal track info:', retryResult.error);
        throw new Error(`Failed to update universal track info: ${retryResult.error.message}`);
      }
      data = retryResult.data;
      error = null;
    } else if (error) {
      console.error('Error updating universal track info:', error);
      throw new Error(`Failed to update universal track info: ${error.message}`);
    }

    return data as UniversalTrackInfo;
  } else {
    // Create new record
    let insertPayload = {
      master_project_id: input.master_project_id,
      track_id: input.track_id,
      ...basePayload,
    };

    let { data, error } = await supabase
      .from('universal_track_info')
      .insert(insertPayload)
      .select()
      .single();

    // If error is due to track_category_id column not found, retry without it
    if (error && error.code === 'PGRST204' && error.message?.includes('track_category_id')) {
      const { track_category_id, ...payloadWithoutCategory } = insertPayload;
      const retryResult = await supabase
        .from('universal_track_info')
        .insert(payloadWithoutCategory)
        .select()
        .single();

      if (retryResult.error) {
        console.error('Error creating universal track info:', retryResult.error);
        throw new Error(`Failed to create universal track info: ${retryResult.error.message}`);
      }
      data = retryResult.data;
      error = null;
    } else if (error) {
      console.error('Error creating universal track info:', error);
      throw new Error(`Failed to create universal track info: ${error.message}`);
    }

    return data as UniversalTrackInfo;
  }
}

/**
 * Get universal track info for a specific track
 */
export async function getUniversalTrackInfoByTrackId(
  trackId: string
): Promise<UniversalTrackInfo | null> {
  const { data, error } = await supabase
    .from('universal_track_info')
    .select('*')
    .eq('track_id', trackId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching universal track info:', error);
    throw new Error(`Failed to fetch universal track info: ${error.message}`);
  }

  return data as UniversalTrackInfo;
}

/**
 * Get all universal track info for a project
 */
export async function getUniversalTrackInfoByProject(
  masterProjectId: string
): Promise<UniversalTrackInfo[]> {
  const { data, error } = await supabase
    .from('universal_track_info')
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (error) {
    console.error('Error fetching universal track info for project:', error);
    throw new Error(`Failed to fetch universal track info: ${error.message}`);
  }

  return (data || []) as UniversalTrackInfo[];
}

/**
 * Get universal track info mapped by track ID
 */
export async function getUniversalTrackInfoMapByProject(
  masterProjectId: string
): Promise<Map<string, UniversalTrackInfo>> {
  const infoList = await getUniversalTrackInfoByProject(masterProjectId);
  const map = new Map<string, UniversalTrackInfo>();
  
  for (const info of infoList) {
    map.set(info.track_id, info);
  }
  
  return map;
}
