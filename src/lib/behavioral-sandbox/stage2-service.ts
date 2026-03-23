/**
 * Stage 2: Feedback & UX Layer Service
 *
 * This service provides consent-gated access to Stage 1 signals for display.
 *
 * CRITICAL RULES:
 * - Safe Mode overrides ALL display permissions
 * - Display consent is separate from computation consent
 * - All feedback is passive (no system changes)
 * - All displays are logged for transparency
 * - NO judgmental language in ANY output
 *
 * PUBLIC API:
 * - getSafeModeStatus() - Check Safe Mode state
 * - toggleSafeMode() - Enable/disable emergency brake
 * - getDisplayableInsights() - Get insights user can see
 * - grantDisplayConsent() - Allow viewing specific signal
 * - revokeDisplayConsent() - Hide specific signal
 * - submitFeedback() - Capture "helpful"/"not helpful"
 * - logDisplay() - Record insight display
 */

import { supabase } from '../supabase';
import type {
  SignalKey,
  CandidateSignal,
} from './types';
import type {
  InsightDisplayConsent,
  InsightFeedback,
  SafeModeState,
  DisplayableInsight,
  SubmitFeedbackOptions,
  LogDisplayOptions,
  GetInsightsOptions,
  GrantDisplayConsentOptions,
  SafeModeOptions,
  InsightMetadata,
} from './stage2-types';
import { getSignalDefinition } from './registry';

const STAGE_2_ERROR_PREFIX = '[Stage 2 Display Layer Error]';

export class Stage2DisplayService {
  /**
   * Get Safe Mode status (emergency brake state)
   */
  async getSafeModeStatus(userId: string): Promise<SafeModeState | null> {
    const { data, error } = await supabase
      .from('safe_mode_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error(`${STAGE_2_ERROR_PREFIX} Error getting Safe Mode:`, error);
      return null;
    }

    return data as SafeModeState | null;
  }

  /**
   * Check if Safe Mode is currently enabled
   */
  async isSafeModeEnabled(userId: string): Promise<boolean> {
    const state = await this.getSafeModeStatus(userId);
    return state?.is_enabled ?? false;
  }

  /**
   * Toggle Safe Mode (emergency brake)
   * When enabled: ALL insights are hidden immediately
   */
  async toggleSafeMode(userId: string, options: SafeModeOptions): Promise<void> {
    const { enabled, reason } = options;

    const { error } = await supabase.rpc('toggle_safe_mode', {
      p_user_id: userId,
      p_enable: enabled,
      p_reason: reason ?? null,
    });

    if (error) {
      throw new Error(
        `${STAGE_2_ERROR_PREFIX} Failed to toggle Safe Mode: ${error.message}`
      );
    }
  }

  /**
   * Get display consent for a specific signal
   */
  async getDisplayConsent(
    userId: string,
    signalKey: SignalKey
  ): Promise<InsightDisplayConsent | null> {
    const { data, error } = await supabase
      .from('insight_display_consent')
      .select('*')
      .eq('user_id', userId)
      .eq('signal_key', signalKey)
      .maybeSingle();

    if (error) {
      console.error(`${STAGE_2_ERROR_PREFIX} Error getting display consent:`, error);
      return null;
    }

    return data as InsightDisplayConsent | null;
  }

  /**
   * Get all display consents for user
   */
  async getAllDisplayConsents(userId: string): Promise<InsightDisplayConsent[]> {
    const { data, error } = await supabase
      .from('insight_display_consent')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(`${STAGE_2_ERROR_PREFIX} Error getting consents:`, error);
      return [];
    }

