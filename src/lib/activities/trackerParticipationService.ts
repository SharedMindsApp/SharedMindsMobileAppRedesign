/**
 * Tracker Participation Service
 * 
 * Handles opt-in participation in shared trackers (habits, tasks, goals)
 * owned by households or teams.
 */

import { supabase } from '../supabase';
import type { TrackerParticipant, ParticipationMode, TrackerVisibility, ParticipantRole } from './activityTypes';

export interface JoinTrackerInput {
  activityId: string;
  userId: string;
  participationMode?: ParticipationMode;
  role?: ParticipantRole;
  visibility?: Partial<TrackerVisibility>;
}

export interface UpdateParticipationInput {
  participationMode?: ParticipationMode;
  visibility?: Partial<TrackerVisibility>;
}

/**
 * Join a tracker (opt-in participation)
 */
export async function joinTracker(input: JoinTrackerInput): Promise<TrackerParticipant> {
  const { data, error } = await supabase
    .from('tracker_participants')
    .insert({
      activity_id: input.activityId,
      user_id: input.userId,
      participation_mode: input.participationMode || 'individual',
      role: input.role || 'participant',
      visibility: {
        show_daily_status: input.visibility?.show_daily_status ?? true,
        show_streaks: input.visibility?.show_streaks ?? false,
        show_totals: input.visibility?.show_totals ?? true,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[trackerParticipationService] Error joining tracker:', error);
    throw error;
  }

  return data;
}

/**
 * Leave a tracker (opt-out)
 */
export async function leaveTracker(activityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_participants')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId);

  if (error) {
    console.error('[trackerParticipationService] Error leaving tracker:', error);
    throw error;
  }
}

/**
 * Update participation settings
 */
export async function updateParticipation(
  activityId: string,
  userId: string,
  input: UpdateParticipationInput
): Promise<TrackerParticipant> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.participationMode !== undefined) {
    updates.participation_mode = input.participationMode;
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.visibility !== undefined) {
    // Merge with existing visibility
    const { data: existing } = await supabase
      .from('tracker_participants')
      .select('visibility')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .single();

    updates.visibility = {
      ...(existing?.visibility || {}),
      ...input.visibility,
    };
  }

  const { data, error } = await supabase
    .from('tracker_participants')
    .update(updates)
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[trackerParticipationService] Error updating participation:', error);
    throw error;
  }

  return data;
}

/**
 * Get participants for an activity
 */
export async function getTrackerParticipants(activityId: string): Promise<TrackerParticipant[]> {
  const { data, error } = await supabase
    .from('tracker_participants')
    .select('*')
    .eq('activity_id', activityId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[trackerParticipationService] Error fetching participants:', error);
    throw error;
  }

  return data || [];
}

/**
 * Check if user is participating in an activity
 */
export async function isUserParticipating(
  activityId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('tracker_participants')
    .select('id')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[trackerParticipationService] Error checking participation:', error);
    return false;
  }

  return data !== null;
}

/**
 * Get user's participation in an activity
 */
export async function getUserParticipation(
  activityId: string,
  userId: string
): Promise<TrackerParticipant | null> {
  const { data, error } = await supabase
    .from('tracker_participants')
    .select('*')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[trackerParticipationService] Error fetching user participation:', error);
    return null;
  }

  return data;
}
