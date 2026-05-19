import type { PantryItem } from './intelligentGrocery';

const MEASUREMENT_UNITS = new Set(['g', 'gram', 'grams', 'ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters']);
const LARGE_MEASUREMENT_UNITS = new Set(['kg', 'kilogram', 'kilograms', 'l', 'litre', 'litres', 'liter', 'liters']);

export type PantryQuantityRepairSuggestion = {
  pantryItemId: string;
  itemLabel: string;
  currentQuantityLabel: string;
  proposedQuantityValue: string;
  proposedQuantityUnit: string;
  proposedWeightGrams: number | null;
  reason: string;
};

function normalize(value: string | null | undefined) {
  return (value || '').toLowerCase().trim();
}

function formatQuantityValue(value: number) {
  if (!Number.isFinite(value)) return '1';
  return Number.isInteger(value) ? String(Math.round(value)) : String(Math.round(value * 100) / 100);
}

function getItemLabel(item: PantryItem) {
  const baseName = item.food_item?.name || item.item_name || 'Unknown item';
  const detail = item.item_detail?.trim();
  return detail ? `${baseName} · ${detail}` : baseName;
}

function getCurrentQuantityLabel(item: PantryItem) {
  const quantityValueRaw = (item.quantity_value ?? item.quantity ?? '').toString().trim();
  const unitRaw = (item.quantity_unit ?? item.unit ?? '').toString().trim();
  return [quantityValueRaw, unitRaw].filter(Boolean).join(' ') || 'No quantity logged';
}

function getRepairDefaults(name: string, category: string) {
  const normalizedName = normalize(name);
  const normalizedCategory = normalize(category);

  const isCannedCategory =
    normalizedCategory.includes('canned') ||
    normalizedCategory.includes('pantry') ||
    normalizedCategory.includes('tin') ||
    normalizedCategory.includes('tinned');

  const cannedStaples = [
    'tomato',
    'chickpea',
    'chicken soup',
    'soup',
    'bean',
    'coconut milk',
    'evaporated milk',
    'mandarin',
    'mixed vegetables',
    'beef stew',
    'curry',
    'ravioli',
    'meatball',
  ];

  if (
    isCannedCategory ||
    normalizedName.includes('can') ||
    normalizedName.includes('tin') ||
    cannedStaples.some((keyword) => normalizedName.includes(keyword))
  ) {
    return {
      quantityUnit: 'can',
      defaultQuantityValue: '1',
      estimatedWeightGrams: cannedStaples.some((keyword) => normalizedName.includes(keyword)) ? 400 : null,
      reason: 'This looks like a canned item, so count-based stock is safer than grams or ml here.',
    };
  }

  if (
    normalizedName.includes('rice') ||
    normalizedName.includes('oats') ||
    normalizedName.includes('flour') ||
    normalizedName.includes('sugar')
  ) {
    return {
      quantityUnit: 'bag',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'This looks like a dry staple that is usually tracked by bag.',
    };
  }

  if (
    normalizedName.includes('pasta') ||
    normalizedName.includes('penne') ||
    normalizedName.includes('spaghetti') ||
    normalizedName.includes('noodle')
  ) {
    return {
      quantityUnit: 'pack',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'This looks like pasta or noodles, which are usually tracked by pack.',
    };
  }

  if (normalizedName.includes('bag')) {
    return {
      quantityUnit: 'bag',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'The item name already suggests a bag count.',
    };
  }

  if (normalizedName.includes('box')) {
    return {
      quantityUnit: 'box',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'The item name already suggests a box count.',
    };
  }

  if (
    normalizedName.includes('sauce') ||
    normalizedName.includes('puree') ||
    normalizedName.includes('granule')
  ) {
    return {
      quantityUnit: 'jar',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'This looks like a jar-style pantry item.',
    };
  }

  return {
    quantityUnit: 'item',
    defaultQuantityValue: '1',
    estimatedWeightGrams: null,
    reason: 'This looks like a count-based Pantry line rather than a gram or ml measurement.',
  };
}

export function getPantryQuantityRepairSuggestion(item: PantryItem): PantryQuantityRepairSuggestion | null {
  const quantityValueRaw = (item.quantity_value ?? item.quantity ?? '').toString().trim();
  const unitRaw = (item.quantity_unit ?? item.unit ?? '').toString().trim();
  const unit = normalize(unitRaw);
  const quantityValue = Number.parseFloat(quantityValueRaw);

  if (!quantityValueRaw) {
    return null;
  }

  if (!Number.isFinite(quantityValue)) {
    return null;
  }

  const defaults = getRepairDefaults(item.food_item?.name || item.item_name || '', item.category || item.food_item?.category || '');
  const hasMissingUnit = unit.length === 0;
  const hasZeroOrNegativeQuantity = quantityValue <= 0;
  const hasSuspiciousMeasurement = MEASUREMENT_UNITS.has(unit) && quantityValue <= 5;
  const hasImpossibleLargeMeasurement = LARGE_MEASUREMENT_UNITS.has(unit) && quantityValue <= 0;

  if (!hasMissingUnit && !hasZeroOrNegativeQuantity && !hasSuspiciousMeasurement && !hasImpossibleLargeMeasurement) {
    return null;
  }

  const proposedQuantityValue =
    Number.isFinite(quantityValue) && quantityValue > 0 && quantityValue <= 5
      ? formatQuantityValue(quantityValue)
      : defaults.defaultQuantityValue;

  const reason = hasMissingUnit
    ? 'This item has a quantity but no unit, so the app is suggesting a safer stock-count unit.'
    : defaults.reason;

  return {
    pantryItemId: item.id,
    itemLabel: getItemLabel(item),
    currentQuantityLabel: getCurrentQuantityLabel(item),
    proposedQuantityValue,
    proposedQuantityUnit: defaults.quantityUnit,
    proposedWeightGrams: item.estimated_weight_grams ?? defaults.estimatedWeightGrams,
    reason,
  };
}

export function getPantryQuantityRepairSuggestions(items: PantryItem[]) {
  return items
    .map((item) => getPantryQuantityRepairSuggestion(item))
    .filter((suggestion): suggestion is PantryQuantityRepairSuggestion => Boolean(suggestion));
}
