/**
 * Tracker Engagement Analytics
 * 
 * Calculates meaningful insights about tracker usage to encourage engagement.
 */

import type { Tracker, TrackerEntry } from './types';
import { listEntriesByDateRange } from './trackerEntryService';

export interface TrackerEngagement {
  trackerId: string;
  trackerName: string;
  daysSinceLastEntry: number | null;
  entriesLast7Days: number;
  entriesLast30Days: number;
  consistencyScore: number; // 0-1, based on how regularly entries are made
  needsAttention: boolean;
  engagementLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface DashboardInsights {
  trackersNeedingAttention: Array<{
    tracker: Tracker;
    daysSinceLastEntry: number;
    message: string;
  }>;
  mostActiveTracker: {
    tracker: Tracker;
    entriesLast7Days: number;
    message: string;
  } | null;
  consistentTrackers: Array<{
    tracker: Tracker;
    consistencyScore: number;
    message: string;
  }>;
  totalEntriesToday: number;
  totalEntriesThisWeek: number;
  engagementMessage: string;
}

/**
 * Calculate engagement metrics for a tracker
 */
export async function calculateTrackerEngagement(
  tracker: Tracker,
  entries: TrackerEntry[]
): Promise<TrackerEngagement> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find most recent entry
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );
  const lastEntry = sortedEntries[0];
  
  let daysSinceLastEntry: number | null = null;
  if (lastEntry) {
    const lastEntryDate = new Date(lastEntry.entry_date);
    const diffTime = now.getTime() - lastEntryDate.getTime();
    daysSinceLastEntry = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Count entries in time periods
  const entriesLast7Days = entries.filter(e => {
    const entryDate = new Date(e.entry_date);
    return entryDate >= sevenDaysAgo;
  }).length;

  const entriesLast30Days = entries.filter(e => {
    const entryDate = new Date(e.entry_date);
    return entryDate >= thirtyDaysAgo;
  }).length;

  // Calculate consistency score
  // For daily trackers, ideal is 7 entries in 7 days
  // For session/event trackers, we look at frequency
  let consistencyScore = 0;
  if (tracker.entry_granularity === 'daily') {
    const expectedEntries = 7;
    consistencyScore = Math.min(entriesLast7Days / expectedEntries, 1);
  } else {
    // For other granularities, use a frequency-based approach
    const daysSinceCreated = Math.max(1, Math.floor((now.getTime() - new Date(tracker.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    const expectedFrequency = daysSinceCreated / Math.max(entries.length, 1);
    const recentFrequency = entriesLast7Days / 7;
    consistencyScore = Math.min(recentFrequency / expectedFrequency, 1);
  }

  // Determine if tracker needs attention
  const needsAttention = 
    (daysSinceLastEntry !== null && daysSinceLastEntry > 2) ||
    (entriesLast7Days === 0 && entries.length > 0);

  // Determine engagement level
  let engagementLevel: 'high' | 'medium' | 'low' | 'none';
  if (entriesLast7Days >= 5) {
    engagementLevel = 'high';
  } else if (entriesLast7Days >= 2) {
    engagementLevel = 'medium';
  } else if (entriesLast7Days >= 1 || entries.length > 0) {
    engagementLevel = 'low';
  } else {
    engagementLevel = 'none';
  }

  return {
    trackerId: tracker.id,
    trackerName: tracker.name,
    daysSinceLastEntry,
    entriesLast7Days,
    entriesLast30Days,
    consistencyScore,
    needsAttention,
    engagementLevel,
  };
}

/**
 * Calculate dashboard insights for all trackers
 */
export async function calculateDashboardInsights(
  trackers: Tracker[]
): Promise<DashboardInsights> {
  if (trackers.length === 0) {
    return {
      trackersNeedingAttention: [],
      mostActiveTracker: null,
      consistentTrackers: [],
      totalEntriesToday: 0,
      totalEntriesThisWeek: 0,
      engagementMessage: 'Create your first tracker to start tracking.',
    };
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // Load entries for all trackers in parallel for much faster performance
  const trackerEngagements: TrackerEngagement[] = [];
  let totalEntriesToday = 0;
  let totalEntriesThisWeek = 0;

  // Load all entries in parallel instead of sequentially (much faster!)
  const entryPromises = trackers.map(async (tracker) => {
    try {
      const entries = await listEntriesByDateRange({
        tracker_id: tracker.id,
        start_date: sevenDaysAgoStr,
        end_date: today,
      });
      return { tracker, entries };
    } catch (err) {
      console.error(`Failed to load entries for tracker ${tracker.id}:`, err);
      return { tracker, entries: [] };
    }
  });

  const trackerEntriesResults = await Promise.all(entryPromises);

  // Process all trackers (engagement calculation is synchronous, so no need for Promise.all here)
  for (const { tracker, entries } of trackerEntriesResults) {
    const engagement = await calculateTrackerEngagement(tracker, entries);
    trackerEngagements.push(engagement);
    
    // Count today's entries
    const todayEntries = entries.filter(e => e.entry_date === today);
    totalEntriesToday += todayEntries.length;
    totalEntriesThisWeek += entries.length;
  }

  // Find trackers needing attention
  const trackersNeedingAttention = trackerEngagements
    .filter(e => e.needsAttention)
    .sort((a, b) => (b.daysSinceLastEntry || 0) - (a.daysSinceLastEntry || 0))
    .slice(0, 3)
    .map(e => {
      const tracker = trackers.find(t => t.id === e.trackerId)!;
      let message = '';
      if (e.daysSinceLastEntry === null) {
        message = 'No entries yet';
      } else if (e.daysSinceLastEntry === 0) {
        message = 'Logged today';
      } else if (e.daysSinceLastEntry === 1) {
        message = 'Last logged yesterday';
      } else {
        message = `Last logged ${e.daysSinceLastEntry} days ago`;
      }
      return {
        tracker,
        daysSinceLastEntry: e.daysSinceLastEntry || 0,
        message,
      };
    });

  // Find most active tracker
  const mostActive = trackerEngagements
    .filter(e => e.entriesLast7Days > 0)
    .sort((a, b) => b.entriesLast7Days - a.entriesLast7Days)[0];
  
  const mostActiveTracker = mostActive ? {
    tracker: trackers.find(t => t.id === mostActive.trackerId)!,
    entriesLast7Days: mostActive.entriesLast7Days,
    message: `${mostActive.entriesLast7Days} ${mostActive.entriesLast7Days === 1 ? 'entry' : 'entries'} this week`,
  } : null;

  // Find consistent trackers
  const consistentTrackers = trackerEngagements
    .filter(e => e.consistencyScore >= 0.7 && e.entriesLast7Days > 0)
    .sort((a, b) => b.consistencyScore - a.consistencyScore)
    .slice(0, 3)
    .map(e => {
      const tracker = trackers.find(t => t.id === e.trackerId)!;
      const percentage = Math.round(e.consistencyScore * 100);
      return {
        tracker,
        consistencyScore: e.consistencyScore,
        message: `${percentage}% consistent this week`,
      };
    });

  // Generate engagement message
  let engagementMessage = '';
  if (totalEntriesToday > 0) {
    engagementMessage = `You've logged ${totalEntriesToday} ${totalEntriesToday === 1 ? 'entry' : 'entries'} today.`;
  } else if (totalEntriesThisWeek > 0) {
    engagementMessage = `${totalEntriesThisWeek} ${totalEntriesThisWeek === 1 ? 'entry' : 'entries'} this week.`;
  } else if (trackers.length > 0) {
    engagementMessage = 'Ready to start tracking? Log your first entry.';
  } else {
    engagementMessage = 'Create your first tracker to start tracking.';
  }

  return {
    trackersNeedingAttention,
    mostActiveTracker,
    consistentTrackers,
    totalEntriesToday,
    totalEntriesThisWeek,
    engagementMessage,
  };
}
