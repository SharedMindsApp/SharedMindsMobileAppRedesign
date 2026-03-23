/**
 * useCalendarNavigation Hook
 * 
 * Shared hook for calendar date navigation logic.
 * Handles previous/next/today actions for all view types.
 */

import { useState, useCallback } from 'react';
import {
  addDays,
  addWeeks,
  addMonths,
} from '../../../lib/calendarUtils';

// Helper to add years
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
import type { CalendarView } from '../types';

export function useCalendarNavigation(initialDate?: Date, initialView?: CalendarView) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [view, setView] = useState<CalendarView>(initialView || 'month');

  const handlePrevious = useCallback(() => {
    switch (view) {
      case 'year':
        setCurrentDate(addYears(currentDate, -1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, -1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'agenda':
        setCurrentDate(addMonths(currentDate, -1));
        break;
    }
  }, [currentDate, view]);

  const handleNext = useCallback(() => {
    switch (view) {
      case 'year':
        setCurrentDate(addYears(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'agenda':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  }, [currentDate, view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return {
    currentDate,
    view,
    setCurrentDate: handleDateChange,
    setView: handleViewChange,
    handlePrevious,
    handleNext,
    handleToday,
  };
}
