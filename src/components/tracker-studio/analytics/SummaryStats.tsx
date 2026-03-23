/**
 * Summary Statistics Component
 * 
 * Displays key aggregated statistics for a tracker field.
 */

import { Loader2 } from 'lucide-react';
import type { AggregatedStats } from '../../../lib/trackerStudio/analyticsTypes';

interface SummaryStatsProps {
  stats: AggregatedStats | null;
  fieldLabel: string;
  loading?: boolean;
}

export function SummaryStats({ stats, fieldLabel, loading }: SummaryStatsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <p className="text-gray-500 text-sm text-center py-4">No data available</p>
      </div>
    );
  }

  const formatValue = (value: number | null): string => {
    if (value === null) return '—';
    // Round to 2 decimal places if needed
    if (value % 1 === 0) {
      return value.toString();
    }
    return value.toFixed(2);
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6"
      role="region"
      aria-label={`Statistics for ${fieldLabel}`}
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4">{fieldLabel} Statistics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" role="list">
        <div className="text-center" role="listitem">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1" aria-label={`Average: ${formatValue(stats.average)}`}>
            {formatValue(stats.average)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Average</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1" aria-label={`Median: ${formatValue(stats.median)}`}>
            {formatValue(stats.median)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Median</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1" aria-label={`Minimum: ${formatValue(stats.min)}`}>
            {formatValue(stats.min)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Min</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1" aria-label={`Maximum: ${formatValue(stats.max)}`}>
            {formatValue(stats.max)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Max</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Entries with data</span>
          <span className="font-medium text-gray-900">
            {stats.count} of {stats.totalEntries}
          </span>
        </div>
      </div>
    </div>
  );
}
