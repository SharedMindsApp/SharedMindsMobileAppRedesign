/**
 * MonthlyPlannerMobile - Mobile-first calendar grid component
 * 
 * Optimized for mobile with calendar grid as primary element.
 * Secondary features (search, todos, notes) are deferred to bottom sheets.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Circle, CheckCircle2, Plus, X, FileText } from 'lucide-react';
import { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';
import { MonthlyPlannerEntry, MonthlyPlannerTodo } from '../../../lib/monthlyPlanner';
import { BottomSheet } from '../../shared/BottomSheet';

export interface MonthlyPlannerMobileProps {
  selectedDate: Date;
  currentMonth: string;
  currentYear: number;
  weeks: number[][];
  events: PersonalCalendarEvent[];
  entry: MonthlyPlannerEntry | null;
  todos: MonthlyPlannerTodo[];
  newTodoTitle: string;
  searchQuery: string;
  isToday: (day: number) => boolean;
  getEventsForDay: (day: number) => {
    containers: PersonalCalendarEvent[];
    allDay: PersonalCalendarEvent[];
    timed: PersonalCalendarEvent[];
    nested: PersonalCalendarEvent[];
  };
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onJumpToMonth: (monthIndex: number) => void;
  onGoToToday: () => void;
  onDayClick: (day: number) => void;
  onEventClick: (event: PersonalCalendarEvent) => void;
  onSearchChange: (query: string) => void;
  onAddTodo: () => void;
  onTodoTitleChange: (title: string) => void;
  onToggleTodo: (todoId: string, completed: boolean) => void;
  onDeleteTodo: (todoId: string) => void;
  onNotesChange: (notes: string) => void;
}

export function MonthlyPlannerMobile({
  selectedDate,
  currentMonth,
  currentYear,
  weeks,
  events,
  entry,
  todos,
  newTodoTitle,
  searchQuery,
  isToday,
  getEventsForDay,
  onNavigateMonth,
  onJumpToMonth,
  onGoToToday,
  onDayClick,
  onEventClick,
  onSearchChange,
  onAddTodo,
  onTodoTitleChange,
  onToggleTodo,
  onDeleteTodo,
  onNotesChange,
}: MonthlyPlannerMobileProps) {
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [showTodosSheet, setShowTodosSheet] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getEventCount = (day: number) => {
    if (day === 0) return 0;
    const dayEvents = getEventsForDay(day);
    return dayEvents.allDay.length + dayEvents.timed.length + dayEvents.nested.length;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact Header - Inline with Calendar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onNavigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setShowMonthPicker(true)}
                className="flex-1 px-3 py-2 text-lg font-semibold text-gray-900 hover:bg-gray-50 rounded-lg active:scale-95 transition-all min-h-[44px]"
              >
                {currentMonth} {currentYear}
              </button>
              <button
                onClick={() => onNavigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Next month"
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
        </div>

        {/* Quick Actions Bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => setShowSearchSheet(true)}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-100 active:scale-95 transition-all min-h-[44px]"
          >
            <Search size={16} />
            <span className="flex-1 text-left truncate">{searchQuery || 'Search events...'}</span>
          </button>
          <button
            onClick={() => setShowTodosSheet(true)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 active:scale-95 transition-all relative min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Circle size={18} />
            {todos.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                {todos.filter(t => !t.completed).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowNotesSheet(true)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <FileText size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid - Primary Content (visible immediately, no scrolling required) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {dayNames.map((day, idx) => (
                <div
                  key={idx}
                  className="p-1.5 text-center text-xs font-semibold text-gray-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="divide-y divide-gray-100">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 divide-x divide-gray-100">
                  {week.map((day, dayIdx) => {
                    const dayIsToday = day > 0 && isToday(day);
                    const eventCount = getEventCount(day);
                    const dayEvents = day > 0 ? getEventsForDay(day) : null;

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => day > 0 && onDayClick(day)}
                        className={`min-h-[48px] p-1.5 text-left relative transition-colors active:bg-gray-100 ${
                          day === 0
                            ? 'bg-gray-50/50'
                            : dayIsToday
                            ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {day > 0 && (
                          <>
                            <div className="flex items-center justify-between mb-0.5">
                              <span
                                className={`text-xs font-semibold ${
                                  dayIsToday
                                    ? 'w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs'
                                    : 'text-gray-900'
                                }`}
                              >
                                {day}
                              </span>
                              {eventCount > 0 && (
                                <span className="text-[9px] text-gray-500 font-medium">
                                  {eventCount}
                                </span>
                              )}
                            </div>
                            {/* Event Indicators */}
                            {dayEvents && (
                              <div className="space-y-0.5">
                                {dayEvents.allDay.slice(0, 1).map((event) => {
                                  const canView = event.permissions?.can_view ?? true;
                                  if (!canView) return null;
                                  return (
                                    <div
                                      key={event.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(event);
                                      }}
                                      className="h-1 bg-blue-500 rounded-full"
                                    />
                                  );
                                })}
                                {dayEvents.timed.slice(0, 1).map((event) => {
                                  const canView = event.permissions?.can_view ?? true;
                                  if (!canView) return null;
                                  return (
                                    <div
                                      key={event.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(event);
                                      }}
                                      className="h-1 bg-purple-500 rounded-full"
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Month Picker Bottom Sheet */}
      <BottomSheet
        isOpen={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        title="Select Month"
      >
        <div className="grid grid-cols-3 gap-3 p-4">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => {
                onJumpToMonth(index);
                setShowMonthPicker(false);
              }}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                selectedDate.getMonth() === index
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Search Bottom Sheet */}
      <BottomSheet
        isOpen={showSearchSheet}
        onClose={() => setShowSearchSheet(false)}
        title="Search Events"
      >
        <div className="p-4">
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events by title..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          {searchQuery && (
            <div className="space-y-2">
              {events
                .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      onEventClick(event);
                      setShowSearchSheet(false);
                    }}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.startAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Todos Bottom Sheet */}
      <BottomSheet
        isOpen={showTodosSheet}
        onClose={() => setShowTodosSheet(false)}
        title="To Do"
      >
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            {todos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => onToggleTodo(todo.id, todo.completed)}
                  className="flex-shrink-0"
                >
                  {todo.completed ? (
                    <CheckCircle2 size={20} className="text-blue-600" />
                  ) : (
                    <Circle size={20} className="text-gray-400" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {todo.title}
                </span>
                <button
                  onClick={() => onDeleteTodo(todo.id)}
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
              value={newTodoTitle}
              onChange={(e) => onTodoTitleChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAddTodo()}
              placeholder="Add a todo..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={onAddTodo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Notes Bottom Sheet */}
      <BottomSheet
        isOpen={showNotesSheet}
        onClose={() => setShowNotesSheet(false)}
        title="Notes"
      >
        <div className="p-4">
          <textarea
            value={entry?.notes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add your monthly notes here..."
            className="w-full h-64 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>
      </BottomSheet>
    </div>
  );
}

