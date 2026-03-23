/**
 * Roadmap Timeline Utilities
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * 
 * Pure functions for:
 * - Date range helpers (startOfWeek, endOfWeek, startOfMonth, etc.)
 * - Bucket generation (day, week, month buckets)
 * - Item overlap detection
 * - Bucket aggregation (counts, byType, byStatus, etc.)
 * 
 * ⚠️ CRITICAL: These are pure utility functions
 * File last verified: 2026-01-11 18:06:52 - no side effects, no state mutations.
 */

import type { RoadmapItem, RoadmapItemType, RoadmapItemStatus } from './coreTypes';

export type RoadmapViewMode = 'day' | 'week' | 'month';

export interface TimeBucket {
  key: string;
  viewMode: RoadmapViewMode;
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface BucketAggregation {
  total: number;
  byType: Record<RoadmapItemType, number>;
  byStatus: Record<RoadmapItemStatus, number>;
  hasPriority: boolean;
}

/**
 * Get start of ISO week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get end of ISO week (Sunday)
 */
export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Format date for bucket key
 */
function formatBucketKey(date: Date, viewMode: RoadmapViewMode): string {
  if (viewMode === 'day') {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (viewMode === 'week') {
    const start = startOfWeek(date);
    return `week-${start.getFullYear()}-W${getISOWeekNumber(start)}`;
  } else if (viewMode === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  }
  return '';
}

/**
 * Get ISO week number
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Format date for bucket label
 */
function formatBucketLabel(date: Date, viewMode: RoadmapViewMode): string {
  if (viewMode === 'day') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } else if (viewMode === 'week') {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
    } else {
      return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
    }
  } else if (viewMode === 'month') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  return '';
}

/**
 * Generate time buckets for a given view mode
 */
export function getBuckets(
  viewMode: RoadmapViewMode,
  anchorDate: Date,
  count: number
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const startDate = new Date(anchorDate);

  if (viewMode === 'day') {
    // Generate day buckets
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      buckets.push({
        key: formatBucketKey(date, 'day'),
        viewMode: 'day',
        label: formatBucketLabel(date, 'day'),
        startDate: dayStart,
        endDate: dayEnd,
      });
    }
  } else if (viewMode === 'week') {
    // Generate week buckets (ISO weeks, Monday-Sunday)
    const firstWeekStart = startOfWeek(startDate);
    
    for (let i = 0; i < count; i++) {
      const weekStart = new Date(firstWeekStart);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = endOfWeek(weekStart);
      
      buckets.push({
        key: formatBucketKey(weekStart, 'week'),
        viewMode: 'week',
        label: formatBucketLabel(weekStart, 'week'),
        startDate: weekStart,
        endDate: weekEnd,
      });
    }
  } else if (viewMode === 'month') {
    // Generate month buckets
    const firstMonthStart = startOfMonth(startDate);
    
    for (let i = 0; i < count; i++) {
      const monthStart = new Date(firstMonthStart);
      monthStart.setMonth(monthStart.getMonth() + i);
      const monthEnd = endOfMonth(monthStart);
      
      buckets.push({
        key: formatBucketKey(monthStart, 'month'),
        viewMode: 'month',
        label: formatBucketLabel(monthStart, 'month'),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }
  }

  return buckets;
}

/**
 * Check if a roadmap item overlaps with a time bucket
 */
export function doesItemOverlapBucket(item: RoadmapItem, bucket: TimeBucket): boolean {
  // Items with no dates don't overlap any bucket
  if (!item.startDate && !item.endDate) {
    return false;
  }

  // Parse item dates
  const itemStart = item.startDate ? parseDateFromDB(item.startDate) : null;
  const itemEnd = item.endDate ? parseDateFromDB(item.endDate) : null;

  // If item has only endDate, treat it as a deadline (overlaps if deadline is within bucket)
  if (!itemStart && itemEnd) {
    return itemEnd >= bucket.startDate && itemEnd <= bucket.endDate;
  }

  // If item has only startDate, treat it as a point-in-time start (overlaps if start is within bucket)
  if (itemStart && !itemEnd) {
    return itemStart >= bucket.startDate && itemStart <= bucket.endDate;
  }

  // If item has both dates, check for overlap
  if (itemStart && itemEnd) {
    // Overlap occurs if: itemStart <= bucketEnd AND itemEnd >= bucketStart
    return itemStart <= bucket.endDate && itemEnd >= bucket.startDate;
  }

  return false;
}

/**
 * Parse date from database format (ISO string)
 * Re-exported from infiniteTimelineUtils for consistency
 */
export function parseDateFromDB(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Aggregate items in a bucket
 */
export function aggregateBucket(items: RoadmapItem[]): BucketAggregation {
  const aggregation: BucketAggregation = {
    total: items.length,
    byType: {} as Record<RoadmapItemType, number>,
    byStatus: {} as Record<RoadmapItemStatus, number>,
    hasPriority: false,
  };

  // Initialize counters
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  items.forEach(item => {
    // Count by type
    const type = item.type || 'task';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Count by status
    const status = item.status || 'not_started';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Check for priority (assuming priority is a property, or we can check status)
    // For now, we'll consider items with status 'blocked' or 'in_progress' as priority
    if (status === 'blocked' || status === 'in_progress') {
      aggregation.hasPriority = true;
    }
  });

  // Convert to typed records
  aggregation.byType = typeCounts as Record<RoadmapItemType, number>;
  aggregation.byStatus = statusCounts as Record<RoadmapItemStatus, number>;

  return aggregation;
}
