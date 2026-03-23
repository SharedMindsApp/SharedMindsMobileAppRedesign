/*
  # Temporarily Disable All RLS on Fridge Widget Tables

  This migration REMOVES all security restrictions from fridge widget tables
  for debugging purposes only.

  1. Changes
    - DROP all policies on `fridge_widgets`
    - DROP all policies on `fridge_widget_layouts`
    - DISABLE RLS on both tables
  
  2. Result
    - Both tables will have NO security restrictions
    - Any authenticated user can INSERT, SELECT, UPDATE, DELETE
    - This is TEMPORARY for debugging only
  
  ⚠️ WARNING: This removes all security. Do not use in production.
*/

-- Drop all policies on fridge_widgets
DROP POLICY IF EXISTS "Members can view household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Members can insert household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Members can update household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Members can delete household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Household members can view widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Household members can insert widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Household members can update widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Household members can delete widgets" ON fridge_widgets;

-- Drop all policies on fridge_widget_layouts
DROP POLICY IF EXISTS "Members can view household widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Members can insert household widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Members can update household widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Members can delete household widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Household members can view layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Household members can insert layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Household members can update layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Household members can delete layouts" ON fridge_widget_layouts;

-- Disable RLS entirely on both tables
ALTER TABLE fridge_widgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_widget_layouts DISABLE ROW LEVEL SECURITY;
