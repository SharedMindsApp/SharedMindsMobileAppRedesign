/**
 * Tracker Interpretation Service
 * 
 * Read-only, context-aware interpretation layer for cross-tracker analysis.
 * This service describes patterns without judging or modifying data.
 */

import {
  getTracker,
  listTrackers,
} from './trackerService';
import {
  listEntriesByDateRange,
  type ListTrackerEntriesOptions,
} from './trackerEntryService';
import {
  listContextEventsByDateRange,
  getActiveContextsForDate,
} from './contextEventService';
import type {
  Tracker,
  TrackerEntry,
} from './types';
import type {
  ContextEvent,
} from './contextEventTypes';
import type {
  InterpretationInput,
  CrossTrackerSummary,
  ContextAwareComparison,
  BeforeDuringAfterContext,
  TrackerDataPoint,
  TemporalAlignment,
  DirectionalShift,
  VolatilityChange,
  ContextSegment,
  Insight,
} from './trackerInterpretationTypes';

/**
 * Get cross-tracker summary for a date range
 */
export async function getCrossTrackerSummary(
  input: InterpretationInput
): Promise<CrossTrackerSummary> {
  // Validate input
  if (input.trackerIds.length < 2) {
    throw new Error('At least 2 trackers are required for cross-tracker analysis');
  }

  if (input.startDate > input.endDate) {
    throw new Error('Start date must be before end date');
  }

  // Load trackers
  const trackers: Tracker[] = [];
  for (const trackerId of input.trackerIds) {
    const tracker = await getTracker(trackerId);
    if (!tracker) {
      throw new Error(`Tracker not found: ${trackerId}`);
    }
    trackers.push(tracker);
  }

  // Load context events for the date range
  const contextEvents = await listContextEventsByDateRange(
    input.startDate,
    input.endDate
  );

  // Load entries for all trackers
  const allEntries: TrackerEntry[] = [];
  for (const tracker of trackers) {
    const entries = await listEntriesByDateRange({
      tracker_id: tracker.id,
      start_date: input.startDate,
      end_date: input.endDate,
    });
    allEntries.push(...entries);
  }

  // Build data points
  const dataPoints = buildDataPoints(trackers, allEntries, input);

  // Analyze temporal alignment
  const temporalAlignment = analyzeTemporalAlignment(trackers, dataPoints, input);

  // Analyze directional shifts
  const directionalShifts = analyzeDirectionalShifts(trackers, dataPoints, input);

  // Analyze volatility changes
  const volatilityChanges = analyzeVolatilityChanges(trackers, dataPoints, input);

  // Detect missing data
  const missingData = detectMissingData(trackers, dataPoints, input);

  // Generate insights
  const insights = generateInsights(
    trackers,
    dataPoints,
    contextEvents,
    temporalAlignment,
    directionalShifts,
    volatilityChanges,
    input
  );

  return {
    timeRange: {
      start: input.startDate,
      end: input.endDate,
    },
    trackers: trackers.map(t => ({ id: t.id, name: t.name })),
    contextEvents,
    temporalAlignment,
    directionalShifts,
    volatilityChanges,
    missingData,
    insights,
  };
}

/**
 * Get context-aware comparison (before/during/after a context event)
 */
