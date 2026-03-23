/*
  # Add Guardrails Wizard Completion Tracking

  1. Changes to `profiles` Table
    - Add `has_completed_guardrails_wizard` (boolean, default false) - Tracks if user completed the wizard
    - Add `guardrails_wizard_skipped` (boolean, default false) - Tracks if user skipped the wizard
    - Add `guardrails_wizard_completed_at` (timestamptz, nullable) - When wizard was completed

  2. Purpose
    - Enable "run once" behavior for the project creation wizard
    - Allow users to skip the wizard
    - Track completion for analytics
    - Prevent re-showing wizard after completion

  3. Notes
    - Users who skip can still access wizard via dashboard button
    - Once completed, wizard should not show automatically
    - Fields default to false for backward compatibility
*/

-- Add wizard tracking fields to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'has_completed_guardrails_wizard'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_completed_guardrails_wizard boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'guardrails_wizard_skipped'
  ) THEN
    ALTER TABLE profiles ADD COLUMN guardrails_wizard_skipped boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'guardrails_wizard_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN guardrails_wizard_completed_at timestamptz;
  END IF;
END $$;

-- Create index for wizard completion queries
CREATE INDEX IF NOT EXISTS idx_profiles_guardrails_wizard 
  ON profiles(has_completed_guardrails_wizard, guardrails_wizard_skipped);
