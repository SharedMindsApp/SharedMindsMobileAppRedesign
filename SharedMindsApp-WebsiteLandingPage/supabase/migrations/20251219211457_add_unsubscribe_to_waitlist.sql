/*
  # Add Unsubscribe System to Waitlist

  ## Changes
  
  1. New Columns
    - `subscribed` (boolean, default true)
      - Tracks whether user wants to receive emails
      - Only users with subscribed = true receive emails
    - `unsubscribe_token` (text, unique)
      - Unique token for one-click unsubscribe
      - Generated when user joins waitlist
      - Used in unsubscribe links
    - `unsubscribed_at` (timestamptz, nullable)
      - Tracks when user unsubscribed
      - Helpful for analytics and compliance
  
  2. Indexes
    - Index on unsubscribe_token for fast lookups
    - Ensures unique tokens across all users
  
  3. Compliance
    - Supports CAN-SPAM Act requirements
    - Provides one-click unsubscribe functionality
    - Maintains unsubscribe audit trail
*/

-- Add subscribed column (default true)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'subscribed'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN subscribed boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Add unsubscribe_token column (unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'unsubscribe_token'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN unsubscribe_token text UNIQUE;
  END IF;
END $$;

-- Add unsubscribed_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'unsubscribed_at'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN unsubscribed_at timestamptz;
  END IF;
END $$;

-- Create index on unsubscribe_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_unsubscribe_token 
ON waitlist(unsubscribe_token);

-- Create index on subscribed for filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_subscribed 
ON waitlist(subscribed);

-- Backfill existing rows with tokens (if any exist without tokens)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id FROM waitlist WHERE unsubscribe_token IS NULL
  LOOP
    UPDATE waitlist 
    SET unsubscribe_token = encode(gen_random_bytes(32), 'hex')
    WHERE id = rec.id;
  END LOOP;
END $$;