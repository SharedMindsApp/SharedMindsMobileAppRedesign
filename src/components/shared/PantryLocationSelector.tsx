/**
 * PantryLocationSelector Component
 *
 * Full-screen mobile sheet for adding an item to pantry.
 * Keeps the flow lightweight but no longer submits immediately on location tap.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { FoodItem } from '../../lib/foodItems';
import { PANTRY_ITEM_TYPES, type PantryItemType } from '../../lib/intelligentGrocery';
import { PantryLocation, createPantryLocation } from '../../lib/pantryLocations';
import { showToast } from '../Toast';
import { BottomSheet } from './BottomSheet';

const CONTAINER_COUNT_UNITS = new Set([
  'item', 'items',
  'can', 'cans',
  'tin', 'tins',
  'jar', 'jars',
  'bottle', 'bottles',
  'carton', 'cartons',
  'pack', 'packs',
  'bag', 'bags',
  'box', 'boxes',
  'pouch', 'pouches',
  'sachet', 'sachets',
  'tube', 'tubes',
  'loaf', 'loaves',
  'piece', 'pieces',
  'roll', 'rolls',
  'bunch', 'bunches',
]);

const UNIT_OPTIONS = [
  { value: 'item', label: 'Item' },
  { value: 'can', label: 'Can' },
  { value: 'tin', label: 'Tin' },
  { value: 'jar', label: 'Jar' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'carton', label: 'Carton' },
  { value: 'pack', label: 'Pack' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'pouch', label: 'Pouch' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'tube', label: 'Tube' },
  { value: 'loaf', label: 'Loaf' },
  { value: 'piece', label: 'Piece' },
  { value: 'roll', label: 'Roll' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'pint', label: 'Pints' },
  { value: 'pt', label: 'Pint (pt)' },
  { value: 'L', label: 'Litres (L)' },
];

const WEIGHT_UNIT_OPTIONS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
];

interface PantryLocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (locationId: string | null) => void | Promise<void>;
  locations: PantryLocation[];
  lastUsedLocationId?: string | null;
  initialLocationId?: string | null;
  spaceId: string;
  onLocationCreated?: (location: PantryLocation) => void;
  foodItem?: FoodItem | null;
  smartDefaultHint?: string | null;
  sheetTitle?: string;
  submitLabel?: string;
  quantityValue?: string;
  quantityUnit?: string;
  weightValue?: string;
  weightUnit?: string;
  estimatedCost?: string;
  expiresOn?: string;
  itemType?: PantryItemType | null;
  itemName?: string;
  itemDescription?: string;
  onItemNameChange?: (value: string) => void;
  onItemDescriptionChange?: (value: string) => void;
  notes?: string;
  onNotesChange?: (value: string) => void;
  onQuantityValueChange?: (value: string) => void;
  onQuantityUnitChange?: (value: string) => void;
  onWeightValueChange?: (value: string) => void;
  onWeightUnitChange?: (value: string) => void;
  onEstimatedCostChange?: (value: string) => void;
  onExpiresOnChange?: (value: string) => void;
  onItemTypeChange?: (value: PantryItemType | null) => void;
  totalPortions?: string;
  portionUnit?: string;
  onTotalPortionsChange?: (value: string) => void;
  onPortionUnitChange?: (value: string) => void;
  showLocationSection?: boolean;
  estimatedCostLabel?: string;
  estimatedCostHelpText?: string;
}

export function PantryLocationSelector({
  isOpen,
  onClose,
  onSelect,
  locations,
  lastUsedLocationId,
  initialLocationId,
  spaceId,
  onLocationCreated,
  foodItem = null,
  smartDefaultHint = null,
  sheetTitle = 'Add to pantry',
  submitLabel = 'Add to pantry',
  quantityValue = '',
  quantityUnit = '',
  weightValue = '',
  weightUnit = 'g',
  estimatedCost = '',
  expiresOn = '',
  itemType = null,
  itemName = '',
  itemDescription = '',
  onItemNameChange,
  onItemDescriptionChange,
  notes = '',
  onNotesChange,
  onQuantityValueChange,
  onQuantityUnitChange,
  onWeightValueChange,
  onWeightUnitChange,
  onEstimatedCostChange,
  onExpiresOnChange,
  onItemTypeChange,
  totalPortions = '',
  portionUnit = '',
  onTotalPortionsChange,
  onPortionUnitChange,
  showLocationSection = true,
  estimatedCostLabel = 'Estimated cost (optional)',
  estimatedCostHelpText = 'Used for the Pantry budget view and printable value report.',
}: PantryLocationSelectorProps) {
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(lastUsedLocationId ?? null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setShowAddLocation(false);
    setShowUnitPicker(false);
    setShowWeightUnitPicker(false);
    setIsSubmitting(false);
    setSelectedLocationId(initialLocationId ?? lastUsedLocationId ?? null);
    setNewLocationName('');
    setNewLocationIcon('');
  }, [isOpen, initialLocationId, lastUsedLocationId]);

  const selectedUnitLabel =
    UNIT_OPTIONS.find((unit) => unit.value === quantityUnit)?.label || 'Select unit';
  const selectedWeightUnitLabel =
    WEIGHT_UNIT_OPTIONS.find((unit) => unit.value === weightUnit)?.label || 'Select weight unit';
  const displayItemName = itemName.trim() || foodItem?.name || 'Selected item';
  const showWeightFields =
    CONTAINER_COUNT_UNITS.has(quantityUnit.trim().toLowerCase()) || weightValue.trim().length > 0;

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      showToast('info', 'Please enter a location name');
      return;
    }

    try {
      setIsCreating(true);
      const location = await createPantryLocation({
        spaceId,
        name: newLocationName.trim(),
        icon: newLocationIcon.trim() || null,
      });

      onLocationCreated?.(location);
      setSelectedLocationId(location.id);
      setNewLocationName('');
      setNewLocationIcon('');
      setShowAddLocation(false);
      showToast('success', 'Location created');
    } catch (error: any) {
      console.error('Failed to create location:', error);
      if (error?.code === '23505' || error?.message?.includes('unique constraint') || error?.message?.includes('duplicate')) {
        showToast('error', 'A location with this name already exists');
      } else {
        showToast('error', 'Failed to create location');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSelect(selectedLocationId));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={showAddLocation ? 'Add location' : sheetTitle}
      footer={!showAddLocation ? (
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 min-h-[44px] disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      ) : undefined}
    >
      {!showAddLocation ? (
        <div className="space-y-5">
          {foodItem && (
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  {foodItem.emoji || '📦'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Adding item
                  </p>
                  <h3 className="truncate text-lg font-semibold text-stone-900">{displayItemName}</h3>
                  {foodItem.category && (
                    <p className="text-sm text-stone-500">{foodItem.category}</p>
                  )}
                </div>
              </div>
              {smartDefaultHint && (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {smartDefaultHint}
                </div>
              )}
            </div>
          )}

          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-stone-900">Stock details</h4>
            <p className="mt-1 text-xs text-stone-500">
              Start with a sensible default, then adjust if this pack is different.
            </p>

            {(onItemNameChange || onItemDescriptionChange) && (
              <div className="mt-4 grid gap-3">
                {onItemNameChange && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Item name</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => onItemNameChange(e.target.value)}
                      placeholder="e.g. Packet Rice"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    />
                  </div>
                )}
                {onItemDescriptionChange && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Description / flavour (optional)</label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => onItemDescriptionChange(e.target.value)}
                      placeholder="e.g. Pilau Rice"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Keep the main item generic, then add the specific type here.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs text-gray-600">Category</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PANTRY_ITEM_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onItemTypeChange?.(type.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      itemType === type.value
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-sm font-semibold">
                      {type.emoji} {type.label}
                    </div>
                    <div className={`mt-1 text-xs ${itemType === type.value ? 'text-stone-200' : 'text-stone-500'}`}>
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                <input
                  type="text"
                  value={quantityValue}
                  onChange={(e) => onQuantityValueChange?.(e.target.value)}
                  placeholder="e.g., 1, 2, 6"
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unit</label>
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setShowUnitPicker(true)}
                    className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-stone-900 min-h-[44px]"
                  >
                    <span>{selectedUnitLabel}</span>
                    <ChevronDown size={18} className="text-stone-500" />
                  </button>
                ) : (
                  <select
                    value={quantityUnit}
                    onChange={(e) => onQuantityUnitChange?.(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-stone-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                  >
                    <option value="">Select unit</option>
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {['1', '2', '3', '6'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onQuantityValueChange?.(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    quantityValue === value
                      ? 'border-stone-500 bg-stone-100 text-stone-900'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {showWeightFields && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Pack weight</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightValue}
                    onChange={(e) => onWeightValueChange?.(e.target.value)}
                    placeholder="e.g., 400, 2.5"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Weight unit</label>
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setShowWeightUnitPicker(true)}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-stone-900 min-h-[44px]"
                    >
                      <span>{selectedWeightUnitLabel}</span>
                      <ChevronDown size={18} className="text-stone-500" />
                    </button>
                  ) : (
                    <select
                      value={weightUnit}
                      onChange={(e) => onWeightUnitChange?.(e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-stone-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    >
                      {WEIGHT_UNIT_OPTIONS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">
                    Useful for packs like `1 bag` at `2.5kg` or `1 box` at `500g`.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs text-gray-600 mb-1">{estimatedCostLabel}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">£</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => onEstimatedCostChange?.(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {estimatedCostHelpText}
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-600 mb-1">Best before (optional)</label>
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => onExpiresOnChange?.(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only for your reference.
              </p>
            </div>

            {onNotesChange && (
              <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add any details you want to keep with this item"
                  rows={3}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
            )}
          </div>

          {showLocationSection && (
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-stone-900">Location</h4>
              <p className="mt-1 text-xs text-stone-500">Choose where this belongs before saving it.</p>

              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setSelectedLocationId(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all min-h-[44px] ${
                    selectedLocationId === null
                      ? 'border-stone-500 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">No location</div>
                  <div className="text-xs text-gray-500 mt-0.5">Leave unassigned</div>
                </button>

                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocationId(location.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all min-h-[44px] ${
                      selectedLocationId === location.id
                        ? 'border-stone-500 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {location.icon && <span className="text-lg">{location.icon}</span>}
                      <div>
                        <div className="font-medium text-gray-900">{location.name}</div>
                        {lastUsedLocationId === location.id && (
                          <div className="text-xs text-gray-500 mt-0.5">Last used</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddLocation(true)}
                className="mt-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-gray-700 min-h-[44px]"
              >
                <Plus size={18} />
                <span className="font-medium">Add location</span>
              </button>
            </div>
          )}

          <details className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-900">
              Portion tracking
            </summary>
            <p className="mt-2 text-xs text-gray-500">
              For items with fixed portions, like six servings of ice cream or eight slices of pizza.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Total portions</label>
                <input
                  type="number"
                  min="1"
                  value={totalPortions}
                  onChange={(e) => onTotalPortionsChange?.(e.target.value)}
                  placeholder="e.g., 6"
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Portion unit</label>
                <input
                  type="text"
                  value={portionUnit}
                  onChange={(e) => onPortionUnitChange?.(e.target.value)}
                  placeholder="e.g., serving, slice"
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if not tracking portions.
            </p>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location name
            </label>
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="e.g. Store Cupboard"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon (optional emoji)
            </label>
            <input
              type="text"
              value={newLocationIcon}
              onChange={(e) => setNewLocationIcon(e.target.value)}
              placeholder="e.g. 🍯"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddLocation(false);
                setNewLocationName('');
                setNewLocationIcon('');
              }}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors min-h-[44px]"
            >
              Back
            </button>
            <button
              onClick={handleCreateLocation}
              disabled={isCreating || !newLocationName.trim()}
              className="flex-1 px-4 py-2.5 bg-stone-500 hover:bg-stone-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <BottomSheet
        isOpen={showUnitPicker}
        onClose={() => setShowUnitPicker(false)}
        title="Select unit"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onQuantityUnitChange?.('');
              setShowUnitPicker(false);
            }}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
              quantityUnit === ''
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
            }`}
          >
            <div className="font-medium">No unit</div>
            <div className={`mt-1 text-xs ${quantityUnit === '' ? 'text-stone-200' : 'text-stone-500'}`}>
              Leave this item as a simple count
            </div>
          </button>

          {UNIT_OPTIONS.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => {
                onQuantityUnitChange?.(unit.value);
                setShowUnitPicker(false);
              }}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                quantityUnit === unit.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
              }`}
            >
              <div className="font-medium">{unit.label}</div>
              <div className={`mt-1 text-xs ${quantityUnit === unit.value ? 'text-stone-200' : 'text-stone-500'}`}>
                {unit.value}
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showWeightUnitPicker}
        onClose={() => setShowWeightUnitPicker(false)}
        title="Select weight unit"
      >
        <div className="space-y-2">
          {WEIGHT_UNIT_OPTIONS.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => {
                onWeightUnitChange?.(unit.value);
                setShowWeightUnitPicker(false);
              }}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                weightUnit === unit.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
              }`}
            >
              <div className="font-medium">{unit.label}</div>
              <div className={`mt-1 text-xs ${weightUnit === unit.value ? 'text-stone-200' : 'text-stone-500'}`}>
                {unit.value}
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </BottomSheet>
  );
}
