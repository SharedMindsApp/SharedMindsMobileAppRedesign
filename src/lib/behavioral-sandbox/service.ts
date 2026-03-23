/**
 * Stage 1: Behavioral Sandbox Service (Public API)
 *
 * This is the ONLY public interface for Stage 1.
 * All other modules are internal implementation details.
 *
 * CRITICAL: This service enforces consent gating.
 * NO computation occurs without explicit user consent.
 *
 * PUBLIC API:
 * - computeCandidateSignalsForUser() - Compute signals with consent check
 * - getCandidateSignals() - Retrieve computed signals
 * - invalidateSignalsForDeletedEvents() - Invalidate when events change
 * - hasUserConsent() - Check consent status
 * - grantConsent() - Grant consent for signal category
 * - revokeConsent() - Revoke consent (invalidates signals)
 *
 * FORBIDDEN:
 * - NO UI rendering
 * - NO action triggers
 * - NO bypassing consent checks
 */

import { supabase } from '../supabase';
import type {
  SignalKey,
  ConsentKey,
  CandidateSignal,
  ComputeSignalOptions,
  GetSignalsOptions,
  ComputeResult,
  InvalidateResult,
  BehavioralEvent,
  SignalComputeContext,
} from './types';
import { getSignalDefinition, getRequiredConsent, validateSignalKey } from './registry';
import { computeSignal } from './compute';

const STAGE_1_ERROR_PREFIX = '[Stage 1 Behavioral Sandbox Error]';

