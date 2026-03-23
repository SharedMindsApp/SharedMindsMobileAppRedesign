import type { FoodItem } from './foodItems';

export interface PantryAddDefaults {
  quantityValue: string;
  quantityUnit: string;
  hint: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim();
}

export function getPantryAddDefaults(foodItem: FoodItem | null | undefined): PantryAddDefaults {
  if (!foodItem) {
    return {
      quantityValue: '',
      quantityUnit: '',
      hint: null,
    };
  }

  const name = normalize(foodItem.name);
  const category = normalize(foodItem.category);

  const isCannedCategory =
    category.includes('canned') ||
    category.includes('pantry') ||
    category.includes('tin') ||
    category.includes('tinned');
  const isCannedStaple =
    name.includes('tomato') ||
    name.includes('chickpea') ||
    name.includes('soup') ||
    name.includes('bean');
  const explicitlyTinOrCan = name.includes('tin') || name.includes('can') || name.includes('canned');

  if ((isCannedCategory && isCannedStaple) || (explicitlyTinOrCan && isCannedStaple)) {
    return {
      quantityValue: '1',
      quantityUnit: 'can',
      hint: 'Defaulted to 1 can. Most tomato, bean, chickpea, and soup cans are around 400g.',
    };
  }

  const isBagOfPotatoes =
    name.includes('bag of potatoes') ||
    name.includes('potatoes bag') ||
    (name.includes('potato') && name.includes('bag'));

  if (isBagOfPotatoes) {
    return {
      quantityValue: '1',
      quantityUnit: 'bag',
      hint: 'Defaulted to 1 bag. A typical bag of potatoes is around 2.5 kg.',
    };
  }

  if (explicitlyTinOrCan || isCannedCategory) {
    return {
      quantityValue: '1',
      quantityUnit: 'can',
      hint: 'Defaulted to 1 can',
    };
  }

  if (name.includes('bag')) {
    return {
      quantityValue: '1',
      quantityUnit: 'bag',
      hint: 'Defaulted to 1 bag',
    };
  }

  return {
    quantityValue: '1',
    quantityUnit: 'item',
    hint: 'Defaulted to 1 item',
  };
}
