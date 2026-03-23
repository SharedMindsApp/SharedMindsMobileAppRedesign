# Stage 3 Contract: Adaptive Interventions Layer (Ethical, User-Led, Reversible)

**Layer**: D - Intervention Layer
**Purpose**: User-controlled behavioral support tools with strict ethical constraints
**Status**: Mandatory architectural constraints (DESIGN ONLY - NOT YET IMPLEMENTED)

---

## Overview

Stage 3 (Adaptive Interventions Layer) is the highest-risk layer in the behavioral system. This layer introduces the possibility of system influence on user behavior, which requires the strictest possible ethical constraints.

**CRITICAL PRINCIPLE**: All technology influences behavior. Stage 3 exists to make this influence:
- **Transparent**: Users see exactly what is happening
- **Intentional**: Users choose what influence they want
- **Aligned**: Interventions serve user values, not system metrics
- **Reversible**: Users can undo, pause, or disable anything

Stage 3 must NEVER become a productivity optimizer, performance scorer, or behavior enforcement system.

---

## Core Philosophy

### 1. Autonomy First

**The user is the primary agent of change. The system assists; it does not decide.**

**REQUIRED**:
- ✅ User initiates all interventions or gives explicit consent
- ✅ User defines their own goals and values
- ✅ User chooses when to use tools (no forced activation)
- ✅ User can pause or disable any intervention at any time
- ✅ System supports user-defined change, not system-inferred optimization

**FORBIDDEN**:
- ❌ System inferring what user "should" do
- ❌ System defining success or failure
- ❌ System activating interventions without explicit user choice
- ❌ System penalizing users for disabling interventions
- ❌ System escalating pressure when user doesn't engage

**Violation Example**:
```
❌ FORBIDDEN
"We noticed you haven't completed your goals.
Let's help you get back on track with daily reminders!"

✅ ALLOWED
"If you want, you can set up reminders for this goal.
You can pause or remove them anytime."
```

### 2. Behavior Is Always Being Shaped

**The system acknowledges that all technology influences behavior. Stage 3 makes this influence ethical.**

**PRINCIPLE**: Denying influence is dishonest. Stage 3 exists to:
- Make influence visible
- Make influence optional
- Make influence reversible
- Align influence with user values

**The system does not pretend to be neutral. It constrains its influence ethically.**

### 3. Nudges Over Control

**Prefer awareness, friction reduction, and reflection. Avoid coercion, pressure, or forced optimization.**

**Nudge Spectrum** (from least to most forceful):
1. **Awareness**: "Here's what's happening" (passive information)
2. **Friction Reduction**: "Here's an easier path" (removing barriers)
3. **Gentle Prompt**: "You said you wanted to..." (user-defined reminder)
4. **Self-Imposed Constraint**: "You chose to limit..." (user-activated restriction)

**"Shoves" (forceful interventions) are permitted ONLY as self-imposed constraints:**
- ✅ User chooses to block distracting features
- ✅ User chooses to timebox their work
- ✅ User chooses to hide non-essential options

**Shoves are FORBIDDEN when:**
- ❌ System imposes them without explicit user activation
- ❌ System escalates them based on "non-compliance"
- ❌ System makes them difficult to disable

### 4. Neurodivergent Safety

**Stage 3 must explicitly guard against patterns that harm neurodivergent users.**

**FORBIDDEN PATTERNS** (these cause shame spirals, perfectionism, and burnout):
- ❌ Streaks (pressure to maintain unbroken chains)
- ❌ Completion percentages (focus on quantity over quality)
- ❌ "You're falling behind" messaging (comparison to idealized self)
- ❌ Escalating notifications (punishment for non-engagement)
- ❌ Red/amber/green status indicators (binary thinking)
- ❌ Productivity scores (reductive self-worth metrics)
- ❌ Time pressure without explicit user choice
- ❌ Public accountability without consent
- ❌ Gamification that triggers fixation
- ❌ "Optimal" paths that imply user is failing

**REQUIRED SAFEGUARDS**:
- ✅ Default to less intervention, not more
- ✅ Frame interventions as tools, not requirements
- ✅ Acknowledge that context changes (flexibility expected)
- ✅ No measurement of intervention adherence
- ✅ Risk disclosure for patterns that may trigger perfectionism
- ✅ Easy escape (pause, disable, delete) without penalty

**Violation Example**:
```
❌ FORBIDDEN
"You broke your 7-day focus streak!
Start a new one today to get back on track."

✅ ALLOWED
"You used Focus Mode 3 times this week.
If you want, you can use it again anytime."
```

### 5. Reversibility & Escape

**Every intervention must be pausable, disableable, and reversible.**

**REQUIRED**:
- ✅ Every intervention has a clear "pause" or "disable" control
- ✅ Disabling is immediate (no confirmation flow unless user data loss)
- ✅ Re-enabling is just as easy as disabling
- ✅ No penalties for pausing or disabling
- ✅ No guilt-inducing language when user opts out
- ✅ Safe Mode immediately overrides ALL Stage 3 interventions

