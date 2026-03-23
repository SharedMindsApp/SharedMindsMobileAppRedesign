import { supabase } from '../supabase';
import type { SignalDefinition, ActiveSignal, SignalContext, SignalKey, SignalIntensity } from './signalTypes';

export async function getActiveSignals(userId: string): Promise<ActiveSignal[]> {
  const { data, error } = await supabase
    .from('regulation_active_signals')
    .select('*')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('detected_at', { ascending: false });

  if (error) {
    console.error('[SignalService] Error fetching active signals:', error);
    return [];
  }

  return data || [];
}

export async function getSignalDefinitions(): Promise<SignalDefinition[]> {
  const { data, error } = await supabase
    .from('regulation_signal_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[SignalService] Error fetching signal definitions:', error);
    return [];
  }

  return data || [];
}

export async function getSignalById(userId: string, signalId: string): Promise<ActiveSignal | null> {
  const { data, error } = await supabase
    .from('regulation_active_signals')
    .select('*')
    .eq('user_id', userId)
    .eq('id', signalId)
    .maybeSingle();

  if (error) {
    console.error('[SignalService] Error fetching signal by id:', error);
    return null;
  }

  return data;
}

export async function dismissSignal(userId: string, signalId: string): Promise<void> {
  const { error } = await supabase
    .from('regulation_active_signals')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', signalId)
    .eq('user_id', userId);

  if (error) {
    console.error('[SignalService] Error dismissing signal:', error);
    throw error;
  }
}

export async function computeSignalsForUser(context: SignalContext): Promise<void> {
  const { userId, sessionId } = context;

  await checkRapidContextSwitching(userId, sessionId);
  await checkRunawayScopeExpansion(userId, sessionId);
  await checkFragmentedFocusSession(userId, sessionId);
  await checkProlongedInactivityGap(userId, sessionId);
  await checkHighTaskIntakeWithoutCompletion(userId, sessionId);
}

async function checkRapidContextSwitching(userId: string, sessionId?: string): Promise<void> {
  const timeWindowMinutes = 20;
  const minSwitches = 5;
  const lookbackTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

  const contextSwitches: any[] = [];

  const { data: projectOpens } = await supabase
    .from('master_projects')
    .select('id, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', lookbackTime)
    .order('updated_at', { ascending: false });

  if (projectOpens && projectOpens.length >= minSwitches) {
    const uniqueProjects = new Set(projectOpens.map(p => p.id));
    if (uniqueProjects.size >= minSwitches) {
      const intensity: SignalIntensity =
        uniqueProjects.size >= 10 ? 'high' :
        uniqueProjects.size >= 7 ? 'medium' :
        'low';

      await createSignal({
        userId,
        sessionId,
        signalKey: 'rapid_context_switching',
        title: 'You\'ve moved between several things quickly',
        description: `In the last ${timeWindowMinutes} minutes, you moved between several projects and tracks without settling on one for long.`,
        explanationWhy: 'This signal appears when you move between different contexts (projects, tracks, or focus areas) without settling on one for long.\n\nWhat counts as a context: Opening a project, selecting a track, or starting a focus session.\n\nTimeframe used: The last 20 minutes of activity.\n\nWhy this is shown: This pattern is common during exploration, idea capture, or when feeling overwhelmed. It\'s not a problem to fix—just something you might want to be aware of.',
        contextData: { switches: uniqueProjects.size, timeWindowMinutes },
        expiresInMinutes: 60,
        intensity,
      });
    }
  }
}

async function checkRunawayScopeExpansion(userId: string, sessionId?: string): Promise<void> {
  const minAdditions = 5;
  const lookbackTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let additionCount = 0;

  const { count: sideProjectCount } = await supabase
    .from('side_projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', lookbackTime);

  const { count: offshootCount } = await supabase
    .from('offshoot_ideas')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', lookbackTime);

  const { count: trackCount } = await supabase
    .from('guardrails_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', lookbackTime);

  additionCount = (sideProjectCount || 0) + (offshootCount || 0) + (trackCount || 0);

  if (additionCount >= minAdditions) {
    const intensity: SignalIntensity =
      additionCount >= 15 ? 'high' :
      additionCount >= 10 ? 'medium' :
      'low';

    await createSignal({
      userId,
      sessionId,
      signalKey: 'runaway_scope_expansion',
      title: 'Your project grew quickly in one session',
      description: 'This session added several new ideas and project elements in a short time.',
      explanationWhy: 'This signal appears when you add many new elements (side projects, offshoot ideas, tracks, or roadmap items) in a short time without completing tasks or entering focus mode.\n\nWhat triggers this: Multiple creations of new project elements within a single session.\n\nWhy this is shown: Expansion is sometimes intentional (ideation mode). Sometimes it\'s a sign of excitement or overwhelm. Nothing is blocked or undone—this is just visibility.',
      contextData: { additionCount, sideProjectCount, offshootCount, trackCount },
      expiresInMinutes: 120,
      intensity,
    });
  }
}

