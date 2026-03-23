alter table public.household_grocery_list_items
  add column if not exists expires_on date,
  add column if not exists location_id uuid references public.pantry_locations(id) on delete set null,
  add column if not exists item_type text,
  add column if not exists total_portions integer,
  add column if not exists portion_unit text;

create index if not exists household_grocery_list_items_location_idx
on public.household_grocery_list_items (location_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_grocery_list_items_item_type_check'
      and conrelid = 'public.household_grocery_list_items'::regclass
  ) then
    alter table public.household_grocery_list_items
      add constraint household_grocery_list_items_item_type_check
      check (item_type is null or item_type in ('perishable', 'long_life', 'non_food'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_grocery_list_items_total_portions_check'
      and conrelid = 'public.household_grocery_list_items'::regclass
  ) then
    alter table public.household_grocery_list_items
      add constraint household_grocery_list_items_total_portions_check
      check (total_portions is null or total_portions >= 0);
  end if;
end $$;
