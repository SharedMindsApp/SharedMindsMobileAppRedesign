/**
 * Intelligent Todo Service (Phase 1)
 * 
 * AI-powered task breakdown service for ADHD-friendly task management.
 * Phase 1: Simple, reliable, explicit context only. No learning, no inference.
 */

import { aiExecutionService } from './guardrails/ai/aiExecutionService';
import { supabase } from './supabase';
import type { TaskBreakdownContext } from './planner/taskBreakdownService';

export interface TaskBreakdownResult {
  taskTitle: string;
  microSteps: string[];
  context?: TaskBreakdownContext;
  encouragementMessage?: string;
}

export interface MicroStep {
  id: string;
  todo_id: string;
  title: string;
  order_index: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface AIBreakdownContext {
  taskTitle: string;
  context?: TaskBreakdownContext;
  userId: string;
}

interface AIBreakdownResponse {
  microSteps: Array<{
    title: string;
  }>;
  encouragementMessage?: string;
}

/**
 * Generate AI-powered task breakdown
 * Phase 1: Explicit context only, no inference, no patterns
 */
export async function generateAITaskBreakdown(
  params: {
    taskTitle: string;
    context?: TaskBreakdownContext;
    userId: string;
  }
): Promise<TaskBreakdownResult> {
  const aiContext: AIBreakdownContext = {
    taskTitle: params.taskTitle,
    context: params.context,
    userId: params.userId,
  };

  return await callAIBreakdownService(aiContext);
}

/**
 * Build ADHD-friendly system prompt for task breakdown
 */
function buildBreakdownPrompt(context: AIBreakdownContext): string {
  const contextDescription = context.context 
    ? getContextDescription(context.context)
    : 'general difficulty';

  return `You help people with ADHD break down tasks so they feel safe to start.

Rules:
- Steps must be extremely small and concrete
- Avoid perfection or full completion framing
- Include permission to stop
- Use neutral, encouraging language
- 3-6 steps maximum

Context:
- Task: "${context.taskTitle}"
- User says: "${contextDescription}"

Generate micro-steps that:
- Are actionable and specific
- Build on each other logically
- Include at least one "permission to stop" step
- Use simple, clear language

${context.context === 'emotional_resistance' 
  ? 'Include acknowledgment and permission language.' 
  : ''}
${context.context === 'too_big' || context.context === 'dont_know_where_to_start'
  ? 'Keep it ultra-simple - maximum 4 steps.' 
  : ''}

Respond with JSON only:
{
  "microSteps": [
    { "title": "Very small actionable step" }
  ],
  "encouragementMessage": "Optional, gentle"
}`;
}

function getContextDescription(context: TaskBreakdownContext): string {
  const descriptions: Record<TaskBreakdownContext, string> = {
    'too_big': 'This feels too big',
    'dont_know_where_to_start': "I don't know where to start",
    'boring_low_energy': 'I have low energy',
    'time_pressure': 'I feel time pressure',
    'emotional_resistance': 'This feels emotionally difficult',
  };
  return descriptions[context] || 'general difficulty';
}

/**
 * Call AI service to generate breakdown
 */
async function callAIBreakdownService(
  context: AIBreakdownContext
): Promise<TaskBreakdownResult> {
  const systemPrompt = buildBreakdownPrompt(context);
  const userPrompt = `Break down this task: "${context.taskTitle}"`;

  try {
    const aiResponse = await aiExecutionService.execute({
      userId: context.userId,
      intent: 'breakdown_task',
      featureKey: 'intelligent_todo',
      surfaceType: 'personal',
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 800, // Enough for 6 steps + encouragement
    });

    const parsed = parseAIResponse(aiResponse.text);
    
    return {
      taskTitle: context.taskTitle,
      microSteps: parsed.microSteps.map(step => step.title),
      context: context.context,
      encouragementMessage: parsed.encouragementMessage,
    };
  } catch (error) {
    console.error('AI breakdown failed:', error);
    
    // Fallback: Use rule-based breakdown (existing service)
    const { generateTaskBreakdown } = await import('./planner/taskBreakdownService');
    const fallback = await generateTaskBreakdown(
      context.taskTitle,
      context.context || null,
      undefined, // No energy mode in Phase 1
      undefined  // No user patterns in Phase 1
    );
    
    if (!fallback || !fallback.microSteps || fallback.microSteps.length === 0) {
      return {
        taskTitle: context.taskTitle,
        microSteps: ['Do the first small step', 'See if that\'s enough'],
        context: context.context,
      };
    }
    
    return {
      taskTitle: fallback.taskTitle,
      microSteps: fallback.microSteps,
      context: fallback.context,
    };
  }
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(aiText: string): AIBreakdownResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!parsed.microSteps || !Array.isArray(parsed.microSteps)) {
      throw new Error('Invalid microSteps array');
    }
    
