/*
  # Security Hardening Phase 1 - Batch 9: search_path for final update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_track_template_updated_at
  - update_guardrails_tracks_updated_at
  - update_user_skills_updated_at
  - update_user_subtrack_template_updated_at
  - update_user_track_template_updated_at
*/

-- 1. update_track_template_updated_at
CREATE OR REPLACE FUNCTION public.update_track_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_guardrails_tracks_updated_at
CREATE OR REPLACE FUNCTION public.update_guardrails_tracks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_user_skills_updated_at
CREATE OR REPLACE FUNCTION public.update_user_skills_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_user_subtrack_template_updated_at
CREATE OR REPLACE FUNCTION public.update_user_subtrack_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_user_track_template_updated_at
CREATE OR REPLACE FUNCTION public.update_user_track_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
