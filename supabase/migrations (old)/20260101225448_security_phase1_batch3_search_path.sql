/*
  # Security Hardening Phase 1 - Batch 3: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_fridge_updated_at
  - update_global_people_updated_at
  - update_governance_rules_updated_at
  - update_guardrails_tracks_updated_at
  - update_hobbies_interests_updated_at
*/

-- 1. update_fridge_updated_at
CREATE OR REPLACE FUNCTION public.update_fridge_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_global_people_updated_at
CREATE OR REPLACE FUNCTION public.update_global_people_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_governance_rules_updated_at
CREATE OR REPLACE FUNCTION public.update_governance_rules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_guardrails_tracks_updated_at
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

-- 5. update_hobbies_interests_updated_at
CREATE OR REPLACE FUNCTION public.update_hobbies_interests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
