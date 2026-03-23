/**
 * Research Service
 * 
 * Phase 3.4: Research Micro-App Service Layer
 * 
 * Handles research note storage and management for Track & Subtrack Workspaces.
 * All database access goes through this service layer.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ All DB access through this service
 * - ✅ UI components never query Supabase directly
 * - ✅ Errors returned, not thrown blindly
 * - ✅ Research notes belong to Workspaces, not Roadmap
 */

import { supabase } from '../../supabase';

export interface TrackResearchNote {
  id: string;
  track_id: string;
  subtrack_id: string | null;
  title: string;
  content: string | null;
  source_urls: string[];
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateResearchNoteInput {
  trackId: string;
  subtrackId?: string | null;
  title: string;
  content?: string | null;
  sourceUrls?: string[];
  tags?: string[];
}

export interface UpdateResearchNoteInput {
  title?: string;
  content?: string | null;
  sourceUrls?: string[];
  tags?: string[];
}

/**
 * Get all research notes for a track (and optionally a subtrack)
 */
export async function getTrackResearchNotes(
  trackId: string,
  subtrackId?: string | null
): Promise<TrackResearchNote[]> {
  let query = supabase
    .from('track_research_notes')
    .select('*')
    .eq('track_id', trackId)
    .order('updated_at', { ascending: false });

  if (subtrackId !== undefined && subtrackId !== null) {
    query = query.eq('subtrack_id', subtrackId);
  } else {
    query = query.is('subtrack_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[researchService] Error fetching research notes:', error);
    throw new Error(`Failed to fetch research notes: ${error.message}`);
  }

  return (data || []).map(mapDbNoteToResearchNote);
}

/**
 * Create a new research note
 */
export async function createResearchNote(
  input: CreateResearchNoteInput,
  userId: string
): Promise<TrackResearchNote> {
  const { trackId, subtrackId, title, content = null, sourceUrls = [], tags = [] } = input;

  const { data, error } = await supabase
    .from('track_research_notes')
    .insert({
      track_id: trackId,
      subtrack_id: subtrackId || null,
      title,
      content,
      source_urls: sourceUrls,
      tags: tags,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[researchService] Error creating research note:', error);
    throw new Error(`Failed to create research note: ${error.message}`);
  }

  return mapDbNoteToResearchNote(data);
}

/**
 * Update a research note
 */
export async function updateResearchNote(
  noteId: string,
  updates: UpdateResearchNoteInput
): Promise<TrackResearchNote> {
  const updateData: any = {};

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.content !== undefined) {
    updateData.content = updates.content;
  }

  if (updates.sourceUrls !== undefined) {
    updateData.source_urls = updates.sourceUrls;
  }

  if (updates.tags !== undefined) {
    updateData.tags = updates.tags;
  }

  const { data, error } = await supabase
    .from('track_research_notes')
    .update(updateData)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('[researchService] Error updating research note:', error);
    throw new Error(`Failed to update research note: ${error.message}`);
  }

  return mapDbNoteToResearchNote(data);
}

/**
 * Delete a research note
 */
export async function deleteResearchNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('track_research_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('[researchService] Error deleting research note:', error);
    throw new Error(`Failed to delete research note: ${error.message}`);
  }
}

/**
 * Map database note to TrackResearchNote interface
 */
function mapDbNoteToResearchNote(dbNote: any): TrackResearchNote {
  return {
    id: dbNote.id,
    track_id: dbNote.track_id,
    subtrack_id: dbNote.subtrack_id,
    title: dbNote.title,
    content: dbNote.content,
    source_urls: dbNote.source_urls || [],
    tags: dbNote.tags || [],
    created_by: dbNote.created_by,
    created_at: dbNote.created_at,
    updated_at: dbNote.updated_at,
  };
}
