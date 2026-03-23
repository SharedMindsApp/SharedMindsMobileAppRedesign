# Tracker Architecture Design Document

**Date:** February 2025  
**Status:** Current Architecture  
**Focus:** Architectural Design & Interconnections

---

## Executive Summary

SharedMinds implements a unified tracking system built on **Tracker Studio**, a generic tracking engine that serves as the foundation for all specialized trackers. The architecture follows a **template-based, schema-flexible** design where trackers are instantiated from templates, store time-series entries, and integrate with each other through intelligent mapping and synchronization services.

**Core Principle:** Tracker Studio provides the infrastructure; specialized trackers (Habit, Goal, Skills, Growth) are built on top of this foundation, each serving distinct purposes while sharing common data patterns and integration capabilities.

---

## 1. Tracker Studio: The Foundation Layer

### 1.1 Architecture Overview

**Tracker Studio** is the generic tracking engine that powers all trackers in SharedMinds. It provides:

- **Template System**: Structure-only templates that define field schemas (not data)
- **Tracker Instances**: Live trackers created from templates or scratch
- **Time-Series Entries**: Append-only entry records with flexible field values
- **Generic Analytics**: Pattern detection, insights, and trend analysis

### 1.2 Core Data Model

#### Database Schema

**`tracker_templates`** (Structure Only)
- `id`, `owner_id`, `name`, `description`
- `field_schema` (JSONB): Defines what fields to collect (text, number, boolean, rating, date)
- `entry_granularity`: `daily`, `session`, `event`, `range`
- `scope`: `user` (private) or `global` (system templates)
- `chart_config`: Visualization preferences
- **Key Point**: Templates contain NO data, only structure

**`trackers`** (Live Instances)
- `id`, `owner_id`, `template_id` (nullable)
- `name`, `description`
- `field_schema_snapshot` (JSONB): Snapshot of schema at creation time
- `entry_granularity`: Inherited from template or custom
- `display_order`, `icon`, `color`: UI customization
- `archived_at`: Soft delete support
- **Key Point**: Trackers store a snapshot of their schema, so template changes don't break existing trackers

**`tracker_entries`** (Time-Series Data)
- `id`, `tracker_id`, `user_id`
- `entry_date`: ISO date string (YYYY-MM-DD)
- `field_values` (JSONB): Flexible key-value pairs matching field schema
- `notes`: Optional text notes
- **Key Point**: Append-only pattern (no deletes, only updates)

### 1.3 Service Layer

**Location**: `src/lib/trackerStudio/`

**Core Services:**
- `trackerService.ts`: CRUD operations for trackers
- `trackerTemplateService.ts`: Template management
- `trackerEntryService.ts`: Entry creation, updates, queries
- `trackerThemeUtils.ts`: Visual theming based on tracker names/types

**Integration Services:**
- `habitTrackerMappings.ts`: Maps habits to detailed trackers
- `habitTrackerSyncService.ts`: Syncs habit entries to detailed trackers
- `goalTrackerUtils.ts`: Detects and works with goal trackers
- `goalTrackerIntelligence.ts`: Progress analysis, momentum, milestones
- `skillsTrackerService.ts`: Syncs skills tracker entries to Skills Matrix
- `skillsTrackerUtils.ts`: Detects and works with skills trackers

### 1.4 Template-Based Instantiation

All trackers are created from templates:

1. **System Templates** (Global): Pre-built templates like "Growth Tracking", "Sleep Tracker", "Exercise Tracker"
2. **User Templates**: Custom templates created by users
3. **From Scratch**: Trackers can be created without templates

**Process:**
```
Template (structure) → Create Tracker Instance → Store Schema Snapshot → Start Logging Entries
```

**Why This Matters:**
- Templates ensure consistency across similar trackers
- Schema snapshots prevent breaking changes
- Users can customize trackers after creation
- System can suggest related trackers based on templates

---

## 2. Specialized Trackers

### 2.1 Habit Tracker

**Purpose**: Simple daily check-ins for consistency tracking. Focus on "did I do it?" with streak support.

