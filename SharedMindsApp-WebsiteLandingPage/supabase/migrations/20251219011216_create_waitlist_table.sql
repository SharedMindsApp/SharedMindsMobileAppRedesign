/*
  # Create Waitlist Table

  This migration creates a secure waitlist system for pre-launch email collection
  that supports future beta invitation flows without data loss or migration pain.

  ## New Tables
  
  ### `waitlist`
  - `id` (uuid, primary key) - Unique identifier for each waitlist entry
  - `email` (text, unique, required) - User email address (enforces uniqueness)
  - `status` (text, required) - Current state: 'waitlisted', 'invited', or 'converted'
  - `source` (text, nullable) - Attribution source (e.g., 'landing_page', 'referral')
  - `created_at` (timestamptz) - When user joined waitlist
  - `invited_at` (timestamptz, nullable) - When invite was sent
  - `converted_at` (timestamptz, nullable) - When user created full account
  - `user_id` (uuid, nullable) - Links to auth.users after conversion (foreign key)

  ## Security
  
  - Enable Row Level Security (RLS) on waitlist table
  - NO public access - all operations via Edge Function with service role
  - Prevents email scraping and abuse
  - Only service role can read/write waitlist entries

  ## Future Beta Invite Flow
  
  This schema supports clean beta invites:
  1. Admin marks entry as 'invited', sets invited_at
  2. System sends invite email with magic link
  3. User creates auth account via Supabase Auth
  4. On signup, system updates: status='converted', user_id, converted_at
  5. No duplicate accounts, clean attribution tracking
*/

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'waitlisted',
  source text,
  created_at timestamptz DEFAULT now(),
  invited_at timestamptz,
  converted_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_status CHECK (status IN ('waitlisted', 'invited', 'converted'))
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Create index on status for admin queries
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Enable RLS (locks down all access by default)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- No public policies - all access via Edge Function with service role
-- This prevents email scraping and unauthorized access
-- Edge Functions using service role key will bypass RLS automatically