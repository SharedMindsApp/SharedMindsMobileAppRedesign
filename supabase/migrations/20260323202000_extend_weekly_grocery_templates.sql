alter table public.household_grocery_templates
  add column if not exists food_item_id uuid references public.food_items(id) on delete set null,
  add column if not exists quantity text,
  add column if not exists unit text,
  add column if not exists estimated_price numeric(10,2),
  add column if not exists item_type text,
  add column if not exists notes text,
  add column if not exists is_weekly boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_grocery_templates_item_type_check'
      and conrelid = 'public.household_grocery_templates'::regclass
  ) then
    alter table public.household_grocery_templates
      add constraint household_grocery_templates_item_type_check
      check (item_type in ('perishable', 'long_life', 'non_food') or item_type is null);
  end if;
end;
$$;

create index if not exists household_grocery_templates_weekly_idx
on public.household_grocery_templates (household_id, is_weekly, item_name);

create index if not exists household_grocery_templates_food_item_idx
on public.household_grocery_templates (food_item_id);

update public.household_grocery_templates
set is_weekly = true
where coalesce(is_weekly, false) = false
  and is_system_template = false
  and purchase_frequency_days = 7;
