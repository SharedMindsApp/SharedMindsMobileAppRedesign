/*
  # Add Personal Spaces Consumption Model

  ## Summary
  Extends guardrails_personal_links with consumption semantics, enabling Personal Spaces
  to safely consume Guardrails data without becoming a source of truth.

  ## Key Principles
  - Guardrails remains authoritative
  - Personal Spaces never mutate Guardrails data
  - Consumption is explicit and opt-in
  - Users control visibility and interpretation
  - Future-ready for automation and analytics

  ## Changes to Tables
  1. `guardrails_personal_links` - Add consumption metadata columns
    - `consumption_mode` (reference, derived, shadowed)
    - `visibility_state` (visible, hidden, muted, pinned)
    - `derived_metadata` (JSONB for space-specific computed data)
    - `last_consumed_at` (timestamp for analytics)
    - `consumption_count` (integer for usage tracking)

  ## New Enum Types
  - `personal_consumption_mode` (reference, derived, shadowed)
  - `personal_visibility_state` (visible, hidden, muted, pinned)

  ## Security
  - No RLS changes needed (inherits from existing policies)
  - Consumption metadata is per-user, per-link

  ## Notes
  - Default consumption_mode: 'reference'
  - Default visibility_state: 'visible'
  - derived_metadata stores space-specific computed values (e.g., habit streaks)
  - consumption_count increments on each query (future use)
*/

-- Step 1: Create enum for consumption modes
DO $$ BEGIN
  CREATE TYPE personal_consumption_mode AS ENUM (
    'reference',   -- Read-only mirror of Guardrails data
    'derived',     -- Local projection with computed metadata
    'shadowed'     -- User has hidden this from their space
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create enum for visibility states
DO $$ BEGIN
  CREATE TYPE personal_visibility_state AS ENUM (
    'visible',     -- Normal display in Personal Space
    'hidden',      -- User has hidden from view
    'muted',       -- Temporarily suppressed
    'pinned'       -- User has prioritized this item
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add consumption metadata columns to guardrails_personal_links
DO $$
BEGIN
  -- consumption_mode: How Personal Space interprets this link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_personal_links'
    AND column_name = 'consumption_mode'
  ) THEN
    ALTER TABLE guardrails_personal_links
    ADD COLUMN consumption_mode personal_consumption_mode NOT NULL DEFAULT 'reference';
  END IF;

  -- visibility_state: User's visibility preference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_personal_links'
    AND column_name = 'visibility_state'
  ) THEN
    ALTER TABLE guardrails_personal_links
    ADD COLUMN visibility_state personal_visibility_state NOT NULL DEFAULT 'visible';
  END IF;

  -- derived_metadata: Space-specific computed data (e.g., habit streaks, local notes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_personal_links'
    AND column_name = 'derived_metadata'
  ) THEN
    ALTER TABLE guardrails_personal_links
    ADD COLUMN derived_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- last_consumed_at: Timestamp of last consumption query
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_personal_links'
    AND column_name = 'last_consumed_at'
  ) THEN
    ALTER TABLE guardrails_personal_links
    ADD COLUMN last_consumed_at timestamptz;
  END IF;

  -- consumption_count: Number of times this link has been queried
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_personal_links'
    AND column_name = 'consumption_count'
  ) THEN
    ALTER TABLE guardrails_personal_links
    ADD COLUMN consumption_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 4: Create index for visibility queries
CREATE INDEX IF NOT EXISTS idx_gpl_visibility
  ON guardrails_personal_links(user_id, visibility_state)
  WHERE is_active = true;

-- Step 5: Create index for consumption mode queries
CREATE INDEX IF NOT EXISTS idx_gpl_consumption_mode
  ON guardrails_personal_links(consumption_mode, target_space_type)
  WHERE is_active = true;

-- Step 6: Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_gpl_last_consumed
  ON guardrails_personal_links(last_consumed_at DESC)
  WHERE is_active = true AND last_consumed_at IS NOT NULL;

-- Step 7: Add helpful comments
COMMENT ON COLUMN guardrails_personal_links.consumption_mode IS 
  'How Personal Space interprets this link: reference (read-only mirror), derived (computed local data), shadowed (hidden by user)';

COMMENT ON COLUMN guardrails_personal_links.visibility_state IS 
  'User visibility preference: visible (normal), hidden (user removed), muted (temporarily suppressed), pinned (prioritized)';

COMMENT ON COLUMN guardrails_personal_links.derived_metadata IS 
  'Space-specific computed metadata (e.g., habit streaks, local completion state). Never mutates Guardrails data.';

COMMENT ON COLUMN guardrails_personal_links.last_consumed_at IS 
  'Timestamp of last consumption query. Used for analytics and stale link detection.';

COMMENT ON COLUMN guardrails_personal_links.consumption_count IS 
  'Number of times this link has been queried. Used for usage analytics and future automation prioritization.';