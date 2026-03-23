/*
  # Security Hardening Phase 1 - Batch 8: search_path for remaining update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (7):
  - update_skill_insights_updated_at
  - update_subtrack_template_updated_at
  - update_subtrack_updated_at
  - update_table_cells_updated_at
  - update_tables_updated_at
  - update_taskflow_tasks_updated_at
  - update_track_instance_updated_at
*/

-- 1. update_skill_insights_updated_at
CREATE OR REPLACE FUNCTION public.update_skill_insights_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_subtrack_template_updated_at
CREATE OR REPLACE FUNCTION public.update_subtrack_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_subtrack_updated_at
CREATE OR REPLACE FUNCTION public.update_subtrack_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_table_cells_updated_at
CREATE OR REPLACE FUNCTION public.update_table_cells_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_tables_updated_at
CREATE OR REPLACE FUNCTION public.update_tables_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. update_taskflow_tasks_updated_at
CREATE OR REPLACE FUNCTION public.update_taskflow_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 7. update_track_instance_updated_at
CREATE OR REPLACE FUNCTION public.update_track_instance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
