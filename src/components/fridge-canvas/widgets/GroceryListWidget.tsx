import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, X, AlertTriangle, Check, Sparkles, Lightbulb, Edit2, Repeat2, ChevronDown } from 'lucide-react';
import { getDietProfiles, sanitizeIngredientsForHousehold } from '../../../lib/mealFiltering';
import type { DietProfile, SanitizedIngredients, IngredientStatus } from '../../../lib/mealFiltering';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import {
  getGroceryItems, 
  addGroceryItem, 
  moveGroceryItemToPantry,
  toggleItemChecked, 
  deleteGroceryItem,
  updateGroceryItem,
  getOrCreateDefaultList,
  getWeeklyGroceryTemplates,
  upsertWeeklyGroceryTemplate,
  deleteWeeklyGroceryTemplate,
  previewWeeklyTemplatePopulate,
  populateWeeklyTemplatesToGroceryList,
  type GroceryItem,
  type GroceryTemplate,
  type PantryItemType,
  type WeeklyTemplatePopulatePreview,
} from '../../../lib/intelligentGrocery';
import { FoodPicker } from '../../shared/FoodPicker';
import { getOrCreateFoodItem, type FoodItem } from '../../../lib/foodItems';
import { isInPantry } from '../../../lib/foodAwareness';
import { showToast } from '../../Toast';
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';
import { PantryLocationSelector } from '../../shared/PantryLocationSelector';
import { BottomSheet } from '../../shared/BottomSheet';
import { getPantryAddDefaults } from '../../../lib/pantryAddDefaults';
import { ensureDefaultLocations, type PantryLocation } from '../../../lib/pantryLocations';
import {
  PANTRY_QUICK_PICK_ITEMS,
  PANTRY_STARTER_SECTIONS,
  getPantryStarterEstimatedCost,
} from '../../../lib/pantryStaples';

interface GroceryListContent {
  items: Array<{
    id: string;
    name: string;
    checked: boolean;
    quantity?: string;
    category?: string;
  }>;
}

interface GroceryListWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
  content?: GroceryListContent;
  onContentChange?: (content: GroceryListContent) => void;
}