**FORBIDDEN**:
- ❌ "Are you sure?" dialogs that discourage disabling
- ❌ Hiding the disable button
- ❌ Requiring explanation for why user is disabling
- ❌ Loss of access to other features when intervention disabled
- ❌ Notification spam after user disables intervention

**Safe Mode Integration**:
- ✅ Safe Mode ALWAYS overrides Stage 3
- ✅ When Safe Mode is ON, ALL interventions are paused
- ✅ When Safe Mode is turned OFF, interventions remain paused (user must re-enable)
- ✅ Safe Mode cannot be overridden by Stage 3 logic

---

## What Stage 3 IS

Stage 3 is:

### 1. A User-Controlled Intervention Layer
- Users choose what interventions to enable
- Users define the parameters (frequency, timing, content)
- Users can modify or disable at any time

### 2. A Place for Intentional Self-Regulation Tools
- Tools for implementing user-defined strategies
- Support for values the user has explicitly stated
- Structures the user chooses to help themselves

### 3. A Bridge Between Awareness and Action
- Stage 2 shows patterns (awareness)
- Stage 3 offers tools to respond (action)
- User decides if/when to use the bridge

### 4. A System for Small, Reversible Behavioral Experiments
- "Try this for a week and see how it feels"
- No commitment, no penalty for stopping
- User evaluates effectiveness, not system

### 5. A Way to Support User-Chosen Values
- User explicitly states: "I want to focus on deep work"
- System offers: "Here's a tool that might help with that"
- User decides whether to use it

**Stage 3 supports user agency in behavior change.**

---

## What Stage 3 IS NOT

Stage 3 is NOT:

### 1. A Productivity Optimizer
- ❌ System does not define productivity
- ❌ System does not measure output
- ❌ System does not compare user to ideal performance
- ❌ System does not suggest "more efficient" paths

### 2. A Performance Scoring Engine
- ❌ No scores, grades, or ratings of user behavior
- ❌ No comparison to other users
- ❌ No comparison to past self (unless user explicitly requests)
- ❌ No "health scores" or "wellness ratings"

### 3. A Habit Enforcement System
- ❌ System does not enforce habits
- ❌ System does not punish non-completion
- ❌ System does not escalate pressure
- ❌ System does not track "consistency"

### 4. A Recommendation Engine
- ❌ System does not recommend interventions based on inferred weakness
- ❌ System does not suggest "people like you usually do X"
- ❌ System does not optimize for engagement or retention

### 5. A Motivational Pressure System
- ❌ No motivational quotes or pressure messaging
- ❌ No "you can do it!" cheerleading
- ❌ No "don't give up!" persistence messaging
- ❌ No artificial urgency or scarcity

### 6. A Surveillance or Compliance Mechanism
- ❌ System does not track intervention adherence
- ❌ System does not report non-compliance to others
- ❌ System does not measure "engagement" with interventions
- ❌ System does not use intervention data for recommendations

### 7. A System That Defines "Good" or "Bad" Behavior
- ❌ System does not judge user behavior
- ❌ System does not imply right or wrong
- ❌ System does not define success or failure
- ❌ System remains neutral about user choices

**Stage 3 does not optimize, enforce, or judge.**

---

## Allowed Intervention Categories (Conceptual Only)

**NOTE**: These are conceptual descriptions only. No implementation logic is defined here.

### Category 1: User-Initiated Nudges

**Description**: Gentle prompts that the user explicitly creates and schedules.

**Examples** (conceptual):
- Implementation intentions: "If it's 9am on weekday, remind me to review my project plan"
- Context-aware prompts: "When I open Project X, show me my stated goal for today"
- User-scheduled reminders: "Every Monday at 10am, ask me if I want to do a weekly review"

**REQUIRED**:
- ✅ User creates the nudge (system does not suggest)
- ✅ User defines the trigger condition
- ✅ User defines the message content
- ✅ User can edit or delete at any time
- ✅ Nudge shows why it exists ("You created this reminder on...")

**FORBIDDEN**:
- ❌ System creating nudges based on inferred patterns
- ❌ System suggesting nudge content
- ❌ System increasing nudge frequency if user ignores
- ❌ System showing "you've ignored this 3 times" messaging

**Language Pattern**:
```
✅ ALLOWED
"You asked to be reminded: [user's exact words]
This reminder was created on [date].
[Pause] [Edit] [Delete]"

❌ FORBIDDEN
"You haven't started this task yet.
Let's try to get it done today!"
```

### Category 2: Friction Reduction Tools

**Description**: Tools that make user-chosen actions easier by removing barriers.

**Examples** (conceptual):
- Breaking complex tasks into smaller steps (user initiates)
- Temporarily hiding non-essential UI elements (user chooses)
- Simplifying views during focus periods (user activates)
- Pre-populating forms with previous choices (user approves)

