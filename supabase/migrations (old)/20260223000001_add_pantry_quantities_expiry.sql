-- Add gentle quantity and expiry awareness to pantry items
-- All fields are optional and informational only
-- No validation, no enforcement, no pressure

-- Add quantity fields (natural language, free-text)
ALTER TABLE household_pantry_items
ADD COLUMN IF NOT EXISTS quantity_value text,  -- e.g. "3", "half", "a few"
ADD COLUMN IF NOT EXISTS quantity_unit text,   -- e.g. "tins", "packs", "kg"
ADD COLUMN IF NOT EXISTS expires_on date;      -- optional use-by / best-before date

-- Create index for expiry date (for optional sorting, not alerts)
CREATE INDEX IF NOT EXISTS idx_pantry_items_expires_on 
  ON household_pantry_items(expires_on) 
  WHERE expires_on IS NOT NULL;

-- Note: No constraints, no validation, no triggers
-- These fields are purely informational and optional
