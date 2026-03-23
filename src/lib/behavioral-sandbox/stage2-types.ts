/**
 * Stage 2: Feedback & UX Layer Types
 *
 * CRITICAL: Stage 2 is DISPLAY ONLY + FEEDBACK CAPTURE.
 *
 * FORBIDDEN IN STAGE 2:
 * - NO computation of new signals
 * - NO modification of Stage 0 or Stage 1 data
 * - NO streaks, scores, grades, rankings
 * - NO judgmental language (productive, success, optimal, improvement)
 * - NO comparisons (past self, other users, population average)
 * - NO automation, nudges, notifications
 * - NO recommendations ("try doing X", "you should")
 *
 * ALLOWED IN STAGE 2:
 * - Display existing Stage 1 signals
 * - Explain computation methodology
 * - Show confidence and uncertainty
 * - Capture "helpful"/"not helpful" feedback
 * - Provide Safe Mode (emergency brake)
 * - Enforce consent-gated display
 */

import type { SignalKey, CandidateSignal } from './types';

export type FeedbackType = 'not_helpful' | 'helpful' | 'confusing' | 'concerning';

export type DisplayContext = 'dashboard' | 'detail_view' | 'report' | 'consent_center';

export interface InsightDisplayConsent {
  id: string;
  user_id: string;
  signal_key: SignalKey;
  display_enabled: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  prefer_collapsed: boolean;
  prefer_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsightFeedback {
  feedback_id: string;
  user_id: string;
  signal_id: string;
  signal_key: SignalKey;
  feedback_type: FeedbackType;
  reason: string | null;
  displayed_at: string | null;
  feedback_at: string;
  ui_context: Record<string, unknown>;
  created_at: string;
}

export interface SafeModeState {
  id: string;
  user_id: string;
  is_enabled: boolean;
  enabled_at: string | null;
  disabled_at: string | null;
  activation_reason: string | null;
  activation_count: number;
  last_toggled_at: string;
  created_at: string;
  updated_at: string;
}

export interface InsightDisplayLog {
  log_id: string;
  user_id: string;
  signal_id: string;
  signal_key: SignalKey;
  displayed_at: string;
  display_context: string;
  expanded: boolean;
  dismissed: boolean;
  session_id: string | null;
  created_at: string;
}

export interface DisplayableInsight extends CandidateSignal {
  can_display: boolean;
  display_consent: InsightDisplayConsent | null;
  display_metadata: {
    signal_title: string;
    signal_description: string;
    what_it_is: string;
    what_it_is_not: string;
    how_computed: string;
    why_useful: string | null;
  };
}

export interface InsightMetadata {
  signal_key: SignalKey;
  title: string;
  description: string;
  what_it_is: string[];
  what_it_is_not: string[];
  how_computed: string;
  data_used: string[];
  confidence_meaning: string;
  known_risks: string[];
}

export interface SubmitFeedbackOptions {
  signalId: string;
  signalKey: SignalKey;
  feedbackType: FeedbackType;
  reason?: string;
  displayedAt?: string;
  uiContext?: Record<string, unknown>;
}

export interface LogDisplayOptions {
  signalId: string;
  signalKey: SignalKey;
  displayContext: DisplayContext;
  expanded?: boolean;
  dismissed?: boolean;
  sessionId?: string;
}

export interface GetInsightsOptions {
  signalKeys?: SignalKey[];
  includeHidden?: boolean;
  respectSafeMode?: boolean;
}

export interface GrantDisplayConsentOptions {
  signalKey: SignalKey;
  preferCollapsed?: boolean;
  preferHidden?: boolean;
}

export interface SafeModeOptions {
  enabled: boolean;
  reason?: string;
}