export function GroceryListWidget({ householdId, viewMode, onContentChange }: GroceryListWidgetProps) {
  const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'beverages', 'snacks', 'household', 'other'];

  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  const [dietProfiles, setDietProfiles] = useState<DietProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sanitized, setSanitized] = useState<SanitizedIngredients | null>(null);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [showAddItemSheet, setShowAddItemSheet] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);
  
  // Unified food system: Load from intelligentGrocery service
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [pantryLocations, setPantryLocations] = useState<PantryLocation[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [lastUsedLocationId, setLastUsedLocationId] = useState<string | null>(null);
  const [transferQueue, setTransferQueue] = useState<GroceryItem[]>([]);
  const [transferTotalCount, setTransferTotalCount] = useState(0);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);
  const [checkoutStoreName, setCheckoutStoreName] = useState('');
  const [checkoutPurchasedDate, setCheckoutPurchasedDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  });
  const [pendingFoodItem, setPendingFoodItem] = useState<FoodItem | null>(null);
  const [pendingListFoodItem, setPendingListFoodItem] = useState<FoodItem | null>(null);
  const [pendingListEditingId, setPendingListEditingId] = useState<string | null>(null);
  const [pendingListName, setPendingListName] = useState('');
  const [pendingListCategory, setPendingListCategory] = useState('other');
  const [pendingListQuantity, setPendingListQuantity] = useState('');
  const [pendingListUnit, setPendingListUnit] = useState('');
  const [pendingListWeightValue, setPendingListWeightValue] = useState('');
  const [pendingListWeightUnit, setPendingListWeightUnit] = useState('g');
  const [pendingListLocationId, setPendingListLocationId] = useState<string | null>(null);
  const [pendingListEstimatedCost, setPendingListEstimatedCost] = useState('');
  const [pendingListExpiresOn, setPendingListExpiresOn] = useState('');
  const [pendingListItemType, setPendingListItemType] = useState<PantryItemType | null>(null);
  const [pendingListDefaultHint, setPendingListDefaultHint] = useState<string | null>(null);
  const [pendingListTotalPortions, setPendingListTotalPortions] = useState('');
  const [pendingListPortionUnit, setPendingListPortionUnit] = useState('');
  const [pendingListNotes, setPendingListNotes] = useState('');
  const [pendingListAlreadyInPantry, setPendingListAlreadyInPantry] = useState(false);
  const [pendingGroceryItemId, setPendingGroceryItemId] = useState<string | null>(null);
  const [pendingQuantityValue, setPendingQuantityValue] = useState('');
  const [pendingQuantityUnit, setPendingQuantityUnit] = useState('');
  const [pendingWeightValue, setPendingWeightValue] = useState('');
  const [pendingWeightUnit, setPendingWeightUnit] = useState('g');
  const [pendingEstimatedCost, setPendingEstimatedCost] = useState('');
  const [pendingExpiresOn, setPendingExpiresOn] = useState('');
  const [pendingDefaultHint, setPendingDefaultHint] = useState<string | null>(null);
  const [pendingItemType, setPendingItemType] = useState<PantryItemType | null>(null);
  const [pendingTotalPortions, setPendingTotalPortions] = useState('');
  const [pendingPortionUnit, setPendingPortionUnit] = useState('');
  const [pendingDeleteItem, setPendingDeleteItem] = useState<GroceryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [weeklyTemplates, setWeeklyTemplates] = useState<GroceryTemplate[]>([]);
  const [savingWeeklyItemId, setSavingWeeklyItemId] = useState<string | null>(null);
  const [weeklyPopulatePreview, setWeeklyPopulatePreview] = useState<WeeklyTemplatePopulatePreview | null>(null);
  const [populatingWeekly, setPopulatingWeekly] = useState(false);
  const [showBuildWeeklySheet, setShowBuildWeeklySheet] = useState(false);
  const [buildingWeekly, setBuildingWeekly] = useState(false);
  const [showWeeklyFoodPicker, setShowWeeklyFoodPicker] = useState(false);
  const [showWeeklyItemSheet, setShowWeeklyItemSheet] = useState(false);
  const [pendingWeeklyTemplateId, setPendingWeeklyTemplateId] = useState<string | null>(null);
  const [pendingWeeklyFoodItem, setPendingWeeklyFoodItem] = useState<FoodItem | null>(null);
  const [pendingWeeklyName, setPendingWeeklyName] = useState('');
  const [pendingWeeklyQuantity, setPendingWeeklyQuantity] = useState('');
  const [pendingWeeklyUnit, setPendingWeeklyUnit] = useState('');
  const [pendingWeeklyWeightValue, setPendingWeeklyWeightValue] = useState('');
  const [pendingWeeklyWeightUnit, setPendingWeeklyWeightUnit] = useState('g');
  const [pendingWeeklyEstimatedCost, setPendingWeeklyEstimatedCost] = useState('');
  const [pendingWeeklyItemType, setPendingWeeklyItemType] = useState<PantryItemType | null>(null);
  const [pendingWeeklyNotes, setPendingWeeklyNotes] = useState('');
  const [pendingWeeklyDefaultHint, setPendingWeeklyDefaultHint] = useState<string | null>(null);
  const [pendingDeleteWeeklyTemplate, setPendingDeleteWeeklyTemplate] = useState<GroceryTemplate | null>(null);
  const [deletingWeeklyTemplateId, setDeletingWeeklyTemplateId] = useState<string | null>(null);
  const [showImportWeeklySheet, setShowImportWeeklySheet] = useState(false);
  const [selectedWeeklyImportIds, setSelectedWeeklyImportIds] = useState<string[]>([]);
  const [estimatedCostExpanded, setEstimatedCostExpanded] = useState(true);
  const [weeklyStaplesExpanded, setWeeklyStaplesExpanded] = useState(true);
  
  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);

  // Load default shopping list when space changes
  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      getOrCreateDefaultList(currentSpaceId).then(list => {
        setDefaultListId(list.id);
      });
    }
  }, [currentSpaceId]);

  // Load grocery items from unified food system
  useEffect(() => {
    const abortSignal = getAbortSignal();
    
    if (!isSwitching() && defaultListId) {
      loadGroceryItems(abortSignal);
    }
    
    // Cleanup: reset edit states when context changes
    setShowFoodPicker(false);
    setShowAddItemSheet(false);
    setShowSubstitutions(false);
    
    return () => {
      setGroceryItems([]);
    };
  }, [currentSpaceId, defaultListId]);

  useEffect(() => {
    if (!isSwitching()) {
      loadDietProfiles();
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      loadPantryLocations();
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      loadWeeklyTemplates();
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (dietProfiles.length > 0 && groceryItems.length > 0) {
      const ingredients = groceryItems.map(item => item.food_item?.name || item.item_name || '');
      const result = sanitizeIngredientsForHousehold(ingredients, dietProfiles);
      setSanitized(result);
    }
  }, [groceryItems, dietProfiles]);

  const loadGroceryItems = async (abortSignal?: AbortSignal | null) => {
    const expectedSpaceId = contextSpaceIdRef.current;

    try {
      setLoading(true);
      const items = await getGroceryItems(currentSpaceId, defaultListId || undefined);

      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }

      setGroceryItems(items);
      
      // Update widget content for backward compatibility
      if (onContentChange) {
        const contentItems = items.map(item => ({
          id: item.id,
          name: item.food_item?.name || item.item_name || 'Unknown Item',
          checked: item.checked,
          quantity: item.quantity || undefined,
          category: item.category,
        }));
        onContentChange({ items: contentItems });
      }
    } catch (error: any) {
      // Ignore aborted requests
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      
      console.error('Failed to load grocery items:', error);
      showToast('error', 'Failed to load grocery list');
    } finally {
      // Only update loading state if context hasn't changed
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoading(false);
      }
    }
  };

  const loadDietProfiles = async () => {
    setLoading(true);
    try {
      const profiles = await getDietProfiles(currentSpaceId);
      setDietProfiles(profiles);
    } catch (err) {
      console.error('Failed to load diet profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPantryLocations = async () => {
    try {
      const locations = await ensureDefaultLocations(currentSpaceId);
      setPantryLocations(locations);

      const lastUsedKey = `last_used_location_${currentSpaceId}`;
      const lastUsed = sessionStorage.getItem(lastUsedKey);
      if (lastUsed && locations.some((location) => location.id === lastUsed)) {
        setLastUsedLocationId(lastUsed);
      }
    } catch (error) {
      console.error('Failed to load pantry locations:', error);
    }
  };

  const loadWeeklyTemplates = async () => {
    try {
      const templates = await getWeeklyGroceryTemplates(currentSpaceId);
      setWeeklyTemplates(templates);
    } catch (error) {
      console.error('Failed to load weekly grocery templates:', error);
    }
  };

  const resetWeeklyTemplateForm = () => {
    setPendingWeeklyTemplateId(null);
    setPendingWeeklyFoodItem(null);
    setPendingWeeklyName('');
    setPendingWeeklyQuantity('');
    setPendingWeeklyUnit('');
    setPendingWeeklyWeightValue('');
    setPendingWeeklyWeightUnit('g');
    setPendingWeeklyEstimatedCost('');
    setPendingWeeklyItemType(null);
    setPendingWeeklyNotes('');
    setPendingWeeklyDefaultHint(null);
  };

  // Handle food item selection from FoodPicker
  const resetPendingListForm = () => {
    setPendingListFoodItem(null);
    setPendingListEditingId(null);
    setPendingListName('');
    setPendingListCategory('other');
    setPendingListQuantity('');
    setPendingListUnit('');
    setPendingListWeightValue('');
    setPendingListWeightUnit('g');
    setPendingListLocationId(null);
    setPendingListEstimatedCost('');
    setPendingListExpiresOn('');
    setPendingListItemType(null);
    setPendingListDefaultHint(null);
    setPendingListTotalPortions('');
    setPendingListPortionUnit('');
    setPendingListNotes('');
    setPendingListAlreadyInPantry(false);
  };

  const handleFoodItemSelect = async (
    foodItem: FoodItem,
    meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }
  ) => {
    try {
      if (pantryLocations.length === 0) {
        await loadPantryLocations();
      }

      const inPantry = await isInPantry(foodItem.id, currentSpaceId);

      const defaults = getPantryAddDefaults(foodItem);
      const defaultEstimatedCost = meta?.estimatedCost ?? getPantryStarterEstimatedCost(foodItem.name);

      setPendingListFoodItem(foodItem);
      setPendingListName(foodItem.name);
      setPendingListCategory(foodItem.category || 'other');
      setPendingListQuantity(defaults.quantityValue || '1');
      setPendingListUnit(defaults.quantityUnit || 'item');
      setPendingListWeightValue(defaults.weightValue || '');
      setPendingListWeightUnit(defaults.weightUnit || 'g');
      setPendingListLocationId(lastUsedLocationId);
      setPendingListEstimatedCost(
        defaultEstimatedCost !== null && defaultEstimatedCost !== undefined
          ? String(defaultEstimatedCost)
          : ''
      );
      setPendingListExpiresOn('');
      setPendingListItemType(meta?.pantryType ?? inferPantryItemTypeFromCategory(foodItem.category));
      setPendingListDefaultHint(defaults.hint);
      setPendingListTotalPortions('');
      setPendingListPortionUnit('');
      setPendingListNotes('');
      setPendingListAlreadyInPantry(inPantry);
      setShowAddItemSheet(true);
    } catch (error) {
      console.error('Failed to prepare grocery item:', error);
      showToast('error', 'Failed to prepare item');
    }
  };

  const handleEditListItem = (item: GroceryItem) => {
    const foodItem = buildTransferFoodItem(item);
    const defaults = getPantryAddDefaults(foodItem);
    const quantityPrefill = getQuantityPrefill(item, defaults);
    const weightPrefill = getWeightPrefill(item.estimated_weight_grams, defaults);

    setPendingListEditingId(item.id);
    setPendingListFoodItem(foodItem);
    setPendingListName(foodItem.name);
    setPendingListCategory(item.category || foodItem.category || 'other');
    setPendingListQuantity(quantityPrefill.quantityValue);
    setPendingListUnit(quantityPrefill.quantityUnit);
    setPendingListWeightValue(weightPrefill.weightValue);
    setPendingListWeightUnit(weightPrefill.weightUnit);
    setPendingListLocationId(item.location_id || lastUsedLocationId);
    setPendingListEstimatedCost(item.estimated_price != null ? String(item.estimated_price) : '');
    setPendingListExpiresOn(item.expires_on || '');
    setPendingListItemType(item.item_type || inferPantryItemType(item));
    setPendingListDefaultHint(defaults.hint);
    setPendingListTotalPortions(item.total_portions != null ? String(item.total_portions) : '');
    setPendingListPortionUnit(item.portion_unit || '');
    setPendingListNotes(item.notes || '');
    setPendingListAlreadyInPantry(false);
    setShowAddItemSheet(true);
  };

  const handleSaveGroceryItem = async (locationId: string | null) => {
    if (!pendingListName.trim()) {
      showToast('info', 'Add an item name first');
      return;
    }

    try {
      const estimatedPrice = pendingListEstimatedCost.trim()
        ? Number.parseFloat(pendingListEstimatedCost.trim())
        : null;
      const estimatedWeightGrams = parseEstimatedWeightGrams(pendingListWeightValue, pendingListWeightUnit);
      const totalPortions = pendingListTotalPortions.trim()
        ? Number.parseInt(pendingListTotalPortions.trim(), 10)
        : null;

      const foodItem = await getOrCreateFoodItem(
        pendingListName.trim(),
        pendingListCategory || undefined
      );

      if (pendingListEditingId) {
        await updateGroceryItem(pendingListEditingId, {
          food_item_id: foodItem.id,
          quantity: pendingListQuantity.trim() || null,
          unit: pendingListUnit.trim() || null,
          category: pendingListCategory || null,
          estimated_price: estimatedPrice !== null && !Number.isNaN(estimatedPrice) ? estimatedPrice : null,
          estimated_weight_grams: estimatedWeightGrams,
          expires_on: pendingListExpiresOn || null,
          location_id: locationId,
          item_type: pendingListItemType || null,
          total_portions: totalPortions && totalPortions > 0 ? totalPortions : null,
          portion_unit: pendingListPortionUnit.trim() || null,
          notes: pendingListNotes.trim() || null,
        });
      } else {
        await addGroceryItem({
          householdId: currentSpaceId,
          listId: defaultListId || undefined,
          foodItemId: foodItem.id,
          quantity: pendingListQuantity.trim() || undefined,
          unit: pendingListUnit.trim() || undefined,
          category: pendingListCategory || undefined,
          estimatedPrice: estimatedPrice !== null && !Number.isNaN(estimatedPrice) ? estimatedPrice : undefined,
          estimatedWeightGrams,
          expiresOn: pendingListExpiresOn || undefined,
          locationId,
          itemType: pendingListItemType || undefined,
          totalPortions: totalPortions && totalPortions > 0 ? totalPortions : null,
          portionUnit: pendingListPortionUnit.trim() || null,
          notes: pendingListNotes.trim() || undefined,
        });
      }

      if (locationId) {
        setLastUsedLocationId(locationId);
        sessionStorage.setItem(`last_used_location_${currentSpaceId}`, locationId);
      }

      await loadGroceryItems(getAbortSignal());
      setShowAddItemSheet(false);

      if (pendingListEditingId) {
        showToast('success', 'Shopping item updated');
      } else if (pendingListAlreadyInPantry) {
        showToast('info', 'Added to list (you already have this in pantry)');
      } else {
        showToast('success', 'Added to shopping list');
      }

      resetPendingListForm();
    } catch (error) {
      console.error('Failed to add grocery item:', error);
      showToast('error', 'Failed to add item');
    }
  };

  const handleToggleItem = async (id: string) => {
    const item = groceryItems.find(i => i.id === id);
    if (!item) return;

    try {
      await toggleItemChecked(id, !item.checked);

      await loadGroceryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to toggle item:', error);
      showToast('error', 'Failed to update item');
    }
  };

  const handleRemoveItem = (id: string) => {
    const item = groceryItems.find((entry) => entry.id === id);
    if (!item) return;
    setPendingDeleteItem(item);
  };

  const handleConfirmRemoveItem = async () => {
    if (!pendingDeleteItem) return;

    setDeletingItemId(pendingDeleteItem.id);
    try {
      await deleteGroceryItem(pendingDeleteItem.id);
      await loadGroceryItems(getAbortSignal());
      setPendingDeleteItem(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const isWeeklyTemplateMatch = (template: GroceryTemplate, item: GroceryItem) => {
    if (template.food_item_id && template.food_item_id === item.food_item_id) return true;
    const templateName = (template.item_name || '').trim().toLowerCase();
    const itemName = (item.food_item?.name || item.item_name || '').trim().toLowerCase();
    return !!templateName && templateName === itemName;
  };

  const getWeeklyTemplateForItem = (item: GroceryItem) =>
    weeklyTemplates.find((template) => isWeeklyTemplateMatch(template, item)) || null;

  const ensureDefaultListId = async () => {
    if (defaultListId) return defaultListId;
    const list = await getOrCreateDefaultList(currentSpaceId);
    setDefaultListId(list.id);
    return list.id;
  };

  const handleToggleWeeklyTemplate = async (item: GroceryItem) => {
    const existingTemplate = getWeeklyTemplateForItem(item);
    setSavingWeeklyItemId(item.id);

    try {
      if (existingTemplate) {
        await deleteWeeklyGroceryTemplate(existingTemplate.id);
        showToast('success', 'Removed from weekly staples');
      } else {
        await upsertWeeklyGroceryTemplate({
          householdId: currentSpaceId,
          foodItemId: item.food_item_id,
          itemName: item.food_item?.name || item.item_name || 'Unknown Item',
          category: item.category || item.food_item?.category || undefined,
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: item.estimated_price,
          estimatedWeightGrams: item.estimated_weight_grams,
          itemType: inferPantryItemType(item),
          notes: item.notes,
        });
        showToast('success', 'Saved to weekly staples');
      }

      await loadWeeklyTemplates();
    } catch (error) {
      console.error('Failed to update weekly grocery template:', error);
      showToast('error', 'Failed to update weekly staples');
    } finally {
      setSavingWeeklyItemId(null);
    }
  };

  const handlePopulateWeeklyStaples = async () => {
    if (weeklyTemplates.length === 0) {
      if (groceryItems.length === 0) {
        showToast('info', 'Add a few shopping items first so you can turn them into a weekly list');
        return;
      }

      setShowBuildWeeklySheet(true);
      return;
    }

    try {
      const listId = await ensureDefaultListId();
      const preview = await previewWeeklyTemplatePopulate(currentSpaceId, listId);

      if (preview.templates.length === 0) {
        showToast('info', 'No weekly staples to add');
        return;
      }

      if (preview.duplicates.length > 0) {
        setWeeklyPopulatePreview(preview);
        return;
      }

      await executePopulateWeeklyStaples(false);
    } catch (error) {
      console.error('Failed to prepare weekly staples:', error);
      showToast('error', 'Failed to prepare weekly shopping list');
    }
  };

  const openImportCurrentListSheet = () => {
    if (groceryItems.length === 0) {
      showToast('info', 'Add a few shopping items first');
      return;
    }

    const defaultSelectedIds = groceryItems
      .filter((item) => !getWeeklyTemplateForItem(item))
      .map((item) => item.id);

    setSelectedWeeklyImportIds(defaultSelectedIds);
    setShowImportWeeklySheet(true);
  };

  const handleBuildWeeklyFromCurrentList = async () => {
    const itemsToImport = groceryItems.filter((item) => selectedWeeklyImportIds.includes(item.id));

    if (itemsToImport.length === 0) {
      showToast('info', 'Select at least one item to save into the weekly list');
      return;
    }

    try {
      setBuildingWeekly(true);

      for (const item of itemsToImport) {
        await upsertWeeklyGroceryTemplate({
          householdId: currentSpaceId,
          foodItemId: item.food_item_id,
          itemName: item.food_item?.name || item.item_name || 'Unknown Item',
          category: item.category || item.food_item?.category || undefined,
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: item.estimated_price,
          estimatedWeightGrams: item.estimated_weight_grams,
          itemType: inferPantryItemType(item),
          notes: item.notes,
        });
      }

      await loadWeeklyTemplates();
      setShowImportWeeklySheet(false);
      setSelectedWeeklyImportIds([]);
      showToast('success', `Saved ${itemsToImport.length} item${itemsToImport.length !== 1 ? 's' : ''} to weekly staples`);
    } catch (error) {
      console.error('Failed to build weekly staples from current list:', error);
      showToast('error', 'Failed to build weekly list');
    } finally {
      setBuildingWeekly(false);
    }
  };

  const toggleWeeklyImportSelection = (itemId: string) => {
    setSelectedWeeklyImportIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleWeeklyFoodItemSelect = async (
    foodItem: FoodItem,
    meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }
  ) => {
    try {
      const defaults = getPantryAddDefaults(foodItem);
      const defaultEstimatedCost = meta?.estimatedCost ?? getPantryStarterEstimatedCost(foodItem.name);

      setPendingWeeklyTemplateId(null);
      setPendingWeeklyFoodItem(foodItem);
      setPendingWeeklyName(foodItem.name);
      setPendingWeeklyQuantity(defaults.quantityValue || '1');
      setPendingWeeklyUnit(defaults.quantityUnit || 'item');
      setPendingWeeklyWeightValue(defaults.weightValue || '');
      setPendingWeeklyWeightUnit(defaults.weightUnit || 'g');
      setPendingWeeklyEstimatedCost(
        defaultEstimatedCost !== null && defaultEstimatedCost !== undefined
          ? String(defaultEstimatedCost)
          : ''
      );
      setPendingWeeklyItemType(meta?.pantryType ?? inferPantryItemTypeFromCategory(foodItem.category));
      setPendingWeeklyNotes('');
      setPendingWeeklyDefaultHint(defaults.hint);
      setShowWeeklyItemSheet(true);
    } catch (error) {
      console.error('Failed to prepare weekly grocery item:', error);
      showToast('error', 'Failed to prepare weekly item');
    }
  };

  const handleEditWeeklyTemplate = async (template: GroceryTemplate) => {
    try {
      const foodItem = await getOrCreateFoodItem(template.item_name, template.category || undefined);
      const defaults = getPantryAddDefaults(foodItem);
      const weightPrefill = getWeightPrefill(template.estimated_weight_grams, defaults);

      setPendingWeeklyTemplateId(template.id);
      setPendingWeeklyFoodItem(foodItem);
      setPendingWeeklyName(template.item_name);
      setPendingWeeklyQuantity(template.quantity || defaults.quantityValue || '1');
      setPendingWeeklyUnit(template.unit || defaults.quantityUnit || 'item');
      setPendingWeeklyWeightValue(weightPrefill.weightValue);
      setPendingWeeklyWeightUnit(weightPrefill.weightUnit);
      setPendingWeeklyEstimatedCost(
        template.estimated_price !== null && template.estimated_price !== undefined
          ? String(template.estimated_price)
          : ''
      );
      setPendingWeeklyItemType(template.item_type || inferPantryItemTypeFromCategory(template.category));
      setPendingWeeklyNotes(template.notes || '');
      setPendingWeeklyDefaultHint(defaults.hint);
      setShowWeeklyItemSheet(true);
    } catch (error) {
      console.error('Failed to edit weekly grocery template:', error);
      showToast('error', 'Failed to open weekly item');
    }
  };

  const handleSaveWeeklyTemplate = async () => {
    if (!pendingWeeklyName.trim()) {
      showToast('info', 'Add an item name first');
      return;
    }

    try {
      const estimatedPrice = pendingWeeklyEstimatedCost.trim()
        ? Number.parseFloat(pendingWeeklyEstimatedCost.trim())
        : null;
      const estimatedWeightGrams = parseEstimatedWeightGrams(pendingWeeklyWeightValue, pendingWeeklyWeightUnit);
      const foodItem = await getOrCreateFoodItem(
        pendingWeeklyName.trim(),
        pendingWeeklyFoodItem?.category || undefined
      );

      await upsertWeeklyGroceryTemplate({
        householdId: currentSpaceId,
        foodItemId: foodItem.id,
        itemName: foodItem.name,
        category: foodItem.category || undefined,
        quantity: pendingWeeklyQuantity.trim() || null,
        unit: pendingWeeklyUnit.trim() || null,
        estimatedPrice: estimatedPrice !== null && !Number.isNaN(estimatedPrice) ? estimatedPrice : null,
        estimatedWeightGrams,
        itemType: pendingWeeklyItemType || null,
        notes: pendingWeeklyNotes.trim() || null,
      });

      await loadWeeklyTemplates();
      setShowWeeklyItemSheet(false);
      resetWeeklyTemplateForm();
      showToast('success', pendingWeeklyTemplateId ? 'Weekly item updated' : 'Added to weekly list');
    } catch (error) {
      console.error('Failed to save weekly grocery template:', error);
      showToast('error', 'Failed to save weekly item');
    }
  };

  const handleRequestDeleteWeeklyTemplate = (template: GroceryTemplate) => {
    setPendingDeleteWeeklyTemplate(template);
  };

  const handleConfirmDeleteWeeklyTemplate = async () => {
    if (!pendingDeleteWeeklyTemplate) return;

    setDeletingWeeklyTemplateId(pendingDeleteWeeklyTemplate.id);
    try {
      await deleteWeeklyGroceryTemplate(pendingDeleteWeeklyTemplate.id);
      await loadWeeklyTemplates();
      setPendingDeleteWeeklyTemplate(null);
      showToast('success', 'Removed from weekly list');
    } catch (error) {
      console.error('Failed to delete weekly grocery template:', error);
      showToast('error', 'Failed to remove weekly item');
    } finally {
      setDeletingWeeklyTemplateId(null);
    }
  };

  const executePopulateWeeklyStaples = async (includeDuplicates: boolean) => {
    try {
      setPopulatingWeekly(true);
      const listId = await ensureDefaultListId();
      const result = await populateWeeklyTemplatesToGroceryList({
        householdId: currentSpaceId,
        listId,
        includeDuplicates,
      });

      await loadGroceryItems(getAbortSignal());
      setWeeklyPopulatePreview(null);

      if (result.added === 0 && result.skipped > 0) {
        showToast('info', 'Everything from weekly staples is already on the list');
        return;
      }

      if (result.skipped > 0) {
        showToast('success', `Added ${result.added} weekly item${result.added !== 1 ? 's' : ''} and skipped ${result.skipped}`);
      } else {
        showToast('success', `Added ${result.added} weekly item${result.added !== 1 ? 's' : ''} to the list`);
      }
    } catch (error) {
      console.error('Failed to populate weekly grocery list:', error);
      showToast('error', 'Failed to add weekly staples');
    } finally {
      setPopulatingWeekly(false);
    }
  };

  const handleApplySubstitution = async (original: string, replacement: string) => {
    // Find the grocery item by name and replace with new food item
    const itemToReplace = groceryItems.find(item => 
      (item.food_item?.name || item.item_name) === original
    );
    
    if (!itemToReplace) return;

    try {
      // Get or create the replacement food item
      const { getOrCreateFoodItem } = await import('../../../lib/foodItems');
      const replacementFoodItem = await getOrCreateFoodItem(replacement);
      
      // Update the grocery item's food_item_id
      const { updateGroceryItem } = await import('../../../lib/intelligentGrocery');
      await updateGroceryItem(itemToReplace.id, { 
        food_item_id: replacementFoodItem.id 
      });
      
      await loadGroceryItems(getAbortSignal());
      showToast('success', 'Substitution applied');
    } catch (error) {
      console.error('Failed to apply substitution:', error);
      showToast('error', 'Failed to apply substitution');
    }
  };

  const getItemStatus = (foodItemId: string, itemName: string): IngredientStatus | undefined => {
    return sanitized?.conflicts.find(c => c.ingredient === itemName);
  };

  const getStatusColor = (status: IngredientStatus['status']) => {
    switch (status) {
      case 'allergen':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'restricted':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'avoid':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-white border-gray-200 text-gray-900';
    }
  };

  const conflictCount = sanitized?.conflicts.length || 0;
  const safeCount = sanitized?.safe.length || 0;
  const checkedCount = groceryItems.filter((item) => item.checked).length;
  const pricedItems = groceryItems.filter((item) => item.estimated_price !== null && item.estimated_price !== undefined);
  const totalEstimatedSpend = pricedItems.reduce((sum, item) => sum + (item.estimated_price || 0), 0);
  const checkedEstimatedSpend = groceryItems
    .filter((item) => item.checked && item.estimated_price !== null && item.estimated_price !== undefined)
    .reduce((sum, item) => sum + (item.estimated_price || 0), 0);
  const remainingEstimatedSpend = totalEstimatedSpend - checkedEstimatedSpend;
  const unpricedCount = groceryItems.length - pricedItems.length;
  const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  });

  const getCategoryLabel = (category: string | null | undefined) => {
    const value = (category || 'other').trim();
    if (!value) return 'Other';

    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const inferPantryItemTypeFromCategory = (category: string | null | undefined): PantryItemType | null => {
    const normalizedCategory = (category || '').toLowerCase();

    if (['household', 'cleaning', 'toiletries', 'non_food'].includes(normalizedCategory)) {
      return 'non_food';
    }

    if (['produce', 'dairy', 'meat', 'bakery', 'frozen'].includes(normalizedCategory)) {
      return 'perishable';
    }

    if (normalizedCategory) {
      return 'long_life';
    }

    return null;
  };

  const inferPantryItemType = (item: GroceryItem): PantryItemType | null => {
    return item.item_type || inferPantryItemTypeFromCategory(item.category || item.food_item?.category || '');
  };

  const buildTransferFoodItem = (item: GroceryItem): FoodItem => ({
    id: item.food_item?.id || item.food_item_id,
    name: item.food_item?.name || item.item_name || 'Unknown Item',
    normalized_name: item.food_item?.normalized_name || (item.food_item?.name || item.item_name || 'unknown item').toLowerCase(),
    category: item.food_item?.category || item.category || null,
    emoji: item.food_item?.emoji || null,
    created_at: item.food_item?.created_at || new Date().toISOString(),
    updated_at: item.food_item?.updated_at || new Date().toISOString(),
  });

  const getQuantityPrefill = (item: GroceryItem, defaults: { quantityValue: string; quantityUnit: string }) => {
    if (!item.quantity) {
      return defaults;
    }

    const quantityStr = item.quantity.trim();
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);

    if (match) {
      return {
        quantityValue: match[1],
        quantityUnit: match[2].trim() || item.unit || defaults.quantityUnit,
      };
    }

    return {
      quantityValue: quantityStr || defaults.quantityValue,
      quantityUnit: item.unit || defaults.quantityUnit,
    };
  };

  const getWeightPrefill = (
    estimatedWeightGrams: number | null | undefined,
    defaults: { weightValue: string; weightUnit: string }
  ) => {
    if (estimatedWeightGrams && estimatedWeightGrams > 0) {
      if (estimatedWeightGrams >= 1000 && estimatedWeightGrams % 1000 === 0) {
        return {
          weightValue: String(estimatedWeightGrams / 1000),
          weightUnit: 'kg',
        };
      }

      return {
        weightValue: String(estimatedWeightGrams),
        weightUnit: 'g',
      };
    }

    return {
      weightValue: defaults.weightValue || '',
      weightUnit: defaults.weightUnit || 'g',
    };
  };

  const parseEstimatedWeightGrams = (weightValue: string, weightUnit: string) => {
    const trimmedValue = weightValue.trim();
    if (!trimmedValue) return null;

    const numericValue = Number.parseFloat(trimmedValue);
    if (Number.isNaN(numericValue) || numericValue <= 0) return null;

    const factorByUnit: Record<string, number> = {
      g: 1,
      kg: 1000,
      oz: 28.3495,
      lb: 453.592,
    };

    return Math.round(numericValue * (factorByUnit[weightUnit] || 1));
  };

  const resetTransferForm = () => {
    setPendingQuantityValue('');
    setPendingQuantityUnit('');
    setPendingWeightValue('');
    setPendingWeightUnit('g');
    setPendingEstimatedCost('');
    setPendingExpiresOn('');
    setPendingDefaultHint(null);
    setPendingItemType(null);
    setPendingTotalPortions('');
    setPendingPortionUnit('');
  };

  const buildPurchaseTimestamp = (dateValue: string) => {
    if (!dateValue) return new Date().toISOString();
    return new Date(`${dateValue}T12:00:00`).toISOString();
  };

  const openTransferSheetForItem = (item: GroceryItem, queue: GroceryItem[], totalCount: number) => {
    const foodItem = buildTransferFoodItem(item);
    const defaults = getPantryAddDefaults(foodItem);
    const quantityPrefill = getQuantityPrefill(item, defaults);
    const weightPrefill = getWeightPrefill(item.estimated_weight_grams, defaults);

    setTransferQueue(queue);
    setTransferTotalCount(totalCount);
    setPendingFoodItem(foodItem);
    setPendingGroceryItemId(item.id);
    setPendingQuantityValue(quantityPrefill.quantityValue);
    setPendingQuantityUnit(quantityPrefill.quantityUnit);
    setPendingWeightValue(weightPrefill.weightValue);
    setPendingWeightUnit(weightPrefill.weightUnit);
    setPendingEstimatedCost(item.estimated_price != null ? String(item.estimated_price) : '');
    setPendingExpiresOn(item.expires_on || '');
    setPendingDefaultHint(defaults.hint);
    setPendingItemType(inferPantryItemType(item));
    setPendingTotalPortions(item.total_portions != null ? String(item.total_portions) : '');
    setPendingPortionUnit(item.portion_unit || '');
    setShowLocationSelector(true);
  };

  const handleBeginAddCheckedToPantry = async () => {
    const checkedItems = groceryItems.filter((item) => item.checked);

    if (checkedItems.length === 0) {
      showToast('info', 'Tick the items you bought first');
      return;
    }

    if (pantryLocations.length === 0) {
      await loadPantryLocations();
    }

    setTransferQueue(checkedItems);
    setTransferTotalCount(checkedItems.length);
    setShowCheckoutSheet(true);
  };

  const handleContinueCheckoutToPantry = () => {
    const checkedItems = groceryItems.filter((item) => item.checked);
    if (checkedItems.length === 0) {
      setShowCheckoutSheet(false);
      showToast('info', 'No checked items left to move');
      return;
    }

    setShowCheckoutSheet(false);
    openTransferSheetForItem(checkedItems[0], checkedItems, checkedItems.length);
  };

  const handleLocationSelect = async (locationId: string | null) => {
    if (!pendingFoodItem || !pendingGroceryItemId) return;

    const sourceItem = groceryItems.find((item) => item.id === pendingGroceryItemId);

    try {
      const estimatedCost = pendingEstimatedCost.trim()
        ? Number.parseFloat(pendingEstimatedCost.trim())
        : null;
      const estimatedWeightGrams = parseEstimatedWeightGrams(pendingWeightValue, pendingWeightUnit);

      const totalPortions = pendingTotalPortions.trim()
        ? Number.parseInt(pendingTotalPortions.trim(), 10)
        : null;

      await moveGroceryItemToPantry({
        groceryItemId: pendingGroceryItemId,
        householdId: currentSpaceId,
        foodItemId: pendingFoodItem.id,
        locationId: locationId || undefined,
        quantityValue: pendingQuantityValue.trim() || undefined,
        quantityUnit: pendingQuantityUnit.trim() || undefined,
        expiresOn: pendingExpiresOn || undefined,
        itemType: pendingItemType || undefined,
        notes: sourceItem?.notes || undefined,
        pantryCost: estimatedCost !== null && !Number.isNaN(estimatedCost) ? estimatedCost : null,
        estimatedWeightGrams,
        totalPortions: totalPortions && totalPortions > 0 ? totalPortions : null,
        portionUnit: pendingPortionUnit.trim() || null,
        storeName: checkoutStoreName.trim() || undefined,
        purchasedDate: buildPurchaseTimestamp(checkoutPurchasedDate),
      });

      if (locationId) {
        setLastUsedLocationId(locationId);
        sessionStorage.setItem(`last_used_location_${currentSpaceId}`, locationId);
      }

      const nextQueue = transferQueue.filter((item) => item.id !== pendingGroceryItemId);
      if (nextQueue.length > 0) {
        openTransferSheetForItem(nextQueue[0], nextQueue, transferTotalCount);
      } else {
        setShowLocationSelector(false);
        setPendingFoodItem(null);
        setPendingGroceryItemId(null);
        setTransferQueue([]);
        setTransferTotalCount(0);
        resetTransferForm();
        setCheckoutStoreName('');
        setCheckoutPurchasedDate(() => {
          const now = new Date();
          const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
          return local.toISOString().slice(0, 10);
        });
        await loadGroceryItems(getAbortSignal());
        showToast('success', `Added ${transferTotalCount} item${transferTotalCount !== 1 ? 's' : ''} to pantry`);
      }
    } catch (error) {
      console.error('Failed to add item to pantry:', error);
      showToast('error', 'Failed to add item to pantry');
    }
  };

  const groupedItems = CATEGORY_ORDER
    .map((category) => ({
      key: category,
      label: getCategoryLabel(category),
      items: groceryItems
        .filter((item) => (item.category || 'other') === category)
        .sort((a, b) => Number(a.checked) - Number(b.checked) || (a.food_item?.name || a.item_name || '').localeCompare(b.food_item?.name || b.item_name || '')),
    }))
    .filter((group) => group.items.length > 0)
    .concat(
      Object.entries(
        groceryItems
          .filter((item) => !CATEGORY_ORDER.includes(item.category || 'other'))
          .reduce<Record<string, GroceryItem[]>>((acc, item) => {
            const key = item.category || 'other';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {})
      ).map(([key, items]) => ({
        key,
        label: getCategoryLabel(key),
        items: items.sort((a, b) => Number(a.checked) - Number(b.checked) || (a.food_item?.name || a.item_name || '').localeCompare(b.food_item?.name || b.item_name || '')),
      }))
    );

  const weeklyImportCandidates = groceryItems.map((item) => ({
    item,
    existingTemplate: getWeeklyTemplateForItem(item),
  }));
  const selectedWeeklyImportCount = selectedWeeklyImportIds.length;
  const weeklyImportDuplicateCount = weeklyImportCandidates.filter((candidate) => candidate.existingTemplate).length;

  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 border-teal-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group relative">
        <ShoppingCart size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
        {groceryItems.length > 0 && (
          <div className="absolute top-1 right-1 bg-white text-teal-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {groceryItems.length}
          </div>
        )}
        {conflictCount > 0 && (
          <div className="absolute bottom-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            !
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 border-2 rounded-2xl p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500 p-1.5 rounded-lg">
              <ShoppingCart size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-teal-900 text-sm">Grocery List</h3>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-200 px-2 py-0.5 rounded-full">
            {groceryItems.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-xs text-teal-600 italic animate-pulse">Loading...</div>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-hidden">
            {conflictCount > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-2 flex items-start gap-1.5">
                <AlertTriangle size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">{conflictCount} item{conflictCount !== 1 ? 's' : ''} with conflicts</p>
              </div>
            )}

            {groceryItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-600">Empty list</p>
                <p className="text-xs text-teal-600 mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {groceryItems.slice(0, 4).map((item) => {
                  const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                  const status = getItemStatus(item.food_item_id, itemName);
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs">
                      {status ? (
                        <AlertTriangle size={10} className="text-red-600 flex-shrink-0" />
                      ) : (
                        <Check size={10} className="text-green-600 flex-shrink-0" />
                      )}
                      <span className={`truncate ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {itemName}
                      </span>
                    </div>
                  );
                })}
                {groceryItems.length > 4 && (
                  <p className="text-xs text-gray-500 text-center mt-1">+{groceryItems.length - 4} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 border-2 rounded-2xl p-6 flex flex-col shadow-lg">
      <WidgetHeader
        icon={
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <ShoppingCart size={24} className="text-white" />
          </div>
        }
        title="Grocery List"
        subtitle={
          (loading || spacesLoading) ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${groceryItems.length} items • ${checkedCount} checked off • ${safeCount} safe • ${conflictCount} conflicts`
          )
        }
        currentSpaceId={currentSpaceId}
        onSpaceChange={setCurrentSpace}
        availableSpaces={availableSpaces}
        showSpaceSwitcher={availableSpaces.length > 1 && !spacesLoading}
      />

      {!loading && conflictCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Dietary Conflicts Detected</p>
              <p className="text-xs text-red-700 mt-0.5">{conflictCount} item{conflictCount !== 1 ? 's' : ''} may not be suitable for all household members</p>
            </div>
          </div>
          <button
            onClick={() => setShowSubstitutions(!showSubstitutions)}
            className="text-xs text-red-700 hover:text-red-800 font-medium underline flex items-center gap-1"
          >
            <Lightbulb size={12} />
            {showSubstitutions ? 'Hide' : 'View'} suggested substitutions
          </button>
        </div>
      )}

      {!loading && groceryItems.length > 0 && (
        <div className="mb-4 rounded-[1.5rem] border border-teal-200/80 bg-white/80 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setEstimatedCostExpanded((prev) => !prev)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700/80">
                Estimated Cost
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {currencyFormatter.format(totalEstimatedSpend)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {pricedItems.length === 0
                  ? 'Add estimated prices to see your shopping total.'
                  : `${pricedItems.length} priced item${pricedItems.length !== 1 ? 's' : ''} on this list`}
              </p>
            </div>
            <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500">
              <ChevronDown
                size={18}
                className={`transition-transform ${estimatedCostExpanded ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {estimatedCostExpanded && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-[15rem]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">To buy</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {currencyFormatter.format(Math.max(remainingEstimatedSpend, 0))}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Checked off</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {currencyFormatter.format(Math.max(checkedEstimatedSpend, 0))}
                  </p>
                </div>
              </div>

              {unpricedCount > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-sm text-amber-900">
                    {unpricedCount} item{unpricedCount !== 1 ? 's' : ''} still missing an estimated cost.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-4 rounded-[1.5rem] border border-teal-200/80 bg-white/80 p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setWeeklyStaplesExpanded((prev) => !prev)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700/80">
              Weekly Staples
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {weeklyTemplates.length === 0
                ? 'Build your recurring list'
                : `${weeklyTemplates.length} item${weeklyTemplates.length !== 1 ? 's' : ''} ready to reuse`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Save regular buys once, then add them back into the Grocery list with one button.
            </p>
          </div>
          <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500">
            <ChevronDown
              size={18}
              className={`transition-transform ${weeklyStaplesExpanded ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {weeklyStaplesExpanded && (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handlePopulateWeeklyStaples}
                disabled={(weeklyTemplates.length === 0 && groceryItems.length === 0) || populatingWeekly || buildingWeekly}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {buildingWeekly
                  ? 'Building...'
                  : populatingWeekly
                  ? 'Adding...'
                  : weeklyTemplates.length === 0
                  ? 'Build weekly list'
                  : 'Add weekly list'}
              </button>
              <button
                onClick={() => setShowBuildWeeklySheet(true)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Manage weekly list
              </button>
            </div>

            {weeklyTemplates.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 px-3 py-3">
                <p className="text-sm text-teal-900">
                  Tap the repeat icon on a shopping item to save it as a weekly staple.
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/70 px-3 py-3">
                <p className="text-sm text-teal-900">
                  Weekly staples stay inside <span className="font-semibold">Manage weekly list</span>. Use <span className="font-semibold">Add weekly list</span> when you want to bring them into this Grocery list.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowFoodPicker(true)}
          className="group flex w-full items-center justify-between rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-left text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-all hover:bg-slate-800 hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/15 transition-transform group-hover:scale-105">
              <Plus size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-base">Add food item</p>
              <p className="text-xs text-slate-300 sm:text-sm">Search staples or add a custom item</p>
            </div>
          </div>
          <span className="ml-3 flex-shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
            Add
          </span>
        </button>
      </div>

      {/* FoodPicker Modal */}
      <FoodPicker
        isOpen={showFoodPicker}
        onClose={() => setShowFoodPicker(false)}
        onSelect={handleFoodItemSelect}
        householdId={currentSpaceId}
        excludeIds={groceryItems.map(item => item.food_item_id).filter(Boolean)}
        placeholder="Search for a food item..."
        title="Add to shopping list"
        showAwareness={true}
        presetSections={PANTRY_STARTER_SECTIONS}
        quickPickItems={PANTRY_QUICK_PICK_ITEMS}
        layout="pantry"
      />

      <PantryLocationSelector
        isOpen={showAddItemSheet}
        onClose={() => {
          setShowAddItemSheet(false);
          resetPendingListForm();
        }}
        onSelect={handleSaveGroceryItem}
        locations={pantryLocations}
        lastUsedLocationId={lastUsedLocationId}
        initialLocationId={pendingListLocationId}
        spaceId={currentSpaceId}
        onLocationCreated={(location) => {
          setPantryLocations((prev) =>
            [...prev.filter((existing) => existing.id !== location.id), location].sort(
              (a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name)
            )
          );
        }}
        foodItem={pendingListFoodItem}
        itemName={pendingListName}
        onItemNameChange={setPendingListName}
        smartDefaultHint={
          pendingListAlreadyInPantry
            ? [pendingListDefaultHint, 'Already in pantry, but you can still add it to the shopping list.']
                .filter(Boolean)
                .join(' ')
            : pendingListDefaultHint
        }
        sheetTitle={pendingListEditingId ? 'Edit shopping item' : 'Add to shopping list'}
        submitLabel={pendingListEditingId ? 'Save changes' : 'Add to list'}
        quantityValue={pendingListQuantity}
        quantityUnit={pendingListUnit}
        weightValue={pendingListWeightValue}
        weightUnit={pendingListWeightUnit}
        estimatedCost={pendingListEstimatedCost}
        expiresOn={pendingListExpiresOn}
        itemType={pendingListItemType}
        notes={pendingListNotes}
        onQuantityValueChange={setPendingListQuantity}
        onQuantityUnitChange={setPendingListUnit}
        onWeightValueChange={setPendingListWeightValue}
        onWeightUnitChange={setPendingListWeightUnit}
        onEstimatedCostChange={setPendingListEstimatedCost}
        onExpiresOnChange={setPendingListExpiresOn}
        onItemTypeChange={setPendingListItemType}
        onNotesChange={setPendingListNotes}
        totalPortions={pendingListTotalPortions}
        portionUnit={pendingListPortionUnit}
        onTotalPortionsChange={setPendingListTotalPortions}
        onPortionUnitChange={setPendingListPortionUnit}
      />

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
        {groceryItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-teal-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-base text-gray-700 font-semibold mb-1">Your list is empty</p>
            <p className="text-sm text-teal-600">Add items to start shopping</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedItems.map((group) => {
              const groupCheckedCount = group.items.filter((item) => item.checked).length;

              return (
                <section key={group.key} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">{group.label}</h4>
                      <p className="text-xs text-teal-700/80">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''} • {groupCheckedCount} checked off
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                      const status = getItemStatus(item.food_item_id, itemName);
                      const statusColors = status ? getStatusColor(status.status) : 'bg-white border-gray-200';

                      return (
                        <div key={item.id} className={`${statusColors} rounded-lg p-3 border-2 transition-all ${item.checked ? 'opacity-80' : ''}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => handleToggleItem(item.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {item.food_item?.emoji && (
                                    <span className="text-base flex-shrink-0">{item.food_item.emoji}</span>
                                  )}
                                  <p className={`font-semibold text-sm truncate ${item.checked ? 'line-through text-gray-500' : ''}`}>
                                    {itemName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50/90 px-1.5 py-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleToggleWeeklyTemplate(item)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                      getWeeklyTemplateForItem(item)
                                        ? 'text-teal-600 hover:bg-teal-50 hover:text-teal-700'
                                        : 'text-gray-400 hover:bg-white hover:text-teal-600'
                                    }`}
                                    aria-label={
                                      getWeeklyTemplateForItem(item)
                                        ? `Remove ${itemName} from weekly staples`
                                        : `Save ${itemName} to weekly staples`
                                    }
                                    disabled={savingWeeklyItemId === item.id}
                                  >
                                    <Repeat2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleEditListItem(item)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white hover:text-teal-600"
                                    aria-label={`Edit ${itemName}`}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                                    aria-label={`Delete ${itemName}`}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>

                              {(item.quantity || item.unit) && (
                                <p className={`text-xs mt-1 ${item.checked ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {[item.quantity, item.unit].filter(Boolean).join(' ')}
                                </p>
                              )}

                              {item.estimated_price !== null && item.estimated_price !== undefined && (
                                <p className={`text-xs mt-1 font-semibold ${item.checked ? 'text-teal-400' : 'text-teal-700'}`}>
                                  Est. {currencyFormatter.format(item.estimated_price)}
                                </p>
                              )}

                              {status && (
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-start gap-1.5">
                                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium">{status.reason}</p>
                                  </div>

                                  {status.suggestion && (
                                    <div className="flex items-start gap-1.5 bg-white/60 p-2 rounded">
                                      <Sparkles size={12} className="text-teal-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-xs font-semibold text-teal-900">Suggested: {status.suggestion}</p>
                                        <button
                                          onClick={async () => {
                                            const { getOrCreateFoodItem } = await import('../../../lib/foodItems');
                                            const newFoodItem = await getOrCreateFoodItem(status.suggestion!);
                                            const { updateGroceryItem } = await import('../../../lib/intelligentGrocery');
                                            await updateGroceryItem(item.id, { food_item_id: newFoodItem.id });
                                            await loadGroceryItems(getAbortSignal());
                                            showToast('success', 'Substitution applied');
                                          }}
                                          className="text-xs text-teal-600 hover:text-teal-700 font-medium underline mt-1"
                                        >
                                          Apply substitution
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {!loading && groceryItems.length > 0 && checkedCount > 0 && (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-950">
                {`${checkedCount} item${checkedCount !== 1 ? 's' : ''} ready for Pantry`}
              </p>
              <p className="text-xs text-teal-700/80">
                Checking an item only marks it as bought. Use the button when you are ready to move those items into Pantry.
              </p>
            </div>
            <button
              onClick={handleBeginAddCheckedToPantry}
              className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-200 disabled:text-teal-700"
            >
              Add checked to pantry
            </button>
          </div>
        </div>
      )}

      <PantryLocationSelector
        isOpen={showLocationSelector}
        onClose={() => {
          setShowLocationSelector(false);
          setTransferQueue([]);
          setTransferTotalCount(0);
          setPendingFoodItem(null);
          setPendingGroceryItemId(null);
          resetTransferForm();
        }}
        onSelect={handleLocationSelect}
        locations={pantryLocations}
        lastUsedLocationId={lastUsedLocationId}
        initialLocationId={groceryItems.find((item) => item.id === pendingGroceryItemId)?.location_id || null}
        spaceId={currentSpaceId}
        onLocationCreated={(location) => {
          setPantryLocations((prev) =>
            [...prev.filter((existing) => existing.id !== location.id), location].sort(
              (a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name)
            )
          );
        }}
        foodItem={pendingFoodItem}
        smartDefaultHint={pendingDefaultHint}
        quantityValue={pendingQuantityValue}
        quantityUnit={pendingQuantityUnit}
        weightValue={pendingWeightValue}
        weightUnit={pendingWeightUnit}
        estimatedCost={pendingEstimatedCost}
        expiresOn={pendingExpiresOn}
        itemType={pendingItemType}
        onQuantityValueChange={setPendingQuantityValue}
        onQuantityUnitChange={setPendingQuantityUnit}
        onWeightValueChange={setPendingWeightValue}
        onWeightUnitChange={setPendingWeightUnit}
        onEstimatedCostChange={setPendingEstimatedCost}
        onExpiresOnChange={setPendingExpiresOn}
        onItemTypeChange={setPendingItemType}
        totalPortions={pendingTotalPortions}
        portionUnit={pendingPortionUnit}
        onTotalPortionsChange={setPendingTotalPortions}
        onPortionUnitChange={setPendingPortionUnit}
        estimatedCostLabel="Paid price (optional)"
        estimatedCostHelpText="Used for Pantry budget history and your current stock value."
      />

      <BottomSheet
        isOpen={showCheckoutSheet}
        onClose={() => {
          setShowCheckoutSheet(false);
          setTransferQueue([]);
          setTransferTotalCount(0);
        }}
        title="Shopping checkout"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCheckoutSheet(false);
                setTransferQueue([]);
                setTransferTotalCount(0);
              }}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={handleContinueCheckoutToPantry}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Continue
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50/70 p-4">
            <p className="text-sm font-semibold text-teal-950">
              {transferTotalCount} item{transferTotalCount !== 1 ? 's' : ''} ready to move
            </p>
            <p className="mt-1 text-sm text-teal-800">
              Capture the shopping context once, then confirm each item’s Pantry details and paid price.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-stone-600">Store (optional)</label>
            <input
              type="text"
              value={checkoutStoreName}
              onChange={(event) => setCheckoutStoreName(event.target.value)}
              placeholder="e.g. Tesco, Aldi, Sainsbury's"
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-stone-600">Purchase date</label>
            <input
              type="date"
              value={checkoutPurchasedDate}
              onChange={(event) => setCheckoutPurchasedDate(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showBuildWeeklySheet}
        onClose={() => {
          if (buildingWeekly) return;
          setShowBuildWeeklySheet(false);
        }}
        header={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Repeat2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-stone-900">Build weekly list</h3>
              <p className="truncate text-sm text-stone-600">
                Save your current Grocery list as reusable weekly staples
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowBuildWeeklySheet(false)}
              disabled={buildingWeekly}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowWeeklyFoodPicker(true)}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              Add item...
            </button>
            <button
              onClick={openImportCurrentListSheet}
              disabled={groceryItems.length === 0 || buildingWeekly}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {buildingWeekly ? 'Importing...' : `Import current list (${groceryItems.length})`}
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-700">
              Add your regular weekly buys here. This uses the same search and item detail flow as the Pantry and Shopping list, so the defaults stay consistent.
            </p>
          </div>

          {weeklyTemplates.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-teal-200 bg-teal-50/80 p-5 text-center">
              <p className="text-sm font-semibold text-teal-900">No weekly items yet</p>
              <p className="mt-1 text-sm text-teal-800">
                Add items one by one or import your current Grocery list to build this weekly list.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {weeklyTemplates.map((template) => {
                const itemType = template.item_type || inferPantryItemTypeFromCategory(template.category);

                return (
                  <div key={template.id} className="rounded-2xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{itemType === 'perishable' ? '🥬' : itemType === 'non_food' ? '🧻' : '🥫'}</span>
                          <p className="truncate text-sm font-semibold text-stone-900">{template.item_name}</p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          {template.typical_quantity && <span>{template.typical_quantity}</span>}
                          {template.estimated_price !== null && template.estimated_price !== undefined && (
                            <span>Est. {currencyFormatter.format(template.estimated_price)}</span>
                          )}
                          {template.category && <span>{getCategoryLabel(template.category)}</span>}
                        </div>
                        {template.notes && (
                          <p className="mt-2 text-xs text-stone-600">{template.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditWeeklyTemplate(template)}
                          className="text-gray-400 hover:text-teal-600"
                          aria-label={`Edit ${template.item_name}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleRequestDeleteWeeklyTemplate(template)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Delete ${template.item_name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showImportWeeklySheet}
        onClose={() => {
          if (buildingWeekly) return;
          setShowImportWeeklySheet(false);
          setSelectedWeeklyImportIds([]);
        }}
        header={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Repeat2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-stone-900">Import current list</h3>
              <p className="truncate text-sm text-stone-600">
                Choose which Grocery items should be saved into the weekly list
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowImportWeeklySheet(false);
                setSelectedWeeklyImportIds([]);
              }}
              disabled={buildingWeekly}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleBuildWeeklyFromCurrentList}
              disabled={buildingWeekly || selectedWeeklyImportCount === 0}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 min-h-[44px]"
            >
              {buildingWeekly ? 'Saving...' : `Save selected (${selectedWeeklyImportCount})`}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-700">
              Items already in the weekly list are marked below. Leave them unticked to skip them, or tick them if you want to refresh the weekly item with the current Grocery list values.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Selected</p>
              <p className="mt-2 text-2xl font-black text-teal-900">{selectedWeeklyImportCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">Already saved</p>
              <p className="mt-2 text-2xl font-black text-stone-900">{weeklyImportDuplicateCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            {weeklyImportCandidates.map(({ item, existingTemplate }) => {
              const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
              const isSelected = selectedWeeklyImportIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
                    isSelected
                      ? 'border-teal-300 bg-teal-50/70'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleWeeklyImportSelection(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.food_item?.emoji && <span className="text-base">{item.food_item.emoji}</span>}
                          <p className="truncate text-sm font-semibold text-stone-900">{itemName}</p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          {(item.quantity || item.unit) && <span>{[item.quantity, item.unit].filter(Boolean).join(' ')}</span>}
                          {item.estimated_price !== null && item.estimated_price !== undefined && (
                            <span>Est. {currencyFormatter.format(item.estimated_price)}</span>
                          )}
                          {item.category && <span>{getCategoryLabel(item.category)}</span>}
                        </div>
                      </div>

                      {existingTemplate && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          Already in weekly list
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      <FoodPicker
        isOpen={showWeeklyFoodPicker}
        onClose={() => setShowWeeklyFoodPicker(false)}
        onSelect={handleWeeklyFoodItemSelect}
        householdId={currentSpaceId}
        placeholder="Search for a weekly item..."
        title="Add to weekly list"
        showAwareness={false}
        presetSections={PANTRY_STARTER_SECTIONS}
        quickPickItems={PANTRY_QUICK_PICK_ITEMS}
        layout="pantry"
      />

      <PantryLocationSelector
        isOpen={showWeeklyItemSheet}
        onClose={() => {
          setShowWeeklyItemSheet(false);
          resetWeeklyTemplateForm();
        }}
        onSelect={() => {
          void handleSaveWeeklyTemplate();
        }}
        locations={[]}
        lastUsedLocationId={null}
        initialLocationId={null}
        spaceId={currentSpaceId}
        foodItem={pendingWeeklyFoodItem}
        itemName={pendingWeeklyName}
        onItemNameChange={setPendingWeeklyName}
        smartDefaultHint={pendingWeeklyDefaultHint}
        sheetTitle={pendingWeeklyTemplateId ? 'Edit weekly item' : 'Add to weekly list'}
        submitLabel={pendingWeeklyTemplateId ? 'Save weekly item' : 'Add to weekly list'}
        quantityValue={pendingWeeklyQuantity}
        quantityUnit={pendingWeeklyUnit}
        weightValue={pendingWeeklyWeightValue}
        weightUnit={pendingWeeklyWeightUnit}
        estimatedCost={pendingWeeklyEstimatedCost}
        itemType={pendingWeeklyItemType}
        notes={pendingWeeklyNotes}
        onQuantityValueChange={setPendingWeeklyQuantity}
        onQuantityUnitChange={setPendingWeeklyUnit}
        onWeightValueChange={setPendingWeeklyWeightValue}
        onWeightUnitChange={setPendingWeeklyWeightUnit}
        onEstimatedCostChange={setPendingWeeklyEstimatedCost}
        onItemTypeChange={setPendingWeeklyItemType}
        onNotesChange={setPendingWeeklyNotes}
        showLocationSection={false}
      />

      <BottomSheet
        isOpen={!!pendingDeleteWeeklyTemplate}
        onClose={() => {
          if (deletingWeeklyTemplateId) return;
          setPendingDeleteWeeklyTemplate(null);
        }}
        header={
          pendingDeleteWeeklyTemplate ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Repeat2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">Remove weekly item</h3>
                <p className="truncate text-sm text-stone-600">
                  {pendingDeleteWeeklyTemplate.item_name}
                </p>
              </div>
            </div>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setPendingDeleteWeeklyTemplate(null)}
              disabled={!!deletingWeeklyTemplateId}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              Keep item
            </button>
            <button
              onClick={handleConfirmDeleteWeeklyTemplate}
              disabled={!!deletingWeeklyTemplateId}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              {deletingWeeklyTemplateId ? 'Removing...' : 'Remove item'}
            </button>
          </div>
        }
      >
        {pendingDeleteWeeklyTemplate && (
          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-700">
              This will remove{' '}
              <span className="font-semibold text-stone-900">
                {pendingDeleteWeeklyTemplate.item_name}
              </span>{' '}
              from your weekly staples list.
            </p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={!!weeklyPopulatePreview}
        onClose={() => {
          if (populatingWeekly) return;
          setWeeklyPopulatePreview(null);
        }}
        header={
          weeklyPopulatePreview ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Repeat2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">Weekly list already has matches</h3>
                <p className="truncate text-sm text-stone-600">
                  {weeklyPopulatePreview.duplicates.length} item{weeklyPopulatePreview.duplicates.length !== 1 ? 's' : ''} already exist in your Grocery list
                </p>
              </div>
            </div>
          ) : undefined
        }
        footer={
          weeklyPopulatePreview ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setWeeklyPopulatePreview(null)}
                disabled={populatingWeekly}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => executePopulateWeeklyStaples(false)}
                disabled={populatingWeekly}
                className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              >
                {populatingWeekly ? 'Adding...' : `Only add missing (${weeklyPopulatePreview.missing.length})`}
              </button>
              <button
                onClick={() => executePopulateWeeklyStaples(true)}
                disabled={populatingWeekly}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              >
                {populatingWeekly ? 'Adding...' : 'Add duplicates too'}
              </button>
            </div>
          ) : undefined
        }
      >
        {weeklyPopulatePreview && (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-700">
                Some weekly staples are already in your Grocery list. Choose whether to skip those matches or add them again as duplicates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">Already on list</p>
                <p className="mt-2 text-2xl font-black text-stone-900">{weeklyPopulatePreview.duplicates.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Missing</p>
                <p className="mt-2 text-2xl font-black text-teal-900">{weeklyPopulatePreview.missing.length}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Duplicate matches
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {weeklyPopulatePreview.duplicates.map((template) => (
                  <span
                    key={template.id}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800"
                  >
                    <Repeat2 size={13} />
                    {template.item_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

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
                {pendingDeleteItem.food_item?.emoji || '🛒'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">Remove from shopping list</h3>
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
              onClick={handleConfirmRemoveItem}
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
                from your Shopping list.
              </p>
            </div>

            {(pendingDeleteItem.quantity || pendingDeleteItem.unit) && (
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Current entry
                </p>
                <p className="mt-2 text-sm text-stone-800">
                  {[pendingDeleteItem.quantity, pendingDeleteItem.unit].filter(Boolean).join(' ') || 'No quantity set'}
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {showSubstitutions && sanitized && sanitized.suggestions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Suggested Substitutions</h3>
                <button
                  onClick={() => setShowSubstitutions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600">Safe alternatives for your household</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {sanitized.suggestions.map((sub, idx) => (
                  <div key={idx} className="bg-teal-50 border border-teal-300 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 line-through">{sub.original}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Sparkles size={14} className="text-teal-600" />
                          <p className="text-sm font-bold text-teal-900">{sub.replacement}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{sub.reason}</p>
                    <button
                      onClick={() => {
                        handleApplySubstitution(sub.original, sub.replacement);
                        setShowSubstitutions(false);
                      }}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Apply Substitution
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
