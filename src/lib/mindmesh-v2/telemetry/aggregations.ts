/**
 * Mind Mesh V2 Telemetry Aggregations
 *
 * Provides basic aggregation functions for Regulation Hub.
 *
 * CRITICAL CONTRACT:
 * - Aggregations are DESCRIPTIVE ONLY
 * - NO scoring, NO judgments, NO recommendations
 * - NO messiness metrics, NO diagnoses
 * - NO cross-user comparison
 * - Shows WHAT happened, not WHY or whether it's good/bad
 *
 * Prime Rule: Describe patterns, never evaluate them.
 */

import { supabase } from '../../supabase';
import type {
  TelemetryEventRow,
  TelemetryEventType,
  DailyActivitySummary,
  WeeklyPatternSummary,
} from './types';

// ============================================================================
// DAILY ACTIVITY SUMMARY
// ============================================================================

/**
 * Gets daily activity summary for a user in a workspace.
 * Descriptive metrics only - shows what happened.
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @param date - Date (YYYY-MM-DD format)
 * @returns Daily activity summary
 */
export async function getDailyActivitySummary(
  workspaceId: string,
  userId: string,
  date: string
): Promise<DailyActivitySummary | null> {
  // Parse date range (full day in UTC)
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  // Fetch all events for the day
  const { data: events, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .gte('timestamp', startOfDay)
    .lte('timestamp', endOfDay)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Failed to fetch daily telemetry:', error);
    return null;
  }

  if (!events || events.length === 0) {
    // No activity for this day
    return {
      workspaceId,
      userId,
      date,
      eventCounts: {} as Record<TelemetryEventType, number>,
      containersActivated: 0,
      nodesCreated: 0,
      sessionMinutes: 0,
      totalEvents: 0,
    };
  }

  // Count events by type
  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
  }

  // Count containers activated
  const containersActivated = eventCounts['ContainerActivated'] || 0;

  // Count nodes created
  const nodesCreated = eventCounts['NodeCreated'] || 0;

  // Estimate session duration
  const sessionMinutes = estimateSessionDuration(events as TelemetryEventRow[]);

  return {
    workspaceId,
    userId,
    date,
    eventCounts: eventCounts as Record<TelemetryEventType, number>,
    containersActivated,
    nodesCreated,
    sessionMinutes,
    totalEvents: events.length,
  };
}

// ============================================================================
// WEEKLY PATTERN SUMMARY
// ============================================================================

/**
 * Gets weekly pattern summary for a user in a workspace.
 * Descriptive metrics only - shows distribution and patterns.
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @param weekStart - Week start date (YYYY-MM-DD format)
 * @param weekEnd - Week end date (YYYY-MM-DD format)
 * @returns Weekly pattern summary
 */
