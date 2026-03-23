/*
  # Fix RLS Policies for All Spaces Widgets
  
  ## Summary
  Comprehensive RLS policy fix for all widget types in Personal and Shared Spaces.
  Ensures users can create, read, update, and delete widgets in spaces where they have access.
  
  ## Tables Fixed
  - fridge_widgets (main widgets)
  - fridge_widget_layouts (widget positioning)
  - stack_cards & stack_card_items (stack cards)
  - collections & collection_references (collections)
  - files & file_tags & file_tag_assignments (files)
  - external_links & link_tags & link_tag_assignments (links)
  - canvas_svg_objects (SVG graphics)
  - tables, table_columns, table_rows, table_cells (tables)
  
  ## Security Model
  - Personal spaces: owner has full access
  - Shared spaces: all active members have full access
  - RLS is RESTRICTIVE by default - explicit access only
*/

-- ============================================================================
-- HELPER FUNCTION: Check if user can access a space
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_access_space(p_user_id uuid, p_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_space_type text;
  v_owner_id uuid;
  v_is_member boolean;
BEGIN
  -- Get space info
  SELECT space_type, owner_id INTO v_space_type, v_owner_id
  FROM spaces
  WHERE id = p_space_id;
  
  -- Personal space: check ownership
  IF v_space_type = 'personal' THEN
    RETURN v_owner_id = p_user_id;
  END IF;
  
  -- Shared space: check membership
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

-- ============================================================================
-- FRIDGE WIDGETS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can create widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete widgets in accessible spaces" ON fridge_widgets;

CREATE POLICY "Users can view widgets in accessible spaces"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id));

CREATE POLICY "Users can create widgets in accessible spaces"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_space(auth.uid(), space_id));

CREATE POLICY "Users can update widgets in accessible spaces"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (user_can_access_space(auth.uid(), space_id));

CREATE POLICY "Users can delete widgets in accessible spaces"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id));

-- ============================================================================
-- FRIDGE WIDGET LAYOUTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can create widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can update widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can delete widget layouts" ON fridge_widget_layouts;

CREATE POLICY "Users can view widget layouts"
  ON fridge_widget_layouts FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

CREATE POLICY "Users can create widget layouts"
  ON fridge_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

CREATE POLICY "Users can update widget layouts"
  ON fridge_widget_layouts FOR UPDATE
  TO authenticated
  USING (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  )
  WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

CREATE POLICY "Users can delete widget layouts"
  ON fridge_widget_layouts FOR DELETE
  TO authenticated
  USING (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

-- ============================================================================
-- STACK CARDS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stack cards" ON stack_cards;
DROP POLICY IF EXISTS "Users can create stack cards" ON stack_cards;
DROP POLICY IF EXISTS "Users can update stack cards" ON stack_cards;
DROP POLICY IF EXISTS "Users can delete stack cards" ON stack_cards;

CREATE POLICY "Users can view stack cards"
  ON stack_cards FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can create stack cards"
  ON stack_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (space_id IS NULL OR user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can update stack cards"
  ON stack_cards FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can delete stack cards"
  ON stack_cards FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

-- ============================================================================
-- STACK CARD ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stack card items" ON stack_card_items;
DROP POLICY IF EXISTS "Users can create stack card items" ON stack_card_items;
DROP POLICY IF EXISTS "Users can update stack card items" ON stack_card_items;
DROP POLICY IF EXISTS "Users can delete stack card items" ON stack_card_items;

CREATE POLICY "Users can view stack card items"
  ON stack_card_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards sc
      WHERE sc.id = stack_id
      AND (
        sc.user_id = auth.uid() OR
        (sc.space_id IS NOT NULL AND user_can_access_space(auth.uid(), sc.space_id))
      )
    )
  );

CREATE POLICY "Users can create stack card items"
  ON stack_card_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stack_cards sc
      WHERE sc.id = stack_id
      AND (
        sc.user_id = auth.uid() OR
        (sc.space_id IS NOT NULL AND user_can_access_space(auth.uid(), sc.space_id))
      )
    )
  );

CREATE POLICY "Users can update stack card items"
  ON stack_card_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards sc
      WHERE sc.id = stack_id
      AND (
        sc.user_id = auth.uid() OR
        (sc.space_id IS NOT NULL AND user_can_access_space(auth.uid(), sc.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stack_cards sc
      WHERE sc.id = stack_id
      AND (
        sc.user_id = auth.uid() OR
        (sc.space_id IS NOT NULL AND user_can_access_space(auth.uid(), sc.space_id))
      )
    )
  );

CREATE POLICY "Users can delete stack card items"
  ON stack_card_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards sc
      WHERE sc.id = stack_id
      AND (
        sc.user_id = auth.uid() OR
        (sc.space_id IS NOT NULL AND user_can_access_space(auth.uid(), sc.space_id))
      )
    )
  );

