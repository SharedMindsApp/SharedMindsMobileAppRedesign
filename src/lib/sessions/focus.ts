import { supabase } from '../supabase';
import { logRegulationEvent } from '../regulationEngine';
import type {
  FocusSession,
  FocusEvent,
  FocusDriftLog,
  FocusDistraction,
  FocusAnalyticsCache,
  StartFocusSessionInput,
  LogDriftInput,
  LogDistractionInput,
  LogDistractionStructuredInput,
  SendNudgeInput,
  RegulationCheckResult,
  FocusSessionSummary,
  FocusScoreInput,
  DriftDetectionResult,
  DriftType,
  DistractionType,
} from './focusTypes';

export async function startFocusSession(
  input: StartFocusSessionInput
): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: existingActive, error: checkError } = await supabase
    .from('focus_sessions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused'])
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check for active sessions: ${checkError.message}`);
  }

  if (existingActive) {
    throw new Error('You already have an active focus session. Please end it before starting a new one.');
  }

  const { data: project, error: projectError } = await supabase
    .from('master_projects')
    .select('domain_id')
    .eq('id', input.projectId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found or you do not have access to it');
  }

  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      project_id: input.projectId,
      domain_id: project.domain_id,
      intended_duration_minutes: input.durationMinutes || null,
      status: 'active',
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create focus session: ${sessionError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: session.id,
      event_type: 'start',
      metadata: {
        intended_duration_minutes: input.durationMinutes,
      },
    });

  if (eventError) {
    throw new Error(`Failed to log start event: ${eventError.message}`);
  }

  return session;
}

export async function endFocusSession(
  sessionId: string,
  status: 'completed' | 'cancelled' = 'completed'
): Promise<FocusSessionSummary> {
  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error('Focus session not found');
  }

  const endTime = new Date();
  const startTime = new Date(session.start_time);
  const actualMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const focusScore = calculateFocusScore({
    driftCount: session.drift_count,
    distractionCount: session.distraction_count,
    actualMinutes,
    intendedMinutes: session.intended_duration_minutes,
  });

  const { data: updatedSession, error: updateError } = await supabase
    .from('focus_sessions')
    .update({
      end_time: endTime.toISOString(),
      status,
      actual_duration_minutes: actualMinutes,
      focus_score: focusScore,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update focus session: ${updateError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'end',
      metadata: {
        status,
        actual_duration_minutes: actualMinutes,
        focus_score: focusScore,
      },
    });

  if (eventError) {
    throw new Error(`Failed to log end event: ${eventError.message}`);
  }

  if (status === 'completed') {
    await logRegulationEvent('focus_completed', {
      userId: session.user_id,
      projectId: session.project_id,
      metadata: {
        session_id: sessionId,
        focus_score: focusScore,
        actual_duration_minutes: actualMinutes,
      },
    }).catch(err => console.error('Failed to log regulation event:', err));
  } else {
    await logRegulationEvent('session_abandoned', {
      userId: session.user_id,
      projectId: session.project_id,
      metadata: {
        session_id: sessionId,
        actual_duration_minutes: actualMinutes,
      },
    }).catch(err => console.error('Failed to log regulation event:', err));
  }

  return getFocusSessionSummary(sessionId);
}

export async function logDrift(input: LogDriftInput): Promise<FocusDriftLog> {
  const { sessionId, driftType, offshootId, projectId, notes } = input;

  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .select('project_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Focus session not found');
  }

  const targetProjectId = projectId || session.project_id;

  const { data: driftLog, error: driftError } = await supabase
    .from('focus_drift_log')
    .insert({
      session_id: sessionId,
      project_id: targetProjectId,
      offshoot_id: offshootId || null,
      drift_type: driftType,
      notes: notes || null,
    })
    .select()
    .single();

  if (driftError) {
    throw new Error(`Failed to create drift log: ${driftError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'drift',
      metadata: {
        drift_type: driftType,
        offshoot_id: offshootId,
        drift_log_id: driftLog.id,
      },
    });

  if (eventError) {
    throw new Error(`Failed to log drift event: ${eventError.message}`);
  }

  const { data: fullSession } = await supabase
    .from('focus_sessions')
    .select('user_id, project_id')
    .eq('id', sessionId)
    .single();

  if (fullSession) {
    await logRegulationEvent('session_drift', {
      userId: fullSession.user_id,
      projectId: fullSession.project_id,
      metadata: {
        drift_type: driftType,
        offshoot_id: offshootId,
        drift_log_id: driftLog.id,
      },
    }).catch(err => console.error('Failed to log regulation event:', err));
  }

  return driftLog;
}

