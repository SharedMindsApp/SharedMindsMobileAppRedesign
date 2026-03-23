import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PlannerShell } from './PlannerShell';
import { Plane, Plus, Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import * as travelService from '../../lib/travelService';
import type { Trip, TripSummaryCounts } from '../../lib/travelService';

export function PlannerTravel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, TripSummaryCounts>>({});

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  async function loadTrips() {
    if (!user) return;

    try {
      setLoading(true);
      const allTrips = await travelService.getUserTrips(user.id);
      
      // Filter for upcoming/active trips (first 3)
      const today = new Date().toISOString().split('T')[0];
      const upcomingOrActive = allTrips
        .filter(trip => {
          if (!trip.start_date && !trip.end_date) return true; // Include trips without dates
          if (trip.start_date && trip.start_date > today) return true; // Upcoming
          if (trip.start_date && trip.end_date && trip.start_date <= today && trip.end_date >= today) return true; // Active
          return false;
        })
        .slice(0, 3);

      setTrips(upcomingOrActive);

      // Get counts for preview trips
      if (upcomingOrActive.length > 0) {
        const tripIds = upcomingOrActive.map(t => t.id);
        const tripCounts = await travelService.getTripSummaryCounts(tripIds);
        setCounts(tripCounts);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDateRange = (startDate: string | null, endDate: string | null): string => {
    if (!startDate && !endDate) return 'Dates TBD';
    if (!startDate) return `Until ${formatDate(endDate!)}`;
    if (!endDate) return `From ${formatDate(startDate)}`;
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (startDateObj.getMonth() === endDateObj.getMonth() && startDateObj.getFullYear() === endDateObj.getFullYear()) {
      const startDay = startDateObj.getDate();
      const endDay = endDateObj.getDate();
      const monthYear = startDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${monthYear} ${startDay}-${endDay}`;
    }
    
    return `${start} - ${end}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const TRIP_TYPE_COLORS: Record<string, string> = {
    solo: 'from-blue-400 to-cyan-500',
    couple: 'from-pink-400 to-rose-500',
    family: 'from-green-400 to-emerald-500',
    group: 'from-purple-400 to-violet-500',
    event: 'from-amber-400 to-orange-500',
    tour: 'from-slate-400 to-blue-500',
  };

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800 mb-1">Travel</h1>
            <p className="text-xs sm:text-sm text-gray-500">Plan trips, collaborate, and organize adventures</p>
          </div>
          <button
            onClick={() => navigate('/planner/travel/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={18} />
            <span>Create Trip</span>
          </button>
        </div>

        {/* Your Trips Preview */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">Your Trips</h2>
              <button
                onClick={() => navigate('/planner/travel/trips')}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center gap-1"
              >
                View All
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.slice(0, 3).map((trip) => {
                const tripCounts = counts[trip.id];
                const gradientColor = TRIP_TYPE_COLORS[trip.trip_type] || 'from-gray-400 to-gray-500';

                return (
                  <button
                    key={trip.id}
                    onClick={() => navigate(`/planner/travel/${trip.id}`)}
                    className="group text-left bg-white rounded-xl border-2 border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Trip Type Gradient Header */}
                    <div className={`h-20 bg-gradient-to-br ${gradientColor} relative`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <Plane className="w-5 h-5 text-white" />
                          {trip.visibility === 'shared' && (
                            <div className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded">
                              Shared
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Trip Content */}
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-slate-800 mb-1 group-hover:text-cyan-700 transition-colors line-clamp-1">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                        <Calendar size={12} />
                        <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                      </div>
                      {tripCounts && (
                        <div className="flex flex-wrap gap-1.5">
                          {tripCounts.destinations_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <MapPin size={10} />
                              <span>{tripCounts.destinations_count}</span>
                            </div>
                          )}
                          {tripCounts.itinerary_items_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <Calendar size={10} />
                              <span>{tripCounts.itinerary_items_count}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center mb-8">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-sm text-gray-600 mb-6">Start planning your next adventure</p>
            <button
              onClick={() => navigate('/planner/travel/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={18} />
              <span>Create Your First Trip</span>
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/planner/travel/trips')}
            className="flex-1 px-6 py-4 bg-white border-2 border-gray-200 hover:border-cyan-300 rounded-xl text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 group-hover:bg-cyan-100 flex items-center justify-center transition-colors">
                <Plane className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">View All Trips</h3>
                <p className="text-sm text-gray-600">See all your travel plans in one place</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </PlannerShell>
  );
}