export async function getContextAwareComparison(
  trackerIds: string[],
  contextEventId: string
): Promise<ContextAwareComparison> {
  if (trackerIds.length < 2) {
    throw new Error('At least 2 trackers are required');
  }

  // Load context event
  const { getContextEvent } = await import('./contextEventService');
  const contextEvent = await getContextEvent(contextEventId);
  if (!contextEvent) {
    throw new Error('Context event not found');
  }

  // Calculate segments
  const contextStart = new Date(contextEvent.start_date);
  const contextEnd = contextEvent.end_date ? new Date(contextEvent.end_date) : new Date();
  
  // Before: 7 days before context start
  const beforeStart = new Date(contextStart);
  beforeStart.setDate(beforeStart.getDate() - 7);
  const beforeEnd = new Date(contextStart);
  beforeEnd.setDate(beforeEnd.getDate() - 1);

  // During: context event period
  const duringStart = contextStart;
  const duringEnd = contextEnd;

  // After: 7 days after context end (if context has ended)
  let afterSegment: ContextSegment | null = null;
  if (contextEvent.end_date) {
    const afterStart = new Date(contextEnd);
    afterStart.setDate(afterStart.getDate() + 1);
    const afterEnd = new Date(afterStart);
    afterEnd.setDate(afterEnd.getDate() + 7);

    const afterDataPoints = await loadDataPointsForRange(
      trackerIds,
      afterStart.toISOString().split('T')[0],
      afterEnd.toISOString().split('T')[0]
    );

    afterSegment = {
      contextEvent: null,
      period: 'after',
      startDate: afterStart.toISOString().split('T')[0],
      endDate: afterEnd.toISOString().split('T')[0],
      dataPoints: afterDataPoints,
    };
  }

  // Load data for segments
  const beforeDataPoints = await loadDataPointsForRange(
    trackerIds,
    beforeStart.toISOString().split('T')[0],
    beforeEnd.toISOString().split('T')[0]
  );

  const duringDataPoints = await loadDataPointsForRange(
    trackerIds,
    duringStart.toISOString().split('T')[0],
    duringEnd.toISOString().split('T')[0]
  );

  const beforeSegment: ContextSegment = {
    contextEvent: null,
    period: 'before',
    startDate: beforeStart.toISOString().split('T')[0],
    endDate: beforeEnd.toISOString().split('T')[0],
    dataPoints: beforeDataPoints,
  };

  const duringSegment: ContextSegment = {
    contextEvent,
    period: 'during',
    startDate: duringStart.toISOString().split('T')[0],
    endDate: duringEnd.toISOString().split('T')[0],
    dataPoints: duringDataPoints,
  };

  // Generate insights
  const insights = generateContextComparisonInsights(
    contextEvent,
    beforeSegment,
    duringSegment,
    afterSegment
  );

  return {
    contextEvent,
    beforeSegment,
    duringSegment,
    afterSegment,
    insights,
  };
}

/**
 * Get before/during/after analysis for a context type
 */
export async function getBeforeDuringAfterContext(
  trackerIds: string[],
  contextType: string,
  dateRange: { start: string; end: string }
): Promise<BeforeDuringAfterContext> {
  if (trackerIds.length < 2) {
    throw new Error('At least 2 trackers are required');
  }

  // Load context events of this type in the date range
  const allContextEvents = await listContextEventsByDateRange(
    dateRange.start,
    dateRange.end
  );

  const matchingContexts = allContextEvents.filter(ce => ce.type === contextType);

  if (matchingContexts.length === 0) {
    throw new Error(`No context events of type '${contextType}' found in date range`);
  }

  // For now, analyze the first matching context
  // Future: could aggregate across multiple contexts
  const contextEvent = matchingContexts[0];

  const comparison = await getContextAwareComparison(trackerIds, contextEvent.id);

  return {
    contextType,
    dateRange,
    segments: [comparison.beforeSegment, comparison.duringSegment, comparison.afterSegment].filter(Boolean) as ContextSegment[],
    insights: comparison.insights,
  };
}

// Helper functions

function buildDataPoints(
  trackers: Tracker[],
  entries: TrackerEntry[],
  input: InterpretationInput
): TrackerDataPoint[] {
  const dataPoints: TrackerDataPoint[] = [];

  for (const entry of entries) {
    const tracker = trackers.find(t => t.id === entry.tracker_id);
    if (!tracker) continue;

    // Apply field filters if specified
    const fieldFilter = input.fieldFilters?.[tracker.id];
    const fieldsToInclude = fieldFilter
      ? tracker.field_schema_snapshot.filter(f => fieldFilter.includes(f.id))
      : tracker.field_schema_snapshot;

    for (const field of fieldsToInclude) {
      const value = entry.field_values[field.id];
      dataPoints.push({
        date: entry.entry_date,
        trackerId: tracker.id,
        trackerName: tracker.name,
        fieldId: field.id,
        fieldLabel: field.label,
        value,
        entryId: entry.id,
      });
    }
  }

  return dataPoints;
}

async function loadDataPointsForRange(
  trackerIds: string[],
  startDate: string,
  endDate: string
): Promise<TrackerDataPoint[]> {
  const trackers: Tracker[] = [];
  for (const trackerId of trackerIds) {
    const tracker = await getTracker(trackerId);
    if (tracker) trackers.push(tracker);
  }

  const allEntries: TrackerEntry[] = [];
  for (const tracker of trackers) {
    const entries = await listEntriesByDateRange({
      tracker_id: tracker.id,
      start_date: startDate,
      end_date: endDate,
    });
    allEntries.push(...entries);
  }

  return buildDataPoints(trackers, allEntries, {
    trackerIds,
    startDate,
    endDate,
  });
}

