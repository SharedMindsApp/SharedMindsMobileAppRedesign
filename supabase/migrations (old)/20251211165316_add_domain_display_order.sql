/*
  # Add display order to domains

  1. Changes
    - Add display_order column to domains table
    - Set default values based on domain type
    - Add index for efficient sorting

  2. Notes
    - Allows users to customize the order in which domains appear
    - Lower numbers appear first
*/

-- Add display_order column
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Set initial display_order based on domain name
UPDATE domains 
SET display_order = CASE name
  WHEN 'work' THEN 1
  WHEN 'personal' THEN 2
  WHEN 'creative' THEN 3
  WHEN 'health' THEN 4
  ELSE 999
END
WHERE display_order = 0;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_domains_user_display_order 
ON domains(user_id, display_order);
