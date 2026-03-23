/**
 * Distribution Histogram Component
 * 
 * Shows value distribution patterns for numeric and rating fields.
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import type { DistributionDataPoint } from '../../../lib/trackerStudio/analyticsTypes';

interface HistogramProps {
  data: DistributionDataPoint[];
  showMean?: boolean;
  showMedian?: boolean;
  meanValue?: number | null;
  medianValue?: number | null;
  height?: number;
  loading?: boolean;
}

export function Histogram({
  data,
  showMean = false,
  showMedian = false,
  meanValue = null,
  medianValue = null,
  height = 300,
  loading = false,
}: HistogramProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Value: {point.value}
          </p>
          <p className="text-sm text-gray-600">
            Count: {point.count}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {point.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center text-gray-500 py-8" style={{ minHeight: height }}>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
          <XAxis
            dataKey="value"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
          {showMean && meanValue !== null && (
            <ReferenceLine
              x={meanValue}
              stroke="#8B5CF6"
              strokeDasharray="3 3"
              label={{ value: 'Mean', position: 'top' }}
            />
          )}
          {showMedian && medianValue !== null && (
            <ReferenceLine
              x={medianValue}
              stroke="#10B981"
              strokeDasharray="3 3"
              label={{ value: 'Median', position: 'top' }}
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