**REQUIRED**:
- ✅ User chooses to enable friction reduction
- ✅ System shows what was simplified or hidden
- ✅ User can restore full complexity at any time
- ✅ No assumption that simpler is better (user decides)

**FORBIDDEN**:
- ❌ System automatically simplifying without user choice
- ❌ System hiding features to "protect" user from distraction
- ❌ System permanently removing complexity
- ❌ System suggesting user is "overwhelmed" or needs simplification

**Language Pattern**:
```
✅ ALLOWED
"This view hides secondary options.
You can show them anytime by clicking [Show All].
You chose this simplification on [date]."

❌ FORBIDDEN
"We've simplified this to help you focus better.
Most users find this less overwhelming."
```

### Category 3: Self-Imposed Constraints ("Soft Shoves")

**Description**: User-activated restrictions that limit system functionality to support user-defined goals.

**Examples** (conceptual):
- Focus Mode that hides unrelated projects (user turns ON)
- Feature suppression for distraction management (user chooses)
- Timeboxing that shows gentle alerts (user sets duration)
- Self-imposed deadlines with no penalty for missing (user creates)

**REQUIRED**:
- ✅ User explicitly activates constraint
- ✅ Constraint has clear end condition (time, manual toggle)
- ✅ User can override or disable instantly
- ✅ No tracking of how often user "breaks" constraint
- ✅ Constraint serves user-stated goal (documented)

**FORBIDDEN**:
- ❌ System activating constraints automatically
- ❌ System making constraints difficult to override
- ❌ System shaming user for overriding constraint
- ❌ System suggesting user needs constraints
- ❌ System tracking "compliance" with constraints

**Language Pattern**:
```
✅ ALLOWED
"Focus Mode is active. Projects not related to [X] are hidden.
You can exit Focus Mode anytime. [Exit Now]
You started this session at [time]."

❌ FORBIDDEN
"Focus Mode helps you avoid distractions.
You've exited early 3 times this week.
Try to complete the full session!"
```

### Category 4: Accountability Structures

**Description**: Optional sharing of user-defined commitments with chosen accountability partners.

**Examples** (conceptual):
- Sharing project milestones with accountability partner (mutual consent)
- Voluntary check-ins with chosen supporter (user initiates)
- Shared visibility of user-stated goals (explicit permission)

**REQUIRED**:
- ✅ Both parties give explicit consent
- ✅ User controls what is shared (granular permissions)
- ✅ User can revoke sharing at any time
- ✅ No public visibility (always private 1:1 or small group)
- ✅ No automatic notifications to accountability partner
- ✅ Partner cannot judge or score user behavior

**FORBIDDEN**:
- ❌ System suggesting accountability partners
- ❌ Public leaderboards or comparisons
- ❌ Ranking of users by adherence
- ❌ Notification to partner if user "fails" commitment
- ❌ System encouraging partner to "check in" on user
- ❌ Group visibility without explicit opt-in from all members

**Language Pattern**:
```
✅ ALLOWED
"You chose to share [specific milestone] with [name].
They can see: [list of visible items].
They cannot see: [list of hidden items].
You can stop sharing anytime. [Manage Sharing]"

❌ FORBIDDEN
"Your accountability partner can see you haven't completed this.
Letting them down might motivate you to finish!"
```

---

## Forbidden Intervention Patterns (Explicit Prohibitions)

The following intervention patterns are FORBIDDEN and constitute architectural violations:

### 1. System-Initiated Nudges Based on Inferred Weakness

**Pattern**: System detects user "struggling" and suggests intervention.

**Example**:
```
❌ FORBIDDEN
"We noticed you've been spending less time on Project X.
Would you like us to send daily reminders?"
```

**Why Forbidden**: Implies system knows better than user. Creates shame.

### 2. Automated Reminders Without User Scheduling

**Pattern**: System creates reminders based on system logic, not user request.

**Example**:
```
❌ FORBIDDEN
"You haven't logged into Guardrails today.
Here's a reminder to check your roadmap!"
```

**Why Forbidden**: Optimizes for engagement, not user goals.

### 3. Escalating Notification Frequency

**Pattern**: System increases notification frequency if user doesn't respond.

**Example**:
```
❌ FORBIDDEN
Day 1: "Reminder: Complete task X"
Day 2: "Reminder: Complete task X (sent at 9am)"
Day 3: "Reminder: Complete task X (sent at 9am, 12pm)"
```

**Why Forbidden**: Punishes non-engagement. Creates pressure.

### 4. Punitive Feedback for Non-Completion

**Pattern**: System implies negative consequences for not completing interventions.

**Example**:
```
❌ FORBIDDEN
"You missed 3 focus sessions this week.
Your consistency is declining."
```

**Why Forbidden**: Shame-based. Measures adherence, not outcomes.

### 5. "You're Falling Behind" Messaging

**Pattern**: System compares user to ideal or past self in negative framing.

**Example**:
```
❌ FORBIDDEN
"You completed 5 tasks last week, but only 2 this week.
Let's get back on track!"
```

