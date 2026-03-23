/*
  # Unify Skills Development with Guardrails Skills Matrix

  1. Changes to Existing Tables
    - Enhance `user_skills` with description, category, evidence, and updated_at
    - Remove `personal_dev_skills` (duplicate system)

  2. New Tables
    - `personal_skills_context`: Personal metadata for skills (intentions, reflections, status)
    - Links to the canonical `user_skills` table

  3. Architecture
    - `user_skills` = Single source of truth (structural, Guardrails view)
    - `personal_skills_context` = Personal lens (growth-focused, Personal Development view)
    - No data duplication
    - Skills remain universal, context is personal

  4. Security
    - Enable RLS on new table
    - Personal context is private by default with opt-in sharing
*/

-- Enhance user_skills table with additional fields
ALTER TABLE user_skills
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('cognitive', 'emotional', 'social', 'physical', 'technical', 'creative')),
  ADD COLUMN IF NOT EXISTS evidence text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing rows to have updated_at
UPDATE user_skills SET updated_at = created_at WHERE updated_at IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_skills_updated_at_trigger ON user_skills;
CREATE TRIGGER user_skills_updated_at_trigger
  BEFORE UPDATE ON user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_user_skills_updated_at();

-- Create personal_skills_context table for personal metadata
CREATE TABLE IF NOT EXISTS personal_skills_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,

  -- Personal Development fields
  is_active boolean DEFAULT false, -- "Currently Developing"
  personal_intention text, -- Why this matters to me
  time_horizon text, -- Optional time frame (no pressure)

  -- Reflections (non-judgmental, growth-focused)
  reflection_notes text,
  confidence_feeling text CHECK (confidence_feeling IN ('more_confident', 'about_the_same', 'less_confident', 'harder_than_expected')),

  -- Linked personal data (references, not copies)
  linked_goals uuid[], -- References to personal_dev_goals
  linked_journal_entries uuid[], -- References to personal_dev_ideas (journal)
  linked_habits uuid[], -- References to habits
  linked_projects uuid[], -- References to master_projects
  linked_resources text[], -- URLs or resource names

  -- Privacy and sharing
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one context per user per skill
  UNIQUE(user_id, skill_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_personal_skills_context_user_id ON personal_skills_context(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_skills_context_skill_id ON personal_skills_context(skill_id);
CREATE INDEX IF NOT EXISTS idx_personal_skills_context_active ON personal_skills_context(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE personal_skills_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_skills_context
CREATE POLICY "Users can view their own skill context or shared context"
  ON personal_skills_context FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_skills_context.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can create their own skill context"
  ON personal_skills_context FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill context"
  ON personal_skills_context FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill context"
  ON personal_skills_context FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Drop the duplicate personal_dev_skills table
DROP TABLE IF EXISTS personal_dev_skills CASCADE;

-- Create trigger to auto-update personal_skills_context updated_at
CREATE OR REPLACE FUNCTION update_personal_skills_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS personal_skills_context_updated_at_trigger ON personal_skills_context;
CREATE TRIGGER personal_skills_context_updated_at_trigger
  BEFORE UPDATE ON personal_skills_context
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_skills_context_updated_at();