**Architecture**:
- **Core Component**: `src/components/activities/habits/HabitTrackerCore.tsx`
- **Service Layer**: `src/lib/habits/habitsService.ts`
- **Data Model**: Built on `activities` table (canonical Activity system) + `habit_checkins` table

**Key Features**:
- Multiple metric types: boolean, count, minutes, rating, custom
- Streak tracking (current, best)
- Completion rate analytics (7d, 30d)
- Trend indicators (up/down/stable)
- Calendar integration (derived instances, no duplication)

**How It Works**:
1. Habits are created as `activities` with `activity_type = 'habit'`
2. Check-ins stored in `habit_checkins` table (append-only)
3. Calendar instances are derived at read-time (no duplication)
4. Analytics computed from check-in history

**Integration Points**:
- **→ Goal Tracker**: Habits can be linked as goal requirements
- **→ Detailed Trackers**: Habits can sync to detailed trackers (e.g., "Exercise" habit → Exercise Tracker)
- **→ Calendar**: Check-ins appear as calendar events
- **→ Skills Tracker**: Habit completion can contribute to skill practice

**Why Users Need It**:
- Quick daily check-ins without complexity
- Focus on consistency over detailed metrics
- Streak motivation without judgment
- Foundation for goal progress

### 2.2 Goal Tracker

**Purpose**: Track progress toward specific goals with date ranges, requirements, and completion tracking.

**Architecture**:
- **Core Component**: `src/components/activities/goals/GoalTrackerCore.tsx`
- **Service Layer**: `src/lib/goals/goalsService.ts`
- **Data Model**: `goals` table + `goal_requirements` table

**Key Features**:
- Date ranges (start/end dates)
- Link habits/tasks as requirements
- Progress computation (weighted, from check-ins)
- Streak-based and count-based requirements
- Auto-completion at 100%
- Extend/Expand functionality

**How It Works**:
1. Goals created with date ranges and requirements
2. Requirements link to habits (via `goal_requirements` table)
3. Progress computed from habit check-ins
4. Progress updates automatically when habits are checked in
5. Goals auto-complete at 100% progress

**Integration Points**:
- **← Habit Tracker**: Goals read habit check-ins for progress
- **→ Skills Tracker**: Goal completion can unlock skill milestones
- **→ Growth Tracker**: Goal achievements can be logged as growth milestones
- **→ Calendar**: Goal deadlines appear as calendar events

**Why Users Need It**:
- Long-term vision with measurable progress
- Connects daily habits to bigger picture
- Automatic progress tracking from habits
- Deadline awareness and planning

### 2.3 Skills Tracker

**Purpose**: Track skill development with proficiency levels, confidence, and evidence collection.

**Architecture**:
- **Service Layer**: `src/lib/trackerStudio/skillsTrackerService.ts`
- **Integration**: Syncs to `user_skills` table (Skills Matrix)
- **Detection**: `src/lib/trackerStudio/skillsTrackerUtils.ts`

**Key Features**:
- Skill name tracking
- Proficiency level (1-5 scale)
- Confidence level (1-5 scale, separate from proficiency)
- Evidence collection (usage examples, practice notes)
- Category assignment
- Bidirectional sync with Skills Matrix

**How It Works**:
1. Skills Tracker entries created in Tracker Studio
2. `skillsTrackerService.syncEntryToSkillsMatrix()` syncs entries to `user_skills` table
3. If skill exists: Updates proficiency, confidence, evidence
4. If skill doesn't exist: Creates new skill entry
5. Skills Matrix becomes canonical source for skill definitions

**Integration Points**:
- **→ Skills Matrix**: Entries sync to `user_skills` table
- **← Habit Tracker**: Skill practice can be logged as habits
- **← Goal Tracker**: Skill milestones can be tracked as goals
- **→ Growth Tracker**: Skill development contributes to growth metrics

**Why Users Need It**:
- Structured skill development tracking
- Evidence-based proficiency assessment
- Confidence vs. proficiency distinction
- Integration with broader skills system

### 2.4 Growth Tracker

**Purpose**: Track personal development journey with holistic metrics (confidence, resilience, focus, self-trust).

**Architecture**:
- **Component**: `src/components/planner/personal/GrowthTrackingView.tsx`
- **Template**: "Growth Tracking" global template
- **Data Model**: Tracker Studio (uses `trackers` and `tracker_entries`)