**Why Forbidden**: Defines success as consistency. Ignores context.

### 6. Withholding Features to Force Compliance

**Pattern**: System locks features until user completes intervention.

**Example**:
```
❌ FORBIDDEN
"Complete your daily reflection to unlock roadmap view."
```

**Why Forbidden**: Coercive. Turns tool into requirement.

### 7. Addiction-Like Reward Schedules

**Pattern**: Variable-interval rewards that maximize engagement.

**Example**:
```
❌ FORBIDDEN
"Random chance of celebration animation when you complete a task!"
"Surprise rewards for logging in daily!"
```

**Why Forbidden**: Exploits psychology for engagement, not user benefit.

### 8. Optimization for Engagement, Time-in-App, or Retention

**Pattern**: System interventions designed to increase usage metrics.

**Example**:
```
❌ FORBIDDEN
[Internal Logic]
if (days_since_last_login > 3) {
  send_email("We miss you! Come back to see your progress.");
}
```

**Why Forbidden**: Serves system goals, not user goals.

### 9. Shame-Based or Guilt-Inducing Language

**Pattern**: Messaging that implies user is failing or disappointing.

**Example**:
```
❌ FORBIDDEN
"Don't give up now! You're so close!"
"You've come this far, don't let yourself down."
"Imagine how you'll feel if you quit."
```

**Why Forbidden**: Manipulative. Activates shame and guilt.

### 10. Comparison to Other Users

**Pattern**: Showing user how they rank relative to others.

**Example**:
```
❌ FORBIDDEN
"You're in the top 20% of focused users!"
"Users like you usually complete 7 tasks per week."
```

**Why Forbidden**: Triggers competition and inadequacy.

### 11. Default-ON Interventions

**Pattern**: Interventions enabled by default without user choice.

**Example**:
```
❌ FORBIDDEN
[All users automatically have daily goal reminders enabled.
They must find settings to disable.]
```

**Why Forbidden**: Violates autonomy. Assumes system knows best.

### 12. Hidden or Difficult Opt-Out

**Pattern**: Making it hard to disable interventions.

**Example**:
```
❌ FORBIDDEN
[Disable button is in Settings > Advanced > Experimental > Interventions]
[Clicking disable shows 3 confirmation dialogs with guilt messaging]
```

**Why Forbidden**: Dark pattern. Violates reversibility principle.

---

## Consent & Control Requirements

### 1. Explicit, Granular Consent

**REQUIRED**:
- ✅ User gives consent per intervention type (not blanket consent)
- ✅ Consent flow explains exactly what will happen
- ✅ Consent includes example of what user will see/experience
- ✅ User can grant or revoke consent at any time
- ✅ No intervention activates without explicit consent

**FORBIDDEN**:
- ❌ Blanket "Enable all interventions?" consent
- ❌ Hidden consent in Terms of Service
- ❌ Consent with double negatives ("Don't disable reminders?")
- ❌ Consent that expires or needs renewal

**Consent Flow Pattern**:
```
✅ ALLOWED
"Intervention Type: User-Scheduled Reminders

What this does:
- Shows prompts you create at times you specify
- You control the message, frequency, and timing
- You can edit or delete reminders anytime

What this does NOT do:
- System will not create reminders for you
- System will not increase reminder frequency
- System will not judge you for ignoring reminders

Risks to consider:
- Reminders may become noise if overused
- Reminders may trigger perfectionistic thinking

[Enable] [Learn More] [Not Now]"
```

### 2. Clear Explanation of Risks

**REQUIRED**: All interventions must disclose risks, especially for neurodivergent users.

**Risk Disclosure Requirements**:
- ✅ Explain potential negative psychological effects
- ✅ Acknowledge that intervention may not be helpful for everyone
- ✅ Highlight risks of fixation, perfectionism, or shame
- ✅ Suggest starting with minimal intervention

**Risk Disclosure Pattern**:
```
✅ ALLOWED
"Risks to consider:
- Daily nudges may feel like pressure if you're already overwhelmed
- Tracking completions may trigger 'all or nothing' thinking
- This tool is optional; many users find it more helpful to not use it

If this feels unhelpful or stressful, pause it anytime."
```

### 3. Easy Opt-Out at Any Time

**REQUIRED**:
- ✅ Every intervention has visible "Pause" or "Disable" button
- ✅ Disabling takes effect immediately (no delay)
- ✅ Disabling requires maximum 1 confirmation (only if data loss)
- ✅ User can re-enable just as easily as disable
- ✅ Opt-out is persistent (no re-prompting to enable)

**FORBIDDEN**:
- ❌ Multiple confirmation dialogs to disable
- ❌ Requiring reason for disabling
- ❌ Guilt messaging when disabling ("Are you sure you want to give up?")
- ❌ Re-prompting user to re-enable after they disabled
- ❌ Hiding disable button after intervention is active

### 4. No Penalties for Disabling

