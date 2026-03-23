/*
  # Add Measurement Context Tags
  
  Phase 1: Measurement Context Tags
  Adds context tags to body_measurements for better pattern recognition
  All tags are optional and help explain fluctuations without judgment
*/

-- Add context_tags column (array of text tags)
ALTER TABLE body_measurements
ADD COLUMN IF NOT EXISTS context_tags TEXT[] DEFAULT '{}';

-- Create index for efficient queries by context tag
CREATE INDEX IF NOT EXISTS idx_body_measurements_context_tags
  ON body_measurements USING GIN (context_tags);

-- Comments
COMMENT ON COLUMN body_measurements.context_tags IS 'Optional context tags to explain measurement fluctuations (e.g., post-training, morning_fasted, travel, illness, stress_period, seasonal_change)';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
