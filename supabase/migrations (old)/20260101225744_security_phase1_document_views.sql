/*
  # Security Hardening Phase 1: Document Views
  
  Adds SQL comments to all public views explaining their purpose and security model.
  
  NO BEHAVIOUR CHANGES - documentation only.
  
  Views documented (4):
  - habit_consistency_view
  - active_skills_view
  - side_projects_stats
  - guardrails_offshoots_unified
*/

-- 1. habit_consistency_view
COMMENT ON VIEW public.habit_consistency_view IS
'Read-only aggregate view for habit completion trends. Provides completed_days_last_7 and completed_days_last_30 without exposing individual completion rows. Used for non-streak trend visualization. RLS enforced via base table (personal_habits).';

-- 2. active_skills_view
COMMENT ON VIEW public.active_skills_view IS
'Read-only aggregate view for active user skills. Filters skills where is_active = true and provides denormalized access for dashboard/overview displays. RLS enforced via base table (user_skills).';

-- 3. side_projects_stats
COMMENT ON VIEW public.side_projects_stats IS
'Read-only aggregate view for side project statistics. Provides summary metrics (task counts, completion percentages) without exposing individual task details. RLS enforced via base table (side_projects).';

-- 4. guardrails_offshoots_unified
COMMENT ON VIEW public.guardrails_offshoots_unified IS
'Read-only unified view combining side_projects and offshoot_ideas for consolidated offshoot tracking. Provides unified interface for both types of offshoots. RLS enforced via base tables (side_projects, offshoot_ideas).';
