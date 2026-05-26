-- ============================================================
-- Safety escalation — warnings, suspensions, and user-level reports
-- ============================================================
-- Builds on 20260520000018_content_moderation.sql which already gave us
-- user_blocks, content_flags, and moderation_actions. This migration adds:
--
--   1. 'user' as a valid content_flags.content_type so users can report
--      a profile holistically (not just a specific message)
--   2. user_warnings table — admin-issued warnings with severity tiers
--   3. profiles.suspended_until + warning_count for quick lookups
--   4. RLS so users can see their own warnings + admins see everyone's
--   5. A view (user_safety_summary) joining flags + warnings per user,
--      so the admin queue can sort by "repeat offender" risk
-- ============================================================

-- ── 1. Allow content_type = 'user' for whole-profile reports ─────────
DO $$
BEGIN
  ALTER TABLE public.content_flags DROP CONSTRAINT IF EXISTS content_flags_content_type_check;
  ALTER TABLE public.content_flags
    ADD CONSTRAINT content_flags_content_type_check
    CHECK (content_type IN ('chat', 'dm', 'post', 'reply', 'session', 'user'));
END;
$$;

-- ── 2. user_warnings — escalation history ────────────────────────────
--
-- Severity tiers, ascending consequence:
--   'warning'        — first-stage nudge, no app-level effect
--   'final_warning'  — last stop before suspension, no effect
--   'suspension'     — has expires_at; user cannot log in until then
--   'ban'            — permanent; suspended_until set far in the future
--
-- We DON'T auto-decrement warning_count on expiry — admins can review
-- the full history when deciding on the next action.

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  severity          text NOT NULL CHECK (severity IN (
                       'warning', 'final_warning', 'suspension', 'ban'
                    )),
  reason            text NOT NULL,
  related_flag_id   uuid REFERENCES public.content_flags(id) ON DELETE SET NULL,
  expires_at        timestamptz, -- only meaningful for 'suspension'
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_warnings_user_idx     ON public.user_warnings (user_id);
CREATE INDEX IF NOT EXISTS user_warnings_severity_idx ON public.user_warnings (severity);
CREATE INDEX IF NOT EXISTS user_warnings_created_idx  ON public.user_warnings (created_at DESC);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- A user can see warnings issued to them; admins can see all.
CREATE POLICY "warnings_select_own"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "warnings_select_admin"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can issue warnings.
CREATE POLICY "warnings_insert_admin"
  ON public.user_warnings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── 3. Suspension state on profiles ──────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS warning_count   int NOT NULL DEFAULT 0;

-- Trigger: when a warning lands, bump the counter + set suspended_until
-- for suspension/ban severities. Single source of truth so the UI can
-- just read profiles.suspended_until without joining.

CREATE OR REPLACE FUNCTION public.apply_warning_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET warning_count = warning_count + 1,
         suspended_until = CASE
           WHEN NEW.severity = 'suspension'
             THEN COALESCE(NEW.expires_at, now() + INTERVAL '7 days')
           WHEN NEW.severity = 'ban'
             THEN now() + INTERVAL '100 years'  -- effectively forever
           ELSE suspended_until
         END
   WHERE id = NEW.user_id;

  -- Notify the user that they've been actioned (suspension/ban only).
  IF NEW.severity IN ('warning', 'final_warning', 'suspension', 'ban') THEN
    INSERT INTO public.notifications (user_id, type, title, body, related_id, deep_link)
    VALUES (
      NEW.user_id,
      'content_warning',
      CASE NEW.severity
        WHEN 'warning'       THEN 'Community warning'
        WHEN 'final_warning' THEN 'Final warning'
        WHEN 'suspension'    THEN 'Account suspended'
        WHEN 'ban'           THEN 'Account banned'
      END,
      NEW.reason,
      NEW.id,
      '/settings'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_warning_issued ON public.user_warnings;
CREATE TRIGGER on_warning_issued
  AFTER INSERT ON public.user_warnings
  FOR EACH ROW EXECUTE FUNCTION public.apply_warning_to_profile();

-- ── 4. Admin view: per-user safety summary ───────────────────────────
--
-- Used by the admin queue to surface repeat offenders. Counts open
-- flags, warnings, and the latest action so the queue can be sorted by
-- highest risk first.

CREATE OR REPLACE VIEW public.user_safety_summary AS
SELECT
  p.id                AS user_id,
  p.display_name,
  p.avatar_url,
  p.warning_count,
  p.suspended_until,
  COALESCE(open_flags.cnt, 0)        AS open_flag_count,
  COALESCE(total_flags.cnt, 0)       AS total_flag_count,
  COALESCE(warnings.cnt, 0)          AS warning_history_count,
  latest_flag.created_at             AS latest_flag_at,
  latest_warning.severity            AS latest_warning_severity,
  latest_warning.created_at          AS latest_warning_at
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
    FROM public.content_flags
   WHERE flagged_user_id = p.id AND status = 'open'
) open_flags ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
    FROM public.content_flags
   WHERE flagged_user_id = p.id
) total_flags ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
    FROM public.user_warnings
   WHERE user_id = p.id
) warnings ON true
LEFT JOIN LATERAL (
  SELECT created_at FROM public.content_flags
   WHERE flagged_user_id = p.id
   ORDER BY created_at DESC LIMIT 1
) latest_flag ON true
LEFT JOIN LATERAL (
  SELECT severity, created_at FROM public.user_warnings
   WHERE user_id = p.id
   ORDER BY created_at DESC LIMIT 1
) latest_warning ON true;

-- Admin-only view — RLS via the base profiles table is too liberal, so
-- we wrap the view in a SECURITY DEFINER function for admin pages.

CREATE OR REPLACE FUNCTION public.admin_user_safety_summary(_limit int DEFAULT 50)
RETURNS SETOF public.user_safety_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.user_safety_summary
   WHERE (open_flag_count > 0 OR warning_history_count > 0)
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
   ORDER BY open_flag_count DESC, total_flag_count DESC
   LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_safety_summary(int) TO authenticated;
