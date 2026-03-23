/**
 * Time Series Chart Component
 * 
 * Line chart showing values over time using Recharts.
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
  ReferenceArea,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { TimeSeriesDataPoint } from '../../../lib/trackerStudio/analyticsTypes';
import type { TrackerFieldSchema } from '../../../lib/trackerStudio/types';
import type { ContextEvent } from '../../../lib/trackerStudio/contextEventTypes';
import { isDateInRange } from '../../../lib/trackerStudio/analyticsUtils';

interface TimeSeriesDataPointWithField extends TimeSeriesDataPoint {
  fieldId?: string;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPointWithField[];
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

export function TimeSeriesChart({
  data,
  fields,
  contextEvents = [],
  dateRange,
  height = 300,
  loading = false,
}: TimeSeriesChartProps) {
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

  // Format data for Recharts (group by date, multiple fields)
  const chartData = useMemo(() => {
    if (fields.length === 1) {
      // Single field: simple array - filter to only this field's data
      const fieldId = fields[0].id;
      return data
        .filter(point => !point.fieldId || point.fieldId === fieldId)
        .map(point => ({
          date: point.date,
          value: point.value,
          entryId: point.entryId,
          notes: point.notes,
        }));
    } else {
      // Multiple fields: need to group by date
      const dateMap = new Map<string, Record<string, number | null>>();
      
      data.forEach(point => {
        const fieldId = point.fieldId || fields[0].id;
        const field = fields.find(f => f.id === fieldId);
        
        if (!field) return;
        
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, { date: point.date });
        }
        dateMap.get(point.date)![field.id] = point.value;
      });
      
      return Array.from(dateMap.values());
    }
  }, [data, fields]);

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
            const field = fields[index] || fields[0];
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {field.label}: {entry.value !== null ? entry.value.toFixed(2) : '—'}
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

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center text-gray-500 py-8" style={{ minHeight: height }}>
          <p className="text-sm">No data available for this date range</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6"
      role="img"
      aria-label={`Time series chart showing ${fields.map(f => f.label).join(', ')} over time`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          accessibilityLayer
        >
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
          
          {/* Single field line */}
          {fields.length === 1 && (
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[0] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          )}
          
          {/* Multiple field lines */}
          {fields.length > 1 && fields.map((field, index) => (
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
      
      {/* Legend for multiple fields */}
      {fields.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-600">{field.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
