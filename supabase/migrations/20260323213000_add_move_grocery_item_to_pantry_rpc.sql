create or replace function public.move_grocery_item_to_pantry(
  p_grocery_item_id uuid,
  p_location_id uuid default null,
  p_quantity_value text default null,
  p_quantity_unit text default null,
  p_expires_on date default null,
  p_item_type text default null,
  p_notes text default null,
  p_pantry_cost numeric default null,
  p_total_portions integer default null,
  p_portion_unit text default null,
  p_store_name text default null,
  p_purchased_date timestamptz default now(),
  p_member_id uuid default null
)
returns table (
  pantry_item_id uuid,
  grocery_item_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_grocery_item public.household_grocery_list_items%rowtype;
  v_food_item record;
  v_added_by uuid;
  v_quantity_value text;
  v_quantity_unit text;
  v_quantity_for_history text;
  v_notes text;
  v_pantry_item_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to move grocery items.';
  end if;

  select *
  into v_grocery_item
  from public.household_grocery_list_items
  where id = p_grocery_item_id;

  if not found then
    raise exception 'Grocery item % was not found.', p_grocery_item_id;
  end if;

  if not public.can_write_pantry_space(v_grocery_item.household_id) then
    raise exception 'You do not have permission to update this pantry.';
  end if;

  if not coalesce(v_grocery_item.checked, false) then
    raise exception 'Only checked grocery items can be moved into Pantry.';
  end if;

  select fi.id, fi.name, fi.category
  into v_food_item
  from public.food_items fi
  where fi.id = v_grocery_item.food_item_id;

  if v_food_item.id is null then
    raise exception 'Food item % was not found.', v_grocery_item.food_item_id;
  end if;

  v_added_by := coalesce(p_member_id, v_user_id);
  v_quantity_value := nullif(btrim(coalesce(p_quantity_value, v_grocery_item.quantity)), '');
  v_quantity_unit := nullif(btrim(coalesce(p_quantity_unit, v_grocery_item.unit)), '');
  v_notes := coalesce(nullif(btrim(p_notes), ''), v_grocery_item.notes);
  v_quantity_for_history := nullif(concat_ws(' ', v_quantity_value, v_quantity_unit), '');

  insert into public.household_pantry_items (
    household_id,
    food_item_id,
    item_name,
    category,
    quantity,
    unit,
    quantity_value,
    quantity_unit,
    expiration_date,
    expires_on,
    location_id,
    item_type,
    status,
    notes,
    estimated_cost,
    added_by,
    total_portions,
    portion_unit
  )
  values (
    v_grocery_item.household_id,
    v_grocery_item.food_item_id,
    v_food_item.name,
    coalesce(v_grocery_item.category, v_food_item.category, 'other'),
    v_quantity_for_history,
    v_quantity_unit,
    v_quantity_value,
    v_quantity_unit,
    p_expires_on,
    p_expires_on,
    p_location_id,
    p_item_type,
    'have',
    v_notes,
    p_pantry_cost,
    v_added_by,
    p_total_portions,
    nullif(btrim(p_portion_unit), '')
  )
  returning id into v_pantry_item_id;

  insert into public.household_grocery_purchase_history (
    household_id,
    item_name,
    category,
    quantity,
    price,
    purchased_date,
    purchased_by,
    store_name
  )
  values (
    v_grocery_item.household_id,
    v_food_item.name,
    coalesce(v_grocery_item.category, v_food_item.category, 'other'),
    v_quantity_for_history,
    p_pantry_cost,
    coalesce(p_purchased_date, now()),
    v_added_by,
    nullif(btrim(p_store_name), '')
  );

  delete from public.household_grocery_list_items
  where id = v_grocery_item.id;

  return query
  select v_pantry_item_id, v_grocery_item.id;
end;
$$;
