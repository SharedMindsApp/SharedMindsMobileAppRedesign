/**
 * CANONICAL HABIT CONTRACT
 * 
 * ⚠️ CRITICAL: This contract defines the single source of truth for how habits work in SharedMinds.
 * 
 * If you are adding a new habit-related feature and are not extending HabitTrackerCore,
 * STOP. You are creating fragmentation.
 * 
 * This contract is a guardrail, not runtime logic. It exists to prevent:
 * - Accidental duplication
 * - Silent automation
 * - Streak punishment
 * - Feature drift
 * - Fragmentation across the ecosystem
 * 
 * ============================================================================
 * WHAT A HABIT IS
 * ============================================================================
 * 
 * A habit is:
 * - An Activity with type='habit' in the activities table
 * - A repeating pattern of behavior tracked via habit_checkins
 * - A source of truth that projects into tasks, goals, and skills
 * - A self-regulation tool, not a productivity scoreboard
 * 
 * ============================================================================
 * WHAT A HABIT IS NOT
 * ============================================================================
 * 
 * A habit is NOT:
 * - A task (tasks are projections of habits, not duplicates)
 * - A goal (goals may require habits, but habits are not goals)
 * - A skill (skills may be built by habits, but habits are not skills)
 * - A streak counter (streaks are derived, not primary)
 * - A gamification mechanism
 * - A judgment system
 * 
 * ============================================================================
 * LIFECYCLE STATES
 * ============================================================================
 * 
 * Allowed states (via activities.status):
 * - 'active': Habit is currently being tracked
 * - 'inactive': Habit is paused (temporarily stopped, can resume)
 * - 'completed': Habit has been completed (reached its end)
 * - 'archived': Habit is soft-deleted (hidden, can be restored)
 * 
 * State transitions:
 * - active → inactive: Pause (removes projected tasks, preserves history)
 * - inactive → active: Resume (restores projected tasks)
 * - active → completed: Mark as done (if habit has end date)
 * - active → archived: Delete (soft delete, removes tasks)
 * - Any → archived: Delete (soft delete)
 * 
 * ============================================================================
 * ALLOWED WRITE PATHS
 * ============================================================================
 * 
 * Explicit, user-initiated writes only:
 * 
 * 1. Habit Creation
 *    - Source: User clicks "Create Habit" or selects suggestion
 *    - Service: habitsService.createHabitActivity()
 *    - Side effects: Projects today's occurrence as task (if active)
 * 
 * 2. Habit Check-in
 *    - Source: User clicks "Done", "Missed", or "Skip" in HabitTrackerCore
 *    - Service: habitsService.upsertHabitCheckin()
 *    - Side effects:
 *      - Updates projected task completion (if exists)
 *      - Records skill evidence (if habit has skill_practice mapping AND status='done')
 * 
 * 3. Habit Update
 *    - Source: User edits habit title, description, or settings
 *    - Service: habitsService.updateHabitActivity()
 *    - Side effects: Updates projected tasks if status changed
 * 
 * 4. Habit Pause/Resume
 *    - Source: User clicks pause/resume button
 *    - Service: habitsService.updateHabitActivity({ status: 'inactive'|'active' })
 *    - Side effects: Removes/restores projected tasks
 * 
 * 5. Habit Archive
 *    - Source: User clicks archive button
 *    - Service: habitsService.archiveHabit()
 *    - Side effects: Removes all projected tasks, hides from views
 * 
 * ============================================================================
 * EXPLICITLY FORBIDDEN BEHAVIORS
 * ============================================================================
 * 
 * ❌ Silent Automation
 *    - DO NOT automatically create habits
 *    - DO NOT automatically check in habits
 *    - DO NOT automatically pause habits
 *    - DO NOT automatically adjust streaks
 * 
 * ❌ Streak Punishment
 *    - DO NOT reset streaks on missed days
 *    - DO NOT show "streak broken" messages
 *    - DO NOT use streaks as primary motivation
 *    - Streaks are informational, not judgmental
 * 
 * ❌ Gamification
 *    - DO NOT add points, levels, or badges
 *    - DO NOT compare users
 *    - DO NOT create leaderboards
 *    - DO NOT use competitive language
 * 
 * ❌ Automatic Proficiency Changes
 *    - DO NOT automatically increase skill proficiency from habit completion
 *    - DO NOT automatically adjust skill confidence
 *    - Skill evidence writes are opt-in and explicit
 * 
 * ❌ Duplicate Systems
 *    - DO NOT create a second habit tracking system
 *    - DO NOT create habit data outside activities/habit_checkins
 *    - DO NOT bypass HabitTrackerCore for habit UI
 * 
 * ============================================================================
 * DATA MODEL
 * ============================================================================
 * 
 * Single Source of Truth:
 * - activities table: Habit definitions (type='habit')
 * - habit_checkins table: Check-in records (completion state per day)
 * 
 * Derived/Projected Data (read-only views):
 * - personal_todos: Habit-derived tasks (habit_activity_id references habit)
 * - goal_requirements: Goals that require habits (required_activity_id references habit)
 * - skill_evidence: Skill practice evidence from habits (reference_id references habit)
 * 
 * ============================================================================
 * PERMISSIONS MODEL
 * ============================================================================
 * 
 * All habit operations must respect:
 * - can_view: Can see habits (if false, render null)
 * - can_edit: Can check in habits (if false, hide check-in buttons)
 * - can_manage: Can create/update/archive habits (if false, hide management buttons)
 * - detail_level: 'overview' | 'detailed' (controls context surfaces visibility)
 * 
 * ============================================================================
 * PERSPECTIVE SWITCHING
 * ============================================================================
 * 
 * Habits can be viewed from multiple perspectives:
 * - Habits: Default view (habit cards with check-ins)
 * - Tasks: Habit-derived tasks in to-do list
 * - Goals: Goals that require this habit
 * - Skills: Skills built by this habit
 * 
 * Perspective switching:
 * - Does NOT navigate away
 * - Does NOT remount components
 * - Preserves UI state
 * - Changes interpretation, not entity
 * 
 * ============================================================================
 * COGNITIVE LOAD PRINCIPLES
 * ============================================================================
 * 
 * ADHD-Friendly Design:
 * - Primary action (Done) is most prominent
 * - Secondary actions are visually demoted
 * - Context surfaces are optional and collapsible
 * - No blank screens (always show suggestions or context)
 * - No pressure language ("you should", "failed", "broken")
 * - No competing visual weights
 * 
 * ============================================================================
 * EXTENSION POINTS
 * ============================================================================
 * 
 * Safe to extend:
 * - Add new context surfaces (read-only)
 * - Add new perspective views (read-only)
 * - Enhance suggestion engine (read-only)
 * - Add new lifecycle states (with contract update)
 * 
 * Requires contract update:
 * - New write paths
 * - New data models
 * - New automation
 * - New judgment systems
 * 
 * ============================================================================
 * REFERENCE IMPLEMENTATIONS
 * ============================================================================
 * 
 * Canonical Implementation:
 * - src/components/activities/habits/HabitTrackerCore.tsx
 * 
 * Services:
 * - src/lib/habits/habitsService.ts (CRUD + check-ins)
 * - src/lib/habits/habitTaskProjectionService.ts (habit → task projection)
 * - src/lib/habits/habitContextHelpers.ts (read-only context)
 * - src/lib/habits/habitSuggestionEngine.ts (intelligent suggestions)
 * 
 * Integration Points:
 * - Goals: src/lib/goals/goalContextHelpers.ts (getHabitsForGoal)
 * - Skills: src/lib/skills/skillContextHelpers.ts (getHabitsPracticingSkill)
 * - Tasks: src/lib/habits/habitTaskProjectionService.ts (projectHabitOccurrencesAsTasks)
 * 
 * ============================================================================
 * FINAL SAFEGUARD
 * ============================================================================
 * 
 * If you are reading this and considering:
 * - Creating a new habit component
 * - Adding habit logic outside HabitTrackerCore
 * - Creating a parallel habit system
 * - Bypassing the activities/habit_checkins tables
 * 
 * STOP. You are creating fragmentation.
 * 
 * Instead:
 * 1. Extend HabitTrackerCore
 * 2. Add a new context surface (read-only)
 * 3. Add a new perspective view (read-only)
 * 4. Update this contract if adding new write paths
 * 
 * The habit system is intentionally simple and focused.
 * Complexity comes from connections (goals, skills, tasks), not from habits themselves.
 */

// This file is documentation-only. No runtime exports.
// Import this file in HabitTrackerCore and related services to reference the contract.
