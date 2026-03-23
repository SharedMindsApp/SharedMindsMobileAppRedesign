/**
 * Tracker Studio Analytics Service
 * 
 * Data processing functions for analytics and visualizations.
 * All processing happens client-side from raw tracker entries.
 */

import { parseISO, isValid } from 'date-fns';
import type {
  TrackerEntry,
  TrackerFieldSchema,
  TrackerFieldType,
  TrackerEntryGranularity,
} from './types';
import type { ContextEvent } from './contextEventTypes';
import type {
  TimeSeriesDataPoint,
  CalendarHeatmapDataPoint,
  AggregatedStats,
  DistributionDataPoint,
  EntryFrequencyDataPoint,
  BeforeDuringAfterData,
  DateRange,
  MultiFieldDataPoint,
  EmotionWordsAnalytics,
  EmotionWordDataPoint,
} from './analyticsTypes';
import { isDateInRange } from './analyticsUtils';

/**
 * Extract numeric value from field value
 */
function extractNumericValue(
  value: string | number | boolean | null,
  fieldType: TrackerFieldType
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (fieldType === 'number') {
    return typeof value === 'number' ? value : parseFloat(String(value));
  }

  if (fieldType === 'rating') {
    return typeof value === 'number' ? value : parseFloat(String(value));
  }

  if (fieldType === 'boolean') {
    return value === true ? 1 : value === false ? 0 : null;
  }

  return null;
}

/**
 * Check if field type is numeric (can be used in charts)
 */
function isNumericFieldType(fieldType: TrackerFieldType): boolean {
  return fieldType === 'number' || fieldType === 'rating' || fieldType === 'boolean';
}

/**
 * Process time series data for a single field
 */
export function processTimeSeriesData(
  entries: TrackerEntry[],
  fieldId: string,
  dateRange: DateRange,
  fieldSchema?: TrackerFieldSchema
): TimeSeriesDataPoint[] {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Get field type from schema if provided
  const fieldType = fieldSchema?.type || 'number';

  // If field type is not numeric, return empty array
  if (!isNumericFieldType(fieldType)) {
    return [];
  }

  // Create a map of date -> entry for easy lookup
  const dateMap = new Map<string, TrackerEntry>();
  filteredEntries.forEach(entry => {
    const existing = dateMap.get(entry.entry_date);
    // Keep the most recent entry for each date
    if (!existing || new Date(entry.updated_at) > new Date(existing.updated_at)) {
      dateMap.set(entry.entry_date, entry);
    }
  });

  // Convert to data points
  const dataPoints: TimeSeriesDataPoint[] = [];
  dateMap.forEach((entry, date) => {
    const value = extractNumericValue(entry.field_values[fieldId], fieldType);
    dataPoints.push({
      date,
      value,
      entryId: entry.id,
      notes: entry.notes || undefined,
    });
  });

  // Sort by date
  dataPoints.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    if (!isValid(dateA) || !isValid(dateB)) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return dataPoints;
}

/**
 * Calculate aggregated statistics for a field
 */
export function calculateAggregatedStats(
  entries: TrackerEntry[],
  fieldId: string,
  dateRange: DateRange,
  fieldSchema?: TrackerFieldSchema
): AggregatedStats {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Get field type from schema if provided
  const fieldType = fieldSchema?.type || 'number';

  // If field type is not numeric, return empty stats
  if (!isNumericFieldType(fieldType)) {
    return {
      average: null,
      median: null,
      min: null,
      max: null,
      count: 0,
      totalEntries: filteredEntries.length,
      dateRange,
    };
  }

  // Extract numeric values (one per date, most recent entry wins)
  const dateMap = new Map<string, number | null>();
  filteredEntries.forEach(entry => {
    const existing = dateMap.get(entry.entry_date);
    if (!existing) {
      const value = extractNumericValue(entry.field_values[fieldId], fieldType);
      dateMap.set(entry.entry_date, value);
    }
  });

  const values = Array.from(dateMap.values()).filter(
    (v): v is number => v !== null && !isNaN(v)
  );

  if (values.length === 0) {
    return {
      average: null,
      median: null,
      min: null,
      max: null,
      count: 0,
      totalEntries: filteredEntries.length,
      dateRange,
    };
  }

  // Calculate statistics
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    average: Math.round(average * 100) / 100, // Round to 2 decimal places
    median: Math.round(median * 100) / 100,
    min,
    max,
    count: values.length,
    totalEntries: filteredEntries.length,
    dateRange,
  };
}

/**
 * Process calendar heatmap data
 */
