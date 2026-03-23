/**
 * WeeklyPlannerMobile - Mobile-first weekly schedule component
 * 
 * Optimized for mobile with weekly schedule as primary element.
 * Secondary features (notes, goals) are deferred to bottom sheets.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Target, Plus, Clock } from 'lucide-react';
import { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';
import { WeeklyPlannerEntry } from '../../../lib/weeklyPlanner';
import { BottomSheet } from '../../shared/BottomSheet';
import { CheckCircle2, Circle, X } from 'lucide-react';

export interface WeeklyPlannerMobileProps {
  weekStart: string;
  weekEnd: string;
  weekDays: Date[];
  selectedDate: Date;
  entry: WeeklyPlannerEntry | null;
  newGoal: string;
  getDayEvents: (date: Date) => {
    containers: PersonalCalendarEvent[];
    nested: PersonalCalendarEvent[];
    regular: PersonalCalendarEvent[];
  };
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  onDayClick: (date: Date) => void;
  onEventClick: (event: PersonalCalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number, minute: number) => void;
  onNotesChange: (notes: string) => void;
  onGoalChange: (goal: string) => void;
  onAddGoal: () => void;
  onToggleGoal: (index: number) => void;
  onRemoveGoal: (index: number) => void;
}

export function WeeklyPlannerMobile({
  weekStart,
  weekEnd,
  weekDays,
  selectedDate,
  entry,
  newGoal,
  getDayEvents,
  onNavigateWeek,
  onGoToToday,
  onDayClick,
  onEventClick,
  onTimeSlotClick,
  onNotesChange,
  onGoalChange,
  onAddGoal,
  onToggleGoal,
  onRemoveGoal,
}: WeeklyPlannerMobileProps) {
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [showGoalsSheet, setShowGoalsSheet] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEventTimeRange = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : start;
    
    if (event.allDay) {
      return 'All day';
    }
    
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    
    if (start.toDateString() === end.toDateString()) {
      return `${startTime} - ${endTime}`;
    }
    
    return `${startTime} - ${endTime}`;
  };

  const getDayName = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact Header - Inline with Schedule */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Week Navigation */}
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onNavigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Previous week"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-gray-900">{weekStart} - {weekEnd}</h1>
              </div>
              <button
                onClick={() => onNavigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Next week"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={onGoToToday}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm min-h-[44px]"
            >
              Today
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotesSheet(true)}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-100 active:scale-95 transition-all min-h-[44px]"
            >
              <FileText size={16} />
              <span className="truncate">Notes</span>
            </button>
            <button
              onClick={() => setShowGoalsSheet(true)}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-100 active:scale-95 transition-all min-h-[44px] relative"
            >
              <Target size={16} />
              <span className="truncate">Goals</span>
              {(entry?.goals || []).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  {(entry?.goals || []).filter(g => !g.startsWith('✓ ')).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Schedule - Primary Content (visible immediately) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 space-y-3">
          {weekDays.map((date) => {
            const dayEvents = getDayEvents(date);
            const allDayEvents = [
              ...dayEvents.containers,
              ...dayEvents.nested,
              ...dayEvents.regular,
            ];
            const isToday = date.toDateString() === new Date().toDateString();
            const dayName = getDayName(date);
            const dayDate = getDayDate(date);

            // Sort events by time
            const sortedEvents = [...allDayEvents].sort((a, b) => {
              const timeA = new Date(a.startAt).getTime();
              const timeB = new Date(b.startAt).getTime();
              return timeA - timeB;
            });

            return (
              <div
                key={date.toDateString()}
                className={`bg-white rounded-xl border-2 shadow-sm transition-all ${
                  isToday ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                }`}
              >
                {/* Day Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isToday ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Clock size={18} className={isToday ? 'text-blue-600' : 'text-gray-600'} />
                      </div>
                      <div>
                        <h3 className={`font-bold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                          {dayName}
                        </h3>
                        <p className="text-sm text-gray-600">{dayDate}</p>
                      </div>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onTimeSlotClick(date, 9, 0)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Add event"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Events List */}
                <div className="px-4 py-3 space-y-2">
                  {sortedEvents.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No events scheduled
                    </div>
                  ) : (
                    sortedEvents.map((event) => {
                      const permissions = event.permissions;
                      const canView = permissions?.can_view ?? true;
                      if (!canView) return null;

                      // Hide nested if detail_level is overview
                      if (event.event_scope === 'item') {
                        const parentContainer = dayEvents.containers.find(
                          c => c.id === event.parent_context_event_id
                        );
                        if (parentContainer?.permissions?.detail_level === 'overview') {
                          return null;
                        }
                      }

                      const isNested = event.event_scope === 'item';
                      const isContainer = event.event_scope === 'container';

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors active:scale-[0.98] ${
                            isContainer
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              : isNested
                              ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {isContainer && (
                                  <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                    Container
                                  </span>
                                )}
                                {isNested && (
                                  <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                    Nested
                                  </span>
                                )}
                                {!event.allDay && (
                                  <span className="text-xs text-gray-600">
                                    {getEventTimeRange(event)}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                              {event.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes Bottom Sheet */}
      <BottomSheet
        isOpen={showNotesSheet}
        onClose={() => setShowNotesSheet(false)}
        title="Weekly Notes"
      >
        <div className="p-4">
          <textarea
            value={entry?.notes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add your weekly notes here..."
            className="w-full h-64 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>
      </BottomSheet>

      {/* Goals Bottom Sheet */}
      <BottomSheet
        isOpen={showGoalsSheet}
        onClose={() => setShowGoalsSheet(false)}
        title="Weekly Goals"
      >
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            {(entry?.goals || []).map((goal, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => onToggleGoal(index)}
                  className="flex-shrink-0"
                >
                  {goal.startsWith('✓ ') ? (
                    <CheckCircle2 size={20} className="text-blue-600" />
                  ) : (
                    <Circle size={20} className="text-gray-400" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    goal.startsWith('✓ ') ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {goal.startsWith('✓ ') ? goal.substring(2) : goal}
                </span>
                <button
                  onClick={() => onRemoveGoal(index)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => onGoalChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAddGoal()}
              placeholder="Add a goal..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={onAddGoal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}


