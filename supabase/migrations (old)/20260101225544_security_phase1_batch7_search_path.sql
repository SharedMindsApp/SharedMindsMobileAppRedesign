/*
  # Security Hardening Phase 1 - Batch 7: search_path for update_*_updated_at functions
  
  Adds explicit immutable search_path to simple timestamp trigger functions.
  
  NO LOGIC CHANGES - purely additive security hardening.
  
  Functions updated (5):
  - update_regulation_playbooks_updated_at
  - update_regulation_state_updated_at
  - update_return_contexts_updated_at
  - update_roadmap_items_updated_at
  - update_skill_evidence_updated_at
*/

-- 1. update_regulation_playbooks_updated_at
CREATE OR REPLACE FUNCTION public.update_regulation_playbooks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_regulation_state_updated_at
CREATE OR REPLACE FUNCTION public.update_regulation_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_return_contexts_updated_at
CREATE OR REPLACE FUNCTION public.update_return_contexts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_roadmap_items_updated_at
CREATE OR REPLACE FUNCTION public.update_roadmap_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_skill_evidence_updated_at
CREATE OR REPLACE FUNCTION public.update_skill_evidence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
