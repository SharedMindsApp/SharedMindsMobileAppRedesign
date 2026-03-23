/**
 * Context Comparison Chart Component
 * 
 * Shows before/during/after comparison for context events using bar chart.
 */

import { Loader2 } from 'lucide-react';
import type { BeforeDuringAfterData } from '../../../lib/trackerStudio/analyticsTypes';
import { BarChart, createContextComparisonData } from './BarChart';

interface ContextComparisonChartProps {
  comparisonData: BeforeDuringAfterData;
  height?: number;
  loading?: boolean;
}

export function ContextComparisonChart({
  comparisonData,
  height = 300,
  loading = false,
}: ContextComparisonChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // Prepare data for bar chart
  const chartData = createContextComparisonData(
    {
      label: 'Before',
      value: comparisonData.before.average || 0,
    },
    {
      label: 'During',
      value: comparisonData.during.average || 0,
    },
    {
      label: 'After',
      value: comparisonData.after.average || 0,
    }
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">
          {comparisonData.contextEvent.label}
        </h4>
        <p className="text-xs text-gray-500">
          {comparisonData.contextEvent.type} • {comparisonData.contextEvent.startDate} to {comparisonData.contextEvent.endDate}
        </p>
      </div>
      <BarChart
        data={chartData}
        comparisonType="context_event"
        height={height}
        loading={false}
        yAxisLabel="Average Value"
      />
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {comparisonData.before.average !== null ? comparisonData.before.average.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-gray-500">Before</div>
          <div className="text-xs text-gray-400 mt-1">
            {comparisonData.before.count} entries
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {comparisonData.during.average !== null ? comparisonData.during.average.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-gray-500">During</div>
          <div className="text-xs text-gray-400 mt-1">
            {comparisonData.during.count} entries
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {comparisonData.after.average !== null ? comparisonData.after.average.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-gray-500">After</div>
          <div className="text-xs text-gray-400 mt-1">
            {comparisonData.after.count} entries
          </div>
        </div>
      </div>
    </div>
  );
}
