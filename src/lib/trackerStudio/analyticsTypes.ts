/**
 * Tracker Studio Analytics Types
 * 
 * Type definitions for analytics and visualization data structures.
 */

import type { TrackerEntry, TrackerFieldSchema, TrackerEntryGranularity } from './types';
import type { ContextEvent } from './contextEventTypes';

/**
 * Time series data point for line charts
 */
export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number | null;
  entryId?: string;
  notes?: string;
}

/**
 * Calendar heatmap data point
 */
export interface CalendarHeatmapDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number | boolean | null;
  count?: number;
  entryId?: string;
}

/**
 * Aggregated statistics for a field over a date range
 */
export interface AggregatedStats {
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  count: number; // Number of entries with non-null values
  totalEntries: number; // Total entries in date range
  dateRange: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
}

/**
 * Distribution data point for histograms
 */
export interface DistributionDataPoint {
  value: number;
  count: number;
  percentage: number; // Percentage of total entries
}

/**
 * Entry frequency data point
 */
export interface EntryFrequencyDataPoint {
  date: string; // ISO date string
  count: number; // Number of entries on this date
  hasEntry: boolean;
}

/**
 * Before/during/after context event comparison data
 */
export interface BeforeDuringAfterData {
  before: AggregatedStats;
  during: AggregatedStats;
  after: AggregatedStats;
  contextEvent: {
    id: string;
    label: string;
    type: string;
    startDate: string;
    endDate: string;
  };
}

/**
 * Date range preset options
 */
export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

/**
 * Date range definition
 */
export interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

/**
 * Chart configuration options
 */
export interface ChartConfig {
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  colorScheme?: 'blue' | 'purple' | 'green' | 'amber' | 'gray';
}

/**
 * Multi-field chart data point
 */
export interface MultiFieldDataPoint {
  date: string; // ISO date string
  fields: Record<string, number | null>; // {fieldId: value}
}

/**
 * Analytics processing options
 */
export interface AnalyticsOptions {
  dateRange: DateRange;
  fieldIds?: string[]; // If not provided, processes all numeric/rating fields
  includeNullValues?: boolean; // Default: false
  aggregationMethod?: 'average' | 'sum' | 'count' | 'median';
}

/**
 * Emotion word frequency data point
 */
export interface EmotionWordDataPoint {
  word: string;
  count: number;
  percentage: number; // Percentage of entries that include this word
  moodLevels: number[]; // Mood levels (1-5) where this word appeared
}

/**
 * Emotion words analytics summary
 */
export interface EmotionWordsAnalytics {
  totalEntries: number;
  entriesWithEmotions: number;
  topEmotions: EmotionWordDataPoint[]; // Sorted by frequency, top 10-15
  emotionsByMoodLevel: Record<number, EmotionWordDataPoint[]>; // Grouped by mood level
  dateRange: DateRange;
}
