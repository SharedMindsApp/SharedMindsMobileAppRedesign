/**
 * Multi-Field Comparison Chart Component
 * 
 * Compares multiple fields from the same tracker on a single chart.
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { MultiFieldDataPoint } from '../../../lib/trackerStudio/analyticsTypes';
import type { TrackerFieldSchema } from '../../../lib/trackerStudio/types';
import type { ContextEvent } from '../../../lib/trackerStudio/contextEventTypes';

interface MultiFieldChartProps {
  data: MultiFieldDataPoint[];
  fields: TrackerFieldSchema[];
  contextEvents?: ContextEvent[];
  dateRange: { start: string; end: string };
  height?: number;
  loading?: boolean;
}

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#6B7280', // Gray
];

const CONTEXT_EVENT_COLORS: Record<string, string> = {
  illness: '#FEE2E2',
  recovery: '#D1FAE5',
  travel: '#DBEAFE',
  injury: '#FED7AA',
  stress: '#F3F4F6',
  custom: '#EDE9FE',
};

export function MultiFieldChart({
  data,
  fields,
  contextEvents = [],
  dateRange,
  height = 300,
  loading = false,
}: MultiFieldChartProps) {
  // Filter context events that overlap with date range
  const relevantContextEvents = useMemo(() => {
    return contextEvents.filter(event => {
      if (event.archived_at) return false;
      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : new Date();
      const rangeStart = parseISO(dateRange.start);
      const rangeEnd = parseISO(dateRange.end);
      
      return (
        (eventStart >= rangeStart && eventStart <= rangeEnd) ||
        (eventEnd >= rangeStart && eventEnd <= rangeEnd) ||
        (eventStart <= rangeStart && eventEnd >= rangeEnd)
      );
    });
  }, [contextEvents, dateRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = parseISO(label);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {format(date, 'MMM d, yyyy')}
          </p>
          {payload.map((entry: any, index: number) => {
            const field = fields.find(f => f.id === entry.dataKey) || fields[index];
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {field?.label || entry.dataKey}: {entry.value !== null ? entry.value.toFixed(2) : '—'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Format X-axis dates
  const formatXAxisDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
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

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center text-gray-500 py-8" style={{ minHeight: height }}>
          <p className="text-sm">No data available for this date range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
          
          {/* Context Event Background Bands */}
          {relevantContextEvents.map(event => {
            const startDate = event.start_date;
            const endDate = event.end_date || dateRange.end;
            const color = CONTEXT_EVENT_COLORS[event.type] || CONTEXT_EVENT_COLORS.custom;
            
            return (
              <ReferenceArea
                key={event.id}
                x1={startDate}
                x2={endDate}
                fill={color}
                fillOpacity={0.3}
                stroke="none"
              />
            );
          })}
          
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Lines for each field */}
          {fields.map((field, index) => (
            <Line
              key={field.id}
              type="monotone"
              dataKey={field.id}
              name={field.label}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[index % COLORS.length] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
