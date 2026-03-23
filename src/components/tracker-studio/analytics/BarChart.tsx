/**
 * Bar Chart Component
 * 
 * Bar chart for time period comparisons and before/during/after context comparisons.
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  comparisonType: 'time_period' | 'context_event';
  height?: number;
  loading?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
];

export function BarChart({
  data,
  comparisonType,
  height = 300,
  loading = false,
  xAxisLabel,
  yAxisLabel,
}: BarChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {payload[0].payload.label}
          </p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Value: {payload[0].value !== null ? payload[0].value.toFixed(2) : '—'}
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

  // Prepare data with colors
  const chartData = data.map((point, index) => ({
    ...point,
    fill: point.color || COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
          <XAxis
            dataKey="label"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper function to create time period comparison data
export function createTimePeriodComparisonData(
  thisPeriod: { label: string; value: number },
  lastPeriod: { label: string; value: number }
): BarChartDataPoint[] {
  return [
    { label: lastPeriod.label, value: lastPeriod.value, color: '#9CA3AF' },
    { label: thisPeriod.label, value: thisPeriod.value, color: '#3B82F6' },
  ];
}

// Helper function to create before/during/after comparison data
export function createContextComparisonData(
  before: { label: string; value: number },
  during: { label: string; value: number },
  after: { label: string; value: number }
): BarChartDataPoint[] {
  return [
    { label: before.label, value: before.value, color: '#9CA3AF' },
    { label: during.label, value: during.value, color: '#F59E0B' },
    { label: after.label, value: after.value, color: '#10B981' },
  ];
}
