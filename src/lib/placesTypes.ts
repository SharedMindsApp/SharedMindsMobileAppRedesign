/**
 * Places & Eat Out Types
 * 
 * Defines types for managing restaurants, cafes, takeaways, and eat-out meal assignments
 */

export type PlaceType = 'restaurant' | 'cafe' | 'takeaway' | 'delivery' | 'pub' | 'other';

export type PlacePrice = '$' | '$$' | '$$$' | '$$$$' | null;

export type MealFulfillmentType = 
  | 'recipe'        // normal cooked recipe
  | 'prepared_meal' // meal prep portion
  | 'eat_out'       // restaurant / takeaway / delivery
  | 'freeform';     // "leftovers / cereal / whatever"

export interface Place {
  id: string;
  profile_id: string | null;
  household_id: string | null;
  space_id: string;
  name: string;
  type: PlaceType;
  tags: string[];
  cuisine: string | null;
  favourite: boolean;
  location_text: string | null;
  website_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceOrder {
  id: string;
  place_id: string;
  name: string;
  notes: string | null;
  dietary_tags: string[];
  favourite: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealSlotAssignment {
  id: string;
  space_id: string;
  week_start_date: string;
  day_of_week: number;
  meal_slot_id: string;
  
  fulfillment_type: MealFulfillmentType;
  
  // Recipe assignment
  recipe_id: string | null;
  
  // Meal prep assignment
  prepared_meal_id: string | null;
  servings_used: number | null;
  
  // Eat out assignment
  place_id: string | null;
  place_order_id: string | null;
  eat_out_notes: string | null;
  
  // Freeform assignment
  freeform_label: string | null;
  freeform_notes: string | null;
  
  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data (optional, populated by service)
  recipe?: any;
  prepared_meal?: any;
  place?: Place;
  place_order?: PlaceOrder;
}

export interface WeeklyMealPreference {
  id: string;
  profile_id: string | null;
  household_id: string | null;
  space_id: string;
  day_of_week: number;
  meal_slot_id: string;
  
  fulfillment_type: MealFulfillmentType;
  
  recipe_id: string | null;
  prepared_meal_id: string | null;
  servings_used: number | null;
  place_id: string | null;
  place_order_id: string | null;
  eat_out_notes: string | null;
  freeform_label: string | null;
  freeform_notes: string | null;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data (optional)
  recipe?: any;
  prepared_meal?: any;
  place?: Place;
  place_order?: PlaceOrder;
}

export interface PlaceInput {
  name: string;
  type: PlaceType;
  tags?: string[];
  cuisine?: string | null;
  favourite?: boolean;
  location_text?: string | null;
  website_url?: string | null;
  notes?: string | null;
}

export interface PlaceOrderInput {
  name: string;
  notes?: string | null;
  dietary_tags?: string[];
  favourite?: boolean;
}

export interface MealSlotAssignmentInput {
  week_start_date: string;
  day_of_week: number;
  meal_slot_id: string;
  fulfillment_type: MealFulfillmentType;
  
  // Recipe
  recipe_id?: string | null;
  
  // Meal prep
  prepared_meal_id?: string | null;
  servings_used?: number | null;
  
  // Eat out
  place_id?: string | null;
  place_order_id?: string | null;
  eat_out_notes?: string | null;
  
  // Freeform
  freeform_label?: string | null;
  freeform_notes?: string | null;
  
  notes?: string | null;
}

export interface WeeklyMealPreferenceInput {
  day_of_week: number;
  meal_slot_id: string;
  fulfillment_type: MealFulfillmentType;
  
  recipe_id?: string | null;
  prepared_meal_id?: string | null;
  servings_used?: number | null;
  place_id?: string | null;
  place_order_id?: string | null;
  eat_out_notes?: string | null;
  freeform_label?: string | null;
  freeform_notes?: string | null;
  
  is_active?: boolean;
}

/**
 * Get all available place types
 */
export function getAllPlaceTypes(): PlaceType[] {
  return ['restaurant', 'cafe', 'takeaway', 'delivery', 'pub', 'other'];
}

/**
 * Get place type label
 */
export function getPlaceTypeLabel(type: PlaceType): string {
  const labels: Record<PlaceType, string> = {
    restaurant: 'Restaurant',
    cafe: 'Café',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    pub: 'Pub',
    other: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get fulfillment type label
 */
export function getFulfillmentTypeLabel(type: MealFulfillmentType): string {
  const labels: Record<MealFulfillmentType, string> = {
    recipe: 'Cook Recipe',
    prepared_meal: 'Meal Prep',
    eat_out: 'Eat Out',
    freeform: 'Freeform',
  };
  return labels[type] || type;
}
