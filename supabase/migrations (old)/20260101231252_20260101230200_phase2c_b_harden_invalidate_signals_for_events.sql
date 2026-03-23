/*
  # Phase 2C-B: Add search_path to MEDIUM-RISK Cleanup Function

  1. Changes
    - Add `SET search_path = public` to `invalidate_signals_for_events` function
  
  2. Security
    - ONLY adding search_path hardening
    - NO logic changes
    - NO permission changes
    - NO auth validation changes
    - SECURITY DEFINER preserved
    - Function body byte-for-byte identical
  
  ## Function Classification
  - Risk Level: MEDIUM (auth-sensitive)
  - Uses auth.uid() for ownership validation
  - Explicit check prevents cross-user invalidation
  - RLS provides redundant protection
  - Safe for minimal hardening after audit
*/

-- Add search_path to invalidate_signals_for_events (signal invalidation with auth check)
CREATE OR REPLACE FUNCTION public.invalidate_signals_for_events(p_user_id uuid, p_event_ids uuid[], p_reason text DEFAULT 'Source events modified or deleted'::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
v_updated_count integer;
BEGIN
-- Only allow users to invalidate their own signals
IF auth.uid() != p_user_id THEN
RAISE EXCEPTION 'Cannot invalidate signals for other users';
END IF;

-- Update signals that reference any of the provided event IDs
WITH updated AS (
UPDATE candidate_signals
SET status = 'invalidated',
invalidated_at = now(),
invalidated_reason = p_reason
WHERE user_id = p_user_id
AND status = 'candidate'
AND provenance_event_ids && p_event_ids
RETURNING signal_id
)
SELECT COUNT(*) INTO v_updated_count FROM updated;

-- Log the invalidation
INSERT INTO signal_audit_log (user_id, action, actor, reason, metadata)
VALUES (
p_user_id,
'invalidated',
'system',
p_reason,
jsonb_build_object('event_ids', p_event_ids, 'affected_signals', v_updated_count)
);

RETURN v_updated_count;
END;
$function$;