function analyzeTemporalAlignment(
  trackers: Tracker[],
  dataPoints: TrackerDataPoint[],
  input: InterpretationInput
): TemporalAlignment[] {
  const alignments: TemporalAlignment[] = [];

  // Get all unique dates in range
  const dates = new Set<string>();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.add(d.toISOString().split('T')[0]);
  }

  for (const tracker of trackers) {
    const trackerPoints = dataPoints.filter(dp => dp.trackerId === tracker.id);
    const trackerDates = new Set(trackerPoints.map(dp => dp.date));
    
    const hasData = trackerDates.size > 0;
    const dataCoverage = dates.size > 0 ? trackerDates.size / dates.size : 0;

    alignments.push({
      trackerId: tracker.id,
      trackerName: tracker.name,
      dataPoints: trackerPoints,
      hasData,
      dataCoverage,
    });
  }

  return alignments;
}

function analyzeDirectionalShifts(
  trackers: Tracker[],
  dataPoints: TrackerDataPoint[],
  input: InterpretationInput
): DirectionalShift[] {
  const shifts: DirectionalShift[] = [];

  for (const tracker of trackers) {
    const trackerPoints = dataPoints.filter(dp => dp.trackerId === tracker.id);
    
    // Group by field
    const fieldsByFieldId = new Map<string, TrackerDataPoint[]>();
    for (const point of trackerPoints) {
      if (!fieldsByFieldId.has(point.fieldId)) {
        fieldsByFieldId.set(point.fieldId, []);
      }
      fieldsByFieldId.get(point.fieldId)!.push(point);
    }

    for (const [fieldId, fieldPoints] of fieldsByFieldId) {
      if (fieldPoints.length < 2) continue; // Need at least 2 points

      const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
      if (!field) continue;

      // Sort by date
      fieldPoints.sort((a, b) => a.date.localeCompare(b.date));

      // Analyze numeric values only
      const numericValues = fieldPoints
        .map(p => {
          if (typeof p.value === 'number') return p.value;
          if (typeof p.value === 'string' && !isNaN(parseFloat(p.value))) return parseFloat(p.value);
          return null;
        })
        .filter((v): v is number => v !== null);

      if (numericValues.length < 2) continue;

      // Calculate trend
      const firstHalf = numericValues.slice(0, Math.floor(numericValues.length / 2));
      const secondHalf = numericValues.slice(Math.floor(numericValues.length / 2));
      
      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const diff = secondMean - firstMean;
      const percentChange = Math.abs(diff / firstMean) * 100;

      let direction: 'increasing' | 'decreasing' | 'stable' | 'variable';
      let magnitude: 'slight' | 'moderate' | 'significant' | undefined;

      if (percentChange < 5) {
        direction = 'stable';
      } else if (diff > 0) {
        direction = 'increasing';
      } else {
        direction = 'decreasing';
      }

      if (percentChange >= 20) {
        magnitude = 'significant';
      } else if (percentChange >= 10) {
        magnitude = 'moderate';
      } else if (percentChange >= 5) {
        magnitude = 'slight';
      }

      // Check variability
      const variance = calculateVariance(numericValues);
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / mean : 0;

      if (coefficientOfVariation > 0.3) {
        direction = 'variable';
      }

      const description = generateDirectionalDescription(
        tracker.name,
        field.label,
        direction,
        magnitude
      );

      shifts.push({
        trackerId: tracker.id,
        trackerName: tracker.name,
        fieldId,
        fieldLabel: field.label,
        direction,
        magnitude,
        description,
      });
    }
  }

  return shifts;
}

