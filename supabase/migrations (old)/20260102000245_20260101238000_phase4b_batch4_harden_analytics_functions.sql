/*
  # Phase 4B Batch 4: Harden 10 Analytics Functions - Set search_path

  ## Purpose
  
  Add `SET search_path = public` to 10 analytics and collaboration-related functions to prevent 
  search_path injection attacks. This is a security hardening measure that protects against 
  malicious schema manipulation.

  ## Target Functions (10)
  
  ### Collaboration Analytics Functions (8)
  1. **get_entity_collaborators(text, uuid, integer)** - Returns collaborators for an entity (STABLE)
  2. **get_user_collaboration_footprint(uuid, uuid, integer)** - User activity footprint (STABLE)
  3. **get_project_collaboration_heatmap(uuid, integer)** - Project activity heatmap (STABLE)
  4. **get_active_users_for_surface(collaboration_surface_type, uuid, integer)** - Active users (STABLE)
  5. **get_dormant_entities_with_collaborators(uuid, integer, integer)** - Dormant entities (STABLE)
  6. **get_cross_project_entity_activity(text, uuid)** - Cross-project activity (STABLE)
  7. **get_most_collaborated_tracks(uuid, integer, integer)** - Most collaborated tracks (STABLE)
  8. **get_participation_intensity(text, uuid, uuid)** - User participation intensity (STABLE)
  
  ### AI Analytics Functions (1)
  9. **get_project_ai_activity(uuid, integer)** - AI interaction analytics (STABLE)
  
  ### Trigger Functions (1)
  10. **update_table_counts()** - Updates table row/column counts (VOLATILE, TRIGGER)

  ## Changes Applied
  
  For each function:
  - Added `SET search_path = public` to function configuration
  - Preserved SECURITY INVOKER status (all 10 functions)
  - Preserved volatility (9 STABLE, 1 VOLATILE)
  - Preserved language (plpgsql)
  - Preserved all parameters, return types, and function body

  ## Security Impact
  
  - Protects against search_path injection attacks
  - All functions maintain SECURITY INVOKER (no privilege escalation)
  - No functional changes to any function
  - All functions maintain existing behavior
  - Zero impact on application logic

  ## Migration Type
  
  - ✅ Safe mechanical hardening
  - ✅ No logic changes
  - ✅ No behavior changes
  - ✅ Standard security best practice
  - ✅ All SECURITY INVOKER functions (no DEFINER)
*/

-- ============================================================================
-- COLLABORATION ANALYTICS FUNCTIONS
-- ============================================================================

