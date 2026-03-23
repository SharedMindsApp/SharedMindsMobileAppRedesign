import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PlannerShell } from '../PlannerShell';
import {
  ArrowLeft,
  MapPin,
  Hotel,
  Calendar,
  Heart,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  DollarSign,
  Star,
  CalendarPlus,
  Loader2,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import * as travelService from '../../../lib/travelService';
import type {
  Trip,
  TripDestination,
  TripAccommodation,
  TripItineraryItem,
  TripPlace,
} from '../../../lib/travelService';
import { offerTripItineraryToCalendar, isItineraryItemOffered } from '../../../lib/personalSpaces/tripCalendarIntegration';
import { useSharingDrawer } from '../../../hooks/useSharingDrawer';
import { SharingDrawer } from '../../../components/sharing/SharingDrawer';
import { PermissionIndicator } from '../../../components/sharing/PermissionIndicator';
import { showToast } from '../../Toast';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';
import { EditTripModal } from './EditTripModal';
import { PackingTab } from './PackingTab';
import { BudgetTab } from './BudgetTab';
import { TripLinksPanel } from './TripLinksPanel';

type TabType = 'destinations' | 'accommodations' | 'itinerary' | 'wishlist' | 'packing' | 'budget';

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'resort', label: 'Resort' },
  { value: 'camping', label: 'Camping' },
  { value: 'other', label: 'Other' },
];

const PLACE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'activity', label: 'Activity' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nature', label: 'Nature' },
  { value: 'culture', label: 'Culture' },
];

const PRIORITY_LEVELS = [
  { value: 'must_see', label: 'Must See', color: 'bg-red-500' },
  { value: 'want_to_see', label: 'Want to See', color: 'bg-orange-500' },
  { value: 'if_time', label: 'If Time', color: 'bg-blue-500' },
  { value: 'maybe', label: 'Maybe', color: 'bg-slate-400' },
];