export async function resolveDrift(sessionId: string): Promise<FocusSession> {
  const { data: openDrift, error: fetchError } = await supabase
    .from('focus_drift_log')
    .select('*')
    .eq('session_id', sessionId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch open drift: ${fetchError.message}`);
  }

  if (openDrift) {
    const endedAt = new Date();
    const startedAt = new Date(openDrift.started_at);
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    const { error: updateError } = await supabase
      .from('focus_drift_log')
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', openDrift.id);

    if (updateError) {
      throw new Error(`Failed to close drift log: ${updateError.message}`);
    }
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'return',
      metadata: {
        drift_log_id: openDrift?.id,
      },
    });

  if (eventError) {
    throw new Error(`Failed to log return event: ${eventError.message}`);
  }

  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Focus session not found');
  }

  return session;
}

export async function logDistraction(
  input: LogDistractionInput
): Promise<FocusEvent> {
  const { sessionId, metadata } = input;

  const { data: event, error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'distraction',
      metadata: metadata || {},
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to log distraction event: ${eventError.message}`);
  }

  return event;
}

export async function sendSoftNudge(input: SendNudgeInput): Promise<FocusEvent> {
  const { sessionId, message } = input;

  const { data: event, error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'nudge_soft',
      metadata: {
        message,
      },
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to send soft nudge: ${eventError.message}`);
  }

  return event;
}

export async function sendHardNudge(input: SendNudgeInput): Promise<FocusEvent> {
  const { sessionId, message } = input;

  const { data: event, error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'nudge_hard',
      metadata: {
        message,
      },
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to send hard nudge: ${eventError.message}`);
  }

  return event;
}

export function calculateFocusScore(input: FocusScoreInput): number {
  const { driftCount, distractionCount, actualMinutes, intendedMinutes } = input;

  const driftPenalty = driftCount * 12;
  const distractionPenalty = distractionCount * 5;

  let completionBonus = 0;
  if (intendedMinutes && intendedMinutes > 0) {
    completionBonus = Math.min(30, (actualMinutes / intendedMinutes) * 30);
  }

  let score = 100 - driftPenalty - distractionPenalty + completionBonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function detectDrift(
  newActivityType: string,
  newActivityId: string,
  activeProjectId: string
): Promise<DriftDetectionResult> {
  if (newActivityType === 'master_project' && newActivityId === activeProjectId) {
    return {
      isDrift: false,
      driftType: null,
      reason: 'User is working on the active project',
    };
  }

  if (newActivityType === 'master_project' && newActivityId !== activeProjectId) {
    return {
      isDrift: true,
      driftType: 'side_project',
      reason: 'User switched to a different master project',
    };
  }

  if (newActivityType === 'offshoot_idea') {
    const { data: offshoot, error } = await supabase
      .from('offshoot_ideas')
      .select('project_id')
      .eq('id', newActivityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check offshoot: ${error.message}`);
    }

    if (offshoot && offshoot.project_id === activeProjectId) {
      return {
        isDrift: false,
        driftType: null,
        reason: 'Offshoot belongs to active project',
      };
    }

    return {
      isDrift: true,
      driftType: 'offshoot',
      reason: 'User switched to an offshoot from a different project',
    };
  }

  if (newActivityType === 'side_project') {
    return {
      isDrift: true,
      driftType: 'side_project',
      reason: 'User switched to a side project',
    };
  }

  return {
    isDrift: true,
    driftType: 'external_distraction',
    reason: 'User activity outside of project scope',
  };
}

export async function checkRegulationRules(
  sessionId: string
): Promise<RegulationCheckResult> {
  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .select('start_time, actual_duration_minutes')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Focus session not found');
  }

  const startTime = new Date(session.start_time);
  const currentTime = new Date();
  const elapsedMinutes = Math.round((currentTime.getTime() - startTime.getTime()) / 60000);

  if (elapsedMinutes >= 120) {
    return {
      shouldPause: true,
      reason: 'You have been in focus mode for 2 hours. Time for a break.',
      requiredAction: 'rest',
    };
  }

  if (elapsedMinutes >= 90 && elapsedMinutes % 90 === 0) {
    return {
      shouldPause: true,
      reason: 'Time to stretch and move around',
      requiredAction: 'stretch',
    };
  }

  if (elapsedMinutes >= 60 && elapsedMinutes % 60 === 0) {
    return {
      shouldPause: true,
      reason: 'Remember to hydrate',
      requiredAction: 'hydrate',
    };
  }

  return {
    shouldPause: false,
    reason: 'No regulation rules triggered',
    requiredAction: null,
  };
}

export async function getFocusSessionSummary(
  sessionId: string
): Promise<FocusSessionSummary> {
  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Focus session not found');
  }

  const { data: events, error: eventsError } = await supabase
    .from('focus_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (eventsError) {
    throw new Error(`Failed to fetch events: ${eventsError.message}`);
  }

  const { data: driftLogs, error: driftError } = await supabase
    .from('focus_drift_log')
    .select('*')
    .eq('session_id', sessionId)
    .order('started_at', { ascending: true });

  if (driftError) {
    throw new Error(`Failed to fetch drift logs: ${driftError.message}`);
  }

  const driftTypeCounts: Record<DriftType, number> = {
    offshoot: 0,
    side_project: 0,
    external_distraction: 0,
  };

  driftLogs.forEach((drift) => {
    driftTypeCounts[drift.drift_type]++;
  });

  let biggestDriftType: DriftType | null = null;
  let maxCount = 0;

  Object.entries(driftTypeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count;
      biggestDriftType = type as DriftType;
    }
  });

  return {
    session,
    totalDrifts: session.drift_count,
    totalDistractions: session.distraction_count,
    focusScore: session.focus_score || 0,
    biggestDriftType,
    timeline: events || [],
    driftDetails: driftLogs || [],
  };
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: session, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused'])
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active session: ${error.message}`);
  }

  return session;
}

export async function pauseFocusSession(
  sessionId: string,
  reason: string
): Promise<FocusSession> {
  const { data: session, error: updateError } = await supabase
    .from('focus_sessions')
    .update({ status: 'paused' })
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to pause session: ${updateError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'pause',
      metadata: { reason },
    });

  if (eventError) {
    throw new Error(`Failed to log pause event: ${eventError.message}`);
  }

  return session;
}

