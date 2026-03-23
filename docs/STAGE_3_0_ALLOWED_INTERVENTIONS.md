# Stage 3.0: Allowed Interventions List

**Layer**: Stage 3 (Adaptive Interventions Layer)
**Purpose**: Define exact interventions permitted in Stage 3.0 implementation
**Status**: Design specification (NOT YET IMPLEMENTED)
**Parent Contract**: STAGE_3_CONTRACT.md

---

## Overview

This document defines the complete list of interventions permitted in Stage 3.0. Each intervention is specified at a conceptual level with required user controls, risk notes, and language constraints.

**CRITICAL**: This is a design document. No triggers, logic, scheduling algorithms, or notification mechanisms are defined here.

**Future implementations MUST**:
- Implement ONLY interventions listed in this document
- Follow ALL specifications for each intervention
- Respect ALL risk notes and language constraints
- Default ALL interventions to OFF
- Allow Safe Mode to override ALL interventions

---

## Intervention Catalog

### Category 1: User-Initiated Nudges

---

#### INT-001: Implementation Intention Reminder

**Intervention Key**: `implementation_intention_reminder`

**Category**: `user_initiated_nudge`

**Description**: User creates an "If X, then Y" reminder that shows their chosen message when their chosen condition occurs.

**User Intent Required**:
- User explicitly creates this reminder
- User states what they want to be reminded of
- User defines the trigger condition