**REQUIRED**:
- ✅ User retains full access to all features when intervention disabled
- ✅ No loss of data when intervention disabled
- ✅ No change in system behavior beyond the intervention itself
- ✅ Neutral acknowledgment of disabling ("Intervention paused")

**FORBIDDEN**:
- ❌ Locking features if user disables intervention
- ❌ Showing "you'll miss out" messaging
- ❌ Tracking how often user disables interventions
- ❌ Suggesting user is "quitting" or "giving up"

---

## Safe Mode Integration (Mandatory Override)

### 1. Safe Mode Always Overrides Stage 3

**REQUIRED**:
- ✅ When Safe Mode is ON, ALL interventions are immediately paused
- ✅ No interventions can activate while Safe Mode is ON
- ✅ Safe Mode cannot be overridden by any Stage 3 logic
- ✅ Safe Mode status is checked before every intervention trigger

**Implementation Note** (conceptual):
```typescript
// Pseudocode (not real implementation)
async function triggerIntervention(interventionId) {
  const safeModeEnabled = await isSafeModeEnabled(userId);
  if (safeModeEnabled) {
    return; // Hard stop, no intervention
  }
  // Continue with intervention logic...
}
```

### 2. Interventions Remain Paused When Safe Mode Turns OFF

**REQUIRED**:
- ✅ When user turns OFF Safe Mode, interventions stay paused
- ✅ User must explicitly re-enable each intervention
- ✅ No automatic resumption of interventions
- ✅ System shows which interventions were paused

**FORBIDDEN**:
- ❌ Auto-resuming interventions when Safe Mode turns OFF
- ❌ Prompting user to re-enable interventions
- ❌ "Restore previous state?" messaging

**Pattern**:
```
✅ ALLOWED
"Safe Mode is now OFF.
The following interventions remain paused:
- Daily focus reminders
- Project milestone nudges

You can re-enable them individually in Settings."

❌ FORBIDDEN
"Safe Mode is OFF.
Would you like to restore your previous interventions?"
```

### 3. Safe Mode Language Must Be Calm

**REQUIRED**:
- ✅ Neutral acknowledgment: "All interventions are paused"
- ✅ No urgency or alarm
- ✅ No suggestion that Safe Mode is "emergency only"

**FORBIDDEN**:
- ❌ "WARNING: Safe Mode is ON"
- ❌ "Interventions are disabled due to Safe Mode"
- ❌ Red or alarming visual indicators

---

## Language Rules (Mandatory)

### Forbidden Terms (NEVER use in Stage 3)

**The following terms are FORBIDDEN in all Stage 3 UI, messaging, and logic:**

❌ **Performance/Evaluation**:
- productive / unproductive
- effective / ineffective
- optimal / suboptimal
- success / failure
- good / bad / better / worse
- improve / decline
- progress / regress
- high-performing / low-performing

❌ **Pressure/Obligation**:
- should / shouldn't
- must / have to
- need to / supposed to
- required / mandatory
- commitment / obligation

❌ **Gamification**:
- streak
- level / level up
- achievement (except in context of user-defined goals)
- badge / trophy / medal
- score / points / rank
- leaderboard / top performer

❌ **Comparison**:
- behind / ahead
- catching up / falling behind
- on track / off track
- consistency score
- completion rate
- engagement rate

❌ **Motivation/Pressure**:
- don't give up
- keep going
- you can do it
- push through
- stay strong
- finish what you started

**Violation Examples**:
```
❌ FORBIDDEN
"You're falling behind on your goals.
Let's get you back on track with daily reminders!"

❌ FORBIDDEN
"Great job! You've maintained a 7-day focus streak.
Don't break it now!"

❌ FORBIDDEN
"You should complete this task today to stay productive."
```

### Allowed Framing (Use These Patterns)

**The following framing patterns are ALLOWED:**

✅ **Optional/Choice-Based**:
- "If you want..."
- "You can choose to..."
- "This tool is available..."
- "Would you like to...?"
- "You have the option to..."

✅ **User-Initiated**:
- "You chose..."
- "You created..."
- "You asked to be reminded..."
- "You set this up on [date]..."

✅ **Neutral Observation**:
- "This happened [X] times"
- "You used this tool on [dates]"
- "This was created on [date]"
- "This shows [neutral data]"

✅ **Transparency**:
- "This does not evaluate your performance"
- "You can pause or disable this anytime"
- "This is a tool, not a requirement"
- "Many users find this unhelpful and disable it"

✅ **Reversibility**:
- "Pause anytime"
- "Disable this"
- "You can change this later"
- "This is reversible"

**Allowed Examples**:
```
✅ ALLOWED
"You created this reminder on [date]: [user's exact words]
If you want, you can pause or delete it. [Pause] [Delete]"

✅ ALLOWED
"You've used Focus Mode 4 times this week.
You can start a session anytime or disable this feature."

✅ ALLOWED
"If you want, you can set up a weekly check-in reminder.
This is optional. You can change or remove it later."
```

### Language Tone Requirements

