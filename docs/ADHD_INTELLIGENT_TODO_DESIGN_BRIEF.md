# ADHD-Friendly Intelligent To-Do List: Design Brief

**Document Purpose**: Design brief for transforming the Unified To-Do System into an intelligent, neurodivergent-friendly task management feature that helps users break down overwhelming tasks into manageable micro-tasks.

**Last Updated**: January 2025  
**Status**: Design Brief - Ready for Implementation

---

## Executive Summary

Transform the current to-do list feature into **"Task Navigator"** — an intelligent, ADHD-friendly task management system that proactively helps users break down overwhelming tasks into actionable micro-steps. Unlike traditional to-do lists that create pressure and overwhelm, Task Navigator understands executive function challenges and provides cognitive scaffolding to make tasks feel achievable.

**Core Value Proposition**: "When a task feels too big, we make it smaller. When you don't know where to start, we show you the first step. When you're stuck, we help you get unstuck."

---

## 1. Problem Statement

### Current State Limitations

The existing Unified To-Do System is functional but generic:
- ❌ Tasks remain as monolithic items ("Clean room", "Write report")
- ❌ No intelligent breakdown assistance
- ❌ No context awareness (energy levels, cognitive load, task complexity)
- ❌ No proactive help when users feel stuck
- ❌ Generic priority system doesn't account for executive function challenges
- ❌ No micro-task structure to reduce overwhelm

### User Pain Points (ADHD-Specific)

1. **Task Paralysis**: "Clean room" feels impossible — where do I even start?
2. **Executive Function Overload**: Breaking down tasks requires mental energy users don't have
3. **All-or-Nothing Thinking**: Tasks feel like they must be completed perfectly or not at all
4. **Object Permanence**: Out of sight = out of mind — tasks disappear from awareness
5. **Time Blindness**: Difficulty estimating how long tasks actually take
6. **Emotional Resistance**: Some tasks trigger avoidance due to past failures

### Opportunity

Transform the to-do list from a **pressure system** into a **support system** that:
- ✅ Intelligently breaks down tasks into micro-steps
- ✅ Adapts to user's energy and cognitive state
- ✅ Provides context-aware suggestions
- ✅ Reduces overwhelm through progressive disclosure
- ✅ Makes starting easier than avoiding

---

## 2. Vision: Task Navigator

### Brand Identity

**Name**: **Task Navigator** (rebranded from "To-Do List")

**Tagline**: *"Break it down. Start small. Keep going."*

**Visual Identity**:
- Warm, supportive color palette (avoid harsh reds for urgency)
- Gentle gradients and soft shadows
- Micro-animations that celebrate small wins
- Icons that suggest progress, not pressure

### Core Philosophy

Task Navigator operates on three principles:

1. **Cognitive Scaffolding**: We provide the structure users' executive function can't always generate
2. **Permission to Start Small**: Every task can begin with a 2-minute micro-step
3. **Adaptive Intelligence**: The system learns and adapts to individual patterns and needs

---

## 3. Feature Requirements

### 3.1 Intelligent Task Breakdown

**Primary Feature**: AI-powered task decomposition that transforms overwhelming tasks into manageable micro-steps.

#### How It Works

1. **User creates a task** (e.g., "Clean my room")
2. **System detects complexity** or user explicitly requests breakdown
3. **AI analyzes task** and generates context-aware micro-steps
4. **User reviews and customizes** the breakdown
5. **Micro-steps become actionable items** in the task view

#### Breakdown Intelligence

The system considers:

- **Task Type Recognition**: Cleaning, writing, organizing, planning, research, etc.
- **Context Awareness**: 
  - Energy level (low/medium/high)
  - Cognitive load (overwhelm indicators)
  - Time pressure
  - Emotional resistance
- **User Patterns**: 
  - Preferred micro-step granularity
  - Common breakdown contexts
  - Historical success patterns
- **Task Complexity**: 
  - Multi-step vs. single-step tasks
  - Dependencies between steps
  - Estimated time per micro-step

