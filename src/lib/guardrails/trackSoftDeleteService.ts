/**
 * Track Soft Delete Service
 * 
 * Provides soft delete functionality for tracks and subtracks.
 * All deletions are reversible via the Recycle Bin.
 */

import { supabase } from '../supabase';
import type { Track } from './coreTypes';

const TABLE_NAME = 'guardrails_tracks';

export interface DeletedTrack {
  id: string;
  masterProjectId: string;
  parentTrackId: string | null;
  name: string;
  description: string | null;
  color: string | null;
  deletedAt: string;
  daysRemaining: number;
}

/**
 * Soft delete a track or subtrack
 * Sets deleted_at timestamp, making it invisible from normal queries
 */
export async function softDeleteTrack(trackId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', trackId);

  if (error) {
    throw new Error(`Failed to soft delete track: ${error.message}`);
  }
}

/**
 * Restore a soft-deleted track or subtrack
 * Clears deleted_at timestamp, making it visible again
 */
export async function restoreTrack(trackId: string): Promise<Track> {
  const { error: updateError } = await supabase
    .from(TABLE_NAME)
    .update({ deleted_at: null })
    .eq('id', trackId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to restore track: ${updateError.message}`);
  }

  // Fetch the restored track
  const { data, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', trackId)
    .single();

  if (fetchError || !data) {
    throw new Error(`Failed to fetch restored track: ${fetchError?.message || 'No data'}`);
  }

  // Transform to Track type (basic fields)
  return {
    id: data.id,
    masterProjectId: data.master_project_id,
    parentTrackId: data.parent_track_id,
    name: data.name,
    description: data.description,
    color: data.color,
    orderingIndex: data.ordering_index,
    category: data.category || 'main',
    includeInRoadmap: data.include_in_roadmap !== false,
    status: data.status || 'active',
    templateId: data.template_id,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all deleted tracks for a project (for Recycle Bin)
 */
export async function getDeletedTracks(masterProjectId: string): Promise<DeletedTrack[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch deleted tracks: ${error.message}`);
  }

  const now = new Date();
  return (data || []).map((dbTrack: any) => {
    const deletedAt = new Date(dbTrack.deleted_at);
    const daysSinceDeleted = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 7 - daysSinceDeleted);

    return {
      id: dbTrack.id,
      masterProjectId: dbTrack.master_project_id,
      parentTrackId: dbTrack.parent_track_id,
      name: dbTrack.name,
      description: dbTrack.description,
      color: dbTrack.color,
      deletedAt: dbTrack.deleted_at,
      daysRemaining,
    };
  });
}
