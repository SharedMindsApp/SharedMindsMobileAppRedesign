/*
  # Add Triggers for Focus Session Counts

  1. Changes
    - Add trigger to automatically increment drift_count when drift events are logged
    - Add trigger to automatically increment distraction_count when distraction events are logged
    - This ensures counts are always in sync with events
    - Real-time subscriptions will automatically pick up these changes

  2. Benefits
    - Eliminates race conditions
    - Ensures data integrity
    - Simplifies application code
    - Enables real-time UI updates via subscriptions
*/

-- Function to increment drift count when drift event is logged
CREATE OR REPLACE FUNCTION increment_drift_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'drift' THEN
    UPDATE focus_sessions
    SET drift_count = drift_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment distraction count when distraction event is logged
CREATE OR REPLACE FUNCTION increment_distraction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'distraction' THEN
    UPDATE focus_sessions
    SET distraction_count = distraction_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for drift events
DROP TRIGGER IF EXISTS focus_events_increment_drift ON focus_events;
CREATE TRIGGER focus_events_increment_drift
  AFTER INSERT ON focus_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_drift_count();

-- Create trigger for distraction events
DROP TRIGGER IF EXISTS focus_events_increment_distraction ON focus_events;
CREATE TRIGGER focus_events_increment_distraction
  AFTER INSERT ON focus_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_distraction_count();