function analyzeVolatilityChanges(
  trackers: Tracker[],
  dataPoints: TrackerDataPoint[],
  input: InterpretationInput
): VolatilityChange[] {
  const changes: VolatilityChange[] = [];

  for (const tracker of trackers) {
    const trackerPoints = dataPoints.filter(dp => dp.trackerId === tracker.id);
    
    const fieldsByFieldId = new Map<string, TrackerDataPoint[]>();
    for (const point of trackerPoints) {
      if (!fieldsByFieldId.has(point.fieldId)) {
        fieldsByFieldId.set(point.fieldId, []);
      }
      fieldsByFieldId.get(point.fieldId)!.push(point);
    }

    for (const [fieldId, fieldPoints] of fieldsByFieldId) {
      if (fieldPoints.length < 3) continue; // Need at least 3 points

      const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
      if (!field) continue;

      fieldPoints.sort((a, b) => a.date.localeCompare(b.date));

      const numericValues = fieldPoints
        .map(p => {
          if (typeof p.value === 'number') return p.value;
          if (typeof p.value === 'string' && !isNaN(parseFloat(p.value))) return parseFloat(p.value);
          return null;
        })
        .filter((v): v is number => v !== null);

      if (numericValues.length < 3) continue;

      const variance = calculateVariance(numericValues);
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / mean : 0;

      let volatility: 'low' | 'medium' | 'high';
      if (coefficientOfVariation < 0.1) {
        volatility = 'low';
      } else if (coefficientOfVariation < 0.3) {
        volatility = 'medium';
      } else {
        volatility = 'high';
      }

      // Compare first half vs second half
      const firstHalf = numericValues.slice(0, Math.floor(numericValues.length / 2));
      const secondHalf = numericValues.slice(Math.floor(numericValues.length / 2));
      
      const firstVariance = calculateVariance(firstHalf);
      const secondVariance = calculateVariance(secondHalf);
      
      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const firstCV = firstMean !== 0 ? Math.sqrt(firstVariance) / firstMean : 0;
      const secondCV = secondMean !== 0 ? Math.sqrt(secondVariance) / secondMean : 0;

      let change: 'increased' | 'decreased' | 'stable' | undefined;
      if (Math.abs(secondCV - firstCV) < 0.05) {
        change = 'stable';
      } else if (secondCV > firstCV) {
        change = 'increased';
      } else {
        change = 'decreased';
      }

      const description = generateVolatilityDescription(
        tracker.name,
        field.label,
        volatility,
        change
      );

      changes.push({
        trackerId: tracker.id,
        trackerName: tracker.name,
        fieldId,
        fieldLabel: field.label,
        volatility,
        change,
        description,
      });
    }
  }

  return changes;
}

function detectMissingData(
  trackers: Tracker[],
  dataPoints: TrackerDataPoint[],
  input: InterpretationInput
): Array<{ trackerId: string; trackerName: string; missingDates: string[] }> {
  const missing: Array<{ trackerId: string; trackerName: string; missingDates: string[] }> = [];

  // Get all dates in range
  const dates = new Set<string>();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.add(d.toISOString().split('T')[0]);
  }

  for (const tracker of trackers) {
    const trackerDates = new Set(
      dataPoints
        .filter(dp => dp.trackerId === tracker.id)
        .map(dp => dp.date)
    );

    const missingDates = Array.from(dates).filter(date => !trackerDates.has(date));

    if (missingDates.length > 0) {
      missing.push({
        trackerId: tracker.id,
        trackerName: tracker.name,
        missingDates,
      });
    }
  }

  return missing;
}

function generateInsights(
  trackers: Tracker[],
  dataPoints: TrackerDataPoint[],
  contextEvents: ContextEvent[],
  temporalAlignment: TemporalAlignment[],
  directionalShifts: DirectionalShift[],
  volatilityChanges: VolatilityChange[],
  input: InterpretationInput
): Insight[] {
  const insights: Insight[] = [];

  // Insight: Context-aware shifts
  if (contextEvents.length > 0 && directionalShifts.length > 0) {
    for (const contextEvent of contextEvents) {
      const shiftsDuringContext = directionalShifts.filter(shift => {
        const shiftDates = dataPoints
          .filter(dp => dp.trackerId === shift.trackerId && dp.fieldId === shift.fieldId)
          .map(dp => dp.date);
        
        return shiftDates.some(date => {
          const dateObj = new Date(date);
          const contextStart = new Date(contextEvent.start_date);
          const contextEnd = contextEvent.end_date ? new Date(contextEvent.end_date) : new Date();
          return dateObj >= contextStart && dateObj <= contextEnd;
        });
      });

      if (shiftsDuringContext.length > 0) {
        const trackerNames = [...new Set(shiftsDuringContext.map(s => s.trackerName))];
        const fieldLabels = [...new Set(shiftsDuringContext.map(s => s.fieldLabel))];
        
        insights.push({
          id: `context-${contextEvent.id}-${Date.now()}`,
          title: `Patterns during ${contextEvent.label}`,
          description: `During ${contextEvent.label.toLowerCase()}, ${trackerNames.join(' and ')} showed changes in ${fieldLabels.join(', ')}.`,
          timeRange: {
            start: contextEvent.start_date,
            end: contextEvent.end_date || new Date().toISOString().split('T')[0],
          },
          contextLabels: [contextEvent.label],
          relatedTrackers: shiftsDuringContext.map(s => s.trackerId),
          type: 'context_comparison',
        });
      }
    }
  }

  // Insight: Temporal alignment
  const lowCoverage = temporalAlignment.filter(ta => ta.dataCoverage < 0.5);
  if (lowCoverage.length > 0) {
        insights.push({
          id: `alignment-${Date.now()}`,
          title: 'Data coverage varies across trackers',
          description: `${lowCoverage.map(ta => ta.trackerName).join(', ')} have incomplete data for this period.`,
          timeRange: {
            start: input.startDate,
            end: input.endDate,
          },
          contextLabels: [],
          relatedTrackers: lowCoverage.map(ta => ta.trackerId),
          type: 'missing_data',
        });
  }

  // Insight: Directional shifts
  if (directionalShifts.length > 0) {
    const significantShifts = directionalShifts.filter(s => s.magnitude === 'significant');
    if (significantShifts.length > 0) {
      const shiftDescriptions = significantShifts.map(s => s.description);
        insights.push({
          id: `shifts-${Date.now()}`,
          title: 'Notable changes observed',
          description: shiftDescriptions.join(' '),
          timeRange: {
            start: input.startDate,
            end: input.endDate,
          },
          contextLabels: contextEvents.map(ce => ce.label),
          relatedTrackers: [...new Set(significantShifts.map(s => s.trackerId))],
          type: 'directional_shift',
        });
    }
  }

  return insights;
}