#### Example: "Clean my room"

**Input**: "Clean my room"

**Context**: User selects "Too big / Don't know where to start"

**AI-Generated Breakdown**:
1. Look around the room and identify one area that needs attention
2. Pick up 3 items that don't belong and put them where they go
3. Gather all dirty laundry into one pile
4. Put clean laundry away (even if just in a basket)
5. Clear one surface (desk, nightstand, or floor space)
6. Take trash/recycling out of the room
7. Wipe down one surface with a cloth
8. Stop and appreciate what you've done

**Adaptive Features**:
- If energy is low: Fewer steps, more permission to stop
- If time pressure: Focus on highest-impact steps first
- If emotional resistance: Include permission-giving language

### 3.2 Context-Aware Suggestions

**Feature**: System proactively suggests breakdowns based on task characteristics and user state.

#### Trigger Conditions

- **Task Title Analysis**: Detects complex tasks ("organize", "plan", "clean", "write", "research")
- **User Behavior**: User hovers over task for >3 seconds without action
- **Explicit Request**: "Break this down" button on each task
- **Pattern Recognition**: Similar tasks that user previously broke down

#### Suggestion UI

- **Gentle Badge**: "This looks like it could be broken down" (not a command)
- **One-Click Breakdown**: "Show me how" button
- **Context Selection**: Optional context picker (too big, don't know where to start, low energy, etc.)

### 3.3 Micro-Task Management

**Feature**: Tasks can contain micro-steps that are individually trackable.

#### Data Model Extension

```typescript
interface PersonalTodo {
  // Existing fields...
  id: string;
  title: string;
  description?: string;
  // New fields for micro-tasks
  hasBreakdown: boolean;
  microSteps?: MicroStep[];
  breakdownContext?: TaskBreakdownContext;
  breakdownGeneratedAt?: string;
}

interface MicroStep {
  id: string;
  todoId: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt?: string;
  estimatedMinutes?: number;
  isOptional?: boolean; // Some steps can be skipped
}
```

#### UI Representation

**Collapsed View** (Task with breakdown):
```
┌─────────────────────────────────────┐
│ ✓ Clean my room                    │
│   3 of 8 micro-steps completed     │
│   [Expand to see steps]            │
└─────────────────────────────────────┘
```

**Expanded View**:
```
┌─────────────────────────────────────┐
│ ✓ Clean my room                    │
│                                     │
│ ✓ 1. Look around and identify area │
│ ✓ 2. Pick up 3 items               │
│ ✓ 3. Gather dirty laundry          │
│ ○ 4. Put clean laundry away        │
│ ○ 5. Clear one surface             │
│ ○ 6. Take trash out                │
│ ○ 7. Wipe down one surface         │
│ ○ 8. Stop and appreciate           │
│                                     │
│ [Collapse] [Edit breakdown]        │
└─────────────────────────────────────┘
```

### 3.4 Adaptive Breakdown Engine

**Feature**: Breakdowns adapt to user's energy, cognitive load, and historical patterns.

#### Energy Mode Integration

- **Low Energy**: Fewer steps, more permission to stop, ultra-simple language
- **Medium Energy**: Balanced step count, moderate detail
- **High Energy**: More comprehensive breakdowns, can handle more steps

#### Cognitive Load Adaptation

- **High Overload**: Maximum 3-4 micro-steps, very simple language
- **Medium Overload**: 4-6 micro-steps, clear but detailed
- **Low Overload**: 6-8 micro-steps, comprehensive breakdown

#### Pattern Learning

System learns from user behavior:
- Preferred micro-step count
- Common breakdown contexts
- Which breakdowns lead to completion
- User edits to AI suggestions (refines future suggestions)

### 3.5 Smart Task Templates

**Feature**: Common tasks get intelligent templates that users can customize.

#### Template Library

Pre-built breakdowns for common tasks:
- **Cleaning Tasks**: Room cleaning, kitchen cleaning, bathroom cleaning
- **Organizing Tasks**: Closet organization, desk organization, digital files
- **Writing Tasks**: Reports, emails, blog posts, documentation
- **Planning Tasks**: Trip planning, event planning, project planning
- **Research Tasks**: Product research, topic research, comparison shopping

#### Template Customization

- Users can save their own breakdowns as templates
- Templates adapt based on user patterns
- Community templates (optional, opt-in)

### 3.6 Progress Visualization

**Feature**: Visual progress indicators that celebrate micro-wins without pressure.

#### Progress Display

- **Completion Ring**: Circular progress for tasks with breakdowns
- **Step Counter**: "3 of 8 steps" (not percentage, which can feel overwhelming)
- **Micro-Win Celebrations**: Gentle animations when micro-steps are completed
- **No Streak Tracking**: Avoids pressure and shame cycles

#### Visual Design Principles

- ✅ Show progress, not pressure
- ✅ Celebrate small wins
- ✅ No red/urgent colors unless truly urgent
- ✅ Soft, encouraging visuals
- ✅ Permission to stop at any time

### 3.7 Time Estimation & Reality Checking

**Feature**: Help users understand how long tasks actually take.

#### Time Awareness

- **Micro-Step Time Estimates**: Each micro-step shows estimated time (2 min, 5 min, 10 min)
- **Total Time Estimate**: "This breakdown will take ~45 minutes total"
- **Reality Check**: After completion, ask "How long did this actually take?" to improve estimates
- **Time Blocking Suggestions**: "You have 30 minutes — here are 3 steps you can do"

#### ADHD-Specific Time Features

- **Time Blindness Support**: Visual time representations
- **Pomodoro Integration**: Optional timer for focused work sessions
- **Energy-Aware Scheduling**: Suggest tasks based on time of day and energy patterns

### 3.8 Emotional Support & Permission

**Feature**: Language and interactions that reduce shame and increase permission.

#### Permission-Giving Language

- "You can stop after any step"
- "Even one step is progress"
- "It's okay if this feels hard"
- "You don't have to finish everything today"

#### Emotional Resistance Handling

When user selects "Emotional resistance" context:
- Include acknowledgment steps ("Acknowledge this feels hard")
- Break into ultra-small steps
- Provide permission to stop
- Suggest starting with easiest step first

#### Shame Reduction

- No overdue indicators (tasks just resurface gently)
- No completion percentages that highlight failure
- No streaks that create pressure
- Focus on "what's next" not "what's overdue"

---

## 4. User Experience Flow

### 4.1 Creating a Task with Breakdown

**Flow 1: Explicit Breakdown Request**

1. User creates task: "Clean my room"
2. User clicks "Break this down" button (or AI suggests it)
3. Modal opens: "Let's make this easier"
4. User optionally selects context: "Too big / Don't know where to start"
5. System generates breakdown (AI-powered)
6. User reviews breakdown, can edit steps
7. User saves breakdown → Task now has micro-steps
8. User can start working through micro-steps

**Flow 2: Automatic Suggestion**

1. User creates task: "Organize my closet"
2. System detects complexity → Shows gentle badge: "This could be broken down"
3. User clicks "Show me how"
4. Same modal flow as Flow 1

**Flow 3: Template-Based**

1. User creates task: "Clean kitchen"
2. System recognizes common task → Suggests template
3. User accepts template → Breakdown pre-filled
4. User can customize before saving

### 4.2 Working Through Micro-Steps

1. User opens task with breakdown
2. Sees list of micro-steps (some completed, some pending)
3. User checks off micro-step → Gentle celebration animation
4. Progress updates: "4 of 8 steps"
5. User can:
   - Continue to next step
   - Stop and come back later
   - Edit remaining steps
   - Mark task as "done enough" (even if not all steps complete)

### 4.3 Task Completion

**Flexible Completion**:
- User can mark task complete even if not all micro-steps done
- System celebrates completion without judgment
- Option to "Finish remaining steps later" (creates new simplified task)

**Completion Celebration**:
- Gentle animation
- Acknowledgment message: "You did it! Even the small steps add up."
- No pressure to do more

---

## 5. Technical Architecture

### 5.1 Database Schema Extensions

```sql
-- Extend personal_todos table
ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS has_breakdown BOOLEAN DEFAULT false;
ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS breakdown_context TEXT;
ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS breakdown_generated_at TIMESTAMPTZ;

-- New table for micro-steps
CREATE TABLE IF NOT EXISTS todo_micro_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES personal_todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  estimated_minutes INTEGER,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_todo_micro_steps_todo_id ON todo_micro_steps(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_micro_steps_order ON todo_micro_steps(todo_id, order_index);

-- Table for breakdown patterns (learning)
CREATE TABLE IF NOT EXISTS todo_breakdown_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title_pattern TEXT NOT NULL, -- e.g., "clean", "organize"
  breakdown_context TEXT,
  micro_steps JSONB NOT NULL, -- Array of step titles
  success_rate DECIMAL, -- Percentage of times this breakdown led to completion
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for pattern lookup
CREATE INDEX IF NOT EXISTS idx_todo_breakdown_patterns_user ON todo_breakdown_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_breakdown_patterns_pattern ON todo_breakdown_patterns(user_id, task_title_pattern);
```

### 5.2 AI Integration

#### AI Service Architecture

Leverage existing AI infrastructure:
- Use `aiExecutionService` for breakdown generation
- Create new intent: `breakdown_task`
- System prompt focused on ADHD-friendly task decomposition

#### AI Prompt Engineering

**System Prompt Template**:
```
You are a helpful assistant that breaks down overwhelming tasks into small, 
manageable micro-steps for people with ADHD and executive function challenges.

Principles:
1. Make steps so small they feel easy to start
2. Include permission to stop after any step
3. Use encouraging, non-judgmental language
4. Adapt to user's energy level and cognitive load
5. Consider task type and context

User Context:
- Energy Level: {energy_mode}
- Cognitive Load: {cognitive_load}
- Breakdown Context: {context}
- Task Type: {task_type}

Generate 3-8 micro-steps that:
- Are actionable and specific
- Can each be done in 2-15 minutes
- Build on each other logically
- Include at least one "permission to stop" step
- Use simple, clear language
```

#### AI Response Format

```typescript
interface TaskBreakdownAIResponse {
  microSteps: Array<{
    title: string;
    description?: string;
    estimatedMinutes: number;
    isOptional?: boolean;
  }>;
  totalEstimatedMinutes: number;
  suggestedEnergyLevel: 'low' | 'medium' | 'high';
  encouragementMessage?: string;
}
```

### 5.3 Service Layer

#### New Service: `intelligentTodoService.ts`

```typescript
// Core breakdown functions
export async function generateTaskBreakdown(
  taskTitle: string,
  context?: TaskBreakdownContext,
  energyMode?: EnergyMode,
  userId?: string
): Promise<TaskBreakdownResult>;

export async function saveTaskBreakdown(
  todoId: string,
  breakdown: TaskBreakdownResult
): Promise<void>;

export async function getTaskBreakdown(
  todoId: string
): Promise<MicroStep[]>;

export async function completeMicroStep(
  microStepId: string
): Promise<void>;

// Pattern learning
export async function learnFromBreakdown(
  userId: string,
  taskTitle: string,
  breakdown: TaskBreakdownResult,
  wasCompleted: boolean
): Promise<void>;

export async function getSuggestedBreakdown(
  userId: string,
  taskTitle: string
): Promise<TaskBreakdownResult | null>;
```

### 5.4 Component Architecture

#### New Components

1. **`TaskBreakdownModal.tsx`** (can extend existing)
   - Modal for generating and editing breakdowns
   - Context selection
   - AI generation UI
   - Step editing interface

2. **`MicroStepList.tsx`**
   - Displays micro-steps for a task
   - Checkbox interaction
   - Progress visualization
   - Expand/collapse functionality

3. **`BreakdownSuggestionBadge.tsx`**
   - Gentle suggestion UI
   - "This could be broken down" indicator
   - One-click breakdown trigger

4. **`TaskBreakdownButton.tsx`**
   - "Break this down" button on tasks
   - Context-aware visibility

#### Modified Components

1. **`UnifiedTodoList.tsx`**
   - Add breakdown UI to task items
   - Show micro-step progress
   - Integrate breakdown generation

2. **`TodoCanvasWidget.tsx`**
   - Support micro-step display in widget
   - Compact breakdown view

---

## 6. Design Principles (ADHD-Friendly)

### 6.1 Reduce Cognitive Load

- **Progressive Disclosure**: Show breakdown only when needed
- **Simple Language**: Avoid jargon, use clear instructions
- **Visual Clarity**: Clean, uncluttered interface
- **Minimal Decisions**: Pre-fill sensible defaults

### 6.2 Reduce Overwhelm

- **No Long Lists**: Collapse completed items
- **Focus on Next Step**: Highlight what's next, not what's overdue
- **Permission to Stop**: Always visible option to pause
- **No Pressure Indicators**: Avoid red, urgent colors

### 6.3 Increase Motivation

- **Celebrate Micro-Wins**: Gentle animations for step completion
- **Progress Without Pressure**: Show progress, not failure
- **Encouraging Language**: Supportive, not judgmental
- **Flexible Completion**: "Done enough" is valid

### 6.4 Support Executive Function

- **Externalize Planning**: System does the breakdown thinking
- **Reduce Initiation Barrier**: Make starting as easy as possible
- **Time Awareness**: Help with time estimation
- **Context Awareness**: Adapt to energy and state

### 6.5 Reduce Shame & Pressure

- **No Overdue Indicators**: Tasks just resurface
- **No Streaks**: Avoid pressure cycles
- **No Completion Percentages**: Focus on steps, not gaps
- **Permission Language**: "You can stop" is always present

---

## 7. Success Metrics

### User Engagement

- **Breakdown Usage Rate**: % of complex tasks that get broken down
- **Micro-Step Completion Rate**: % of micro-steps completed
- **Task Completion Rate**: % of tasks with breakdowns that get completed
- **Return Rate**: Users coming back to use breakdown feature

### User Satisfaction

- **Reduced Overwhelm**: Self-reported reduction in task paralysis
- **Increased Confidence**: Users feel more capable of starting tasks
- **Feature Value**: Users find breakdown helpful vs. manual breakdown

### System Intelligence

- **Pattern Learning Accuracy**: System learns user preferences
- **Breakdown Quality**: User edits to AI suggestions (fewer edits = better)
- **Context Recognition**: System correctly identifies when breakdown is needed

### ADHD-Specific Metrics

- **Initiation Success**: Users start tasks more often with breakdowns
- **Completion Without Shame**: Tasks completed even if not all steps done
- **Energy Adaptation**: System correctly adapts to energy levels

---

## 8. Implementation Phases

### Phase 1: Core Breakdown (MVP)

**Goal**: Basic intelligent breakdown functionality

**Features**:
- AI-powered task breakdown generation
- Manual breakdown editing
- Micro-step display and completion
- Basic progress visualization

**Timeline**: 2-3 weeks

**Components**:
- `TaskBreakdownModal` (enhance existing)
- `MicroStepList`
- Database schema extensions
- AI service integration

### Phase 2: Intelligence & Adaptation

**Goal**: System learns and adapts

**Features**:
- Pattern learning from user behavior
- Energy mode integration
- Context-aware suggestions
- Template library

**Timeline**: 2-3 weeks

**Components**:
- Pattern learning service
- Template system
- Context detection
- Energy mode integration

### Phase 3: Polish & Optimization

**Goal**: Refine UX and performance

**Features**:
- Time estimation
- Enhanced progress visualization
- Performance optimization
- Accessibility improvements

**Timeline**: 1-2 weeks

### Phase 4: Advanced Features

**Goal**: Additional ADHD-supportive features

**Features**:
- Time blocking integration
- Pomodoro timer integration
- Community templates (optional)
- Advanced pattern recognition

**Timeline**: 2-3 weeks

---

## 9. Branding & Messaging

### Rebranding Strategy

**From**: "To-Do List"  
**To**: "Task Navigator"

**Rationale**:
- "Navigator" suggests guidance and support, not pressure
- Implies the system helps you find your way through tasks
- Less clinical, more empowering

### Messaging Framework

**Primary Message**: "Break it down. Start small. Keep going."

**Supporting Messages**:
- "When a task feels too big, we make it smaller"
- "You don't have to do it all at once"
- "Every small step counts"
- "We help you get started, you decide when to stop"

### Visual Identity

**Color Palette**:
- Primary: Soft purple/blue (calming, supportive)
- Accent: Warm orange (energizing but not urgent)
- Success: Soft green (gentle celebration)
- Avoid: Harsh reds, urgent yellows

**Typography**:
- Clear, readable fonts
- Generous line spacing
- Comfortable font sizes

**Icons**:
- Soft, rounded shapes
- Progress-oriented (steps, paths, navigation)
- Avoid pressure symbols (clocks, alarms)

---

## 10. Competitive Differentiation

### vs. Traditional To-Do Apps

- **Intelligent Breakdown**: AI-powered, not manual
- **ADHD-Specific**: Designed for executive function challenges
- **Adaptive**: Learns and adapts to individual needs
- **Permission-Based**: Reduces shame and pressure

### vs. ADHD Task Apps

- **Integrated**: Part of larger life management system
- **Intelligent**: AI-powered, not just templates
- **Flexible**: Adapts to energy and context
- **Learning**: Gets better with use

---

## 11. Risk Mitigation

### Technical Risks

**AI Quality**: Breakdowns may not always be perfect
- **Mitigation**: Always allow user editing, learn from edits

**Performance**: AI calls may be slow
- **Mitigation**: Cache common breakdowns, optimize prompts

**Cost**: AI API costs for breakdown generation
- **Mitigation**: Pattern learning reduces API calls, template reuse

### UX Risks

**Overwhelm**: Breakdown feature itself might feel overwhelming
- **Mitigation**: Optional, gentle suggestions, progressive disclosure

**Pressure**: Micro-steps might create new pressure
- **Mitigation**: Permission language, flexible completion, no streaks

**Dependency**: Users might rely too heavily on AI
- **Mitigation**: Always allow manual editing, teach patterns over time

---

## 12. Future Enhancements

### Advanced Intelligence

- **Multi-Task Coordination**: Break down related tasks together
- **Dependency Management**: Understand step dependencies
- **Energy Prediction**: Predict best times for certain tasks
- **Contextual Reminders**: Smart resurfacing based on patterns

### Social Features (Optional)

- **Shared Breakdowns**: Share breakdown templates with others
- **Community Templates**: Crowdsourced breakdown library
- **Accountability Partners**: Gentle check-ins (opt-in)

### Integration

- **Calendar Integration**: Schedule micro-steps
- **Guardrails Integration**: Break down project tasks
- **Spaces Integration**: Link breakdowns to planning documents
- **Tracker Studio Integration**: Track time spent on micro-steps

---

## 13. Conclusion

Task Navigator transforms the to-do list from a pressure system into a support system. By intelligently breaking down tasks, adapting to user needs, and providing permission-based structure, it helps users with ADHD and executive function challenges actually start and complete tasks without shame or overwhelm.

**Key Success Factors**:
1. **Intelligence**: AI-powered breakdowns that actually help
2. **Adaptation**: System learns and improves for each user
3. **Permission**: Always allow stopping, editing, and flexible completion
4. **Reduced Shame**: No pressure, no streaks, no judgment
5. **Progressive Enhancement**: Works as basic to-do, enhanced with breakdowns

**Vision**: Every user should feel capable of starting any task, no matter how overwhelming it initially seems.

---

**End of Design Brief**
