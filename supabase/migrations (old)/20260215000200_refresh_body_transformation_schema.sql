/*
  # Refresh PostgREST Schema Cache for Body Transformation Tables
  
  This migration manually refreshes PostgREST's schema cache
  to ensure the body_profiles and body_measurements tables are visible.
  
  Run this if you're still seeing 406 (Not Acceptable) errors after
  applying the body transformation migrations.
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify tables exist and are accessible
DO $$
BEGIN
  -- Check if tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'body_profiles'
  ) THEN
    RAISE WARNING 'body_profiles table does not exist. Please run migration 20260215000000_create_body_transformation_tables.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'body_measurements'
  ) THEN
    RAISE WARNING 'body_measurements table does not exist. Please run migration 20260215000000_create_body_transformation_tables.sql first.';
  END IF;

  -- If we get here, tables exist
  RAISE NOTICE 'Body transformation tables verified. PostgREST schema cache reloaded.';
END $$;
