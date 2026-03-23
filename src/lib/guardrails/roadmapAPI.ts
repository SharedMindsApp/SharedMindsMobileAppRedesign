import { supabase } from '../supabase';
import type { RoadmapItem } from '../guardrailsTypes';

export interface UpdateRoadmapItemInput {
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  color?: string;
  track_id?: string | null;
  subtrack_id?: string | null;
}

export interface CreateRoadmapItemInput {
  section_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  color?: string;
  track_id?: string | null;
  subtrack_id?: string | null;
}

export async function updateRoadmapItem(
  itemId: string,
  updates: UpdateRoadmapItemInput
): Promise<RoadmapItem> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .update(updates)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating roadmap item:', error);
    throw new Error(`Failed to update roadmap item: ${error.message}`);
  }

  return data;
}

export async function createRoadmapItem(
  input: CreateRoadmapItemInput
): Promise<RoadmapItem> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({
      section_id: input.section_id,
      title: input.title,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status || 'not_started',
      color: input.color,
      track_id: input.track_id || null,
      subtrack_id: input.subtrack_id || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating roadmap item:', error);
    throw new Error(`Failed to create roadmap item: ${error.message}`);
  }

  return data;
}

export async function deleteRoadmapItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('roadmap_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting roadmap item:', error);
    throw new Error(`Failed to delete roadmap item: ${error.message}`);
  }
}

export async function getRoadmapItemsForProject(
  masterProjectId: string
): Promise<RoadmapItem[]> {
  const { data: sections, error: sectionsError } = await supabase
    .from('roadmap_sections')
    .select('id')
    .eq('master_project_id', masterProjectId);

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
    throw new Error(`Failed to fetch sections: ${sectionsError.message}`);
  }

  if (!sections || sections.length === 0) {
    return [];
  }

  const sectionIds = sections.map((s) => s.id);

  const { data: items, error: itemsError } = await supabase
    .from('roadmap_items')
    .select('*')
    .in('section_id', sectionIds)
    .order('start_date', { ascending: true });

  if (itemsError) {
    console.error('Error fetching roadmap items:', itemsError);
    throw new Error(`Failed to fetch roadmap items: ${itemsError.message}`);
  }

  return items || [];
}

export interface RoadmapFilters {
  trackId?: string | null;
  subtrackId?: string | null;
  status?: string | null;
  dateRange?: {
    start: string;
    end: string;
  } | null;
}

export async function getFilteredRoadmapItems(
  masterProjectId: string,
  filters: RoadmapFilters
): Promise<RoadmapItem[]> {
  let query = supabase
    .from('roadmap_items')
    .select('*, section:roadmap_sections!inner(master_project_id)')
    .eq('section.master_project_id', masterProjectId);

  if (filters.trackId) {
    query = query.eq('track_id', filters.trackId);
  }

  if (filters.subtrackId) {
    query = query.eq('subtrack_id', filters.subtrackId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.dateRange) {
    query = query
      .gte('start_date', filters.dateRange.start)
      .lte('end_date', filters.dateRange.end);
  }

  query = query.order('start_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered items:', error);
    throw new Error(`Failed to fetch filtered items: ${error.message}`);
  }

  return data || [];
}
