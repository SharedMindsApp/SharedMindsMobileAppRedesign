/**
 * Pantry Widget
 * 
 * Lightweight inventory view - what exists, not tasks.
 * Zero pressure, no warnings, no required quantities.
 * Uses unified food_items system.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, X, Square, Snowflake, Box, Edit2, Search, ShoppingCart, ChevronDown, Camera, Sparkles, ChefHat, Calendar, Settings } from 'lucide-react';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  addGroceryItem,
  updateGroceryItem,
  getOrCreateDefaultList,
  getGroceryItems,
  moveToPantry,
  type PantryItem,
  type PantryItemType,
  PANTRY_ITEM_TYPES,
} from '../../../lib/intelligentGrocery';
import { FoodPicker } from '../../shared/FoodPicker';
import { getFoodItemNames, type FoodItem } from '../../../lib/foodItems';
import { getPantryBasedRecipeSuggestions } from '../../../lib/foodIntelligence';
import { getMealLibrary, getWeekStartDate } from '../../../lib/mealPlanner';
import { showToast } from '../../Toast';
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';
import { SpaceContextSwitcher } from '../../shared/SpaceContextSwitcher';
import { MakeableRecipesModal } from '../../shared/MakeableRecipesModal';
import { WeeklyPantryCheckSheet } from '../../meal-planner/WeeklyPantryCheckSheet';
import {
  ensureDefaultLocations,
  type PantryLocation
} from '../../../lib/pantryLocations';
import { getPantryAddDefaults } from '../../../lib/pantryAddDefaults';
import { exportPantryCsv, printPantryAuditChecklist, printPantryBudgetReport } from '../../../lib/pantryExport';
import {
  PANTRY_QUICK_PICK_ITEMS,
  PANTRY_STARTER_SECTIONS,
  getPantryStarterEstimatedCost,
} from '../../../lib/pantryStaples';
import { PantryLocationSelector } from '../../shared/PantryLocationSelector';
import { PantryLocationManager } from '../../shared/PantryLocationManager';
import { PantrySettingsSheet } from '../../shared/PantrySettingsSheet';
import { BottomSheet } from '../../shared/BottomSheet';
import { getPantrySpaceSettings, updatePantrySpaceSettings } from '../../../lib/pantrySettings';

interface PantryWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
}

// Group pantry items by location
const LOCATION_GROUPS: Record<string, { label: string; icon: any; color: string }> = {
  fridge: { label: 'Fridge', icon: Square, color: 'bg-blue-50 border-blue-200' },
  freezer: { label: 'Freezer', icon: Snowflake, color: 'bg-cyan-50 border-cyan-200' },
  cupboard: { label: 'Cupboard', icon: Box, color: 'bg-amber-50 border-amber-200' },
};

export function PantryWidget({ householdId, viewMode }: PantryWidgetProps) {
  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [foodItemNames, setFoodItemNames] = useState<Record<string, string>>({});
  const [recipeSuggestions, setRecipeSuggestions] = useState<number>(0);
  const [showRecipeSuggestions, setShowRecipeSuggestions] = useState(false);

  // Location selection state
  const [pendingFoodItem, setPendingFoodItem] = useState<FoodItem | null>(null);
  const [lastUsedLocationId, setLastUsedLocationId] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [pantryLocations, setPantryLocations] = useState<PantryLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showManageLocations, setShowManageLocations] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [autoReplaceEnabled, setAutoReplaceEnabled] = useState(false);
  const [autoReplaceLoading, setAutoReplaceLoading] = useState(false);
  const [locationsExpanded, setLocationsExpanded] = useState(false);
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

  const toggleLocationCollapse = (locationId: string) => {
    setCollapsedLocations(prev => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };
  const navigate = useNavigate();

  // Unit picker
  const UNIT_GROUPS = [
    { label: 'Weight', units: [
      { value: 'g', display: 'g', description: 'grams' },
      { value: 'kg', display: 'kg', description: 'kilograms' },
      { value: 'oz', display: 'oz', description: 'ounces' },
      { value: 'lb', display: 'lb', description: 'pounds' },
    ]},
    { label: 'Volume', units: [
      { value: 'ml', display: 'ml', description: 'millilitres' },
      { value: 'L', display: 'L', description: 'litres' },
      { value: 'cups', display: 'cups', description: 'cups' },
      { value: 'tbsp', display: 'tbsp', description: 'tablespoons' },
      { value: 'tsp', display: 'tsp', description: 'teaspoons' },
    ]},
    { label: 'Containers', units: [
      { value: 'tins', display: 'tins', description: '' },
      { value: 'cans', display: 'cans', description: '' },
      { value: 'jars', display: 'jars', description: '' },
      { value: 'bottles', display: 'bottles', description: '' },
      { value: 'cartons', display: 'cartons', description: '' },
      { value: 'packs', display: 'packs', description: '' },
      { value: 'bags', display: 'bags', description: '' },
      { value: 'boxes', display: 'boxes', description: '' },
      { value: 'sachets', display: 'sachets', description: '' },
      { value: 'tubes', display: 'tubes', description: '' },
    ]},
    { label: 'Count', units: [
      { value: 'pieces', display: 'pieces', description: '' },
      { value: 'slices', display: 'slices', description: '' },
      { value: 'servings', display: 'servings', description: '' },
      { value: 'dozen', display: 'dozen', description: '' },
      { value: 'rolls', display: 'rolls', description: '' },
      { value: 'sheets', display: 'sheets', description: '' },
      { value: 'loaves', display: 'loaves', description: '' },
      { value: 'bunch', display: 'bunch', description: '' },
      { value: 'head', display: 'head', description: '' },
      { value: 'cloves', display: 'cloves', description: '' },
    ]},
  ];
  // Units that represent containers/counts (not a direct measurement) — these should allow a secondary weight
  const CONTAINER_COUNT_UNITS = new Set([
    'tin', 'tins', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles', 'carton', 'cartons',
    'pack', 'packs', 'bag', 'bags', 'box', 'boxes', 'pouch', 'pouches', 'sachet', 'sachets',
    'tube', 'tubes', 'item', 'items', 'piece', 'pieces', 'slice', 'slices', 'serving', 'servings',
    'dozen', 'roll', 'rolls', 'sheet', 'sheets', 'loaf', 'loaves', 'bunch', 'head', 'clove', 'cloves',
  ]);

  const WEIGHT_UNITS = [
    { value: 'g', display: 'g', label: 'grams', factor: 1 },
    { value: 'kg', display: 'kg', label: 'kilograms', factor: 1000 },
    { value: 'oz', display: 'oz', label: 'ounces', factor: 28.3495 },
    { value: 'lb', display: 'lb', label: 'pounds', factor: 453.592 },
  ];

  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const unitPickerRef = useRef<HTMLDivElement>(null);

  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);
  const previousSpaceIdRef = useRef<string | null>(null);

  // Edit state
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editForm, setEditForm] = useState({
    location: '',
    quantityValue: '',
    quantityUnit: '',
    weightValue: '',
    weightUnit: 'g',
    expiresOn: '',
    estimatedCost: '',
    notes: '',
    status: 'have' as 'have' | 'low' | 'out',
    itemType: null as PantryItemType | null,
  });

  // Quantity editing state (inline)
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [quantityValueInput, setQuantityValueInput] = useState('');
  const [quantityUnitInput, setQuantityUnitInput] = useState('');
  const quantityValueInputRef = useRef<HTMLInputElement>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<PantryItemType | null>(null);

  // Makeable recipes modal state
  const [showMakeableRecipes, setShowMakeableRecipes] = useState(false);

  // Weekly pantry check state
  const [showPantryCheck, setShowPantryCheck] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PantryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Pending item form state (for adding new items)
  const [pendingQuantityValue, setPendingQuantityValue] = useState('');
  const [pendingQuantityUnit, setPendingQuantityUnit] = useState('');
  const [pendingWeightValue, setPendingWeightValue] = useState('');
  const [pendingWeightUnit, setPendingWeightUnit] = useState('g');
  const [pendingExpiresOn, setPendingExpiresOn] = useState('');
  const [pendingTotalPortions, setPendingTotalPortions] = useState('');
  const [pendingPortionUnit, setPendingPortionUnit] = useState('');
  const [pendingItemType, setPendingItemType] = useState<PantryItemType | null>(null);
  const [pendingEstimatedCost, setPendingEstimatedCost] = useState('');
  const [pendingDefaultHint, setPendingDefaultHint] = useState<string | null>(null);
  const [showRestockDecisionSheet, setShowRestockDecisionSheet] = useState(false);
  const [pendingExistingMatches, setPendingExistingMatches] = useState<PantryItem[]>([]);
  const [pendingMergeTargetId, setPendingMergeTargetId] = useState<string | null>(null);
  const [pendingAddMode, setPendingAddMode] = useState<'new_batch' | 'merge'>('new_batch');

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);

  // Load pantry locations and ensure defaults exist
  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      loadPantryLocations();
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (!currentSpaceId || isSwitching()) return;

    let cancelled = false;

    const loadPantrySettings = async () => {
      try {
        const settings = await getPantrySpaceSettings(currentSpaceId);
        if (!cancelled) {
          setAutoReplaceEnabled(settings.auto_add_replacements_to_shopping_list);
        }
      } catch (error) {
        console.error('Failed to load pantry settings:', error);
        if (!cancelled) {
          setAutoReplaceEnabled(false);
        }
      }
    };

    loadPantrySettings();

    return () => {
      cancelled = true;
    };
  }, [currentSpaceId]);

  // Clear all space-specific data and reload when space changes
  // This ensures seamless switching between households/spaces
  useEffect(() => {
    // Only refresh if space actually changed (not on initial mount)
    const spaceChanged = previousSpaceIdRef.current !== null && previousSpaceIdRef.current !== currentSpaceId;

    if (currentSpaceId && spaceChanged) {
      console.log('[PantryWidget] Space changed, refreshing data:', {
        previous: previousSpaceIdRef.current,
        current: currentSpaceId
      });

      // Clear existing data immediately to avoid showing stale data from previous space
      setPantryItems([]);
      setPantryLocations([]);
      setRecipeSuggestions(0);
      // Reset any edit states when context changes
      setEditingItem(null);
      setEditingQuantityId(null);
      setPendingFoodItem(null);
      setPendingQuantityValue('');
      setPendingQuantityUnit('');
      setPendingExpiresOn('');
      setPendingTotalPortions('');
      setPendingPortionUnit('');
      setPendingEstimatedCost('');
      setPendingItemType(null);
      setPendingDefaultHint(null);
      setPendingExistingMatches([]);
      setPendingMergeTargetId(null);
      setPendingAddMode('new_batch');
      setShowRestockDecisionSheet(false);
      setSearchQuery('');
      setSelectedLocationFilter(null);
      // Set loading state to show we're loading new data
      setLoading(true);

      // Reload data for the new space immediately
      loadPantryItems(getAbortSignal());
      loadPantryLocations();
    }

    // Update previous space ID ref AFTER checking for changes
    if (currentSpaceId) {
      previousSpaceIdRef.current = currentSpaceId;
    }
  }, [currentSpaceId]);

  // Load pantry items on initial mount (when space hasn't changed)
  useEffect(() => {
    // Skip if we just switched spaces (handled by the space change effect above)
    const spaceJustChanged = previousSpaceIdRef.current !== null && previousSpaceIdRef.current !== currentSpaceId;
    if (spaceJustChanged) {
      return; // Space change effect will handle the refresh
    }

    // Only load if not currently switching
    if (!currentSpaceId || isSwitching()) return;

    const abortSignal = getAbortSignal();
    loadPantryItems(abortSignal);
  }, [currentSpaceId]);

  useEffect(() => {
    if (pantryItems.length > 0 && !isSwitching()) {
      loadRecipeSuggestions();
    } else {
      setRecipeSuggestions(0);
    }
  }, [pantryItems.length, currentSpaceId]);

  useEffect(() => {
    if (pantryItems.length > 0) {
      const foodItemIds = pantryItems.map(item => item.food_item_id).filter(Boolean);
      getFoodItemNames(foodItemIds).then(names => {
        setFoodItemNames(names);
      });
    }
  }, [pantryItems]);

  const loadPantryLocations = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;

    try {
      setLoadingLocations(true);
      // Ensure default locations exist (silent setup)
      const locations = await ensureDefaultLocations(currentSpaceId);

      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId) {
        return;
      }

      setPantryLocations(locations);

      // Restore last used location from sessionStorage
      const lastUsedKey = `last_used_location_${currentSpaceId}`;
      const lastUsed = sessionStorage.getItem(lastUsedKey);
      if (lastUsed && locations.some(l => l.id === lastUsed)) {
        setLastUsedLocationId(lastUsed);
      }
    } catch (error) {
      console.error('Failed to load pantry locations:', error);
    } finally {
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoadingLocations(false);
      }
    }
  };

  const handleLocationsUpdated = async () => {
    await loadPantryLocations();
    await loadPantryItems(getAbortSignal());
  };

  const loadPantryItems = async (abortSignal?: AbortSignal | null) => {
    // Check if context has changed during load
    const expectedSpaceId = contextSpaceIdRef.current;

    try {
      setLoading(true);
      const items = await getPantryItems(currentSpaceId);

      // Verify we're still loading for the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return; // Context changed, discard results
      }

      setPantryItems(items);
    } catch (error: any) {
      // Ignore aborted requests
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }

      console.error('Failed to load pantry items:', error);
      showToast('error', 'Failed to load pantry');
    } finally {
      // Only update loading state if context hasn't changed
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoading(false);
      }
    }
  };

  function parseNumericQuantity(value: string | null | undefined) {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumericQuantity(value: number) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2).replace(/\.?0+$/, '');
  }

  function formatReplacementQuantity(quantity: number, unit: string | null | undefined) {
    return {
      quantity: formatNumericQuantity(quantity),
      unit: unit?.trim() || 'item',
    };
  }

  function getSoonestExpiry(first?: string | null, second?: string | null) {
    if (first && second) return first <= second ? first : second;
    return first || second || null;
  }

  const resetPendingPantryForm = () => {
    setPendingFoodItem(null);
    setPendingQuantityValue('');
    setPendingQuantityUnit('');
    setPendingWeightValue('');
    setPendingWeightUnit('g');
    setPendingExpiresOn('');
    setPendingTotalPortions('');
    setPendingPortionUnit('');
    setPendingEstimatedCost('');
    setPendingItemType(null);
    setPendingDefaultHint(null);
    setPendingExistingMatches([]);
    setPendingMergeTargetId(null);
    setPendingAddMode('new_batch');
    setShowRestockDecisionSheet(false);
  };

  const getPantryBatchSummary = (item: PantryItem) => {
    const quantity = [item.quantity_value || item.quantity, item.quantity_unit || item.unit].filter(Boolean).join(' ');
    const locationName =
      item.pantry_location?.name ||
      pantryLocations.find((location) => location.id === item.location_id)?.name ||
      'Unassigned';
    const expiryLabel = item.expires_on
      ? `Best before ${new Date(item.expires_on).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : 'No expiry set';

    return {
      quantity: quantity || 'No quantity set',
      locationName,
      expiryLabel,
    };
  };

  const beginPendingPantryFlow = (
    foodItem: FoodItem,
    meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }
  ) => {
    const defaults = getPantryAddDefaults(foodItem);
    const defaultEstimatedCost = meta?.estimatedCost ?? getPantryStarterEstimatedCost(foodItem.name);
    const existingMatches = pantryItems
      .filter((item) => item.food_item_id === foodItem.id)
      .sort((a, b) => (a.expires_on || '9999-12-31').localeCompare(b.expires_on || '9999-12-31'));

    setPendingFoodItem(foodItem);
    setPendingQuantityValue(defaults.quantityValue);
    setPendingQuantityUnit(defaults.quantityUnit);
    setPendingWeightValue(defaults.weightValue);
    setPendingWeightUnit(defaults.weightUnit);
    setPendingExpiresOn('');
    setPendingTotalPortions('');
    setPendingPortionUnit('');
    setPendingEstimatedCost(
      defaultEstimatedCost !== null && defaultEstimatedCost !== undefined
        ? String(defaultEstimatedCost)
        : ''
    );
    setPendingItemType(meta?.pantryType ?? null);
    setPendingDefaultHint(defaults.hint);
    setPendingExistingMatches(existingMatches);
    setPendingMergeTargetId(existingMatches[0]?.id || null);
    setPendingAddMode('new_batch');

    if (existingMatches.length > 0) {
      setShowRestockDecisionSheet(true);
      return;
    }

    setShowLocationSelector(true);
  };

  const handleRestockAsNewBatch = () => {
    setPendingAddMode('new_batch');
    setShowRestockDecisionSheet(false);
    setShowLocationSelector(true);
  };

  const handleRestockAsMerge = () => {
    if (!pendingMergeTargetId) {
      showToast('info', 'Pick the stock batch you want to top up first');
      return;
    }

    setPendingAddMode('merge');
    setShowRestockDecisionSheet(false);
    setShowLocationSelector(true);
  };

  const mergePendingPantryItem = async () => {
    if (!pendingMergeTargetId) {
      throw new Error('Choose an existing batch to merge into.');
    }

    const targetItem = pantryItems.find((item) => item.id === pendingMergeTargetId);
    if (!targetItem) {
      throw new Error('The selected pantry batch could not be found.');
    }

    const incomingQuantityValue = pendingQuantityValue.trim();
    const incomingQuantityUnit = pendingQuantityUnit.trim();
    const existingQuantityValue = (targetItem.quantity_value || targetItem.quantity || '').trim();
    const existingQuantityUnit = (targetItem.quantity_unit || targetItem.unit || '').trim();

    let mergedQuantityValue = existingQuantityValue || null;
    let mergedQuantityUnit = existingQuantityUnit || incomingQuantityUnit || null;

    if (incomingQuantityValue) {
      if (!existingQuantityValue) {
        mergedQuantityValue = incomingQuantityValue;
        mergedQuantityUnit = incomingQuantityUnit || null;
      } else {
        const existingNumeric = parseNumericQuantity(existingQuantityValue);
        const incomingNumeric = parseNumericQuantity(incomingQuantityValue);

        if (existingNumeric === null || incomingNumeric === null) {
          throw new Error('Merge only works when both quantities are numeric. Add a new batch instead.');
        }

        if (
          existingQuantityUnit &&
          incomingQuantityUnit &&
          existingQuantityUnit.toLowerCase() !== incomingQuantityUnit.toLowerCase()
        ) {
          throw new Error('Merge only works when units match. Add a new batch instead.');
        }

        mergedQuantityValue = formatNumericQuantity(existingNumeric + incomingNumeric);
        mergedQuantityUnit = existingQuantityUnit || incomingQuantityUnit || null;
      }
    }

    const incomingCost = pendingEstimatedCost.trim()
      ? Number.parseFloat(pendingEstimatedCost.trim())
      : null;
    const incomingWeightValue = pendingWeightValue.trim();
    const incomingWeightUnit = pendingWeightUnit.trim() || 'g';
    let incomingEstimatedWeightGrams: number | null = null;
    if (incomingWeightValue) {
      const parsedWeight = Number.parseFloat(incomingWeightValue);
      if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
        throw new Error('Pack weight must be a valid number.');
      }
      const factor = WEIGHT_UNITS.find((unit) => unit.value === incomingWeightUnit)?.factor || 1;
      incomingEstimatedWeightGrams = Math.round(parsedWeight * factor);
    }

    let mergedEstimatedWeightGrams = targetItem.estimated_weight_grams ?? null;
    if (incomingEstimatedWeightGrams !== null) {
      if (
        targetItem.estimated_weight_grams !== null &&
        targetItem.estimated_weight_grams !== undefined &&
        targetItem.estimated_weight_grams !== incomingEstimatedWeightGrams
      ) {
        throw new Error('Merge only works when pack weights match. Add a new batch instead.');
      }
      mergedEstimatedWeightGrams = incomingEstimatedWeightGrams;
    }
    const mergedEstimatedCost =
      incomingCost !== null && !Number.isNaN(incomingCost)
        ? (targetItem.estimated_cost ?? 0) + incomingCost
        : targetItem.estimated_cost ?? null;

    const incomingPortions = pendingTotalPortions.trim()
      ? Number.parseInt(pendingTotalPortions.trim(), 10)
      : null;
    const incomingPortionUnit = pendingPortionUnit.trim();
    const existingPortionUnit = (targetItem.portion_unit || '').trim();

    let mergedTotalPortions = targetItem.total_portions ?? null;
    let mergedRemainingPortions = targetItem.remaining_portions ?? targetItem.total_portions ?? null;
    let mergedPortionUnit = targetItem.portion_unit || null;

    if (incomingPortions !== null && incomingPortions > 0) {
      if (
        existingPortionUnit &&
        incomingPortionUnit &&
        existingPortionUnit.toLowerCase() !== incomingPortionUnit.toLowerCase()
      ) {
        throw new Error('Merge only works when portion units match. Add a new batch instead.');
      }

      mergedTotalPortions = (targetItem.total_portions ?? 0) + incomingPortions;
      mergedRemainingPortions = (targetItem.remaining_portions ?? targetItem.total_portions ?? 0) + incomingPortions;
      mergedPortionUnit = targetItem.portion_unit || incomingPortionUnit || null;
    }

    const soonestExpiry = getSoonestExpiry(targetItem.expires_on, pendingExpiresOn || null);

    await updatePantryItem(targetItem.id, {
      quantity_value: mergedQuantityValue,
      quantity_unit: mergedQuantityUnit,
      expires_on: soonestExpiry,
      expiration_date: soonestExpiry,
      estimated_cost: mergedEstimatedCost,
      estimated_weight_grams: mergedEstimatedWeightGrams,
      item_type: targetItem.item_type || pendingItemType || null,
      status: 'have',
      total_portions: mergedTotalPortions,
      remaining_portions: mergedRemainingPortions,
      portion_unit: mergedPortionUnit,
    });
  };

  const handleFoodItemSelect = (
    foodItem: FoodItem,
    meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }
  ) => {
    setShowFoodPicker(false);
    beginPendingPantryFlow(foodItem, meta);
  };

  const handleLocationSelect = async (locationId: string | null) => {
    if (!pendingFoodItem) return;

    try {
      const estimatedCost = pendingEstimatedCost.trim()
        ? Number.parseFloat(pendingEstimatedCost.trim())
        : null;

      // Parse total portions if provided
      const totalPortions = pendingTotalPortions.trim()
        ? parseInt(pendingTotalPortions.trim(), 10)
        : null;
      let estimatedWeightGrams: number | null = null;
      const pendingWeightNumber = Number.parseFloat(pendingWeightValue.trim());
      if (!Number.isNaN(pendingWeightNumber) && pendingWeightNumber > 0) {
        const factor = WEIGHT_UNITS.find((unit) => unit.value === pendingWeightUnit)?.factor || 1;
        estimatedWeightGrams = Math.round(pendingWeightNumber * factor);
      }

      if (pendingAddMode === 'merge') {
        await mergePendingPantryItem();
      } else {
        await addPantryItem({
          householdId: currentSpaceId,
          foodItemId: pendingFoodItem.id,
          locationId: locationId || undefined,
          quantityValue: pendingQuantityValue.trim() || undefined,
          quantityUnit: pendingQuantityUnit.trim() || undefined,
          expiresOn: pendingExpiresOn || undefined,
          status: 'have',
          itemType: pendingItemType || undefined,
          estimatedCost: estimatedCost !== null && !Number.isNaN(estimatedCost) ? estimatedCost : null,
          estimatedWeightGrams,
          totalPortions: totalPortions && totalPortions > 0 ? totalPortions : null,
          portionUnit: pendingPortionUnit.trim() || null,
        });
      }

      // Remember last used location per space
      if (locationId && pendingAddMode !== 'merge') {
        setLastUsedLocationId(locationId);
        const lastUsedKey = `last_used_location_${currentSpaceId}`;
        sessionStorage.setItem(lastUsedKey, locationId);
      }

      await loadPantryItems(getAbortSignal());
      setShowLocationSelector(false);
      resetPendingPantryForm();
      showToast('success', pendingAddMode === 'merge' ? 'Merged into pantry stock' : 'Added to pantry');
    } catch (error) {
      console.error('Failed to add pantry item:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to add item');
    }
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
    // Convert estimated_weight_grams back to a user-friendly value + unit
    let weightValue = '';
    let weightUnit = 'g';
    if (item.estimated_weight_grams && item.estimated_weight_grams > 0) {
      const grams = item.estimated_weight_grams;
      if (grams >= 1000 && grams % 1000 === 0) {
        weightValue = String(grams / 1000);
        weightUnit = 'kg';
      } else {
        weightValue = String(grams);
        weightUnit = 'g';
      }
    }
    setEditForm({
      location: item.location_id || '',
      quantityValue: item.quantity_value || '',
      quantityUnit: item.quantity_unit || 'g',
      weightValue,
      weightUnit,
      expiresOn: item.expires_on ? item.expires_on.split('T')[0] : '',
      estimatedCost: item.estimated_cost !== null && item.estimated_cost !== undefined ? String(item.estimated_cost) : '',
      notes: item.notes || '',
      status: item.status || 'have',
      itemType: item.item_type || null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      // Convert editForm.location to location_id
      const locationId = editForm.location && editForm.location !== ''
        ? (pantryLocations.find(l => l.id === editForm.location)?.id || null)
        : null;

      // Convert weight value + unit to grams for storage
      let estimatedWeightGrams: number | null = null;
      const weightNum = parseFloat(editForm.weightValue);
      if (!isNaN(weightNum) && weightNum > 0) {
        const factor = WEIGHT_UNITS.find(u => u.value === editForm.weightUnit)?.factor || 1;
        estimatedWeightGrams = Math.round(weightNum * factor);
      }

      const estimatedCostValue = editForm.estimatedCost.trim()
        ? Number.parseFloat(editForm.estimatedCost.trim())
        : null;
      const replacementToAdd = getReplacementFromQuantityChange(
        editingItem,
        editForm.quantityValue.trim(),
        editForm.quantityUnit.trim()
      );

      await updatePantryItem(editingItem.id, {
        location_id: locationId,
        quantity_value: editForm.quantityValue.trim() || null,
        quantity_unit: editForm.quantityUnit.trim() || null,
        estimated_weight_grams: estimatedWeightGrams,
        expires_on: editForm.expiresOn || null,
        estimated_cost: estimatedCostValue !== null && !Number.isNaN(estimatedCostValue) ? estimatedCostValue : null,
        notes: editForm.notes || null,
        status: editForm.status || null,
        item_type: editForm.itemType || null,
      });
      const autoAdded = replacementToAdd
        ? await autoAddReplacementToShoppingList(editingItem, replacementToAdd)
        : false;
      await loadPantryItems(getAbortSignal());
      setEditingItem(null);
      showToast('success', autoAdded ? 'Updated and added replacement to shopping list' : 'Updated');
    } catch (error) {
      console.error('Failed to update item:', error);
      showToast('error', 'Failed to update item');
    }
  };

  const handleQuickLocationChange = async (itemId: string, locationId: string | null) => {
    try {
      await updatePantryItem(itemId, { location_id: locationId });
      await loadPantryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleQuantityEdit = (item: PantryItem) => {
    setEditingQuantityId(item.id);
    setQuantityValueInput(item.quantity_value || item.quantity || '');
    setQuantityUnitInput(item.quantity_unit || item.unit || '');
    setTimeout(() => {
      quantityValueInputRef.current?.focus();
    }, 0);
  };

  const handleQuantitySave = async (itemId: string) => {
    const value = quantityValueInput.trim();
    const unit = quantityUnitInput.trim();
    const item = pantryItems.find((entry) => entry.id === itemId);

    try {
      await updatePantryItem(itemId, {
        quantity_value: value || null,
        quantity_unit: unit || null,
      });
      const replacementToAdd = item ? getReplacementFromQuantityChange(item, value, unit) : null;
      const autoAdded = item && replacementToAdd
        ? await autoAddReplacementToShoppingList(item, replacementToAdd)
        : false;
      await loadPantryItems(getAbortSignal());
      setEditingQuantityId(null);
      setQuantityValueInput('');
      setQuantityUnitInput('');
      if (autoAdded) {
        showToast('success', 'Updated quantity and added replacement to shopping list');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleQuantityCancel = () => {
    setEditingQuantityId(null);
    setQuantityValueInput('');
    setQuantityUnitInput('');
  };


  const handleAddFromGroceryList = async () => {
    try {
      const groceryItems = await getGroceryItems(currentSpaceId);
      const checkedItems = groceryItems.filter(item => item.checked);

      if (checkedItems.length === 0) {
        showToast('info', 'No checked items in grocery list');
        return;
      }

      for (const item of checkedItems) {
        await moveToPantry(item, currentSpaceId);
      }

      await loadPantryItems(getAbortSignal());
      showToast('success', `Added ${checkedItems.length} item${checkedItems.length !== 1 ? 's' : ''} from grocery list`);
    } catch (error) {
      console.error('Failed to add from grocery list:', error);
      showToast('error', 'Failed to add items');
    }
  };

  const handleDeleteItem = (id: string) => {
    const item = pantryItems.find(i => i.id === id);
    if (!item) return;
    setPendingDeleteItem(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!pendingDeleteItem) return;

    setDeletingItemId(pendingDeleteItem.id);
    try {
      const autoAdded = await autoAddReplacementToShoppingList(
        pendingDeleteItem,
        getReplacementFromDeletion(pendingDeleteItem)
      );
      await deletePantryItem(pendingDeleteItem.id);
      await loadPantryItems(getAbortSignal());
      setPendingDeleteItem(null);
      showToast('success', autoAdded ? 'Item removed and added to shopping list' : 'Item removed from pantry');
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };


  const loadRecipeSuggestions = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();

    try {
      const allMeals = await getMealLibrary();
      const suggestions = await getPantryBasedRecipeSuggestions(allMeals, currentSpaceId, 50);

      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }

      setRecipeSuggestions(suggestions.length);
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load recipe suggestions:', error);
      // Silent fail - this is optional awareness
    }
  };

  // Filter items by search query, location, and item type
  const filteredItems = pantryItems.filter(item => {
    const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
    const matchesSearch = !searchQuery || itemName.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by location_id if selected
    if (selectedLocationFilter) {
      if (selectedLocationFilter === 'unassigned') {
        if (item.location_id) return false;
      } else {
        if (item.location_id !== selectedLocationFilter) return false;
      }
    }

    // Filter by item type if selected
    if (selectedTypeFilter) {
      if (item.item_type !== selectedTypeFilter) return false;
    }

    return matchesSearch;
  });

  // Group filtered items by location_id
  const itemsByLocationId = filteredItems.reduce((acc, item) => {
    const locationId = item.location_id || 'unassigned';
    if (!acc[locationId]) acc[locationId] = [];
    acc[locationId].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  // Sort locations by order_index, with unassigned at the end
  const sortedLocationIds = [
    ...pantryLocations
      .sort((a, b) => a.order_index - b.order_index)
      .map(loc => loc.id)
      .filter(id => itemsByLocationId[id] && itemsByLocationId[id].length > 0),
    ...(itemsByLocationId['unassigned'] && itemsByLocationId['unassigned'].length > 0 ? ['unassigned'] : [])
  ];

  const valuedPantryItems = pantryItems.filter(
    (item) => item.estimated_cost !== null && item.estimated_cost !== undefined
  );
  const totalEstimatedValue = valuedPantryItems.reduce(
    (sum, item) => sum + (item.estimated_cost || 0),
    0
  );
  const currentSpaceName = availableSpaces.find((space) => space.id === currentSpaceId)?.name || 'Pantry';

  const autoAddReplacementToShoppingList = async (
    item: PantryItem,
    replacement: { quantity: string; unit: string }
  ) => {
    if (!autoReplaceEnabled) return false;

    const defaultList = await getOrCreateDefaultList(currentSpaceId);
    const currentItems = await getGroceryItems(currentSpaceId, defaultList.id);
    const matchingItem = currentItems.find(
      (candidate) =>
        !candidate.checked &&
        candidate.food_item_id === item.food_item_id &&
        (candidate.unit || '').trim().toLowerCase() === replacement.unit.trim().toLowerCase()
    );

    const parsedIncoming = parseNumericQuantity(replacement.quantity);

    if (matchingItem) {
      const existingQuantity = parseNumericQuantity(matchingItem.quantity);
      if (existingQuantity !== null && parsedIncoming !== null) {
        await updateGroceryItem(matchingItem.id, {
          quantity: formatReplacementQuantity(existingQuantity + parsedIncoming, replacement.unit).quantity,
          unit: replacement.unit,
          checked: false,
        });
      } else {
        await updateGroceryItem(matchingItem.id, {
          checked: false,
        });
      }
      return true;
    }

    await addGroceryItem({
      householdId: currentSpaceId,
      listId: defaultList.id,
      foodItemId: item.food_item_id,
      quantity: replacement.quantity,
      unit: replacement.unit,
      category: item.category || item.food_item?.category || undefined,
      itemType: item.item_type || undefined,
      notes: 'Auto-added from Pantry use',
      source: 'pantry_auto_replace',
    });

    return true;
  };

  const getReplacementFromDeletion = (item: PantryItem) => {
    const quantityValue = item.quantity_value || item.quantity || '1';
    const quantityUnit = item.quantity_unit || item.unit || 'item';
    return {
      quantity: quantityValue,
      unit: quantityUnit,
    };
  };

  const getReplacementFromQuantityChange = (
    item: PantryItem,
    nextQuantityValue: string,
    nextQuantityUnit: string
  ) => {
    const previousValue = parseNumericQuantity(item.quantity_value || item.quantity);
    const nextValue = parseNumericQuantity(nextQuantityValue);
    const previousUnit = (item.quantity_unit || item.unit || '').trim().toLowerCase();
    const normalizedNextUnit = nextQuantityUnit.trim().toLowerCase();

    if (
      previousValue === null ||
      nextValue === null ||
      nextValue >= previousValue ||
      (previousUnit && normalizedNextUnit && previousUnit !== normalizedNextUnit)
    ) {
      return null;
    }

    return formatReplacementQuantity(previousValue - nextValue, nextQuantityUnit || item.quantity_unit || item.unit || 'item');
  };

  const handleAutoReplaceToggle = async (enabled: boolean) => {
    try {
      setAutoReplaceLoading(true);
      const settings = await updatePantrySpaceSettings(currentSpaceId, {
        auto_add_replacements_to_shopping_list: enabled,
      });
      setAutoReplaceEnabled(settings.auto_add_replacements_to_shopping_list);
      showToast('success', enabled ? 'Auto-replace enabled' : 'Auto-replace disabled');
    } catch (error) {
      console.error('Failed to update pantry automation setting:', error);
      showToast('error', 'Failed to update Pantry automation');
    } finally {
      setAutoReplaceLoading(false);
    }
  };

  const handleExportCsv = () => {
    try {
      exportPantryCsv(currentSpaceName, pantryItems, pantryLocations);
      setShowSettingsSheet(false);
      showToast('success', 'Pantry CSV exported');
    } catch (error) {
      console.error('Failed to export pantry CSV:', error);
      showToast('error', 'Failed to export Pantry CSV');
    }
  };

  const handlePrintChecklist = () => {
    try {
      printPantryAuditChecklist(currentSpaceName, pantryItems, pantryLocations);
      setShowSettingsSheet(false);
    } catch (error) {
      console.error('Failed to print pantry checklist:', error);
      showToast('error', 'Unable to open the audit checklist');
    }
  };

  const handlePrintBudgetReport = () => {
    try {
      printPantryBudgetReport(currentSpaceName, pantryItems, pantryLocations);
      setShowSettingsSheet(false);
    } catch (error) {
      console.error('Failed to print pantry budget report:', error);
      showToast('error', 'Unable to open the budget report');
    }
  };


  if (viewMode === 'icon') {
    const totalItems = pantryItems.length;
    return (
      <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-600 border-stone-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group relative">
        <Package size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
        {totalItems > 0 && (
          <div className="absolute top-1 right-1 bg-white text-stone-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {totalItems}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-stone-50 to-stone-100 border-stone-300 border-2 rounded-2xl p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-stone-500 p-1.5 rounded-lg">
              <Package size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Pantry</h3>
          </div>
          <span className="text-xs font-semibold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
            {pantryItems.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-xs text-stone-600 italic animate-pulse">Loading...</div>
          </div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700 mb-2">Your pantry starts here</p>
            <p className="text-xs text-stone-600 mb-4">Add items to see what you can make</p>
            <button
              onClick={() => setShowMakeableRecipes(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <ChefHat size={16} />
              What can I make?
            </button>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto max-h-[80px]">
            {pantryItems.slice(0, 4).map((item) => {
              const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
              return (
                <div key={item.id} className="flex items-center gap-1.5 text-xs">
                  {item.food_item?.emoji && (
                    <span className="flex-shrink-0">{item.food_item.emoji}</span>
                  )}
                  <span className="truncate text-gray-800">{itemName}</span>
                </div>
              );
            })}
            {pantryItems.length > 4 && (
              <p className="text-xs text-gray-500 text-center mt-1">+{pantryItems.length - 4} more</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <WidgetHeader
        icon={
          <div className="w-12 h-12 bg-gradient-to-br from-stone-500 to-stone-600 rounded-xl flex items-center justify-center shadow-md">
            <Package size={24} className="text-white" />
          </div>
        }
        title="Pantry"
        subtitle={
          (loading || spacesLoading) ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <div className="flex items-center gap-2">
              <span>
                {filteredItems.length + ' ' + (filteredItems.length === 1 ? 'item' : 'items') +
                  (searchQuery || selectedLocationFilter ? ` (of ${pantryItems.length})` : '')}
              </span>
              {/* Mobile-visible space switcher */}
              {availableSpaces.length > 1 && !spacesLoading && (
                <div className="sm:hidden flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-stone-500 text-xs">•</span>
                  <SpaceContextSwitcher
                    currentSpaceId={currentSpaceId}
                    onSpaceChange={setCurrentSpace}
                    availableSpaces={availableSpaces}
                    className="[&_button]:bg-stone-400/20 [&_button]:border-stone-400/30 [&_button]:text-stone-700 [&_button:hover]:bg-stone-400/30 [&_button]:text-xs [&_button]:px-2 [&_button]:py-0.5 [&_button]:h-auto [&_button]:min-h-0 [&_button_span]:text-stone-600 [&_button_span]:font-normal [&_button_svg]:text-stone-600 [&_button_svg]:w-3 [&_button_svg]:h-3 [&_div]:text-xs"
                  />
                </div>
              )}
            </div>
          )
        }
        currentSpaceId={currentSpaceId}
        onSpaceChange={setCurrentSpace}
        availableSpaces={availableSpaces}
        showSpaceSwitcher={availableSpaces.length > 1 && !spacesLoading}
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Primary Action - Add Item (Now prominently highlighted) */}
            <button
              onClick={() => setShowFoodPicker(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-[1rem] transition-colors flex items-center gap-2 min-h-[44px] touch-manipulation shadow-lg hover:shadow-xl font-bold order-last sm:order-first"
              title="Add to pantry"
            >
              <Plus size={20} className="flex-shrink-0" />
              <span className="hidden sm:inline">Add Item</span>
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-stone-300 mx-1 order-2" />

            {/* Utility Actions */}
            <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/60 order-3 shadow-sm">
              <button
                onClick={() => navigate('/pantry/scan')}
                className="p-2 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-600 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shadow-sm"
                title="Scan grocery receipt or pantry shelves"
              >
                <Camera size={18} />
              </button>

              <button
                onClick={() => setShowSettingsSheet(true)}
                className="p-2 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-600 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shadow-sm"
                title="Pantry settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        }
      />

      {/* Locations Overview — collapsible */}
      {pantryLocations.length > 0 && (
        <div className="mb-4 bg-stone-50 rounded-lg border border-stone-200 overflow-hidden">
          {/* Header — always visible, tap to expand/collapse */}
          <button
            type="button"
            onClick={() => setLocationsExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900">Locations</h4>
              <span className="text-xs text-stone-500">
                {pantryLocations.length} {pantryLocations.length === 1 ? 'location' : 'locations'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                onClick={(e) => { e.stopPropagation(); setShowManageLocations(true); }}
                className="text-xs text-stone-600 hover:text-stone-800 underline"
              >
                Manage
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-400 transition-transform duration-200 ${locationsExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Expandable location chips */}
          {locationsExpanded && (
            <div className="px-3 pb-3 flex flex-wrap gap-2">
              {pantryLocations.map((location) => {
                const itemCount = pantryItems.filter(item => item.location_id === location.id).length;
                return (
                  <div
                    key={location.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-xs"
                  >
                    {location.icon && <span>{location.icon}</span>}
                    <span className="font-medium text-gray-900">{location.name}</span>
                    <span className="text-gray-500">({itemCount})</span>
                  </div>
                );
              })}
              {pantryItems.filter(item => !item.location_id).length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-xs">
                  <span className="font-medium text-gray-900">Unassigned</span>
                  <span className="text-gray-500">({pantryItems.filter(item => !item.location_id).length})</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Filter */}
      {pantryItems.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pantry..."
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
          </div>

          {/* Item Type Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTypeFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTypeFilter === null
                  ? 'bg-stone-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
              All Types
            </button>
            {PANTRY_ITEM_TYPES.map((type) => {
              const count = pantryItems.filter(item => item.item_type === type.value).length;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedTypeFilter(selectedTypeFilter === type.value ? null : type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${selectedTypeFilter === type.value
                      ? 'bg-stone-700 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                >
                  <span>{type.emoji}</span>
                  {type.label}
                  {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              );
            })}
            {pantryItems.filter(item => !item.item_type).length > 0 && (
              <span className="px-2 py-1.5 text-xs text-stone-400 self-center">
                {pantryItems.filter(item => !item.item_type).length} uncategorised
              </span>
            )}
          </div>

          {/* Location Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedLocationFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedLocationFilter === null
                  ? 'bg-stone-500 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
            >
              All
            </button>
            {pantryLocations.map((location) => {
              const itemCount = pantryItems.filter(item => item.location_id === location.id).length;
              if (itemCount === 0) return null;

              return (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocationFilter(location.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${selectedLocationFilter === location.id
                      ? 'bg-stone-500 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                >
                  {location.icon && <span>{location.icon}</span>}
                  {location.name} ({itemCount})
                </button>
              );
            })}
            {pantryItems.filter(item => !item.location_id).length > 0 && (
              <button
                onClick={() => setSelectedLocationFilter('unassigned')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedLocationFilter === 'unassigned'
                    ? 'bg-stone-500 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                Unassigned ({pantryItems.filter(item => !item.location_id).length})
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
        {loading ? (
          <div className="text-center py-10">
            <div className="text-stone-600 italic animate-pulse">Loading pantry...</div>
          </div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-stone-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-stone-600" />
            </div>
            <p className="text-base text-gray-700 font-semibold mb-1">Your pantry starts here</p>
            <p className="text-sm text-stone-600 mb-4">Add items to track what you have at home</p>

            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button
                onClick={() => navigate('/pantry/scan')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Scan pantry photo
              </button>
              <button
                onClick={() => navigate('/pantry/shopping')}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                Open shopping list
              </button>
              <button
                onClick={() => setShowFoodPicker(true)}
                className="px-4 py-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-sm transition-colors"
              >
                Browse staple foods
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No items match your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLocationFilter(null);
              }}
              className="mt-2 text-xs text-stone-600 hover:text-stone-800 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLocationIds.map((locationId) => {
              const items = itemsByLocationId[locationId] || [];
              if (items.length === 0) return null;

              const location = locationId === 'unassigned'
                ? null
                : pantryLocations.find(l => l.id === locationId);

              const locationName = location?.name || 'Unassigned';
              const locationIcon = location?.icon || null;

              return (
                <div key={locationId} className="bg-stone-50 rounded-lg border-2 border-stone-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleLocationCollapse(locationId)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {locationIcon && <span className="text-base leading-none">{locationIcon}</span>}
                      <h4 className="font-semibold text-sm text-stone-900">{locationName}</h4>
                      <span className="text-xs text-stone-500">({items.length})</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-stone-400 flex-shrink-0 transition-transform duration-200 ${collapsedLocations.has(locationId) ? '-rotate-90' : ''}`}
                    />
                  </button>
                  {!collapsedLocations.has(locationId) && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {items.map((item) => {
                      const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                      const isEditingQuantity = editingQuantityId === item.id;

                      return (
                        <div key={item.id} className="bg-white/60 rounded-lg p-2.5 group">
                          {/* Row 1: emoji + name + action buttons */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {item.food_item?.emoji && (
                                <span className="text-base flex-shrink-0 leading-5">{item.food_item.emoji}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-gray-900 leading-5">{itemName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.item_type && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none ${
                                  item.item_type === 'perishable'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : item.item_type === 'long_life'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {PANTRY_ITEM_TYPES.find(t => t.value === item.item_type)?.emoji}{' '}
                                  {PANTRY_ITEM_TYPES.find(t => t.value === item.item_type)?.label}
                                </span>
                              )}
                              <button
                                onClick={() => handleEditItem(item)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-stone-600 transition-opacity p-0.5"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity p-0.5"
                                title="Delete"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: quantity, weight, expiry, location — wraps naturally */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 pl-7">
                            {isEditingQuantity ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={quantityValueInputRef}
                                  type="text"
                                  value={quantityValueInput}
                                  onChange={(e) => setQuantityValueInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleQuantitySave(item.id);
                                    } else if (e.key === 'Escape') {
                                      handleQuantityCancel();
                                    } else if (e.key === 'Tab' && !e.shiftKey) {
                                      // Allow tab to move to unit input
                                    }
                                  }}
                                  className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-16 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                  placeholder="3"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={quantityUnitInput}
                                  onChange={(e) => setQuantityUnitInput(e.target.value)}
                                  onBlur={() => handleQuantitySave(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleQuantitySave(item.id);
                                    } else if (e.key === 'Escape') {
                                      handleQuantityCancel();
                                    }
                                  }}
                                  className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                  placeholder="tins"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleQuantityEdit(item)}
                                className="text-xs text-gray-500 hover:text-gray-700 text-left"
                              >
                                {item.quantity_value || item.quantity ? (
                                  <>
                                    {`${item.quantity_value || item.quantity}${item.quantity_unit || item.unit ? ` ${item.quantity_unit || item.unit}` : ''}`}
                                    {item.estimated_weight_grams && item.estimated_weight_grams > 0 && CONTAINER_COUNT_UNITS.has(item.quantity_unit || item.unit || '') && (
                                      <span className="text-stone-400 ml-1">
                                        ({item.estimated_weight_grams >= 1000
                                          ? `${(item.estimated_weight_grams / 1000).toFixed(item.estimated_weight_grams % 1000 === 0 ? 0 : 1)}kg`
                                          : `${item.estimated_weight_grams}g`} each)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  'Add quantity'
                                )}
                              </button>
                            )}

                            {/* Portion Tracking Display */}
                            {(item as any).total_portions !== null && (item as any).total_portions !== undefined && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-blue-600 font-medium">
                                  {(item as any).remaining_portions || 0} / {(item as any).total_portions} {(item as any).portion_unit || 'serving'}{((item as any).remaining_portions || 0) !== 1 ? 's' : ''}
                                </span>
                                {(item as any).remaining_portions === 0 && (
                                  <span className="text-red-500 text-xs">(Depleted)</span>
                                )}
                              </div>
                            )}

                            {/* Expiry Date Display */}
                            {item.expires_on && (
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-xs hover:text-gray-600"
                                title="Tap to edit"
                              >
                                {(() => {
                                  const expiryDate = new Date(item.expires_on + 'T00:00:00');
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                  const isExpired = daysUntilExpiry < 0;
                                  const isSoon = !isExpired && daysUntilExpiry <= 7;

                                  const dateStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                                  if (isExpired) {
                                    return (
                                      <span className="text-red-600 font-medium flex items-center gap-1">
                                        ⚠ Expired {dateStr}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className={isSoon ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                                      {isSoon ? `Expires ${dateStr}` : `Best before ${dateStr}`}
                                    </span>
                                  );
                                })()}
                              </button>
                            )}

                            {/* Quick Location Change */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const availableLocations = pantryLocations.map(l => l.id);
                                const currentIndex = availableLocations.indexOf(item.location_id || '');
                                const nextIndex = (currentIndex + 1) % (availableLocations.length + 1);
                                const nextLocationId = nextIndex === availableLocations.length
                                  ? null
                                  : availableLocations[nextIndex];
                                handleQuickLocationChange(item.id, nextLocationId);
                              }}
                              className="text-xs px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded flex items-center gap-1 transition-colors"
                              title="Change location"
                            >
                              {item.pantry_location?.icon ? (
                                <span>{item.pantry_location.icon}</span>
                              ) : (
                                <Box size={10} />
                              )}
                              <ChevronDown size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Recipe Suggestions Footer — hidden for MVP */}


      {/* Edit Item Bottom Sheet */}
      <BottomSheet
        isOpen={!!pendingDeleteItem}
        onClose={() => {
          if (deletingItemId) return;
          setPendingDeleteItem(null);
        }}
        header={
          pendingDeleteItem ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-xl">
                {pendingDeleteItem.food_item?.emoji || '🗑️'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">Remove from pantry</h3>
                <p className="truncate text-sm text-stone-600">
                  {pendingDeleteItem.food_item?.name || pendingDeleteItem.item_name || 'Unknown Item'}
                </p>
              </div>
            </div>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setPendingDeleteItem(null)}
              disabled={!!deletingItemId}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              Keep item
            </button>
            <button
              onClick={handleConfirmDeleteItem}
              disabled={!!deletingItemId}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              {deletingItemId ? 'Removing...' : 'Remove item'}
            </button>
          </div>
        }
      >
        {pendingDeleteItem && (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-700">
                This will remove{' '}
                <span className="font-semibold text-stone-900">
                  {pendingDeleteItem.food_item?.name || pendingDeleteItem.item_name || 'this item'}
                </span>{' '}
                from your Pantry inventory.
              </p>
            </div>

            {autoReplaceEnabled && (
              <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-900">Auto-replace is on</p>
                <p className="mt-1 text-sm text-teal-800">
                  Removing this item will also add{' '}
                  <span className="font-semibold">
                    {getReplacementFromDeletion(pendingDeleteItem).quantity} {getReplacementFromDeletion(pendingDeleteItem).unit}
                  </span>{' '}
                  to your Shopping list.
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        header={
          editingItem ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-xl">
                {editingItem.food_item?.emoji || '📦'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">Edit pantry item</h3>
                <p className="truncate text-sm text-stone-600">
                  {editingItem.food_item?.name || editingItem.item_name || 'Unknown Item'}
                </p>
              </div>
            </div>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditingItem(null)}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-xl bg-stone-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-600 min-h-[44px]"
            >
              Save changes
            </button>
          </div>
        }
      >
        {editingItem && (
          <div className="space-y-5">
            {/* Location selector */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
              <label className="mb-3 block text-sm font-semibold text-stone-900">Location</label>
              <div className="grid gap-2 grid-cols-2">
                <button
                  onClick={() => setEditForm(prev => ({ ...prev, location: '' }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    !editForm.location
                      ? 'border-stone-500 bg-white text-stone-900 shadow-sm'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  No location
                </button>
                {pantryLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      setEditForm(prev => ({ ...prev, location: location.id }));
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      editForm.location === location.id
                        ? 'border-stone-500 bg-white text-stone-900 shadow-sm'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {location.icon && <span>{location.icon}</span>}
                      <span>{location.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item Type selector */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
              <label className="mb-3 block text-sm font-semibold text-stone-900">Item Type</label>
              <div className="grid grid-cols-3 gap-2">
                {PANTRY_ITEM_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, itemType: prev.itemType === type.value ? null : type.value }))}
                    className={`rounded-2xl border px-3 py-3 text-center text-sm font-medium transition-all ${
                      editForm.itemType === type.value
                        ? 'border-stone-500 bg-white text-stone-900 shadow-sm'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="block text-lg mb-0.5">{type.emoji}</span>
                    <span className="block text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
              {editForm.itemType && (
                <p className="text-xs text-stone-400 mt-2">
                  {PANTRY_ITEM_TYPES.find(t => t.value === editForm.itemType)?.description}
                </p>
              )}
            </div>

            {/* Status selector */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
              <h4 className="mb-3 text-sm font-semibold text-stone-900">Status</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['have', 'low', 'out'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, status }))}
                    className={`rounded-2xl border px-4 py-3 text-center text-sm font-medium capitalize transition-all ${
                      editForm.status === status
                        ? 'border-stone-500 bg-white text-stone-900 shadow-sm'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock details */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-stone-900">Stock details</h4>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-700">Quantity</label>
                  <input
                    type="text"
                    value={editForm.quantityValue}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantityValue: e.target.value }))}
                    placeholder="e.g., 500, 3"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-700">Unit</label>
                  <button
                    type="button"
                    onClick={() => { setShowUnitPicker(true); setUnitSearch(''); }}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px] flex items-center justify-between bg-white"
                  >
                    <span className={editForm.quantityUnit ? 'text-stone-900' : 'text-stone-400'}>
                      {editForm.quantityUnit || 'g'}
                    </span>
                    <ChevronDown size={14} className="text-stone-400" />
                  </button>
                </div>
                {/* Weight per item — shown when a container/count unit is selected */}
                {CONTAINER_COUNT_UNITS.has(editForm.quantityUnit) && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">Weight per item</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.weightValue}
                        onChange={(e) => setEditForm(prev => ({ ...prev, weightValue: e.target.value }))}
                        placeholder="e.g., 400"
                        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">Weight unit</label>
                      <button
                        type="button"
                        onClick={() => setShowWeightUnitPicker(true)}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px] flex items-center justify-between bg-white"
                      >
                        <span className="text-stone-900">{editForm.weightUnit}</span>
                        <ChevronDown size={14} className="text-stone-400" />
                      </button>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-stone-700">Best-before date</label>
                  <input
                    type="date"
                    value={editForm.expiresOn}
                    onChange={(e) => setEditForm(prev => ({ ...prev, expiresOn: e.target.value }))}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-stone-700">Estimated cost</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">£</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editForm.estimatedCost}
                      onChange={(e) => setEditForm(prev => ({ ...prev, estimatedCost: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    />
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Optional, but used in Pantry budget analytics and exports.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <label className="mb-2 block text-sm font-semibold text-stone-900">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes..."
                rows={3}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
              />
            </div>

            {/* Current item info (collapsed summary) */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-stone-900">Current item</h4>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Name</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {editingItem.food_item?.name || editingItem.item_name || 'Unknown Item'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Current location</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {editingItem.pantry_location?.name || 'No location'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Current quantity</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {editingItem.quantity_value || editingItem.quantity || 'Not set'}
                    {(editingItem.quantity_unit || editingItem.unit) ? ` ${editingItem.quantity_unit || editingItem.unit}` : ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Current best-before</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {editingItem.expires_on
                      ? new Date(editingItem.expires_on).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Not set'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Current estimated cost</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {editingItem.estimated_cost !== null && editingItem.estimated_cost !== undefined
                      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(editingItem.estimated_cost)
                      : 'Not set'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Unit Picker Bottom Sheet */}
      <BottomSheet
        isOpen={showUnitPicker}
        onClose={() => setShowUnitPicker(false)}
        header={
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Select Unit</h3>
            <p className="text-sm text-stone-500">Choose a unit or type your own</p>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search / free type input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Search or type a custom unit..."
              className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
              autoFocus
            />
            {unitSearch && !UNIT_GROUPS.some(g => g.units.some(u => u.value === unitSearch || u.description === unitSearch)) && (
              <button
                type="button"
                onClick={() => {
                  setEditForm(prev => ({ ...prev, quantityUnit: unitSearch.trim() }));
                  setShowUnitPicker(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-700 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors"
              >
                Use "{unitSearch.trim()}"
              </button>
            )}
          </div>

          {/* Grouped unit list */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {UNIT_GROUPS.map((group) => {
              const filtered = group.units.filter(u =>
                !unitSearch ||
                u.value.toLowerCase().includes(unitSearch.toLowerCase()) ||
                u.description.toLowerCase().includes(unitSearch.toLowerCase())
              );
              if (filtered.length === 0) return null;

              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 px-1">{group.label}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {filtered.map((unit) => (
                      <button
                        key={unit.value}
                        type="button"
                        onClick={() => {
                          setEditForm(prev => ({ ...prev, quantityUnit: unit.value }));
                          setShowUnitPicker(false);
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all min-h-[44px] ${
                          editForm.quantityUnit === unit.value
                            ? 'border-stone-500 bg-stone-50 text-stone-900 shadow-sm ring-1 ring-stone-500'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50'
                        }`}
                      >
                        <span className="block text-sm font-medium">{unit.value}</span>
                        {unit.description && unit.description !== unit.value && (
                          <span className="block text-[11px] text-stone-400 leading-tight">{unit.description}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {unitSearch && !UNIT_GROUPS.some(g => g.units.some(u =>
              u.value.toLowerCase().includes(unitSearch.toLowerCase()) ||
              u.description.toLowerCase().includes(unitSearch.toLowerCase())
            )) && (
              <div className="text-center py-4">
                <p className="text-sm text-stone-500 mb-2">No matching units</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm(prev => ({ ...prev, quantityUnit: unitSearch.trim() }));
                    setShowUnitPicker(false);
                  }}
                  className="px-4 py-2 bg-stone-700 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
                >
                  Use "{unitSearch.trim()}" as custom unit
                </button>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Weight Unit Picker BottomSheet */}
      <BottomSheet
        isOpen={showWeightUnitPicker}
        onClose={() => setShowWeightUnitPicker(false)}
        title="Weight unit"
      >
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {WEIGHT_UNITS.map((unit) => (
              <button
                key={unit.value}
                type="button"
                onClick={() => {
                  setEditForm(prev => ({ ...prev, weightUnit: unit.value }));
                  setShowWeightUnitPicker(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm transition-all ${
                  editForm.weightUnit === unit.value
                    ? 'border-stone-500 bg-stone-50 text-stone-900 shadow-sm'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <span className="font-semibold text-base">{unit.display}</span>
                <span className="text-xs text-stone-500">{unit.label}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* FoodPicker Modal */}
      <FoodPicker
        isOpen={showFoodPicker}
        onClose={() => setShowFoodPicker(false)}
        onSelect={handleFoodItemSelect}
        householdId={currentSpaceId}
        placeholder="Search for a food item..."
        title="Add to Pantry"
        showAwareness={true}
        presetSections={PANTRY_STARTER_SECTIONS}
        quickPickItems={PANTRY_QUICK_PICK_ITEMS}
        layout="pantry"
      />

      {/* Makeable Recipes Modal */}
      <MakeableRecipesModal
        isOpen={showMakeableRecipes}
        onClose={() => setShowMakeableRecipes(false)}
        spaceId={currentSpaceId}
      />

      {/* Location Selector Modal */}
      <PantryLocationSelector
        isOpen={showLocationSelector}
        onClose={() => {
          setShowLocationSelector(false);
          resetPendingPantryForm();
        }}
        onSelect={handleLocationSelect}
        locations={pantryLocations}
        lastUsedLocationId={lastUsedLocationId}
        spaceId={currentSpaceId}
        foodItem={pendingFoodItem}
        smartDefaultHint={
          pendingAddMode === 'merge'
            ? `${pendingDefaultHint ? `${pendingDefaultHint} ` : ''}This will top up the selected pantry batch instead of creating a new row.`
            : pendingDefaultHint
        }
        sheetTitle={pendingAddMode === 'merge' ? 'Merge pantry stock' : 'Add to pantry'}
        submitLabel={pendingAddMode === 'merge' ? 'Merge stock' : 'Add to pantry'}
        onLocationCreated={(location) => {
          setPantryLocations([...pantryLocations, location]);
        }}
        quantityValue={pendingQuantityValue}
        quantityUnit={pendingQuantityUnit}
        weightValue={pendingWeightValue}
        weightUnit={pendingWeightUnit}
        estimatedCost={pendingEstimatedCost}
        expiresOn={pendingExpiresOn}
        onQuantityValueChange={setPendingQuantityValue}
        onQuantityUnitChange={setPendingQuantityUnit}
        onWeightValueChange={setPendingWeightValue}
        onWeightUnitChange={setPendingWeightUnit}
        onEstimatedCostChange={setPendingEstimatedCost}
        onExpiresOnChange={setPendingExpiresOn}
        itemType={pendingItemType}
        onItemTypeChange={setPendingItemType}
        totalPortions={pendingTotalPortions}
        portionUnit={pendingPortionUnit}
        onTotalPortionsChange={setPendingTotalPortions}
        onPortionUnitChange={setPendingPortionUnit}
        showLocationSection={pendingAddMode !== 'merge'}
      />

      <BottomSheet
        isOpen={showRestockDecisionSheet}
        onClose={() => {
          setShowRestockDecisionSheet(false);
          resetPendingPantryForm();
        }}
        title="Restock item"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowRestockDecisionSheet(false);
                resetPendingPantryForm();
              }}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={pendingAddMode === 'merge' ? handleRestockAsMerge : handleRestockAsNewBatch}
              className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Continue
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Already in pantry</p>
            <h3 className="mt-2 text-lg font-semibold text-stone-900">
              {pendingFoodItem?.name || 'Selected item'}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Choose whether this should be saved as a new batch or merged into an existing stock entry.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPendingAddMode('new_batch')}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                pendingAddMode === 'new_batch'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
              }`}
            >
              <div className="text-sm font-semibold">Add as new batch</div>
              <div className={`mt-1 text-xs ${pendingAddMode === 'new_batch' ? 'text-stone-200' : 'text-stone-500'}`}>
                Keep a separate row for a different expiry, container, or storage spot.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPendingAddMode('merge')}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                pendingAddMode === 'merge'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
              }`}
            >
              <div className="text-sm font-semibold">Merge into stock</div>
              <div className={`mt-1 text-xs ${pendingAddMode === 'merge' ? 'text-stone-200' : 'text-stone-500'}`}>
                Top up one existing batch when quantity units and portion units match.
              </div>
            </button>
          </div>

          {pendingAddMode === 'merge' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Choose batch to top up
              </p>
              {pendingExistingMatches.map((item) => {
                const summary = getPantryBatchSummary(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPendingMergeTargetId(item.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      pendingMergeTargetId === item.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{summary.locationName}</div>
                        <div className={`mt-1 text-xs ${pendingMergeTargetId === item.id ? 'text-stone-200' : 'text-stone-500'}`}>
                          {summary.quantity}
                        </div>
                      </div>
                      <span className={`text-xs ${pendingMergeTargetId === item.id ? 'text-stone-300' : 'text-stone-500'}`}>
                        {summary.expiryLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      <PantrySettingsSheet
        isOpen={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        spaceId={currentSpaceId}
        itemCount={pantryItems.length}
        totalEstimatedValue={totalEstimatedValue}
        valuedItemCount={valuedPantryItems.length}
        onManageLocations={() => {
          setShowSettingsSheet(false);
          setShowManageLocations(true);
        }}
        onPrintChecklist={handlePrintChecklist}
        onPrintBudgetReport={handlePrintBudgetReport}
        onExportCsv={handleExportCsv}
        autoReplaceEnabled={autoReplaceEnabled}
        autoReplaceLoading={autoReplaceLoading}
        onAutoReplaceToggle={handleAutoReplaceToggle}
      />

      {/* Location Manager Modal */}
      <PantryLocationManager
        isOpen={showManageLocations}
        onClose={() => setShowManageLocations(false)}
        locations={pantryLocations}
        pantryItems={pantryItems}
        spaceId={currentSpaceId}
        onLocationsUpdated={handleLocationsUpdated}
      />

      {/* Weekly Pantry Check Sheet */}
      {showPantryCheck && currentSpaceId && (
        <WeeklyPantryCheckSheet
          isOpen={showPantryCheck}
          onClose={() => setShowPantryCheck(false)}
          householdId={currentSpaceId}
          weekStartDate={getWeekStartDate()}
          onPantryUpdated={() => {
            // Refresh pantry items after adding ingredients
            loadPantryItems(getAbortSignal());
            showToast('success', 'Pantry updated');
          }}
          onGroceryListUpdated={() => {
            // Could refresh grocery list widget if needed
          }}
        />
      )}
    </div>
  );
}
