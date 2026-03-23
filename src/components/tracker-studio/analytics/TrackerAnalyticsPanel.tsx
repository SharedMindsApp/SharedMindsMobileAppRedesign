/**
 * Tracker Analytics Panel Component
 * 
 * Main container for analytics visualizations.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTrackerEntries } from '../../../hooks/trackerStudio/useTrackerEntries';
import { listContextEventsByDateRange } from '../../../lib/trackerStudio/contextEventService';
import type { Tracker, TrackerTemplate } from '../../../lib/trackerStudio/types';
import type { ContextEvent } from '../../../lib/trackerStudio/contextEventTypes';
import type { DateRange, TimeSeriesDataPoint } from '../../../lib/trackerStudio/analyticsTypes';
import {
  processTimeSeriesData,
  calculateAggregatedStats,
  processCalendarHeatmapData,
  processDistributionData,
  processEntryFrequencyData,
  processMultiFieldData,
  getContextComparisonData,
  getNumericFields,
  processEmotionWordsAnalytics,
} from '../../../lib/trackerStudio/trackerAnalyticsService';
import { getDefaultDateRange, getDateRangePreset } from '../../../lib/trackerStudio/analyticsUtils';
import { getEffectiveChartConfig, isChartEnabled, getDefaultDateRangeFromConfig } from '../../../lib/trackerStudio/chartConfigUtils';
import { getTemplate } from '../../../lib/trackerStudio/trackerTemplateService';
import { sampleTimeSeriesData, isDateRangeTooLarge } from '../../../lib/trackerStudio/analyticsPerformance';
import { SummaryStats } from './SummaryStats';
import { ChartControls } from './ChartControls';
import { TimeSeriesChart } from './TimeSeriesChart';
import { MultiFieldChart } from './MultiFieldChart';
import { CalendarHeatmap } from './CalendarHeatmap';
import { Histogram } from './Histogram';
import { EntryFrequencyChart } from './EntryFrequencyChart';
import { ContextComparisonChart } from './ContextComparisonChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { EmotionWordsChart } from './EmotionWordsChart';
import type { BeforeDuringAfterData, EmotionWordsAnalytics } from '../../../lib/trackerStudio/analyticsTypes';
import { isMoodTracker } from '../../../lib/trackerStudio/emotionWords';

interface TrackerAnalyticsPanelProps {
  tracker: Tracker;
}

export function TrackerAnalyticsPanel({ tracker }: TrackerAnalyticsPanelProps) {
  const [template, setTemplate] = useState<TrackerTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  
  // Get effective chart config
  const chartConfig = useMemo(() => {
    return getEffectiveChartConfig(tracker, template);
  }, [tracker, template]);

  // Initialize date range from config
  const defaultRange = getDefaultDateRangeFromConfig(chartConfig);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangePreset(defaultRange));
  
  // Update date range when config changes
  useEffect(() => {
    const newDefaultRange = getDefaultDateRangeFromConfig(chartConfig);
    setDateRange(getDateRangePreset(newDefaultRange));
  }, [chartConfig]);
  
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loadingContextEvents, setLoadingContextEvents] = useState(false);
  const [showSecondaryCharts, setShowSecondaryCharts] = useState(chartConfig.showSecondaryCharts ?? false);
  
  // Update showSecondaryCharts when config changes
  useEffect(() => {
    setShowSecondaryCharts(chartConfig.showSecondaryCharts ?? false);
  }, [chartConfig]);
  const [selectedContextEvent, setSelectedContextEvent] = useState<ContextEvent | null>(null);
  const [contextComparisonData, setContextComparisonData] = useState<BeforeDuringAfterData | null>(null);
  const [loadingContextComparison, setLoadingContextComparison] = useState(false);

  // Load template if tracker was created from one
  useEffect(() => {
    if (tracker.template_id) {
      async function loadTemplate() {
        try {
          setLoadingTemplate(true);
          const tmpl = await getTemplate(tracker.template_id!);
          setTemplate(tmpl);
        } catch (err) {
          console.error('Failed to load template:', err);
        } finally {
          setLoadingTemplate(false);
        }
      }
      loadTemplate();
    }
  }, [tracker.template_id]);
  
  // Get numeric fields from tracker schema
  const numericFields = useMemo(() => {
    return getNumericFields(tracker.field_schema_snapshot);
  }, [tracker.field_schema_snapshot]);

  // Default to first numeric field if available
  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    return numericFields.length > 0 ? [numericFields[0].id] : [];
  });

  // Fetch entries
  const { entries, loading: loadingEntries, error: entriesError } = useTrackerEntries({
    tracker_id: tracker.id,
    start_date: dateRange.start,
    end_date: dateRange.end,
  });

  // Fetch context events
  useEffect(() => {
    async function loadContextEvents() {
      try {
        setLoadingContextEvents(true);
        const events = await listContextEventsByDateRange({
          start_date: dateRange.start,
          end_date: dateRange.end,
          include_archived: false,
        });
        setContextEvents(events);
      } catch (err) {
        console.error('Failed to load context events:', err);
        setContextEvents([]);
      } finally {
        setLoadingContextEvents(false);
      }
    }

    loadContextEvents();
  }, [dateRange.start, dateRange.end]);

  // Process data for selected fields (with sampling for performance)
  const timeSeriesData = useMemo(() => {
    if (selectedFields.length === 0 || numericFields.length === 0) {
      return [];
    }

    // Process all selected fields
    const allDataPoints: Array<TimeSeriesDataPoint & { fieldId: string }> = [];
    
    selectedFields.forEach(fieldId => {
      const fieldSchema = numericFields.find(f => f.id === fieldId);
      if (!fieldSchema) return;
      
      const fieldData = processTimeSeriesData(entries, fieldId, dateRange, fieldSchema);
      // Sample data if too many points
      const sampledData = sampleTimeSeriesData(fieldData);
      sampledData.forEach(point => {
        allDataPoints.push({
          ...point,
          fieldId,
        });
      });
    });

    return allDataPoints;
  }, [entries, selectedFields, dateRange, numericFields]);

  // Calculate stats for selected field
  const stats = useMemo(() => {
    if (selectedFields.length === 0 || numericFields.length === 0) {
      return null;
    }

    const fieldId = selectedFields[0];
    const fieldSchema = numericFields.find(f => f.id === fieldId);
    
    if (!fieldSchema) {
      return null;
    }

    return calculateAggregatedStats(entries, fieldId, dateRange, fieldSchema);
  }, [entries, selectedFields, dateRange, numericFields]);

  // Get selected field schema
  const selectedFieldSchema = useMemo(() => {
    if (selectedFields.length === 0) return null;
    return numericFields.find(f => f.id === selectedFields[0]) || null;
  }, [selectedFields, numericFields]);

  // Process calendar heatmap data
  const heatmapData = useMemo(() => {
    if (selectedFields.length === 0 || numericFields.length === 0) {
      return [];
    }

    const fieldId = selectedFields[0];
    const fieldSchema = numericFields.find(f => f.id === fieldId);
    
    if (!fieldSchema) {
      return [];
    }

    return processCalendarHeatmapData(entries, fieldId, 6, fieldSchema);
  }, [entries, selectedFields, numericFields]);

  // Process distribution data
  const distributionData = useMemo(() => {
    if (selectedFields.length === 0 || numericFields.length === 0) {
      return [];
    }

    const fieldId = selectedFields[0];
    const fieldSchema = numericFields.find(f => f.id === fieldId);
    
    if (!fieldSchema) {
      return [];
    }

    return processDistributionData(entries, fieldId, dateRange, fieldSchema);
  }, [entries, selectedFields, dateRange, numericFields]);

  // Process entry frequency data
  const entryFrequencyData = useMemo(() => {
    return processEntryFrequencyData(entries, tracker.entry_granularity, dateRange);
  }, [entries, tracker.entry_granularity, dateRange]);

  // Process multi-field data (with sampling for performance)
  const multiFieldData = useMemo(() => {
    if (selectedFields.length < 2 || numericFields.length < 2) {
      return [];
    }

    const selectedFieldSchemas = numericFields.filter(f => selectedFields.includes(f.id));
    const data = processMultiFieldData(entries, selectedFields, dateRange, selectedFieldSchemas);
    // Sample if too many points
    if (data.length > 200) {
      const interval = Math.ceil(data.length / 200);
      return data.filter((_, index) => index % interval === 0 || index === data.length - 1);
    }
    return data;
  }, [entries, selectedFields, dateRange, numericFields]);

  // Load context comparison data when context event is selected
  useEffect(() => {
    async function loadContextComparison() {
      if (!selectedContextEvent || selectedFields.length === 0 || numericFields.length === 0) {
        setContextComparisonData(null);
        return;
      }

      // Context event must have an end date
      if (!selectedContextEvent.end_date) {
        setContextComparisonData(null);
        return;
      }

      try {
        setLoadingContextComparison(true);
        const fieldId = selectedFields[0];
        const fieldSchema = numericFields.find(f => f.id === fieldId);
        
        if (!fieldSchema) {
          setContextComparisonData(null);
          return;
        }

        const comparison = getContextComparisonData(
          entries,
          fieldId,
          selectedContextEvent,
          fieldSchema
        );
        setContextComparisonData(comparison);
      } catch (err) {
        console.error('Failed to load context comparison:', err);
        setContextComparisonData(null);
      } finally {
        setLoadingContextComparison(false);
      }
    }

    loadContextComparison();
  }, [selectedContextEvent, selectedFields, entries, numericFields]);

  // Update selected fields when numeric fields change
  useEffect(() => {
    if (numericFields.length > 0 && selectedFields.length === 0) {
      setSelectedFields([numericFields[0].id]);
    }
  }, [numericFields, selectedFields.length]);

  if (numericFields.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <p className="text-gray-500 text-sm text-center py-4">
          This tracker doesn't have any numeric fields to analyze.
        </p>
      </div>
    );
  }

  // Check if date range is too large
  const dateRangeTooLarge = useMemo(() => {
    return isDateRangeTooLarge(dateRange);
  }, [dateRange]);

  // Handle errors with better UX
  if (entriesError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Data</h3>
          <p className="text-red-700 text-sm mb-3">{entriesError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Debounced date range change handler for performance
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Performance Warning */}
      {dateRangeTooLarge && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-amber-800 text-sm">
            ⚠️ Large date range selected. Charts may load slowly. Consider using a shorter range for better performance.
          </p>
        </div>
      )}

      {/* Chart Controls */}
      <ChartControls
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        fields={numericFields}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
      />

      {/* Emotion Words Analytics - For Mood Trackers */}
      {isMoodTracker(tracker.name, tracker.field_schema_snapshot) && emotionWordsAnalytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Emotions</h3>
          <ChartErrorBoundary chartName="Emotion Words">
            <EmotionWordsChart
              analytics={emotionWordsAnalytics}
              loading={loadingEntries}
            />
          </ChartErrorBoundary>
        </div>
      )}

      {/* Summary Statistics */}
      {selectedFieldSchema && isChartEnabled('summary', chartConfig) && (
        <SummaryStats
          stats={stats}
          fieldLabel={selectedFieldSchema.label}
          loading={loadingEntries}
        />
      )}

      {/* Multi-Field Chart or Time Series Chart */}
      {selectedFields.length > 0 && isChartEnabled('timeSeries', chartConfig) && (
        <ChartErrorBoundary chartName={selectedFields.length > 1 ? "Multi-Field Comparison" : "Time Series Chart"}>
          {selectedFields.length > 1 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Multi-Field Comparison</h3>
              <MultiFieldChart
                data={multiFieldData}
                fields={numericFields.filter(f => selectedFields.includes(f.id))}
                contextEvents={contextEvents}
                dateRange={dateRange}
                height={300}
                loading={loadingEntries || loadingContextEvents}
              />
            </div>
          ) : (
            <TimeSeriesChart
              data={timeSeriesData}
              fields={numericFields.filter(f => selectedFields.includes(f.id))}
              contextEvents={contextEvents}
              dateRange={dateRange}
              height={300}
              loading={loadingEntries || loadingContextEvents}
            />
          )}
        </ChartErrorBoundary>
      )}

      {/* Context Event Comparison */}
      {contextEvents.length > 0 && selectedFieldSchema && isChartEnabled('contextComparison', chartConfig) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Context Event Comparison</h3>
          <div className="mb-3">
            <label htmlFor="context-event-select" className="block text-xs text-gray-500 mb-1">
              Select a context event to compare before/during/after
            </label>
            <select
              id="context-event-select"
              value={selectedContextEvent?.id || ''}
              onChange={(e) => {
                const event = contextEvents.find(ev => ev.id === e.target.value);
                setSelectedContextEvent(event || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px] sm:min-h-0"
            >
              <option value="">Select a context event...</option>
              {contextEvents
                .filter(ev => ev.end_date) // Only show events with end dates
                .map(event => (
                  <option key={event.id} value={event.id}>
                    {event.label} ({event.start_date} to {event.end_date})
                  </option>
                ))}
            </select>
          </div>
          {contextComparisonData && (
            <ChartErrorBoundary chartName="Context Comparison">
              <ContextComparisonChart
                comparisonData={contextComparisonData}
                height={300}
                loading={loadingContextComparison}
              />
            </ChartErrorBoundary>
          )}
        </div>
      )}

      {/* Secondary Charts Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Additional Visualizations</h3>
        <button
          onClick={() => setShowSecondaryCharts(!showSecondaryCharts)}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showSecondaryCharts ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Secondary Charts */}
      {showSecondaryCharts && selectedFieldSchema && (
        <div className="space-y-4 sm:space-y-6">
          {/* Calendar Heatmap */}
          {selectedFieldSchema && isChartEnabled('heatmap', chartConfig) && (
            <ChartErrorBoundary chartName="Calendar Heatmap">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Calendar Heatmap</h4>
                <CalendarHeatmap
                  data={heatmapData}
                  fieldType={selectedFieldSchema.type}
                  months={6}
                  height={200}
                  loading={loadingEntries}
                />
              </div>
            </ChartErrorBoundary>
          )}

          {/* Distribution Histogram */}
          {selectedFieldSchema && distributionData.length > 0 && isChartEnabled('histogram', chartConfig) && (
            <ChartErrorBoundary chartName="Value Distribution">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Value Distribution</h4>
                <Histogram
                  data={distributionData}
                  showMean={true}
                  showMedian={true}
                  meanValue={stats?.average || null}
                  medianValue={stats?.median || null}
                  height={300}
                  loading={loadingEntries}
                />
              </div>
            </ChartErrorBoundary>
          )}

          {/* Entry Frequency Chart */}
          {isChartEnabled('frequency', chartConfig) && (
            <ChartErrorBoundary chartName="Entry Frequency">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Entry Frequency</h4>
                <EntryFrequencyChart
                  data={entryFrequencyData}
                  height={300}
                  loading={loadingEntries}
                  granularity={tracker.entry_granularity === 'daily' ? 'daily' : 'daily'}
                />
              </div>
            </ChartErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
