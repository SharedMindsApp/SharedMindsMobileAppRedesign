-- V1 Migration 010: Calendar extras + context events support
--
-- Creates:
-- 1. calendar_event_type_colors — user-customized colors per event type
-- 2. context_events — tracker studio context events
-- 3. get_contexts_in_date_range() RPC — date range query for context events

-- ============================================================
-- 1. calendar_event_type_colors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_event_type_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

ALTER TABLE public.calendar_event_type_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own event type colors"
  ON public.calendar_event_type_colors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS calendar_event_type_colors_user_idx
  ON public.calendar_event_type_colors(user_id);


-- ============================================================
-- 2. context_events (tracker studio contexts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.context_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  context_type text NOT NULL DEFAULT 'general',
  context_id text,
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.context_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own context events"
  ON public.context_events
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS context_events_owner_idx
  ON public.context_events(owner_id);

CREATE INDEX IF NOT EXISTS context_events_dates_idx
  ON public.context_events(start_date, end_date);


-- ============================================================
-- 3. get_contexts_in_date_range() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_contexts_in_date_range(
  p_user_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS SETOF public.context_events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.context_events
  WHERE owner_id = p_user_id
    AND archived_at IS NULL
    AND (
      -- Event overlaps with the date range
      (start_date <= p_end_date AND (end_date >= p_start_date OR end_date IS NULL))
      OR
      -- Event has no dates (always visible)
      (start_date IS NULL AND end_date IS NULL)
    )
  ORDER BY start_date ASC NULLS LAST;
$$;
