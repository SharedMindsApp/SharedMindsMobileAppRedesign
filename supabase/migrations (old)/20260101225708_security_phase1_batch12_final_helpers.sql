/*
  # Security Hardening Phase 1 - Batch 12: search_path for final helper functions
  
  Adds explicit immutable search_path to simple helper/cleanup functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (4):
  - set_roadmap_item_master_project (auto-populate field)
  - set_subtrack_ordering_index (auto-calculate ordering)
  - cleanup_expired_signals (SECURITY DEFINER cleanup - preserved)
  - cleanup_expired_wizard_sessions (SECURITY DEFINER cleanup - preserved)
*/

-- 1. set_roadmap_item_master_project
CREATE OR REPLACE FUNCTION public.set_roadmap_item_master_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Auto-populate master_project_id from section
  IF NEW.master_project_id IS NULL THEN
    SELECT master_project_id INTO NEW.master_project_id
    FROM roadmap_sections
    WHERE id = NEW.section_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. set_subtrack_ordering_index
CREATE OR REPLACE FUNCTION public.set_subtrack_ordering_index()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.ordering_index IS NULL OR NEW.ordering_index = 0 THEN
    SELECT COALESCE(MAX(ordering_index), 0) + 1
    INTO NEW.ordering_index
    FROM guardrails_subtracks
    WHERE track_id = NEW.track_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. cleanup_expired_signals (SECURITY DEFINER preserved - cleanup only)
CREATE OR REPLACE FUNCTION public.cleanup_expired_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM regulation_active_signals
  WHERE expires_at < now() OR dismissed_at IS NOT NULL;
END;
$function$;

-- 4. cleanup_expired_wizard_sessions (SECURITY DEFINER preserved - cleanup only)
CREATE OR REPLACE FUNCTION public.cleanup_expired_wizard_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.wizard_sessions
  WHERE expires_at < now();
END;
$function$;
