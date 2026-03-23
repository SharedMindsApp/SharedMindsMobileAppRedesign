alter table public.household_pantry_items
add column if not exists estimated_weight_grams numeric,
add column if not exists vision_metadata jsonb;