**Key Features**:
- Daily/weekly check-ins
- Multiple rating fields:
  - Confidence Level (1-5)
  - Emotional Resilience (1-5)
  - Focus & Clarity (1-5)
  - Self-Trust (1-5)
- Notes and reflection fields
- Trend analysis over time

**How It Works**:
1. Growth Tracker created from "Growth Tracking" template
2. Entries logged with rating fields
3. Analytics show trends in personal development metrics
4. Integrates with other trackers for holistic view

**Integration Points**:
- **← Habit Tracker**: Habit consistency affects growth metrics
- **← Goal Tracker**: Goal achievements contribute to confidence/self-trust
- **← Skills Tracker**: Skill development affects confidence
- **→ Calendar**: Growth check-ins appear as calendar events

**Why Users Need It**:
- Holistic personal development tracking
- Meta-awareness of growth patterns
- Connects all other trackers to overall development
- Reflection and self-awareness

### 2.5 Productivity Tracker

**Status**: Not implemented as a separate tracker.

**Current Approach**: Productivity is tracked through:
- **Habit Tracker**: Productivity habits (e.g., "Morning Routine", "Deep Work")
- **Goal Tracker**: Productivity goals (e.g., "Complete Project X by Date Y")
- **Task System**: Tasks in Planner/Guardrails
- **Time Tracking**: Future feature (not yet implemented)

**Architecture Note**: If a Productivity Tracker were to be implemented, it would:
- Use Tracker Studio foundation
- Track metrics like: tasks completed, focus time, interruptions, energy levels
- Integrate with Habit Tracker (productivity habits)
- Integrate with Goal Tracker (productivity goals)
- Sync with task completion data

---

## 3. Tracker Interconnections

### 3.1 Habit ↔ Goal Connection

**Architecture**:
- Goals link to habits via `goal_requirements` table
- `goal_requirements.activity_id` references habit activities
- Progress computed from `habit_checkins` table

**Flow**:
```
User creates Goal → Links Habit as Requirement → Habit Check-in → Goal Progress Updates
```

**Implementation**:
- `GoalTrackerCore` calls `computeGoalProgress()` from `goalsService`
- Reads `goal_requirements` linked to habit activities
- Computes progress from `habit_checkins` (streak-based or count-based)
- Updates goal progress percentage
- Auto-completes goal at 100%

**Why This Matters**:
- Goals become actionable through habits
- Progress is automatic (no manual entry)
- Daily habits connect to long-term goals
- Users see immediate feedback

### 3.2 Habit ↔ Detailed Tracker Connection

**Architecture**:
- `habitTrackerMappings.ts` maps habit names to tracker template names
- `habitTrackerSyncService.ts` syncs habit entries to detailed trackers

**Flow**:
```
Habit Check-in → Check Mapping → If Detailed Tracker Exists → Sync Entry → Both Trackers Updated
```

**Example Mappings**:
- "Exercise" habit → "Exercise Tracker" (detailed metrics: duration, type, intensity)
- "Meditation" habit → "Mindfulness & Meditation" tracker (detailed: duration, quality, notes)
- "Drink Water" habit → "Water Intake Tracker" (detailed: amount, timing)

**Implementation**:
- `HABIT_TO_TRACKER_MAPPING` in `habitTrackerMappings.ts` defines mappings
- `createHabitEntryWithSync()` in `habitTrackerSyncService.ts` handles sync
- User can enable/disable sync per habit
- Detailed tracker gets richer data; habit tracker stays simple

**Why This Matters**:
- Simple habit check-in can trigger detailed tracking
- Reduces double entry
- Habit tracker for consistency, detailed tracker for insights
- Users choose level of detail

### 3.3 Skills Tracker ↔ Skills Matrix Connection

**Architecture**:
- `skillsTrackerService.ts` syncs tracker entries to `user_skills` table
- Skills Matrix is canonical source for skill definitions
- Tracker entries update proficiency, confidence, evidence

**Flow**:
```
Skills Tracker Entry → syncEntryToSkillsMatrix() → Update/Create user_skills → Skills Matrix Updated
```

