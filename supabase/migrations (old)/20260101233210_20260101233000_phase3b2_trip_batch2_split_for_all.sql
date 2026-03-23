/*
  # Phase 3B.2 Batch 2: Split FOR ALL Policies (Trip Module - Final Batch)

  ## Scope
  
  This migration completes the Trip module FOR ALL policy refactor.
  
  **Tables Specified:** 7
  **Tables Found in Database:** 4
  **Tables Missing:** 3 (trip_participants, trip_transportation, trip_activities - never created)
  
  ### Tables Modified (3)
  
  1. **trip_accommodations** - Split FOR ALL into INSERT/UPDATE/DELETE
  2. **trip_packing_lists** - Split FOR ALL into INSERT/UPDATE/DELETE
  3. **trip_packing_items** - Split FOR ALL into INSERT/UPDATE/DELETE
  
  ### Table Not Modified (1)
  
  4. **trips** - Already has separate CRUD policies (no FOR ALL policy exists)

  ## Changes
  
  ### Mechanical Refactor: Replace FOR ALL with Separate CRUD Policies
  
  For each table:
  1. Drop the FOR ALL policy
  2. Add separate INSERT, UPDATE, DELETE policies
  3. Keep existing SELECT policies (which use broader predicates for read access)

  ## Policy Predicates
  
  ### trip_accommodations
  - **SELECT**: `user_can_access_trip(trip_id, auth.uid())` (broader read access)
  - **INSERT/UPDATE/DELETE**: `user_can_edit_trip(trip_id, auth.uid())` (stricter write access)
  
  ### trip_packing_lists
  - **SELECT**: `user_can_access_trip(trip_id, auth.uid())` (broader read access)
  - **INSERT/UPDATE/DELETE**: `user_can_edit_trip(trip_id, auth.uid()) OR (owner_id = auth.uid())` (write access)
  
  ### trip_packing_items
  - **SELECT**: Via EXISTS subquery checking `user_can_access_trip()` (broader read access)
  - **INSERT/UPDATE/DELETE**: Via EXISTS subquery checking `user_can_edit_trip() OR owner check` (write access)

  ## Design Intent Preserved
  
  These tables intentionally use different predicates for read vs. write:
  - **Read (SELECT)**: Broader access for viewing trip details
  - **Write (INSERT/UPDATE/DELETE)**: Stricter access for modifications
  
  This is correct security design.

  ## Migration Type
  - ✅ Mechanical refactor only
  - ✅ No predicate logic changes
  - ✅ No behavior changes
  - ✅ Same access control, clearer policy structure
*/

-- ============================================================================
-- 1. trip_accommodations
-- ============================================================================

-- Drop FOR ALL policy
DROP POLICY IF EXISTS "Users can manage accommodations for editable trips" ON public.trip_accommodations;

-- Add separate INSERT, UPDATE, DELETE policies (SELECT already exists)
CREATE POLICY "Users can insert accommodations for editable trips"
ON public.trip_accommodations
FOR INSERT
WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Users can update accommodations for editable trips"
ON public.trip_accommodations
FOR UPDATE
USING (user_can_edit_trip(trip_id, auth.uid()))
WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Users can delete accommodations for editable trips"
ON public.trip_accommodations
FOR DELETE
USING (user_can_edit_trip(trip_id, auth.uid()));

-- ============================================================================
-- 2. trip_packing_lists
-- ============================================================================

-- Drop FOR ALL policy
DROP POLICY IF EXISTS "Users can manage packing lists for editable trips" ON public.trip_packing_lists;

-- Add separate INSERT, UPDATE, DELETE policies (SELECT already exists)
CREATE POLICY "Users can insert packing lists for editable trips"
ON public.trip_packing_lists
FOR INSERT
WITH CHECK (user_can_edit_trip(trip_id, auth.uid()) OR (owner_id = auth.uid()));

CREATE POLICY "Users can update packing lists for editable trips"
ON public.trip_packing_lists
FOR UPDATE
USING (user_can_edit_trip(trip_id, auth.uid()) OR (owner_id = auth.uid()))
WITH CHECK (user_can_edit_trip(trip_id, auth.uid()) OR (owner_id = auth.uid()));

CREATE POLICY "Users can delete packing lists for editable trips"
ON public.trip_packing_lists
FOR DELETE
USING (user_can_edit_trip(trip_id, auth.uid()) OR (owner_id = auth.uid()));

-- ============================================================================
-- 3. trip_packing_items
-- ============================================================================

-- Drop FOR ALL policy
DROP POLICY IF EXISTS "Users can manage packing items for their lists" ON public.trip_packing_items;

-- Add separate INSERT, UPDATE, DELETE policies (SELECT already exists)
CREATE POLICY "Users can insert packing items for their lists"
ON public.trip_packing_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM trip_packing_lists tpl
    WHERE tpl.id = trip_packing_items.packing_list_id
      AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR (tpl.owner_id = auth.uid()))
  )
);

CREATE POLICY "Users can update packing items for their lists"
ON public.trip_packing_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM trip_packing_lists tpl
    WHERE tpl.id = trip_packing_items.packing_list_id
      AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR (tpl.owner_id = auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM trip_packing_lists tpl
    WHERE tpl.id = trip_packing_items.packing_list_id
      AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR (tpl.owner_id = auth.uid()))
  )
);

CREATE POLICY "Users can delete packing items for their lists"
ON public.trip_packing_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM trip_packing_lists tpl
    WHERE tpl.id = trip_packing_items.packing_list_id
      AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR (tpl.owner_id = auth.uid()))
  )
);