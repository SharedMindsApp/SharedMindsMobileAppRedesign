# Stage 3.0: Intervention Registry Specification

**Layer**: Stage 3 (Adaptive Interventions Layer)
**Purpose**: Define registry requirements for Stage 3.0 implementation
**Status**: Design specification (NOT YET IMPLEMENTED)
**Parent Contract**: STAGE_3_CONTRACT.md

---

## Overview

This document defines the conceptual requirements for the Intervention Registry - the system that tracks which interventions exist, their status, and user control.

**CRITICAL**: This is a design document defining requirements. No schemas, migrations, or code are defined here.

**Future implementations MUST**:
- Implement registry with ALL required fields
- NEVER implement forbidden fields
- Enforce ALL invariants
- Maintain lifecycle-only audit trail
- Respect Safe Mode priority override

---

## Purpose of the Registry

The Intervention Registry exists to:

1. **Track user-created interventions** with full provenance
2. **Enforce default-OFF behavior** (nothing active without user consent)
3. **Enable granular user control** (pause, edit, delete per intervention)
4. **Ensure Safe Mode override** (disable all when Safe Mode ON)
5. **Provide transparency** (user can see what's active and why)
6. **Prevent forbidden patterns** (no adherence metrics, no effectiveness tracking)

**The registry is NOT**:
- ❌ A recommendation engine
- ❌ An effectiveness measurement system
- ❌ An engagement optimization tool
- ❌ A behavior tracking system

---

## Required Fields (Conceptual)

Each intervention entry in the registry MUST include:

### Core Identity

**`intervention_id`** (unique identifier)
- Purpose: Unique identifier for this intervention instance
- Type: UUID or similar
- Required: YES
- Immutable: YES

**`intervention_key`** (intervention type)
- Purpose: References allowed intervention from STAGE_3_0_ALLOWED_INTERVENTIONS.md
- Type: String matching allowed intervention keys
- Required: YES
- Immutable: YES
- Must be one of: `implementation_intention_reminder`, `context_aware_prompt`, `scheduled_reflection_prompt`, `simplified_view_mode`, `task_decomposition_assistant`, `focus_mode_suppression`, `timeboxed_session`, `project_scope_limiter`, `accountability_partnership`, `commitment_witness`

**`user_id`** (owner)
- Purpose: User who owns this intervention
- Type: Reference to user account
- Required: YES
- Immutable: YES

**`created_by`** (creator)
- Purpose: Must ALWAYS be "user" (system never creates interventions)
- Type: String literal "user"
- Required: YES
- Immutable: YES
- Constraint: MUST equal "user" (system-created interventions are forbidden)

### Lifecycle Tracking

**`created_at`** (creation timestamp)
- Purpose: When user created this intervention
- Type: Timestamp with timezone
- Required: YES
- Immutable: YES

**`status`** (current state)
- Purpose: Current intervention state
- Type: Enum
- Required: YES
- Mutable: YES
- Allowed values: `active`, `paused`, `disabled`, `deleted`
- Default: `paused` (user must explicitly enable)
- Constraint: Cannot transition from `deleted` to any other state

**`enabled_at`** (activation timestamp)
- Purpose: When user enabled this intervention (null if never enabled)
- Type: Timestamp with timezone or null
- Required: NO
- Mutable: YES (updates each time user re-enables)

**`paused_at`** (pause timestamp)
- Purpose: When intervention was paused (by user or Safe Mode)
- Type: Timestamp with timezone or null
- Required: NO
- Mutable: YES

**`disabled_at`** (disable timestamp)
- Purpose: When user permanently disabled this intervention
- Type: Timestamp with timezone or null
- Required: NO
- Mutable: YES

**`deleted_at`** (deletion timestamp)
- Purpose: When user deleted this intervention
- Type: Timestamp with timezone or null
- Required: NO
- Mutable: YES (soft delete)

### User Control & Intent

**`why_text`** (user's stated reason)
- Purpose: User's explanation for why this intervention exists
- Type: Text (user's exact words)
- Required: NO (encouraged but optional)
- Mutable: YES (user can edit)
- Example: "I want to remember to review my project plan weekly"

**`user_parameters`** (user-defined configuration)
- Purpose: User's chosen settings for this intervention (opaque to system)
- Type: JSON object (structure defined by intervention type)
- Required: YES (must contain intervention-specific fields)
- Mutable: YES (user can edit)
- Examples:
  - For reminder: `{message_text: "user's text", trigger_condition: "project_opened", active_days: ["monday", "wednesday"]}`
  - For focus mode: `{focus_target_id: "uuid", duration_minutes: 60, override_allowed: true}`

**`consent_granted_at`** (consent timestamp)
- Purpose: When user gave explicit consent to enable this intervention type
- Type: Timestamp with timezone
- Required: YES (for first intervention of each type)
- Immutable: NO (updated if user re-consents)

**`consent_scope`** (what user consented to)
- Purpose: Specific consent details for this intervention
- Type: JSON object
- Required: YES
- Mutable: NO (requires new consent)
- Contains:
  - `intervention_type`: Which intervention type
  - `risk_disclosed`: Boolean (user saw risk disclosure)
  - `explanation_shown`: Boolean (user saw explanation)
  - `consent_version`: Version of consent text shown

### Safe Mode Integration

**`paused_by_safe_mode`** (Safe Mode pause flag)
- Purpose: Whether this intervention is paused due to Safe Mode
- Type: Boolean
- Required: YES
- Mutable: YES (system updates when Safe Mode changes)
- Constraint: If TRUE, status must be `paused`

**`auto_resume_blocked`** (prevent auto-resume)
- Purpose: Prevents intervention from auto-resuming when Safe Mode turns OFF
- Type: Boolean
- Required: YES
- Immutable: NO
- Default: TRUE (interventions stay paused when Safe Mode OFF)

### Audit Context

**`last_modified_at`** (last edit timestamp)
- Purpose: When user last edited this intervention
- Type: Timestamp with timezone
- Required: YES
- Mutable: YES (updates on any edit)

**`last_modified_by`** (who modified)
- Purpose: Must ALWAYS be "user" (system cannot modify user interventions)
- Type: String literal "user"
- Required: YES
- Mutable: NO
- Constraint: MUST equal "user"

---

## Forbidden Fields (Must Never Implement)

The following fields are **FORBIDDEN** and must never be added to the registry:

### Adherence Metrics (FORBIDDEN)

❌ **`adherence_rate`** - Measuring whether user "completes" interventions
❌ **`completion_count`** - How many times intervention was "followed"
❌ **`ignore_count`** - How many times user dismissed/ignored intervention
❌ **`response_rate`** - Percentage of times user responded to intervention
❌ **`consistency_score`** - Any metric of intervention "consistency"

**Why Forbidden**: Reframes tool as requirement, optimizes for adherence not user benefit.

### Effectiveness Metrics (FORBIDDEN)

❌ **`effectiveness_score`** - Measuring whether intervention "worked"
❌ **`goal_completion_with_intervention`** - Comparing outcomes with/without
❌ **`productivity_delta`** - Change in productivity attributed to intervention
❌ **`behavior_change_detected`** - Whether user's behavior changed

**Why Forbidden**: System cannot measure intervention success; only user decides if helpful.

### Engagement Metrics (FORBIDDEN)

❌ **`last_triggered_at`** - When intervention last appeared to user
❌ **`trigger_count`** - How many times intervention was shown
❌ **`view_count`** - How many times user saw intervention
❌ **`click_through_rate`** - Whether user clicked on intervention
❌ **`time_to_dismiss`** - How quickly user closed intervention

**Why Forbidden**: Optimizes for engagement, measures wrong thing.

### System Recommendations (FORBIDDEN)

❌ **`recommended_by_system`** - Whether system suggested this intervention
❌ **`recommendation_confidence`** - System's confidence in recommendation
❌ **`based_on_pattern`** - What pattern triggered recommendation
❌ **`similar_users_enabled`** - Social proof metric

**Why Forbidden**: Violates autonomy principle; system must not recommend interventions.

### Risk Scoring (FORBIDDEN)

❌ **`user_risk_score`** - System-calculated "risk" of user needing intervention
❌ **`burnout_likelihood`** - Predicted user burnout
❌ **`intervention_priority`** - System-calculated priority
❌ **`escalation_level`** - How "urgent" system thinks intervention is

**Why Forbidden**: System must not assess user's psychological state or "need" for intervention.

### Comparative Metrics (FORBIDDEN)

❌ **`percentile_rank`** - User's rank relative to others
❌ **`average_duration_vs_peers`** - Comparison to other users
❌ **`typical_user_pattern`** - What "normal" users do
❌ **`deviation_from_ideal`** - Distance from system-defined ideal

**Why Forbidden**: Unhealthy comparison, violates no-comparison principle.

---

## Architectural Invariants (Must Be Enforced)

These invariants MUST be enforced by any implementation:

### Invariant 1: Safe Mode Always Overrides

**Rule**: When Safe Mode is ON, ALL interventions MUST be paused immediately.

**Implementation Requirements** (conceptual):
- Check Safe Mode status before EVERY intervention trigger
- When Safe Mode turns ON: Set all active interventions to `status = paused` and `paused_by_safe_mode = true`
- When Safe Mode turns OFF: Interventions remain `paused`; `paused_by_safe_mode` resets to false
- User must explicitly enable interventions after Safe Mode OFF

**Test Requirement**:
```
Given: User has 3 active interventions
When: User turns ON Safe Mode
Then: All 3 interventions are paused
And: paused_by_safe_mode = true for all 3
And: No interventions trigger while Safe Mode is ON
```

### Invariant 2: Default OFF (Opt-In Only)

**Rule**: No intervention activates without explicit user action.

**Implementation Requirements** (conceptual):
- New interventions created with `status = paused`
- User must click "Enable" or equivalent to set `status = active`
- No automatic enabling based on system logic
- No "recommended interventions" pre-enabled

**Test Requirement**:
```
Given: User creates a new reminder
When: Creation completes
Then: status = paused
And: enabled_at = null
And: Reminder does NOT trigger until user explicitly enables
```

### Invariant 3: Easy Disable (No Dark Patterns)

**Rule**: User can disable any intervention with maximum 1 click (0 clicks for pause).

**Implementation Requirements** (conceptual):
- Every intervention UI has prominent "Pause" or "Disable" button
- Pause takes effect immediately (no confirmation)
- Disable may have 1 confirmation only if data loss
- No guilt messaging in confirmation
- No multi-step flow to disable

**Test Requirement**:
```
Given: User has active reminder
When: User clicks "Pause"
Then: status = paused immediately
And: No confirmation dialog shown
And: No guilt messaging shown
```

### Invariant 4: User Authorship Only

**Rule**: Only users create, modify, and delete interventions.

**Implementation Requirements** (conceptual):
- `created_by` MUST always equal "user"
- `last_modified_by` MUST always equal "user"
- System cannot create interventions
- System cannot modify user's `user_parameters`
- System cannot suggest intervention content

**Test Requirement**:
```
Given: Any intervention in registry
Then: created_by = "user"
And: last_modified_by = "user"
And: No system-created interventions exist
```

### Invariant 5: Lifecycle-Only Telemetry

**Rule**: System tracks ONLY lifecycle events, never adherence or effectiveness.

**Implementation Requirements** (conceptual):
- Record: created, enabled, paused, disabled, deleted timestamps
- Record: user-stated intent, user-chosen parameters
- DO NOT record: views, clicks, dismissals, ignores, completions
- DO NOT record: effectiveness, adherence, behavior change
- DO NOT record: engagement metrics

**Test Requirement**:
```
Given: User has active reminder that triggers
When: User dismisses the reminder
Then: No "dismissed" event is recorded
And: No "view count" is incremented
And: No "ignore" metric is tracked
```

### Invariant 6: Language Constraints

**Rule**: Intervention UI must use only allowed language patterns (see STAGE_3_CONTRACT.md).

**Implementation Requirements** (conceptual):
- Automated checks for forbidden terms
- Code review checklist includes language audit
- No "should", "optimal", "success", "failure", "streak", "behind", etc.
- Frame as optional: "If you want", "You chose", "This is available"

**Test Requirement**:
```
Given: Any intervention UI text
Then: Contains no forbidden terms
And: Uses allowed framing patterns
```

### Invariant 7: No Gamification

**Rule**: No scores, streaks, achievements, rankings, or competition.

**Implementation Requirements** (conceptual):
- No "days in a row" counting
- No achievement badges for intervention use
- No leaderboards
- No points or levels
- Avoid displaying intervention frequency counts that could be interpreted as scores

**Test Requirement**:
```
Given: User has used Focus Mode 7 times
When: User views Focus Mode UI
Then: UI does NOT display "7 times" as achievement
And: No streak counting
And: No badges or rewards
```

### Invariant 8: No Auto-Escalation

**Rule**: Interventions cannot increase frequency, intensity, or pressure based on user behavior.

**Implementation Requirements** (conceptual):
- Reminder frequency fixed by user (never increases)
- No "reminder not working, try this instead" logic
- No adaptive intervention timing
- No escalation from notification to email to SMS

**Test Requirement**:
```
Given: User ignores a reminder 5 times
When: Reminder triggers again
Then: Frequency does not increase
And: Message does not change
And: No "you've ignored this X times" messaging
```

### Invariant 9: Granular User Control

**Rule**: User can edit every parameter of their interventions.

**Implementation Requirements** (conceptual):
- All fields in `user_parameters` are editable
- User can change message, timing, scope, duration
- Changes take effect immediately
- No "locked" fields after creation

**Test Requirement**:
```
Given: User has active reminder
When: User edits message text, timing, and days
Then: All changes are saved
And: Changes take effect for next trigger
And: No parameters are locked or unchangeable
```

### Invariant 10: Transparency & Audit

**Rule**: User can see why every intervention exists and when it was created/modified.

**Implementation Requirements** (conceptual):
- Every intervention shows creation date
- Every intervention shows user's stated reason (if provided)
- Every intervention shows current parameters
- User can view full lifecycle history

**Test Requirement**:
```
Given: User views their interventions list
Then: Each intervention shows creation date
And: Each shows why it exists (user's words)
And: Each shows current parameters
And: User can see when it was last modified
```

---

## Hard Caps (Conceptual Limits)

To prevent abuse and protect user wellbeing, the registry should conceptually enforce limits:

### Intervention Count Limits

**Per-User Total Limit** (conceptual):
- Suggest max 10 active interventions per user simultaneously
- Rationale: More than 10 creates intervention overload
- Enforcement: Soft warning, not hard block
- Language: "You have 10 active interventions. Consider pausing some before adding more."

**Per-Type Limits** (conceptual):
- Suggest max 5 reminders simultaneously
- Suggest max 3 accountability partnerships simultaneously
- Rationale: Too many of one type creates specific overload
- Enforcement: Soft warning

### Frequency Caps (Conceptual)

**Nudge Frequency Limit**:
- Suggest max 5 nudges per day per user
- Rationale: More than 5 daily interruptions is excessive
- Enforcement: User can override, but must acknowledge risk

**Notification Density Limit**:
- Suggest minimum 1 hour between intervention notifications
- Rationale: Prevents notification fatigue
- Enforcement: User can override

**Note**: These are conceptual guidelines, not strict technical limits. User can override but system should warn.

---

## Safe Mode Integration Requirements

### When Safe Mode Turns ON

**Required Actions** (conceptual):
1. Query all interventions where `user_id = current_user` AND `status = active`
2. For each active intervention:
   - Set `status = paused`
   - Set `paused_by_safe_mode = true`
   - Set `paused_at = current_timestamp`
3. Prevent ANY intervention triggers from firing
4. Show user confirmation: "All interventions are paused"

**Test Requirement**:
```
Given: User has 5 active interventions
When: User turns ON Safe Mode
Then: All 5 interventions are paused
And: paused_by_safe_mode = true for all
And: User sees "All interventions are paused"
```

### While Safe Mode Is ON

**Required Behavior** (conceptual):
1. Before EVERY intervention trigger, check: `is_safe_mode_enabled(user_id)`
2. If Safe Mode ON: Return early (do not trigger intervention)
3. No interventions can activate, even if user tries to enable
4. UI shows: "Interventions are paused while Safe Mode is active"

**Test Requirement**:
```
Given: Safe Mode is ON
When: User tries to enable an intervention
Then: Enable action is blocked
And: User sees "Cannot enable while Safe Mode is active"
```

### When Safe Mode Turns OFF

**Required Actions** (conceptual):
1. Set `paused_by_safe_mode = false` for all interventions
2. Interventions remain `status = paused` (do NOT auto-resume)
3. Show user: "Safe Mode is OFF. Your interventions remain paused. You can re-enable them individually."
4. User must explicitly enable each intervention

**Test Requirement**:
```
Given: User turns OFF Safe Mode
Then: All interventions remain paused
And: paused_by_safe_mode = false
And: User sees message explaining interventions are still paused
And: User must manually re-enable each intervention
```

---

## Abuse Prevention (Accountability Features)

Accountability interventions (INT-009, INT-010) require additional safeguards:

### Requirement 1: Mutual Consent

**Rule**: Both parties must explicitly consent before sharing.

**Implementation Requirements** (conceptual):
- User A initiates sharing request
- User B receives invitation with full details (what will be visible)
- User B must explicitly accept
- Either party can revoke at any time
- No penalty for declining or revoking

### Requirement 2: Granular Visibility Control

**Rule**: User defines exactly what is shared (no "all or nothing").

**Implementation Requirements** (conceptual):
- User selects specific projects, milestones, or commitments
- User sees preview of what partner will see
- User can adjust visibility level
- Changes to project not automatically shared unless in visibility scope

### Requirement 3: No Monitoring

**Rule**: Partners see static information only, no activity logs or notifications.

**Implementation Requirements** (conceptual):
- Partner sees shared commitment text or milestones
- Partner does NOT see:
  - When user views shared items
  - When user works on shared items
  - Activity logs or timestamps
  - Completion status (unless explicitly shared)
- Partner receives NO notifications about user's activity

### Requirement 4: Easy Revocation

**Rule**: User can revoke sharing instantly without partner approval.

**Implementation Requirements** (conceptual):
- "Revoke Access" button always visible
- Revocation takes effect immediately
- Partner loses visibility instantly
- No notification to partner (optional: system can notify)
- No "cooling off" period

### Requirement 5: Partner Guidelines

**Rule**: Partners must see guidelines before accepting invitation.

**Implementation Requirements** (conceptual):
- Show partner guidelines before they can accept
- Guidelines emphasize: support not judgment, respect autonomy, no pressure
- Partner must acknowledge guidelines
- Guidelines accessible at any time

---

## Audit Trail Requirements

The registry must maintain a lifecycle audit trail (conceptual):

### Events to Log

**Lifecycle Events** (ALLOWED):
- ✅ `intervention_created`: User created intervention
- ✅ `intervention_enabled`: User enabled intervention
- ✅ `intervention_paused`: User or Safe Mode paused intervention
- ✅ `intervention_disabled`: User disabled intervention
- ✅ `intervention_deleted`: User deleted intervention
- ✅ `intervention_edited`: User edited parameters
- ✅ `safe_mode_paused_interventions`: Safe Mode paused all interventions

**Each log entry must include**:
- Event type
- Timestamp
- User ID (who performed action)
- Intervention ID (which intervention)
- Actor: "user" or "safe_mode" (never "system")

### Events NOT to Log

**Adherence Events** (FORBIDDEN):
- ❌ `intervention_triggered`: When intervention appeared to user
- ❌ `intervention_viewed`: User saw intervention
- ❌ `intervention_dismissed`: User closed intervention
- ❌ `intervention_ignored`: User did not respond
- ❌ `intervention_completed`: User followed intervention
- ❌ `intervention_effective`: Behavior change detected

**Why Forbidden**: These track adherence and effectiveness, which violates Stage 3 contract.

---

## Accessibility Requirements

### Visual Design Constraints

**No Urgency Cues**:
- No red/amber/green status indicators
- No flashing or pulsing elements
- No countdown timers (except user-chosen timeboxes)
- No "!" or "⚠️" urgency icons

**Calm Visual Language**:
- Neutral colors for intervention status
- No gradient fills suggesting "progress"
- No animated "celebrations" for enabling interventions

### Language Accessibility

**Clear, Simple Language**:
- Avoid jargon
- Short sentences
- Explicit explanations (no implied meaning)

**Literal Communication** (for autistic users):
- Say exactly what will happen
- No euphemisms or metaphors
- No implied pressure

**Escape Hatches**:
- Always show how to pause/disable
- Never hide opt-out behind "advanced settings"

---

## Data Retention & Deletion

### When User Deletes Intervention

**Required Actions** (conceptual):
1. Set `status = deleted`
2. Set `deleted_at = current_timestamp`
3. Soft delete (do not purge from database immediately)
4. Intervention no longer appears in user's active list
5. Intervention cannot be re-enabled (user must create new one)

**Rationale**: Soft delete preserves audit trail while respecting user's deletion intent.

### When User Deletes Account

**Required Actions** (conceptual):
1. Delete ALL interventions owned by user
2. Revoke ALL accountability sharing (partner loses visibility)
3. Remove user from ALL accountability partnerships they were partner in
4. Purge intervention data after retention period (30-90 days)

**Rationale**: User account deletion must cleanly remove all intervention data.

---

## Privacy & Security Requirements

### Data Sensitivity

**User Parameters** contain sensitive information:
- User's private reminders
- User's stated goals
- User's commitments
- User's reasons for interventions

**Protection Requirements** (conceptual):
- Encrypt `user_parameters` at rest
- Encrypt `why_text` at rest
- Limit access to intervention data to user only
- Admin access requires explicit audit log

### Sharing Controls

**Accountability Features** require strict privacy:
- Only explicitly shared data is visible to partner
- Partner cannot see user's other interventions
- Partner cannot see user's full project data
- Sharing is scoped precisely (project-level or item-level)

---

## Future Extension Points (Conceptual)

If future stages extend Stage 3, the registry must remain compatible:

### Extension Point 1: New Intervention Types

**Requirement**: New interventions must be added to ALLOWED list first.

**Process** (conceptual):
1. Design new intervention following Stage 3 contract
2. Add to `STAGE_3_0_ALLOWED_INTERVENTIONS.md`
3. Update registry to support new `intervention_key`
4. Implement with same invariants and constraints

### Extension Point 2: AI-Assisted Interventions

**Requirement**: AI may help user create interventions, but user must approve.

**Constraints** (conceptual):
- AI can suggest intervention parameters
- User must review and edit before creation
- `created_by` still equals "user" (not "ai")
- User must consent to AI assistance
- AI cannot create interventions without user review

### Extension Point 3: Cross-Project Interventions

**Requirement**: Interventions may apply across multiple projects.

**Registry Extension** (conceptual):
- Add `scope` field: "single_project", "multiple_projects", "global"
- Add `applies_to_projects` array for multi-project interventions
- Same invariants apply (user control, Safe Mode override, etc.)

---

## Implementation Checklist

Before implementing Stage 3 intervention registry, verify:

- [ ] All required fields are implemented
- [ ] All forbidden fields are NOT implemented
- [ ] All 10 invariants are enforced
- [ ] Safe Mode integration works correctly (pauses all, prevents triggers)
- [ ] Default state is OFF (opt-in only)
- [ ] User can disable with maximum 1 click
- [ ] Lifecycle-only telemetry (no adherence tracking)
- [ ] Language constraints enforced (no forbidden terms)
- [ ] No gamification elements
- [ ] Audit trail logs lifecycle events only
- [ ] Accountability features have abuse prevention
- [ ] Privacy controls protect sensitive data
- [ ] Hard caps implemented as soft warnings
- [ ] Accessibility requirements met
- [ ] All interventions match STAGE_3_0_ALLOWED_INTERVENTIONS.md

---

## Enforcement & Violations

### Automated Enforcement (Conceptual)

**Test Coverage Requirements**:
- Every invariant must have automated test
- Every forbidden field must have test verifying non-existence
- Every language constraint must have linter check
- Safe Mode override must be tested for every intervention

### Code Review Requirements

**Every Stage 3 PR must verify**:
- Intervention is in ALLOWED list
- Registry fields match specification
- No forbidden fields added
- No forbidden patterns implemented
- Language uses only allowed framing
- Safe Mode override works
- Lifecycle-only telemetry

### Violation Response

**If violation detected**:
1. Immediate rollback to pre-violation state
2. Disable affected interventions for all users
3. Audit entire Stage 3 codebase
4. Delete any forbidden data collected
5. Update documentation with violation as warning

---

## Related Documentation

- `STAGE_3_CONTRACT.md` - Parent contract with philosophical grounding
- `STAGE_3_0_ALLOWED_INTERVENTIONS.md` - Allowed interventions list
- `SEMANTIC_FIREBREAK_MAP.md` - Overall system architecture
- `STAGE_0_3_SUMMARY.md` - Prior stages (0, 1, 2, 2.1)

---

## Version

- **Version**: 1.0
- **Date**: 2024-12-15
- **Status**: Design specification (NOT YET IMPLEMENTED)
- **Next Step**: Review and approval before implementation

---

## Final Note

**This registry specification exists to enforce the Stage 3 contract.**

Every field, invariant, and constraint protects users from:
- Coercive interventions
- Surveillance and monitoring
- Gamification and addiction
- Shame and guilt-based design
- Loss of autonomy

**Any implementation that violates this specification violates the Stage 3 contract and must be rejected.**

**The registry is infrastructure for user autonomy, not system control.**
