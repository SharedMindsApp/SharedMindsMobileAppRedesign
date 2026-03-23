/**
 * Chart Configuration Utilities
 * 
 * Helper functions for working with tracker chart configurations.
 */

import type { Tracker, TrackerTemplate, TrackerChartConfig } from './types';

/**
 * Get effective chart config for a tracker
 * Priority: tracker.chart_config > template.chart_config > defaults
 */
export function getEffectiveChartConfig(tracker: Tracker, template: TrackerTemplate | null): TrackerChartConfig {
  // If tracker has its own config, use it
  if (tracker.chart_config) {
    return tracker.chart_config;
  }

  // If template has config, use it
  if (template?.chart_config) {
    return template.chart_config;
  }

  // Default config
  return {
    enabledCharts: ['summary', 'timeSeries', 'heatmap', 'histogram', 'frequency'],
    defaultDateRange: '30d',
    showSecondaryCharts: false,
    chartOrder: ['summary', 'timeSeries', 'heatmap', 'histogram', 'frequency'],
  };
}

/**
 * Check if a chart type is enabled
 */
export function isChartEnabled(
  chartType: string,
  config: TrackerChartConfig | null
): boolean {
  if (!config || !config.enabledCharts) {
    return true; // Default to enabled if not specified
  }
  return config.enabledCharts.includes(chartType);
}

/**
 * Get default date range from config
 */
export function getDefaultDateRangeFromConfig(config: TrackerChartConfig | null): '7d' | '30d' | '90d' | '1y' | 'all' {
  return config?.defaultDateRange || '30d';
}
