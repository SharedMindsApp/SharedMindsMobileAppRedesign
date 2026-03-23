/**
 * Stage 1: Signal Computation Logic
 *
 * This module contains the actual algorithms for computing behavioral signals.
 *
 * CRITICAL RULES:
 * - All outputs must be neutral (no judgmental language)
 * - Full provenance tracking (event IDs + hash)
 * - Confidence scores must reflect data quality
 * - NO streaks, completion rates, or productivity scores
 * - NO actions, notifications, or UI updates
 *
 * Each compute function:
 * 1. Takes behavioral events as input
 * 2. Returns neutral signal value
 * 3. Provides provenance (which events contributed)
 * 4. Calculates confidence based on data quality
 */

import type {
  BehavioralEvent,
  SignalComputeContext,
  SessionBoundariesValue,
  TimeBinsActivityCountValue,
  ActivityIntervalsValue,
  CaptureCoverageValue,
  SignalValue,
} from './types';
import { getSignalDefinition } from './registry';

export interface ComputeOutput<T = SignalValue> {
  value: T;
  provenance_event_ids: string[];
  provenance_hash: string;
  confidence: number;
}

export async function computeSignal(
  context: SignalComputeContext,
  events: BehavioralEvent[]
): Promise<ComputeOutput> {
  const definition = getSignalDefinition(context.signalKey);

  if (events.length < definition.minimumEvents) {
    throw new Error(
      `Insufficient events for signal ${context.signalKey}: got ${events.length}, need ${definition.minimumEvents}`
    );
  }

  switch (context.signalKey) {
    case 'session_boundaries':
      return computeSessionBoundaries(events, context.parameters);
    case 'time_bins_activity_count':
      return computeTimeBinsActivityCount(events, context.parameters);
    case 'activity_intervals':
      return computeActivityIntervals(events, context.parameters);
    case 'capture_coverage':
      return computeCaptureCoverage(events, context);
    default:
      throw new Error(`Unknown signal key: ${context.signalKey}`);
  }
}

function computeSessionBoundaries(
  events: BehavioralEvent[],
  parameters: Record<string, unknown>
): ComputeOutput<SessionBoundariesValue> {
  const inactivityGapMinutes = (parameters.inactivity_gap_minutes as number) ?? 30;
  const preferExplicit = (parameters.prefer_explicit as boolean) ?? true;

  const sessions: SessionBoundariesValue['sessions'] = [];
  const provenanceIds: string[] = [];

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  if (preferExplicit) {
    const explicitSessions = extractExplicitSessions(sortedEvents);
    sessions.push(...explicitSessions.sessions);
    provenanceIds.push(...explicitSessions.provenanceIds);
  }

  if (sessions.length === 0) {
    const gapSessions = inferSessionsFromGaps(sortedEvents, inactivityGapMinutes);
    sessions.push(...gapSessions.sessions);
    provenanceIds.push(...gapSessions.provenanceIds);
  }

  const confidence = calculateSessionConfidence(sessions, sortedEvents.length);

  return {
    value: { sessions },
    provenance_event_ids: provenanceIds,
    provenance_hash: computeProvenanceHash(provenanceIds, sortedEvents),
    confidence,
  };
}

function extractExplicitSessions(events: BehavioralEvent[]) {
  const sessions: SessionBoundariesValue['sessions'] = [];
  const provenanceIds: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (
      event.event_type === 'session_start' ||
      event.event_type === 'activity_started'
    ) {
      const endEvent = events
        .slice(i + 1)
        .find(
          (e) =>
            e.event_type === 'session_end' ||
            e.event_type === 'activity_completed'
        );

      if (endEvent) {
        sessions.push({
          start: event.occurred_at,
          end: endEvent.occurred_at,
          source: 'explicit',
        });
        provenanceIds.push(event.id, endEvent.id);
      }
    }
  }

  return { sessions, provenanceIds };
}

function inferSessionsFromGaps(
  events: BehavioralEvent[],
  gapMinutes: number
) {
  const sessions: SessionBoundariesValue['sessions'] = [];
  const provenanceIds: string[] = [];

  if (events.length === 0) return { sessions, provenanceIds };

  let sessionStart = events[0];
  let lastEvent = events[0];
  provenanceIds.push(events[0].id);

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    const gapMs =
      new Date(event.occurred_at).getTime() -
      new Date(lastEvent.occurred_at).getTime();
    const gapMins = gapMs / (1000 * 60);

    if (gapMins > gapMinutes) {
      sessions.push({
        start: sessionStart.occurred_at,
        end: lastEvent.occurred_at,
        source: 'gap',
        gap_minutes: Math.round(gapMins),
      });
      sessionStart = event;
    }

    lastEvent = event;
    provenanceIds.push(event.id);
  }

  sessions.push({
    start: sessionStart.occurred_at,
    end: lastEvent.occurred_at,
    source: 'gap',
  });

  return { sessions, provenanceIds };
}

function calculateSessionConfidence(
  sessions: SessionBoundariesValue['sessions'],
  totalEvents: number
): number {
  if (sessions.length === 0) return 0;

  const explicitCount = sessions.filter((s) => s.source === 'explicit').length;
  const hasExplicit = explicitCount > 0;

  const baseConfidence = hasExplicit ? 0.9 : 0.6;
  const eventFactor = Math.min(totalEvents / 20, 1);

  return Math.min(baseConfidence * eventFactor, 1);
}

