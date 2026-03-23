/*
  # Phase 4A Part 1: Fix SECURITY DEFINER Views

  ## Purpose
  
  Remove SECURITY DEFINER behavior from 4 views flagged by Supabase security scanner.
  These views should execute with the privileges of the calling user (security_invoker = true).

  ## Target Views (4)
  
  1. **side_projects_stats** - Aggregates side project statistics
  2. **habit_consistency_view** - Calculates habit completion metrics
  3. **active_skills_view** - Combines user skills with context data
  4. **guardrails_offshoots_unified** - Unions offshoot items from multiple sources

  ## Changes
  
  For each view:
  - Set `security_invoker = true` to execute with caller's privileges
  - Preserve exact view definition (no query changes)
  - Maintain all existing grants/privileges

  ## PostgreSQL Version
  
  - Running: PostgreSQL 17.6
  - Feature: security_invoker supported (available since PostgreSQL 15)

  ## Security Impact
  
  - Views will now respect RLS policies of the calling user
  - No behavior change (views already rely on underlying table RLS)
  - Fixes Supabase security scanner warnings
  - Aligns with security best practices

  ## Migration Type
  
  - ✅ Safe mechanical fix
  - ✅ No query logic changes
  - ✅ No data changes
  - ✅ Zero functional impact (views already secured by table RLS)
*/

-- ============================================================================
-- 1. side_projects_stats
-- ============================================================================

-- Set security_invoker to execute with caller's privileges
ALTER VIEW public.side_projects_stats SET (security_invoker = true);

COMMENT ON VIEW public.side_projects_stats IS 
'Aggregates statistics for side projects including roadmap items and nodes count. Executes with security_invoker for proper RLS enforcement.';

-- ============================================================================
-- 2. habit_consistency_view
-- ============================================================================

-- Set security_invoker to execute with caller's privileges
ALTER VIEW public.habit_consistency_view SET (security_invoker = true);

COMMENT ON VIEW public.habit_consistency_view IS 
'Calculates habit consistency metrics including completion days over various time periods. Executes with security_invoker for proper RLS enforcement.';

-- ============================================================================
-- 3. active_skills_view
-- ============================================================================

-- Set security_invoker to execute with caller's privileges
ALTER VIEW public.active_skills_view SET (security_invoker = true);

COMMENT ON VIEW public.active_skills_view IS 
'Combines user skills with personal context and evidence counts. Executes with security_invoker for proper RLS enforcement.';

-- ============================================================================
-- 4. guardrails_offshoots_unified
-- ============================================================================

-- Set security_invoker to execute with caller's privileges
ALTER VIEW public.guardrails_offshoots_unified SET (security_invoker = true);

COMMENT ON VIEW public.guardrails_offshoots_unified IS 
'Unified view of offshoot items from guardrails_nodes, roadmap_items, and side_ideas. Executes with security_invoker for proper RLS enforcement.';