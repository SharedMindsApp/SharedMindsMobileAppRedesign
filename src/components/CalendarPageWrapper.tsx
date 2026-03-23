/**
 * CalendarPageWrapper - SpacesOS Calendar Page
 * 
 * ⚠️ IMPORTANT:
 * This component must NEVER render calendar UI directly.
 * All calendar rendering comes from CalendarShell (calendarCore).
 * 
 * This is a thin wrapper that:
 * - Loads household ID
 * - Provides filter UI
 * - Composes CalendarShell
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { Loader2, Filter, ArrowLeft, User, Menu, X, Settings } from 'lucide-react';
import { CalendarSettingsSheet } from './calendar/CalendarSettingsSheet';
import { CalendarShell } from './calendarCore';
import { EventModal } from './calendar/EventModal';
import { getHouseholdMembers } from '../lib/household';
import { PillActionNav } from './shared/PillActionNav';
import { SpacesWidgetsMenuSheet } from './spaces/SpacesWidgetsMenuSheet';
import type { CalendarEventWithMembers, EventColor } from '../lib/calendarTypes';
import type { CalendarFilters } from './calendarCore/types';

export function CalendarPageWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CalendarFilters>({
    memberIds: [],
    colors: [],
    myEventsOnly: false
  });
  const [mobileMenuSide, setMobileMenuSide] = useState<'left' | 'right' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [widgetsMenuOpen, setWidgetsMenuOpen] = useState(false);
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);

  // Memoize scope to prevent unnecessary re-renders
  const scope = useMemo(() => ({ householdId }), [householdId]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventStartTime, setNewEventStartTime] = useState<string | undefined>();
  const [newEventEndTime, setNewEventEndTime] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    loadHouseholdId();
  }, [user]);

  useEffect(() => {
    if (householdId) {
      loadHouseholdMembers();
    } else {
      setHouseholdMembers([]);
    }
  }, [householdId]);

  const loadHouseholdId = async () => {
    try {
      const { data, error } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHouseholdId(data.space_id);
      } else {
        setHouseholdId(null);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
      setHouseholdId(null);
    } finally {
      setLoading(false);
    }
  };

  const loadHouseholdMembers = async () => {
    try {
      if (!householdId) return;
      const members = await getHouseholdMembers(householdId);
      setHouseholdMembers(members);
    } catch (error) {
      console.error('Failed to load household members:', error);
    }
  };

  const handleCreateEvent = (date?: Date, startTime?: string, endTime?: string) => {
    if (!householdId) {
      if (confirm('You need to create a household first to use the calendar. Would you like to create one now?')) {
        navigate('/onboarding/household');
      }
      return;
    }

    setSelectedEvent(null);
    setNewEventDate(date);
    setNewEventStartTime(startTime);
    setNewEventEndTime(endTime);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEventWithMembers) => {
    setSelectedEvent(event);
    setNewEventDate(undefined);
    setNewEventStartTime(undefined);
    setNewEventEndTime(undefined);
    setIsEventModalOpen(true);
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    const [hours] = time.split(':').map(Number);
    const endHours = hours + 1;
    const endTime = `${endHours.toString().padStart(2, '0')}:00`;
    handleCreateEvent(date, time, endTime);
  };

  const handleDayDoubleClick = (date: Date) => {
    handleCreateEvent(date, '09:00', '10:00');
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setNewEventDate(undefined);
    setNewEventStartTime(undefined);
    setNewEventEndTime(undefined);
  };

  const handleModalSave = () => {
    // CalendarShell will reload events automatically via useCalendarEvents
    handleModalClose();
  };

  const toggleMemberFilter = (memberId: string) => {
    setFilters(prev => ({
      ...prev,
      memberIds: prev.memberIds?.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...(prev.memberIds || []), memberId]
    }));
  };

  const toggleColorFilter = (color: EventColor) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors?.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...(prev.colors || []), color]
    }));
  };

  const clearFilters = () => {
    setFilters({
      memberIds: [],
      colors: [],
      myEventsOnly: false
    });
  };

  const colors: EventColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink'];

  const colorStyles: Record<EventColor, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/household-dashboard')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>

        {!householdId && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6 flex items-start gap-3">
            <User size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Create a household to use the calendar</h3>
              <p className="text-sm text-blue-800 mb-3">
                The calendar requires a household to organize and share events with family members.
              </p>
              <button
                onClick={() => navigate('/onboarding/household')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Create Household
              </button>
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {householdId && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Calendar Filters</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                  }`}
                title="Filters"
              >
                <Filter size={20} />
              </button>
            </div>

            {showFilters && (
              <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Filter by Members
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {householdMembers.map(member => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.memberIds?.includes(member.id)}
                          onChange={() => toggleMemberFilter(member.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{member.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Color</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleColorFilter(color)}
                        className={`w-10 h-10 rounded-lg ${colorStyles[color]} ${filters.colors?.includes(color)
                            ? 'ring-2 ring-gray-900 ring-offset-2'
                            : 'opacity-50 hover:opacity-100'
                          } transition-all`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Filters</h3>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.myEventsOnly}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, myEventsOnly: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">My Events Only</span>
                  </label>

                  <button
                    onClick={clearFilters}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar Shell - Single Source of Truth */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 20rem)' }}>
          {householdId ? (
            <CalendarShell
              context="spaces"
              scope={scope}
              ui={{
                showHeader: true,
                showViewSelector: true,
                defaultView: 'month',
                enableGestures: true,
                filters: filters,
              }}
              handlers={{
                onEventClick: handleEventClick,
                onTimeSlotClick: handleTimeSlotClick,
                onDayDoubleClick: handleDayDoubleClick,
                onEventCreate: handleCreateEvent,
              }}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500">Please create a household to view the calendar.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {householdId && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          event={selectedEvent}
          householdId={householdId}
          householdMembers={householdMembers}
          initialDate={newEventDate}
          initialStartTime={newEventStartTime}
          initialEndTime={newEventEndTime}
        />
      )}

      {/* Mobile Bottom Navigation - Pill-style action nav */}
      <PillActionNav
        leftAction={{
          label: 'Settings',
          icon: <Settings size={20} />,
          onPress: () => {
            setCalendarSettingsOpen(true);
            setMobileMenuSide('left');
            // Close widgets menu if open
            if (widgetsMenuOpen) {
              setWidgetsMenuOpen(false);
            }
          },
        }}
        rightAction={{
          label: 'Areas',
          icon: <Menu size={20} />,
          onPress: () => {
            setMobileMenuSide(mobileMenuSide === 'right' ? null : 'right');
            setWidgetsMenuOpen(mobileMenuSide !== 'right');
            // Close calendar menu if open
            if (mobileMenuSide === 'left') {
              setMobileMenuOpen(false);
              setMobileMenuSide(null);
            }
          },
        }}
        leftActive={calendarSettingsOpen}
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
                { path: '/calendar?view=day', label: 'Day', color: 'bg-blue-600' },
                { path: '/calendar?view=week', label: 'Week', color: 'bg-blue-600' },
                { path: '/calendar?view=month', label: 'Month', color: 'bg-blue-600' },
                { path: '/calendar?view=year', label: 'Year', color: 'bg-blue-600' },
                { path: '/calendar?view=agenda', label: 'Events', color: 'bg-blue-600' },
              ].map((tab) => {
                const isActive = location.pathname === '/calendar' &&
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
        householdId={householdId}
      />

      {/* Calendar Settings Sheet */}
      <CalendarSettingsSheet
        isOpen={calendarSettingsOpen}
        onClose={() => setCalendarSettingsOpen(false)}
      />
    </div>
  );
}
