/**
 * Task Breakdown Service
 * 
 * Generates humane micro-steps from overwhelming tasks.
 * Adaptive and learns from user patterns.
 * No tracking, no metrics, just cognitive unblocking.
 */

import type { EnergyMode } from './adaptivePlanEngine';

export type TaskBreakdownContext =
  | 'too_big'
  | 'dont_know_where_to_start'
  | 'boring_low_energy'
  | 'time_pressure'
  | 'emotional_resistance';

export interface TaskBreakdownResult {
  taskTitle: string;
  microSteps: string[];
  context?: TaskBreakdownContext;
  taskId?: string; // Guardrails task ID (optional)
  cognitiveLoad?: 'low' | 'medium' | 'high'; // Inferred cognitive load
  adaptedForEnergy?: EnergyMode; // Energy mode used for adaptation
}

export interface UserBreakdownPattern {
  preferredContexts: TaskBreakdownContext[]; // Most common contexts user selects
  averageMicroStepCount: number; // Typical micro-step count user prefers
  cognitiveOverloadLevel: 'low' | 'medium' | 'high'; // Inferred from patterns
}

/**
 * Get user's breakdown patterns from history
 * Analyzes past breakdowns to understand preferences
 */
export async function getUserBreakdownPatterns(
  userId: string
): Promise<UserBreakdownPattern> {
  const { supabase } = await import('../supabase');
  
  // Get last 20 breakdowns (recent patterns)
  const { data, error } = await supabase
    .from('planner_microstep_suggestions')
    .select('context, micro_steps')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    // Default pattern for new users
    return {
      preferredContexts: [],
      averageMicroStepCount: 4,
      cognitiveOverloadLevel: 'medium',
    };
  }

  // Analyze patterns
  const contexts = data
    .filter(item => item.context)
    .map(item => item.context) as TaskBreakdownContext[];
  
  // Count context frequencies
  const contextCounts = contexts.reduce((acc, ctx) => {
    acc[ctx] = (acc[ctx] || 0) + 1;
    return acc;
  }, {} as Record<TaskBreakdownContext, number>);

  // Get most common contexts (top 3)
  const preferredContexts = Object.entries(contextCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([ctx]) => ctx as TaskBreakdownContext);

  // Calculate average micro-step count
  const stepCounts = data.map(item => (item.micro_steps || []).length);
  const averageMicroStepCount = stepCounts.length > 0
    ? Math.round(stepCounts.reduce((a, b) => a + b, 0) / stepCounts.length)
    : 4;

  // Infer cognitive overload level
  // High overload signals: frequent "too_big", "dont_know_where_to_start", "emotional_resistance"
  const overloadSignals = contexts.filter(ctx =>
    ctx === 'too_big' || ctx === 'dont_know_where_to_start' || ctx === 'emotional_resistance'
  ).length;
  
  const overloadRatio = overloadSignals / Math.max(contexts.length, 1);
  let cognitiveOverloadLevel: 'low' | 'medium' | 'high';
  
  if (overloadRatio > 0.6) {
    cognitiveOverloadLevel = 'high';
  } else if (overloadRatio > 0.3) {
    cognitiveOverloadLevel = 'medium';
  } else {
    cognitiveOverloadLevel = 'low';
  }

  return {
    preferredContexts,
    averageMicroStepCount,
    cognitiveOverloadLevel,
  };
}

/**
 * Generate micro-steps from a task title
 * Adaptive based on energy mode, cognitive overload, and user patterns
 */