-- ============================================================================
-- FILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view files" ON files;
DROP POLICY IF EXISTS "Users can create files" ON files;
DROP POLICY IF EXISTS "Users can update files" ON files;
DROP POLICY IF EXISTS "Users can delete files" ON files;

CREATE POLICY "Users can view files"
  ON files FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can create files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (space_id IS NULL OR user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can update files"
  ON files FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can delete files"
  ON files FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

-- ============================================================================
-- COLLECTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view collections" ON collections;
DROP POLICY IF EXISTS "Users can create collections" ON collections;
DROP POLICY IF EXISTS "Users can update collections" ON collections;
DROP POLICY IF EXISTS "Users can delete collections" ON collections;

CREATE POLICY "Users can view collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can create collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (space_id IS NULL OR user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can update collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can delete collections"
  ON collections FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

-- ============================================================================
-- COLLECTION REFERENCES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view collection references" ON collection_references;
DROP POLICY IF EXISTS "Users can create collection references" ON collection_references;
DROP POLICY IF EXISTS "Users can update collection references" ON collection_references;
DROP POLICY IF EXISTS "Users can delete collection references" ON collection_references;

CREATE POLICY "Users can view collection references"
  ON collection_references FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can create collection references"
  ON collection_references FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can update collection references"
  ON collection_references FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can delete collection references"
  ON collection_references FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

-- ============================================================================
-- EXTERNAL LINKS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view external links" ON external_links;
DROP POLICY IF EXISTS "Users can create external links" ON external_links;
DROP POLICY IF EXISTS "Users can update external links" ON external_links;
DROP POLICY IF EXISTS "Users can delete external links" ON external_links;

CREATE POLICY "Users can view external links"
  ON external_links FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can create external links"
  ON external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (space_id IS NULL OR user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can update external links"
  ON external_links FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can delete external links"
  ON external_links FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

-- ============================================================================
-- CANVAS SVG OBJECTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view canvas svg objects" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can create canvas svg objects" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can update canvas svg objects" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can delete canvas svg objects" ON canvas_svg_objects;

CREATE POLICY "Users can view canvas svg objects"
  ON canvas_svg_objects FOR SELECT
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id));

CREATE POLICY "Users can create canvas svg objects"
  ON canvas_svg_objects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update canvas svg objects"
  ON canvas_svg_objects FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (user_can_access_space(auth.uid(), space_id));

CREATE POLICY "Users can delete canvas svg objects"
  ON canvas_svg_objects FOR DELETE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id));

-- ============================================================================
-- TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tables" ON tables;
DROP POLICY IF EXISTS "Users can create tables" ON tables;
DROP POLICY IF EXISTS "Users can update tables" ON tables;
DROP POLICY IF EXISTS "Users can delete tables" ON tables;

CREATE POLICY "Users can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (
    created_by_user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can create tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid() AND
    (space_id IS NULL OR user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  )
  WITH CHECK (
    created_by_user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

CREATE POLICY "Users can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING (
    created_by_user_id = auth.uid() OR
    (space_id IS NOT NULL AND user_can_access_space(auth.uid(), space_id))
  );

-- ============================================================================
-- TABLE COLUMNS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view table columns" ON table_columns;
DROP POLICY IF EXISTS "Users can create table columns" ON table_columns;
DROP POLICY IF EXISTS "Users can update table columns" ON table_columns;
DROP POLICY IF EXISTS "Users can delete table columns" ON table_columns;

CREATE POLICY "Users can view table columns"
  ON table_columns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can create table columns"
  ON table_columns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can update table columns"
  ON table_columns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can delete table columns"
  ON table_columns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

-- ============================================================================
-- TABLE ROWS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view table rows" ON table_rows;
DROP POLICY IF EXISTS "Users can create table rows" ON table_rows;
DROP POLICY IF EXISTS "Users can update table rows" ON table_rows;
DROP POLICY IF EXISTS "Users can delete table rows" ON table_rows;

CREATE POLICY "Users can view table rows"
  ON table_rows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can create table rows"
  ON table_rows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can update table rows"
  ON table_rows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can delete table rows"
  ON table_rows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

-- ============================================================================
-- TABLE CELLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view table cells" ON table_cells;
DROP POLICY IF EXISTS "Users can create table cells" ON table_cells;
DROP POLICY IF EXISTS "Users can update table cells" ON table_cells;
DROP POLICY IF EXISTS "Users can delete table cells" ON table_cells;

CREATE POLICY "Users can view table cells"
  ON table_cells FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM table_rows tr
      JOIN tables t ON t.id = tr.table_id
      WHERE tr.id = row_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can create table cells"
  ON table_cells FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM table_rows tr
      JOIN tables t ON t.id = tr.table_id
      WHERE tr.id = row_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can update table cells"
  ON table_cells FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM table_rows tr
      JOIN tables t ON t.id = tr.table_id
      WHERE tr.id = row_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM table_rows tr
      JOIN tables t ON t.id = tr.table_id
      WHERE tr.id = row_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

