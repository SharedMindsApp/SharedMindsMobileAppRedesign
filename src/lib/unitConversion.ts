/**
 * Unit Conversion System
 * 
 * Converts canonical metric units to imperial for display.
 * Never mutates stored data - conversion happens only at display time.
 */

export type MeasurementSystem = 'metric' | 'imperial';

export interface DisplayIngredient {
  value: number | string; // Can be fraction string for small values
  unit: string;
  originalValue?: number; // Original metric value for reference
  originalUnit?: string; // Original canonical unit
}

/**
 * Conversion factors from canonical metric to imperial
 */
export const UNIT_CONVERSIONS = {
  weight: {
    g: { 
      oz: 0.035274, 
      lb: 0.00220462 
    },
    kg: { 
      lb: 2.20462,
      oz: 35.274 
    }
  },
  volume: {
    ml: { 
      cup_us: 0.00422675, 
      fl_oz_us: 0.033814,
      tsp: 0.202884,
      tbsp: 0.067628
    },
    l: { 
      cup_us: 4.22675,
      fl_oz_us: 33.814,
      pint_us: 2.11338,
      quart_us: 1.05669,
      gallon_us: 0.264172
    }
  }
} as const;

/**
 * Cooking-friendly rounding
 * 
 * Rules:
 * - < 1 → fractions (⅓, ½, ¾)
 * - 1–10 → nearest 0.5
 * - > 10 → nearest whole number
 */
export function roundForCooking(value: number): number | string {
  if (value < 0.1) {
    // Very small values - round to 2 decimal places or fraction
    if (value < 0.05) {
      return Math.round(value * 100) / 100;
    }
    // Convert to common fractions for very small amounts
    const fractionMap: Array<[number, string]> = [
      [0.125, '⅛'],
      [0.25, '¼'],
      [0.33, '⅓'],
      [0.5, '½'],
      [0.67, '⅔'],
      [0.75, '¾'],
    ];
    
    for (const [num, frac] of fractionMap) {
      if (Math.abs(value - num) < 0.05) {
        return frac;
      }
    }
    
    return Math.round(value * 100) / 100;
  }
  
  if (value < 1) {
    // Convert to fractions
    const fractionMap: Array<[number, string]> = [
      [0.125, '⅛'],
      [0.25, '¼'],
      [0.33, '⅓'],
      [0.5, '½'],
      [0.67, '⅔'],
      [0.75, '¾'],
    ];
    
    for (const [num, frac] of fractionMap) {
      if (Math.abs(value - num) < 0.1) {
        return frac;
      }
    }
    
    // Round to nearest 0.1
    return Math.round(value * 10) / 10;
  }
  
  if (value <= 10) {
    // Round to nearest 0.5
    return Math.round(value * 2) / 2;
  }
  
  // Round to nearest whole number
  return Math.round(value);
}

/**
 * Convert ingredient for display based on measurement system
 * 
 * @param ingredient - Canonical ingredient with numeric value and canonical unit
 * @param system - Measurement system preference
 * @returns Display-ready ingredient with converted value and unit
 */