export class BehavioralSandboxService {
  /**
   * Check if user has granted consent for a specific signal category
   */
  async hasUserConsent(userId: string, consentKey: ConsentKey): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_consent_flags')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('consent_key', consentKey)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) {
      console.error(`${STAGE_1_ERROR_PREFIX} Error checking consent:`, error);
      return false;
    }

    return data !== null && data.is_enabled === true;
  }

  /**
   * Grant consent for a specific signal category
   */
  async grantConsent(userId: string, consentKey: ConsentKey): Promise<void> {
    const { data: existing } = await supabase
      .from('user_consent_flags')
      .select('id, is_enabled')
      .eq('user_id', userId)
      .eq('consent_key', consentKey)
      .maybeSingle();

    if (existing) {
      if (existing.is_enabled) {
        return;
      }

      const { error } = await supabase
        .from('user_consent_flags')
        .update({
          is_enabled: true,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(`${STAGE_1_ERROR_PREFIX} Failed to update consent: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from('user_consent_flags').insert({
        user_id: userId,
        consent_key: consentKey,
        is_enabled: true,
        granted_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`${STAGE_1_ERROR_PREFIX} Failed to grant consent: ${error.message}`);
      }
    }
  }

  /**
   * Revoke consent for a specific signal category
   * This also invalidates all signals in that category
   */
  async revokeConsent(userId: string, consentKey: ConsentKey): Promise<void> {
    const { error: updateError } = await supabase
      .from('user_consent_flags')
      .update({
        is_enabled: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('consent_key', consentKey);

    if (updateError) {
      throw new Error(
        `${STAGE_1_ERROR_PREFIX} Failed to revoke consent: ${updateError.message}`
      );
    }

    await this.invalidateSignalsByConsent(userId, consentKey);
  }

  private async invalidateSignalsByConsent(
    userId: string,
    consentKey: ConsentKey
  ): Promise<void> {
    const { error } = await supabase.rpc('invalidate_signals_for_events', {
      p_user_id: userId,
      p_event_ids: [],
      p_reason: `Consent revoked for category: ${consentKey}`,
    });

    if (error) {
      console.error(`${STAGE_1_ERROR_PREFIX} Failed to invalidate signals:`, error);
    }
  }

  /**
   * Compute candidate signals for a user
   * Requires consent for each signal type
   */
  async computeCandidateSignalsForUser(
    userId: string,
    options: ComputeSignalOptions = {}
  ): Promise<ComputeResult> {
    const {
      signalKeys,
      timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      forceRecompute = false,
    } = options;

    const keysToCompute = signalKeys ?? (['session_boundaries', 'time_bins_activity_count', 'activity_intervals', 'capture_coverage'] as SignalKey[]);

    const result: ComputeResult = {
      computed: 0,
      skipped: 0,
      errors: [],
      signals: [],
    };

    for (const signalKey of keysToCompute) {
      try {
        if (!validateSignalKey(signalKey)) {
          result.errors.push(`Invalid signal key: ${signalKey}`);
          result.skipped++;
          continue;
        }

        const requiredConsent = getRequiredConsent(signalKey);
        const hasConsent = await this.hasUserConsent(userId, requiredConsent);

        if (!hasConsent) {
          result.skipped++;
          continue;
        }

        const definition = getSignalDefinition(signalKey);

        const events = await this.getBehavioralEvents(userId, {
          start: timeRange.start,
          end: timeRange.end,
        });

        if (events.length < definition.minimumEvents) {
          result.skipped++;
          continue;
        }

        const context: SignalComputeContext = {
          userId,
          signalKey,
          timeRange: {
            start: new Date(timeRange.start),
            end: new Date(timeRange.end),
          },
          parameters: this.getDefaultParameters(signalKey),
        };

        if (!forceRecompute) {
          const existing = await this.findExistingSignal(userId, signalKey, context);
          if (existing) {
            result.signals.push(existing);
            result.skipped++;
            continue;
          }
        }

        const computeOutput = await computeSignal(context, events);

        const signal = await this.storeSignal(userId, signalKey, context, computeOutput);

        result.signals.push(signal);
        result.computed++;

        await this.logAudit(userId, signal.signal_id, 'computed', userId, 'Signal computed');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`${signalKey}: ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * Get candidate signals for a user
   */
  async getCandidateSignals(
    userId: string,
    options: GetSignalsOptions = {}
  ): Promise<CandidateSignal[]> {
    const {
      signalKeys,
      timeRange,
      status = 'candidate',
      limit = 100,
      offset = 0,
    } = options;

    let query = supabase
      .from('candidate_signals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('computed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (signalKeys && signalKeys.length > 0) {
      query = query.in('signal_key', signalKeys);
    }

    if (timeRange) {
      query = query
        .gte('time_range_start', timeRange.start)
        .lte('time_range_end', timeRange.end);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `${STAGE_1_ERROR_PREFIX} Failed to get signals: ${error.message}`
      );
    }

    return (data ?? []) as CandidateSignal[];
  }

  /**
   * Invalidate signals when source events are deleted or modified
   */
  async invalidateSignalsForDeletedEvents(
    userId: string,
    eventIds: string[]
  ): Promise<InvalidateResult> {
    if (eventIds.length === 0) {
      return { invalidated_count: 0, affected_signal_ids: [] };
    }

    const { data: affectedSignals } = await supabase
      .from('candidate_signals')
      .select('signal_id')
      .eq('user_id', userId)
      .eq('status', 'candidate')
      .contains('provenance_event_ids', eventIds);

    const affectedIds = (affectedSignals ?? []).map((s) => s.signal_id);

    if (affectedIds.length === 0) {
      return { invalidated_count: 0, affected_signal_ids: [] };
    }

    const { error } = await supabase
      .from('candidate_signals')
      .update({
        status: 'invalidated',
        invalidated_at: new Date().toISOString(),
        invalidated_reason: 'Source events deleted or modified',
      })
      .in('signal_id', affectedIds);

    if (error) {
      throw new Error(
        `${STAGE_1_ERROR_PREFIX} Failed to invalidate signals: ${error.message}`
      );
    }

    for (const signalId of affectedIds) {
      await this.logAudit(
        userId,
        signalId,
        'invalidated',
        'system',
        'Source events deleted or modified'
      );
    }

    return {
      invalidated_count: affectedIds.length,
      affected_signal_ids: affectedIds,
    };
  }

  private async getBehavioralEvents(
    userId: string,
    timeRange: { start: string; end: string }
  ): Promise<BehavioralEvent[]> {
    const { data, error } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('user_id', userId)
      .gte('occurred_at', timeRange.start)
      .lte('occurred_at', timeRange.end)
      .is('superseded_by', null)
      .order('occurred_at', { ascending: true });

    if (error) {
      throw new Error(
        `${STAGE_1_ERROR_PREFIX} Failed to get behavioral events: ${error.message}`
      );
    }

    return (data ?? []) as BehavioralEvent[];
  }

  private async findExistingSignal(
    userId: string,
    signalKey: SignalKey,
    context: SignalComputeContext
  ): Promise<CandidateSignal | null> {
    const { data } = await supabase
      .from('candidate_signals')
      .select('*')
      .eq('user_id', userId)
      .eq('signal_key', signalKey)
      .eq('status', 'candidate')
      .gte('time_range_start', context.timeRange.start.toISOString())
      .lte('time_range_end', context.timeRange.end.toISOString())
      .maybeSingle();

    return data as CandidateSignal | null;
  }

  private async storeSignal(
    userId: string,
    signalKey: SignalKey,
    context: SignalComputeContext,
    computeOutput: any
  ): Promise<CandidateSignal> {
    const definition = getSignalDefinition(signalKey);

    const { data, error } = await supabase
      .from('candidate_signals')
      .insert({
        user_id: userId,
        signal_key: signalKey,
        signal_version: definition.version,
        time_range_start: context.timeRange.start.toISOString(),
        time_range_end: context.timeRange.end.toISOString(),
        value_json: computeOutput.value,
        confidence: computeOutput.confidence,
        provenance_event_ids: computeOutput.provenance_event_ids,
        provenance_hash: computeOutput.provenance_hash,
        parameters_json: context.parameters,
        status: 'candidate',
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `${STAGE_1_ERROR_PREFIX} Failed to store signal: ${error.message}`
      );
    }

    return data as CandidateSignal;
  }

  private async logAudit(
    userId: string,
    signalId: string | null,
    action: string,
    actor: string,
    reason: string
  ): Promise<void> {
    const { error } = await supabase.from('signal_audit_log').insert({
      user_id: userId,
      signal_id: signalId,
      action,
      actor,
      reason,
    });

    if (error) {
      console.error(`${STAGE_1_ERROR_PREFIX} Failed to log audit:`, error);
    }
  }

  private getDefaultParameters(signalKey: SignalKey): Record<string, unknown> {
    const definition = getSignalDefinition(signalKey);
    const params: Record<string, unknown> = {};

    for (const param of definition.parameters) {
      if (param.default !== undefined) {
        params[param.name] = param.default;
      }
    }

    return params;
  }
}

export const behavioralSandbox = new BehavioralSandboxService();

export {
  computeCandidateSignalsForUser,
  getCandidateSignals,
  invalidateSignalsForDeletedEvents,
  hasUserConsent,
  grantConsent,
  revokeConsent,
};

async function computeCandidateSignalsForUser(
  userId: string,
  options?: ComputeSignalOptions
): Promise<ComputeResult> {
  return behavioralSandbox.computeCandidateSignalsForUser(userId, options);
}

async function getCandidateSignals(
  userId: string,
  options?: GetSignalsOptions
): Promise<CandidateSignal[]> {
  return behavioralSandbox.getCandidateSignals(userId, options);
}

async function invalidateSignalsForDeletedEvents(
  userId: string,
  eventIds: string[]
): Promise<InvalidateResult> {
  return behavioralSandbox.invalidateSignalsForDeletedEvents(userId, eventIds);
}

async function hasUserConsent(
  userId: string,
  consentKey: ConsentKey
): Promise<boolean> {
  return behavioralSandbox.hasUserConsent(userId, consentKey);
}

async function grantConsent(
  userId: string,
  consentKey: ConsentKey
): Promise<void> {
  return behavioralSandbox.grantConsent(userId, consentKey);
}

async function revokeConsent(
  userId: string,
  consentKey: ConsentKey
): Promise<void> {
  return behavioralSandbox.revokeConsent(userId, consentKey);
}