async function checkFragmentedFocusSession(userId: string, sessionId?: string): Promise<void> {
  const minDurationMinutes = 5;
  const lookbackTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: recentSessions } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', lookbackTime)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentSessions && recentSessions.length > 0) {
    const fragmentedSessions = recentSessions.filter((session: any) => {
      if (!session.ended_at) return false;
      const durationMs = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
      const durationMinutes = durationMs / (1000 * 60);
      return durationMinutes < minDurationMinutes;
    });

    if (fragmentedSessions.length > 0) {
      const intensity: SignalIntensity =
        fragmentedSessions.length >= 3 ? 'high' :
        fragmentedSessions.length >= 2 ? 'medium' :
        'low';

      await createSignal({
        userId,
        sessionId,
        signalKey: 'fragmented_focus_session',
        title: 'Focus was started, but interrupted',
        description: 'A focus session started but didn\'t settle before switching to something else.',
        explanationWhy: 'This signal appears when you start Focus Mode but exit or switch contexts shortly after.\n\nWhat counts as fragmented: Starting focus mode, then exiting within a few minutes or switching to a different project.\n\nWhy this is shown: Focus mode is optional and early exits are normal. Your context or priorities may have changed. This is just a reflection of what happened.',
        contextData: { fragmentedCount: fragmentedSessions.length },
        expiresInMinutes: 60,
        intensity,
      });
    }
  }
}

async function checkProlongedInactivityGap(userId: string, sessionId?: string): Promise<void> {
  const minGapDays = 3;
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_seen_at')
    .eq('user_id', userId)
    .single();

  if (profile && profile.last_seen_at) {
    const lastSeenMs = new Date(profile.last_seen_at).getTime();
    const nowMs = Date.now();
    const gapDays = (nowMs - lastSeenMs) / (1000 * 60 * 60 * 24);

    if (gapDays >= minGapDays) {
      const { data: existingSignal } = await supabase
        .from('regulation_active_signals')
        .select('id')
        .eq('user_id', userId)
        .eq('signal_key', 'prolonged_inactivity_gap')
        .is('dismissed_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!existingSignal) {
        const intensity: SignalIntensity =
          gapDays >= 14 ? 'high' :
          gapDays >= 7 ? 'medium' :
          'low';

        await createSignal({
          userId,
          sessionId,
          signalKey: 'prolonged_inactivity_gap',
          title: 'There was a long pause in activity',
          description: 'There was a gap between your recent activity and earlier sessions.',
          explanationWhy: 'This signal appears after you return to the app following a period of no activity.\n\nWhat counts as a gap: No meaningful interactions for several days, followed by re-entry.\n\nWhy this is shown: Life interruptions are normal. Illness, holidays, burnout, and life events happen. This is not treated as abandonment—just acknowledgment that time passed. Welcome back.',
          contextData: { gapDays: Math.floor(gapDays) },
          expiresInMinutes: 1440,
          intensity,
        });
      }
    }
  }
}

async function checkHighTaskIntakeWithoutCompletion(userId: string, sessionId?: string): Promise<void> {
  const minTasksCreated = 5;
  const maxTasksCompleted = 1;
  const timeWindowHours = 24;
  const lookbackTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();

  const { data: createdTasks } = await supabase
    .from('roadmap_items')
    .select('id')
    .eq('type', 'task')
    .gte('created_at', lookbackTime);

  const { data: completedTasks } = await supabase
    .from('roadmap_items')
    .select('id')
    .eq('type', 'task')
    .eq('status', 'completed')
    .gte('updated_at', lookbackTime);

  const createdCount = createdTasks?.length || 0;
  const completedCount = completedTasks?.length || 0;

  if (createdCount >= minTasksCreated && completedCount <= maxTasksCompleted) {
    const ratio = completedCount / (createdCount || 1);
    const intensity: SignalIntensity =
      ratio < 0.1 && createdCount >= 10 ? 'high' :
      ratio < 0.2 ? 'medium' :
      'low';

    await createSignal({
      userId,
      sessionId,
      signalKey: 'high_task_intake_without_completion',
      title: 'Many tasks added, few finished',
      description: 'Several tasks were added recently, with few marked complete.',
      explanationWhy: 'This signal appears when several tasks are created without many being marked complete.\n\nWhat triggers this: Adding multiple tasks in a session or day, with few or none marked as done.\n\nWhy this is shown: Capturing tasks is often helpful and necessary. Completion may happen later, or tasks may be moved to other systems. This is about visibility, not judgment.',
      contextData: { tasksCreated: createdCount, tasksCompleted: completedCount },
      expiresInMinutes: 240,
      intensity,
    });
  }
}

interface CreateSignalParams {
  userId: string;
  sessionId?: string;
  signalKey: SignalKey;
  title: string;
  description: string;
  explanationWhy: string;
  contextData: Record<string, any>;
  expiresInMinutes: number;
  intensity?: SignalIntensity;
}

async function createSignal(params: CreateSignalParams): Promise<void> {
  const {
    userId,
    sessionId,
    signalKey,
    title,
    description,
    explanationWhy,
    contextData,
    expiresInMinutes,
    intensity = 'medium',
  } = params;

  const { data: existing } = await supabase
    .from('regulation_active_signals')
    .select('id')
    .eq('user_id', userId)
    .eq('signal_key', signalKey)
    .is('dismissed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return;
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  const { error } = await supabase.from('regulation_active_signals').insert({
    user_id: userId,
    session_id: sessionId,
    signal_key: signalKey,
    title,
    description,
    explanation_why: explanationWhy,
    context_data: contextData,
    expires_at: expiresAt,
    intensity,
  });

  if (error) {
    console.error('[SignalService] Error creating signal:', error);
  }
}
