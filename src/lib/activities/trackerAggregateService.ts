/**
 * Tracker Aggregate Service
 * 
 * Provides aggregate progress information for shared trackers (habits, tasks, goals)
 * owned by households or teams.
 */

import { supabase } from '../supabase';
import { getHabitCheckinsForRange } from '../habits/habitsService';
import { getTrackerParticipants } from './trackerParticipationService';

export interface ParticipantProgress {
  userId: string;
  profileId: string;
  name: string;
  completedToday: boolean;
  completedCount: number;
}

export interface AggregateProgress {
  totalParticipants: number;
  completedToday: number;
  completedThisWeek: number;
  participantProgress: ParticipantProgress[];
}

/**
 * Get aggregate progress for a habit
 */
export async function getHabitAggregateProgress(
  activityId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<AggregateProgress> {
  // Get all participants
  const participants = await getTrackerParticipants(activityId);
  
  if (participants.length === 0) {
    return {
      totalParticipants: 0,
      completedToday: 0,
      completedThisWeek: 0,
      participantProgress: [],
    };
  }

  // Calculate week range (Monday to Sunday)
  const dateObj = new Date(date);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dateObj.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  // Get profiles for participants
  const userIds = participants.map(p => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  );

  // Get check-ins for all participants for today and this week
  const participantProgress: ParticipantProgress[] = [];
  let completedToday = 0;
  let completedThisWeek = 0;

  for (const participant of participants) {
    const profile = profileMap.get(participant.user_id);
    if (!profile) continue;

    try {
      // Get check-ins for this participant
      const checkins = await getHabitCheckinsForRange(
        participant.user_id,
        activityId,
        weekStart,
        weekEnd
      );

      const completedTodayCheckin = checkins.find(
        c => c.local_date === date && c.status === 'done'
      );
      const completedWeekCheckins = checkins.filter(c => c.status === 'done');

      if (completedTodayCheckin) {
        completedToday++;
      }
      completedThisWeek += completedWeekCheckins.length;

      participantProgress.push({
        userId: participant.user_id,
        profileId: profile.id,
        name: profile.full_name || 'User',
        completedToday: !!completedTodayCheckin,
        completedCount: completedWeekCheckins.length,
      });
    } catch (error) {
      // Skip participants we can't access (RLS restrictions)
      console.debug('[trackerAggregateService] Skipping participant due to access restriction:', participant.user_id);
    }
  }

  return {
    totalParticipants: participants.length,
    completedToday,
    completedThisWeek,
    participantProgress,
  };
}