    return (data ?? []) as InsightDisplayConsent[];
  }

  /**
   * Grant display consent for a signal category
   */
  async grantDisplayConsent(
    userId: string,
    options: GrantDisplayConsentOptions
  ): Promise<void> {
    const { signalKey, preferCollapsed = false, preferHidden = false } = options;

    const existing = await this.getDisplayConsent(userId, signalKey);

    if (existing) {
      const { error } = await supabase
        .from('insight_display_consent')
        .update({
          display_enabled: true,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          prefer_collapsed: preferCollapsed,
          prefer_hidden: preferHidden,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(
          `${STAGE_2_ERROR_PREFIX} Failed to update display consent: ${error.message}`
        );
      }
    } else {
      const { error } = await supabase.from('insight_display_consent').insert({
        user_id: userId,
        signal_key: signalKey,
        display_enabled: true,
        granted_at: new Date().toISOString(),
        prefer_collapsed: preferCollapsed,
        prefer_hidden: preferHidden,
      });

      if (error) {
        throw new Error(
          `${STAGE_2_ERROR_PREFIX} Failed to grant display consent: ${error.message}`
        );
      }
    }
  }

  /**
   * Revoke display consent (hide signal)
   */
  async revokeDisplayConsent(userId: string, signalKey: SignalKey): Promise<void> {
    const { error } = await supabase
      .from('insight_display_consent')
      .update({
        display_enabled: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('signal_key', signalKey);

    if (error) {
      throw new Error(
        `${STAGE_2_ERROR_PREFIX} Failed to revoke display consent: ${error.message}`
      );
    }
  }

  /**
   * Check if insight can be displayed (Safe Mode + display consent)
   */
  async canDisplayInsight(userId: string, signalKey: SignalKey): Promise<boolean> {
    const safeModeEnabled = await this.isSafeModeEnabled(userId);
    if (safeModeEnabled) {
      return false;
    }

    const consent = await this.getDisplayConsent(userId, signalKey);
    return consent?.display_enabled ?? false;
  }

  /**
   * Get displayable insights for user (respects Safe Mode + consent)
   */
  async getDisplayableInsights(
    userId: string,
    options: GetInsightsOptions = {}
  ): Promise<DisplayableInsight[]> {
    const {
      signalKeys,
      includeHidden = false,
      respectSafeMode = true,
    } = options;

    if (respectSafeMode) {
      const safeModeEnabled = await this.isSafeModeEnabled(userId);
      if (safeModeEnabled) {
        return [];
      }
    }

    let query = supabase
      .from('candidate_signals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'candidate')
      .order('computed_at', { ascending: false })
      .limit(50);

    if (signalKeys && signalKeys.length > 0) {
      query = query.in('signal_key', signalKeys);
    }

    const { data: signals, error } = await query;

    if (error) {
      throw new Error(
        `${STAGE_2_ERROR_PREFIX} Failed to get signals: ${error.message}`
      );
    }

    const consents = await this.getAllDisplayConsents(userId);
    const consentMap = new Map(
      consents.map((c) => [c.signal_key, c])
    );

    const displayableSignals: DisplayableInsight[] = [];

    for (const signal of signals ?? []) {
      const consent = consentMap.get(signal.signal_key as SignalKey);
      const canDisplay = consent?.display_enabled ?? false;

      if (!canDisplay && !includeHidden) {
        continue;
      }

      if (consent?.prefer_hidden && !includeHidden) {
        continue;
      }

      const metadata = this.getInsightMetadata(signal.signal_key as SignalKey);

      displayableSignals.push({
        ...(signal as CandidateSignal),
        can_display: canDisplay,
        display_consent: consent ?? null,
        display_metadata: {
          signal_title: metadata.title,
          signal_description: metadata.description,
          what_it_is: metadata.what_it_is.join(' '),
          what_it_is_not: metadata.what_it_is_not.join(' '),
          how_computed: metadata.how_computed,
          why_useful: null,
        },
      });
    }

    return displayableSignals;
  }

  /**
   * Submit feedback on an insight (passive capture only)
   */
  async submitFeedback(
    userId: string,
    options: SubmitFeedbackOptions
  ): Promise<void> {
    const {
      signalId,
      signalKey,
      feedbackType,
      reason,
      displayedAt,
      uiContext = {},
    } = options;

    const { error } = await supabase.from('insight_feedback').insert({
      user_id: userId,
      signal_id: signalId,
      signal_key: signalKey,
      feedback_type: feedbackType,
      reason: reason ?? null,
      displayed_at: displayedAt ?? null,
      ui_context: uiContext,
    });

    if (error) {
      throw new Error(
        `${STAGE_2_ERROR_PREFIX} Failed to submit feedback: ${error.message}`
      );
    }
  }

  /**
   * Log insight display (transparency audit trail)
   */
  async logDisplay(userId: string, options: LogDisplayOptions): Promise<void> {
    const {
      signalId,
      signalKey,
      displayContext,
      expanded = false,
      dismissed = false,
      sessionId,
    } = options;

    const { error } = await supabase.from('insight_display_log').insert({
      user_id: userId,
      signal_id: signalId,
      signal_key: signalKey,
      display_context: displayContext,
      expanded,
      dismissed,
      session_id: sessionId ?? null,
    });

    if (error) {
      console.error(`${STAGE_2_ERROR_PREFIX} Failed to log display:`, error);
    }
  }

  /**
   * Get metadata for an insight (titles, descriptions, warnings)
   */
  getInsightMetadata(signalKey: SignalKey): InsightMetadata {
    const definition = getSignalDefinition(signalKey);

    const metadataMap: Record<SignalKey, InsightMetadata> = {
      session_boundaries: {
        signal_key: 'session_boundaries',
        title: 'Activity Session Boundaries',
        description: 'Shows when activity sessions started and ended',
        what_it_is: [
          'Timestamps of when activity began and concluded',
          'Based on explicit start/end events or inactivity gaps',
          'Factual observation of temporal boundaries',
        ],
        what_it_is_not: [
          'Not a measure of focus quality',
          'Not an evaluation of session value',
          'Not a recommendation about ideal session length',
          'Not a comparison to other sessions',
        ],
        how_computed: definition.description,
        data_used: ['Activity start/end events', 'Timestamps', 'Inactivity gaps'],
        confidence_meaning:
          'Based on availability of explicit session markers vs inferred from gaps',
        known_risks: [
          'May trigger fixation on session duration',
          'May create pressure to maintain long sessions',
          'May not reflect actual engagement or value',
        ],
      },
      time_bins_activity_count: {
        signal_key: 'time_bins_activity_count',
        title: 'Activity Across Time Windows',
        description: 'Shows when activity events were recorded throughout the day',
        what_it_is: [
          'Count of recorded events in different time periods',
          'Observation of temporal patterns in data capture',
          'Neutral view of when events occurred',
        ],
        what_it_is_not: [
          'Not a measure of productivity or effectiveness',
          'Not a suggestion about optimal timing',
          'Not an evaluation of schedule quality',
          'Not a comparison to ideal patterns',
        ],
        how_computed: definition.description,
        data_used: ['Event timestamps', 'Time-of-day information'],
        confidence_meaning: 'Based on number of events available for analysis',
        known_risks: [
          'May trigger shame about irregular patterns',
          'May create pressure to normalize schedule',
          'May not reflect energy levels or capacity',
          'Patterns may be circumstantial, not meaningful',
        ],
      },
      activity_intervals: {
        signal_key: 'activity_intervals',
        title: 'Activity Duration Records',
        description: 'Shows how long activities lasted based on recorded data',
        what_it_is: [
          'Duration measurements from events with start and end times',
          'Factual record of elapsed time',
          'Neutral observation of activity length',
        ],
        what_it_is_not: [
          'Not a measure of quality or value',
          'Not a suggestion about ideal duration',
          'Not an evaluation of time use',
          'Not a comparison to expectations',
        ],
        how_computed: definition.description,
        data_used: ['Activity start times', 'Activity end times', 'Duration fields'],
        confidence_meaning: 'High confidence when explicit duration recorded',
        known_risks: [
          'May trigger comparison to estimated durations',
          'May create pressure about time spent',
          'Duration alone does not indicate value or engagement',
        ],
      },
      capture_coverage: {
        signal_key: 'capture_coverage',
        title: 'Data Capture Overview',
        description: 'Shows which days had any recorded events',
        what_it_is: [
          'Count of days with at least one event',
          'Data quality indicator (coverage, not consistency)',
          'Observation about recording patterns',
        ],
        what_it_is_not: [
          'Not a measure of habit consistency or adherence',
          'Not an evaluation of engagement quality',
          'Not a suggestion that more coverage is better',
          'Not a reflection of actual behavior patterns',
        ],
        how_computed: definition.description,
        data_used: ['Event timestamps', 'Date ranges'],
        confidence_meaning: 'Always 1.0 (simple counting of days)',
        known_risks: [
          'HIGH RISK: May be interpreted as streak or consistency score',
          'May trigger shame about gaps in recording',
          'May create pressure to record daily',
          'Coverage does not equal value or success',
          'Missing data may be intentional or circumstantial',
        ],
      },
    };

    return metadataMap[signalKey];
  }
}

export const stage2Display = new Stage2DisplayService();

export {
  getSafeModeStatus,
  isSafeModeEnabled,
  toggleSafeMode,
  getDisplayableInsights,
  grantDisplayConsent,
  revokeDisplayConsent,
  canDisplayInsight,
  submitFeedback,
  logDisplay,
  getInsightMetadata,
};

async function getSafeModeStatus(userId: string): Promise<SafeModeState | null> {
  return stage2Display.getSafeModeStatus(userId);
}

async function isSafeModeEnabled(userId: string): Promise<boolean> {
  return stage2Display.isSafeModeEnabled(userId);
}

async function toggleSafeMode(
  userId: string,
  options: SafeModeOptions
): Promise<void> {
  return stage2Display.toggleSafeMode(userId, options);
}

async function getDisplayableInsights(
  userId: string,
  options?: GetInsightsOptions
): Promise<DisplayableInsight[]> {
  return stage2Display.getDisplayableInsights(userId, options);
}

async function grantDisplayConsent(
  userId: string,
  options: GrantDisplayConsentOptions
): Promise<void> {
  return stage2Display.grantDisplayConsent(userId, options);
}

async function revokeDisplayConsent(
  userId: string,
  signalKey: SignalKey
): Promise<void> {
  return stage2Display.revokeDisplayConsent(userId, signalKey);
}

async function canDisplayInsight(
  userId: string,
  signalKey: SignalKey
): Promise<boolean> {
  return stage2Display.canDisplayInsight(userId, signalKey);
}

async function submitFeedback(
  userId: string,
  options: SubmitFeedbackOptions
): Promise<void> {
  return stage2Display.submitFeedback(userId, options);
}

async function logDisplay(
  userId: string,
  options: LogDisplayOptions
): Promise<void> {
  return stage2Display.logDisplay(userId, options);
}

function getInsightMetadata(signalKey: SignalKey): InsightMetadata {
  return stage2Display.getInsightMetadata(signalKey);
}
