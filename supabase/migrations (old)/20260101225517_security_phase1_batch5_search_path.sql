/*
  # Security Hardening Phase 1 - Batch 5: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_mindmesh_workspace_updated_at
  - update_mobile_updated_at
  - update_monthly_planner_updated_at
  - update_offshoot_ideas_updated_at
  - update_personal_habits_updated_at
*/

-- 1. update_mindmesh_workspace_updated_at
CREATE OR REPLACE FUNCTION public.update_mindmesh_workspace_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_mobile_updated_at
CREATE OR REPLACE FUNCTION public.update_mobile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_monthly_planner_updated_at
CREATE OR REPLACE FUNCTION public.update_monthly_planner_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_offshoot_ideas_updated_at
CREATE OR REPLACE FUNCTION public.update_offshoot_ideas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_personal_habits_updated_at
CREATE OR REPLACE FUNCTION public.update_personal_habits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
