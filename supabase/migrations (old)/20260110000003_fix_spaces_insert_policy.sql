/*
  # Fix Spaces INSERT Policy for Household/Team Creation
  
  The current INSERT policy checks `is_current_user_owner(owner_id)`, but:
  1. Household/Team spaces use `billing_owner_id` or don't have `owner_id`
  2. The policy needs to allow creation of spaces with context_type = 'household' or 'team'
  
  Solution: Update the policy to allow authenticated users to create spaces
  when they're creating household or team contexts, or when they own the space.
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can create spaces" ON spaces;

-- Create a new policy that handles all cases:
-- 1. Personal spaces (owner_id must match current user)
-- 2. Household/Team spaces (authenticated users can create, context_type must be set)
CREATE POLICY "Users can create spaces"
  ON spaces FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Case 1: Personal spaces - must own it
    (
      context_type = 'personal'
      AND (
        owner_id IS NOT NULL AND is_current_user_owner(owner_id)
        OR billing_owner_id IS NOT NULL AND billing_owner_id = get_current_profile_id()
      )
    )
    OR
    -- Case 2: Household/Team spaces - authenticated users can create
    -- The creator will be added as owner via space_members
    -- Note: context_id can be set after creation (constraint allows temporary values)
    (
      context_type IN ('household', 'team')
      AND name IS NOT NULL
      AND name != ''
    )
    OR
    -- Case 3: Legacy support - if owner_id is set, must own it
    (
      owner_id IS NOT NULL
      AND is_current_user_owner(owner_id)
      AND name IS NOT NULL
      AND name != ''
    )
  );