**User-Editable Fields**:
- `message_text` (user's exact words, required)
- `trigger_condition` (user-selected from available context options)
- `active_projects` (optional: which projects this applies to)
- `active_days` (optional: which days of week)
- `start_date` (optional: when to begin showing)
- `end_date` (optional: when to stop showing)

**Default State**: OFF (does not exist until user creates)

**Risk Notes**:
- **Shame Risk**: If user creates many reminders, may feel overwhelmed by "shoulds"
- **Fixation Risk**: User may create excessive reminders and feel controlled by them
- **Burnout Risk**: Too many reminders can create constant pressure
- **Mitigation**: Suggest starting with 1-2 reminders maximum

**Safe Mode Behavior**:
- When Safe Mode ON: All reminders paused (do not trigger)
- When Safe Mode OFF: Reminders remain paused (user must re-enable)
- No automatic resumption

**Telemetry Allowed** (lifecycle only):
- `created_at` timestamp
- `enabled_at` timestamp
- `paused_at` timestamp
- `deleted_at` timestamp
- `created_by` (must be "user")

**Telemetry Forbidden**:
- ❌ Whether user viewed the reminder
- ❌ Whether user acted on the reminder
- ❌ How many times user dismissed the reminder
- ❌ "Effectiveness" of the reminder
- ❌ "Adherence" to the reminder

**Forbidden Language**:
- ❌ "You should..."
- ❌ "Time to..."
- ❌ "Don't forget to..."
- ❌ "Stay on track by..."
- ❌ "You're supposed to..."

**Allowed Language Pattern**:
```
"You asked to be reminded: [user's exact message]

This reminder was created on [date].
It appears when: [user's trigger condition]

[Pause] [Edit] [Delete]"
```

**Example UI Copy**:
```
"If you want, you can create reminders for specific moments.
You control the message, timing, and when it appears.
You can pause or delete these anytime."
```

**Consent Requirements**:
- User must explicitly click "Create Reminder"
- Consent flow explains exactly what will appear and when
- Risk disclosure: "Reminders may feel like pressure if overused"

---

#### INT-002: Context-Aware Prompt

**Intervention Key**: `context_aware_prompt`

**Category**: `user_initiated_nudge`

**Description**: User chooses to see their stated goal or intention when entering a specific context (e.g., opening a project, starting focus mode).

**User Intent Required**:
- User explicitly enables this prompt
- User writes the prompt content
- User selects which context triggers it

**User-Editable Fields**:
- `prompt_text` (user's exact words, required)
- `context_trigger` (user-selected: project opened, focus started, etc.)
- `target_project_id` (optional: specific project)
- `show_frequency` (options: every time, daily first time, weekly first time)

**Default State**: OFF (does not exist until user creates)

**Risk Notes**:
- **Habituation Risk**: Seeing same prompt repeatedly may become noise
- **Pressure Risk**: Prompt at moment of action may feel like judgment
- **Context-Switching Risk**: Prompt may interrupt user's actual intention
- **Mitigation**: Suggest "weekly first time" frequency to start

**Safe Mode Behavior**:
- When Safe Mode ON: All prompts paused
- When Safe Mode OFF: Prompts remain paused
- User must re-enable individually

**Telemetry Allowed** (lifecycle only):
- `created_at` timestamp
- `enabled_at` timestamp
- `paused_at` timestamp
- `deleted_at` timestamp

**Telemetry Forbidden**:
- ❌ How many times prompt was shown
- ❌ Whether user closed prompt quickly
- ❌ Whether user's behavior changed after seeing prompt
- ❌ "Engagement" with prompt

**Forbidden Language**:
- ❌ "Remember to..."
- ❌ "Your goal is..."
- ❌ "Stay focused on..."
- ❌ "Get back to..."

**Allowed Language Pattern**:
```
"You wrote this on [date]:
[user's exact prompt text]

This appears when: [context trigger]

[Pause] [Edit] [Delete]"
```

**Example UI Copy**:
```
"If you want, you can see your written intention when you enter specific contexts.
You write the message and choose when it appears.
This is optional and you can disable it anytime."
```

**Consent Requirements**:
- User must click "Create Context Prompt"
- Explanation: "This will show your message when [context]"
- Risk disclosure: "Repeated prompts may become distracting"

---

#### INT-003: Scheduled Reflection Prompt

**Intervention Key**: `scheduled_reflection_prompt`

**Category**: `user_initiated_nudge`

**Description**: User schedules an optional reflection prompt at a specific time/day.

**User Intent Required**:
- User explicitly schedules this prompt
- User chooses timing (day, time)
- User understands reflection is optional

**User-Editable Fields**:
- `prompt_question` (optional: user's custom question)
- `schedule_days` (user-selected days of week)
- `schedule_time` (user-selected time)
- `applies_to_project` (optional: specific project or global)

**Default State**: OFF (does not exist until user creates)

**Risk Notes**:
- **Pressure Risk**: Scheduled prompts may feel like obligation
- **Shame Risk**: Not reflecting may trigger "I should have" thoughts
- **Perfectionism Risk**: User may feel reflection must be "good enough"
- **Mitigation**: Emphasize that reflection is always optional

**Safe Mode Behavior**:
- When Safe Mode ON: No prompts shown
- When Safe Mode OFF: Prompts remain paused
- User must re-enable

**Telemetry Allowed** (lifecycle only):
- `created_at` timestamp
- `enabled_at` timestamp
- `paused_at` timestamp
- `deleted_at` timestamp

**Telemetry Forbidden**:
- ❌ Whether user wrote a reflection after prompt
- ❌ Length or content of reflection
- ❌ "Completion rate" of reflections
- ❌ Comparison to previous reflection frequency

**Forbidden Language**:
- ❌ "Time to reflect"
- ❌ "You haven't reflected yet"
- ❌ "Reflection helps you stay on track"
- ❌ "Complete your reflection"

**Allowed Language Pattern**:
```
"You scheduled this prompt for [day] at [time].

Optional reflection question:
[user's question or default question]

This is optional. You can skip, pause, or delete this anytime.

[Reflect Now] [Skip] [Pause] [Delete]"
```

**Example UI Copy**:
```
"If you want, you can schedule optional reflection prompts.
You choose when they appear and what they ask.
Reflection is always optional - skipping is fine."
```

**Consent Requirements**:
- User must click "Schedule Reflection Prompt"
- Clear explanation: "This will show a prompt at [time] on [days]"
- Emphasis: "Reflection is always optional"
- Risk disclosure: "Scheduled prompts may feel like obligation"

---

### Category 2: Friction Reduction Tools

---

#### INT-004: Simplified View Mode

**Intervention Key**: `simplified_view_mode`

**Category**: `friction_reduction`

**Description**: User chooses to temporarily hide secondary UI elements to reduce visual complexity.

**User Intent Required**:
- User explicitly enables simplified view
- User chooses which elements to hide
- User states reason (optional but encouraged)

**User-Editable Fields**:
- `hidden_elements` (user-selected list: sidebar, secondary tabs, etc.)
- `applies_to_surfaces` (which pages/views to simplify)
- `duration_minutes` (optional: auto-restore after time)

**Default State**: OFF (normal view)

**Risk Notes**:
- **Dependency Risk**: User may forget how to access hidden features
- **Over-Simplification Risk**: User may hide something they actually need
- **Learned Helplessness Risk**: User may feel they "need" simplification always
- **Mitigation**: Always show "Restore Full View" button prominently

**Safe Mode Behavior**:
- When Safe Mode ON: Simplified view disabled (full view restored)
- When Safe Mode OFF: Simplified view remains disabled
- User must re-enable if desired

**Telemetry Allowed** (lifecycle only):
- `enabled_at` timestamp
- `disabled_at` timestamp
- `user_stated_reason` (if provided)

**Telemetry Forbidden**:
- ❌ How long user stayed in simplified view
- ❌ Whether user "needed" to access hidden elements
- ❌ Comparison of productivity in simplified vs. full view
- ❌ "Success rate" of simplification

**Forbidden Language**:
- ❌ "This will help you focus better"
- ❌ "Reduce distractions"
- ❌ "Most users prefer simplified view"
- ❌ "Optimal for productivity"

**Allowed Language Pattern**:
```
"Simplified view is active.
Hidden elements: [list]

You enabled this on [date].
You can restore full view anytime.

[Restore Full View]"
```

**Example UI Copy**:
```
"If you want, you can temporarily hide secondary UI elements.
You choose what to hide and can restore them anytime.
This does not remove features - just hides them temporarily."
```

**Consent Requirements**:
- User must click "Enable Simplified View"
- Show preview of what will be hidden
- Prominent "Restore Full View" button must always be visible

---

#### INT-005: Task Decomposition Assistant

**Intervention Key**: `task_decomposition_assistant`

**Category**: `friction_reduction`

**Description**: User requests help breaking a task into smaller steps. User reviews and edits all suggested steps.

**User Intent Required**:
- User explicitly requests decomposition
- User provides task description
- User reviews and approves/edits all suggested steps

**User-Editable Fields**:
- `original_task_description` (user's input)
- `suggested_steps` (user can edit, delete, reorder)
- `keep_or_replace` (user decides whether to use suggestions)

**Default State**: OFF (tool available but not active)

**Risk Notes**:
- **Over-Structuring Risk**: Breaking tasks down may increase overwhelm
- **Perfectionism Risk**: User may feel all tasks must be decomposed perfectly
- **Dependency Risk**: User may feel unable to start tasks without decomposing
- **Autonomy Risk**: User may defer to system suggestions rather than own judgment
- **Mitigation**: Frame as optional tool, user always has final say

**Safe Mode Behavior**:
- When Safe Mode ON: Tool remains available (not an active intervention)
- User can still use tool if they choose

**Telemetry Allowed** (lifecycle only):
- `decomposition_requested_at` timestamp
- `user_modified_suggestions` (boolean: did user edit?)

**Telemetry Forbidden**:
- ❌ Whether user completed decomposed tasks
- ❌ "Success rate" of decomposition
- ❌ Comparison of task completion with/without decomposition
- ❌ How many steps user created vs. suggested

**Forbidden Language**:
- ❌ "Breaking tasks down improves productivity"
- ❌ "You should decompose this task"
- ❌ "Tasks are easier when broken down"
- ❌ "This will help you succeed"

**Allowed Language Pattern**:
```
"If you want, here are suggested steps for: [task]

[List of suggested steps - all editable]

You can edit, delete, or ignore these suggestions.
This is a tool, not a requirement.

[Use These Steps] [Edit Suggestions] [Cancel]"
```

**Example UI Copy**:
```
"If you want, you can request help breaking tasks into smaller steps.
You review and edit all suggestions.
This is optional - many tasks don't need decomposition."
```

**Consent Requirements**:
- User must click "Help Me Break This Down"
- Clear explanation: "You'll see suggested steps that you can edit or ignore"
- No automatic decomposition without user request

---

### Category 3: Self-Imposed Constraints

---

#### INT-006: Focus Mode (Feature Suppression)

**Intervention Key**: `focus_mode_suppression`

**Category**: `self_imposed_constraint`

**Description**: User activates Focus Mode which temporarily hides projects/features not related to chosen focus target.

**User Intent Required**:
- User explicitly starts Focus Mode
- User selects focus target (project, track, or custom scope)
- User understands this hides other features temporarily

**User-Editable Fields**:
- `focus_target_id` (project, track, or custom)
- `focus_duration_minutes` (user-selected or open-ended)
- `hidden_features` (user can customize what gets hidden)
- `override_allowed` (user can choose "strict" or "flexible")

**Default State**: OFF (Focus Mode not active)

**Risk Notes**:
- **Rigidity Risk**: User may feel trapped in focus mode
- **Guilt Risk**: Exiting early may trigger "I failed" thoughts
- **Binary Thinking Risk**: User may see focus as "all or nothing"
- **Context Change Risk**: User's actual needs may change mid-session
- **Mitigation**: Easy exit always available, no tracking of "completion"

**Safe Mode Behavior**:
- When Safe Mode ON: Focus Mode immediately exits
- When Safe Mode OFF: Focus Mode remains off
- User must manually restart if desired

**Telemetry Allowed** (lifecycle only):
- `session_started_at` timestamp
- `session_ended_at` timestamp
- `user_stated_goal` (optional: user's words)
- `ended_by_user` (boolean: user clicked exit vs. timer expired)

**Telemetry Forbidden**:
- ❌ Whether user completed planned duration
- ❌ Whether user "succeeded" at staying focused
- ❌ Comparison of session durations
- ❌ "Focus score" or "distraction count"
- ❌ Whether user accessed hidden features during session

**Forbidden Language**:
- ❌ "Stay focused"
- ❌ "You're doing great"
- ❌ "Complete your focus session"
- ❌ "Don't give up"
- ❌ "You've focused for X minutes" (implies streak/score)

**Allowed Language Pattern**:
```
"Focus Mode is active.
Focus target: [user's chosen target]
Started at: [time]

Projects not related to [target] are hidden.
You can exit Focus Mode anytime.

[Exit Focus Mode]"
```

**Example UI Copy**:
```
"If you want, you can start Focus Mode to hide unrelated projects.
You choose what to focus on and how long.
You can exit anytime - there's no penalty for stopping early."
```

**Consent Requirements**:
- User must click "Start Focus Mode"
- Clear explanation: "This will hide [list of features]"
- Prominent "Exit Focus Mode" button always visible
- Risk disclosure: "Exiting early is fine - context changes happen"

---

#### INT-007: Timeboxed Work Session

**Intervention Key**: `timeboxed_session`

**Category**: `self_imposed_constraint`

**Description**: User sets a time limit for working on something and receives a gentle alert when time expires.

**User Intent Required**:
- User explicitly sets timebox
- User chooses duration
- User states what they're working on (optional)

**User-Editable Fields**:
- `duration_minutes` (user-selected)
- `work_description` (optional: user's words)
- `alert_type` (options: silent notification, gentle sound, visual only)
- `auto_extend_option` (user can choose to allow quick extension)

**Default State**: OFF (no timebox active)

**Risk Notes**:
- **Time Pressure Risk**: Timer may create anxiety
- **Perfectionism Risk**: User may feel they "must" complete in allotted time
- **Interruption Risk**: Alert may come at bad moment (deep in flow)
- **Rigidity Risk**: User may feel bound to timer even when inappropriate
- **Mitigation**: Frame as gentle boundary, not deadline; easy to extend or cancel

**Safe Mode Behavior**:
- When Safe Mode ON: All timeboxes cancelled
- When Safe Mode OFF: Timeboxes remain cancelled
- User must create new timebox if desired

**Telemetry Allowed** (lifecycle only):
- `timebox_started_at` timestamp
- `timebox_ended_at` timestamp (expired or cancelled)
- `user_extended` (boolean: did user extend?)

**Telemetry Forbidden**:
- ❌ Whether user "completed" work in time
- ❌ Whether user extended (counted as "failure")
- ❌ Comparison of planned vs. actual duration
- ❌ "Time management effectiveness"

**Forbidden Language**:
- ❌ "Time's up"
- ❌ "Finish what you started"
- ❌ "You planned for X minutes"
- ❌ "Stay on schedule"

**Allowed Language Pattern**:
```
"Your [X] minute timebox has ended.

You started working on: [user's description]

This is just a gentle boundary.
You can extend, wrap up, or switch focus.

[Extend 15 min] [End Session] [Cancel Alert]"
```

**Example UI Copy**:
```
"If you want, you can set a timebox for your work session.
You choose the duration and get a gentle alert when time expires.
You can extend, cancel, or ignore the alert - it's just a boundary."
```

**Consent Requirements**:
- User must click "Start Timebox"
- Clear explanation: "You'll receive a gentle alert after [X] minutes"
- Easy to extend or cancel during session

---

#### INT-008: Project Scope Limiter

**Intervention Key**: `project_scope_limiter`

**Category**: `self_imposed_constraint`

**Description**: User explicitly limits which roadmap items, tracks, or features are visible to reduce scope overwhelm.

**User Intent Required**:
- User explicitly enables scope limiting
- User selects what to hide (specific items, tracks, or date ranges)
- User states reason (optional but encouraged: "focusing on MVP", etc.)

**User-Editable Fields**:
- `hidden_items_list` (user-selected roadmap items to hide)
- `hidden_tracks` (user-selected tracks to hide)
- `hidden_date_range` (optional: hide items after certain date)
- `limiter_reason` (optional: user's stated purpose)

**Default State**: OFF (full scope visible)

**Risk Notes**:
- **Blind Spot Risk**: User may forget hidden items exist
- **Dependency Risk**: Hidden items may have dependencies user needs
- **Over-Constraint Risk**: Limiting too much may cause confusion
- **False Security Risk**: User may think hidden items don't need attention
- **Mitigation**: Always show count of hidden items, easy to restore

**Safe Mode Behavior**:
- When Safe Mode ON: All scope limiters disabled (full scope visible)
- When Safe Mode OFF: Limiters remain disabled
- User must re-enable if desired

**Telemetry Allowed** (lifecycle only):
- `limiter_enabled_at` timestamp
- `limiter_disabled_at` timestamp
- `user_stated_reason` (if provided)

**Telemetry Forbidden**:
- ❌ Whether limiting improved "productivity"
- ❌ Comparison of progress with/without limiting
- ❌ "Success rate" of limited scope projects
- ❌ How long user kept limiter active

**Forbidden Language**:
- ❌ "Focus on what matters"
- ❌ "Reduce scope to succeed"
- ❌ "You're trying to do too much"
- ❌ "This will help you ship faster"

**Allowed Language Pattern**:
```
"Scope limiter is active.
[X] items are hidden: [show count by type]

You enabled this on [date].
Reason: [user's stated reason or "not provided"]

You can restore full scope anytime.

[Show All] [Edit Limiter] [Disable]"
```

**Example UI Copy**:
```
"If you want, you can temporarily hide specific roadmap items or tracks.
You choose what to hide and can restore anytime.
Hidden items still exist - they're just not visible right now."
```

**Consent Requirements**:
- User must click "Enable Scope Limiter"
- Show preview of what will be hidden
- Warning: "Hidden items may have dependencies"
- Prominent indicator showing limiter is active

---

### Category 4: Accountability Structures

---

#### INT-009: Accountability Partnership (1:1 Sharing)

**Intervention Key**: `accountability_partnership`

**Category**: `accountability`

**Description**: User chooses to share specific project visibility with one other person for mutual support.

**User Intent Required**:
- User explicitly initiates sharing
- User selects specific person (who must consent)
- User defines exactly what is shared
- Both parties consent to specific visibility level

**User-Editable Fields**:
- `partner_user_id` (must be existing user who consents)
- `shared_project_id` (specific project or list of projects)
- `visibility_level` (options: milestones only, roadmap, full access)
- `shared_elements` (granular: what partner can see)
- `sharing_purpose` (optional: user's stated reason)

**Default State**: OFF (no sharing active)

**Risk Notes**:
- **Social Pressure Risk**: User may feel judged by partner
- **Shame Risk**: Partner seeing "lack of progress" may trigger shame
- **Dependency Risk**: User may defer decisions to partner
- **Coercion Risk**: Partner may pressure user (even unintentionally)
- **Relationship Risk**: Sharing may strain personal relationship
- **Mitigation**: Strict rules for partners, easy revocation, clear boundaries

**Safe Mode Behavior**:
- When Safe Mode ON: All sharing visibility paused (partner sees nothing)
- When Safe Mode OFF: Sharing remains paused
- User must re-enable if desired

**Telemetry Allowed** (lifecycle only):
- `sharing_initiated_at` timestamp
- `sharing_accepted_at` timestamp (partner consent)
- `sharing_revoked_at` timestamp
- `initiated_by_user_id` (who started the sharing)

**Telemetry Forbidden**:
- ❌ Whether partner viewed shared items
- ❌ How often partner checks in
- ❌ Whether sharing "improved" user's progress
- ❌ Communication between partners
- ❌ "Accountability effectiveness"

**Forbidden Language**:
- ❌ "Your partner can see you haven't completed this"
- ❌ "Don't let your partner down"
- ❌ "Your partner is waiting for you"
- ❌ "Accountability increases success"

**Allowed Language Pattern**:
```
"You are sharing with: [partner name]

They can see:
- [specific list of visible elements]

They cannot see:
- [specific list of hidden elements]

You initiated this on [date].
You can stop sharing anytime.

[Manage Sharing] [Revoke Access]"
```

**Example UI Copy**:
```
"If you want, you can share specific project visibility with one other person.
You control exactly what they see and can stop sharing anytime.
This is for mutual support, not monitoring."
```

**Consent Requirements**:
- User must click "Share with Partner"
- Partner must explicitly accept invitation
- Both parties see identical visibility rules
- Clear explanation: "They will see: [list]"
- Risk disclosure: "Sharing may create social pressure"
- Partner receives guidelines: "Your role is support, not judgment"

**Partner Guidelines** (must be shown to partner):
```
Guidelines for Accountability Partners:
- Your role is support, not monitoring
- Do not judge your partner's progress
- Do not pressure them to work faster
- Do not track their activity
- Respect their autonomy
- They can revoke sharing anytime
```

---

#### INT-010: Commitment Witness (View-Only Sharing)

**Intervention Key**: `commitment_witness`

**Category**: `accountability`

**Description**: User shares a specific commitment or goal with chosen person(s) for gentle accountability. Witness can see commitment but receives NO notifications or updates.

**User Intent Required**:
- User explicitly shares commitment
- User writes commitment in their own words
- User selects witnesses (who must consent)
- User understands witnesses see text only (no status, no completion)

**User-Editable Fields**:
- `commitment_text` (user's exact words, required)
- `witness_user_ids` (list of users who must consent)
- `visible_until_date` (optional: auto-revoke after date)
- `commitment_context` (optional: which project this relates to)

**Default State**: OFF (no commitments shared)

**Risk Notes**:
- **Public Pressure Risk**: Even view-only sharing creates pressure
- **Shame Risk**: User may feel judged for not completing
- **Perfectionism Risk**: User may feel commitment must be met perfectly
- **Relationship Risk**: Not meeting commitment may affect relationship
- **Mitigation**: No completion tracking, no notifications to witnesses, easy revocation

**Safe Mode Behavior**:
- When Safe Mode ON: All witnesses lose visibility (commitment hidden)
- When Safe Mode OFF: Commitments remain hidden
- User must re-enable if desired

**Telemetry Allowed** (lifecycle only):
- `commitment_created_at` timestamp
- `sharing_revoked_at` timestamp
- `witness_user_ids` (who can see)

**Telemetry Forbidden**:
- ❌ Whether witnesses viewed commitment
- ❌ Whether user completed commitment
- ❌ Whether commitment was "met on time"
- ❌ Any communication about the commitment

**Forbidden Language**:
- ❌ "You committed to..."
- ❌ "Your witnesses are watching"
- ❌ "Don't break your commitment"
- ❌ "People are counting on you"

**Allowed Language Pattern**:
```
"You shared this commitment on [date]:
[user's exact commitment text]

Visible to:
- [list of witness names]

They can see this text only.
They receive no notifications or updates.
You can revoke visibility anytime.

[Revoke Sharing] [Edit Commitment]"
```

**Example UI Copy**:
```
"If you want, you can share a commitment with chosen people.
They see your written commitment only - no status, no notifications.
You can revoke sharing anytime. This is gentle accountability, not monitoring."
```

**Consent Requirements**:
- User must click "Share Commitment"
- Each witness must explicitly accept
- Clear explanation: "Witnesses will see your written commitment only"
- Risk disclosure: "Sharing creates social pressure"
- Witnesses receive guidelines: "Do not ask about this commitment unsolicited"

**Witness Guidelines** (must be shown to witness):
```
Guidelines for Commitment Witnesses:
- You can see the commitment text only
- You receive no notifications or updates
- Do not ask about status unsolicited
- Do not judge if commitment isn't met
- Respect that context changes
- They can revoke visibility anytime
```

---

## Explicitly Forbidden Intervention Patterns

The following intervention types are **FORBIDDEN** and must never be implemented in Stage 3:

### Forbidden Pattern 1: System-Initiated Interventions

**Pattern**: System creates or suggests interventions based on inferred weakness, patterns, or "optimization."

**Examples** (FORBIDDEN):
- ❌ "We noticed you're less active on Project X. Enable daily reminders?"
- ❌ "Users like you benefit from morning focus sessions"
- ❌ "Based on your patterns, we suggest enabling timeboxes"
- ❌ Auto-created reminders based on incomplete tasks
- ❌ Suggested interventions in insight cards

**Why Forbidden**: Violates autonomy, implies system knows better than user.

---

### Forbidden Pattern 2: Escalating Interventions

**Pattern**: System increases intervention frequency, intensity, or pressure when user doesn't respond.

**Examples** (FORBIDDEN):
- ❌ Sending reminder again if user didn't respond
- ❌ Increasing notification frequency
- ❌ Adding "urgent" or "important" labels over time
- ❌ "Last chance" messaging
- ❌ Escalating from notification to email to SMS

**Why Forbidden**: Punitive, creates pressure, optimizes for engagement not user benefit.

---

### Forbidden Pattern 3: Shame or Guilt-Based Language

**Pattern**: Interventions that imply user is failing, disappointing, or should feel bad.

**Examples** (FORBIDDEN):
- ❌ "You haven't completed this yet"
- ❌ "Don't give up now"
- ❌ "Your partner is waiting"
- ❌ "You're falling behind schedule"
- ❌ "Imagine how you'll feel if you quit"

**Why Forbidden**: Emotionally manipulative, triggers shame spirals, especially harmful for neurodivergent users.

---

### Forbidden Pattern 4: Comparison-Based Interventions

**Pattern**: Interventions that compare user to others, ideal self, or past performance.

**Examples** (FORBIDDEN):
- ❌ "You completed 5 tasks last week but only 2 this week"
- ❌ "Users like you usually complete 7 tasks per week"
- ❌ "You're in the top 20% of focused users"
- ❌ "Get back to your usual pace"
- ❌ "You used to work on this daily"

**Why Forbidden**: Creates unhealthy comparison, ignores context changes, triggers inadequacy.

---

### Forbidden Pattern 5: Default-ON Interventions

**Pattern**: Interventions enabled automatically without explicit user choice.

**Examples** (FORBIDDEN):
- ❌ Daily goal reminders enabled for all new users
- ❌ "Helpful suggestions" enabled by default
- ❌ Opt-out instead of opt-in
- ❌ Interventions that require user to find settings to disable
- ❌ "We've enabled this to help you"

**Why Forbidden**: Violates autonomy principle, assumes system knows best.

---

### Forbidden Pattern 6: Hard-to-Disable Interventions

**Pattern**: Making it difficult, confusing, or guilt-inducing to disable interventions.

**Examples** (FORBIDDEN):
- ❌ Disable button hidden in deep settings
- ❌ Multiple confirmation dialogs to disable
- ❌ "Are you sure you want to give up?" language
- ❌ Requiring explanation for why user is disabling
- ❌ Suggesting user will "miss out" if they disable

**Why Forbidden**: Dark pattern, violates reversibility principle.

---

### Forbidden Pattern 7: Gamification Elements

**Pattern**: Interventions that include scores, streaks, achievements, or competition.

**Examples** (FORBIDDEN):
- ❌ Focus session streaks
- ❌ "You've maintained focus for 7 days!"
- ❌ Achievement badges for intervention use
- ❌ Leaderboards for any intervention metric
- ❌ Points or levels for completing interventions
- ❌ "Consistency score"

**Why Forbidden**: Triggers addiction loops, perfectionism, unhealthy fixation.

---

### Forbidden Pattern 8: Engagement Optimization

**Pattern**: Interventions designed to maximize user engagement, time-in-app, or retention.

**Examples** (FORBIDDEN):
- ❌ Re-engagement emails after period of inactivity
- ❌ "We miss you" messaging
- ❌ Intervention frequency optimized for user response rate
- ❌ A/B testing intervention wording for "effectiveness"
- ❌ Variable-interval rewards

**Why Forbidden**: Serves system goals not user goals, exploitative.

---

### Forbidden Pattern 9: Adherence Tracking

**Pattern**: Measuring or displaying whether user "completes" or "ignores" interventions.

**Examples** (FORBIDDEN):
- ❌ "You've ignored this reminder 3 times"
- ❌ Intervention completion rate
- ❌ "You responded to 60% of prompts"
- ❌ Graphs of intervention adherence
- ❌ "Consistency" metrics

**Why Forbidden**: Reframes tool as requirement, creates pressure, measures wrong thing.

---

### Forbidden Pattern 10: AI-Generated Content Without Review

**Pattern**: System generates intervention content using AI without user review and approval.

**Examples** (FORBIDDEN):
- ❌ AI writing reminder messages for user
- ❌ AI suggesting commitment text
- ❌ AI generating reflection questions based on user patterns
- ❌ "Smart suggestions" that appear automatically
- ❌ AI rewriting user's commitment to be "more effective"

**Why Forbidden**: Violates user authorship, system imposing language, removes user agency.

---

### Forbidden Pattern 11: Hidden Intervention Logic

**Pattern**: Interventions triggered by undisclosed logic, patterns, or thresholds.

**Examples** (FORBIDDEN):
- ❌ "Smart timing" that user doesn't control
- ❌ Interventions triggered when system detects "struggle"
- ❌ Pattern-based suggestions without transparency
- ❌ "We thought you might want..."
- ❌ Adaptive interventions that change without user knowledge

**Why Forbidden**: Violates transparency, users can't audit system behavior.

---

### Forbidden Pattern 12: Permanent or Difficult-to-Revoke Sharing

**Pattern**: Accountability features that make it hard to revoke access or escape.

**Examples** (FORBIDDEN):
- ❌ Sharing that requires partner approval to revoke
- ❌ "Cooling off period" before sharing can be disabled
- ❌ Partner receives notification when user revokes
- ❌ Guilt messaging when user revokes sharing
- ❌ Social pressure to maintain sharing

**Why Forbidden**: Violates reversibility, creates coercive accountability dynamics.

---

## Summary: Allowed Interventions Count

**Total Allowed Interventions**: 10

**By Category**:
- User-Initiated Nudges: 3
- Friction Reduction: 2
- Self-Imposed Constraints: 3
- Accountability Structures: 2

**All interventions**:
- Default to OFF
- Require explicit user consent
- Allow easy disable/pause
- Respect Safe Mode override
- Use only allowed language
- Include risk disclosures
- Document user provenance
- Forbid adherence tracking

---

## Compliance Requirements

Any future implementation of these interventions MUST:

1. ✅ Implement intervention exactly as specified
2. ✅ Include all user-editable fields
3. ✅ Default to OFF (opt-in only)
4. ✅ Respect Safe Mode override (hard stop)
5. ✅ Use only allowed language patterns
6. ✅ Include all risk disclosures
7. ✅ Implement lifecycle-only telemetry
8. ✅ Never implement forbidden telemetry
9. ✅ Make disable prominent and easy
10. ✅ Document user provenance (created date, user intent)

---

## Related Documentation

- `STAGE_3_CONTRACT.md` - Parent contract with philosophical grounding
- `STAGE_3_0_REGISTRY_SPEC.md` - Registry specification for implementation
- `SEMANTIC_FIREBREAK_MAP.md` - Overall system architecture

---

## Version

- **Version**: 1.0
- **Date**: 2024-12-15
- **Status**: Design specification (NOT YET IMPLEMENTED)
- **Next Step**: Review and approval before implementation
