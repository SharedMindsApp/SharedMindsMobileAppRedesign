alter table public.household_pantry_items
  add column if not exists estimated_cost numeric(10,2);

create index if not exists household_pantry_items_estimated_cost_idx
on public.household_pantry_items (household_id, estimated_cost)
where estimated_cost is not null;
