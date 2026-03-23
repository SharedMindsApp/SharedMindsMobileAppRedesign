/*
  # Add source_calendar_event_id to context_events (Phase 7.0)
  
  This migration adds a nullable column to link context_events back to their source
  calendar_events when promoted from personal calendar.
  
  Based: Phase 7.0 - Personal → Context Event Promotion
  
  1. Column Added
    - context_events.source_calendar_event_id (nullable UUID, references calendar_events.id)
  
  2. Constraints
    - Nullable (only set for promoted events)
    - Foreign key to calendar_events(id) ON DELETE SET NULL
    - No unique constraint (one calendar event can promote to multiple contexts if needed)
  
  3. Security
    - No RLS changes (existing RLS policies apply)
    - Column exists only for lineage tracking
  
  4. Notes
    - All changes are additive
    - No data migration required
    - This establishes the one-way promotion lineage (personal → context)
*/

-- Add source_calendar_event_id to context_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'context_events' AND column_name = 'source_calendar_event_id'
  ) THEN
    ALTER TABLE context_events
    ADD COLUMN source_calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for querying by source calendar event
CREATE INDEX IF NOT EXISTS idx_context_events_source_calendar_event 
  ON context_events(source_calendar_event_id) 
  WHERE source_calendar_event_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN context_events.source_calendar_event_id IS 
  'Source calendar event ID when this context event was promoted from a personal calendar event (references calendar_events.id). Null for native context events.';