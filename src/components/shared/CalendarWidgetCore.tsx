/**
 * CalendarWidgetCore - Calendar Widget for SpacesOS
 * 
 * Uses CalendarShell from calendarCore - the single source of truth for calendar UI.
 * SpacesOS calendar widget composes CalendarShell, it does not re-implement calendar logic.
 * 
 * ❌ DO NOT add calendar rendering logic here
 * ✅ All calendar UI comes from calendarCore/CalendarShell
 */

import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Maximize2, Minimize2, Plus, Menu, X, Settings } from 'lucide-react';
import { CalendarSettingsSheet } from '../calendar/CalendarSettingsSheet';
import type { WidgetRenderMode, WidgetViewMode } from '../../lib/fridgeCanvasTypes';
import { CalendarShell } from '../calendarCore';
import { EventModalCompact } from '../calendar/EventModalCompact';
import { PillActionNav } from './PillActionNav';
import { SpacesWidgetsMenuSheet } from '../spaces/SpacesWidgetsMenuSheet';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';

interface CalendarWidgetCoreProps {
  mode: WidgetRenderMode;
  householdId?: string;
  viewMode?: WidgetViewMode;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onNewEvent?: () => void;
}

export function CalendarWidgetCore({
  mode,
  householdId,
  viewMode = 'large',
  onViewModeChange,
  onNewEvent
}: CalendarWidgetCoreProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | undefined>(undefined);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [mobileMenuSide, setMobileMenuSide] = useState<'left' | 'right' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [widgetsMenuOpen, setWidgetsMenuOpen] = useState(false);
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);

  // Memoize scope to prevent unnecessary re-renders
  const scope = useMemo(() => ({ householdId: householdId || '' }), [householdId]);

  // Icon view - minimal representation
  if (viewMode === 'icon') {
    return (
      <button
        onClick={() => onViewModeChange?.('large')}
        className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 border-blue-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group"
        title="Open Calendar"
      >
        <Calendar size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  // Mini view - compact calendar preview
  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 border-2 rounded-2xl p-3 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Calendar size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-blue-900 text-sm">Calendar</h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewEventDate(undefined);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            }}
            className="p-1 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all"
            title="Add new event"
          >
            <Plus size={12} className="text-white" />
          </button>
        </div>

        {householdId ? (
          <div className="flex-1 overflow-hidden">
            <CalendarShell
              context="spaces"
              scope={scope}
              ui={{
                showHeader: false,
                showViewSelector: false,
                defaultView: 'month',
                enableGestures: false,
              }}
              handlers={{
                onEventClick: (event) => {
                  setSelectedEvent(event);
                  setNewEventDate(undefined);
                  setEventModalOpen(true);
                },
                onDayDoubleClick: (date) => {
                  setNewEventDate(date);
                  setSelectedEvent(undefined);
                  setEventModalOpen(true);
                },
              }}
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-xs text-blue-600 italic">No household</p>
          </div>
        )}
      </div>
    );
  }

  // Large/XLarge view - full calendar with CalendarShell
  // When in app mode (not widget mode), render identically to PlannerCalendar
  if (mode === 'mobile' || mode === 'app') {
    // Full-screen app view - render exactly like PlannerCalendar (no widget styling)
    if (!householdId) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600 text-center">Please join a household to use the calendar.</p>
        </div>
      );
    }

    return (
      <>
        <CalendarShell
          context="spaces"
          scope={scope}
          ui={{
            showHeader: true,
            showViewSelector: true,
            defaultView: 'month',
            enableGestures: true,
          }}
          handlers={{
            onEventClick: (event) => {
              setSelectedEvent(event);
              setNewEventDate(undefined);
              setEventModalOpen(true);
            },
            onTimeSlotClick: (date, time) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
            onDayDoubleClick: (date) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
            onEventCreate: (date) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
          }}
          className="h-full"
        />

        {/* Event Modal */}
        {householdId && (
          <EventModalCompact
            householdId={householdId}
            isOpen={eventModalOpen}
            onClose={() => {
              setEventModalOpen(false);
              setSelectedEvent(undefined);
              setNewEventDate(undefined);
            }}
            onEventChange={() => {
              // CalendarShell will reload events automatically via useCalendarEvents
            }}
            initialDate={newEventDate || new Date()}
            event={selectedEvent}
          />
        )}

        {/* Mobile Bottom Navigation - Pill-style */}
        <PillActionNav
          leftAction={{
            label: 'Calendar',
            icon: <Calendar size={20} />,
            onPress: () => {
              setMobileMenuSide(mobileMenuSide === 'left' ? null : 'left');
              setMobileMenuOpen(mobileMenuSide !== 'left');
              // Close widgets menu if open
              if (widgetsMenuOpen) {
                setWidgetsMenuOpen(false);
              }
            },
          }}
          rightAction={{
            label: 'Widgets',
            icon: <Menu size={20} />,
            onPress: () => {
              setMobileMenuSide(mobileMenuSide === 'right' ? null : 'right');
              setMobileMenuOpen(mobileMenuSide !== 'right');
              // Close calendar menu if open
              if (mobileMenuSide === 'left') {
                setMobileMenuOpen(false);
                setMobileMenuSide(null);
              }
              setWidgetsMenuOpen(!widgetsMenuOpen);
            },
          }}
          leftActive={mobileMenuSide === 'left'}
          rightActive={widgetsMenuOpen && mobileMenuSide === 'right'}
        />

        {/* Mobile Calendar Menu Drawer - Left Side (matches Planner) */}
        {mobileMenuOpen && mobileMenuSide === 'left' && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="fixed left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-md shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-bold text-gray-900">Calendar</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCalendarSettingsOpen(true);
                    }}
                    className="p-3 text-gray-600 hover:text-gray-900 active:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Calendar settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 text-gray-600 hover:text-gray-900 active:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Calendar View Options */}
              <div className="py-2">
                {[
                  { path: '/spaces/app/calendar?view=day', label: 'Day', color: 'bg-blue-600' },
                  { path: '/spaces/app/calendar?view=week', label: 'Week', color: 'bg-blue-600' },
                  { path: '/spaces/app/calendar?view=month', label: 'Month', color: 'bg-blue-600' },
                  { path: '/spaces/app/calendar?view=year', label: 'Year', color: 'bg-blue-600' },
                  { path: '/spaces/app/calendar?view=agenda', label: 'Events', color: 'bg-blue-600' },
                ].map((tab) => {
                  const isActive = location.pathname.includes('/calendar') && 
                    (tab.path.includes('view=') ? location.search.includes(tab.path.split('view=')[1]?.split('&')[0] || '') : !location.search);
                  return (
                    <button
                      key={tab.path}
                      onClick={() => {
                        navigate(tab.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full ${tab.color}
                        ${isActive ? 'opacity-100 ring-2 ring-white/70 shadow-lg' : 'opacity-80 active:opacity-100'}
                        px-4 py-4 text-left text-white font-bold uppercase
                        border-b border-white/20
                        transition-all duration-200
                        min-h-[44px] flex items-center
                        ${isActive ? 'pl-6 border-l-4 border-white/80' : 'pl-4'}
                      `}
                      aria-label={tab.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Widgets Menu Sheet */}
        <SpacesWidgetsMenuSheet
          isOpen={widgetsMenuOpen}
          onClose={() => setWidgetsMenuOpen(false)}
          householdId={householdId || null}
        />

        {/* Calendar Settings Sheet */}
        <CalendarSettingsSheet
          isOpen={calendarSettingsOpen}
          onClose={() => setCalendarSettingsOpen(false)}
        />
      </>
    );
  }

  // Widget mode (fridge canvas) - keep widget styling
  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-600 text-center">Please join a household to use the calendar.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 border-2 rounded-2xl p-4 flex flex-col shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Calendar size={20} className="text-white" />
          </div>
          <h3 className="font-bold text-blue-900 text-base">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewEventDate(undefined);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            }}
            className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all shadow-sm"
            title="Add new event"
          >
            <Plus size={16} className="text-white" />
          </button>
          {onViewModeChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (viewMode === 'xlarge') {
                  onViewModeChange('large');
                } else {
                  onViewModeChange('xlarge');
                }
              }}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all shadow-sm"
              title={viewMode === 'xlarge' ? 'Minimize' : 'Maximize'}
            >
              {viewMode === 'xlarge' ? <Minimize2 size={16} className="text-white" /> : <Maximize2 size={16} className="text-white" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-lg">
        <CalendarShell
          context="spaces"
          scope={scope}
          ui={{
            showHeader: true,
            showViewSelector: true,
            defaultView: 'month',
            enableGestures: true,
          }}
          handlers={{
            onEventClick: (event) => {
              setSelectedEvent(event);
              setNewEventDate(undefined);
              setEventModalOpen(true);
            },
            onTimeSlotClick: (date, time) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
            onDayDoubleClick: (date) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
            onEventCreate: (date) => {
              setNewEventDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            },
          }}
          className="h-full"
        />
      </div>

      {/* Event Modal */}
      {householdId && (
        <EventModalCompact
          householdId={householdId}
          isOpen={eventModalOpen}
          onClose={() => {
            setEventModalOpen(false);
            setSelectedEvent(undefined);
            setNewEventDate(undefined);
          }}
          onEventChange={() => {
            // CalendarShell will reload events automatically via useCalendarEvents
          }}
          initialDate={newEventDate || new Date()}
          event={selectedEvent}
        />
      )}
    </div>
  );
}
