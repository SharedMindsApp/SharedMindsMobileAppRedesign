import { supabase } from './supabase';
import { getOrCreateFoodItem, getFoodItemName, getFoodItemNames, type FoodItem } from './foodItems';

export interface GroceryTemplate {
  id: string;
  food_item_id: string | null;
  item_name: string;
  category: string;
  typical_quantity: string | null;
  quantity: string | null;
  unit: string | null;
  keywords: string[];
  purchase_frequency_days: number | null;
  estimated_price: number | null;
  item_type: PantryItemType | null;
  notes: string | null;
  is_weekly: boolean;
  is_system_template: boolean;
  household_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  household_id: string;
  shopping_list_id: string | null;
  food_item_id: string; // References food_items table
  item_name?: string; // Deprecated - kept for backward compatibility, use food_item.name
  quantity: string | null;
  unit: string | null;
  category: string;
  auto_categorized: boolean;
  checked: boolean;
  is_recurring: boolean;
  recurrence_days: number | null;
  last_purchased_date: string | null;
  estimated_price: number | null;
  expires_on: string | null;
  location_id: string | null;
  item_type: PantryItemType | null;
  total_portions: number | null;
  portion_unit: string | null;
  notes: string | null;
  source: string | null;
  meal_plan_id: string | null;
  added_by: string | null;
  added_by_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined from food_items
  food_item?: FoodItem;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  list_name: string;
  list_type: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PantryItemType = 'perishable' | 'long_life' | 'non_food';

export const PANTRY_ITEM_TYPES: { value: PantryItemType; label: string; emoji: string; description: string }[] = [
  { value: 'perishable', label: 'Perishable', emoji: '🥬', description: 'Fresh food with short shelf life' },
  { value: 'long_life', label: 'Long Life', emoji: '🥫', description: 'Tins, jars, dried, UHT, powdered' },
  { value: 'non_food', label: 'Non-Food', emoji: '🧻', description: 'Toilet roll, cleaning, household' },
];

export interface PantryItem {
  id: string;
  household_id: string;
  food_item_id: string; // References food_items table
  item_name?: string; // Deprecated - kept for backward compatibility, use food_item.name
  category: string;
  quantity: string | null; // Legacy - kept for backward compatibility
  unit: string | null; // Legacy - kept for backward compatibility
  quantity_value: string | null; // Preferred: natural language quantity (e.g. "3", "half", "a few")
  quantity_unit: string | null; // Preferred: unit (e.g. "tins", "packs", "kg")
  expiration_date: string | null; // Legacy - kept for backward compatibility
  expires_on: string | null; // Preferred: date (YYYY-MM-DD format)
  location: string | null; // Legacy: 'fridge' | 'freezer' | 'cupboard' (backward compatibility)
  location_id: string | null; // References pantry_locations table (preferred)
  item_type?: 'perishable' | 'long_life' | 'non_food' | null; // Perishable, Long Life, Non-Food
  status?: 'have' | 'low' | 'out'; // Optional status
  notes: string | null;
  estimated_cost?: number | null;
  total_portions?: number | null;
  remaining_portions?: number | null;
  portion_unit?: string | null;
  estimated_weight_grams?: number | null;
  vision_metadata?: Record<string, unknown> | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined from food_items
  food_item?: FoodItem;
  // Joined from pantry_locations
  pantry_location?: {
    id: string;
    name: string;
    icon: string | null;
    order_index: number;
  };
}

export interface SmartSuggestion {
  item_name: string;
  category: string;
  typical_quantity: string | null;
  days_since_last_purchase: number;
  purchase_frequency: number;
}

export interface WeeklyTemplatePopulatePreview {
  templates: GroceryTemplate[];
  duplicates: GroceryTemplate[];
  missing: GroceryTemplate[];
}

function normalizeTemplateKey(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTemplateQuantityParts(template: GroceryTemplate): { quantity: string | null; unit: string | null } {
  if (template.quantity || template.unit) {
    return {
      quantity: template.quantity || null,
      unit: template.unit || null,
    };
  }

  const typicalQuantity = template.typical_quantity?.trim();
  if (!typicalQuantity) {
    return { quantity: null, unit: null };
  }

  const match = typicalQuantity.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
  if (match) {
    return {
      quantity: match[1],
      unit: match[2].trim() || null,
    };
  }

  return {
    quantity: typicalQuantity,
    unit: null,
  };
}

function formatTypicalQuantity(quantity?: string | null, unit?: string | null): string | null {
  const quantityValue = quantity?.trim() || '';
  const unitValue = unit?.trim() || '';

  if (quantityValue && unitValue) return `${quantityValue} ${unitValue}`;
  if (quantityValue) return quantityValue;
  if (unitValue) return unitValue;
  return null;
}

async function resolveTemplateFoodItem(
  params:
    | { foodItemId: string; itemName?: string; category?: string | null }
    | { foodItemId?: string | null; itemName: string; category?: string | null }
) {
  if (params.foodItemId) {
    const { data, error } = await supabase
      .from('food_items')
      .select('id, name, category')
      .eq('id', params.foodItemId)
      .single();

    if (error) throw error;
    return data;
  }

  const created = await getOrCreateFoodItem(params.itemName, params.category);
  return created;
}

export interface PurchaseHistory {
  id: string;
  household_id: string;
  item_name: string;
  category: string;
  quantity: string | null;
  price: number | null;
  purchased_date: string;
  purchased_by: string | null;
  store_name: string | null;
}

async function findDefaultShoppingList(householdId: string): Promise<ShoppingList | null> {
  const { data, error } = await supabase
    .from('household_shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrCreateDefaultList(householdId: string, memberId?: string): Promise<ShoppingList> {
  const existingList = await findDefaultShoppingList(householdId);

  if (existingList) return existingList;

  const { data: newList, error } = await supabase
    .from('household_shopping_lists')
    .insert({
      household_id: householdId,
      list_name: 'Main Shopping List',
      list_type: 'regular',
      is_active: true,
      is_default: true,
      created_by: memberId || null,
    })
    .select()
    .single();

  if (error) {
    const isDuplicateDefaultList =
      error.code === '23505' ||
      error.status === 409 ||
      error.statusCode === 409 ||
      Boolean(error.message && error.message.includes('household_shopping_lists_default_uidx'));

    if (isDuplicateDefaultList) {
      const racedList = await findDefaultShoppingList(householdId);
      if (racedList) return racedList;
    }

    throw error;
  }

  return newList;
}

export async function getGroceryItems(householdId: string, listId?: string): Promise<GroceryItem[]> {
  let query = supabase
    .from('household_grocery_list_items')
    .select(`
      *,
      food_item:food_items(*)
    `)
    .eq('household_id', householdId)
    .order('checked', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (listId) {
    query = query.eq('shopping_list_id', listId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Map results to include food_item and ensure item_name is available for backward compatibility
  const items = (data || []).map((item: any) => ({
    ...item,
    food_item: item.food_item || null,
    item_name: item.food_item?.name || item.item_name || 'Unknown Item',
  }));
  
  return items;
}

export async function autoCategorizeItem(itemName: string): Promise<string> {
  const { data, error } = await supabase.rpc('auto_categorize_grocery_item', {
    item_name_input: itemName,
  });

  if (error) {
    console.warn('Auto-categorization failed:', error);
    return 'other';
  }

  return data || 'other';
}

export async function searchTemplates(query: string, limit: number = 10): Promise<GroceryTemplate[]> {
  const { data, error } = await supabase
    .from('household_grocery_templates')
    .select('*')
    .or(`item_name.ilike.%${query}%`)
    .eq('is_system_template', true)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getWeeklyGroceryTemplates(householdId: string): Promise<GroceryTemplate[]> {
  const { data, error } = await supabase
    .from('household_grocery_templates')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_system_template', false)
    .eq('is_weekly', true)
    .order('item_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertWeeklyGroceryTemplate(params: {
  householdId: string;
  foodItemId?: string | null;
  itemName: string;
  category?: string | null;
  quantity?: string | null;
  unit?: string | null;
  estimatedPrice?: number | null;
  itemType?: PantryItemType | null;
  notes?: string | null;
  keywords?: string[];
}): Promise<GroceryTemplate> {
  const foodItem = await resolveTemplateFoodItem({
    foodItemId: params.foodItemId || undefined,
    itemName: params.itemName,
    category: params.category,
  });

  const quantity = params.quantity?.trim() || null;
  const unit = params.unit?.trim() || null;
  const typicalQuantity = formatTypicalQuantity(quantity, unit);
  const normalizedName = normalizeTemplateKey(foodItem.name);

  const { data: existingTemplates, error: existingError } = await supabase
    .from('household_grocery_templates')
    .select('*')
    .eq('household_id', params.householdId)
    .eq('is_system_template', false)
    .eq('is_weekly', true)
    .order('created_at', { ascending: true });

  if (existingError) throw existingError;

  const existing = (existingTemplates || []).find((template) => {
    if (template.food_item_id && template.food_item_id === foodItem.id) return true;
    return normalizeTemplateKey(template.item_name) === normalizedName;
  });

  const payload = {
    household_id: params.householdId,
    food_item_id: foodItem.id,
    item_name: foodItem.name,
    category: params.category || foodItem.category || 'other',
    typical_quantity: typicalQuantity,
    quantity,
    unit,
    keywords: [normalizedName, ...(params.keywords || [])].filter(Boolean),
    purchase_frequency_days: 7,
    estimated_price: params.estimatedPrice ?? null,
    item_type: params.itemType ?? null,
    notes: params.notes ?? null,
    is_weekly: true,
    is_system_template: false,
  };

  if (existing) {
    const { data, error } = await supabase
      .from('household_grocery_templates')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('household_grocery_templates')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWeeklyGroceryTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_templates')
    .delete()
    .eq('id', templateId)
    .eq('is_weekly', true);

  if (error) throw error;
}

export async function previewWeeklyTemplatePopulate(
  householdId: string,
  listId?: string
): Promise<WeeklyTemplatePopulatePreview> {
  const [templates, groceryItems] = await Promise.all([
    getWeeklyGroceryTemplates(householdId),
    getGroceryItems(householdId, listId),
  ]);

  const existingFoodIds = new Set(groceryItems.map((item) => item.food_item_id).filter(Boolean));
  const existingNameKeys = new Set(
    groceryItems.map((item) => normalizeTemplateKey(item.food_item?.name || item.item_name || ''))
  );

  const duplicates: GroceryTemplate[] = [];
  const missing: GroceryTemplate[] = [];

  for (const template of templates) {
    const duplicate =
      (template.food_item_id && existingFoodIds.has(template.food_item_id)) ||
      existingNameKeys.has(normalizeTemplateKey(template.item_name));

    if (duplicate) {
      duplicates.push(template);
    } else {
      missing.push(template);
    }
  }

  return { templates, duplicates, missing };
}

export async function populateWeeklyTemplatesToGroceryList(params: {
  householdId: string;
  listId?: string;
  includeDuplicates?: boolean;
}): Promise<{ added: number; skipped: number }> {
  const preview = await previewWeeklyTemplatePopulate(params.householdId, params.listId);
  const templatesToAdd = params.includeDuplicates ? preview.templates : preview.missing;

  let added = 0;

  for (const template of templatesToAdd) {
    const quantityParts = parseTemplateQuantityParts(template);
    const resolvedFoodItem = template.food_item_id
      ? { id: template.food_item_id, name: template.item_name, category: template.category }
      : await resolveTemplateFoodItem({
          itemName: template.item_name,
          category: template.category,
        });

    await addGroceryItem({
      householdId: params.householdId,
      listId: params.listId,
      foodItemId: resolvedFoodItem.id,
      quantity: quantityParts.quantity || undefined,
      unit: quantityParts.unit || undefined,
      category: template.category || resolvedFoodItem.category || undefined,
      estimatedPrice: template.estimated_price ?? undefined,
      itemType: template.item_type ?? null,
      notes: template.notes ?? undefined,
      isRecurring: true,
      recurrenceDays: 7,
      source: 'weekly_template',
    });
    added += 1;
  }

  return {
    added,
    skipped: preview.templates.length - templatesToAdd.length,
  };
}

export async function getSmartSuggestions(householdId: string, limit: number = 10): Promise<SmartSuggestion[]> {
  const { data, error } = await supabase.rpc('get_smart_grocery_suggestions', {
    household_id_input: householdId,
    limit_count: limit,
  });

  if (error) {
    console.warn('Failed to get smart suggestions:', error);
    return [];
  }

  return data || [];
}

export async function addGroceryItem(params: {
  householdId: string;
  listId?: string;
  itemName?: string; // Deprecated - use foodItemId instead
  foodItemId?: string; // Preferred - use this
  quantity?: string;
  unit?: string;
  category?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrenceDays?: number;
  estimatedPrice?: number;
  expiresOn?: string;
  locationId?: string | null;
  itemType?: PantryItemType | null;
  totalPortions?: number | null;
  portionUnit?: string | null;
  source?: string;
  memberId?: string;
  memberName?: string;
}): Promise<GroceryItem> {
  // Get or create food item
  let foodItemId: string;
  if (params.foodItemId) {
    foodItemId = params.foodItemId;
  } else if (params.itemName) {
    // Backward compatibility - create food item from name
    const foodItem = await getOrCreateFoodItem(params.itemName, params.category);
    foodItemId = foodItem.id;
  } else {
    throw new Error('Either foodItemId or itemName must be provided');
  }

  // Get food item to determine category if not provided
  const foodItem = await supabase
    .from('food_items')
    .select('category')
    .eq('id', foodItemId)
    .single();

  let category = params.category || foodItem.data?.category;
  let autoCategorized = false;

  if (!category) {
    // Fallback to auto-categorization if needed
    const foodItemName = await getFoodItemName(foodItemId);
    category = await autoCategorizeItem(foodItemName);
    autoCategorized = true;
  }

  const { data, error } = await supabase
    .from('household_grocery_list_items')
    .insert({
      household_id: params.householdId,
      shopping_list_id: params.listId || null,
      food_item_id: foodItemId,
      item_name: null, // No longer storing item_name directly
      quantity: params.quantity || null,
      unit: params.unit || null,
      category: category,
      auto_categorized: autoCategorized,
      notes: params.notes || null,
      is_recurring: params.isRecurring || false,
      recurrence_days: params.recurrenceDays || null,
      estimated_price: params.estimatedPrice || null,
      expires_on: params.expiresOn || null,
      location_id: params.locationId || null,
      item_type: params.itemType || null,
      total_portions: params.totalPortions ?? null,
      portion_unit: params.portionUnit || null,
      source: params.source || 'manual',
      added_by: params.memberId ? params.memberId : null,
      added_by_name: params.memberName || null,
      checked: false,
    })
    .select(`
      *,
      food_item:food_items(*)
    `)
    .single();

  if (error) throw error;

  // Ensure item_name is available for backward compatibility
  return {
    ...data,
    food_item: data.food_item || null,
    item_name: data.food_item?.name || 'Unknown Item',
  };
}

export async function updateGroceryItem(itemId: string, updates: Partial<GroceryItem>): Promise<void> {
  // If updating food_item_id, ensure we don't also update item_name
  const cleanUpdates = { ...updates };
  if (cleanUpdates.food_item_id) {
    // Don't update item_name when food_item_id is being set
    delete (cleanUpdates as any).item_name;
  }

  const { error } = await supabase
    .from('household_grocery_list_items')
    .update(cleanUpdates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteGroceryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_list_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function toggleItemChecked(itemId: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_list_items')
    .update({
      checked,
      last_purchased_date: checked ? new Date().toISOString() : null,
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function clearCheckedItems(householdId: string, listId?: string): Promise<void> {
  let query = supabase
    .from('household_grocery_list_items')
    .delete()
    .eq('household_id', householdId)
    .eq('checked', true);

  if (listId) {
    query = query.eq('shopping_list_id', listId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function recordPurchase(params: {
  householdId: string;
  foodItemId: string; // Use food_item_id instead of itemName
  itemName?: string; // Deprecated - kept for backward compatibility
  category?: string;
  quantity?: string;
  price?: number;
  storeName?: string;
  memberId?: string;
  purchasedDate?: string;
}): Promise<void> {
  // Get food item name if not provided
  let itemName = params.itemName;
  if (!itemName && params.foodItemId) {
    itemName = await getFoodItemName(params.foodItemId);
  }

  // Get category from food item if not provided
  let category = params.category;
  if (!category && params.foodItemId) {
    const foodItem = await supabase
      .from('food_items')
      .select('category')
      .eq('id', params.foodItemId)
      .single();
    category = foodItem.data?.category || 'other';
  }

  const { error } = await supabase
    .from('household_grocery_purchase_history')
    .insert({
      household_id: params.householdId,
      item_name: itemName || 'Unknown Item', // Keep for backward compatibility
      category: category || 'other',
      quantity: params.quantity || null,
      price: params.price || null,
      store_name: params.storeName || null,
      purchased_by: params.memberId || null,
      purchased_date: params.purchasedDate || new Date().toISOString(),
    });

  if (error) throw error;
}

export async function completeShoppingTrip(
  householdId: string,
  checkedItems: GroceryItem[],
  storeName?: string,
  memberId?: string,
  purchasedDate?: string
): Promise<void> {
  for (const item of checkedItems) {
    await recordPurchase({
      householdId,
      foodItemId: item.food_item_id,
      itemName: item.item_name || item.food_item?.name, // Backward compatibility
      category: item.category,
      quantity: item.quantity || undefined,
      price: item.estimated_price || undefined,
      storeName,
      memberId,
      purchasedDate,
    });
  }
}

export async function getPurchaseHistory(
  householdId: string,
  limit: number = 180
): Promise<PurchaseHistory[]> {
  const { data, error } = await supabase
    .from('household_grocery_purchase_history')
    .select('*')
    .eq('household_id', householdId)
    .order('purchased_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getPantryItems(householdId: string): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('household_pantry_items')
    .select(`
      *,
      food_item:food_items(*),
      pantry_location:pantry_locations(id, name, icon, order_index)
    `)
    .eq('household_id', householdId)
    .order('expires_on', { ascending: true, nullsFirst: false })
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('food_item_id', { ascending: true });

  if (error) throw error;
  
  // Map results to include food_item and ensure item_name is available for backward compatibility
  const items = (data || []).map((item: any) => ({
    ...item,
    food_item: item.food_item || null,
    item_name: item.food_item?.name || item.item_name || 'Unknown Item',
    pantry_location: item.pantry_location || null,
  }));
  
  return items;
}

export async function addPantryItem(params: {
  householdId: string; // Can be a space ID or household ID (polymorphic)
  foodItemId?: string; // Preferred - use this
  itemName?: string; // Deprecated - kept for backward compatibility
  category?: string;
  quantity?: string; // Legacy - kept for backward compatibility
  unit?: string; // Legacy - kept for backward compatibility
  quantityValue?: string; // Preferred: natural language quantity
  quantityUnit?: string; // Preferred: unit
  expirationDate?: string; // Legacy - kept for backward compatibility
  expiresOn?: string; // Preferred: date (YYYY-MM-DD)
  location?: 'fridge' | 'freezer' | 'cupboard' | string; // Legacy support
  locationId?: string; // Preferred - use this (references pantry_locations)
  itemType?: 'perishable' | 'long_life' | 'non_food' | null;
  status?: 'have' | 'low' | 'out';
  notes?: string;
  estimatedCost?: number | null;
  memberId?: string;
  estimatedWeightGrams?: number | null;
  visionMetadata?: Record<string, unknown> | null;
  // Portion tracking fields
  totalPortions?: number | null; // Total portions available (null = unlimited)
  portionUnit?: string | null; // Unit for portions (e.g., "serving", "slice")
}): Promise<PantryItem> {
  // ============================================================================
  // 1. RESOLVE SPACE CONTEXT AND VALIDATE OWNERSHIP (FAIL EARLY)
  // ============================================================================

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be signed in to add pantry items.');
  }

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, type')
    .eq('id', params.householdId)
    .maybeSingle();

  if (spaceError) {
    throw new Error(`Failed to resolve pantry space: ${spaceError.message}`);
  }

  if (!space) {
    throw new Error(`Invalid pantry space ID: ${params.householdId}.`);
  }

  let resolvedHouseholdId: string | null = null;
  let resolvedAddedBy: string | null = null;

  const { data: membership, error: membershipError } = await supabase
    .from('space_members')
    .select('role, status')
    .eq('space_id', space.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to verify pantry permissions: ${membershipError.message}`);
  }

  if (!membership || !['owner', 'collaborator'].includes(membership.role)) {
    throw new Error('You do not have permission to write to this pantry.');
  }

  resolvedHouseholdId = space.id;
  resolvedAddedBy = user.id;

  // Final validation - must have resolved household ID
  if (!resolvedHouseholdId) {
    throw new Error(
      'Failed to resolve household context. Cannot create pantry item.'
    );
  }

  // Get or create food item
  let foodItemId: string;
  if (params.foodItemId) {
    foodItemId = params.foodItemId;
  } else if (params.itemName) {
    // Backward compatibility - create food item from name
    const foodItem = await getOrCreateFoodItem(params.itemName, params.category);
    foodItemId = foodItem.id;
  } else {
    throw new Error('Either foodItemId or itemName must be provided');
  }

  // Get food item to determine category and name if not provided
  const foodItem = await supabase
    .from('food_items')
    .select('category, name')
    .eq('id', foodItemId)
    .single();

  const category = params.category || foodItem.data?.category || 'other';
  const itemName = foodItem.data?.name || null; // For backward compatibility

  // Parse quantity if provided in "3 x tins" format (gentle parsing, no errors if fails)
  let quantityValue = params.quantityValue || null;
  let quantityUnit = params.quantityUnit || null;
  
  // If quantity is provided but not parsed, try gentle parsing
  if (params.quantity && !quantityValue) {
    const quantityStr = params.quantity.trim();
    // Try to parse "3 x tins" or "3 tins" format
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
    if (match) {
      quantityValue = match[1];
      quantityUnit = match[2].trim() || null;
    } else {
      // Store as-is if parsing fails
      quantityValue = quantityStr;
    }
  }

  // Normalize quantity to logical whole units (e.g., 1L bottle, 15 onions, 1kg carrots)
  if (quantityValue && foodItemId) {
    try {
      const { normalizePantryQuantity } = await import('./pantryQuantityNormalizer');
      const normalized = await normalizePantryQuantity(
        quantityValue,
        quantityUnit,
        foodItemId,
        itemName
      );
      quantityValue = normalized.quantityValue;
      quantityUnit = normalized.quantityUnit;
    } catch (error) {
      console.warn('[addPantryItem] Failed to normalize quantity, using original:', error);
      // Continue with original values if normalization fails
    }
  }

  // ============================================================================
  // 2. PREPARE INSERT PAYLOAD (after validation)
  // ============================================================================
  
  // Use resolved added_by (from auth user) or provided memberId
  const finalAddedBy = params.memberId || resolvedAddedBy;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.debug('[addPantryItem] Insert payload:', {
      household_id: resolvedHouseholdId,
      original_householdId: params.householdId,
      space_type: space.type,
      added_by: finalAddedBy,
      food_item_id: foodItemId,
    });
  }

  // ============================================================================
  // 3. INSERT PANTRY ITEM (after all validations passed)
  // ============================================================================
  
  const { data, error } = await supabase
    .from('household_pantry_items')
    .insert({
      household_id: resolvedHouseholdId,
      food_item_id: foodItemId,
      item_name: itemName, // Store for backward compatibility (can be NULL after migration)
      category: category,
      quantity: params.quantity || null, // Legacy support
      unit: params.unit || null, // Legacy support
      quantity_value: quantityValue || null,
      quantity_unit: quantityUnit || null,
      expiration_date: params.expirationDate || params.expiresOn || null, // Legacy support
      expires_on: params.expiresOn || null,
      location: params.location || null, // Legacy support
      location_id: params.locationId || null, // Preferred
      item_type: params.itemType || null,
      status: params.status || null,
      notes: params.notes || null,
      estimated_cost: params.estimatedCost ?? null,
      estimated_weight_grams: params.estimatedWeightGrams ?? null,
      vision_metadata: params.visionMetadata ?? null,
      added_by: finalAddedBy, // Use resolved auth user ID
      // Portion tracking fields
      total_portions: params.totalPortions !== undefined ? params.totalPortions : null,
      portion_unit: params.portionUnit || null,
      // remaining_portions will be set automatically by trigger to match total_portions
    })
    .select(`
      *,
      food_item:food_items(*),
      pantry_location:pantry_locations(id, name, icon, order_index)
    `)
    .single();

  if (error) {
    // Enhanced error logging
    console.error('[addPantryItem] Insert failed:', {
      code: error.code,
      message: error.message,
      resolved_household_id: resolvedHouseholdId,
      original_householdId: params.householdId,
      space_type: space.type,
      added_by: finalAddedBy,
    });
    throw error;
  }
  
  // Ensure item_name is available for backward compatibility
  return {
    ...data,
    food_item: data.food_item || null,
    item_name: data.food_item?.name || 'Unknown Item',
  };
}

export async function updatePantryItem(itemId: string, updates: Partial<PantryItem>): Promise<void> {
  const cleanUpdates: Record<string, unknown> = { ...updates };

  if ('expires_on' in cleanUpdates && !('expiration_date' in cleanUpdates)) {
    cleanUpdates.expiration_date = cleanUpdates.expires_on;
  }

  const { error } = await supabase
    .from('household_pantry_items')
    .update(cleanUpdates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deletePantryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('household_pantry_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Get normalized ingredient names from user's pantry
 * Returns array of unique, normalized ingredient names for recipe search
 */
export async function getUserPantryIngredients(spaceId: string): Promise<string[]> {
  // Convert spaceId to the pantry storage scope used by recipe services.
  // If the helper returns null for a personal space, fall back to the space ID
  // directly because pantry storage is space-scoped in V1.
  const { getHouseholdIdFromSpaceId } = await import('./recipeAIService');
  const householdId = await getHouseholdIdFromSpaceId(spaceId) || spaceId;

  try {
    const pantryItems = await getPantryItems(householdId);
    
    // Extract and normalize ingredient names
    const ingredientNames = new Set<string>();
    
    for (const item of pantryItems) {
      if (item.food_item?.name) {
        // Normalize ingredient name (lowercase, trim)
        const normalized = item.food_item.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ');
        
        if (normalized.length > 0) {
          ingredientNames.add(normalized);
        }
      }
    }
    
    return Array.from(ingredientNames).sort();
  } catch (error) {
    console.error('[getUserPantryIngredients] Failed to load pantry ingredients:', error);
    return [];
  }
}

export async function moveToPantry(groceryItem: GroceryItem, householdId: string, memberId?: string): Promise<void> {
  await moveGroceryItemToPantry({
    groceryItemId: groceryItem.id,
    householdId,
    foodItemId: groceryItem.food_item_id,
    quantityValue: groceryItem.quantity || undefined,
    quantityUnit: groceryItem.unit || undefined,
    expiresOn: groceryItem.expires_on || undefined,
    itemType: groceryItem.item_type || undefined,
    notes: groceryItem.notes || undefined,
    pantryCost: groceryItem.estimated_price ?? undefined,
    totalPortions: groceryItem.total_portions ?? undefined,
    portionUnit: groceryItem.portion_unit || undefined,
    memberId,
  });
}

export async function moveGroceryItemToPantry(params: {
  groceryItemId: string;
  householdId: string;
  foodItemId: string;
  locationId?: string | null;
  quantityValue?: string;
  quantityUnit?: string;
  expiresOn?: string;
  itemType?: PantryItemType | null;
  notes?: string;
  pantryCost?: number | null;
  totalPortions?: number | null;
  portionUnit?: string | null;
  storeName?: string;
  purchasedDate?: string;
  memberId?: string;
}): Promise<void> {
  const purchaseTimestamp = params.purchasedDate || new Date().toISOString();

  const { error } = await supabase.rpc('move_grocery_item_to_pantry', {
    p_grocery_item_id: params.groceryItemId,
    p_location_id: params.locationId || null,
    p_quantity_value: params.quantityValue || null,
    p_quantity_unit: params.quantityUnit || null,
    p_expires_on: params.expiresOn || null,
    p_item_type: params.itemType || null,
    p_notes: params.notes || null,
    p_pantry_cost: params.pantryCost ?? null,
    p_total_portions: params.totalPortions ?? null,
    p_portion_unit: params.portionUnit || null,
    p_store_name: params.storeName || null,
    p_purchased_date: purchaseTimestamp,
    p_member_id: params.memberId || null,
  });

  if (error) throw error;
}

export async function moveToPantryLegacy(groceryItem: GroceryItem, householdId: string, memberId?: string): Promise<void> {
  // Pre-fill quantity from grocery item if it exists
  let quantityValue: string | undefined;
  let quantityUnit: string | undefined;
  
  if (groceryItem.quantity) {
    // Try gentle parsing of "3 x tins" or "3 tins" format
    const quantityStr = groceryItem.quantity.trim();
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
    if (match) {
      quantityValue = match[1];
      quantityUnit = match[2].trim() || groceryItem.unit || undefined;
    } else {
      quantityValue = quantityStr;
      quantityUnit = groceryItem.unit || undefined;
    }
  }
  
  await moveGroceryItemToPantry({
    groceryItemId: groceryItem.id,
    householdId,
    foodItemId: groceryItem.food_item_id,
    quantityValue,
    quantityUnit,
    itemType: groceryItem.item_type || undefined,
    notes: groceryItem.notes || undefined,
    pantryCost: groceryItem.estimated_price ?? undefined,
    totalPortions: groceryItem.total_portions ?? undefined,
    portionUnit: groceryItem.portion_unit || undefined,
    memberId,
  });
}

export async function addFromTemplate(
  template: GroceryTemplate,
  householdId: string,
  listId?: string,
  memberId?: string,
  memberName?: string
): Promise<GroceryItem> {
  // Get or create food item from template
  const foodItem = await getOrCreateFoodItem(template.item_name, template.category);
  
  return addGroceryItem({
    householdId,
    listId,
    foodItemId: foodItem.id,
    quantity: template.typical_quantity || undefined,
    category: template.category,
    source: 'template',
    memberId,
    memberName,
  });
}

export async function bulkAddFromSuggestions(
  suggestions: SmartSuggestion[],
  householdId: string,
  listId?: string,
  memberId?: string,
  memberName?: string
): Promise<void> {
  for (const suggestion of suggestions) {
    // Get or create food item from suggestion
    const foodItem = await getOrCreateFoodItem(suggestion.item_name, suggestion.category);
    
    await addGroceryItem({
      householdId,
      listId,
      foodItemId: foodItem.id,
      quantity: suggestion.typical_quantity || undefined,
      category: suggestion.category,
      source: 'suggestion',
      memberId,
      memberName,
    });
  }
}
