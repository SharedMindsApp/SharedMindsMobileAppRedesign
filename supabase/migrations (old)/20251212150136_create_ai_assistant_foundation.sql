/*
  # Create AI Assistant Foundation (Strictly Non-Authoritative)

  ## Summary
  Implements a foundational AI Assistant architecture that provides reasoning,
  drafting, summarization, and insights WITHOUT ever becoming a source of truth
  or mutating authoritative data.

  ## Core Principles
  1. AI is advisory only - can read, suggest, draft, summarize, explain
  2. AI CANNOT write directly to tracks, roadmap items, task flow, people, permissions
  3. All AI output must be user-confirmed
  4. AI responses are drafts, previews, or recommendations
  5. Guardrails remains authoritative
  6. Stateless by default - no long-lived memory
  7. Permission-safe reads only

  ## Changes
  1. Create enums for AI intents, response types, draft types
  2. Create ai_drafts table (non-authoritative outputs)
  3. Create ai_interaction_audit table (explainability)
  4. Add RLS policies for user-owned drafts
  5. Create helper functions for context assembly

  ## What This Enables
  - AI can suggest roadmap items, tasks, summaries
  - Users must explicitly accept/apply AI suggestions
  - Full audit trail of AI interactions
  - Permission-safe context assembly
  - Draft lifecycle management
*/

