import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PlannerShell } from '../PlannerShell';
import { Plane, Plus, Calendar, MapPin, Users, Heart, Home, PartyPopper } from 'lucide-react';
import * as travelService from '../../../lib/travelService';
import type { Trip, TripSummaryCounts } from '../../../lib/travelService';

type FilterType = 'all' | 'upcoming' | 'active' | 'past';

const TRIP_TYPE_CONFIG: Record<string, { label: string; icon: typeof Plane; color: string; bgColor: string }> = {
  solo: { label: 'Solo', icon: Plane, color: 'from-blue-400 to-cyan-500', bgColor: 'bg-blue-50 border-blue-200' },
  couple: { label: 'Couple', icon: Heart, color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-50 border-pink-200' },
  family: { label: 'Family', icon: Home, color: 'from-green-400 to-emerald-500', bgColor: 'bg-green-50 border-green-200' },
  group: { label: 'Group', icon: Users, color: 'from-purple-400 to-violet-500', bgColor: 'bg-purple-50 border-purple-200' },
  event: { label: 'Event', icon: PartyPopper, color: 'from-amber-400 to-orange-500', bgColor: 'bg-amber-50 border-amber-200' },
  tour: { label: 'Tour', icon: MapPin, color: 'from-slate-400 to-blue-500', bgColor: 'bg-slate-50 border-slate-200' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Confirmed', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-800 border-slate-300' },
};

interface TripWithCounts extends Trip {
  counts?: TripSummaryCounts;
  isOwner: boolean;
}

export function TripListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripWithCounts[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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
      
      // Get counts for all trips
      const tripIds = allTrips.map(t => t.id);
      const tripCounts = await travelService.getTripSummaryCounts(tripIds);
      setCounts(tripCounts);

      // Enhance trips with counts and ownership
      const tripsWithCounts: TripWithCounts[] = allTrips.map(trip => ({
        ...trip,
        counts: tripCounts[trip.id],
        isOwner: trip.owner_id === user.id,
      }));

      setTrips(tripsWithCounts);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  const getFilteredTrips = (): TripWithCounts[] => {
    const today = new Date().toISOString().split('T')[0];

    switch (activeFilter) {
      case 'upcoming':
        return trips.filter(trip => trip.start_date && trip.start_date > today);
      case 'active':
        return trips.filter(trip => {
          if (!trip.start_date || !trip.end_date) return false;
          return trip.start_date <= today && trip.end_date >= today;
        });
      case 'past':
        return trips.filter(trip => trip.end_date && trip.end_date < today);
      default:
        return trips;
    }
  };

  const filteredTrips = getFilteredTrips();

  const formatDateRange = (startDate: string | null, endDate: string | null): string => {
    if (!startDate && !endDate) return 'Dates TBD';
    if (!startDate) return `Until ${formatDate(endDate!)}`;
    if (!endDate) return `From ${formatDate(startDate)}`;
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // If same month, show: "Jan 15-20, 2024"
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

  const getTripTypeConfig = (tripType: string) => {
    return TRIP_TYPE_CONFIG[tripType] || TRIP_TYPE_CONFIG.solo;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.planning;
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mb-4"></div>
              <p className="text-sm text-gray-600">Loading trips...</p>
            </div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800 mb-1">Your Trips</h1>
            <p className="text-xs sm:text-sm text-gray-500">Manage and plan your travel adventures</p>
          </div>
          <button
            onClick={() => navigate('/planner/travel/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={18} />
            <span>New Trip</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { value: 'all' as FilterType, label: 'All', count: trips.length },
            { value: 'upcoming' as FilterType, label: 'Upcoming', count: trips.filter(t => t.start_date && t.start_date > new Date().toISOString().split('T')[0]).length },
            { value: 'active' as FilterType, label: 'Active', count: trips.filter(t => {
              const today = new Date().toISOString().split('T')[0];
              return t.start_date && t.end_date && t.start_date <= today && t.end_date >= today;
            }).length },
            { value: 'past' as FilterType, label: 'Past', count: trips.filter(t => t.end_date && t.end_date < new Date().toISOString().split('T')[0]).length },
          ].map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeFilter === value
                  ? 'bg-cyan-100 text-cyan-700 border-2 border-cyan-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              {label} {count > 0 && <span className="ml-1.5 text-xs opacity-75">({count})</span>}
            </button>
          ))}
        </div>

        {/* Trip Cards */}
        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === 'all' ? 'No trips yet' : `No ${activeFilter} trips`}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {activeFilter === 'all' 
                ? 'Start planning your next adventure by creating a trip'
                : `You don't have any ${activeFilter} trips at the moment`}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => navigate('/planner/travel/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={18} />
                <span>Create Your First Trip</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTrips.map((trip) => {
              const typeConfig = getTripTypeConfig(trip.trip_type);
              const statusConfig = getStatusConfig(trip.status);
              const TypeIcon = typeConfig.icon;
              const tripCounts = counts[trip.id];

              return (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/planner/travel/${trip.id}`)}
                  className="group text-left bg-white rounded-xl border-2 border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Trip Type Gradient Header */}
                  <div className={`h-24 bg-gradient-to-br ${typeConfig.color} relative`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    <div className="absolute top-3 right-3">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold text-sm">{typeConfig.label}</span>
                      </div>
                      {!trip.isOwner && (
                        <div className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded">
                          Shared
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trip Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-cyan-700 transition-colors line-clamp-2">
                      {trip.name}
                    </h3>

                    {trip.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {trip.description}
                      </p>
                    )}

                    {/* Date Range */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-4">
                      <Calendar size={14} />
                      <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                    </div>

                    {/* Count Badges */}
                    <div className="flex flex-wrap gap-2">
                      {tripCounts && (
                        <>
                          {tripCounts.destinations_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <MapPin size={12} />
                              <span>{tripCounts.destinations_count}</span>
                            </div>
                          )}
                          {tripCounts.accommodations_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <Home size={12} />
                              <span>{tripCounts.accommodations_count}</span>
                            </div>
                          )}
                          {tripCounts.itinerary_items_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <Calendar size={12} />
                              <span>{tripCounts.itinerary_items_count}</span>
                            </div>
                          )}
                          {tripCounts.places_count > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <Heart size={12} />
                              <span>{tripCounts.places_count}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
