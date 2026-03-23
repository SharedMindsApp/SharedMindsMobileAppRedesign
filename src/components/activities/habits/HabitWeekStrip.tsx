/**
 * Habit Week Strip Component
 * 
 * A calm, visual 7-day completion strip showing recent habit status.
 * Memory trace, not a score. Quiet visual rhythm, not pressure.
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, X, Minus, Circle } from 'lucide-react';
import { getHabitCheckinsForRange } from '../../../lib/habits/habitsService';
import type { HabitColorTheme } from '../../../lib/habits/habitColorHelpers';

interface HabitWeekStripProps {
  habitId: string;
  userId: string;
  colorTheme?: HabitColorTheme;
  isMobile?: boolean;
}

type DayStatus = 'done' | 'missed' | 'skipped' | 'none';

interface DayData {
  date: string; // YYYY-MM-DD
  dayLabel: string; // S, M, T, W, T, F, S
  status: DayStatus;
  isToday: boolean;
}

export function HabitWeekStrip({
  habitId,
  userId,
  colorTheme,
  isMobile = false,
}: HabitWeekStripProps) {
  // Initialize with empty days so strip always shows
  const initializeEmptyDays = (): DayData[] => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const defaultDays: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const dayLabel = dayLabels[dayOfWeek];
      const isToday = dateStr === today.toISOString().split('T')[0];
      defaultDays.push({
        date: dateStr,
        dayLabel,
        status: 'none',
        isToday,
      });
    }
    return defaultDays;
  };

  const [days, setDays] = useState<DayData[]>(initializeEmptyDays());
  const [loading, setLoading] = useState(true);

  // Define loadWeekData first (before useEffect hooks that use it)
  const loadWeekData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range: today + previous 6 days
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      // Fetch check-ins for the last 7 days
      const checkins = await getHabitCheckinsForRange(
        userId,
        habitId,
        startDateStr,
        endDateStr
      );
      
      // Create a map of date -> status
      const checkinMap = new Map<string, DayStatus>();
      checkins.forEach(checkin => {
        const date = checkin.local_date;
        if (checkin.status === 'done' || checkin.status === 'missed' || checkin.status === 'skipped') {
          checkinMap.set(date, checkin.status as DayStatus);
        }
      });
      
      // Build day data array (oldest to newest, left to right)
      const dayData: DayData[] = [];
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOfWeek = date.getDay();
        const dayLabel = dayLabels[dayOfWeek];
        const isToday = dateStr === endDateStr;
        const status = checkinMap.get(dateStr) || 'none';
        
        dayData.push({
          date: dateStr,
          dayLabel,
          status,
          isToday,
        });
      }
      
      setDays(dayData);
    } catch (error) {
      console.error('[HabitWeekStrip] Error loading week data:', error);
      // On error, create empty days so strip still shows
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const errorDayData: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const dayLabel = dayLabels[dayOfWeek];
        const isToday = dateStr === today.toISOString().split('T')[0];
        errorDayData.push({
          date: dateStr,
          dayLabel,
          status: 'none',
          isToday,
        });
      }
      setDays(errorDayData);
    } finally {
      setLoading(false);
    }
  }, [habitId, userId]);

  // Reload when habitId or userId changes
  // Also reload when component is remounted (via key prop from parent)
  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Subscribe to activity changes to refresh in real-time
  useEffect(() => {
    const loadActivityEvents = async () => {
      const { subscribeActivityChanged } = await import('../../../lib/activities/activityEvents');
      return subscribeActivityChanged((activityId) => {
        if (activityId === habitId) {
          // Refresh when this habit's activity changes (e.g., after check-in)
          loadWeekData();
        }
      });
    };
    
    let unsubscribe: (() => void) | undefined;
    loadActivityEvents().then(unsub => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [habitId, loadWeekData]);

  // Use green colors for completed habits (user requirement)
  const completedColors = {
    bg: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-600'
  };

  // Always show the strip - use days array (always has 7 items after initialization)
  return (
    <div className="flex flex-col gap-1.5">
      {/* Day labels */}
      <div className="flex items-center justify-between gap-0.5">
        {days.map((day) => (
          <div
            key={day.date}
            className={`
              flex-1
              text-center
              ${isMobile ? 'text-[9px]' : 'text-[10px]'}
              font-medium
              ${day.isToday ? 'text-gray-700' : 'text-gray-400'}
            `}
            aria-label={`${day.dayLabel}${day.isToday ? ' (today)' : ''}`}
          >
            {day.dayLabel}
          </div>
        ))}
      </div>
      
      {/* Status boxes */}
      <div className="flex items-center justify-between gap-0.5">
        {days.map((day) => {
          const boxSize = isMobile ? 'w-7 h-7' : 'w-8 h-8';
          const iconSize = isMobile ? 14 : 16;
          
          let boxClass = '';
          let icon = null;
          let ariaLabel = '';
          
          switch (day.status) {
            case 'done':
              boxClass = `${completedColors.bg} ${completedColors.border}`;
              icon = <Check size={iconSize} className={completedColors.text} />;
              ariaLabel = `Completed on ${day.dayLabel}`;
              break;
            case 'missed':
              boxClass = 'bg-gray-50 border-gray-300';
              icon = <X size={iconSize} className="text-gray-400" />;
              ariaLabel = `Missed on ${day.dayLabel}`;
              break;
            case 'skipped':
              boxClass = 'bg-gray-50 border-gray-200';
              icon = <Minus size={iconSize} className="text-gray-300" />;
              ariaLabel = `Skipped on ${day.dayLabel}`;
              break;
            case 'none':
            default:
              boxClass = 'bg-transparent border-gray-200';
              icon = <Circle size={iconSize} className="text-gray-200" strokeWidth={1.5} />;
              ariaLabel = `No check-in on ${day.dayLabel}`;
              break;
          }
          
          return (
            <div
              key={day.date}
              className={`
                ${boxSize}
                ${boxClass}
                border
                rounded-md
                flex
                items-center
                justify-center
                ${day.isToday ? 'ring-1 ring-offset-1 ring-gray-300' : ''}
                transition-opacity duration-200
              `}
              aria-label={ariaLabel}
              role="img"
            >
              {icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
