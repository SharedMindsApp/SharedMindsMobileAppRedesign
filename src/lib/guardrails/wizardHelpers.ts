import { supabase } from '../supabase';

export async function checkWizardStatus(): Promise<{
  hasCompleted: boolean;
  hasSkipped: boolean;
  completedAt: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('has_completed_guardrails_wizard, guardrails_wizard_skipped, guardrails_wizard_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check wizard status: ${error.message}`);
  }

  return {
    hasCompleted: profile?.has_completed_guardrails_wizard || false,
    hasSkipped: profile?.guardrails_wizard_skipped || false,
    completedAt: profile?.guardrails_wizard_completed_at || null,
  };
}

export async function markWizardCompleted(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({
      has_completed_guardrails_wizard: true,
      guardrails_wizard_skipped: false,
      guardrails_wizard_completed_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to mark wizard as completed: ${error.message}`);
  }
}

export async function markWizardSkipped(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({
      guardrails_wizard_skipped: true,
      has_completed_guardrails_wizard: true,
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to mark wizard as skipped: ${error.message}`);
  }
}

export async function shouldShowWizard(): Promise<boolean> {
  try {
    const status = await checkWizardStatus();
    return !status.hasCompleted && !status.hasSkipped;
  } catch (error) {
    console.error('Error checking wizard status:', error);
    return false;
  }
}
