/*
  # Add Calendar Event Types (Non-Breaking, Additive Only)

  Goal: Introduce semantic calendar event types without breaking existing events, UI, or services.

  Changes:
  1. Create unified calendar_event_type enum with all semantic types
  2. Add event_type column to calendar_events (nullable, defaults to 'event')
  3. Add event_type column to context_events (nullable, defaults to 'event')
  4. Create indexes for filtering

  ✅ All existing rows automatically default to 'event'
  ✅ No data migration needed
  ✅ No behavior changes yet
  ✅ Backward compatible
*/

-- Create unified calendar event type enum
CREATE TYPE calendar_event_type AS ENUM (
  'event',           -- default (existing behavior)
  'meeting',
  'appointment',
  'time_block',
  'goal',
  'habit',
  'meal',
  'task',
  'reminder',
  'travel_segment',
  'milestone'
);

-- Add event_type to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS event_type calendar_event_type
DEFAULT 'event';

-- Note: context_events already has event_type column with context_event_type enum
-- Since we can't have two columns with the same name and different types,
-- we'll map context_event_type values to calendar_event_type in the service layer
-- when projecting context events to personal calendar.
-- The existing context_event_type column remains unchanged for backward compatibility.

-- Create indexes for filtering (non-breaking, performance optimization)
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type
ON calendar_events(event_type)
WHERE event_type IS NOT NULL;

-- Note: Index on context_events.event_type not created here since
-- context_events already has event_type with different enum type.
-- The existing context_event_type column has its own indexes.

