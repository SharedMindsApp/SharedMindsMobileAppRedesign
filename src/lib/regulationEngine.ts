import { supabase } from './supabase';
import { logError, logWarning, logInfo } from './errorLogger';
import type {
  RegulationState,
  RegulationEvent,
  RegulationEventType,
  StrictnessLevel,
  StrictnessLevelConfig,
  BehaviorEnforcement,
  TrustImpact,
  EscalationRules,
  DeescalationRules,
} from './regulationTypes';

const TRUST_IMPACT: TrustImpact = {
  positive: {
    taskCompleted: 3,
    focusSessionCompleted: 5,
    milestoneHit: 10,
    consistencyWin: 7,
    returningAfterInactivity: 2,
  },
  negative: {
    taskIgnored: -2,
    sessionDrift: -3,
    deadlineMissed: -5,
    sessionAbandoned: -4,
    offshootOveruse: -2,
    sideProjectOveruse: -3,
  },
};

const ESCALATION_RULES: EscalationRules = {
  ruleBreakThreshold: 5,
  driftEventsThreshold: 8,
  missedDeadlinesThreshold: 3,
  consecutiveLossesThreshold: 3,
  dayWindow: 7,
};

const DEESCALATION_RULES: DeescalationRules = {
  consecutiveWinsThreshold: 3,
  trustScoreIncrease: 15,
  focusSessionsRequired: 3,
  tasksCompletedRequired: 5,
};

export const STRICTNESS_LEVELS: StrictnessLevelConfig[] = [
  {
    level: 1,
    name: 'Chill Mode',
    description: 'You\'re vibing! Keep doing what you\'re doing.',
    trustScoreRange: [80, 100],
    color: 'bg-green-500',
    icon: '😎',
    behaviors: {
      roadmap: ['All tracks visible', 'Full flexibility'],
      taskFlow: ['Add unlimited tasks', 'No restrictions'],
      mindMesh: ['Full access', 'Explore freely'],
      offshoots: ['Unlimited ideas', 'Capture everything'],
      sideProjects: ['Switch freely', 'Full creativity'],
      focus: ['Soft nudges only', 'Gentle encouragement'],
    },
    escalationMessage: '',
    deescalationMessage: 'Welcome back to Chill Mode! You earned this freedom.',
    mainMessage: 'You\'re crushing it! Everything is unlocked. Keep this momentum going!',
  },
  {
    level: 2,
    name: 'Helpful but Firm',
    description: 'I see you. Let\'s stay focused together.',
    trustScoreRange: [60, 79],
    color: 'bg-blue-500',
    icon: '🙂',
    behaviors: {
      roadmap: ['Priority tracks highlighted', 'Suggestions enabled'],
      taskFlow: ['Task priority hints', 'Gentle reminders'],
      mindMesh: ['Full access', 'Context warnings'],
      offshoots: ['Encouraged with limits', 'Capture with awareness'],
      sideProjects: ['Switching warnings', 'Context reminders'],
      focus: ['Regular check-ins', 'Progress tracking'],
    },
    escalationMessage: 'Things are getting a bit scattered. Let me help you tighten up.',
    deescalationMessage: 'Nice work getting back on track!',
    mainMessage: 'You\'re doing well! I\'m here to help keep things organized.',
  },
  {
    level: 3,
    name: 'Serious Mode',
    description: 'Time to focus. No judgment, just structure.',
    trustScoreRange: [40, 59],
    color: 'bg-yellow-500',
    icon: '😐',
    behaviors: {
      roadmap: ['Low-priority minimized', 'Essential focus'],
      taskFlow: ['Priority tasks highlighted', 'Skip warnings'],
      mindMesh: ['Access with reminders', 'Stay on track prompts'],
      offshoots: ['Soft limit warnings', 'Queue suggestions'],
      sideProjects: ['Context switch warnings', 'Main project reminders'],
      focus: ['Stronger drift alerts', 'Accountability nudges'],
    },
    escalationMessage: 'Alright friend, we\'re stepping it up a bit. Let\'s refocus together.',
    deescalationMessage: 'Great job pulling things back together!',
    mainMessage: 'We\'re tightening things up. No stress, just structure.',
  },
  {
    level: 4,
    name: 'Strict Mode',
    description: 'Real talk: we need to rebuild momentum.',
    trustScoreRange: [20, 39],
    color: 'bg-orange-500',
    icon: '😬',
    behaviors: {
      roadmap: ['Simplified view', 'Core tracks only'],
      taskFlow: ['Complete 1 before adding more', 'Task gate enabled'],
      mindMesh: ['Temp locked', 'Unlock with progress'],
      offshoots: ['3 per day limit', 'Queue enforcement'],
      sideProjects: ['Locked until progress', 'Main project focus'],
      focus: ['Mandatory accountability', 'Drift consequences'],
    },
    escalationMessage: 'Hey, no shame here. Things got messy. Let\'s clean up together.',
    deescalationMessage: 'You did it! Things are looking much better.',
    mainMessage: 'We\'re in rebuild mode. One step at a time. You got this.',
  },
  {
    level: 5,
    name: 'Guardian Mode',
    description: 'Full support activated. Let\'s reset together.',
    trustScoreRange: [0, 19],
    color: 'bg-red-500',
    icon: '🛡️',
    behaviors: {
      roadmap: ['Essential only', 'Maximum simplification'],
      taskFlow: ['One task unlocked', 'Sequential completion'],
      mindMesh: ['Fully locked', 'Regain control first'],
      offshoots: ['1 per day limit', 'Hard enforcement'],
      sideProjects: ['Fully locked', 'Main project only'],
      focus: ['Mandatory Reality Check', 'Full accountability'],
    },
    escalationMessage: 'Okay friend. Guardian Mode activated. No panic, no shame. We rebuild.',
    deescalationMessage: 'Incredible work! You fought your way back. So proud.',
    mainMessage: 'We\'re simplifying everything. One clear path forward. You\'ve got this.',
  },
];

