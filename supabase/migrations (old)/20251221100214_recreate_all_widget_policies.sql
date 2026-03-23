/*
  # Recreate All Widget-Related Policies
  
  ## Summary
  Recreates all RLS policies that were dropped when we fixed user_can_access_space
  
  ## Tables Covered
  - fridge_widgets
  - fridge_widget_layouts
  - stack_cards
  - stack_card_items
  - files
  - collections
  - collection_references
  - external_links
  - canvas_svg_objects
  - tables, table_columns, table_rows, table_cells
  - file_tag_assignments, link_tag_assignments
  - collection_external_links
*/

-- ============================================================================
-- FRIDGE_WIDGETS POLICIES
-- ============================================================================

CREATE POLICY "View widgets in accessible spaces"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Create widgets in accessible spaces"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Delete widgets in accessible spaces"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- FRIDGE_WIDGET_LAYOUTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view widget layouts"
  ON fridge_widget_layouts FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM fridge_widgets WHERE id = widget_id))
  );

CREATE POLICY "Users can create widget layouts"
  ON fridge_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM fridge_widgets WHERE id = widget_id))
  );

-- ============================================================================
-- STACK_CARDS POLICIES
-- ============================================================================

CREATE POLICY "Users can view stack cards"
  ON stack_cards FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create stack cards"
  ON stack_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update stack cards"
  ON stack_cards FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete stack cards"
  ON stack_cards FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- STACK_CARD_ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Users can view stack card items"
  ON stack_card_items FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM stack_cards WHERE id = stack_id))
  );

CREATE POLICY "Users can create stack card items"
  ON stack_card_items FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM stack_cards WHERE id = stack_id))
  );

CREATE POLICY "Users can update stack card items"
  ON stack_card_items FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM stack_cards WHERE id = stack_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM stack_cards WHERE id = stack_id))
  );

CREATE POLICY "Users can delete stack card items"
  ON stack_card_items FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM stack_cards WHERE id = stack_id))
  );

-- ============================================================================
-- FILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view files"
  ON files FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update files"
  ON files FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete files"
  ON files FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- COLLECTIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete collections"
  ON collections FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- COLLECTION_REFERENCES POLICIES
-- ============================================================================

CREATE POLICY "Users can view collection references"
  ON collection_references FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can create collection references"
  ON collection_references FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can update collection references"
  ON collection_references FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can delete collection references"
  ON collection_references FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

-- ============================================================================
-- EXTERNAL_LINKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view external links"
  ON external_links FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create external links"
  ON external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update external links"
  ON external_links FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete external links"
  ON external_links FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- CANVAS_SVG_OBJECTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view canvas svg objects"
  ON canvas_svg_objects FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create canvas svg objects"
  ON canvas_svg_objects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update canvas svg objects"
  ON canvas_svg_objects FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete canvas svg objects"
  ON canvas_svg_objects FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- TABLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can create tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- TABLE_COLUMNS POLICIES
-- ============================================================================

CREATE POLICY "Users can view table columns"
  ON table_columns FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can create table columns"
  ON table_columns FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can update table columns"
  ON table_columns FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can delete table columns"
  ON table_columns FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

-- ============================================================================
-- TABLE_ROWS POLICIES
-- ============================================================================

CREATE POLICY "Users can view table rows"
  ON table_rows FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can create table rows"
  ON table_rows FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can update table rows"
  ON table_rows FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

CREATE POLICY "Users can delete table rows"
  ON table_rows FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM tables WHERE id = table_id))
  );

-- ============================================================================
-- TABLE_CELLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view table cells"
  ON table_cells FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT t.space_id FROM tables t JOIN table_rows tr ON tr.table_id = t.id WHERE tr.id = row_id))
  );

CREATE POLICY "Users can create table cells"
  ON table_cells FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT t.space_id FROM tables t JOIN table_rows tr ON tr.table_id = t.id WHERE tr.id = row_id))
  );

CREATE POLICY "Users can update table cells"
  ON table_cells FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT t.space_id FROM tables t JOIN table_rows tr ON tr.table_id = t.id WHERE tr.id = row_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT t.space_id FROM tables t JOIN table_rows tr ON tr.table_id = t.id WHERE tr.id = row_id))
  );

CREATE POLICY "Users can delete table cells"
  ON table_cells FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT t.space_id FROM tables t JOIN table_rows tr ON tr.table_id = t.id WHERE tr.id = row_id))
  );

-- ============================================================================
-- FILE_TAG_ASSIGNMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view file tag assignments"
  ON file_tag_assignments FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM files WHERE id = file_id))
  );

CREATE POLICY "Users can create file tag assignments"
  ON file_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM files WHERE id = file_id))
  );

CREATE POLICY "Users can delete file tag assignments"
  ON file_tag_assignments FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM files WHERE id = file_id))
  );

-- ============================================================================
-- LINK_TAG_ASSIGNMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view link tag assignments"
  ON link_tag_assignments FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM external_links WHERE id = link_id))
  );

CREATE POLICY "Users can create link tag assignments"
  ON link_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM external_links WHERE id = link_id))
  );

CREATE POLICY "Users can delete link tag assignments"
  ON link_tag_assignments FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM external_links WHERE id = link_id))
  );

-- ============================================================================
-- COLLECTION_EXTERNAL_LINKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view collection external links"
  ON collection_external_links FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can create collection external links"
  ON collection_external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can update collection external links"
  ON collection_external_links FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );

CREATE POLICY "Users can delete collection external links"
  ON collection_external_links FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), (SELECT space_id FROM collections WHERE id = collection_id))
  );
