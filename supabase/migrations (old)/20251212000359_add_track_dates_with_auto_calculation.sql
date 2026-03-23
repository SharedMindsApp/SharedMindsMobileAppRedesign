/*
  # Add Track Dates with Auto-Calculation

  1. Overview
    - Adds start_date and end_date fields to tracks
    - Parent tracks automatically span all their children
    - Automatic recalculation when children change

  2. New Fields
    - `start_date` - Start date for the track/subtrack
    - `end_date` - End date for the track/subtrack
    - Both nullable to support gradual adoption

  3. Auto-Calculation Logic
    - Sub-tracks: Can have dates set manually by users
    - Parent tracks: Dates auto-calculated from MIN/MAX of children
    - If a parent has children, its dates are computed automatically
    - If a parent has no children, it can have manual dates

  4. Triggers
    - After INSERT/UPDATE/DELETE on a track with dates
    - Recalculates parent track dates automatically
    - Cascades up the hierarchy
*/

-- Add date fields to guardrails_tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE guardrails_tracks ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE guardrails_tracks ADD COLUMN end_date date;
  END IF;
END $$;

-- Create function to calculate parent track dates from children
CREATE OR REPLACE FUNCTION calculate_parent_track_dates(parent_id uuid)
RETURNS void AS $$
DECLARE
  min_start date;
  max_end date;
BEGIN
  -- Get the MIN start_date and MAX end_date from all children
  SELECT 
    MIN(start_date),
    MAX(end_date)
  INTO min_start, max_end
  FROM guardrails_tracks
  WHERE parent_track_id = parent_id
  AND start_date IS NOT NULL
  AND end_date IS NOT NULL;

  -- Update the parent track if we found valid dates
  IF min_start IS NOT NULL AND max_end IS NOT NULL THEN
    UPDATE guardrails_tracks
    SET 
      start_date = min_start,
      end_date = max_end
    WHERE id = parent_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to cascade parent date updates up the hierarchy
CREATE OR REPLACE FUNCTION cascade_parent_track_dates(track_id uuid)
RETURNS void AS $$
DECLARE
  current_parent_id uuid;
  depth_limit integer := 100;
  current_depth integer := 0;
BEGIN
  -- Get the parent of the current track
  SELECT parent_track_id INTO current_parent_id
  FROM guardrails_tracks
  WHERE id = track_id;

  -- Walk up the hierarchy and update each parent
  WHILE current_parent_id IS NOT NULL AND current_depth < depth_limit LOOP
    -- Calculate dates for this parent
    PERFORM calculate_parent_track_dates(current_parent_id);
    
    -- Move to the next level up
    SELECT parent_track_id INTO current_parent_id
    FROM guardrails_tracks
    WHERE id = current_parent_id;
    
    current_depth := current_depth + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-update parent dates
CREATE OR REPLACE FUNCTION trigger_update_parent_track_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT or UPDATE: cascade from the new/updated track
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.parent_track_id IS NOT NULL THEN
      PERFORM cascade_parent_track_dates(NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  -- For DELETE: cascade from the old track
  IF (TG_OP = 'DELETE') THEN
    IF OLD.parent_track_id IS NOT NULL THEN
      PERFORM cascade_parent_track_dates(OLD.id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on guardrails_tracks for automatic date updates
DROP TRIGGER IF EXISTS trigger_auto_update_parent_track_dates ON guardrails_tracks;
CREATE TRIGGER trigger_auto_update_parent_track_dates
  AFTER INSERT OR UPDATE OR DELETE ON guardrails_tracks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_parent_track_dates();

-- Create helper function to check if a track has children
CREATE OR REPLACE FUNCTION track_has_children(track_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guardrails_tracks
    WHERE parent_track_id = track_id
  );
END;
$$ LANGUAGE plpgsql;