**Implementation**:
- `syncEntryToSkillsMatrix()` checks if skill exists in Skills Matrix
- If exists: Updates proficiency, confidence, evidence, usage_count
- If not exists: Creates new skill entry
- Evidence appended with timestamps
- Skills Matrix becomes single source of truth

**Why This Matters**:
- Tracker entries feed into broader skills system
- Skills Matrix aggregates all skill data
- Evidence-based skill development
- Unified view of all skills

### 3.4 Goal ↔ Skills Connection

**Architecture**:
- Goals can reference skills as requirements (future feature)
- Skill milestones can be tracked as goals
- Goal completion can unlock skill achievements

**Current State**: Integration is conceptual; full implementation pending.

**Potential Flow**:
```
Goal: "Learn React" → Links Skill: "React" → Practice Logged → Goal Progress → Skill Proficiency Updates
```

### 3.5 Growth Tracker ↔ All Trackers Connection

**Architecture**:
- Growth Tracker aggregates insights from all other trackers
- Growth metrics influenced by habit consistency, goal progress, skill development
- Holistic view of personal development

**Flow**:
```
Habit Consistency → Confidence Growth
Goal Achievements → Self-Trust Growth
Skill Development → Confidence Growth
All Trackers → Growth Tracker Insights
```

**Implementation**:
- Growth Tracker entries logged independently
- Analytics can correlate growth metrics with other tracker data
- Users reflect on overall development patterns

**Why This Matters**:
- Meta-awareness of personal development
- Connects all trackers to bigger picture
- Holistic growth tracking
- Reflection and self-awareness

---

## 4. Tracker ↔ To-Do List Interactions

### 4.1 Goal Tracker ↔ To-Do List Connection

**Architecture**:
- Goals can link tasks/todos as requirements via `goal_requirements` table
- `requirement_type = 'task_complete'` for task-based requirements
- `required_activity_id` references task activities (from `activities` table)
- Task completion contributes to goal progress

**Flow**:
```
User creates Goal → Links Task as Requirement → Task Completed → Goal Progress Updates
```

**Implementation**:
- `GoalRequirementBuilderSheet` allows selecting habits OR tasks
- `addGoalRequirement()` accepts `requirement_type = 'task_complete'`
- `computeGoalProgress()` reads task completion status (currently placeholder for full implementation)
- Goal progress updates when linked tasks are completed

**Current Status**:
- ✅ Task linking to goals: Fully implemented
- ⚠️ Task completion tracking: Placeholder (TODO in `computeGoalProgress()`)
- ⚠️ Automatic progress updates: Pending full implementation

**Why This Matters**:
- Goals become actionable through specific tasks
- Task completion directly contributes to goal achievement
- Users see progress as they complete tasks
- Long-term goals broken down into actionable steps

### 4.2 Habit Tracker ↔ To-Do List Connection

**Architecture**:
- Both habits and todos use the canonical `activities` table
- Shared Activity system ensures consistency
- Calendar integration works for both
- Both can be linked to goals as requirements

**Flow**:
```
Habit Check-in → Calendar Event
Task Completion → Calendar Event
Both → Can Link to Goals
```

**Implementation**:
- `activities` table stores both habits and tasks
- `activity_type` distinguishes: `'habit'` vs `'task'`
- Calendar projections work identically for both
- Both can be selected in `GoalRequirementBuilderSheet`

**Why This Matters**:
- Unified system for all activities
- Consistent calendar integration
- Same permission model
- Both contribute to goals

### 4.3 Skills Tracker ↔ To-Do List Connection

**Architecture**:
- Task completion can serve as evidence for skill development
- `skill_evidence` table supports `evidence_type = 'task'`
- Tasks can reference skills they develop
- Skill proficiency can be updated based on task completion

**Flow**:
```
Task Completed → Record as Skill Evidence → Update Skill Proficiency → Skills Matrix Updated
```

**Implementation**:
- `skillEvidenceService` supports task-based evidence
- Tasks can be tagged with skill categories
- Task completion can trigger skill evidence recording
- Skills Matrix aggregates evidence from tasks

**Current Status**:
- ✅ Evidence system supports tasks
- ⚠️ Automatic evidence recording: Pending full implementation
- ⚠️ Task-to-skill linking: Conceptual (pending implementation)

