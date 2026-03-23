/*
  # Security Hardening Phase 1 - Batch 4: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_ideas_inspiration_updated_at
  - update_individual_profile_updated_at
  - update_life_area_updated_at
  - update_mindmesh_container_updated_at
  - update_mindmesh_visibility_updated_at
*/

-- 1. update_ideas_inspiration_updated_at
CREATE OR REPLACE FUNCTION public.update_ideas_inspiration_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_individual_profile_updated_at
CREATE OR REPLACE FUNCTION public.update_individual_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_life_area_updated_at
CREATE OR REPLACE FUNCTION public.update_life_area_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_mindmesh_container_updated_at
CREATE OR REPLACE FUNCTION public.update_mindmesh_container_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_mindmesh_visibility_updated_at
CREATE OR REPLACE FUNCTION public.update_mindmesh_visibility_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
