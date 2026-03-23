import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PlannerShell } from '../PlannerShell';
import { X, Plus, Plane, Users, Heart, Home, Calendar as CalendarIcon, PartyPopper, MapPin, Check } from 'lucide-react';
import * as travelService from '../../../lib/travelService';
import { supabase } from '../../../lib/supabase';

type TripType = 'solo' | 'couple' | 'family' | 'group' | 'event' | 'tour';
type Visibility = 'personal' | 'shared';

const TRIP_TYPES: { value: TripType; label: string; icon: typeof Plane; color: string }[] = [
  { value: 'solo', label: 'Solo Travel', icon: Plane, color: 'from-blue-400 to-cyan-500' },
  { value: 'couple', label: 'Couple', icon: Heart, color: 'from-pink-400 to-rose-500' },
  { value: 'family', label: 'Family', icon: Home, color: 'from-green-400 to-emerald-500' },
  { value: 'group', label: 'Group Trip', icon: Users, color: 'from-purple-400 to-violet-500' },
  { value: 'event', label: 'Event', icon: PartyPopper, color: 'from-amber-400 to-orange-500' },
  { value: 'tour', label: 'Tour', icon: MapPin, color: 'from-slate-400 to-blue-500' },
];

interface Household {
  id: string;
  name: string;
}

interface Space {
  id: string;
  name: string;
}

export function CreateTripPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trip_type: 'solo' as TripType,
    start_date: '',
    end_date: '',
    visibility: 'personal' as Visibility,
  });

  const [calendarOptions, setCalendarOptions] = useState({
    addToPersonalCalendar: true,
    addToHouseholdCalendar: false,
    selectedHouseholdId: '',
    addToSpaceCalendar: false,
    selectedSpaceId: '',
  });

  useEffect(() => {
    if (user) {
      loadHouseholdsAndSpaces();
    }
  }, [user]);

  async function loadHouseholdsAndSpaces() {
    if (!user) return;

    try {
      const { data: householdData } = await supabase
        .from('household_members')
        .select('household_id, households(id, name)')
        .eq('auth_user_id', user.id)
        .eq('status', 'active');

      if (householdData) {
        const householdList = householdData
          .map((hm: any) => hm.households)
          .filter((h: any) => h) as Household[];
        setHouseholds(householdList);

        if (householdList.length > 0) {
          setCalendarOptions(prev => ({
            ...prev,
            selectedHouseholdId: householdList[0].id
          }));
        }
      }

      const { data: spaceData } = await supabase
        .from('space_members')
        .select('space_id, spaces(id, name)')
        .eq('user_id', user.id);

      if (spaceData) {
        const spaceList = spaceData
          .map((sm: any) => sm.spaces)
          .filter((s: any) => s) as Space[];
        setSpaces(spaceList);

        if (spaceList.length > 0) {
          setCalendarOptions(prev => ({
            ...prev,
            selectedSpaceId: spaceList[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Error loading households and spaces:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const tripData = {
        owner_id: user.id,
        name: formData.name,
        description: formData.description || null,
        trip_type: formData.trip_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        visibility: formData.visibility,
      };

      const trip = await travelService.createTrip(tripData);

      if (formData.start_date && formData.end_date) {
        await travelService.addTripToCalendars(trip.id, {
          addToPersonal: calendarOptions.addToPersonalCalendar,
          addToHousehold: calendarOptions.addToHouseholdCalendar,
          householdId: calendarOptions.selectedHouseholdId,
          addToSpace: calendarOptions.addToSpaceCalendar,
          spaceId: calendarOptions.selectedSpaceId,
        }, user.id);
      }

      navigate('/planner/travel');
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip');
    } finally {
      setLoading(false);
    }
  }

  const hasDates = formData.start_date && formData.end_date;

  return (
    <PlannerShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Plan Your Journey</h1>
              <p className="text-slate-600">Create a new trip and start planning your adventure</p>
            </div>
            <button
              onClick={() => navigate('/planner/travel')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <h2 className="text-2xl font-semibold text-slate-800 mb-6">Trip Details</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trip Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer in Italy, Tokyo Adventure..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What are you most excited about?"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Trip Type
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TRIP_TYPES.map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, trip_type: value })}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          formData.trip_type === value
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        {formData.trip_type === value && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Visibility
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'personal' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        formData.visibility === 'personal'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-800">Personal</p>
                      <p className="text-sm text-slate-600 mt-1">Only you can see this trip</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'shared' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        formData.visibility === 'shared'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-800">Shared</p>
                      <p className="text-sm text-slate-600 mt-1">Share with household/spaces</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {hasDates && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 border border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Add to Calendars</h2>
                    <p className="text-sm text-slate-600">Sync your trip to your calendars</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 bg-white rounded-xl border border-blue-200 cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={calendarOptions.addToPersonalCalendar}
                      onChange={(e) => setCalendarOptions({ ...calendarOptions, addToPersonalCalendar: e.target.checked })}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">Personal Calendar</p>
                      <p className="text-sm text-slate-600">Add to your private calendar</p>
                    </div>
                  </label>

                  {households.length > 0 && (
                    <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
                      <label className="flex items-start gap-3 p-4 cursor-pointer hover:bg-green-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={calendarOptions.addToHouseholdCalendar}
                          onChange={(e) => setCalendarOptions({ ...calendarOptions, addToHouseholdCalendar: e.target.checked })}
                          className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">Household Calendar</p>
                          <p className="text-sm text-slate-600">Share with your household</p>
                        </div>
                      </label>
                      {calendarOptions.addToHouseholdCalendar && (
                        <div className="px-4 pb-4">
                          <select
                            value={calendarOptions.selectedHouseholdId}
                            onChange={(e) => setCalendarOptions({ ...calendarOptions, selectedHouseholdId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            {households.map(household => (
                              <option key={household.id} value={household.id}>{household.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {spaces.length > 0 && (
                    <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
                      <label className="flex items-start gap-3 p-4 cursor-pointer hover:bg-purple-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={calendarOptions.addToSpaceCalendar}
                          onChange={(e) => setCalendarOptions({ ...calendarOptions, addToSpaceCalendar: e.target.checked })}
                          className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">Shared Space Calendar</p>
                          <p className="text-sm text-slate-600">Add to a shared space</p>
                        </div>
                      </label>
                      {calendarOptions.addToSpaceCalendar && (
                        <div className="px-4 pb-4">
                          <select
                            value={calendarOptions.selectedSpaceId}
                            onChange={(e) => setCalendarOptions({ ...calendarOptions, selectedSpaceId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {spaces.map(space => (
                              <option key={space.id} value={space.id}>{space.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/planner/travel')}
                className="flex-1 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PlannerShell>
  );
}
