/**
 * CalendarQuickViewDrawer - Mobile Quick View Panel
 * 
 * Right-side drawer panel for mobile calendar that provides:
 * - Today's Focus
 * - Live Updates
 * - Quick Analytics
 * - Mini Month Calendar
 * - View switches (Month/Week/Day/Agenda)
 */

import { useState, useEffect } from 'react';
import { X, Grid, Calendar as CalendarIcon, LayoutGrid, List, Target, TrendingUp, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarView } from './types';
import { formatMonthYear, getMonthDays } from '../../lib/calendarUtils';

interface CalendarQuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onDateSelect: (date: Date) => void;
  events?: any[]; // Calendar events for mini calendar
}

export function CalendarQuickViewDrawer({
  isOpen,
  onClose,
  currentDate,
  currentView,
  onViewChange,
  onDateSelect,
  events = [],
}: CalendarQuickViewDrawerProps) {
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date(currentDate));

  // Update mini calendar when main calendar date changes
  useEffect(() => {
    setMiniCalendarDate(new Date(currentDate));
  }, [currentDate]);

  // Handle swipe to close
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart(e.touches[0].clientX);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStart === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - swipeStart;
    
    // Only allow swipe right (to close)
    if (deltaX > 0) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 100) {
      // Swipe threshold - close drawer
      onClose();
    }
    setSwipeStart(null);
    setSwipeOffset(0);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    if (!events || events.length === 0) return [];
    const dateStr = date.toDateString();
    return events.filter(event => {
      const eventDate = new Date(event.start_at);
      return eventDate.toDateString() === dateStr;
    });
  };

  // Mini calendar helpers
  const previousMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === currentDate.toDateString();
  };

  const days = getMonthDays(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth());
  const today = new Date();
  const todayEvents = getEventsForDate(today);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[85vw] max-w-sm
          bg-white shadow-2xl z-50
          flex flex-col
          md:hidden
          transition-transform duration-300 ease-out
          safe-top safe-bottom
        `}
        style={{
          transform: isOpen 
            ? `translateX(${Math.max(0, swipeOffset)}px)` 
            : 'translateX(100%)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Quick View"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick View</h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* View Switches */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">View</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onViewChange('day');
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  currentView === 'day'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid size={16} />
                Day
              </button>
              <button
                onClick={() => {
                  onViewChange('week');
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  currentView === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CalendarIcon size={16} />
                Week
              </button>
              <button
                onClick={() => {
                  onViewChange('month');
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  currentView === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <LayoutGrid size={16} />
                Month
              </button>
              <button
                onClick={() => {
                  onViewChange('year');
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  currentView === 'year'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CalendarIcon size={16} />
                Year
              </button>
              <button
                onClick={() => {
                  onViewChange('agenda');
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  currentView === 'agenda'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List size={16} />
                Index
              </button>
            </div>
          </div>

          {/* Today's Focus */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Today's Focus</h3>
            </div>
            {todayEvents.length > 0 ? (
              <div className="space-y-2">
                {todayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-2 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    {!event.all_day && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(event.start_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No events scheduled for today</p>
            )}
          </div>

          {/* Live Updates */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-700">Live Updates</h3>
            </div>
            <div className="space-y-2">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Recent activity will appear here</p>
              </div>
            </div>
          </div>

          {/* Quick Analytics */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-600" />
              <h3 className="text-sm font-semibold text-gray-700">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-gray-50 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-900">{events.length}</p>
                <p className="text-xs text-gray-600">Total Events</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-900">{todayEvents.length}</p>
                <p className="text-xs text-gray-600">Today</p>
              </div>
            </div>
          </div>

          {/* Mini Month Calendar */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={previousMonth}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} className="text-gray-700" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900">
                {formatMonthYear(miniCalendarDate)}
              </h3>
              <button
                onClick={nextMonth}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} className="text-gray-700" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-semibold text-gray-600 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const isCurrentMonth = date.getMonth() === miniCalendarDate.getMonth();
                if (!isCurrentMonth) {
                  return <div key={index} className="aspect-square" />;
                }

                const dayEvents = getEventsForDate(date);
                const isTodayDate = isToday(date);
                const isSelectedDate = isSelected(date);

                return (
                  <button
                    key={index}
                    onClick={() => {
                      onDateSelect(date);
                      onClose();
                    }}
                    className={`
                      aspect-square p-1 rounded-lg text-xs font-medium transition-all
                      ${isSelectedDate
                        ? 'bg-blue-500 text-white'
                        : isTodayDate
                          ? 'bg-blue-100 text-blue-900'
                          : dayEvents.length > 0
                            ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={isSelectedDate ? 'font-bold' : ''}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${
                          isSelectedDate ? 'bg-white' : 'bg-blue-500'
                        }`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