export async function getWeeklyPatternSummary(
  workspaceId: string,
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyPatternSummary | null> {
  // Fetch all events for the week
  const { data: events, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .gte('timestamp', `${weekStart}T00:00:00.000Z`)
    .lte('timestamp', `${weekEnd}T23:59:59.999Z`)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Failed to fetch weekly telemetry:', error);
    return null;
  }

  if (!events || events.length === 0) {
    // No activity for this week
    return {
      workspaceId,
      userId,
      weekStart,
      weekEnd,
      dailyCounts: [],
      creationBursts: [],
      layoutBreaks: 0,
      totalSessionMinutes: 0,
      mostActiveDay: weekStart,
    };
  }

  // Calculate daily counts
  const dailyCounts = calculateDailyCounts(events as TelemetryEventRow[], weekStart, weekEnd);

  // Detect creation bursts (5+ creation events within 5 minutes)
  const creationBursts = detectCreationBursts(events as TelemetryEventRow[]);

  // Count layout breaks
  const layoutBreaks = events.filter((e) => e.event_type === 'DefaultLayoutBroken').length;

  // Estimate total session minutes
  const totalSessionMinutes = estimateSessionDuration(events as TelemetryEventRow[]);

  // Find most active day
  const mostActiveDay = findMostActiveDay(dailyCounts);

  return {
    workspaceId,
    userId,
    weekStart,
    weekEnd,
    dailyCounts,
    creationBursts,
    layoutBreaks,
    totalSessionMinutes,
    mostActiveDay,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimates session duration based on workspace open/close and lock events.
 * Descriptive metric: shows engagement duration.
 *
 * @param events - Telemetry events
 * @returns Estimated minutes
 */
function estimateSessionDuration(events: TelemetryEventRow[]): number {
  // Look for workspace open/close pairs
  const openEvents = events.filter((e) => e.event_type === 'WorkspaceOpened');
  const closeEvents = events.filter((e) => e.event_type === 'WorkspaceClosed');

  let totalMinutes = 0;

  // Match open/close pairs
  for (const openEvent of openEvents) {
    // Find next close event
    const closeEvent = closeEvents.find((e) =>
      new Date(e.timestamp) > new Date(openEvent.timestamp)
    );

    if (closeEvent) {
      // Calculate duration
      const openTime = new Date(openEvent.timestamp).getTime();
      const closeTime = new Date(closeEvent.timestamp).getTime();
      const durationMs = closeTime - openTime;
      totalMinutes += durationMs / (1000 * 60);
    }
  }

  // If no close events, estimate from lock events
  if (totalMinutes === 0) {
    const lockAcquired = events.filter((e) => e.event_type === 'CanvasLockAcquired');
    const lockReleased = events.filter((e) => e.event_type === 'CanvasLockReleased');

    for (const acquireEvent of lockAcquired) {
      const releaseEvent = lockReleased.find((e) =>
        new Date(e.timestamp) > new Date(acquireEvent.timestamp)
      );

      if (releaseEvent) {
        const acquireTime = new Date(acquireEvent.timestamp).getTime();
        const releaseTime = new Date(releaseEvent.timestamp).getTime();
        const durationMs = releaseTime - acquireTime;
        totalMinutes += durationMs / (1000 * 60);
      }
    }
  }

  // If still no duration, estimate from first/last event
  if (totalMinutes === 0 && events.length > 1) {
    const firstTime = new Date(events[0].timestamp).getTime();
    const lastTime = new Date(events[events.length - 1].timestamp).getTime();
    const durationMs = lastTime - firstTime;
    totalMinutes = durationMs / (1000 * 60);
  }

  // Cap at reasonable max (12 hours)
  return Math.min(totalMinutes, 720);
}

/**
 * Calculates daily event counts across date range.
 * Descriptive metric: shows activity distribution.
 *
 * @param events - Telemetry events
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Daily counts
 */
function calculateDailyCounts(
  events: TelemetryEventRow[],
  startDate: string,
  endDate: string
): Array<{ date: string; eventCount: number }> {
  const dailyCounts: Record<string, number> = {};

  // Initialize all days in range with 0
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }

  // Count events per day
  for (const event of events) {
    const dateStr = event.timestamp.split('T')[0];
    if (dailyCounts[dateStr] !== undefined) {
      dailyCounts[dateStr]++;
    }
  }

  // Convert to array
  return Object.entries(dailyCounts).map(([date, eventCount]) => ({
    date,
    eventCount,
  }));
}

/**
 * Detects creation bursts (rapid sequences of creation events).
 * Descriptive metric: identifies periods of rapid creation.
 * Burst = 5+ creation events within 5 minutes.
 *
 * @param events - Telemetry events
 * @returns Creation bursts
 */
function detectCreationBursts(
  events: TelemetryEventRow[]
): Array<{ timestamp: string; eventCount: number }> {
  const creationEvents = events.filter(
    (e) =>
      e.event_type === 'ContainerCreated' ||
      e.event_type === 'NodeCreated' ||
      e.event_type === 'ContainerActivated'
  );

  if (creationEvents.length < 5) {
    // Not enough events for burst
    return [];
  }

  const bursts: Array<{ timestamp: string; eventCount: number }> = [];
  const burstWindowMs = 5 * 60 * 1000; // 5 minutes
  const burstThreshold = 5; // 5+ events

  for (let i = 0; i < creationEvents.length; i++) {
    const windowStart = new Date(creationEvents[i].timestamp).getTime();
    const windowEnd = windowStart + burstWindowMs;

    // Count events in window
    let countInWindow = 0;
    for (let j = i; j < creationEvents.length; j++) {
      const eventTime = new Date(creationEvents[j].timestamp).getTime();
      if (eventTime >= windowStart && eventTime <= windowEnd) {
        countInWindow++;
      } else if (eventTime > windowEnd) {
        break;
      }
    }

    // If burst detected, record it
    if (countInWindow >= burstThreshold) {
      bursts.push({
        timestamp: creationEvents[i].timestamp,
        eventCount: countInWindow,
      });

      // Skip ahead to avoid overlapping bursts
      i += countInWindow - 1;
    }
  }

  return bursts;
}

/**
 * Finds most active day from daily counts.
 * Descriptive metric: shows usage pattern.
 *
 * @param dailyCounts - Daily counts
 * @returns Most active day (date string)
 */
function findMostActiveDay(
  dailyCounts: Array<{ date: string; eventCount: number }>
): string {
  if (dailyCounts.length === 0) {
    return new Date().toISOString().split('T')[0];
  }

  let maxCount = 0;
  let maxDate = dailyCounts[0].date;

  for (const { date, eventCount } of dailyCounts) {
    if (eventCount > maxCount) {
      maxCount = eventCount;
      maxDate = date;
    }
  }

  return maxDate;
}

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Gets event count by type for date range.
 * Descriptive metric: shows event distribution.
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Event counts by type
 */
export async function getEventCountsByType(
  workspaceId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<TelemetryEventType, number> | null> {
  const { data: events, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('event_type')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .gte('timestamp', `${startDate}T00:00:00.000Z`)
    .lte('timestamp', `${endDate}T23:59:59.999Z`);

  if (error) {
    console.error('Failed to fetch event counts:', error);
    return null;
  }

  // Count by type
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
  }

  return counts as Record<TelemetryEventType, number>;
}

/**
 * Gets total event count for date range.
 * Descriptive metric: shows activity level.
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Total event count
 */
export async function getTotalEventCount(
  workspaceId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { count, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .gte('timestamp', `${startDate}T00:00:00.000Z`)
    .lte('timestamp', `${endDate}T23:59:59.999Z`);

  if (error) {
    console.error('Failed to fetch total event count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Gets first and last event timestamps.
 * Descriptive metric: shows usage timespan.
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns First and last timestamps
 */
export async function getUsageTimespan(
  workspaceId: string,
  userId: string
): Promise<{ firstEvent: string | null; lastEvent: string | null }> {
  const { data: first } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('timestamp')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: last } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('timestamp')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    firstEvent: first?.timestamp || null,
    lastEvent: last?.timestamp || null,
  };
}
