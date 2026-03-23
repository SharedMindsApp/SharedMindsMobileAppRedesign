/**
 * Space Creation Service
 * 
 * Functions for creating Households and Teams
 */

import { supabase } from './supabase';
import type { SpaceContextType } from './spaceTypes';

export interface CreateSpaceInput {
  name: string;
  description?: string;
  type: 'household' | 'team';
  invites?: Array<{
    email: string;
    role: 'admin' | 'member';
  }>;
}

export interface CreateSpaceResult {
  spaceId: string;
  spaceName: string;
  type: SpaceContextType;
}

/**
 * Create a new Household
 */
export async function createHousehold(input: {
  name: string;
  description?: string;
  invites?: Array<{ email: string; role: 'admin' | 'member' }>;
}): Promise<CreateSpaceResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  // Check subscription limits (if applicable)
  // TODO: Add subscription limit check here

  // Create household record first (if using households table)
  // For now, we'll create a space with context_type = 'household'
  // and context_id will reference the household if we create one
  
  // For households, we don't create a separate household record
  // The space itself represents the household
  // We'll use a placeholder UUID for context_id that matches the space_id
  // (This will be updated after space creation if needed)
  const tempContextId = crypto.randomUUID();
  
  // Create space with household context
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({
      name: input.name,
      description: input.description || null,
      space_type: 'shared', // Keep for backward compatibility
      context_type: 'household',
      context_id: tempContextId, // Temporary ID, will be updated to space.id after creation
      billing_owner_id: profile.id,
    })
    .select()
    .single();

  if (spaceError) throw spaceError;
  if (!space) throw new Error('Failed to create space');

  // Update context_id to match space.id (household spaces use space.id as context_id)
  const { error: updateError } = await supabase
    .from('spaces')
    .update({ context_id: space.id })
    .eq('id', space.id);

  if (updateError) throw updateError;

  if (spaceError) throw spaceError;
  if (!space) throw new Error('Failed to create space');

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: space.id,
      user_id: profile.id,
      email: user.email || '',
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  if (memberError) throw memberError;

  // Handle invites (optional)
  if (input.invites && input.invites.length > 0) {
    // Send invites via edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-space-member`;

    // Send invites in parallel
    const invitePromises = input.invites.map(async (invite) => {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spaceId: space.id,
            email: invite.email,
            role: invite.role,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to invite ${invite.email}:`, error);
          return { email: invite.email, success: false, error: error.error };
        }

        return { email: invite.email, success: true };
      } catch (err) {
        console.error(`Error inviting ${invite.email}:`, err);
        return { email: invite.email, success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    await Promise.all(invitePromises);
  }

  return {
    spaceId: space.id,
    spaceName: space.name,
    type: 'household',
  };
}

/**
 * Create a new Team
 */
export async function createTeam(input: {
  name: string;
  description?: string;
  invites?: Array<{ email: string; role: 'admin' | 'member' }>;
}): Promise<CreateSpaceResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  // Create team record + ownership atomically via RPC
  const { data: teamId, error: teamError } = await supabase.rpc('create_team', {
    p_name: input.name,
    p_description: input.description || null,
  });

  if (teamError) throw teamError;
  if (!teamId) throw new Error('Failed to create team');

  // Create space with team context
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({
      name: input.name,
      description: input.description || null,
      space_type: 'shared', // Keep for backward compatibility
      context_type: 'team',
      context_id: teamId,
    })
    .select()
    .single();

  if (spaceError) throw spaceError;
  if (!space) throw new Error('Failed to create space');

  // Add creator to space_members as well
  const { error: spaceMemberError } = await supabase
    .from('space_members')
    .insert({
      space_id: space.id,
      user_id: profile.id,
      email: user.email || '',
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  if (spaceMemberError) throw spaceMemberError;

  // Handle invites (optional)
  if (input.invites && input.invites.length > 0) {
    // Send invites via edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-space-member`;

    // Send invites in parallel
    const invitePromises = input.invites.map(async (invite) => {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spaceId: space.id,
            email: invite.email,
            role: invite.role,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to invite ${invite.email}:`, error);
          return { email: invite.email, success: false, error: error.error };
        }

        return { email: invite.email, success: true };
      } catch (err) {
        console.error(`Error inviting ${invite.email}:`, err);
        return { email: invite.email, success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    await Promise.all(invitePromises);
  }

  return {
    spaceId: space.id,
    spaceName: space.name,
    type: 'team',
  };
}

/**
 * Check if user can create more households (subscription limits)
 */
export async function canCreateHousehold(): Promise<{ allowed: boolean; reason?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { allowed: false, reason: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return { allowed: false, reason: 'Profile not found' };

  // Count existing households where user is owner
  const { data: ownedSpaces } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(context_type)')
    .eq('user_id', profile.id)
    .eq('role', 'owner')
    .eq('status', 'active')
    .eq('spaces.context_type', 'household');

  const householdCount = ownedSpaces?.length || 0;

  // TODO: Check subscription plan limits
  // For now, allow unlimited (or set a default limit)
  const maxHouseholds = 10; // Default limit

  if (householdCount >= maxHouseholds) {
    return {
      allowed: false,
      reason: `You've reached the limit of ${maxHouseholds} households. Please upgrade your plan to create more.`,
    };
  }

  return { allowed: true };
}