**REQUIRED**:
- ✅ Calm, neutral tone (not cheerful, not urgent)
- ✅ Second person ("you"), not third person ("users")
- ✅ Specific, not vague ("You created this on Monday" not "Recently")
- ✅ Honest about limitations ("This may not be helpful")

**FORBIDDEN**:
- ❌ Exclamation points (implies excitement or urgency)
- ❌ Emojis (implies gamification or cheerfulness)
- ❌ ALL CAPS (implies urgency or shouting)
- ❌ Ellipses implying suspense ("You're so close...")
- ❌ Questions that assume answer ("Want to succeed?")

---

## Auditability & Transparency (Conceptual)

### 1. Visibility Into Active Interventions

**REQUIRED**: Users must be able to see:
- ✅ What interventions are currently active
- ✅ When each intervention was enabled
- ✅ Why each intervention exists (user chose, explicit goal stated)
- ✅ What each intervention does (clear description)
- ✅ What each intervention does NOT do (explicit disclaimers)

**UI Concept** (description only, not implementation):
```
Intervention Dashboard (conceptual)

Active Interventions:
1. "Focus Mode Reminder"
   - Created: Dec 1, 2024
   - Why: You chose to be reminded at 9am weekdays
   - What it does: Shows your project goal at 9am Mon-Fri
   - What it does NOT: Track whether you started focus mode
   [Pause] [Edit] [Delete]

2. "Weekly Reflection Prompt"
   - Created: Nov 15, 2024
   - Why: You set up a weekly check-in
   - What it does: Shows optional reflection prompt on Sundays
   - What it does NOT: Require you to reflect, track completion
   [Pause] [Edit] [Delete]
```

### 2. Distinction Between Observation, Insight, and Intervention

**REQUIRED**: System must clearly distinguish:
- **Stage 0 (Observation)**: "You opened Project X at 2pm"
- **Stage 1 (Signal)**: "Your activity pattern shows afternoon focus"
- **Stage 2 (Insight)**: "Displaying signal: afternoon focus pattern"
- **Stage 3 (Intervention)**: "You chose to be reminded to focus at 2pm"

**Each stage must label itself:**
```
✅ ALLOWED
[Observation] Session started at 2:15pm
[Signal] Afternoon focus pattern detected
[Insight] Displaying pattern: afternoon focus
[Intervention] Your 2pm reminder: "Focus on deep work"
```

### 3. Why Something Exists (User Choice, Not System Inference)

**REQUIRED**: Every intervention must document:
- ✅ When user created or enabled it
- ✅ What user-stated goal it serves (if any)
- ✅ What user explicitly chose (parameters, timing, content)

**FORBIDDEN**:
- ❌ Interventions without clear user provenance
- ❌ System-suggested interventions presented as user-chosen
- ❌ Interventions that imply "we thought this would help"

**Pattern**:
```
✅ ALLOWED
"You created this nudge on Dec 1, 2024.
You wrote: 'Remind me to review my project plan every Monday.'
This serves your stated goal: 'Stay aligned with project direction.'"

❌ FORBIDDEN
"This reminder was created to help you stay on track."
```

---

## Data Requirements (Conceptual Only)

**NOTE**: These are conceptual requirements, not database schemas.

### 1. Intervention Registry

