-- ─────────────────────────────────────────────────────────────────
-- take_over_as_host(session_id)
--
-- When the host of a matched 1-on-1 ABANDONS the session (closes the tab /
-- navigates away without ending), the remaining partner shouldn't be orphaned
-- mid-focus. This lets the partner take over as the new host and re-open the
-- door so the session re-enters the match pool and someone new can drop in.
--
-- Deliberate "End" is unaffected — that ends the session for both (the shared
-- debrief). This RPC is only invoked by the client after presence shows the
-- host has been gone past a grace period.
--
-- Security: SECURITY DEFINER, but the WHERE clause enforces that ONLY the
-- current partner of an ACTIVE session can take it over (and only once —
-- partner_user_id must still equal the caller). Returns the updated row, or
-- NULL if the caller wasn't eligible (already taken over, session ended, etc.).
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.take_over_as_host(p_session_id uuid)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET
    user_id             = v_uid,        -- the partner becomes the host/owner
    partner_user_id     = NULL,         -- slot reopened
    session_mode        = 'solo',       -- re-enters the open-to-match pool
    open_to_match       = true,         -- door open again for a new match
    match_joined_at     = NULL,
    intro_phase_ends_at = NULL,
    -- The goal text stays for continuity, but drop the previous host's private
    -- refs — the new owner can't see them and they'd dangle.
    project_id          = NULL,
    session_task_id     = NULL,
    co_host_user_id     = NULL,
    updated_at          = now()
  WHERE id = p_session_id
    AND status = 'active'
    AND partner_user_id = v_uid          -- caller must be the current partner
  RETURNING * INTO v_row;

  -- v_row is NULL when the WHERE matched nothing (not the partner / already
  -- taken over / ended). The client treats NULL as "couldn't take over".
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_over_as_host(uuid) TO authenticated;
