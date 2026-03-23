/**
 * Tracker Studio Analytics Utilities
 * 
 * Helper functions for date range handling and analytics calculations.
 */

import { format, subDays, subMonths, subYears, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import type { DateRange, DateRangePreset } from './analyticsTypes';

/**
 * Get date range from preset
 */
export function getDateRangePreset(preset: DateRangePreset): DateRange {
  const today = new Date();
  const end = endOfDay(today).toISOString().split('T')[0]; // YYYY-MM-DD

  switch (preset) {
    case '7d': {
      const start = startOfDay(subDays(today, 6)).toISOString().split('T')[0];
      return { start, end };
    }
    case '30d': {
      const start = startOfDay(subDays(today, 29)).toISOString().split('T')[0];
      return { start, end };
    }
    case '90d': {
      const start = startOfDay(subDays(today, 89)).toISOString().split('T')[0];
      return { start, end };
    }
    case '1y': {
      const start = startOfDay(subYears(today, 1)).toISOString().split('T')[0];
      return { start, end };
    }
    case 'all': {
      // Return a very early date as start (e.g., 10 years ago)
      const start = startOfDay(subYears(today, 10)).toISOString().split('T')[0];
      return { start, end };
    }
    case 'custom':
    default:
      // For custom, return current date range (should be set by user)
      const start = startOfDay(subDays(today, 29)).toISOString().split('T')[0];
      return { start, end };
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
  try {
    const startDate = parseISO(range.start);
    const endDate = parseISO(range.end);

    if (!isValid(startDate) || !isValid(endDate)) {
      return 'Invalid date range';
    }

    const startFormatted = format(startDate, 'MMM d, yyyy');
    const endFormatted = format(endDate, 'MMM d, yyyy');

    // If same date, return single date
    if (startFormatted === endFormatted) {
      return startFormatted;
    }

    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    return 'Invalid date range';
  }
}

/**
 * Validate date range
 */
export function validateDateRange(range: DateRange): boolean {
  try {
    const startDate = parseISO(range.start);
    const endDate = parseISO(range.end);

    if (!isValid(startDate) || !isValid(endDate)) {
      return false;
    }

    // End date must be >= start date
    return endDate >= startDate;
  } catch (error) {
    return false;
  }
}

/**
 * Get preset from date range (if it matches a preset)
 */
export function getPresetFromDateRange(range: DateRange): DateRangePreset | 'custom' {
  const presets: DateRangePreset[] = ['7d', '30d', '90d', '1y', 'all'];
  
  for (const preset of presets) {
    const presetRange = getDateRangePreset(preset);
    if (presetRange.start === range.start && presetRange.end === range.end) {
      return preset;
    }
  }
  
  return 'custom';
}

/**
 * Calculate number of days in date range
 */
export function getDaysInRange(range: DateRange): number {
  try {
    const startDate = parseISO(range.start);
    const endDate = parseISO(range.end);

    if (!isValid(startDate) || !isValid(endDate)) {
      return 0;
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays + 1); // +1 to include both start and end dates
  } catch (error) {
    return 0;
  }
}

/**
 * Check if date is within range (inclusive)
 */
export function isDateInRange(date: string, range: DateRange): boolean {
  try {
    const dateObj = parseISO(date);
    const startDate = parseISO(range.start);
    const endDate = parseISO(range.end);

    if (!isValid(dateObj) || !isValid(startDate) || !isValid(endDate)) {
      return false;
    }

    return dateObj >= startDate && dateObj <= endDate;
  } catch (error) {
    return false;
  }
}

/**
 * Get default date range (30 days)
 */
export function getDefaultDateRange(): DateRange {
  return getDateRangePreset('30d');
}
