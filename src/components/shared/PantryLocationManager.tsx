/**
 * PantryLocationManager Component
 *
 * Uses BottomSheet on mobile, centered modal on desktop.
 * Manages pantry locations (add, edit, delete).
 * Shows warnings when deleting locations with items.
 *
 * ADHD-First Principles:
 * - Clear warnings but no blocking
 * - Reversible actions
 * - Calm, non-judgmental language
 */

import { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Settings, Check } from 'lucide-react';
import { PantryLocation } from '../../lib/pantryLocations';
import { createPantryLocation, updatePantryLocation, deletePantryLocation } from '../../lib/pantryLocations';
import { showToast } from '../Toast';
import { PantryItem } from '../../lib/intelligentGrocery';
import { BottomSheet } from './BottomSheet';

interface PantryLocationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  locations: PantryLocation[];
  pantryItems: PantryItem[];
  spaceId: string;
  onLocationsUpdated: () => void;
}

export function PantryLocationManager({
  isOpen,
  onClose,
  locations,
  pantryItems,
  spaceId,
  onLocationsUpdated,
}: PantryLocationManagerProps) {
  const LOCATION_EMOJIS = [
    { emoji: '🧊', label: 'Fridge' },
    { emoji: '❄️', label: 'Freezer' },
    { emoji: '🧺', label: 'Cupboard' },
    { emoji: '📦', label: 'Storage Box' },
    { emoji: '🥫', label: 'Tinned Goods' },
    { emoji: '🫙', label: 'Jars & Preserves' },
    { emoji: '🗄️', label: 'Cabinet' },
    { emoji: '🍳', label: 'Kitchen' },
    { emoji: '🧂', label: 'Spice Rack' },
    { emoji: '🍷', label: 'Drinks' },
    { emoji: '🥡', label: 'Containers' },
    { emoji: '🏠', label: 'House' },
    { emoji: '🚪', label: 'Utility Room' },
    { emoji: '🏚️', label: 'Shed' },
    { emoji: '🛖', label: 'Outbuilding' },
    { emoji: '🧱', label: 'Garage' },
    { emoji: '🪴', label: 'Garden' },
    { emoji: '🚗', label: 'Car' },
    { emoji: '🎒', label: 'Go-Bag' },
  ];
  const [previewEmoji, setPreviewEmoji] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmojiTap = (emoji: string) => {
    // Toggle selection
    setFormData(prev => ({ ...prev, icon: prev.icon === emoji ? '' : emoji }));
    // Show label preview briefly (for mobile users)
    setPreviewEmoji(emoji);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setPreviewEmoji(null), 2000);
  };

  const [editingLocation, setEditingLocation] = useState<PantryLocation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (location: PantryLocation) => {
    setEditingLocation(location);
    setFormData({ name: location.name, icon: location.icon || '' });
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingLocation(null);
    setShowAddForm(false);
    setFormData({ name: '', icon: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('info', 'Please enter a location name');
      return;
    }

    try {
      setIsSaving(true);

      if (editingLocation) {
        await updatePantryLocation(editingLocation.id, {
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
        });
        showToast('success', 'Location updated');
      } else {
        await createPantryLocation({
          spaceId,
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
        });
        showToast('success', 'Location created');
      }

      handleCancel();
      onLocationsUpdated();
    } catch (error: any) {
      console.error('Failed to save location:', error);
      if (
        error?.code === '23505' ||
        error?.status === 409 ||
        error?.statusCode === 409 ||
        (error?.message && (
          error.message.includes('unique constraint') ||
          error.message.includes('duplicate') ||
          error.message.includes('already exists')
        ))
      ) {
        showToast('error', 'A location with this name already exists');
      } else {
        showToast('error', 'Failed to save location');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (location: PantryLocation) => {
    const itemsInLocation = pantryItems.filter(item => item.location_id === location.id);
    const itemCount = itemsInLocation.length;

    if (itemCount > 0) {
      const confirmed = window.confirm(
        `This location has ${itemCount} item${itemCount === 1 ? '' : 's'} in it. ` +
        `Deleting it will move those items to "Unassigned". Are you sure you want to delete "${location.name}"?`
      );
      if (!confirmed) return;
    }

    try {
      setDeletingLocationId(location.id);
      await deletePantryLocation(location.id);
      showToast('success', 'Location deleted');
      onLocationsUpdated();
    } catch (error) {
      console.error('Failed to delete location:', error);
      showToast('error', 'Failed to delete location');
    } finally {
      setDeletingLocationId(null);
    }
  };

  const handleClose = () => {
    handleCancel();
    onClose();
  };

  const getItemCount = (locationId: string) => {
    return pantryItems.filter(item => item.location_id === locationId).length;
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100">
            <Settings size={18} className="text-stone-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Manage Locations</h3>
            <p className="text-sm text-stone-500">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      }
      footer={
        <button
          onClick={handleClose}
          className="w-full rounded-xl bg-stone-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-900 min-h-[48px]"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        {/* Add/Edit Form */}
        {(showAddForm || editingLocation) && (
          <div className="rounded-2xl border-2 border-stone-200 bg-stone-50/70 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-stone-900">
              {editingLocation ? 'Edit Location' : 'New Location'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pantry, Spice Rack"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Icon (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_EMOJIS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    type="button"
                    title={label}
                    onClick={() => handleEmojiTap(emoji)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                      formData.icon === emoji
                        ? 'bg-stone-800 ring-2 ring-stone-800 ring-offset-1 scale-110'
                        : 'bg-white border border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {/* Preview label — shows on tap (mobile) or when selected */}
              {previewEmoji && !formData.icon && (
                <p className="text-xs text-stone-500 mt-1.5 animate-pulse">
                  {LOCATION_EMOJIS.find(e => e.emoji === previewEmoji)?.label}
                </p>
              )}
              {formData.icon && (
                <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1.5">
                  <span className="text-base">{formData.icon}</span>
                  <span className="font-medium text-stone-700">
                    {LOCATION_EMOJIS.find(e => e.emoji === formData.icon)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, icon: '' })); setPreviewEmoji(null); }}
                    className="text-stone-400 hover:text-stone-600 underline ml-1"
                  >
                    clear
                  </button>
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Check size={16} />
                {isSaving ? 'Saving...' : editingLocation ? 'Save' : 'Add Location'}
              </button>
              <button
                onClick={handleCancel}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Button (when form is hidden) */}
        {!showAddForm && !editingLocation && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingLocation(null);
              setFormData({ name: '', icon: '' });
            }}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-3.5 transition-all hover:border-stone-400 hover:bg-stone-50/50 flex items-center justify-center gap-2 text-stone-600 min-h-[48px]"
          >
            <Plus size={18} />
            <span className="font-semibold text-sm">Add Location</span>
          </button>
        )}

        {/* Locations List */}
        <div className="space-y-2">
          {locations.length === 0 ? (
            <div className="rounded-2xl bg-stone-50/70 p-6 text-center">
              <p className="text-sm text-stone-500">No locations yet. Add one to get started.</p>
            </div>
          ) : (
            locations.map((location) => {
              const itemCount = getItemCount(location.id);
              const isDeleting = deletingLocationId === location.id;
              const isEditing = editingLocation?.id === location.id;

              return (
                <div
                  key={location.id}
                  className={`rounded-2xl border-2 p-3.5 transition-colors ${
                    isEditing
                      ? 'border-stone-500 bg-stone-50/50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {location.icon ? (
                        <span className="text-xl flex-shrink-0 w-8 text-center">{location.icon}</span>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-stone-400 text-xs font-bold">{location.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-sm">{location.name}</p>
                        <p className="text-xs text-stone-500">
                          {itemCount === 0
                            ? 'No items'
                            : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(location)}
                        disabled={isEditing || isDeleting}
                        className="p-2.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(location)}
                        disabled={isDeleting}
                        className="p-2.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
