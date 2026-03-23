/*
  # Phase 2B: Add search_path to Auth Bootstrap Functions

  1. Changes
    - Add `SET search_path = public` to `handle_new_user` function
    - Add `SET search_path = public` to `increment_wizard_ai_attempt` function
  
  2. Security
    - ONLY adding search_path hardening
    - NO logic changes
    - NO permission changes
    - SECURITY DEFINER preserved
    - All triggers unchanged
  
  ## Important Notes
  - This is a minimal, surgical change approved under Phase 2B
  - Function bodies remain identical
  - Auth context handling unchanged
*/

-- 1. Add search_path to handle_new_user (auth trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
INSERT INTO public.profiles (user_id, full_name)
VALUES (
NEW.id,
COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
)
ON CONFLICT (user_id) DO NOTHING;
RETURN NEW;
END;
$function$;

-- 2. Add search_path to increment_wizard_ai_attempt (wizard session rate limiter)
CREATE OR REPLACE FUNCTION public.increment_wizard_ai_attempt(session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
new_count integer;
BEGIN
UPDATE public.wizard_sessions
SET ai_attempts_count = ai_attempts_count + 1,
updated_at = now()
WHERE id = session_id AND user_id = auth.uid()
RETURNING ai_attempts_count INTO new_count;

IF new_count IS NULL THEN
RAISE EXCEPTION 'Session not found or access denied';
END IF;

IF new_count >= 10 THEN
UPDATE public.wizard_sessions
SET ai_disabled = true,
ai_last_error = 'AI session limit reached (10 calls)',
updated_at = now()
WHERE id = session_id AND user_id = auth.uid();
END IF;

RETURN new_count;
END;
$function$;
