/*
  # Security Hardening Phase 1 - Batch 11: search_path for increment_* and set_* functions
  
  Adds explicit immutable search_path to simple helper/trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - increment_distraction_count (simple counter)
  - increment_drift_count (simple counter)
  - set_focus_session_targets (auto-calculate field)
  - set_offshoot_color (auto-set color)
  - set_revoked_at_on_deactivate (auto-set timestamp)
*/

-- 1. increment_distraction_count
CREATE OR REPLACE FUNCTION public.increment_distraction_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.event_type = 'distraction' THEN
    UPDATE focus_sessions
    SET distraction_count = distraction_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. increment_drift_count
CREATE OR REPLACE FUNCTION public.increment_drift_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.event_type = 'drift' THEN
    UPDATE focus_sessions
    SET drift_count = drift_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. set_focus_session_targets
CREATE OR REPLACE FUNCTION public.set_focus_session_targets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.intended_duration_minutes IS NOT NULL THEN
    NEW.target_end_time = NEW.start_time + (NEW.intended_duration_minutes || ' minutes')::interval;
    NEW.goal_minutes = NEW.intended_duration_minutes;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. set_offshoot_color
CREATE OR REPLACE FUNCTION public.set_offshoot_color()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_offshoot = true AND (NEW.color IS NULL OR NEW.color = '#ffffff') THEN
    NEW.color := '#FF7F50';
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. set_revoked_at_on_deactivate
CREATE OR REPLACE FUNCTION public.set_revoked_at_on_deactivate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.revoked_at = now();
  END IF;
  RETURN NEW;
END;
$function$;
