-- A short "why I'd like to connect" note on connection requests.
--
-- Optional, max 280 chars (enforced both client-side and via CHECK
-- constraint). Visible to the addressee on the Requests tab, and
-- echoed into the notification body so cold requests aren't decision-
-- less for the receiver.

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_note_length;

ALTER TABLE public.connections
  ADD CONSTRAINT connections_note_length
  CHECK (note IS NULL OR char_length(note) <= 280);