Each intervention must store:
- Intervention ID (unique)
- User ID (owner)
- Intervention type (from allowed categories)
- Status (active, paused, disabled)
- Created timestamp
- Enabled timestamp (when user activated)
- Disabled timestamp (if paused)
- User-stated goal (optional, user's words)
- User-defined parameters (trigger, message, frequency)
- Consent granted timestamp

### 2. Intervention Audit Log

System must log:
- When intervention was created (by user)
- When intervention was enabled (by user)
- When intervention was paused (by user)
- When intervention was deleted (by user)
- When Safe Mode disabled intervention (automatic)

System must NOT log:
- ❌ Whether user "responded" to intervention
- ❌ Whether user "completed" suggested action
- ❌ How often user ignores intervention
- ❌ Intervention "effectiveness" metrics

### 3. No Derived Metrics on Intervention Adherence

**FORBIDDEN**: Creating metrics like:
- ❌ Intervention completion rate
- ❌ Intervention ignore rate
- ❌ Intervention effectiveness score
- ❌ User engagement with interventions

**Why Forbidden**: These metrics optimize for intervention use, not user benefit.

---

## Integration with Existing Stages

### With Stage 0 (Raw Events)

**Relationship**: Stage 3 may use Stage 0 events to trigger user-defined interventions.

**ALLOWED**:
- ✅ User creates trigger: "When I start a focus session, show me my goal"
- ✅ System uses `focus_session_started` event to trigger user's chosen prompt

**FORBIDDEN**:
- ❌ System analyzing events to suggest interventions
- ❌ System creating interventions based on event patterns

### With Stage 1 (Signals)

**Relationship**: Stage 3 may use Stage 1 signals in user-defined interventions.

**ALLOWED**:
- ✅ User views signal "afternoon focus pattern"
- ✅ User chooses to create reminder: "Remind me to focus at 2pm"
- ✅ System uses signal to inform reminder timing (user approved)

**FORBIDDEN**:
- ❌ System suggesting intervention because signal shows "issue"
- ❌ System automatically creating intervention from signal

### With Stage 2 (Display)

**Relationship**: Stage 3 interventions may reference Stage 2 insights.

**ALLOWED**:
- ✅ Insight card shows: "Your afternoon focus pattern"
- ✅ Insight card offers: "If you want, create a reminder for 2pm"
- ✅ User clicks, creates intervention with that timing

**FORBIDDEN**:
- ❌ Insight card automatically creating intervention
- ❌ "Enable recommended intervention" button without explanation

### With Stage 2.1 (Reflections)

**Relationship**: Stage 3 interventions may include optional reflection prompts.

**ALLOWED**:
- ✅ User creates intervention: "Prompt me to reflect on Sundays"
- ✅ System shows prompt (user's words) at user-chosen time
- ✅ User chooses whether to write reflection (optional)

**FORBIDDEN**:
- ❌ Intervention requiring reflection to continue
- ❌ Tracking whether user reflected after intervention
- ❌ "You haven't reflected yet" follow-up prompts

### With Safe Mode (Stage 2)

**Relationship**: Safe Mode ALWAYS overrides Stage 3.

**REQUIRED**:
- ✅ Check Safe Mode status before every intervention trigger
- ✅ Pause all interventions when Safe Mode turns ON
- ✅ Keep interventions paused when Safe Mode turns OFF

**FORBIDDEN**:
- ❌ Stage 3 logic that bypasses Safe Mode
- ❌ "Critical" interventions that override Safe Mode
- ❌ Suggesting user disable Safe Mode to use interventions

---

## Enforcement & Compliance

### 1. Architectural Invariants

The following rules are **ARCHITECTURAL INVARIANTS** and must never be violated:

**INVARIANT 1**: No intervention activates without explicit user initiation or consent
**INVARIANT 2**: Safe Mode always overrides all Stage 3 logic
**INVARIANT 3**: User can pause, edit, or delete any intervention at any time
**INVARIANT 4**: No tracking of intervention adherence or compliance
**INVARIANT 5**: No optimization for engagement, retention, or time-in-app
**INVARIANT 6**: Language must use approved framing (no forbidden terms)
**INVARIANT 7**: No gamification elements (streaks, scores, rankings)
**INVARIANT 8**: No comparison to other users or idealized self
**INVARIANT 9**: No punitive feedback for disabling or ignoring interventions
**INVARIANT 10**: Risk disclosure required for all interventions

### 2. Compliance Checklist

Before implementing any Stage 3 feature, verify:

- [ ] Intervention is in allowed category (User-Initiated Nudges, Friction Reduction, Self-Imposed Constraints, or Accountability)
- [ ] User gives explicit consent before activation
- [ ] Intervention includes risk disclosure
- [ ] User can pause, edit, or delete intervention
- [ ] Safe Mode disables this intervention
- [ ] No tracking of intervention adherence
- [ ] Language uses only allowed framing (no forbidden terms)
- [ ] No gamification elements
- [ ] No comparison to others or idealized self
- [ ] Intervention documents user provenance (when created, why)

### 3. Violation Response

If a Stage 3 implementation violates this contract:

**IMMEDIATE ACTIONS**:
1. Disable the violating intervention immediately
2. Notify affected users
3. Delete any derived compliance/adherence data
4. Rollback code to pre-violation state

**REMEDIATION**:
1. Audit entire Stage 3 codebase for similar violations
2. Add automated tests to prevent recurrence
3. Update this contract with violation as example
4. Review consent flows to ensure clarity

**ESCALATION**:
- Any violation of architectural invariants is a **critical breach**
- Violations must be treated as bugs of highest severity
- Product decisions cannot override these constraints

### 4. Code Review Requirements

All Stage 3 code must be reviewed for:

1. **Autonomy**: Does user initiate or consent?
2. **Reversibility**: Can user disable easily?
3. **Transparency**: Is provenance clear?
4. **Language**: Any forbidden terms?
5. **Pressure**: Any coercive patterns?
6. **Gamification**: Any streaks, scores, or rankings?
7. **Safe Mode**: Does Safe Mode override?
8. **Neurodivergent Safety**: Any shame spirals, perfectionism triggers?

### 5. Automated Testing Requirements

Tests must verify:

```typescript
// Conceptual test patterns (not implementation)

test('Intervention does not activate without user consent', async () => {
  // Create intervention
  // Verify it is disabled by default
  // Verify no triggers fire until user enables
});

test('Safe Mode overrides all interventions', async () => {
  // Enable intervention
  // Turn ON Safe Mode
  // Verify intervention does not trigger
  // Verify intervention is paused
});

test('User can disable intervention instantly', async () => {
  // Enable intervention
  // Disable intervention
  // Verify status is immediately "disabled"
  // Verify no more triggers fire
});

test('No tracking of intervention adherence', async () => {
  // Enable intervention
  // Ignore intervention 5 times
  // Verify system does not store "ignore count"
  // Verify no "you've ignored this" messaging
});

test('Language uses only allowed framing', async () => {
  // Get intervention UI text
  // Verify no forbidden terms present
  // Verify approved framing used
});
```

---

## Success Criteria

Stage 3 implementation is compliant if:

- [ ] ✅ All interventions require explicit user consent
- [ ] ✅ All interventions can be paused/disabled instantly
- [ ] ✅ Safe Mode overrides all interventions
- [ ] ✅ No interventions use forbidden terms
- [ ] ✅ No gamification elements (streaks, scores, rankings)
- [ ] ✅ No tracking of intervention adherence
- [ ] ✅ Risk disclosure present for all interventions
- [ ] ✅ User provenance documented for all interventions
- [ ] ✅ No optimization for engagement or retention
- [ ] ✅ No comparison to other users
- [ ] ✅ Language uses only allowed framing
- [ ] ✅ Interventions default to OFF (opt-in only)
- [ ] ✅ No penalties for disabling interventions
- [ ] ✅ Clear distinction between Stage 0, 1, 2, 2.1, and 3
- [ ] ✅ Automated tests verify compliance

---

## Known Risks & Mitigations

### Risk 1: Scope Creep into Recommendation Engine

**Risk**: Over time, developers add "helpful suggestions" that violate autonomy.

**Mitigation**:
- Explicit prohibition in contract
- Code review checklist includes autonomy check
- Automated tests verify user-initiation
- Regular audit of intervention registry

### Risk 2: Gamification Through "Neutral" Metrics

**Risk**: Displaying "neutral" counts that users interpret as scores.

**Example**: "You used Focus Mode 7 times this week"
(User interprets: "I should use it 7 times every week")

**Mitigation**:
- Avoid displaying intervention use frequency
- If displayed, include disclaimer: "This is not a target or goal"
- Monitor user feedback for signs of pressure

### Risk 3: Interventions Become Expected or Required

**Risk**: Users feel pressure to enable interventions due to social norms.

**Mitigation**:
- Explicit messaging: "Many users find interventions unhelpful and disable them"
- Risk disclosure highlights that interventions are optional
- No features locked behind intervention use

### Risk 4: Safe Mode Becomes "Emergency Only"

**Risk**: Users perceive Safe Mode as last resort, not regular tool.

**Mitigation**:
- Language frames Safe Mode as anytime tool
- No alarming visual indicators
- Encourage regular use without judgment

### Risk 5: Accountability Becomes Social Pressure

**Risk**: Accountability partners judge or pressure users.

**Mitigation**:
- Explicit rules for accountability partners (no judgment)
- User controls exactly what is shared
- User can revoke sharing instantly
- No automatic notifications to partners

---

## Future-Proofing Clause

This contract applies to ALL future Stage 3 features, including:

- Any new intervention categories
- Any AI-powered interventions
- Any predictive interventions
- Any adaptive interventions
- Any social interventions

**No future feature is exempt from these constraints.**

If a future feature cannot comply with this contract, it MUST NOT be implemented in Stage 3.

---

## Philosophical Note: Why These Constraints Exist

Traditional productivity and behavior-change systems optimize for:
- Engagement (time in app)
- Retention (users coming back)
- Adherence (following system suggestions)
- Virality (social pressure to participate)

These optimizations serve the system, not the user.

**Stage 3 exists to flip this:**
- Optimize for user autonomy, not engagement
- Optimize for user values, not retention
- Optimize for user choice, not adherence
- Optimize for user privacy, not virality

**Stage 3 is not about making users more productive. It's about giving users tools to support their own definition of productivity.**

---

## Related Documentation

- `STAGE_0_3_SUMMARY.md` - Stage 0 implementation (raw events)
- `STAGE_1_CONTRACT.md` - Stage 1 constraints (signals)
- `STAGE_2_CONTRACT.md` - Stage 2 constraints (display)
- `STAGE_2_1_CONTRACT.md` - Stage 2.1 constraints (reflections)
- `SEMANTIC_FIREBREAK_MAP.md` - Overall architecture

---

## Version

- **Version**: 1.0
- **Date**: 2024-12-15
- **Status**: Active (Design Only - Not Yet Implemented)
- **Next Step**: Review and approval before any implementation begins

---

## Final Reminder

**This contract exists to prevent harm.**

Interventions are the most dangerous layer in a behavioral system. They have the potential to:
- Create shame spirals
- Trigger perfectionism
- Establish addictive patterns
- Erode autonomy
- Optimize for system benefit over user benefit

**Every constraint in this contract protects users from these harms.**

**No product decision, no business requirement, no user request justifies violating these constraints.**

**If a feature cannot be implemented within these constraints, it MUST NOT be implemented in Stage 3.**