export async function getRegulationState(
  userId?: string,
  projectId?: string | null
): Promise<RegulationState | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      // Missing auth session is expected during initial load - log as info, not error
      const isMissingSession = authError.message.includes('Auth session missing') || 
                               authError.message.includes('JWT expired') ||
                               authError.message.includes('session');
      
      if (isMissingSession) {
        // Expected scenario - user not authenticated yet, just return null
        return null;
      }
      
      // Other auth errors are actual errors
      logError(
        'Failed to get user for regulation state',
        new Error(`Auth error: ${authError.message}`),
        {
          component: 'RegulationEngine',
          action: 'getRegulationState',
          userId,
          projectId: projectId || null,
          authError: authError.message,
        }
      );
      throw new Error(`Auth error: ${authError.message}`);
    }
    
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      // No user ID is expected when user is not authenticated - just return null
      return null;
    }

    let query = supabase
      .from('regulation_state')
      .select('*')
      .eq('user_id', targetUserId);

    if (projectId) {
      query = query.eq('master_project_id', projectId);
    } else {
      query = query.is('master_project_id', null);
    }

    // Order by updated_at descending to get the most recent, then limit to 1
    // This handles cases where there might be duplicate rows
    query = query.order('updated_at', { ascending: false }).limit(1);

    const { data, error } = await query.maybeSingle();

    if (error) {
      // 404 / 42P01 means the table doesn't exist yet — treat as empty, not as a crash
      const code = (error as any)?.code;
      const status = (error as any)?.status ?? (error as any)?.statusCode;
      if (code === '42P01' || status === 404) {
        console.warn('[RegulationEngine] regulation_state table not found — skipping');
        return null;
      }
      logError(
        'Failed to fetch regulation state from database',
        error,
        {
          component: 'RegulationEngine',
          action: 'getRegulationState',
          userId: targetUserId,
          projectId: projectId || null,
        }
      );
      throw error;
    }

    if (!data) {
      logInfo('No regulation state found, initializing new state', {
        component: 'RegulationEngine',
        action: 'getRegulationState',
        userId: targetUserId,
        projectId: projectId || null,
      });
      return await initializeRegulationState(targetUserId, projectId);
    }

    return data;
  } catch (error) {
    // Re-throw after logging
    throw error;
  }
}

