/**
 * Eat Out Assignment Modal
 * 
 * Allows users to assign "eat out" to a meal slot by selecting a place
 */

import { useState, useEffect } from 'react';
import { X, Search, Star, MapPin, Globe, Plus, UtensilsCrossed } from 'lucide-react';
import { getPlaces, createPlace, type Place, type PlaceOrder } from '../../lib/placesService';
import { getPlaceOrders } from '../../lib/placesService';
import { getPlaceTypeLabel, getAllPlaceTypes, type PlaceType } from '../../lib/placesTypes';
import { showToast } from '../Toast';
import { BottomSheet } from '../shared/BottomSheet';

interface EatOutAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (placeId: string, orderId?: string | null, notes?: string) => void;
  spaceId: string;
  mealSlotLabel?: string;
}

export function EatOutAssignmentModal({
  isOpen,
  onClose,
  onSelect,
  spaceId,
  mealSlotLabel,
}: EatOutAssignmentModalProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PlaceOrder | null>(null);
  const [notes, setNotes] = useState('');
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [filterType, setFilterType] = useState<PlaceType | 'all'>('all');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);

  useEffect(() => {
    if (isOpen && spaceId) {
      loadPlaces();
    }
  }, [isOpen, spaceId, filterType, showFavouritesOnly]);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      const options: any = {};
      if (filterType !== 'all') {
        options.type = filterType;
      }
      if (showFavouritesOnly) {
        options.favourite = true;
      }
      if (searchQuery.trim()) {
        options.search = searchQuery.trim();
      }
      const loadedPlaces = await getPlaces(spaceId, options);
      setPlaces(loadedPlaces);
    } catch (error) {
      console.error('Failed to load places:', error);
      showToast('error', 'Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    setSelectedPlace(place);
    setSelectedOrder(null);
    // Load orders for this place
    try {
      const orders = await getPlaceOrders(place.id);
      // Auto-select if only one order
      if (orders.length === 1) {
        setSelectedOrder(orders[0]);
      }
    } catch (error) {
      console.error('Failed to load place orders:', error);
    }
  };

  const handleConfirm = () => {
    if (!selectedPlace) {
      showToast('error', 'Please select a place');
      return;
    }
    onSelect(selectedPlace.id, selectedOrder?.id || null, notes.trim() || undefined);
    // Reset state
    setSelectedPlace(null);
    setSelectedOrder(null);
    setNotes('');
    onClose();
  };

  const filteredPlaces = places.filter(place => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        place.name.toLowerCase().includes(query) ||
        place.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (place.cuisine && place.cuisine.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Sort: favourites first, then by name
  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    if (a.favourite && !b.favourite) return -1;
    if (!a.favourite && b.favourite) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Eat Out / Order In">
      <div className="flex flex-col h-full">
        {!selectedPlace ? (
          <>
            {/* Search and Filters */}
            <div className="p-4 space-y-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search places..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {getAllPlaceTypes().map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterType === type
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getPlaceTypeLabel(type)}
                  </button>
                ))}
                <button
                  onClick={() => setShowFavouritesOnly(!showFavouritesOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    showFavouritesOnly
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Star size={14} className={showFavouritesOnly ? 'fill-current' : ''} />
                  Favourites
                </button>
              </div>
            </div>

            {/* Places List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading places...</div>
              ) : sortedPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No places found</p>
                  <button
                    onClick={() => setShowAddPlace(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Add New Place
                  </button>
                </div>
              ) : (
                <>
                  {sortedPlaces.map(place => (
                    <button
                      key={place.id}
                      onClick={() => handlePlaceSelect(place)}
                      className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed size={20} className="text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{place.name}</h3>
                            {place.favourite && (
                              <Star size={14} className="text-orange-500 fill-orange-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <span className="text-orange-600 font-medium">{getPlaceTypeLabel(place.type)}</span>
                            {place.cuisine && (
                              <>
                                <span>•</span>
                                <span>{place.cuisine}</span>
                              </>
                            )}
                            {place.location_text && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span className="truncate">{place.location_text}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {place.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {place.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {place.tags.length > 3 && (
                                <span className="px-2 py-0.5 text-gray-500 text-xs">
                                  +{place.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddPlace(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Plus size={18} />
                      <span className="font-medium">Add New Place</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Place Details & Order Selection */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{selectedPlace.name}</h3>
                      {selectedPlace.favourite && (
                        <Star size={16} className="text-orange-500 fill-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <span className="text-orange-600 font-medium">{getPlaceTypeLabel(selectedPlace.type)}</span>
                      {selectedPlace.cuisine && (
                        <>
                          <span>•</span>
                          <span>{selectedPlace.cuisine}</span>
                        </>
                      )}
                    </div>
                    {selectedPlace.location_text && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                        <MapPin size={12} />
                        <span>{selectedPlace.location_text}</span>
                      </div>
                    )}
                    {selectedPlace.website_url && (
                      <a
                        href={selectedPlace.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
                      >
                        <Globe size={12} />
                        <span>Visit website</span>
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPlace(null);
                      setSelectedOrder(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Saved Orders (Optional)</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedOrder === null
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900">No specific order</span>
                  </button>
                  {/* TODO: Load and display place orders */}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., 'Use 2-for-1 voucher', 'Meet Sam', 'Order ahead'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <button
                onClick={handleConfirm}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors font-medium"
              >
                Assign to {mealSlotLabel || 'Meal Slot'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
