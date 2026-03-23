/**
 * Entry Frequency Chart Component
 * 
 * Shows how often entries are logged over time.
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { EntryFrequencyDataPoint } from '../../../lib/trackerStudio/analyticsTypes';

interface EntryFrequencyChartProps {
  data: EntryFrequencyDataPoint[];
  height?: number;
  loading?: boolean;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export function EntryFrequencyChart({
  data,
  height = 300,
  loading = false,
  granularity = 'daily',
}: EntryFrequencyChartProps) {
  // Format data for chart
  const chartData = data.map(point => ({
    date: point.date,
    count: point.count,
    hasEntry: point.hasEntry,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const date = parseISO(point.date);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {format(date, 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-gray-600">
            Entries: {point.count}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format X-axis dates
  const formatXAxisDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (granularity === 'monthly') {
        return format(date, 'MMM');
      }
      if (granularity === 'weekly') {
        return format(date, 'MMM d');
      }
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
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

  if (chartData.length === 0) {
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
        <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            angle={granularity === 'daily' ? -45 : 0}
            textAnchor={granularity === 'daily' ? 'end' : 'middle'}
            height={granularity === 'daily' ? 60 : 30}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Entry Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