export async function generateTaskBreakdown(
  taskTitle: string,
  context?: TaskBreakdownContext | null,
  energyMode?: EnergyMode,
  userPatterns?: UserBreakdownPattern
): Promise<TaskBreakdownResult> {
  const title = taskTitle.trim().toLowerCase();
  
  // Determine cognitive load level
  const cognitiveLoad = userPatterns?.cognitiveOverloadLevel || 'medium';
  const adaptedEnergy = energyMode || 'medium';
  
  // Adjust micro-step count based on cognitive load and energy
  const baseStepCount = userPatterns?.averageMicroStepCount || 4;
  let targetStepCount = baseStepCount;
  
  // Reduce steps for high cognitive overload or low energy
  if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
    targetStepCount = Math.max(3, Math.floor(baseStepCount * 0.75));
  } else if (cognitiveLoad === 'low' && adaptedEnergy === 'high') {
    targetStepCount = Math.min(7, Math.ceil(baseStepCount * 1.25));
  }
  
  // Rule-based breakdown patterns
  // These adapt based on cognitive load and energy
  
  // Writing tasks
  if (title.includes('write') || title.includes('report') || title.includes('document')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
      microSteps = [
        'Open the document',
        'Write one sentence',
        'Stop',
      ];
    } else if (cognitiveLoad === 'low' && adaptedEnergy === 'high') {
      microSteps = [
        'Open the document',
        'Write a title',
        'Add 3 bullet points',
        'Write one paragraph',
        'Review what you wrote',
      ];
    } else {
      microSteps = [
        'Open the document',
        'Write a title',
        'Add 3 bullet points',
        'Stop',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Cleaning tasks
  if (title.includes('clean') || title.includes('tidy')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
      microSteps = [
        'Put one thing away',
        'Stop',
      ];
    } else {
      microSteps = [
        'Put dishes in the sink',
        'Wipe one surface',
        'Take rubbish out',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Email/messaging tasks
  if (title.includes('email') || title.includes('message') || title.includes('reply')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
      microSteps = [
        'Open the message',
        'Write one word',
        'Stop',
      ];
    } else {
      microSteps = [
        'Open the message',
        'Write one sentence',
        'Send it',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Planning tasks
  if (title.includes('plan') || title.includes('organize') || title.includes('organise')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high') {
      microSteps = [
        'Write down one thing',
        'Stop',
      ];
    } else {
      microSteps = [
        'Write down one thing',
        'Add a second thing',
        'Pick the first step',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Research tasks
  if (title.includes('research') || title.includes('look up') || title.includes('find')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
      microSteps = [
        'Open one website',
        'Read one sentence',
        'Stop',
      ];
    } else {
      microSteps = [
        'Open one website',
        'Read one paragraph',
        'Write down one thing you learned',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Meeting/preparation tasks
  if (title.includes('prepare') || title.includes('meeting') || title.includes('presentation')) {
    let microSteps: string[];
    
    if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
      microSteps = [
        'Write down one question',
        'Stop',
      ];
    } else {
      microSteps = [
        'Write down one question',
        'Gather one piece of information',
        'Set a reminder',
      ];
    }
    
    return {
      taskTitle,
      microSteps,
      context: context || undefined,
      cognitiveLoad,
      adaptedForEnergy: adaptedEnergy,
    };
  }
  
  // Default generic breakdown
  // Adapt based on context, cognitive load, and energy
  let microSteps: string[];
  
  if (context === 'too_big' || context === 'dont_know_where_to_start') {
    // Highest cognitive load - ultra simple
    if (cognitiveLoad === 'high') {
      microSteps = [
        'Pick one tiny piece',
        'Stop',
      ];
    } else {
      microSteps = [
        'Pick the smallest piece',
        'Do that one thing',
        'Stop',
      ];
    }
  } else if (context === 'boring_low_energy') {
    // Energy-aware breakdown
    if (adaptedEnergy === 'low') {
      microSteps = [
        'Set a 2-minute timer',
        'Do the tiniest part',
        'Stop when timer goes off',
      ];
    } else {
      microSteps = [
        'Set a 5-minute timer',
        'Do just one part',
        'Stop when timer goes off',
      ];
    }
  } else if (context === 'time_pressure') {
    microSteps = [
      'Do the first visible step',
      'Check if that\'s enough',
      'Stop if it is',
    ];
  } else if (context === 'emotional_resistance') {
    // Gentle, permission-giving steps
    microSteps = [
      'Acknowledge it\'s hard',
      'Do the tiniest first step',
      'Stop if you need to',
    ];
  } else {
    // Generic breakdown - adapt to cognitive load
    if (cognitiveLoad === 'high') {
      microSteps = [
        'Do the smallest first step',
        'Stop',
      ];
    } else if (cognitiveLoad === 'low' && adaptedEnergy === 'high') {
      microSteps = [
        'Open what you need',
        'Do the first small thing',
        'Do a second small thing',
        'See if that\'s enough',
      ];
    } else {
      microSteps = [
        'Open what you need',
        'Do the first small thing',
        'See if that\'s enough',
      ];
    }
  }
  
  // Trim to target step count
  if (microSteps.length > targetStepCount) {
    microSteps = microSteps.slice(0, targetStepCount);
  }
  
  return {
    taskTitle,
    microSteps,
    context: context || undefined,
    cognitiveLoad,
    adaptedForEnergy: adaptedEnergy,
  };
}

/**
 * Save breakdown suggestion (optional, user can choose not to)
 */
export async function saveBreakdownSuggestion(
  userId: string,
  breakdown: TaskBreakdownResult
): Promise<string> {
  const { supabase } = await import('../supabase');
  
  const { data, error } = await supabase
    .from('planner_microstep_suggestions')
    .insert({
      user_id: userId,
      task_title: breakdown.taskTitle,
      micro_steps: breakdown.microSteps,
      context: breakdown.context,
      guardrails_task_id: breakdown.taskId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get breakdown suggestions for a task (if saved)
 */
export async function getBreakdownSuggestions(
  userId: string,
  taskId?: string
): Promise<TaskBreakdownResult[]> {
  const { supabase } = await import('../supabase');
  
  let query = supabase
    .from('planner_microstep_suggestions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (taskId) {
    query = query.eq('guardrails_task_id', taskId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching breakdown suggestions:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    taskTitle: item.task_title,
    microSteps: item.micro_steps,
    context: item.context,
    taskId: item.guardrails_task_id,
  }));
}
