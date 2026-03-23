/**
 * Stage 4.5: Regulation Onboarding Service
 *
 * Minimal service to track onboarding state for UX purposes only.
 * No analytics, no telemetry, no tracking of completion or screen views.
 */

import { supabase } from '../supabase';

export interface RegulationOnboardingState {
  user_id: string;
  has_seen_onboarding: boolean;
  mental_model_card_dismissed: boolean;
  onboarding_first_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get onboarding state for user
 */
export async function getOnboardingState(userId: string): Promise<RegulationOnboardingState | null> {
  try {
    const { data, error } = await supabase
      .from('regulation_onboarding_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as RegulationOnboardingState | null;
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return null;
  }
}

/**
 * Mark onboarding as seen (first time only)
 */
export async function markOnboardingSeen(userId: string): Promise<boolean> {
  try {
    const existing = await getOnboardingState(userId);

    if (existing) {
      if (existing.has_seen_onboarding) {
        return true;
      }

      const { error } = await supabase
        .from('regulation_onboarding_state')
        .update({
          has_seen_onboarding: true,
          onboarding_first_seen_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return !error;
    } else {
      const { error } = await supabase
        .from('regulation_onboarding_state')
        .insert({
          user_id: userId,
          has_seen_onboarding: true,
          onboarding_first_seen_at: new Date().toISOString(),
        });

      return !error;
    }
  } catch (error) {
    console.error('Error marking onboarding seen:', error);
    return false;
  }
}

/**
 * Dismiss mental model card
 */
export async function dismissMentalModelCard(userId: string): Promise<boolean> {
  try {
    const existing = await getOnboardingState(userId);

    if (existing) {
      const { error } = await supabase
        .from('regulation_onboarding_state')
        .update({
          mental_model_card_dismissed: true,
        })
        .eq('user_id', userId);

      return !error;
    } else {
      const { error } = await supabase
        .from('regulation_onboarding_state')
        .insert({
          user_id: userId,
          mental_model_card_dismissed: true,
        });

      return !error;
    }
  } catch (error) {
    console.error('Error dismissing mental model card:', error);
    return false;
  }
}

/**
 * Re-show mental model card
 */
export async function showMentalModelCard(userId: string): Promise<boolean> {
  try {
    const existing = await getOnboardingState(userId);

    if (existing) {
      const { error } = await supabase
        .from('regulation_onboarding_state')
        .update({
          mental_model_card_dismissed: false,
        })
        .eq('user_id', userId);

      return !error;
    }

    return true;
  } catch (error) {
    console.error('Error showing mental model card:', error);
    return false;
  }
}
