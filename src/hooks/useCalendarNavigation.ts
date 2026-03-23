/**
 * useCalendarNavigation - Unified navigation between Month/Week/Day views
 * 
 * Ensures state is preserved (selected date, focused day)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CalendarNavigationState {
  date?: string;
  monthIndex?: number;
  focusedDay?: number;
}

export function useCalendarNavigation() {
  const navigate = useNavigate();
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const goToMonth = useCallback((date?: Date, monthIndex?: number) => {
    const state: CalendarNavigationState = {};
    if (date) {
      state.date = date.toISOString();
    }
    if (monthIndex !== undefined) {
      state.monthIndex = monthIndex;
    }
    navigate('/planner/monthly', { state });
  }, [navigate]);

  const goToWeek = useCallback((date: Date) => {
    navigate('/planner/weekly', {
      state: { date: date.toISOString() },
    });
  }, [navigate]);

  const goToDay = useCallback((date: Date) => {
    navigate('/planner/daily', {
      state: { date: date.toISOString() },
    });
  }, [navigate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    navigate('/planner/monthly', {
      state: { date: today.toISOString(), monthIndex: today.getMonth() },
    });
  }, [navigate]);

  return {
    goToMonth,
    goToWeek,
    goToDay,
    goToToday,
    focusedDate,
    setFocusedDate,
  };
}