**Why This Matters**:
- Tasks become skill development opportunities
- Evidence-based skill tracking
- Automatic skill progression
- Connects daily work to skill growth

### 4.4 Growth Tracker ↔ To-Do List Connection

**Architecture**:
- Task completion contributes to growth metrics
- Completed tasks increase confidence and self-trust
- Growth check-ins can reflect on task completion patterns
- Analytics correlate task completion with growth metrics

**Flow**:
```
Task Completed → Confidence Growth → Growth Tracker Entry → Reflection on Patterns
```

**Implementation**:
- Growth Tracker entries logged independently
- Analytics can correlate task completion with growth metrics
- Users reflect on task completion patterns in growth check-ins
- Task completion history informs growth insights

**Why This Matters**:
- Task completion builds confidence
- Growth tracking includes productivity patterns
- Holistic view of personal development
- Reflection on task completion habits

### 4.5 To-Do Widget Linking to Trackers

**Architecture**:
- Todo widget can link to tracker widgets for navigation
- `taskLibrary.ts` defines `linkedWidgetType` for tasks
- `widgetLinking.ts` service finds widgets by type
- Automatic link detection when todos are created

**Flow**:
```
Todo Created → Check Task Template → If linkedWidgetType = 'habit_tracker' → Show Link Button → Navigate to Tracker
```

**Implementation**:
- `TodoCanvasWidget` detects widget links for todos
- Tasks in library can specify `linkedWidgetType: 'habit_tracker'` or other tracker types
- Link buttons appear on relevant todos
- Navigation routes to tracker widgets in Spaces

**Example Links**:
- "Check habit tracker" → Links to Habit Tracker widget
- "Review goals" → Links to Goal Tracker widget
- "Log skill practice" → Links to Skills Tracker widget
- "Growth check-in" → Links to Growth Tracker widget

**Why This Matters**:
- Seamless navigation from todos to trackers
- Reduces friction in workflow
- Helps users discover tracker widgets
- Creates integrated experience

### 4.6 Unified Activity System

**Architecture**:
- All trackers, habits, goals, and tasks use the canonical `activities` table
- Single source of truth for all time-based activities
- Calendar projections work uniformly
- Permission model is consistent

**Components**:
- `activities` table: Core activity definitions
- `activity_schedules` table: Recurring schedules
- `activityService.ts`: CRUD operations
- `activityCalendarProjection.ts`: Calendar integration

**Why This Matters**:
- No duplication between systems
- Consistent behavior across all activities
- Unified calendar view
- Single permission model

---

## 5. Why Users Need All Trackers

### 4.1 Complementary Purposes

Each tracker serves a distinct purpose:

**Habit Tracker**: Daily consistency, quick check-ins, streak motivation
- **When to use**: Simple daily actions, consistency focus
- **Example**: "Drink Water", "Morning Stretch", "Meditation"

**Goal Tracker**: Long-term vision, measurable progress, deadline awareness
- **When to use**: Specific outcomes with dates, multiple requirements
- **Example**: "Lose 10 pounds by March", "Complete Project by Deadline"

**Skills Tracker**: Structured skill development, proficiency tracking, evidence collection
- **When to use**: Learning new skills, tracking expertise, career development
- **Example**: "Learn React", "Improve Public Speaking", "Master Piano"

**Growth Tracker**: Holistic development, meta-awareness, reflection
- **When to use**: Overall personal development, self-awareness, reflection
- **Example**: Weekly growth check-ins, confidence tracking, resilience monitoring

### 4.2 Integration Benefits

**Automatic Progress**:
- Habit check-ins automatically update goal progress
- No manual entry needed
- Real-time feedback

**Reduced Double Entry**:
- Habit entries can sync to detailed trackers
- Skills tracker entries sync to Skills Matrix
- One entry, multiple views

**Holistic View**:
- Growth Tracker aggregates all tracker data
- See connections between habits, goals, skills
- Understand overall development patterns

**Flexible Detail Levels**:
- Habit Tracker for quick check-ins
- Detailed trackers for rich analytics
- Users choose level of detail

### 4.3 Use Case Examples

