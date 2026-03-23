import { supabase } from './supabase';

export type Report = {
  id: string;
  household_id: string;
  generated_by: string;
  content: string;
  metadata: {
    member_count: number;
    sections_count: number;
    total_answers: number;
  };
  created_at: string;
};

export async function generateHouseholdReport(): Promise<Report> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-household-report`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate report');
  }

  const data = await response.json();
  return data.report;
}

export async function getHouseholdReports(): Promise<Report[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // V1: Legacy 'members' table no longer exists. Use space_members for household.
  const { data: spaceMembership } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const member = spaceMembership ? { household_id: spaceMembership.space_id } : null;
  if (!member) {
    throw new Error('Member not found');
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('household_id', member.household_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLatestReport(): Promise<Report | null> {
  const reports = await getHouseholdReports();
  return reports.length > 0 ? reports[0] : null;
}