-- 1. get_entity_collaborators - Returns collaborators for an entity
CREATE OR REPLACE FUNCTION public.get_entity_collaborators(input_entity_type text, input_entity_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE(user_id uuid, activity_count bigint, last_activity_at timestamp with time zone, activity_types text[])
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.user_id,
COUNT(*)::bigint as activity_count,
MAX(ca.created_at) as last_activity_at,
array_agg(DISTINCT ca.activity_type::text ORDER BY ca.activity_type::text) as activity_types
FROM collaboration_activity ca
WHERE ca.entity_type = input_entity_type
AND ca.entity_id = input_entity_id
GROUP BY ca.user_id
ORDER BY MAX(ca.created_at) DESC
LIMIT limit_count;
END;
$function$;

-- 2. get_user_collaboration_footprint - User activity footprint
CREATE OR REPLACE FUNCTION public.get_user_collaboration_footprint(input_user_id uuid, input_project_id uuid DEFAULT NULL::uuid, days_back integer DEFAULT 30)
RETURNS TABLE(surface_type collaboration_surface_type, entity_type text, entity_id uuid, activity_count bigint, last_activity_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.surface_type,
ca.entity_type,
ca.entity_id,
COUNT(*)::bigint as activity_count,
MAX(ca.created_at) as last_activity_at
FROM collaboration_activity ca
WHERE ca.user_id = input_user_id
AND ca.created_at >= (now() - (days_back || ' days')::interval)
AND (input_project_id IS NULL OR ca.project_id = input_project_id)
GROUP BY ca.surface_type, ca.entity_type, ca.entity_id
ORDER BY MAX(ca.created_at) DESC;
END;
$function$;

-- 3. get_project_collaboration_heatmap - Project activity heatmap
CREATE OR REPLACE FUNCTION public.get_project_collaboration_heatmap(input_project_id uuid, days_back integer DEFAULT 30)
RETURNS TABLE(surface_type collaboration_surface_type, activity_count bigint, unique_users bigint, most_recent_activity timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.surface_type,
COUNT(*)::bigint as activity_count,
COUNT(DISTINCT ca.user_id)::bigint as unique_users,
MAX(ca.created_at) as most_recent_activity
FROM collaboration_activity ca
WHERE ca.project_id = input_project_id
AND ca.created_at >= (now() - (days_back || ' days')::interval)
GROUP BY ca.surface_type
ORDER BY COUNT(*) DESC;
END;
$function$;

-- 4. get_active_users_for_surface - Active users for a surface type
CREATE OR REPLACE FUNCTION public.get_active_users_for_surface(input_surface_type collaboration_surface_type, input_entity_id uuid DEFAULT NULL::uuid, days_back integer DEFAULT 7)
RETURNS TABLE(user_id uuid, activity_count bigint, last_activity_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.user_id,
COUNT(*)::bigint as activity_count,
MAX(ca.created_at) as last_activity_at
FROM collaboration_activity ca
WHERE ca.surface_type = input_surface_type
AND (input_entity_id IS NULL OR ca.entity_id = input_entity_id)
AND ca.created_at >= (now() - (days_back || ' days')::interval)
GROUP BY ca.user_id
ORDER BY MAX(ca.created_at) DESC;
END;
$function$;

-- 5. get_dormant_entities_with_collaborators - Dormant entities with collaborators
CREATE OR REPLACE FUNCTION public.get_dormant_entities_with_collaborators(input_project_id uuid, dormant_days integer DEFAULT 30, min_collaborators integer DEFAULT 2)
RETURNS TABLE(entity_type text, entity_id uuid, last_activity_at timestamp with time zone, collaborator_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
WITH entity_stats AS (
SELECT 
ca.entity_type,
ca.entity_id,
MAX(ca.created_at) as last_activity_at,
COUNT(DISTINCT ca.user_id)::bigint as collaborator_count
FROM collaboration_activity ca
WHERE ca.project_id = input_project_id
GROUP BY ca.entity_type, ca.entity_id
)
SELECT 
es.entity_type,
es.entity_id,
es.last_activity_at,
es.collaborator_count
FROM entity_stats es
WHERE es.last_activity_at < (now() - (dormant_days || ' days')::interval)
AND es.collaborator_count >= min_collaborators
ORDER BY es.last_activity_at ASC;
END;
$function$;

-- 6. get_cross_project_entity_activity - Cross-project entity activity
CREATE OR REPLACE FUNCTION public.get_cross_project_entity_activity(input_entity_type text, input_entity_id uuid)
RETURNS TABLE(project_id uuid, user_count bigint, activity_count bigint, last_activity_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.project_id,
COUNT(DISTINCT ca.user_id)::bigint as user_count,
COUNT(*)::bigint as activity_count,
MAX(ca.created_at) as last_activity_at
FROM collaboration_activity ca
WHERE ca.entity_type = input_entity_type
AND ca.entity_id = input_entity_id
AND ca.project_id IS NOT NULL
GROUP BY ca.project_id
ORDER BY MAX(ca.created_at) DESC;
END;
$function$;

-- 7. get_most_collaborated_tracks - Most collaborated tracks
CREATE OR REPLACE FUNCTION public.get_most_collaborated_tracks(input_project_id uuid DEFAULT NULL::uuid, limit_count integer DEFAULT 10, days_back integer DEFAULT 30)
RETURNS TABLE(track_id uuid, collaborator_count bigint, activity_count bigint, last_activity_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
ca.entity_id as track_id,
COUNT(DISTINCT ca.user_id)::bigint as collaborator_count,
COUNT(*)::bigint as activity_count,
MAX(ca.created_at) as last_activity_at
FROM collaboration_activity ca
WHERE ca.entity_type = 'track'
AND ca.created_at >= (now() - (days_back || ' days')::interval)
AND (input_project_id IS NULL OR ca.project_id = input_project_id)
GROUP BY ca.entity_id
ORDER BY COUNT(DISTINCT ca.user_id) DESC, MAX(ca.created_at) DESC
LIMIT limit_count;
END;
$function$;

-- 8. get_participation_intensity - User participation intensity
CREATE OR REPLACE FUNCTION public.get_participation_intensity(input_entity_type text, input_entity_id uuid, input_user_id uuid)
RETURNS TABLE(total_activities bigint, first_activity_at timestamp with time zone, last_activity_at timestamp with time zone, days_active bigint, activity_types text[])
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT 
COUNT(*)::bigint as total_activities,
MIN(ca.created_at) as first_activity_at,
MAX(ca.created_at) as last_activity_at,
COUNT(DISTINCT DATE(ca.created_at))::bigint as days_active,
array_agg(DISTINCT ca.activity_type::text ORDER BY ca.activity_type::text) as activity_types
FROM collaboration_activity ca
WHERE ca.entity_type = input_entity_type
AND ca.entity_id = input_entity_id
AND ca.user_id = input_user_id;
END;
$function$;

-- ============================================================================
-- AI ANALYTICS FUNCTIONS
-- ============================================================================

-- 9. get_project_ai_activity - AI interaction analytics
CREATE OR REPLACE FUNCTION public.get_project_ai_activity(input_project_id uuid, days_back integer DEFAULT 30)
RETURNS TABLE(user_id uuid, interaction_count bigint, draft_count bigint, accepted_count bigint, most_common_intent ai_intent)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
WITH intent_counts AS (
SELECT 
aia.user_id,
aia.intent,
COUNT(*) as cnt
FROM ai_interaction_audit aia
WHERE aia.project_id = input_project_id
AND aia.created_at >= (now() - (days_back || ' days')::interval)
GROUP BY aia.user_id, aia.intent
),
most_common AS (
SELECT DISTINCT ON (user_id)
user_id,
intent as most_common_intent
FROM intent_counts
ORDER BY user_id, cnt DESC
)
SELECT 
aia.user_id,
COUNT(aia.id)::bigint as interaction_count,
COUNT(aia.draft_id)::bigint as draft_count,
COUNT(ad.id) FILTER (WHERE ad.status = 'accepted')::bigint as accepted_count,
mc.most_common_intent
FROM ai_interaction_audit aia
LEFT JOIN ai_drafts ad ON ad.id = aia.draft_id
LEFT JOIN most_common mc ON mc.user_id = aia.user_id
WHERE aia.project_id = input_project_id
AND aia.created_at >= (now() - (days_back || ' days')::interval)
GROUP BY aia.user_id, mc.most_common_intent
ORDER BY COUNT(aia.id) DESC;
END;
$function$;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- 10. update_table_counts - Updates table row/column counts
CREATE OR REPLACE FUNCTION public.update_table_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
IF TG_TABLE_NAME = 'table_rows' THEN
UPDATE tables
SET row_count = (SELECT COUNT(*) FROM table_rows WHERE table_id = COALESCE(NEW.table_id, OLD.table_id)),
updated_at = now()
WHERE id = COALESCE(NEW.table_id, OLD.table_id);
ELSIF TG_TABLE_NAME = 'table_columns' THEN
UPDATE tables
SET column_count = (SELECT COUNT(*) FROM table_columns WHERE table_id = COALESCE(NEW.table_id, OLD.table_id)),
updated_at = now()
WHERE id = COALESCE(NEW.table_id, OLD.table_id);
END IF;
RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================================
-- VERIFICATION CHECKLIST (for audit purposes)
-- ============================================================================

/*
  VERIFICATION COMPLETED:
  
  Function 1: get_entity_collaborators(text, uuid, integer)
    ✓ Signature: UNCHANGED (input_entity_type text, input_entity_id uuid, limit_count integer)
    ✓ Return Type: UNCHANGED (TABLE with 4 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical collaboration query)
    ✓ Only Change: Added SET search_path = public
  
  Function 2: get_user_collaboration_footprint(uuid, uuid, integer)
    ✓ Signature: UNCHANGED (input_user_id uuid, input_project_id uuid, days_back integer)
    ✓ Return Type: UNCHANGED (TABLE with 5 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical footprint query)
    ✓ Only Change: Added SET search_path = public
  
  Function 3: get_project_collaboration_heatmap(uuid, integer)
    ✓ Signature: UNCHANGED (input_project_id uuid, days_back integer)
    ✓ Return Type: UNCHANGED (TABLE with 4 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical heatmap query)
    ✓ Only Change: Added SET search_path = public
  
  Function 4: get_active_users_for_surface(collaboration_surface_type, uuid, integer)
    ✓ Signature: UNCHANGED (input_surface_type, input_entity_id uuid, days_back integer)
    ✓ Return Type: UNCHANGED (TABLE with 3 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical active users query)
    ✓ Only Change: Added SET search_path = public
  
  Function 5: get_dormant_entities_with_collaborators(uuid, integer, integer)
    ✓ Signature: UNCHANGED (input_project_id uuid, dormant_days integer, min_collaborators integer)
    ✓ Return Type: UNCHANGED (TABLE with 4 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical CTE with dormant entity logic)
    ✓ Only Change: Added SET search_path = public
  
  Function 6: get_cross_project_entity_activity(text, uuid)
    ✓ Signature: UNCHANGED (input_entity_type text, input_entity_id uuid)
    ✓ Return Type: UNCHANGED (TABLE with 4 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical cross-project query)
    ✓ Only Change: Added SET search_path = public
  
  Function 7: get_most_collaborated_tracks(uuid, integer, integer)
    ✓ Signature: UNCHANGED (input_project_id uuid, limit_count integer, days_back integer)
    ✓ Return Type: UNCHANGED (TABLE with 4 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical track collaboration query)
    ✓ Only Change: Added SET search_path = public
  
  Function 8: get_participation_intensity(text, uuid, uuid)
    ✓ Signature: UNCHANGED (input_entity_type text, input_entity_id uuid, input_user_id uuid)
    ✓ Return Type: UNCHANGED (TABLE with 5 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical intensity query)
    ✓ Only Change: Added SET search_path = public
  
  Function 9: get_project_ai_activity(uuid, integer)
    ✓ Signature: UNCHANGED (input_project_id uuid, days_back integer)
    ✓ Return Type: UNCHANGED (TABLE with 5 columns)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical AI activity query with CTEs)
    ✓ Only Change: Added SET search_path = public
  
  Function 10: update_table_counts()
    ✓ Signature: UNCHANGED (no parameters)
    ✓ Return Type: UNCHANGED (trigger)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical trigger logic)
    ✓ Only Change: Added SET search_path = public
  
  GLOBAL VERIFICATION:
    ✓ No RLS policies changed
    ✓ No tables modified
    ✓ No views modified
    ✓ No triggers changed
    ✓ No enums modified
    ✓ Only the 10 specified functions were modified
    ✓ All modifications were limited to adding SET search_path = public
    ✓ Zero logic changes across all functions
    ✓ Zero refactoring performed
    ✓ All functions remain SECURITY INVOKER
    ✓ Migration is mechanical and safe
*/