-- Step 1: Create AI intent enum
DO $$ BEGIN
  CREATE TYPE ai_intent AS ENUM (
    'explain',
    'summarize',
    'draft_roadmap_item',
    'draft_task_list',
    'suggest_next_steps',
    'analyze_deadlines',
    'critique_plan',
    'compare_options',
    'generate_checklist',
    'propose_timeline',
    'explain_relationships',
    'suggest_breakdown',
    'identify_risks',
    'recommend_priorities'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create AI response type enum
DO $$ BEGIN
  CREATE TYPE ai_response_type AS ENUM (
    'explanation',
    'summary',
    'draft',
    'suggestion',
    'critique',
    'comparison',
    'checklist',
    'timeline_proposal',
    'analysis',
    'recommendation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create AI draft type enum
DO $$ BEGIN
  CREATE TYPE ai_draft_type AS ENUM (
    'roadmap_item',
    'child_item',
    'task_list',
    'document',
    'summary',
    'insight',
    'checklist',
    'timeline',
    'breakdown',
    'risk_analysis'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 4: Create AI draft status enum
DO $$ BEGIN
  CREATE TYPE ai_draft_status AS ENUM (
    'generated',
    'edited',
    'accepted',
    'discarded',
    'partially_applied'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create ai_drafts table (non-authoritative outputs)
CREATE TABLE IF NOT EXISTS ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  draft_type ai_draft_type NOT NULL,
  status ai_draft_status DEFAULT 'generated' NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_to_entity_id uuid,
  applied_to_entity_type text,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  discarded_at timestamptz
);

-- Step 6: Create ai_interaction_audit table (explainability)
CREATE TABLE IF NOT EXISTS ai_interaction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  intent ai_intent NOT NULL,
  response_type ai_response_type NOT NULL,
  context_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  entities_included jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_id uuid REFERENCES ai_drafts(id) ON DELETE SET NULL,
  user_prompt text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Step 7: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_drafts_user 
  ON ai_drafts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_project 
  ON ai_drafts(project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_drafts_status 
  ON ai_drafts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_type 
  ON ai_drafts(draft_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_applied 
  ON ai_drafts(applied_to_entity_type, applied_to_entity_id) 
  WHERE applied_to_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_drafts_content 
  ON ai_drafts USING gin(content);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_provenance 
  ON ai_drafts USING gin(provenance_metadata);

CREATE INDEX IF NOT EXISTS idx_ai_audit_user 
  ON ai_interaction_audit(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_project 
  ON ai_interaction_audit(project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_audit_intent 
  ON ai_interaction_audit(intent, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_draft 
  ON ai_interaction_audit(draft_id) 
  WHERE draft_id IS NOT NULL;

-- Step 8: Add updated_at trigger for ai_drafts
CREATE OR REPLACE FUNCTION update_ai_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER ai_drafts_updated_at_trigger
    BEFORE UPDATE ON ai_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_drafts_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 9: Add helpful comments
COMMENT ON TABLE ai_drafts IS 
  'Non-authoritative AI-generated drafts. User must explicitly accept/apply. Never a source of truth.';

COMMENT ON COLUMN ai_drafts.user_id IS 
  'User who requested the AI draft. Owns the draft.';

COMMENT ON COLUMN ai_drafts.project_id IS 
  'Project context for the draft. NULL for cross-project drafts.';

COMMENT ON COLUMN ai_drafts.draft_type IS 
  'Type of draft: roadmap_item, task_list, document, summary, etc.';

COMMENT ON COLUMN ai_drafts.status IS 
  'Lifecycle status: generated, edited, accepted, discarded, partially_applied.';

COMMENT ON COLUMN ai_drafts.content IS 
  'The actual draft content. Structure varies by draft_type.';

COMMENT ON COLUMN ai_drafts.provenance_metadata IS 
  'Source entities used to generate this draft: entity IDs, types, timestamps.';

COMMENT ON COLUMN ai_drafts.context_scope IS 
  'Context scope used: tracks, roadmap items, collaboration data, etc.';

COMMENT ON COLUMN ai_drafts.applied_to_entity_id IS 
  'If accepted, the ID of the authoritative entity created from this draft.';

COMMENT ON COLUMN ai_drafts.applied_to_entity_type IS 
  'If accepted, the type of the authoritative entity created.';

COMMENT ON TABLE ai_interaction_audit IS 
  'Audit log of all AI interactions. Enables explainability, trust, debugging.';

COMMENT ON COLUMN ai_interaction_audit.intent IS 
  'What the user was asking the AI to do.';

COMMENT ON COLUMN ai_interaction_audit.response_type IS 
  'Type of response provided: explanation, draft, suggestion, etc.';

COMMENT ON COLUMN ai_interaction_audit.context_scope IS 
  'High-level scope: which tracks, items, surfaces were included.';

COMMENT ON COLUMN ai_interaction_audit.entities_included IS 
  'Detailed list of entity IDs included in context.';

-- Step 10: Add RLS policies
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own drafts
CREATE POLICY "Users can view their own AI drafts"
  ON ai_drafts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view drafts for projects they have access to
CREATE POLICY "Users can view AI drafts for accessible projects"
  ON ai_drafts
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM master_projects mp
        WHERE mp.id = ai_drafts.project_id
        AND mp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.master_project_id = ai_drafts.project_id
        AND pu.user_id = auth.uid()
      )
    )
  );

-- Users can create their own drafts
CREATE POLICY "Users can create their own AI drafts"
  ON ai_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own drafts (edit, accept, discard)
CREATE POLICY "Users can update their own AI drafts"
  ON ai_drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own AI drafts"
  ON ai_drafts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view their own audit log
CREATE POLICY "Users can view their own AI interaction audit"
  ON ai_interaction_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view audit for accessible projects
CREATE POLICY "Users can view AI audit for accessible projects"
  ON ai_interaction_audit
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM master_projects mp
        WHERE mp.id = ai_interaction_audit.project_id
        AND mp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.master_project_id = ai_interaction_audit.project_id
        AND pu.user_id = auth.uid()
      )
    )
  );

-- Only system can insert audit records (application logic only)
CREATE POLICY "System can create AI interaction audit"
  ON ai_interaction_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No updates to audit (immutable log)
CREATE POLICY "No updates to AI interaction audit"
  ON ai_interaction_audit
  FOR UPDATE
  TO authenticated
  USING (false);

-- No deletes from audit (permanent record)
CREATE POLICY "No deletes from AI interaction audit"
  ON ai_interaction_audit
  FOR DELETE
  TO authenticated
  USING (false);

-- Step 11: Create helper function to get user's recent drafts
CREATE OR REPLACE FUNCTION get_user_recent_ai_drafts(
  input_user_id uuid,
  input_project_id uuid DEFAULT NULL,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  draft_type ai_draft_type,
  status ai_draft_status,
  title text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ad.id,
    ad.draft_type,
    ad.status,
    ad.title,
    ad.created_at,
    ad.updated_at
  FROM ai_drafts ad
  WHERE ad.user_id = input_user_id
    AND (input_project_id IS NULL OR ad.project_id = input_project_id)
  ORDER BY ad.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 12: Create helper function to get AI usage stats
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  input_user_id uuid,
  input_project_id uuid DEFAULT NULL,
  days_back int DEFAULT 30
)
RETURNS TABLE (
  intent ai_intent,
  interaction_count bigint,
  draft_count bigint,
  accepted_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aia.intent,
    COUNT(aia.id)::bigint as interaction_count,
    COUNT(aia.draft_id)::bigint as draft_count,
    COUNT(ad.id) FILTER (WHERE ad.status = 'accepted')::bigint as accepted_count
  FROM ai_interaction_audit aia
  LEFT JOIN ai_drafts ad ON ad.id = aia.draft_id
  WHERE aia.user_id = input_user_id
    AND aia.created_at >= (now() - (days_back || ' days')::interval)
    AND (input_project_id IS NULL OR aia.project_id = input_project_id)
  GROUP BY aia.intent
  ORDER BY COUNT(aia.id) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 13: Create helper function to get project AI activity
CREATE OR REPLACE FUNCTION get_project_ai_activity(
  input_project_id uuid,
  days_back int DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  interaction_count bigint,
  draft_count bigint,
  accepted_count bigint,
  most_common_intent ai_intent
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Step 14: Add comments on helper functions
COMMENT ON FUNCTION get_user_recent_ai_drafts(uuid, uuid, int) IS 
  'Get user''s recent AI drafts, optionally filtered by project.';

COMMENT ON FUNCTION get_ai_usage_stats(uuid, uuid, int) IS 
  'Get AI usage statistics for a user: interaction counts, draft counts, acceptance rates.';

COMMENT ON FUNCTION get_project_ai_activity(uuid, int) IS 
  'Get AI activity summary for a project: which users are using AI, what for, acceptance rates.';