function computeTimeBinsActivityCount(
  events: BehavioralEvent[],
  parameters: Record<string, unknown>
): ComputeOutput<TimeBinsActivityCountValue> {
  const binCount = (parameters.bin_count as number) ?? 24;
  const hoursPerBin = 24 / binCount;

  const bins: TimeBinsActivityCountValue['bins'] = Array.from(
    { length: binCount },
    (_, i) => ({
      bin_start_hour: i * hoursPerBin,
      bin_end_hour: (i + 1) * hoursPerBin,
      count: 0,
    })
  );

  const provenanceIds: string[] = [];

  for (const event of events) {
    const date = new Date(event.occurred_at);
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const binIndex = Math.floor(hour / hoursPerBin);

    if (binIndex >= 0 && binIndex < binCount) {
      bins[binIndex].count++;
      provenanceIds.push(event.id);
    }
  }

  const totalCount = events.length;
  const confidence = calculateTimeBinsConfidence(bins, totalCount);

  return {
    value: { bins, total_count: totalCount },
    provenance_event_ids: provenanceIds,
    provenance_hash: computeProvenanceHash(provenanceIds, events),
    confidence,
  };
}

function calculateTimeBinsConfidence(
  bins: TimeBinsActivityCountValue['bins'],
  totalEvents: number
): number {
  if (totalEvents < 10) return 0.3;
  if (totalEvents < 30) return 0.6;
  if (totalEvents < 60) return 0.8;
  return 0.95;
}

function computeActivityIntervals(
  events: BehavioralEvent[],
  parameters: Record<string, unknown>
): ComputeOutput<ActivityIntervalsValue> {
  const activityTypes = (parameters.activity_types as string[]) ?? [];
  const intervals: ActivityIntervalsValue['intervals'] = [];
  const provenanceIds: string[] = [];

  for (const event of events) {
    if (event.duration_seconds !== null && event.duration_seconds > 0) {
      if (
        activityTypes.length === 0 ||
        activityTypes.includes(event.event_type)
      ) {
        const endTime = new Date(
          new Date(event.occurred_at).getTime() +
            event.duration_seconds * 1000
        );

        intervals.push({
          activity_type: event.event_type,
          start: event.occurred_at,
          end: endTime.toISOString(),
          duration_seconds: event.duration_seconds,
        });
        provenanceIds.push(event.id);
      }
    }
  }

  const confidence = intervals.length > 0 ? 0.95 : 0;

  return {
    value: { intervals, total_intervals: intervals.length },
    provenance_event_ids: provenanceIds,
    provenance_hash: computeProvenanceHash(provenanceIds, events),
    confidence,
  };
}

function computeCaptureCoverage(
  events: BehavioralEvent[],
  context: SignalComputeContext
): ComputeOutput<CaptureCoverageValue> {
  const minimumEventsPerDay =
    (context.parameters.minimum_events_per_day as number) ?? 1;

  const startDate = context.timeRange.start;
  const endDate = context.timeRange.end;

  const dayMs = 24 * 60 * 60 * 1000;
  const daysInRange =
    Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs) || 1;

  const daysWithEvents = new Set<string>();
  const provenanceIds: string[] = [];

  let firstEventDate: string | null = null;
  let lastEventDate: string | null = null;

  for (const event of events) {
    const date = new Date(event.occurred_at);
    const dateKey = date.toISOString().split('T')[0];
    daysWithEvents.add(dateKey);
    provenanceIds.push(event.id);

    if (!firstEventDate || event.occurred_at < firstEventDate) {
      firstEventDate = event.occurred_at;
    }
    if (!lastEventDate || event.occurred_at > lastEventDate) {
      lastEventDate = event.occurred_at;
    }
  }

  const daysWithAnyEvents = daysWithEvents.size;
  const coverageRatio = daysWithAnyEvents / daysInRange;

  return {
    value: {
      days_in_range: daysInRange,
      days_with_any_events: daysWithAnyEvents,
      coverage_ratio: Math.min(coverageRatio, 1),
      first_event_date: firstEventDate,
      last_event_date: lastEventDate,
    },
    provenance_event_ids: provenanceIds,
    provenance_hash: computeProvenanceHash(provenanceIds, events),
    confidence: 1.0,
  };
}

export function computeProvenanceHash(
  eventIds: string[],
  events: BehavioralEvent[]
): string {
  const sortedIds = [...eventIds].sort();

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const relevantEvents = sortedIds
    .map((id) => eventMap.get(id))
    .filter((e): e is BehavioralEvent => e !== undefined);

  const normalized = relevantEvents.map((e) => ({
    id: e.id,
    type: e.event_type,
    time: new Date(e.occurred_at).toISOString(),
    duration: e.duration_seconds,
  }));

  const jsonString = JSON.stringify(normalized, Object.keys(normalized).sort());

  // Use simple hash function for browser compatibility (synchronous)
  // This is sufficient for provenance tracking, not security-critical
  return simpleHash(jsonString);
}

/**
 * Simple synchronous hash function for browser compatibility
 * Returns a hex string similar to SHA-256 format
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string and pad
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // For longer output, use a second pass with modified input
  let hash2 = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str.charCodeAt(i);
    hash2 = ((hash2 << 5) - hash2) + char;
    hash2 = hash2 & hash2;
  }
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  
  // Return 64-character hex string (like SHA-256)
  return (hex + hex2).repeat(4).substring(0, 64);
}
