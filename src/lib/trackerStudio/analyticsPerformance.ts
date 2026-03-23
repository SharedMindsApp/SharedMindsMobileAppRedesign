/**
 * Analytics Performance Utilities
 * 
 * Helper functions for optimizing analytics data processing.
 */

import type { TimeSeriesDataPoint } from './analyticsTypes';

/**
 * Sample data points if there are too many for smooth rendering
 * Max points for optimal performance
 */
const MAX_POINTS_FOR_SMOOTH_RENDERING = 200;

/**
 * Sample time series data to reduce number of points
 */
export function sampleTimeSeriesData(
  data: TimeSeriesDataPoint[],
  maxPoints: number = MAX_POINTS_FOR_SMOOTH_RENDERING
): TimeSeriesDataPoint[] {
  if (data.length <= maxPoints) {
    return data;
  }

  // Calculate sampling interval
  const interval = Math.ceil(data.length / maxPoints);
  const sampled: TimeSeriesDataPoint[] = [];

  for (let i = 0; i < data.length; i += interval) {
    sampled.push(data[i]);
  }

  // Always include the last point
  if (sampled[sampled.length - 1]?.date !== data[data.length - 1]?.date) {
    sampled.push(data[data.length - 1]);
  }

  return sampled;
}

/**
 * Debounce function for date range changes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if date range is too large (performance warning)
 */
export function isDateRangeTooLarge(dateRange: { start: string; end: string }): boolean {
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Warn if more than 2 years
  return daysDiff > 730;
}

/**
 * Get recommended max date range in days
 */
export function getRecommendedMaxDateRange(): number {
  return 730; // 2 years
}
