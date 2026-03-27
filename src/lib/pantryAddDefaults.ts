import type { FoodItem } from './foodItems';

export interface PantryAddDefaults {
  quantityValue: string;
  quantityUnit: string;
  weightValue: string;
  weightUnit: string;
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
      weightValue: '',
      weightUnit: 'g',
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
      weightValue: '400',
      weightUnit: 'g',
      hint: 'Defaulted to 1 can at 400g. Most tomato, bean, chickpea, and soup cans are around this size.',
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
      weightValue: '2.5',
      weightUnit: 'kg',
      hint: 'Defaulted to 1 bag at 2.5kg. A typical bag of potatoes is around this size.',
    };
  }

  if (explicitlyTinOrCan || isCannedCategory) {
    return {
      quantityValue: '1',
      quantityUnit: 'can',
      weightValue: '',
      weightUnit: 'g',
      hint: 'Defaulted to 1 can',
    };
  }

  if (name.includes('bag')) {
    return {
      quantityValue: '1',
      quantityUnit: 'bag',
      weightValue: '',
      weightUnit: 'kg',
      hint: 'Defaulted to 1 bag',
    };
  }

  if (name.includes('box')) {
    return {
      quantityValue: '1',
      quantityUnit: 'box',
      weightValue: '',
      weightUnit: 'g',
      hint: 'Defaulted to 1 box',
    };
  }

  return {
    quantityValue: '1',
    quantityUnit: 'item',
    weightValue: '',
    weightUnit: 'g',
    hint: 'Defaulted to 1 item',
  };
}
