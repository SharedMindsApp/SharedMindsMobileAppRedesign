/*
  # Security Hardening Phase 1 - Batch 1: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_ai_drafts_updated_at
  - update_ai_registry_updated_at
  - update_calendar_event_updated_at
  - update_calendar_sync_settings_updated_at
  - update_collections_updated_at
*/

-- 1. update_ai_drafts_updated_at
CREATE OR REPLACE FUNCTION public.update_ai_drafts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_ai_registry_updated_at
CREATE OR REPLACE FUNCTION public.update_ai_registry_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_calendar_event_updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_calendar_sync_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_sync_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_collections_updated_at
CREATE OR REPLACE FUNCTION public.update_collections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
