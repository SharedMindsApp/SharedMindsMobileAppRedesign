/*
  # Security Hardening Phase 1 - Batch 6: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_personal_skills_context_updated_at
  - update_personal_todos_updated_at
  - update_project_people_updated_at
  - update_project_users_updated_at
  - update_regulation_onboarding_updated_at
*/

-- 1. update_personal_skills_context_updated_at
CREATE OR REPLACE FUNCTION public.update_personal_skills_context_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_personal_todos_updated_at
CREATE OR REPLACE FUNCTION public.update_personal_todos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_project_people_updated_at
CREATE OR REPLACE FUNCTION public.update_project_people_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_project_users_updated_at
CREATE OR REPLACE FUNCTION public.update_project_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_regulation_onboarding_updated_at
CREATE OR REPLACE FUNCTION public.update_regulation_onboarding_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
