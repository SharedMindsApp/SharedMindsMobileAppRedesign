import { useState, useEffect } from 'react';
import { X, Plane, Users, Heart, Home, PartyPopper, MapPin, Check } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import * as travelService from '../../../lib/travelService';
import type { Trip } from '../../../lib/travelService';
import { showToast } from '../../Toast';

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

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onSaved: () => void;
}

export function EditTripModal({ isOpen, onClose, trip, onSaved }: EditTripModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trip_type: 'solo' as TripType,
    start_date: '',
    end_date: '',
    visibility: 'personal' as Visibility,
  });

  // Load trip data into form when modal opens
  useEffect(() => {
    if (trip && isOpen) {
      setFormData({
        name: trip.name || '',
        description: trip.description || '',
        trip_type: (trip.trip_type || 'solo') as TripType,
        start_date: trip.start_date ? trip.start_date.split('T')[0] : '',
        end_date: trip.end_date ? trip.end_date.split('T')[0] : '',
        visibility: (trip.visibility || 'personal') as Visibility,
      });
    }
  }, [trip, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;

    setLoading(true);
    try {
      const updates = {
        name: formData.name,
        description: formData.description || null,
        trip_type: formData.trip_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        visibility: formData.visibility,
      };

      await travelService.updateTrip(trip.id, updates);
      showToast('success', 'Trip updated successfully');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating trip:', error);
      showToast('error', 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  }

  if (!trip) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Trip"
      maxHeight="90vh"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip Name */}
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
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What are you most excited about?"
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-sm sm:text-base"
          />
        </div>

        {/* Trip Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Trip Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TRIP_TYPES.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, trip_type: value })}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  formData.trip_type === value
                    ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-slate-800 text-center">{label}</p>
                {formData.trip_type === value && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base"
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
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Visibility
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'personal' })}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                formData.visibility === 'personal'
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium text-slate-800 text-sm">Personal</p>
              <p className="text-xs text-slate-600 mt-0.5">Only you can see this trip</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'shared' })}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                formData.visibility === 'shared'
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium text-slate-800 text-sm">Shared</p>
              <p className="text-xs text-slate-600 mt-0.5">Share with household/spaces</p>
            </button>
          </div>
        </div>

        {/* Form Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
