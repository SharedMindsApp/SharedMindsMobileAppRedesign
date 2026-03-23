/*
  # AI-Powered Project Wizard V2

  1. Overview
    - Adds comprehensive AI assistance to project creation wizard
    - Stores draft structures separate from authoritative data
    - Enables version selection and user controls
    - Maintains graceful fallback when AI disabled

  2. New Fields in master_projects
    - `ai_description_suggestion` - AI-improved description draft
    - `ai_project_intake` - Raw user idea/concept (JSONB)
    - `ai_clarification_answers` - User answers to AI questions (JSONB)
    - `ai_structure_draft` - Full AI-generated structure before creation (JSONB)
    - `ai_structure_selected_version` - Which variant user chose (lean/standard/detailed)
    - `ai_project_understanding` - Final AI context for future use (JSONB)
    - `ai_generation_settings` - User toggles and preferences (JSONB)

  3. Enhanced Templates
    - Add tags, recommended tracks, project type hints, AI prompt presets

  4. New Table: wizard_sessions
    - Track resumable wizard state
    - Store partial progress for recovery

  5. Security
    - All AI fields are optional and nullable
    - RLS policies match existing master_projects policies
*/

-- Add AI wizard fields to master_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_description_suggestion'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_description_suggestion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_project_intake'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_project_intake jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_clarification_answers'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_clarification_answers jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_structure_draft'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_structure_draft jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_structure_selected_version'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_structure_selected_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_project_understanding'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_project_understanding jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_projects' AND column_name = 'ai_generation_settings'
  ) THEN
    ALTER TABLE public.master_projects ADD COLUMN ai_generation_settings jsonb;
  END IF;
END $$;

-- Add metadata to guardrails_track_templates for AI assistance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardrails_track_templates' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.guardrails_track_templates ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardrails_track_templates' AND column_name = 'recommended_tracks'
  ) THEN
    ALTER TABLE public.guardrails_track_templates ADD COLUMN recommended_tracks text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardrails_track_templates' AND column_name = 'suggested_project_type'
  ) THEN
    ALTER TABLE public.guardrails_track_templates ADD COLUMN suggested_project_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardrails_track_templates' AND column_name = 'ai_prompt_presets'
  ) THEN
    ALTER TABLE public.guardrails_track_templates ADD COLUMN ai_prompt_presets text[];
  END IF;
END $$;

-- Create wizard_sessions table for resumable state
CREATE TABLE IF NOT EXISTS public.wizard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 1,
  domain text,
  template_id uuid REFERENCES public.guardrails_track_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Indexes for wizard_sessions
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_user_id ON public.wizard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_expires_at ON public.wizard_sessions(expires_at);

-- RLS for wizard_sessions
ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wizard sessions" ON public.wizard_sessions;
CREATE POLICY "Users can view own wizard sessions"
  ON public.wizard_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wizard sessions" ON public.wizard_sessions;
CREATE POLICY "Users can insert own wizard sessions"
  ON public.wizard_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wizard sessions" ON public.wizard_sessions;
CREATE POLICY "Users can update own wizard sessions"
  ON public.wizard_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wizard sessions" ON public.wizard_sessions;
CREATE POLICY "Users can delete own wizard sessions"
  ON public.wizard_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-update wizard_sessions.updated_at
CREATE OR REPLACE FUNCTION public.update_wizard_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wizard_sessions_timestamp ON public.wizard_sessions;
CREATE TRIGGER update_wizard_sessions_timestamp
  BEFORE UPDATE ON public.wizard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wizard_session_timestamp();

-- Function to cleanup expired wizard sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_wizard_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.wizard_sessions
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some sample AI prompt presets to existing templates
UPDATE public.guardrails_track_templates
SET ai_prompt_presets = ARRAY[
  'Tell me about your book concept, target audience, and genre',
  'What themes or messages do you want to explore?',
  'Do you have an outline or are you discovering as you write?'
]
WHERE (name ILIKE '%writing%' OR name ILIKE '%book%')
AND ai_prompt_presets IS NULL;

UPDATE public.guardrails_track_templates
SET ai_prompt_presets = ARRAY[
  'Describe your startup idea and the problem it solves',
  'Who is your target customer and what is your business model?',
  'Are you building an MVP or a full product?'
]
WHERE (name ILIKE '%startup%' OR name ILIKE '%business%')
AND ai_prompt_presets IS NULL;

UPDATE public.guardrails_track_templates
SET ai_prompt_presets = ARRAY[
  'What do you want to learn and why?',
  'What is your current skill level and learning style?',
  'How much time can you dedicate per week?'
]
WHERE (name ILIKE '%learn%' OR name ILIKE '%course%' OR name ILIKE '%education%')
AND ai_prompt_presets IS NULL;
