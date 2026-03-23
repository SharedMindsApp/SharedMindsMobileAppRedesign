/*
  # Phase 2C-A: Add search_path to LOW-RISK Cleanup Function

  1. Changes
    - Add `SET search_path = public` to `expire_old_ephemeral_chats` function
  
  2. Security
    - ONLY adding search_path hardening
    - NO logic changes
    - NO permission changes
    - SECURITY DEFINER preserved
    - Function body byte-for-byte identical
  
  ## Function Classification
  - Risk Level: LOW
  - No auth context
  - Isolated cleanup logic (DELETE only)
  - Safe for minimal hardening
*/

-- Add search_path to expire_old_ephemeral_chats (ephemeral chat cleanup)
CREATE OR REPLACE FUNCTION public.expire_old_ephemeral_chats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
v_deleted_count integer;
BEGIN
WITH deleted AS (
DELETE FROM ai_conversations
WHERE is_ephemeral = true
AND expires_at IS NOT NULL
AND expires_at < now()
RETURNING id
)
SELECT COUNT(*) INTO v_deleted_count FROM deleted;

RETURN v_deleted_count;
END;
$function$;
