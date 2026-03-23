/**
 * Calendar Heatmap Component
 * 
 * GitHub-style contribution graph showing entry frequency or values over time.
 */

import { useMemo } from 'react';
import { format, parseISO, startOfWeek, addDays, eachDayOfInterval, getDay, subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { CalendarHeatmapDataPoint } from '../../../lib/trackerStudio/analyticsTypes';
import type { TrackerFieldType } from '../../../lib/trackerStudio/types';

interface CalendarHeatmapProps {
  data: CalendarHeatmapDataPoint[];
  fieldType: TrackerFieldType;
  months?: number; // Default: 6
  height?: number;
  loading?: boolean;
}

export function CalendarHeatmap({
  data,
  fieldType,
  months = 6,
  height = 200,
  loading = false,
}: CalendarHeatmapProps) {
  // Generate all dates in the range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, months);
    return eachDayOfInterval({ start, end });
  }, [months]);

  // Create a map of date -> value for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, CalendarHeatmapDataPoint>();
    data.forEach(point => {
      map.set(point.date, point);
    });
    return map;
  }, [data]);

  // Group dates by week
  const weeks = useMemo(() => {
    const weekMap = new Map<number, Date[]>();
    
    dateRange.forEach(date => {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
      const weekKey = weekStart.getTime();
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(date);
    });

    return Array.from(weekMap.values()).sort((a, b) => a[0].getTime() - b[0].getTime());
  }, [dateRange]);

  // Get color intensity based on value
  const getColorIntensity = (value: number | boolean | null): string => {
    if (value === null || value === false) {
      return 'bg-gray-100'; // No entry
    }

    if (fieldType === 'boolean') {
      return value === true ? 'bg-blue-500' : 'bg-gray-100';
    }

    if (fieldType === 'rating') {
      // Rating 1-5: map to color intensity
      const numValue = typeof value === 'number' ? value : 0;
      if (numValue <= 1) return 'bg-blue-200';
      if (numValue <= 2) return 'bg-blue-300';
      if (numValue <= 3) return 'bg-blue-400';
      if (numValue <= 4) return 'bg-blue-500';
      return 'bg-blue-600';
    }

    if (fieldType === 'number') {
      // For numbers, we need to normalize
      // Find min/max in data
      const numericValues = data
        .map(d => typeof d.value === 'number' ? d.value : null)
        .filter((v): v is number => v !== null);
      
      if (numericValues.length === 0) return 'bg-gray-100';
      
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const range = max - min;
      
      if (range === 0) return 'bg-blue-400';
      
      const numValue = typeof value === 'number' ? value : 0;
      const normalized = (numValue - min) / range;
      
      if (normalized < 0.2) return 'bg-blue-200';
      if (normalized < 0.4) return 'bg-blue-300';
      if (normalized < 0.6) return 'bg-blue-400';
      if (normalized < 0.8) return 'bg-blue-500';
      return 'bg-blue-600';
    }

    return 'bg-gray-100';
  };

  // Get tooltip text
  const getTooltipText = (date: Date, point: CalendarHeatmapDataPoint | undefined): string => {
    const dateStr = format(date, 'MMM d, yyyy');
    if (!point) {
      return `${dateStr}: No entry`;
    }
    
    if (fieldType === 'boolean') {
      return `${dateStr}: ${point.value ? 'Yes' : 'No'}`;
    }
    
    return `${dateStr}: ${point.value !== null ? point.value : 'No data'}`;
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

  if (weeks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center text-gray-500 py-8" style={{ minHeight: height }}>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    );
  }

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    const seenMonths = new Set<string>();
    
    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      const monthKey = format(firstDay, 'MMM yyyy');
      
      if (!seenMonths.has(monthKey) && weekIndex % 4 === 0) {
        seenMonths.add(monthKey);
        labels.push({ month: format(firstDay, 'MMM'), weekIndex });
      }
    });
    
    return labels;
  }, [weeks]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="overflow-x-auto">
        <div className="flex gap-1" style={{ minWidth: weeks.length * 14 }}>
          {/* Day labels (Sun-Sat) */}
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-3"></div>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div
                key={i}
                className="text-xs text-gray-500 text-center"
                style={{ width: 12, height: 12, lineHeight: '12px' }}
              >
                {i % 2 === 0 ? day : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex gap-1 flex-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1 relative">
                {/* Month label */}
                {monthLabels.some(l => l.weekIndex === weekIndex) && (
                  <div className="text-xs text-gray-500 mb-1 h-3">
                    {monthLabels.find(l => l.weekIndex === weekIndex)?.month}
                  </div>
                )}
                {!monthLabels.some(l => l.weekIndex === weekIndex) && (
                  <div className="h-3"></div>
                )}
                
                {/* Days in week */}
                {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                  const date = week.find(d => getDay(d) === dayOfWeek);
                  if (!date) {
                    return <div key={dayOfWeek} className="w-3 h-3" />;
                  }

                  const dateStr = format(date, 'yyyy-MM-dd');
                  const point = dataMap.get(dateStr);
                  const colorClass = getColorIntensity(point?.value ?? null);

                  return (
                    <div
                      key={dayOfWeek}
                      className={`w-3 h-3 rounded-sm ${colorClass} hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer`}
                      title={getTooltipText(date, point)}
                      style={{ minWidth: 12, minHeight: 12 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <div className="w-3 h-3 rounded-sm bg-blue-300" />
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