export function processCalendarHeatmapData(
  entries: TrackerEntry[],
  fieldId: string,
  months: number = 6,
  fieldSchema?: TrackerFieldSchema
): CalendarHeatmapDataPoint[] {
  // Calculate date range (last N months)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const dateRange: DateRange = {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };

  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Get field type from schema if provided
  const fieldType = fieldSchema?.type || 'number';

  // Create a map of date -> entry (most recent wins)
  const dateMap = new Map<string, TrackerEntry>();
  filteredEntries.forEach(entry => {
    const existing = dateMap.get(entry.entry_date);
    if (!existing || new Date(entry.updated_at) > new Date(existing.updated_at)) {
      dateMap.set(entry.entry_date, entry);
    }
  });

  // Convert to data points
  const dataPoints: CalendarHeatmapDataPoint[] = [];
  dateMap.forEach((entry, date) => {
    const rawValue = entry.field_values[fieldId];
    let value: number | boolean | null = null;

    if (fieldType === 'boolean') {
      value = rawValue === true || rawValue === 'true';
    } else if (fieldType === 'number' || fieldType === 'rating') {
      value = extractNumericValue(rawValue, fieldType);
    }

    dataPoints.push({
      date,
      value,
      count: 1,
      entryId: entry.id,
    });
  });

  return dataPoints;
}

/**
 * Process distribution data for histograms
 */
export function processDistributionData(
  entries: TrackerEntry[],
  fieldId: string,
  dateRange: DateRange,
  fieldSchema?: TrackerFieldSchema
): DistributionDataPoint[] {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Get field type from schema if provided
  const fieldType = fieldSchema?.type || 'number';

  // If field type is not numeric, return empty array
  if (!isNumericFieldType(fieldType)) {
    return [];
  }

  // Extract numeric values (one per date, most recent entry wins)
  const dateMap = new Map<string, number | null>();
  filteredEntries.forEach(entry => {
    const existing = dateMap.get(entry.entry_date);
    if (!existing) {
      const value = extractNumericValue(entry.field_values[fieldId], fieldType);
      dateMap.set(entry.entry_date, value);
    }
  });

  const values = Array.from(dateMap.values()).filter(
    (v): v is number => v !== null && !isNaN(v)
  );

  if (values.length === 0) {
    return [];
  }

  // Count frequency of each value
  const frequencyMap = new Map<number, number>();
  values.forEach(value => {
    // Round to nearest integer for rating/boolean, or use binning for numbers
    const key = fieldType === 'rating' || fieldType === 'boolean'
      ? Math.round(value)
      : Math.round(value * 10) / 10; // Round to 1 decimal place
    frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
  });

  // Convert to data points
  const total = values.length;
  const dataPoints: DistributionDataPoint[] = [];
  frequencyMap.forEach((count, value) => {
    dataPoints.push({
      value,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10, // Round to 1 decimal place
    });
  });

  // Sort by value
  dataPoints.sort((a, b) => a.value - b.value);

  return dataPoints;
}

/**
 * Process entry frequency data
 */