export function convertIngredientForDisplay(
  ingredient: {
    quantity: string | number;
    unit: string;
  },
  system: MeasurementSystem
): DisplayIngredient {
  // If metric, return unchanged (except ensure quantity is properly formatted)
  if (system === 'metric') {
    const value = typeof ingredient.quantity === 'string' 
      ? parseFloat(ingredient.quantity) 
      : ingredient.quantity;
    
    return {
      value: roundForCooking(value),
      unit: ingredient.unit,
      originalValue: value,
      originalUnit: ingredient.unit,
    };
  }
  
  // Convert to imperial
  const value = typeof ingredient.quantity === 'string' 
    ? parseFloat(ingredient.quantity) 
    : ingredient.quantity;
  
  const unit = ingredient.unit.toLowerCase();
  
  // Weight conversions
  if (unit === 'g') {
    if (value < 28) {
      // Keep as grams for very small amounts
      return {
        value: roundForCooking(value),
        unit: 'g',
        originalValue: value,
        originalUnit: unit,
      };
    } else if (value < 454) {
      // Convert to oz
      const ozValue = value * UNIT_CONVERSIONS.weight.g.oz;
      return {
        value: roundForCooking(ozValue),
        unit: 'oz',
        originalValue: value,
        originalUnit: unit,
      };
    } else {
      // Convert to lb
      const lbValue = value * UNIT_CONVERSIONS.weight.g.lb;
      return {
        value: roundForCooking(lbValue),
        unit: 'lb',
        originalValue: value,
        originalUnit: unit,
      };
    }
  }
  
  if (unit === 'kg') {
    // Always convert kg to lb
    const lbValue = value * UNIT_CONVERSIONS.weight.kg.lb;
    return {
      value: roundForCooking(lbValue),
      unit: 'lb',
      originalValue: value,
      originalUnit: unit,
    };
  }
  
  // Volume conversions
  if (unit === 'ml') {
    if (value < 5) {
      // Convert to tsp
      const tspValue = value * UNIT_CONVERSIONS.volume.ml.tsp;
      return {
        value: roundForCooking(tspValue),
        unit: 'tsp',
        originalValue: value,
        originalUnit: unit,
      };
    } else if (value < 15) {
      // Convert to tsp (round to nearest)
      const tspValue = value * UNIT_CONVERSIONS.volume.ml.tsp;
      return {
        value: roundForCooking(tspValue),
        unit: 'tsp',
        originalValue: value,
        originalUnit: unit,
      };
    } else if (value < 30) {
      // Convert to tbsp
      const tbspValue = value * UNIT_CONVERSIONS.volume.ml.tbsp;
      return {
        value: roundForCooking(tbspValue),
        unit: 'tbsp',
        originalValue: value,
        originalUnit: unit,
      };
    } else if (value < 240) {
      // Convert to fl oz
      const flOzValue = value * UNIT_CONVERSIONS.volume.ml.fl_oz_us;
      return {
        value: roundForCooking(flOzValue),
        unit: 'fl oz',
        originalValue: value,
        originalUnit: unit,
      };
    } else {
      // Convert to cups
      const cupValue = value * UNIT_CONVERSIONS.volume.ml.cup_us;
      return {
        value: roundForCooking(cupValue),
        unit: 'cup' + (cupValue !== 1 ? 's' : ''),
        originalValue: value,
        originalUnit: unit,
      };
    }
  }
  
  if (unit === 'l') {
    if (value < 0.5) {
      // Convert to cups
      const cupValue = value * UNIT_CONVERSIONS.volume.l.cup_us;
      return {
        value: roundForCooking(cupValue),
        unit: 'cup' + (cupValue !== 1 ? 's' : ''),
        originalValue: value,
        originalUnit: unit,
      };
    } else if (value < 1) {
      // Convert to cups
      const cupValue = value * UNIT_CONVERSIONS.volume.l.cup_us;
      return {
        value: roundForCooking(cupValue),
        unit: 'cup' + (cupValue !== 1 ? 's' : ''),
        originalValue: value,
        originalUnit: unit,
      };
    } else {
      // Convert to quarts or gallons
      const quartValue = value * UNIT_CONVERSIONS.volume.l.quart_us;
      if (quartValue >= 4) {
        const gallonValue = value * UNIT_CONVERSIONS.volume.l.gallon_us;
        return {
          value: roundForCooking(gallonValue),
          unit: 'gallon' + (gallonValue !== 1 ? 's' : ''),
          originalValue: value,
          originalUnit: unit,
        };
      }
      return {
        value: roundForCooking(quartValue),
        unit: 'quart' + (quartValue !== 1 ? 's' : ''),
        originalValue: value,
        originalUnit: unit,
      };
    }
  }
  
  // tsp, tbsp, and count-based units remain unchanged
  return {
    value: roundForCooking(value),
    unit: ingredient.unit,
    originalValue: value,
    originalUnit: unit,
  };
}

/**
 * Convert all ingredients in a recipe for display
 * 
 * @param ingredients - Array of recipe ingredients
 * @param system - Measurement system preference
 * @returns Array of display-ready ingredients
 */
export function convertRecipeIngredientsForDisplay(
  ingredients: Array<{ quantity: string | number; unit: string; [key: string]: any }>,
  system: MeasurementSystem
): Array<DisplayIngredient & { [key: string]: any }> {
  return ingredients.map(ingredient => {
    const converted = convertIngredientForDisplay(
      { quantity: ingredient.quantity, unit: ingredient.unit },
      system
    );
    
    return {
      ...ingredient,
      ...converted,
    };
  });
}