    // Ensure all steps have required fields (title only)
    const validatedSteps = parsed.microSteps.map((step: any, index: number) => ({
      title: step.title || `Step ${index + 1}`,
    }));
    
    // Validate step count (3-6 for Phase 1)
    if (validatedSteps.length < 3 || validatedSteps.length > 6) {
      console.warn(`Step count ${validatedSteps.length} outside recommended range (3-6)`);
    }
    
    return {
      microSteps: validatedSteps,
      encouragementMessage: parsed.encouragementMessage,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw error; // Let caller handle fallback
  }
}

/**
 * Save task breakdown to database
 * Phase 1: Save breakdown only, no learning
 */
export async function saveTaskBreakdown(
  todoId: string,
  breakdown: TaskBreakdownResult,
  userId: string
): Promise<void> {
  // Update todo with breakdown flag
  const { data: todo, error: todoError } = await supabase
    .from('personal_todos')
    .update({
      has_breakdown: true,
      breakdown_context: breakdown.context || null,
      breakdown_generated_at: new Date().toISOString(),
    })
    .eq('id', todoId)
    .select()
    .single();
  
  if (todoError) throw todoError;
  
  // Save micro-steps (Phase 1 - no time estimates)
  const microStepsToInsert = breakdown.microSteps.map((stepTitle, index) => ({
    todo_id: todoId,
    title: stepTitle,
    order_index: index + 1,
    completed: false,
  }));
  
  const { error: stepsError } = await supabase
    .from('todo_micro_steps')
    .insert(microStepsToInsert);
  
  if (stepsError) throw stepsError;
  
  // Phase 1: That's it. No learning, no patterns, no optimization.
}

/**
 * Get breakdown for a task
 */
export async function getTaskBreakdown(todoId: string): Promise<MicroStep[]> {
  const { data, error } = await supabase
    .from('todo_micro_steps')
    .select('*')
    .eq('todo_id', todoId)
    .order('order_index', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Complete a micro-step
 */
export async function completeMicroStep(microStepId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_micro_steps')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', microStepId);
  
  if (error) throw error;
}

/**
 * Uncomplete a micro-step
 */
export async function uncompleteMicroStep(microStepId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_micro_steps')
    .update({
      completed: false,
      completed_at: null,
    })
    .eq('id', microStepId);
  
  if (error) throw error;
}

/**
 * Update a micro-step title
 */
export async function updateMicroStep(
  microStepId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('todo_micro_steps')
    .update({ title })
    .eq('id', microStepId);
  
  if (error) throw error;
}

/**
 * Delete a micro-step
 */
export async function deleteMicroStep(microStepId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_micro_steps')
    .delete()
    .eq('id', microStepId);
  
  if (error) throw error;
}

/**
 * Add a new micro-step to a task
 */
export async function addMicroStep(
  todoId: string,
  title: string,
  orderIndex: number
): Promise<MicroStep> {
  const { data, error } = await supabase
    .from('todo_micro_steps')
    .insert({
      todo_id: todoId,
      title,
      order_index: orderIndex,
      completed: false,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