export function processEntryFrequencyData(
  entries: TrackerEntry[],
  granularity: TrackerEntryGranularity,
  dateRange: DateRange
): EntryFrequencyDataPoint[] {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Count entries per date
  const dateCountMap = new Map<string, number>();
  filteredEntries.forEach(entry => {
    const date = entry.entry_date;
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  // Convert to data points
  const dataPoints: EntryFrequencyDataPoint[] = [];
  dateCountMap.forEach((count, date) => {
    dataPoints.push({
      date,
      count,
      hasEntry: count > 0,
    });
  });

  // Sort by date
  dataPoints.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    if (!isValid(dateA) || !isValid(dateB)) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return dataPoints;
}

/**
 * Get before/during/after context event comparison data
 */
export function getContextComparisonData(
  entries: TrackerEntry[],
  fieldId: string,
  contextEvent: ContextEvent,
  fieldSchema?: TrackerFieldSchema
): BeforeDuringAfterData {
  if (!contextEvent.end_date) {
    // Can't do comparison if event is open-ended
    throw new Error('Context event must have an end date for comparison');
  }

  // Calculate date ranges
  const eventStart = parseISO(contextEvent.start_date);
  const eventEnd = parseISO(contextEvent.end_date);

  // Before: 30 days before event start
  const beforeStart = new Date(eventStart);
  beforeStart.setDate(beforeStart.getDate() - 30);
  const beforeRange: DateRange = {
    start: beforeStart.toISOString().split('T')[0],
    end: new Date(eventStart.getTime() - 86400000).toISOString().split('T')[0], // Day before event
  };

  // During: event period
  const duringRange: DateRange = {
    start: contextEvent.start_date,
    end: contextEvent.end_date,
  };

  // After: 30 days after event end
  const afterStart = new Date(eventEnd);
  afterStart.setDate(afterStart.getDate() + 1); // Day after event
  const afterEnd = new Date(afterStart);
  afterEnd.setDate(afterEnd.getDate() + 30);
  const afterRange: DateRange = {
    start: afterStart.toISOString().split('T')[0],
    end: afterEnd.toISOString().split('T')[0],
  };

  // Calculate stats for each period
  const before = calculateAggregatedStats(entries, fieldId, beforeRange, fieldSchema);
  const during = calculateAggregatedStats(entries, fieldId, duringRange, fieldSchema);
  const after = calculateAggregatedStats(entries, fieldId, afterRange, fieldSchema);

  return {
    before,
    during,
    after,
    contextEvent: {
      id: contextEvent.id,
      label: contextEvent.label,
      type: contextEvent.type,
      startDate: contextEvent.start_date,
      endDate: contextEvent.end_date,
    },
  };
}

/**
 * Process multi-field data for comparison charts
 */
export function processMultiFieldData(
  entries: TrackerEntry[],
  fieldIds: string[],
  dateRange: DateRange,
  fieldSchemas: TrackerFieldSchema[]
): MultiFieldDataPoint[] {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Create a map of date -> entry (most recent wins)
  const dateMap = new Map<string, TrackerEntry>();
  filteredEntries.forEach(entry => {
    const existing = dateMap.get(entry.entry_date);
    if (!existing || new Date(entry.updated_at) > new Date(existing.updated_at)) {
      dateMap.set(entry.entry_date, entry);
    }
  });

  // Convert to data points
  const dataPoints: MultiFieldDataPoint[] = [];
  dateMap.forEach((entry, date) => {
    const fields: Record<string, number | null> = {};
    
    fieldIds.forEach(fieldId => {
      const fieldSchema = fieldSchemas.find(f => f.id === fieldId);
      if (!fieldSchema) return;

      const fieldType = fieldSchema.type;
      if (isNumericFieldType(fieldType)) {
        fields[fieldId] = extractNumericValue(entry.field_values[fieldId], fieldType);
      }
    });

    dataPoints.push({
      date,
      fields,
    });
  });

  // Sort by date
  dataPoints.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    if (!isValid(dateA) || !isValid(dateB)) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return dataPoints;
}

/**
 * Get numeric fields from tracker schema
 */
export function getNumericFields(schema: TrackerFieldSchema[]): TrackerFieldSchema[] {
  return schema.filter(field => isNumericFieldType(field.type));
}

/**
 * Process emotion words from mood tracker entries
 * Aggregates emotion word frequencies and groups by mood level
 */
export function processEmotionWordsAnalytics(
  entries: TrackerEntry[],
  dateRange: DateRange,
  moodFieldId?: string
): EmotionWordsAnalytics {
  // Filter entries by date range
  const filteredEntries = entries.filter(entry =>
    isDateInRange(entry.entry_date, dateRange)
  );

  // Track emotion word frequencies
  const wordFrequency = new Map<string, { count: number; moodLevels: Set<number> }>();
  let entriesWithEmotions = 0;

  filteredEntries.forEach(entry => {
    // Extract emotion words from field_values
    const emotionWords = entry.field_values['_emotion_words'];
    
    if (emotionWords) {
      entriesWithEmotions++;
      
      // Get mood level for this entry
      let moodLevel: number | null = null;
      if (moodFieldId) {
        const moodValue = entry.field_values[moodFieldId];
        if (typeof moodValue === 'number' && moodValue >= 1 && moodValue <= 5) {
          moodLevel = moodValue;
        }
      }

      // Process emotion words (can be array or comma-separated string)
      let words: string[] = [];
      if (Array.isArray(emotionWords)) {
        words = emotionWords.filter(w => typeof w === 'string' && w.trim());
      } else if (typeof emotionWords === 'string') {
        words = emotionWords.split(',').map(w => w.trim()).filter(Boolean);
      }

      // Count each word
      words.forEach(word => {
        const normalizedWord = word.toLowerCase();
        const existing = wordFrequency.get(normalizedWord);
        if (existing) {
          existing.count++;
          if (moodLevel) {
            existing.moodLevels.add(moodLevel);
          }
        } else {
          wordFrequency.set(normalizedWord, {
            count: 1,
            moodLevels: moodLevel ? new Set([moodLevel]) : new Set(),
          });
        }
      });
    }
  });

  // Convert to data points and sort by frequency
  const emotionDataPoints: EmotionWordDataPoint[] = Array.from(wordFrequency.entries())
    .map(([word, data]) => ({
      word: word.charAt(0).toUpperCase() + word.slice(1), // Capitalize first letter
      count: data.count,
      percentage: Math.round((data.count / entriesWithEmotions) * 100 * 10) / 10,
      moodLevels: Array.from(data.moodLevels).sort(),
    }))
    .sort((a, b) => b.count - a.count); // Sort by frequency descending

  // Group emotions by mood level
  const emotionsByMoodLevel: Record<number, EmotionWordDataPoint[]> = {};
  emotionDataPoints.forEach(emotion => {
    emotion.moodLevels.forEach(level => {
      if (!emotionsByMoodLevel[level]) {
        emotionsByMoodLevel[level] = [];
      }
      // Only add if not already in the array for this level
      if (!emotionsByMoodLevel[level].find(e => e.word === emotion.word)) {
        emotionsByMoodLevel[level].push(emotion);
      }
    });
  });

  // Sort each mood level's emotions by frequency
  Object.keys(emotionsByMoodLevel).forEach(level => {
    emotionsByMoodLevel[Number(level)].sort((a, b) => b.count - a.count);
  });

  return {
    totalEntries: filteredEntries.length,
    entriesWithEmotions,
    topEmotions: emotionDataPoints.slice(0, 15), // Top 15 emotions
    emotionsByMoodLevel,
    dateRange,
  };
}
