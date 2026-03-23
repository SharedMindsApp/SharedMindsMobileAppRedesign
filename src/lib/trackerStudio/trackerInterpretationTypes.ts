/**
 * Tracker Interpretation Types
 * 
 * Types for cross-tracker analytics and interpretation layer.
 * This layer is read-only, descriptive, and context-aware.
 */

import type { Tracker, TrackerEntry } from './types';
import type { ContextEvent } from './contextEventTypes';

export interface InterpretationInput {
  trackerIds: string[]; // At least 2 trackers required
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  fieldFilters?: Record<string, string[]>; // Optional: trackerId -> fieldIds to include
  granularity?: 'day' | 'week'; // Aggregation granularity
}

export interface TrackerDataPoint {
  date: string; // ISO date string
  trackerId: string;
  trackerName: string;
  fieldId: string;
  fieldLabel: string;
  value: string | number | boolean | null;
  entryId?: string;
}

export interface TemporalAlignment {
  trackerId: string;
  trackerName: string;
  dataPoints: TrackerDataPoint[];
  hasData: boolean;
  dataCoverage: number; // 0-1, percentage of dates with data
}

export interface DirectionalShift {
  trackerId: string;
  trackerName: string;
  fieldId: string;
  fieldLabel: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'variable';
  magnitude?: 'slight' | 'moderate' | 'significant';
  description: string;
}

export interface VolatilityChange {
  trackerId: string;
  trackerName: string;
  fieldId: string;
  fieldLabel: string;
  volatility: 'low' | 'medium' | 'high';
  change?: 'increased' | 'decreased' | 'stable';
  description: string;
}

export interface ContextSegment {
  contextEvent: ContextEvent | null;
  period: 'before' | 'during' | 'after';
  startDate: string;
  endDate: string;
  dataPoints: TrackerDataPoint[];
}

export interface CrossTrackerSummary {
  timeRange: {
    start: string;
    end: string;
  };
  trackers: {
    id: string;
    name: string;
  }[];
  contextEvents: ContextEvent[];
  temporalAlignment: TemporalAlignment[];
  directionalShifts: DirectionalShift[];
  volatilityChanges: VolatilityChange[];
  missingData: {
    trackerId: string;
    trackerName: string;
    missingDates: string[];
  }[];
  insights: Insight[];
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  timeRange: {
    start: string;
    end: string;
  };
  contextLabels: string[]; // Context event labels that apply
  relatedTrackers: string[]; // Tracker IDs mentioned in this insight
  type: 'temporal_alignment' | 'directional_shift' | 'volatility' | 'context_comparison' | 'missing_data';
}

export interface ContextAwareComparison {
  contextEvent: ContextEvent;
  beforeSegment: ContextSegment;
  duringSegment: ContextSegment;
  afterSegment: ContextSegment | null; // null if context is ongoing
  insights: Insight[];
}

export interface BeforeDuringAfterContext {
  contextType: string; // e.g., 'illness', 'recovery'
  dateRange: {
    start: string;
    end: string;
  };
  segments: ContextSegment[];
  insights: Insight[];
}
