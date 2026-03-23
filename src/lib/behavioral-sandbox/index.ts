/**
 * Behavioral Sandbox (Stages 1, 2, & 2.1)
 *
 * This module implements Layers B, C, & C.1 of the Semantic Firebreak Architecture.
 *
 * Stage 1 (Layer B): Interpretation Sandbox - Compute signals with consent
 * Stage 2 (Layer C): Feedback & UX Layer - Display signals with consent
 * Stage 2.1 (Layer C.1): Reflection Layer - User meaning, zero interpretation
 *
 * PUBLIC API ONLY - Internal modules are not exported.
 *
 * Usage:
 * ```typescript
 * import {
 *   computeCandidateSignalsForUser,  // Stage 1
 *   grantDisplayConsent,             // Stage 2
 *   getDisplayableInsights,          // Stage 2
 *   createReflection                 // Stage 2.1
 * } from '@/lib/behavioral-sandbox';
 *
 * // Stage 1: Grant compute consent
 * await grantConsent(userId, 'time_patterns');
 *
 * // Stage 1: Compute signals
 * await computeCandidateSignalsForUser(userId, {
 *   signalKeys: ['time_bins_activity_count']
 * });
 *
 * // Stage 2: Grant display consent
 * await grantDisplayConsent(userId, { signalKey: 'time_bins_activity_count' });
 *
 * // Stage 2: Get displayable insights
 * const insights = await getDisplayableInsights(userId);
 *
 * // Stage 2.1: Write reflection (user-owned, never interpreted)
 * await createReflection(userId, {
 *   content: 'This pattern makes sense because...',
 *   linkedSignalId: insight.signal_id
 * });
 * ```
 *
 * CRITICAL: Consent required at both stages. Safe Mode overrides display. Reflections are never analysed.
 */

// Stage 1: Interpretation Sandbox (Computation)
export {
  computeCandidateSignalsForUser,
  getCandidateSignals,
  invalidateSignalsForDeletedEvents,
  hasUserConsent,
  grantConsent,
  revokeConsent,
} from './service';

// Stage 2: Feedback & UX Layer (Display)
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
} from './stage2-service';

// Stage 1 Types
export type {
  ConsentKey,
  SignalKey,
  SignalStatus,
  CandidateSignal,
  UserConsentFlag,
  ComputeSignalOptions,
  GetSignalsOptions,
  ComputeResult,
  InvalidateResult,
  SessionBoundariesValue,
  TimeBinsActivityCountValue,
  ActivityIntervalsValue,
  CaptureCoverageValue,
} from './types';

// Stage 2 Types
export type {
  FeedbackType,
  DisplayContext,
  InsightDisplayConsent,
  InsightFeedback,
  SafeModeState,
  DisplayableInsight,
  InsightMetadata,
  SubmitFeedbackOptions,
  LogDisplayOptions,
  GetInsightsOptions,
  GrantDisplayConsentOptions,
  SafeModeOptions,
} from './stage2-types';

// Stage 2.1: Reflection Layer (User Meaning, Zero Interpretation)
export {
  createReflection,
  getReflections,
  getReflection,
  updateReflection,
  deleteReflection,
  getReflectionStats,
  getUserTags,
} from './stage2_1-service';

// Stage 2.1 Types
export type {
  ReflectionEntry,
  CreateReflectionOptions,
  UpdateReflectionOptions,
  GetReflectionsOptions,
  ReflectionStats,
} from './stage2_1-types';

export { SIGNAL_REGISTRY, getSignalDefinition, getAllSignalKeys } from './registry';
