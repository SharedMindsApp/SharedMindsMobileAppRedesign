-- ============================================================
-- Evidence capture for moderation flags
-- ============================================================
-- When a user reports another user during a live session, we want to
-- preserve forensic evidence the admin can review:
--
--   • A single video frame of the reported participant's tile (PNG)
--   • A snapshot of the session's chat transcript (JSONB)
--
-- We DO NOT record sessions preemptively — that's a recording-consent
-- minefield. Only capture on report submission. All evidence auto-deletes
-- after 90 days unless tied to a still-open flag in an unresolved state.
--
-- Storage lives in a private bucket; metadata in `flag_evidence`. Both
-- are admin-only via RLS.
-- ============================================================

-- ── 1. Private storage bucket ────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('flag-evidence', 'flag-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Block all storage reads/writes except for admins. Service role bypasses
-- RLS for the actual uploads (via our edge function or signed URLs).
DROP POLICY IF EXISTS "flag_evidence_admin_read" ON storage.objects;
CREATE POLICY "flag_evidence_admin_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'flag-evidence'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. Metadata table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.flag_evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id         uuid NOT NULL REFERENCES public.content_flags(id) ON DELETE CASCADE,
  evidence_type   text NOT NULL CHECK (evidence_type IN ('screenshot', 'chat_transcript')),
  -- For screenshots: storage object path. For transcripts: NULL.
  storage_path    text,
  -- For transcripts: inline JSONB. For screenshots: NULL.
  transcript      jsonb,
  captured_at     timestamptz NOT NULL DEFAULT now(),
  -- Default 90-day retention. The nightly purge function below honours this.
  auto_delete_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  -- Soft-delete marker for legal hold scenarios (admin sets this to NULL
  -- to override auto_delete_at when a serious incident is under review).
  legal_hold      boolean NOT NULL DEFAULT false,

  CHECK (
    (evidence_type = 'screenshot'       AND storage_path IS NOT NULL AND transcript IS NULL) OR
    (evidence_type = 'chat_transcript'  AND transcript   IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS flag_evidence_flag_idx   ON public.flag_evidence (flag_id);
CREATE INDEX IF NOT EXISTS flag_evidence_purge_idx  ON public.flag_evidence (auto_delete_at) WHERE NOT legal_hold;

ALTER TABLE public.flag_evidence ENABLE ROW LEVEL SECURITY;

-- Reporters can see metadata for evidence attached to their own flags
-- (so they get the "evidence captured" badge in the UI). They CANNOT see
-- the binary content (storage policy above restricts that to admins).
CREATE POLICY "evidence_select_reporter"
  ON public.flag_evidence FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.content_flags
     WHERE id = flag_evidence.flag_id
       AND reporter_id = auth.uid()
  ));

-- Admins can see everything.
CREATE POLICY "evidence_select_admin"
  ON public.flag_evidence FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reporters can insert evidence rows attached to their own flags.
-- (The actual binary uploads happen via the storage bucket; the metadata
--  row is the link between the flag and the stored object.)
CREATE POLICY "evidence_insert_reporter"
  ON public.flag_evidence FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.content_flags
     WHERE id = flag_evidence.flag_id
       AND reporter_id = auth.uid()
  ));

-- Admins can update (toggle legal_hold).
CREATE POLICY "evidence_update_admin"
  ON public.flag_evidence FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── 3. Nightly purge function ────────────────────────────────────────
--
-- Deletes expired evidence rows + the associated storage objects.
-- Skipped for any row with legal_hold = true.
--
-- This is the function; scheduling (pg_cron OR Supabase scheduled
-- edge function) is set up out-of-band — call it nightly.

CREATE OR REPLACE FUNCTION public.purge_expired_flag_evidence()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_count int := 0;
  v_row   record;
BEGIN
  FOR v_row IN
    SELECT id, storage_path
      FROM public.flag_evidence
     WHERE NOT legal_hold
       AND auto_delete_at <= now()
  LOOP
    -- Delete the binary if any
    IF v_row.storage_path IS NOT NULL THEN
      DELETE FROM storage.objects
       WHERE bucket_id = 'flag-evidence'
         AND name = v_row.storage_path;
    END IF;
    -- Delete the metadata
    DELETE FROM public.flag_evidence WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_flag_evidence() TO service_role;

-- ── 4. Schedule the purge nightly via pg_cron if available ──────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    PERFORM cron.unschedule('purge-flag-evidence');
    PERFORM cron.schedule(
      'purge-flag-evidence',
      '0 3 * * *',  -- 03:00 UTC daily
      $cron$ SELECT public.purge_expired_flag_evidence(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
