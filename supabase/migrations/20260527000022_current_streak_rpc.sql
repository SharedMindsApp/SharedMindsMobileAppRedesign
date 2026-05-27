-- current_streak() — the user's consecutive-days streak of completed
-- focus sessions, ending today or yesterday.
--
-- Defines "streak" consistently with the streak_at_risk scheduler in
-- 20260527000019 — distinct UTC days with at least one completed
-- session. We allow the streak to end "yesterday" because the daily
-- nudge fires at 19:00 UTC and a user might not have started their
-- session yet. The home page chip should still encourage them.
--
-- Returns:
--   { days int, last_session_date date }
--
-- A streak of < 2 is reported as 0 — single-day-and-done isn't a
-- streak yet. The UI hides the chip below this threshold so we don't
-- show "1 day streak" the first time someone finishes a session.

CREATE OR REPLACE FUNCTION public.current_streak()
RETURNS TABLE (days int, last_session_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today   date := CURRENT_DATE;
  v_check   date;
  v_count   int  := 0;
  v_last    date := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0, NULL::date;
    RETURN;
  END IF;

  -- Walk backwards from today. Stop at the first day with no
  -- completed session. We accept yesterday as a valid streak anchor
  -- if the user hasn't completed one today yet — see header.
  v_check := v_today;
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.focus_sessions
      WHERE user_id = v_user_id
        AND status = 'completed'
        AND DATE(start_time AT TIME ZONE 'UTC') = v_check
    ) THEN
      v_count := v_count + 1;
      v_last  := COALESCE(v_last, v_check);
      v_check := v_check - 1;
    ELSE
      -- One-day "grace" — if today has no session but yesterday does,
      -- consider yesterday the streak anchor and continue counting
      -- back from there. After the first miss we stop.
      IF v_check = v_today AND v_count = 0 THEN
        v_check := v_check - 1;
        CONTINUE;
      END IF;
      EXIT;
    END IF;

    -- Cap the walk at ~365 days to avoid pathological loops.
    IF v_today - v_check > 365 THEN EXIT; END IF;
  END LOOP;

  -- Threshold: < 2 isn't a streak yet.
  IF v_count < 2 THEN
    RETURN QUERY SELECT 0, NULL::date;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_count, v_last;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_streak() TO authenticated;