const ITINERARY_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'activity', label: 'Activity' },
  { value: 'food', label: 'Food' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'milestone', label: 'Milestone' },
];

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('destinations');
  const [loading, setLoading] = useState(true);

  const [destinations, setDestinations] = useState<TripDestination[]>([]);
  const [accommodations, setAccommodations] = useState<TripAccommodation[]>([]);
  const [itinerary, setItinerary] = useState<TripItineraryItem[]>([]);
  const [wishlist, setWishlist] = useState<TripPlace[]>([]);

  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);

  const [editingDestination, setEditingDestination] = useState<TripDestination | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<TripAccommodation | null>(null);
  const [editingItinerary, setEditingItinerary] = useState<TripItineraryItem | null>(null);
  const [editingWishlist, setEditingWishlist] = useState<TripPlace | null>(null);
  
  // Phase 5A: Confirmation dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; message: string } | null>(null);
  
  // Sharing state
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer('trip', tripId || null);
  const [canManageTrip, setCanManageTrip] = useState(false);
  const [tripPermissionFlags, setTripPermissionFlags] = useState<any>(null);
  
  // Edit Trip Modal
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTripData();
      checkTripPermissions();
    }
  }, [tripId, user]);

  async function checkTripPermissions() {
    if (!tripId || !user) return;
    
    try {
      // Check if user is trip owner
      const trip = await travelService.getTrip(tripId);
      const isOwner = trip?.owner_id === user.id;
      setCanManageTrip(isOwner);
      
      // TODO: Load actual permission flags from adapter
      // For now, default to private if not owner
      if (isOwner) {
        setTripPermissionFlags({
          can_view: true,
          can_edit: true,
          can_manage: true,
          detail_level: 'detailed',
          scope: 'include_children',
        });
      } else {
        setTripPermissionFlags(null);
      }
    } catch (error) {
      console.error('Error checking trip permissions:', error);
    }
  }

  async function loadTripData() {
    if (!tripId) return;

    try {
      setLoading(true);
      const [tripData, destinationsData, accommodationsData, itineraryData, wishlistData] = await Promise.all([
        travelService.getTrip(tripId),
        travelService.getTripDestinations(tripId),
        travelService.getTripAccommodations(tripId),
        travelService.getTripItinerary(tripId),
        travelService.getTripPlaces(tripId),
      ]);

      setTrip(tripData);
      setDestinations(destinationsData);
      setAccommodations(accommodationsData);
      setItinerary(itineraryData);
      setWishlist(wishlistData);
    } catch (error) {
      console.error('Error loading trip data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDestination(id: string) {
    setDeleteConfirm({
      type: 'destination',
      id,
      message: 'Delete this destination? All associated accommodations and events will remain.',
    });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      if (deleteConfirm.type === 'destination') {
        await travelService.deleteDestination(deleteConfirm.id);
      } else if (deleteConfirm.type === 'accommodation') {
        await travelService.deleteAccommodation(deleteConfirm.id);
      } else if (deleteConfirm.type === 'itinerary') {
        await travelService.deleteItineraryItem(deleteConfirm.id);
      } else if (deleteConfirm.type === 'place') {
        await travelService.deletePlace(deleteConfirm.id);
      }
      await loadTripData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting:', error);
      showToast('error', 'Failed to delete. Please try again.');
      setDeleteConfirm(null);
    }
  }

  async function handleDeleteAccommodation(id: string) {
    setDeleteConfirm({
      type: 'accommodation',
      id,
      message: 'Delete this accommodation?',
    });
  }

  async function handleDeleteItineraryItem(id: string) {
    setDeleteConfirm({
      type: 'itinerary',
      id,
      message: 'Delete this itinerary item?',
    });
  }

  async function handleDeleteWishlistItem(id: string) {
    setDeleteConfirm({
      type: 'place',
      id,
      message: 'Delete this place?',
    });
  }

  async function handleToggleVisited(place: TripPlace) {
    try {
      await travelService.updatePlace(place.id, {
        visited: !place.visited,
        visited_date: !place.visited ? new Date().toISOString().split('T')[0] : null,
      });
      await loadTripData();
    } catch (error) {
      console.error('Error updating place:', error);
    }
  }

  if (loading) {
    return (
      <PlannerShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-slate-600">Loading trip...</div>
        </div>
      </PlannerShell>
    );
  }

  if (!trip) {
    return (
      <PlannerShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-slate-600">Trip not found</div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <button
              onClick={() => navigate('/planner/travel')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Trips
            </button>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-slate-800">{trip.name}</h1>
                  <PermissionIndicator
                    entityType="trip"
                    entityId={tripId || ''}
                    flags={tripPermissionFlags}
                    canManage={canManageTrip}
                  />
                </div>
                {trip.description && (
                  <p className="text-slate-600 mt-2">{trip.description}</p>
                )}
                {trip.start_date && trip.end_date && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {/* Links Panel */}
                <div className="mt-4">
                  <TripLinksPanel tripId={trip.id} canManage={canManageTrip} />
                </div>
              </div>
              {canManageTrip && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={openSharing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              )}
            </div>
            
            {sharingAdapter && (
              <SharingDrawer
                adapter={sharingAdapter}
                isOpen={isSharingOpen}
                onClose={closeSharing}
              />
            )}

            {/* Edit Trip Modal */}
            <EditTripModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              trip={trip}
              onSaved={() => {
                loadTripData();
              }}
            />

            <div className="flex gap-2 mt-6 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('destinations')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'destinations'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Destinations ({destinations.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('accommodations')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'accommodations'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  Accommodations ({accommodations.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'itinerary'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Itinerary ({itinerary.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'wishlist'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Wish List ({wishlist.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('packing')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'packing'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Packing
                </div>
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'budget'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Budget
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {activeTab === 'destinations' && (
            <DestinationsTab
              destinations={destinations}
              onAdd={() => {
                setEditingDestination(null);
                setShowDestinationModal(true);
              }}
              onEdit={(dest) => {
                setEditingDestination(dest);
                setShowDestinationModal(true);
              }}
              onDelete={handleDeleteDestination}
            />
          )}

          {activeTab === 'accommodations' && (
            <AccommodationsTab
              accommodations={accommodations}
              destinations={destinations}
              onAdd={() => {
                setEditingAccommodation(null);
                setShowAccommodationModal(true);
              }}
              onEdit={(acc) => {
                setEditingAccommodation(acc);
                setShowAccommodationModal(true);
              }}
              onDelete={handleDeleteAccommodation}
            />
          )}

          {activeTab === 'itinerary' && trip && user && (
            <ItineraryTab
              itinerary={itinerary}
              destinations={destinations}
              onAdd={() => {
                setEditingItinerary(null);
                setShowItineraryModal(true);
              }}
              onEdit={(item) => {
                setEditingItinerary(item);
                setShowItineraryModal(true);
              }}
              onDelete={handleDeleteItineraryItem}
              tripId={trip.id}
              tripName={trip.name}
              userId={user.id}
            />
          )}

          {activeTab === 'wishlist' && (
            <WishlistTab
              wishlist={wishlist}
              destinations={destinations}
              onAdd={() => {
                setEditingWishlist(null);
                setShowWishlistModal(true);
              }}
              onEdit={(place) => {
                setEditingWishlist(place);
                setShowWishlistModal(true);
              }}
              onDelete={handleDeleteWishlistItem}
              onToggleVisited={handleToggleVisited}
            />
          )}

          {activeTab === 'packing' && trip && user && (
            <PackingTab
              tripId={trip.id}
              userId={user.id}
              canManage={canManageTrip}
            />
          )}

          {activeTab === 'budget' && trip && user && (
            <BudgetTab
              tripId={trip.id}
              userId={user.id}
              canManage={canManageTrip}
              accommodations={accommodations}
              itinerary={itinerary}
            />
          )}
        </div>

        {showDestinationModal && (
          <DestinationModal
            tripId={tripId!}
            destination={editingDestination}
            destinations={destinations}
            onClose={() => setShowDestinationModal(false)}
            onSave={loadTripData}
          />
        )}

        {showAccommodationModal && (
          <AccommodationModal
            tripId={tripId!}
            accommodation={editingAccommodation}
            destinations={destinations}
            onClose={() => setShowAccommodationModal(false)}
            onSave={loadTripData}
          />
        )}

        {showItineraryModal && (
          <ItineraryModal
            tripId={tripId!}
            item={editingItinerary}
            destinations={destinations}
            onClose={() => setShowItineraryModal(false)}
            onSave={loadTripData}
          />
        )}

        {showWishlistModal && (
          <WishlistModal
            tripId={tripId!}
            place={editingWishlist}
            destinations={destinations}
            onClose={() => setShowWishlistModal(false)}
            onSave={loadTripData}
          />
        )}
      </div>
    </PlannerShell>
  );
}

// Destinations Tab Component
function DestinationsTab({
  destinations,
  onAdd,
  onEdit,
  onDelete,
}: {
  destinations: TripDestination[];
  onAdd: () => void;
  onEdit: (dest: TripDestination) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Destinations</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Destination
        </button>
      </div>

      {destinations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No destinations added yet</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Destination
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-800">{dest.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    {dest.city && <span>{dest.city}</span>}
                    {dest.country && <span>{dest.country}</span>}
                  </div>
                  {dest.arrival_date && dest.departure_date && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(dest.arrival_date).toLocaleDateString()} - {new Date(dest.departure_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {dest.notes && (
                    <p className="mt-3 text-slate-600">{dest.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(dest)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(dest.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Accommodations Tab Component (similar structure - I'll create abbreviated version for space)
function AccommodationsTab({
  accommodations,
  destinations,
  onAdd,
  onEdit,
  onDelete,
}: {
  accommodations: TripAccommodation[];
  destinations: TripDestination[];
  onAdd: () => void;
  onEdit: (acc: TripAccommodation) => void;
  onDelete: (id: string) => void;
}) {
  const getDestinationName = (destId: string | null) => {
    if (!destId) return 'General';
    return destinations.find(d => d.id === destId)?.name || 'Unknown';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Accommodations</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Accommodation
        </button>
      </div>

      {accommodations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <Hotel className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No accommodations added yet</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Accommodation
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accommodations.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-800">{acc.name}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                      {acc.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {getDestinationName(acc.destination_id)}
                  </p>
                  {acc.address && (
                    <p className="text-slate-600 mb-2">{acc.address}</p>
                  )}
                  {acc.check_in_date && acc.check_out_date && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(acc.check_in_date).toLocaleDateString()} - {new Date(acc.check_out_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {acc.cost && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      <span>{acc.cost} {acc.currency}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(acc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(acc.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Similar implementations for ItineraryTab and WishlistTab...
function ItineraryTab({
  itinerary,
  destinations,
  onAdd,
  onEdit,
  onDelete,
  tripId,
  tripName,
  userId,
}: {
  itinerary: TripItineraryItem[];
  destinations: TripDestination[];
  onAdd: () => void;
  onEdit: (item: TripItineraryItem) => void;
  onDelete: (id: string) => void;
  tripId: string;
  tripName: string;
  userId: string;
}) {
  const [offerStatus, setOfferStatus] = useState<Record<string, { offered: boolean; status?: string }>>({});
  const [offeringItemId, setOfferingItemId] = useState<string | null>(null);

  // Load offer status for all items
  useEffect(() => {
    async function loadOfferStatuses() {
      const statuses: Record<string, { offered: boolean; status?: string }> = {};
      
      for (const item of itinerary) {
        const status = await isItineraryItemOffered(tripId, item.id, userId);
        statuses[item.id] = status;
      }
      
      setOfferStatus(statuses);
    }
    
    if (tripId && userId && itinerary.length > 0) {
      loadOfferStatuses();
    }
  }, [tripId, userId, itinerary]);

  const handleOfferToCalendar = async (item: TripItineraryItem) => {
    try {
      setOfferingItemId(item.id);
      
      const result = await offerTripItineraryToCalendar(
        tripId,
        {
          id: item.id,
          title: item.title,
          description: item.description,
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          location: item.location,
          category: item.category,
        },
        userId,
        tripName
      );
      
      if (result.success) {
        // Update offer status
        setOfferStatus(prev => ({
          ...prev,
          [item.id]: { offered: true, status: 'pending' },
        }));
      } else {
        showToast('error', result.error || 'Failed to offer event to calendar');
      }
    } catch (error) {
      console.error('Error offering to calendar:', error);
      alert('Failed to offer event to calendar. Please try again.');
    } finally {
      setOfferingItemId(null);
    }
  };

  const getOfferButtonContent = (item: TripItineraryItem) => {
    const status = offerStatus[item.id];
    
    if (offeringItemId === item.id) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Offering...</span>
        </>
      );
    }
    
    if (status?.offered) {
      if (status.status === 'accepted') {
        return (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600">In Calendar</span>
          </>
        );
      } else if (status.status === 'pending') {
        return (
          <>
            <CalendarPlus className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-600">Pending</span>
          </>
        );
      } else if (status.status === 'declined') {
        return (
          <>
            <X className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Declined</span>
          </>
        );
      }
    }
    
    return (
      <>
        <CalendarPlus className="w-4 h-4" />
        <span className="text-xs">Offer to Calendar</span>
      </>
    );
  };

  const groupedByDate = itinerary.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, TripItineraryItem[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Itinerary</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {itinerary.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No itinerary items added yet</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Event
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => (
              <div key={date} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                            {item.category}
                          </span>
                          {item.start_time && (
                            <span className="flex items-center gap-1 text-sm text-slate-500">
                              <Clock className="w-4 h-4" />
                              {item.start_time}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-slate-800">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                        )}
                        {item.location && (
                          <p className="text-sm text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {item.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit itinerary item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete itinerary item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleOfferToCalendar(item)}
                          disabled={offeringItemId === item.id || offerStatus[item.id]?.status === 'accepted'}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors text-xs font-medium ${
                            offerStatus[item.id]?.status === 'accepted'
                              ? 'bg-green-50 text-green-700 cursor-default'
                              : offerStatus[item.id]?.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={
                            offerStatus[item.id]?.status === 'accepted'
                              ? 'Event is in your calendar'
                              : offerStatus[item.id]?.status === 'pending'
                              ? 'Pending acceptance in calendar'
                              : 'Offer this event to your personal calendar'
                          }
                        >
                          {getOfferButtonContent(item)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function WishlistTab({
  wishlist,
  destinations,
  onAdd,
  onEdit,
  onDelete,
  onToggleVisited,
}: {
  wishlist: TripPlace[];
  destinations: TripDestination[];
  onAdd: () => void;
  onEdit: (place: TripPlace) => void;
  onDelete: (id: string) => void;
  onToggleVisited: (place: TripPlace) => void;
}) {
  const priorityOrder = { must_see: 0, want_to_see: 1, if_time: 2, maybe: 3 };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Places to Visit</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Place
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <Heart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No places added yet</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Place
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {wishlist
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
            .map((place) => {
              const priorityInfo = PRIORITY_LEVELS.find(p => p.value === place.priority);
              return (
                <div
                  key={place.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all ${
                    place.visited
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => onToggleVisited(place)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            place.visited
                              ? 'bg-green-500 border-green-500'
                              : 'border-slate-300 hover:border-green-400'
                          }`}
                        >
                          {place.visited && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <h3 className={`text-xl font-semibold ${place.visited ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {place.name}
                        </h3>
                        {priorityInfo && (
                          <span className={`px-3 py-1 ${priorityInfo.color} text-white rounded-full text-sm`}>
                            {priorityInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 capitalize mb-2">{place.category}</p>
                      {place.address && (
                        <p className="text-slate-600">{place.address}</p>
                      )}
                      {place.notes && (
                        <p className="mt-2 text-slate-600">{place.notes}</p>
                      )}
                      {place.visited && place.visited_date && (
                        <p className="mt-2 text-sm text-green-600">
                          Visited on {new Date(place.visited_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(place)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(place.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Modal Components (abbreviated for space - showing pattern)
function DestinationModal({
  tripId,
  destination,
  destinations,
  onClose,
  onSave,
}: {
  tripId: string;
  destination: TripDestination | null;
  destinations: TripDestination[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: destination?.name || '',
    country: destination?.country || '',
    city: destination?.city || '',
    timezone: destination?.timezone || '',
    arrival_date: destination?.arrival_date || '',
    departure_date: destination?.departure_date || '',
    notes: destination?.notes || '',
    order_index: destination?.order_index ?? destinations.length,
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (destination) {
        await travelService.updateDestination(destination.id, formData);
      } else {
        await travelService.createDestination({ ...formData, trip_id: tripId });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving destination:', error);
      showToast('error', 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {destination ? 'Edit Destination' : 'Add Destination'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destination Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Tokyo, Paris, New York"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Arrival Date
              </label>
              <input
                type="date"
                value={formData.arrival_date}
                onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Departure Date
              </label>
              <input
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                min={formData.arrival_date}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : destination ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Similar modal implementations for Accommodation, Itinerary, and Wishlist
// (Showing abbreviated versions due to space constraints)

function AccommodationModal({
  tripId,
  accommodation,
  destinations,
  onClose,
  onSave,
}: {
  tripId: string;
  accommodation: TripAccommodation | null;
  destinations: TripDestination[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: accommodation?.name || '',
    type: accommodation?.type || 'hotel' as const,
    destination_id: accommodation?.destination_id || (destinations[0]?.id || null),
    address: accommodation?.address || '',
    check_in_date: accommodation?.check_in_date || '',
    check_out_date: accommodation?.check_out_date || '',
    booking_reference: accommodation?.booking_reference || '',
    cost: accommodation?.cost || null,
    currency: accommodation?.currency || 'USD',
    contact_info: accommodation?.contact_info || '',
    notes: accommodation?.notes || '',
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (accommodation) {
        await travelService.updateAccommodation(accommodation.id, formData);
      } else {
        await travelService.createAccommodation({ ...formData, trip_id: tripId });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving accommodation:', error);
      showToast('error', 'Failed to save accommodation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {accommodation ? 'Edit Accommodation' : 'Add Accommodation'}
            </h2>
            {/* Phase 2D: Ensure close button is reachable and clear */}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hotel Grand Plaza"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ACCOMMODATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
              <select
                value={formData.destination_id || ''}
                onChange={(e) => setFormData({ ...formData, destination_id: e.target.value || null })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">General</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>{dest.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Check-in</label>
              <input
                type="date"
                value={formData.check_in_date}
                onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Check-out</label>
              <input
                type="date"
                value={formData.check_out_date}
                onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                min={formData.check_in_date}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cost</label>
              <input
                type="number"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                maxLength={3}
                placeholder="USD"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : accommodation ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItineraryModal({
  tripId,
  item,
  destinations,
  onClose,
  onSave,
}: {
  tripId: string;
  item: TripItineraryItem | null;
  destinations: TripDestination[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    destination_id: item?.destination_id || (destinations[0]?.id || null),
    date: item?.date || new Date().toISOString().split('T')[0],
    start_time: item?.start_time || '',
    end_time: item?.end_time || '',
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || 'activity' as const,
    location: item?.location || '',
    booking_reference: item?.booking_reference || '',
    cost: item?.cost || null,
    notes: item?.notes || '',
    order_index: item?.order_index ?? 0,
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (item) {
        await travelService.updateItineraryItem(item.id, formData);
      } else {
        await travelService.createItineraryItem({ ...formData, trip_id: tripId });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving itinerary item:', error);
      showToast('error', 'Failed to save itinerary item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {item ? 'Edit Event' : 'Add Event'}
            </h2>
            {/* Phase 2D: Ensure close button is reachable and clear */}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Visit Eiffel Tower"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ITINERARY_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
              <select
                value={formData.destination_id || ''}
                onChange={(e) => setFormData({ ...formData, destination_id: e.target.value || null })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">General</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>{dest.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : item ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WishlistModal({
  tripId,
  place,
  destinations,
  onClose,
  onSave,
}: {
  tripId: string;
  place: TripPlace | null;
  destinations: TripDestination[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    destination_id: place?.destination_id || (destinations[0]?.id || null),
    name: place?.name || '',
    category: place?.category || 'activity' as const,
    priority: place?.priority || 'want_to_see' as const,
    address: place?.address || '',
    notes: place?.notes || '',
    votes: place?.votes || 0,
    visited: place?.visited || false,
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (place) {
        await travelService.updatePlace(place.id, formData);
      } else {
        await travelService.createPlace({ ...formData, trip_id: tripId });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving place:', error);
      showToast('error', 'Failed to save place');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {place ? 'Edit Place' : 'Add Place'}
            </h2>
            {/* Phase 2D: Ensure close button is reachable and clear */}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Place Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Louvre Museum, Central Park"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PLACE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PRIORITY_LEVELS.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
            <select
              value={formData.destination_id || ''}
              onChange={(e) => setFormData({ ...formData, destination_id: e.target.value || null })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">General</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>{dest.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any tips, opening hours, or things to know..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : place ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
