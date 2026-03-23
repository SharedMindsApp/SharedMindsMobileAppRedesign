/*
  # Security Hardening Phase 1 - Batch 2: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_daily_alignment_settings_updated_at
  - update_daily_alignment_updated_at
  - update_daily_planner_updated_at
  - update_external_links_updated_at
  - update_focus_sessions_updated_at
*/

-- 1. update_daily_alignment_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_daily_alignment_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_daily_alignment_updated_at
CREATE OR REPLACE FUNCTION public.update_daily_alignment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_daily_planner_updated_at
CREATE OR REPLACE FUNCTION public.update_daily_planner_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_external_links_updated_at
CREATE OR REPLACE FUNCTION public.update_external_links_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_focus_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_focus_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