export async function initializeRegulationState(
  userId: string,
  projectId?: string | null
): Promise<RegulationState> {
  const { data, error } = await supabase
    .from('regulation_state')
    .insert({
      user_id: userId,
      master_project_id: projectId || null,
      current_level: 1,
      trust_score: 75,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function logRegulationEvent(
  eventType: RegulationEventType,
  options: {
    userId?: string;
    projectId?: string | null;
    severity?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = options.userId || user?.id;

  if (!targetUserId) throw new Error('User not authenticated');

  const trustImpact = calculateTrustImpact(eventType);

  const { error } = await supabase
    .from('regulation_events')
    .insert({
      user_id: targetUserId,
      master_project_id: options.projectId || null,
      event_type: eventType,
      severity: options.severity || 1,
      impact_on_trust: trustImpact,
      metadata: options.metadata || {},
    });

  if (error) throw error;

  await updateRegulationState(targetUserId, options.projectId);
}

function calculateTrustImpact(eventType: RegulationEventType): number {
  switch (eventType) {
    case 'task_completed':
      return TRUST_IMPACT.positive.taskCompleted;
    case 'focus_completed':
      return TRUST_IMPACT.positive.focusSessionCompleted;
    case 'milestone_hit':
      return TRUST_IMPACT.positive.milestoneHit;
    case 'consistency_win':
      return TRUST_IMPACT.positive.consistencyWin;
    case 'task_ignored':
      return TRUST_IMPACT.negative.taskIgnored;
    case 'session_drift':
      return TRUST_IMPACT.negative.sessionDrift;
    case 'deadline_missed':
      return TRUST_IMPACT.negative.deadlineMissed;
    case 'session_abandoned':
      return TRUST_IMPACT.negative.sessionAbandoned;
    case 'offshoot_overuse':
      return TRUST_IMPACT.negative.offshootOveruse;
    case 'side_project_overuse':
      return TRUST_IMPACT.negative.sideProjectOveruse;
    default:
      return 0;
  }
}

export async function updateRegulationState(
  userId: string,
  projectId?: string | null
): Promise<RegulationState> {
  const state = await getRegulationState(userId, projectId);
  if (!state) throw new Error('Regulation state not found');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let eventsQuery = supabase
    .from('regulation_events')
    .select('*')
    .eq('user_id', userId);

  if (projectId) {
    eventsQuery = eventsQuery.eq('master_project_id', projectId);
  } else {
    eventsQuery = eventsQuery.is('master_project_id', null);
  }

  const { data: recentEvents, error: eventsError } = await eventsQuery
    .gte('created_at', sevenDaysAgo.toISOString());

  if (eventsError) throw eventsError;

  const metrics = calculateMetrics(recentEvents || []);
  const newTrustScore = calculateNewTrustScore(state, metrics, recentEvents || []);
  const oldLevel = state.current_level;

  const { data: updatedState, error: updateError } = await supabase
    .from('regulation_state')
    .update({
      trust_score: newTrustScore,
      drift_events_last_7d: metrics.driftEvents,
      focus_interruptions_last_7d: metrics.focusInterruptions,
      missed_deadlines_last_7d: metrics.missedDeadlines,
      offshoot_creation_rate_7d: metrics.offshootCreations,
      side_project_switches_7d: metrics.sideProjectSwitches,
      tasks_completed_7d: metrics.tasksCompleted,
      focus_sessions_completed_7d: metrics.focusSessionsCompleted,
      last_calculated_at: new Date().toISOString(),
    })
    .eq('id', state.id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (updatedState.current_level !== oldLevel) {
    await logLevelChange(userId, projectId, oldLevel, updatedState.current_level);
  }

  return updatedState;
}

function calculateMetrics(events: RegulationEvent[]): {
  driftEvents: number;
  focusInterruptions: number;
  missedDeadlines: number;
  offshootCreations: number;
  sideProjectSwitches: number;
  tasksCompleted: number;
  focusSessionsCompleted: number;
} {
  return {
    driftEvents: events.filter((e) => e.event_type === 'session_drift').length,
    focusInterruptions: events.filter((e) => e.event_type === 'session_abandoned').length,
    missedDeadlines: events.filter((e) => e.event_type === 'deadline_missed').length,
    offshootCreations: events.filter((e) => e.event_type === 'offshoot_overuse').length,
    sideProjectSwitches: events.filter((e) => e.event_type === 'side_project_overuse').length,
    tasksCompleted: events.filter((e) => e.event_type === 'task_completed').length,
    focusSessionsCompleted: events.filter((e) => e.event_type === 'focus_completed').length,
  };
}

function calculateNewTrustScore(
  state: RegulationState,
  metrics: ReturnType<typeof calculateMetrics>,
  events: RegulationEvent[]
): number {
  let score = state.trust_score;

  events.forEach((event) => {
    score += event.impact_on_trust;
  });

  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

async function logLevelChange(
  userId: string,
  projectId: string | null | undefined,
  oldLevel: StrictnessLevel,
  newLevel: StrictnessLevel
): Promise<void> {
  const eventType: RegulationEventType =
    newLevel > oldLevel ? 'level_escalated' : 'level_deescalated';

  await supabase.from('regulation_events').insert({
    user_id: userId,
    master_project_id: projectId || null,
    event_type: eventType,
    severity: Math.abs(newLevel - oldLevel),
    impact_on_trust: 0,
    metadata: {
      old_level: oldLevel,
      new_level: newLevel,
      old_level_name: STRICTNESS_LEVELS[oldLevel - 1].name,
      new_level_name: STRICTNESS_LEVELS[newLevel - 1].name,
    },
  });
}

export function getLevelConfig(level: StrictnessLevel): StrictnessLevelConfig {
  return STRICTNESS_LEVELS[level - 1];
}

export function getBehaviorEnforcement(level: StrictnessLevel): BehaviorEnforcement {
  const config = getLevelConfig(level);

  return {
    canCreateOffshootIdea: level <= 3,
    canSwitchToSideProject: level <= 2,
    canAccessMindMesh: level <= 3,
    canAddNewTask: level <= 3,
    canAddNewTrack: level <= 2,
    canSkipTask: level <= 2,
    offshotsPerDayLimit: level === 4 ? 3 : level === 5 ? 1 : null,
    tasksRequiredToUnlock: level >= 4 ? 1 : 0,
    showSimplifiedRoadmap: level >= 4,
    requireRealityCheck: level === 5,
    warningMessage:
      level >= 3
        ? `${config.name}: ${config.mainMessage}`
        : null,
  };
}

export async function checkBehaviorAllowed(
  behavior: keyof BehaviorEnforcement,
  userId?: string,
  projectId?: string | null
): Promise<{ allowed: boolean; message: string | null; level: StrictnessLevel }> {
  const state = await getRegulationState(userId, projectId);
  if (!state) {
    return { allowed: true, message: null, level: 1 };
  }

  const enforcement = getBehaviorEnforcement(state.current_level);
  const config = getLevelConfig(state.current_level);

  if (behavior === 'canCreateOffshootIdea' && !enforcement.canCreateOffshootIdea) {
    if (state.current_level === 4) {
      return {
        allowed: false,
        message: 'You can create up to 3 Offshoot Ideas per day in Strict Mode. Queue it for later!',
        level: state.current_level,
      };
    } else if (state.current_level === 5) {
      return {
        allowed: false,
        message: 'Guardian Mode: Focus on your main project first. 1 offshoot per day max.',
        level: state.current_level,
      };
    }
  }

  if (behavior === 'canAccessMindMesh' && !enforcement.canAccessMindMesh) {
    return {
      allowed: false,
      message: 'Mind Mesh is temporarily locked. Complete a task to unlock it!',
      level: state.current_level,
    };
  }

  if (behavior === 'canAddNewTask' && !enforcement.canAddNewTask) {
    return {
      allowed: false,
      message: 'Finish your current task before adding more. You got this!',
      level: state.current_level,
    };
  }

  const allowed = enforcement[behavior] as boolean;
  return {
    allowed,
    message: allowed ? null : `${config.name}: This action is currently restricted`,
    level: state.current_level,
  };
}

export async function getRecentEvents(
  userId?: string,
  projectId?: string | null,
  limit: number = 20
): Promise<RegulationEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) throw new Error('User not authenticated');

  let query = supabase
    .from('regulation_events')
    .select('*')
    .eq('user_id', targetUserId);

  if (projectId) {
    query = query.eq('master_project_id', projectId);
  } else {
    query = query.is('master_project_id', null);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function useOverride(
  userId?: string,
  projectId?: string | null
): Promise<{ allowed: boolean; message: string }> {
  const state = await getRegulationState(userId, projectId);
  if (!state) {
    return { allowed: false, message: 'Regulation state not found' };
  }

  if (state.current_level === 5) {
    return {
      allowed: false,
      message: 'Overrides are not available in Guardian Mode. Let\'s build back together!',
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const events = await getRecentEvents(userId, projectId, 100);
  const overridesToday = events.filter(
    (e) =>
      e.event_type === 'override_used' &&
      e.created_at.split('T')[0] === today
  );

  if (overridesToday.length > 0) {
    return {
      allowed: false,
      message: 'You\'ve already used your daily override. Try again tomorrow!',
    };
  }

  await logRegulationEvent('override_used', {
    userId,
    projectId,
    metadata: { level: state.current_level },
  });

  return {
    allowed: true,
    message: 'Override activated! Use this time wisely.',
  };
}
