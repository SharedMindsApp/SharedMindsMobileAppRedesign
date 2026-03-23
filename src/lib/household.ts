import { supabase, Member } from './supabase';

export type Household = {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  billing_owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  space_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'member';
  status: 'pending' | 'active' | 'left';
  invite_token: string | null;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type CreateMemberInput = {
  household_id: string;
  user_id: string | null;
  name: string;
  age?: number;
  role: string;
};

export type UpdateMemberInput = {
  name?: string;
  age?: number;
  role?: string;
};

export async function createHousehold(name: string, spaceType: 'personal' | 'shared' = 'shared'): Promise<Household> {
  console.log('[createHousehold] Starting with name:', name, 'spaceType:', spaceType);
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    console.error('[createHousehold] Not authenticated');
    throw new Error('Not authenticated');
  }

  console.log('[createHousehold] User authenticated:', userData.user.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[createHousehold] Profile query error:', profileError);
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  if (!profile) {
    console.error('[createHousehold] Profile not found');
    throw new Error('Profile not found. Please complete signup first.');
  }

  console.log('[createHousehold] Profile found:', profile.id);

  // Create space with household context
  // Use a temporary context_id that will be updated to space.id after creation
  const tempContextId = crypto.randomUUID();
  
  console.log('[createHousehold] Creating space with:', {
    name,
    billing_owner_id: profile.id,
    space_type: spaceType,
    context_type: 'household',
    context_id: tempContextId,
  });
  
  // V1: spaces table has type ('personal' | 'shared'), created_by — no context_type/space_type
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      name,
      type: 'shared',
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[createHousehold] Space creation error:', error);
    throw new Error(error.message || 'Failed to create household space');
  }

  if (!data) {
    console.error('[createHousehold] No data returned from space creation');
    throw new Error('No data returned from household creation');
  }

  console.log('[createHousehold] Space created:', data.id);

  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: data.id,
      user_id: profile.id,
      email: userData.user.email || '',
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error('[createHousehold] Member creation error:', memberError);
    throw new Error(`Failed to add member: ${memberError.message}`);
  }

  console.log('[createHousehold] Member added successfully');
  console.log('[createHousehold] Household creation complete:', data);

  return data;
}

export async function getUserHousehold(): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  // V1: Find shared space via space_members (household = shared space)
  const { data: householdMember } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.type', 'shared')
    .maybeSingle();

  if (!householdMember || !householdMember.spaces) {
    return null;
  }

  return householdMember.spaces as unknown as Household;
}

// V1: Legacy 'members' table no longer exists. Household members are space_members.
export async function createMember(_input: CreateMemberInput): Promise<Member> {
  console.warn('[household] createMember: Legacy members table not available in V1. Use space_members instead.');
  throw new Error('Legacy members table not available. Use space_members.');
}

export async function updateMember(_memberId: string, _input: UpdateMemberInput): Promise<Member> {
  console.warn('[household] updateMember: Legacy members table not available in V1.');
  throw new Error('Legacy members table not available. Use space_members.');
}

export async function getHouseholdMembers(_householdId: string): Promise<Member[]> {
  console.warn('[household] getHouseholdMembers: Legacy members table not available in V1.');
  return [];
}

export async function deleteMember(_memberId: string): Promise<void> {
  console.warn('[household] deleteMember: Legacy members table not available in V1.');
}

export async function getCurrentMembership(householdId: string): Promise<HouseholdMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: membership } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', householdId)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  return membership;
}

export async function isBillingOwner(householdId: string): Promise<boolean> {
  const membership = await getCurrentMembership(householdId);
  return membership?.role === 'owner';
}

export async function getHouseholdMembersList(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', householdId)
    .in('status', ['pending', 'active'])
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function inviteHouseholdMember(householdId: string, email: string): Promise<{ inviteUrl: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-household-member`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ householdId, email }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to invite member');
  }

  return result;
}

export async function acceptHouseholdInvite(inviteToken: string): Promise<{ household: Household }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-household-invite`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inviteToken }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to accept invite');
  }

  return result;
}

export async function removeHouseholdMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function getPersonalSpace(): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.type', 'personal')
    .limit(1)
    .maybeSingle();

  if (!memberships || !memberships.spaces) return null;

  return memberships.spaces as unknown as Household;
}

export async function getSharedSpaces(): Promise<Household[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return [];

  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.type', 'shared')
    .order('created_at', { ascending: false });

  if (!memberships || memberships.length === 0) return [];

  return memberships
    .filter(m => m.spaces)
    .map(m => m.spaces as unknown as Household);
}

export async function getSpaceById(spaceId: string): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  // Check if user is a member of this space
  const { data: membership } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('space_id', spaceId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || !membership.spaces) return null;

  return membership.spaces as unknown as Household;
}