CREATE POLICY "Users can delete table cells"
  ON table_cells FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM table_rows tr
      JOIN tables t ON t.id = tr.table_id
      WHERE tr.id = row_id
      AND (
        t.created_by_user_id = auth.uid() OR
        (t.space_id IS NOT NULL AND user_can_access_space(auth.uid(), t.space_id))
      )
    )
  );

-- ============================================================================
-- FILE TAGS (personal only)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their file tags" ON file_tags;
DROP POLICY IF EXISTS "Users can create their file tags" ON file_tags;
DROP POLICY IF EXISTS "Users can update their file tags" ON file_tags;
DROP POLICY IF EXISTS "Users can delete their file tags" ON file_tags;

CREATE POLICY "Users can view their file tags"
  ON file_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their file tags"
  ON file_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their file tags"
  ON file_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their file tags"
  ON file_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- FILE TAG ASSIGNMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view file tag assignments" ON file_tag_assignments;
DROP POLICY IF EXISTS "Users can create file tag assignments" ON file_tag_assignments;
DROP POLICY IF EXISTS "Users can delete file tag assignments" ON file_tag_assignments;

CREATE POLICY "Users can view file tag assignments"
  ON file_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM files f
      WHERE f.id = file_id
      AND (
        f.user_id = auth.uid() OR
        (f.space_id IS NOT NULL AND user_can_access_space(auth.uid(), f.space_id))
      )
    )
  );

CREATE POLICY "Users can create file tag assignments"
  ON file_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files f
      JOIN file_tags ft ON ft.id = tag_id
      WHERE f.id = file_id
      AND ft.user_id = auth.uid()
      AND (
        f.user_id = auth.uid() OR
        (f.space_id IS NOT NULL AND user_can_access_space(auth.uid(), f.space_id))
      )
    )
  );

CREATE POLICY "Users can delete file tag assignments"
  ON file_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM files f
      JOIN file_tags ft ON ft.id = tag_id
      WHERE f.id = file_id
      AND ft.user_id = auth.uid()
      AND (
        f.user_id = auth.uid() OR
        (f.space_id IS NOT NULL AND user_can_access_space(auth.uid(), f.space_id))
      )
    )
  );

-- ============================================================================
-- LINK TAGS (personal only)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their link tags" ON link_tags;
DROP POLICY IF EXISTS "Users can create their link tags" ON link_tags;
DROP POLICY IF EXISTS "Users can update their link tags" ON link_tags;
DROP POLICY IF EXISTS "Users can delete their link tags" ON link_tags;

CREATE POLICY "Users can view their link tags"
  ON link_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their link tags"
  ON link_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their link tags"
  ON link_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their link tags"
  ON link_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- LINK TAG ASSIGNMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view link tag assignments" ON link_tag_assignments;
DROP POLICY IF EXISTS "Users can create link tag assignments" ON link_tag_assignments;
DROP POLICY IF EXISTS "Users can delete link tag assignments" ON link_tag_assignments;

CREATE POLICY "Users can view link tag assignments"
  ON link_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM external_links el
      WHERE el.id = link_id
      AND (
        el.user_id = auth.uid() OR
        (el.space_id IS NOT NULL AND user_can_access_space(auth.uid(), el.space_id))
      )
    )
  );

CREATE POLICY "Users can create link tag assignments"
  ON link_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_links el
      JOIN link_tags lt ON lt.id = tag_id
      WHERE el.id = link_id
      AND lt.user_id = auth.uid()
      AND (
        el.user_id = auth.uid() OR
        (el.space_id IS NOT NULL AND user_can_access_space(auth.uid(), el.space_id))
      )
    )
  );

CREATE POLICY "Users can delete link tag assignments"
  ON link_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM external_links el
      JOIN link_tags lt ON lt.id = tag_id
      WHERE el.id = link_id
      AND lt.user_id = auth.uid()
      AND (
        el.user_id = auth.uid() OR
        (el.space_id IS NOT NULL AND user_can_access_space(auth.uid(), el.space_id))
      )
    )
  );

-- ============================================================================
-- COLLECTION EXTERNAL LINKS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view collection external links" ON collection_external_links;
DROP POLICY IF EXISTS "Users can create collection external links" ON collection_external_links;
DROP POLICY IF EXISTS "Users can update collection external links" ON collection_external_links;
DROP POLICY IF EXISTS "Users can delete collection external links" ON collection_external_links;

CREATE POLICY "Users can view collection external links"
  ON collection_external_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can create collection external links"
  ON collection_external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can update collection external links"
  ON collection_external_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );

CREATE POLICY "Users can delete collection external links"
  ON collection_external_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.user_id = auth.uid() OR
        (c.space_id IS NOT NULL AND user_can_access_space(auth.uid(), c.space_id))
      )
    )
  );
