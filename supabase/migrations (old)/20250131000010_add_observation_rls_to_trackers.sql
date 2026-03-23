/*
  # Add Observation RLS Policies to Trackers and Tracker Entries
  
  Extends existing RLS policies to allow observers to read trackers and entries
  via tracker_observation_links.
*/

-- Drop existing policies if they exist (to recreate with observation support)
DROP POLICY IF EXISTS "Observers can read trackers via observation links" ON trackers;
DROP POLICY IF EXISTS "Observers can read tracker entries via observation links" ON tracker_entries;

-- Observers can read trackers via observation links
CREATE POLICY "Observers can read trackers via observation links"
  ON trackers
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tracker_observation_links
      WHERE tracker_id = trackers.id
        AND observer_user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

-- Observers can read tracker entries via observation links
CREATE POLICY "Observers can read tracker entries via observation links"
  ON tracker_entries
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trackers t
      WHERE t.id = tracker_entries.tracker_id
        AND (
          t.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM tracker_observation_links
            WHERE tracker_id = t.id
              AND observer_user_id = auth.uid()
              AND revoked_at IS NULL
          )
        )
    )
  );

-- Comments
COMMENT ON POLICY "Observers can read trackers via observation links" ON trackers IS 
  'Allows users to read trackers they own or have observation links for';

COMMENT ON POLICY "Observers can read tracker entries via observation links" ON tracker_entries IS 
  'Allows users to read entries for trackers they own or have observation links for';
