/*
  # Add Tables Widget Type

  1. Changes
    - Add 'tables' to widget_type enum for fridge_widgets

  2. Notes
    - Safe migration that extends existing enum
    - Tables widget will reference the tables table via content.tableId
*/

-- Add 'tables' to the widget_type enum
ALTER TYPE widget_type ADD VALUE IF NOT EXISTS 'tables';