function generateContextComparisonInsights(
  contextEvent: ContextEvent,
  beforeSegment: ContextSegment,
  duringSegment: ContextSegment,
  afterSegment: ContextSegment | null
): Insight[] {
  const insights: Insight[] = [];

  // Compare before vs during
  const beforeValues = extractNumericValues(beforeSegment.dataPoints);
  const duringValues = extractNumericValues(duringSegment.dataPoints);

  if (beforeValues.length > 0 && duringValues.length > 0) {
    const beforeMean = beforeValues.reduce((a, b) => a + b, 0) / beforeValues.length;
    const duringMean = duringValues.reduce((a, b) => a + b, 0) / duringValues.length;
    
    const change = duringMean - beforeMean;
    const percentChange = Math.abs(change / beforeMean) * 100;

    if (percentChange > 10) {
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push({
        id: `before-during-${contextEvent.id}`,
        title: `Changes during ${contextEvent.label}`,
        description: `During ${contextEvent.label.toLowerCase()}, tracking values ${direction} compared to the week before.`,
        timeRange: {
          start: duringSegment.startDate,
          end: duringSegment.endDate,
        },
        contextLabels: [contextEvent.label],
        relatedTrackers: [...new Set(duringSegment.dataPoints.map(dp => dp.trackerId))],
        type: 'context_comparison',
      });
    }
  }

  // Compare during vs after (if available)
  if (afterSegment) {
    const afterValues = extractNumericValues(afterSegment.dataPoints);
    const duringValues = extractNumericValues(duringSegment.dataPoints);

    if (afterValues.length > 0 && duringValues.length > 0) {
      const duringMean = duringValues.reduce((a, b) => a + b, 0) / duringValues.length;
      const afterMean = afterValues.reduce((a, b) => a + b, 0) / afterValues.length;
      
      const change = afterMean - duringMean;
      const percentChange = Math.abs(change / duringMean) * 100;

      if (percentChange > 10) {
        const direction = change > 0 ? 'increased' : 'decreased';
        insights.push({
          id: `during-after-${contextEvent.id}`,
          title: `Recovery pattern after ${contextEvent.label}`,
          description: `In the week after ${contextEvent.label.toLowerCase()}, tracking values ${direction} compared to during the period.`,
          timeRange: {
            start: afterSegment.startDate,
            end: afterSegment.endDate,
          },
          contextLabels: [contextEvent.label],
          relatedTrackers: [...new Set(afterSegment.dataPoints.map(dp => dp.trackerId))],
          type: 'context_comparison',
        });
      }
    }
  }

  return insights;
}

// Utility functions

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function extractNumericValues(dataPoints: TrackerDataPoint[]): number[] {
  return dataPoints
    .map(p => {
      if (typeof p.value === 'number') return p.value;
      if (typeof p.value === 'string' && !isNaN(parseFloat(p.value))) return parseFloat(p.value);
      return null;
    })
    .filter((v): v is number => v !== null);
}

function generateDirectionalDescription(
  trackerName: string,
  fieldLabel: string,
  direction: string,
  magnitude?: string
): string {
  const magnitudeText = magnitude ? `${magnitude} ` : '';
  return `${trackerName} ${fieldLabel} showed ${magnitudeText}${direction} trend.`;
}

function generateVolatilityDescription(
  trackerName: string,
  fieldLabel: string,
  volatility: string,
  change?: string
): string {
  const changeText = change && change !== 'stable' ? `, ${change} over time` : '';
  return `${trackerName} ${fieldLabel} showed ${volatility} variability${changeText}.`;
}
