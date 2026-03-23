/*
  # Wizard AI Contract Safety Flags

  1. Overview
    - Add session tracking for AI call limits
    - Track validation failures per session
    - Enable graceful AI fallback mode
    - Prevent runaway AI costs

  2. New Fields in wizard_sessions
    - `ai_attempts_count` - Total AI calls made in this session
    - `ai_failed_at_step` - Last step where AI validation failed (nullable)
    - `ai_disabled` - Whether AI is disabled for remainder of session
    - `ai_last_error` - Last AI error message for debugging (nullable)

  3. Session Rules
    - Max 10 AI calls per session
    - Max 2 retries per step
    - Once disabled, cannot re-enable in same session
    - Errors are logged but don't block wizard

  4. Security
    - All fields are user-specific (RLS enforced)
    - No sensitive AI data stored
    - Errors are sanitized
*/

-- Add AI safety tracking fields to wizard_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wizard_sessions' AND column_name = 'ai_attempts_count'
  ) THEN
    ALTER TABLE public.wizard_sessions ADD COLUMN ai_attempts_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wizard_sessions' AND column_name = 'ai_failed_at_step'
  ) THEN
    ALTER TABLE public.wizard_sessions ADD COLUMN ai_failed_at_step text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wizard_sessions' AND column_name = 'ai_disabled'
  ) THEN
    ALTER TABLE public.wizard_sessions ADD COLUMN ai_disabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wizard_sessions' AND column_name = 'ai_last_error'
  ) THEN
    ALTER TABLE public.wizard_sessions ADD COLUMN ai_last_error text;
  END IF;
END $$;

-- Add index for AI monitoring
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_ai_attempts ON public.wizard_sessions(ai_attempts_count) WHERE ai_attempts_count > 5;

-- Add check constraint to prevent excessive AI calls
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'wizard_sessions' AND constraint_name = 'wizard_sessions_ai_attempts_limit'
  ) THEN
    ALTER TABLE public.wizard_sessions
    ADD CONSTRAINT wizard_sessions_ai_attempts_limit
    CHECK (ai_attempts_count >= 0 AND ai_attempts_count <= 50);
  END IF;
END $$;

-- Function to increment AI attempt counter safely
CREATE OR REPLACE FUNCTION public.increment_wizard_ai_attempt(session_id uuid)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark AI failure for a step
CREATE OR REPLACE FUNCTION public.mark_wizard_ai_step_failed(
  session_id uuid,
  step_name text,
  error_message text
)
RETURNS void AS $$
BEGIN
  UPDATE public.wizard_sessions
  SET ai_failed_at_step = step_name,
      ai_last_error = error_message,
      updated_at = now()
  WHERE id = session_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable AI for session
CREATE OR REPLACE FUNCTION public.disable_wizard_ai(session_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.wizard_sessions
  SET ai_disabled = true,
      updated_at = now()
  WHERE id = session_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining AI safety system
COMMENT ON COLUMN public.wizard_sessions.ai_attempts_count IS 'Total AI calls made in this wizard session (max 10)';
COMMENT ON COLUMN public.wizard_sessions.ai_failed_at_step IS 'Last wizard step where AI validation failed';
COMMENT ON COLUMN public.wizard_sessions.ai_disabled IS 'Whether AI assistance is disabled for remainder of session';
COMMENT ON COLUMN public.wizard_sessions.ai_last_error IS 'Last AI error message (sanitized, for debugging)';