export async function resumeFocusSession(sessionId: string): Promise<FocusSession> {
  const { data: session, error: updateError } = await supabase
    .from('focus_sessions')
    .update({ status: 'active' })
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to resume session: ${updateError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'resume',
      metadata: {},
    });

  if (eventError) {
    throw new Error(`Failed to log resume event: ${eventError.message}`);
  }

  return session;
}

export async function getFocusSessionHistory(
  limit: number = 20
): Promise<FocusSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch session history: ${error.message}`);
  }

  return sessions || [];
}

export async function extendFocusSession(
  sessionId: string,
  additionalMinutes: number
): Promise<FocusSession> {
  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error('Focus session not found');
  }

  const newIntendedDuration = (session.intended_duration_minutes || 0) + additionalMinutes;

  const { data: updatedSession, error: updateError } = await supabase
    .from('focus_sessions')
    .update({ intended_duration_minutes: newIntendedDuration })
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to extend session: ${updateError.message}`);
  }

  const { error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'resume',
      metadata: {
        action: 'extend',
        additional_minutes: additionalMinutes,
        new_duration: newIntendedDuration
      },
    });

  if (eventError) {
    throw new Error(`Failed to log extension event: ${eventError.message}`);
  }

  return updatedSession;
}

export async function logDistractionStructured(
  input: LogDistractionStructuredInput
): Promise<FocusDistraction> {
  const { sessionId, type, notes } = input;

  const { data: distraction, error: distractionError } = await supabase
    .from('focus_distractions')
    .insert({
      session_id: sessionId,
      type,
      notes: notes || null,
    })
    .select()
    .single();

  if (distractionError) {
    throw new Error(`Failed to log distraction: ${distractionError.message}`);
  }

  await logDistraction({
    sessionId,
    metadata: { type, notes },
  });

  return distraction;
}

export async function logRegulation(
  sessionId: string,
  regulationType: string,
  message: string
): Promise<FocusEvent> {
  const { data: event, error: eventError } = await supabase
    .from('focus_events')
    .insert({
      session_id: sessionId,
      event_type: 'pause',
      metadata: {
        regulation: true,
        regulation_type: regulationType,
        message,
      },
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to log regulation event: ${eventError.message}`);
  }

  return event;
}

export async function generateWeeklyFocusAnalytics(
  userId?: string
): Promise<FocusAnalyticsCache> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) throw new Error('User not authenticated');

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const { data: sessions, error: sessionsError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString());

  if (sessionsError) {
    throw new Error(`Failed to fetch weekly sessions: ${sessionsError.message}`);
  }

  const totalSessions = sessions?.length || 0;
  const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
  const totalMinutes = sessions?.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0) || 0;
  const avgFocusScore = completedSessions > 0
    ? sessions?.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.focus_score || 0), 0) / completedSessions
    : null;
  const totalDrifts = sessions?.reduce((sum, s) => sum + s.drift_count, 0) || 0;
  const totalDistractions = sessions?.reduce((sum, s) => sum + s.distraction_count, 0) || 0;
  const driftRate = totalSessions > 0 ? totalDrifts / totalSessions : null;
  const distractionRate = totalSessions > 0 ? totalDistractions / totalSessions : null;

  const { data: analytics, error: analyticsError } = await supabase
    .from('focus_analytics_cache')
    .upsert({
      user_id: targetUserId,
      week_start: weekStart.toISOString().split('T')[0],
      average_focus_score: avgFocusScore,
      total_minutes: totalMinutes,
      drift_rate: driftRate,
      distraction_rate: distractionRate,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,week_start',
    })
    .select()
    .single();

  if (analyticsError) {
    throw new Error(`Failed to generate analytics cache: ${analyticsError.message}`);
  }

  return analytics;
}

export async function getFocusAnalytics(
  weeksBack: number = 4
): Promise<FocusAnalyticsCache[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeksBack * 7));

  const { data: analytics, error } = await supabase
    .from('focus_analytics_cache')
    .select('*')
    .eq('user_id', user.id)
    .gte('week_start', startDate.toISOString().split('T')[0])
    .order('week_start', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  return analytics || [];
}
