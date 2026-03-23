import { supabase } from './supabase';
import { Household } from './household';

export type ProfessionalAccess = {
  id: string;
  professional_id: string;
  household_id: string;
  status: 'pending' | 'approved' | 'revoked';
  access_level: 'summary' | 'full_insights';
  requested_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
};

export type ProfessionalHousehold = ProfessionalAccess & {
  households: Household;
  memberCount?: number;
};

export type ProfessionalNote = {
  id: string;
  professional_id: string;
  household_id: string;
  content: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfessionalProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  professional_type: string | null;
  professional_bio: string | null;
  professional_credentials: string | null;
  created_at: string;
};

export async function requestProfessionalAccess(
  householdId: string,
  accessLevel: 'summary' | 'full_insights'
): Promise<{ success: boolean; message: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professional-request-access`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ householdId, accessLevel }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to request access');
  }

  return result;
}

export async function manageProfessionalAccess(
  householdId: string,
  professionalId: string,
  action: 'approve' | 'deny' | 'revoke' | 'change_level',
  accessLevel?: 'summary' | 'full_insights'
): Promise<{ success: boolean; message: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professional-manage-access`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ householdId, professionalId, action, accessLevel }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to manage access');
  }

  return result;
}

export async function getProfessionalHouseholds(): Promise<{
  households: ProfessionalHousehold[];
  pendingRequests: ProfessionalHousehold[];
}> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professional-get-households`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get households');
  }

  return result;
}

export async function getProfessionalHouseholdDetails(householdId: string): Promise<{
  household: Household;
  accessLevel: string;
  members: any[];
  latestReport: any;
}> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professional-get-households?householdId=${householdId}`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get household details');
  }

  return result;
}

export async function getHouseholdProfessionals(householdId: string): Promise<ProfessionalAccess[]> {
  const { data, error } = await supabase
    .from('professional_households')
    .select('*, profiles!professional_households_professional_id_fkey(*)')
    .eq('household_id', householdId)
    .in('status', ['pending', 'approved'])
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProfessionalNote(
  householdId: string,
  content: string,
  isShared: boolean
): Promise<ProfessionalNote> {
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

  const { data, error } = await supabase
    .from('professional_notes')
    .insert({
      professional_id: profile.id,
      household_id: householdId,
      content,
      is_shared: isShared,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfessionalNotes(householdId: string): Promise<ProfessionalNote[]> {
  const { data, error } = await supabase
    .from('professional_notes')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProfessionalNote(
  noteId: string,
  content: string,
  isShared: boolean
): Promise<ProfessionalNote> {
  const { data, error } = await supabase
    .from('professional_notes')
    .update({
      content,
      is_shared: isShared,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProfessionalNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('professional_notes').delete().eq('id', noteId);

  if (error) throw error;
}

export async function updateProfessionalProfile(data: {
  professionalType?: string;
  professionalBio?: string;
  professionalCredentials?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const updateData: any = {};
  if (data.professionalType !== undefined) updateData.professional_type = data.professionalType;
  if (data.professionalBio !== undefined) updateData.professional_bio = data.professionalBio;
  if (data.professionalCredentials !== undefined)
    updateData.professional_credentials = data.professionalCredentials;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function convertToProfessionalAccount(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'professional' })
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function isProfessional(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return profile?.role === 'professional';
}