**Example 1: Fitness Journey**
- **Habit Tracker**: "Exercise" (daily check-in)
- **Exercise Tracker** (detailed): Duration, type, intensity, heart rate
- **Goal Tracker**: "Run 5K by June" (links to Exercise habit)
- **Skills Tracker**: "Running Technique" (skill development)
- **Growth Tracker**: Confidence, resilience, self-trust improvements

**Example 2: Career Development**
- **Habit Tracker**: "Practice Coding" (daily consistency)
- **Skills Tracker**: "React", "TypeScript" (proficiency tracking)
- **Goal Tracker**: "Get Promoted by Q2" (links to skill development)
- **Growth Tracker**: Confidence, focus, self-trust in career

**Example 3: Personal Growth**
- **Habit Tracker**: "Meditation", "Gratitude Practice" (daily mindfulness)
- **Goal Tracker**: "Reduce Stress" (links to meditation habit)
- **Skills Tracker**: "Emotional Regulation" (skill development)
- **Growth Tracker**: Emotional resilience, focus, self-trust

---

## 6. Architectural Principles

### 5.1 Single Source of Truth

- **Habit Tracker**: `activities` + `habit_checkins` tables
- **Goal Tracker**: `goals` + `goal_requirements` tables
- **Skills Tracker**: Syncs to `user_skills` table (canonical)
- **Growth Tracker**: Tracker Studio (`trackers` + `tracker_entries`)
- **Tracker Studio**: Foundation for all trackers

**No Duplication**: Data is stored once, referenced many times.

### 5.2 Template-Based Architecture

- All trackers use Tracker Studio templates
- Templates define structure, not data
- Trackers store schema snapshots
- Template changes don't break existing trackers

### 5.3 Append-Only Pattern

- All entries are append-only (no deletes)
- Updates create new versions
- History is preserved
- Analytics work on complete history

### 5.4 Integration Through Services

- Trackers don't directly reference each other
- Integration services handle connections
- Loose coupling, high cohesion
- Easy to add new integrations

### 5.5 Permission-Aware

- All trackers respect permissions
- Can view, edit, manage levels
- Sharing through permission system
- Context-aware (Planner, Personal Space, Shared Space)

---

## 7. Current Implementation Status

### 6.1 Fully Implemented

✅ **Tracker Studio Foundation**: Complete
- Template system
- Tracker instances
- Entry system
- Basic analytics

✅ **Habit Tracker**: Complete
- Core component
- Service layer
- Calendar integration
- Analytics

✅ **Goal Tracker**: Complete
- Core component
- Service layer
- Progress computation
- Habit linking

✅ **Skills Tracker**: Complete
- Service layer
- Skills Matrix sync
- Detection utilities

✅ **Growth Tracker**: Complete
- Component
- Template
- Entry system

### 6.2 Integration Status

✅ **Habit ↔ Goal**: Fully implemented
✅ **Habit ↔ Detailed Tracker**: Fully implemented
✅ **Skills ↔ Skills Matrix**: Fully implemented
⚠️ **Goal ↔ Skills**: Conceptual (pending implementation)
⚠️ **Growth ↔ All Trackers**: Partial (analytics pending)

### 6.3 Future Enhancements

- Productivity Tracker (if needed)
- Enhanced Growth Tracker analytics
- Cross-tracker insights
- Automated suggestions
- Advanced pattern detection

---

## 8. Conclusion

The SharedMinds tracker architecture provides a unified, flexible, and integrated system for personal development tracking. Tracker Studio serves as the foundation, while specialized trackers (Habit, Goal, Skills, Growth) serve distinct purposes and integrate seamlessly.

**Key Strengths**:
- Template-based architecture ensures consistency
- Integration services reduce duplication
- Single source of truth for all data
- Permission-aware and context-sensitive
- Append-only pattern preserves history

**User Benefits**:
- Automatic progress tracking
- Reduced double entry
- Holistic view of development
- Flexible detail levels
- Integrated insights

The architecture is **production-ready** and **extensible**, allowing for future enhancements while maintaining consistency and integration.

---

**Document Version**: 1.0  
**Last Updated**: February 2025  
**Status**: Current Architecture
