/*
  # Security Hardening Phase 1 - Batch 10: search_path for final update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (2):
  - update_values_principles_updated_at
  - update_weekly_planner_updated_at
*/

-- 1. update_values_principles_updated_at
CREATE OR REPLACE FUNCTION public.update_values_principles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_weekly_planner_updated_at
CREATE OR REPLACE FUNCTION public.update_weekly_planner_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
