# Semantic Firebreak Map - Stage 0.3

**Status**: Design Phase (No Implementation)
**Purpose**: Prevent interpretive logic from contaminating Stage 0 behavioral foundation

---

## 1. "Meaning Leak" Inventory (Full System Scan)

### HIGH RISK - Active Interpretation Systems

#### 1.1 Habits & Achievements System
**Location**: `src/lib/habits.ts`, `src/lib/achievements.ts`, `src/lib/behaviourTypes.ts`

**Risk Level**: **CRITICAL HIGH**

**Leak Vectors**:
- Computes streaks (current_streak, longest_streak)
- Calculates completion rates
- Assigns achievement badges based on thresholds
- Labels behavior as "success" (CompletionResult.success field)
- Tracks "habit mastery" and "calendar consistency"
- Computes "impact scores" for contributions

**Current Status**: Fully implemented and active

**Evidence**:
```typescript
// behaviourTypes.ts lines 126-132
interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate: number;
}

// behaviourTypes.ts lines 179-185
interface CompletionResult {
  success: boolean;  // ← SEMANTIC LEAK
  streak_info?: StreakInfo;
  goal_progress_updated?: boolean;
}
```

**Required Containment**:
1. **Isolate**: Move all streak/completion logic to dedicated Stage 1 module
2. **Quarantine data**: Existing habit_entries table is fine (factual), but aggregations must move
3. **Ban Stage 0 access**: Habits system must NOT write to behavioral_events
4. **Add consent gate**: Users must opt-in to "habit tracking interpretation"

---

#### 1.2 Insights & Analytics Dashboard
**Location**: `src/lib/insights.ts`, `src/lib/insightsTypes.ts`, `src/components/insights/`

**Risk Level**: **CRITICAL HIGH**

**Leak Vectors**:
- Computes "family overview" with collective metrics
- Calculates member "completion rates"
- Aggregates "contribution scores"
- Generates "weekly reports" with interpretive summaries
- Tracks "mood insights" and correlates with activity
- Computes "social insights" for household dynamics

**Current Status**: Fully implemented and active

**Evidence**:
```typescript
// insights.ts lines 91-93
const completionRate = totalPossibleHabits > 0
  ? Math.round((completions / totalPossibleHabits) * 100)
  : 0; // ← COMPLETION RATE = INTERPRETATION
```

**Required Containment**:
1. **Isolate**: Move to Stage 2 "Feedback & UX Layer"
2. **Consent gate**: All insights hidden by default, opt-in per category
3. **Ban Stage 0 access**: Insights must NOT read from behavioral_events (yet)
4. **Transparency**: Users can see HOW each insight was computed

---

#### 1.3 Focus Mode Analytics
**Location**: `src/lib/guardrails/focus.ts`, `src/components/guardrails/focus/FocusAnalytics.tsx`

**Risk Level**: **HIGH**

**Leak Vectors**:
- Computes "focus_score" (0-100)
- Tracks "drift_count" with negative connotation
- Calculates "productivity trend"
- Aggregates "average score" over time periods
- Labels sessions with "effectiveness" metrics
- Generates "session quality" assessments

**Current Status**: Partially implemented

**Evidence**:
```typescript
// FocusAnalytics.tsx lines 50-52
const avgScore = daySessions.length > 0
  ? daySessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / daySessions.length
  : 0; // ← SCORING = JUDGMENT

// Line 79
function getProductivityTrend() // ← "PRODUCTIVITY" = SEMANTIC LEAK
```

**Required Containment**:
1. **Isolate**: Move all scoring to Stage 2
2. **Reframe**: "focus_score" → "declared_intent_alignment" (factual match, not quality)
3. **Consent gate**: User opts into "focus pattern visibility"
4. **Stage 0 integration**: Focus sessions CAN append behavioral events (start/end times only)

---

#### 1.4 AI Assistant & Roadmap Generator
**Location**: `src/lib/guardrails/ai/`, `supabase/functions/generate-ai-roadmap/`

**Risk Level**: **HIGH**

**Leak Vectors**:
- May "recommend based on history"
- Could hallucinate patterns that don't exist
- Might label user behavior as "productive" or "ineffective"
- May optimize suggestions based on past completion rates
- Could introduce bias through "success prediction"

**Current Status**: Implemented, context-aware

**Evidence**:
- AI reads user context for roadmap generation
- No explicit behavioral event integration yet, but risk is HIGH for future

**Required Containment**:
1. **Treat as untrusted**: AI outputs are SUGGESTIONS, not truth
2. **No behavioral access at Stage 0**: AI must NOT read behavioral_events directly
3. **Stage 1 mediation**: AI gets pre-filtered, consent-gated signals only
4. **Hallucination warnings**: All AI insights labeled as "AI-generated, verify accuracy"
5. **Consent gate**: "Allow AI to consider behavioral patterns" (default: OFF)

---

### MEDIUM RISK - Potential Interpretation Pathways

#### 1.5 Reminders & Notifications
**Location**: `src/lib/reminders.ts`, habit reminder system

**Risk Level**: **MEDIUM**

**Leak Vectors**:
- Could trigger based on "you haven't done X yet" (shaming)
- Might increase frequency if user "falls behind"
- Could compare current to past behavior for nudging
- May create "urgency" based on streak risk

**Current Status**: Basic reminders exist, not adaptive yet

**Required Containment**:
1. **Stage 0 integration**: Reminders CAN trigger behavioral events ("reminder_shown")
2. **Ban adaptation**: Reminders must NOT change based on behavioral patterns (Stage 0)
3. **Stage 4 only**: Adaptive reminders deferred to Intervention Layer
4. **Consent gate**: "Behavioral-aware reminders" (default: OFF)

---

#### 1.6 Goal & Milestone Tracking
**Location**: `src/lib/guardrails/roadmapService.ts`, goal widgets

**Risk Level**: **MEDIUM**

**Leak Vectors**:
- Labels items as "completed" (factual) vs "achieved" (interpretive)
- Might compute "goal progress percentage"
- Could compare "expected vs actual" completion dates
- May show "you're behind schedule" warnings

**Current Status**: Roadmap exists, but minimal interpretation

**Required Containment**:
1. **Factual only**: Show "Item status: completed" not "Goal achieved!"
2. **No shaming**: Never show "behind schedule" or "failing"
3. **Stage 0 integration**: Roadmap completion CAN append behavioral event
4. **Defer metrics**: Progress percentages → Stage 1

---

#### 1.7 Household Matching & Recommendations
**Location**: `src/lib/householdInsightMatch.ts`

**Risk Level**: **MEDIUM**

**Leak Vectors**:
- Matches household members based on "compatibility"
- Could suggest "who should do what" based on past behavior
- Might create "household leaderboards" (comparison risk)
- Could optimize task assignment based on completion rates

**Current Status**: Matching logic exists

**Required Containment**:
1. **Ban behavioral access**: Matching must NOT use behavioral_events
2. **Self-reported only**: Match on declared preferences, not inferred patterns
3. **No comparison**: Never rank members against each other
4. **Consent gate**: "Behavioral-based suggestions" (default: OFF)

---

### LOW RISK - Minimal Interpretation

#### 1.8 Fridge Canvas Widgets
**Location**: `src/components/fridge-canvas/widgets/`

**Risk Level**: **LOW**

**Leak Vectors**:
- Might display "completion checkmarks" (factual, acceptable)
- Could show calendar event attendance (factual if self-reported)
- Habit widgets might link to streak data (deferred to habits system)

**Current Status**: Mostly factual display

**Required Containment**:
1. **Display only**: Widgets show data, don't compute metrics
2. **Stage 0 integration**: Widget interactions CAN append events
3. **No embedded analytics**: Widgets must NOT aggregate on their own

---

#### 1.9 Calendar System
**Location**: `src/lib/calendar.ts`, calendar widgets

**Risk Level**: **LOW**

**Leak Vectors**:
- Shows "event attendance" (factual: yes/no)
- Could compute "consistency" of recurring events
- Might display "missed events" with negative framing

**Current Status**: Factual calendar, minimal interpretation

**Required Containment**:
1. **Factual display**: "Event occurred: yes/no" not "You missed it"
2. **Stage 0 integration**: Calendar events CAN append behavioral events
3. **Defer patterns**: Event consistency analysis → Stage 1

---

#### 1.10 Reports & Data Exports
**Location**: `src/lib/reports.ts`, `supabase/functions/generate-household-report/`

**Risk Level**: **MEDIUM**

**Leak Vectors**:
- Professional-facing reports may compute metrics for households
- Could aggregate behavior into "household health scores"
- Might compare households to "norms" or "averages"
- Risk of stigmatizing language in reports

**Current Status**: Report generation exists

**Required Containment**:
1. **Consent gate**: Household must approve professional report generation
2. **Factual only**: Reports show raw data, not interpretive summaries
3. **Ban Stage 0 access**: Reports must NOT directly query behavioral_events
4. **Stage 2 mediation**: Reports consume consent-gated signals only

---

#### 1.11 Professional Access Dashboard
**Location**: `src/components/professional/`, `src/lib/professional.ts`

**Risk Level**: **MEDIUM**

**Leak Vectors**:
- Professionals may see aggregated household data
- Could generate "insights" for clinical use
- Might compare client households to population data
- Risk of diagnostic labeling based on patterns

**Current Status**: Professional access framework exists

**Required Containment**:
1. **Explicit consent**: Each data category requires separate household approval
2. **Time-limited**: Access expires, renewable
3. **Audit logged**: All professional views tracked
4. **Ban Stage 0 access**: Professionals see consent-gated Stage 2 signals only

---

#### 1.12 Messaging & Collaboration
**Location**: `src/lib/guardrails/collaborationService.ts`, messaging system

**Risk Level**: **LOW**

**Leak Vectors**:
- Could show "activity indicators" based on recent behavior
- Might suggest "check in with X, they haven't responded"
- Could create social pressure through visibility

**Current Status**: Messaging exists, not behavior-integrated

**Required Containment**:
1. **No behavioral integration**: Messaging must NOT read behavioral_events
2. **User-controlled presence**: Activity indicators are manual only
3. **No prompting**: System never suggests "reach out to..."

---

## 2. Firebreak Layers (Architecture Definition)

### Layer A: Stage 0 - Raw Event Log (IMMUTABLE FOUNDATION)

**Purpose**: Append-only factual behavioral observations

**What it CAN read**:
- Nothing (write-only layer)

**What it CAN write**:
- New behavioral events (append only)
- Supersede events (corrections, not updates)
- GDPR deletion logs (compliance only)

**What it CANNOT do**:
- Aggregate, count, average
- Compute trends or patterns
- Display anything to users
- Trigger any actions
- Modify existing events
- Interpret meaning from data

**Data format**:
```
BehavioralEvent {
  id: uuid
  user_id: uuid
  event_type: enum (intent_declared, activity_started, action_completed, ...)
  occurred_at: timestamp (factual, not future)
  [foreign keys]: project_id, space_id, household_id, roadmap_item_id, task_id, focus_session_id
  intent_id: uuid (user-declared intent)
  duration_seconds: integer (factual: end - start)
  context: jsonb (environmental: device, location, time_of_day)
  user_note: text (self-reported)
  user_tags: text[] (self-reported)
  event_data: jsonb (schemaless, uninterpreted)
  created_at: timestamp
  superseded_by: uuid (for corrections)
}
```

**Boundary contract**: No data crosses OUT of this layer except through Layer B interfaces.

---

### Layer B: Stage 1 - Interpretation Sandbox (CANDIDATE SIGNALS)

**Purpose**: Transform raw events into candidate derived signals (NOT user-facing by default)

**What it CAN read**:
- `behavioral_events` table (read-only)
- Layer A query interface: `getRawBehavioralEvents(query)`

**What it CAN write**:
- `candidate_signals` table (new, Stage 1 only)
- Signal lineage metadata (provenance tracking)

**What it CANNOT do**:
- Display anything to users directly
- Trigger actions or notifications
- Modify behavioral events
- Make decisions on behalf of user

**Data format**:
```
CandidateSignal {
  id: uuid
  user_id: uuid
  signal_type: enum (time_pattern, activity_cluster, declared_intent_alignment, routine_stability, ...)
  signal_value: jsonb (computed metric, clearly non-authoritative)
  confidence_score: float (0-1, algorithm confidence)
  source_event_ids: uuid[] (provenance: which events contributed)
  computed_at: timestamp
  algorithm_version: string (reproducibility)
  interpretation_category: enum (time_awareness, routine_stability, accountability_support, ...)
  requires_consent: consent_flag_enum
  is_published: boolean (default false, requires Layer C to publish)
  superseded_by: uuid (signals can be revised)
}
```

**Allowed computations** (EXAMPLES ONLY, not exhaustive):
- Count events by type over time window (factual aggregation)
- Detect time-of-day patterns (when user tends to work)
- Calculate declared intent alignment (did activity match stated intent?)
- Measure routine stability (variance in activity start times)
- Identify activity clusters (which tasks tend to co-occur)

**FORBIDDEN computations**:
- "Success rate" (no judgment)
- "Productivity score" (no valence)
- "Improvement" or "decline" (no comparative judgment)
- "Optimal time" (no prescriptive recommendation)
- "You should..." (no imperative)

**Boundary contract**: Signals remain in sandbox until Layer C explicitly publishes them.

---

### Layer C: Stage 2+ - Feedback & UX Layer (USER-FACING WITH CONSENT)

**Purpose**: Display consent-gated insights, summaries, and visualizations to users

**What it CAN read**:
- `candidate_signals` table (read-only, filtered by consent)
- Layer B interface: `getCandidateSignals(user_id, consent_flags)`

**What it CAN write**:
- `published_insights` table (user-visible insights)
- `insight_feedback` table (user reactions: helpful/not helpful)

**What it CANNOT do**:
- Display signals without consent
- Make decisions for user
- Trigger automated actions
- Bypass user's "safe mode"

**Data format**:
```
PublishedInsight {
  id: uuid
  user_id: uuid
  insight_type: enum (time_awareness, routine_stability, ...)
  signal_id: uuid (references CandidateSignal)
  display_text: string (human-readable, non-judgmental)
  explanation: string (how it was computed, inspectable)
  visual_type: enum (timeline, chart, text_card, ...)
  created_at: timestamp
  expires_at: timestamp (insights can be time-limited)
  user_dismissed: boolean
  user_feedback: enum (helpful, not_helpful, null)
}
```

**Display constraints**:
- Language must be neutral, not prescriptive
- Always include "how this was computed" explanation
- User can dismiss any insight permanently
- No comparison to others
- No "you're failing" or "you're thriving" absolutes

**Example ALLOWED displays**:
- "You tend to start focus sessions between 9-11am" (pattern observation)
- "Your declared intents aligned with completed actions 7/10 times this week" (factual alignment)
- "Your activity start times vary by ±2 hours on average" (variance, not judgment)

**Example FORBIDDEN displays**:
- "You're most productive in the morning!" (judgment)
- "You completed 80% of tasks - great job!" (praise, implies 80% is good)
- "You're falling behind on your goals" (shaming)
- "Keep up your 7-day streak!" (gamification pressure)

**Boundary contract**: Insights are suggestions, user retains agency.

---

### Layer D: Stage 3+ - Automation / Intervention Layer (REVERSIBLE ACTIONS)

**Purpose**: Context-aware nudges, adaptive reminders, system personalization (HIGHEST RISK)

**What it CAN read**:
- `published_insights` table (what user has consented to see)
- Layer C interface: `getPublishedInsights(user_id)`
- Regulation engine constraints (energy levels, focus capacity)

**What it CAN write**:
- `intervention_logs` table (audit trail)
- Trigger reminders, nudges, UI adaptations

**What it CANNOT do**:
- Take irreversible actions
- Override user's explicit choices
- Ignore regulation engine constraints
- Bypass "safe mode" or "emergency brake"

**Data format**:
```
InterventionLog {
  id: uuid
  user_id: uuid
  intervention_type: enum (reminder, nudge, ui_adaptation, ...)
  trigger_signal_id: uuid (what caused this intervention)
  action_taken: string (what the system did)
  user_response: enum (accepted, dismissed, blocked)
  created_at: timestamp
  regulation_override: boolean (did user energy/capacity prevent intervention)
}
```

**Intervention constraints**:
- Must respect regulation engine (no nudges when user is dysregulated)
- User can disable all interventions instantly
- Each intervention type requires explicit consent
- All interventions logged for transparency

**Example ALLOWED interventions**:
- Adaptive reminder timing (based on time-of-day patterns)
- Context-aware task suggestions (based on current location)
- UI simplification (based on cognitive load signals)

**Example FORBIDDEN interventions**:
- Increasing reminder frequency if user "falls behind"
- Showing "motivational messages" based on low completion rates
- Restricting access to features as "punishment"
- Social pressure through "others are ahead of you"

**Boundary contract**: All interventions are reversible, user has veto power.

---

## 3. Interface Contracts Between Layers (Specification Only)

### Layer A → Layer B: Raw Event Access

```typescript
// Layer A exposes ONLY this interface to Layer B
interface BehavioralEventStage0Interface {
  // Query raw events (no aggregation, no modification)
  getRawBehavioralEvents(query: BehavioralEventQuery): Promise<ReadonlyArray<BehavioralEvent>>;

  // Append new event (Layer B should rarely use this, mainly for system-generated events)
  appendBehavioralEvent(input: BehavioralEventInput): Promise<BehavioralEventId>;

  // FORBIDDEN: All aggregation, update, delete functions are NOT exposed
}

// Query constraints (enforced at Layer A)
interface BehavioralEventQuery {
  user_id: string;  // REQUIRED: Layer B can only query specific users
  project_id?: string;
  space_id?: string;
  household_id?: string;
  event_type?: BehavioralEventType | BehavioralEventType[];
  after?: RawTimestamp;  // Time window required for large queries
  before?: RawTimestamp;
  limit: number;  // REQUIRED: prevent unbounded queries
  offset?: number;
  // FORBIDDEN: group_by, aggregate, compute, having, order_by (except chronological)
}
```

**Layer B obligations**:
- Must NOT aggregate in application layer if it would be visible to user
- Must NOT label results with semantic terms (success, quality, etc.)
- Must tag all computed signals with `requires_consent` flag

---

### Layer B → Layer C: Candidate Signal Access

```typescript
// Layer B exposes ONLY this interface to Layer C
interface InterpretationSandboxInterface {
  // Get candidate signals (filtered by user consent)
  getCandidateSignals(
    userId: string,
    consentFlags: ConsentFlags,  // What user has opted into
    options?: SignalQueryOptions
  ): Promise<ReadonlyArray<CandidateSignal>>;

  // Publish signal for user visibility (requires consent check)
  publishSignal(
    signalId: SignalId,
    displayConfig: InsightDisplayConfig
  ): Promise<PublishedInsightId>;

  // Revoke published signal (e.g., user disables consent category)
  revokePublishedSignal(signalId: SignalId): Promise<void>;
}

interface SignalQueryOptions {
  interpretation_category?: InterpretationCategory[];  // Filter by category
  min_confidence?: number;  // Minimum confidence threshold
  since?: timestamp;  // Only recent signals
  limit: number;  // REQUIRED
}

// Layer C must respect consent
type ConsentFlags = {
  time_awareness_enabled: boolean;
  routine_stability_enabled: boolean;
  accountability_support_enabled: boolean;
  pattern_detection_enabled: boolean;
  ai_suggestions_enabled: boolean;
  // ... more flags as needed
};
```

**Layer C obligations**:
- Must display explanation of how signal was computed
- Must include "not helpful" feedback mechanism
- Must respect user's signal dismissals
- Must honor "safe mode" (no insights at all)

---

### Layer C → Layer D: Published Insight Access

```typescript
// Layer C exposes ONLY this interface to Layer D
interface FeedbackUXInterface {
  // Get insights user has consented to see and not dismissed
  getPublishedInsights(
    userId: string,
    options?: InsightQueryOptions
  ): Promise<ReadonlyArray<PublishedInsight>>;

  // Check if intervention is allowed given current insights
  canIntervene(
    userId: string,
    interventionType: InterventionType,
    context: InterventionContext
  ): Promise<InterventionPermission>;

  // Log intervention attempt (even if blocked)
  logIntervention(log: InterventionLog): Promise<void>;
}

interface InterventionPermission {
  allowed: boolean;
  reason?: string;  // Why blocked: "safe_mode_active", "regulation_override", "consent_missing"
  alternative?: string;  // Suggestion for alternative action
}

interface InterventionContext {
  current_regulation_state: RegulationState;  // From regulation engine
  user_location?: string;
  time_of_day: string;
  recent_activity_level: ActivityLevel;
}
```

**Layer D obligations**:
- Must check `canIntervene()` before any intervention
- Must respect regulation engine constraints
- Must log all interventions (including blocked ones)
- Must provide instant "stop all interventions" button

---

## 4. Consent Model (Neurodivergent Safety)

### Default State: Maximum Safety

**On first use, ALL interpretation is OFF**:
- ✅ Raw behavioral events are captured (Stage 0)
- ❌ No signals are computed (Stage 1 inactive)
- ❌ No insights are shown (Stage 2 inactive)
- ❌ No interventions occur (Stage 3 inactive)
- ✅ User can view raw timeline of events (factual only)

**User sees**:
"We're observing your activity to learn your patterns. Nothing is being judged or scored. You can enable personalized insights when you're ready."

---

### Consent Flags (Granular Opt-In)

#### Interpretation Categories

Users opt into specific categories, not "all or nothing":

```typescript
enum ConsentFlag {
  // Stage 1: Pattern Detection
  TIME_AWARENESS = 'time_awareness',  // When you tend to work
  ROUTINE_STABILITY = 'routine_stability',  // Variance in your schedules
  ACTIVITY_CLUSTERING = 'activity_clustering',  // Which tasks co-occur
  DECLARED_INTENT_ALIGNMENT = 'declared_intent_alignment',  // Intent vs. action match

  // Stage 2: Feedback & Insights
  TIMELINE_VISUALIZATION = 'timeline_visualization',  // See your activity timeline
  PATTERN_INSIGHTS = 'pattern_insights',  // "You tend to work mornings"
  ROUTINE_FEEDBACK = 'routine_feedback',  // "Your start times vary by ±2hrs"
  PROGRESS_TRACKING = 'progress_tracking',  // Factual completion tracking

  // Stage 3: Automation
  ADAPTIVE_REMINDERS = 'adaptive_reminders',  // Reminders timed to your patterns
  CONTEXT_AWARE_SUGGESTIONS = 'context_aware_suggestions',  // Task suggestions based on location/time
  UI_PERSONALIZATION = 'ui_personalization',  // UI adapts to your preferences

  // Risky Features (require extra confirmation)
  HABIT_TRACKING = 'habit_tracking',  // Streaks, completion rates
  GOAL_METRICS = 'goal_metrics',  // Goal progress percentages
  AI_BEHAVIORAL_CONTEXT = 'ai_behavioral_context',  // Let AI see your patterns
  SOCIAL_ACCOUNTABILITY = 'social_accountability',  // Share activity with household
  PROFESSIONAL_REPORTING = 'professional_reporting',  // Allow professional to see aggregated data
}
```

#### Consent UI Design

**For each category**:
- **Name**: Clear, non-technical
- **Description**: What data is used, what is computed
- **Examples**: "You'll see insights like..." with screenshots
- **Risks**: Honest about potential shame/pressure
- **Reversibility**: "You can disable this anytime"
- **Data retention**: "Signals are recomputed if you re-enable"

**Example consent card**:
```
[ ] Time Awareness Insights

What it does:
We'll analyze when you typically start focus sessions and complete tasks.

You'll see:
- "You tend to work between 9am-12pm"
- "Your most active days are Monday and Wednesday"

Data used:
- Activity start/end times from your behavioral log
- No judgments about whether this is "good" or "bad"

Potential concerns:
- Some people feel pressure from seeing patterns
- This is purely observational - no scoring or comparison

You can disable this anytime from Settings > Privacy.
[Learn more] [Enable]
```

---

### Emergency Brake: Safe Mode

**User can activate "Safe Mode" instantly**:
- All interpretation systems pause
- No insights displayed
- No interventions triggered
- Only raw event capture continues (Stage 0)

**Activation**:
- Prominent "Safe Mode" toggle in settings
- Keyboard shortcut: Cmd/Ctrl + Shift + S
- Persists until user explicitly disables

**Visual indicator**:
- Small shield icon in UI when Safe Mode is active
- Tooltip: "Behavioral insights paused. Raw observations only."

---

### Transparency Requirement

**For every insight displayed, user can click "How was this computed?"**:

Shows:
- Which behavioral events were used
- What algorithm computed it
- Confidence score
- Alternative interpretations
- "Not helpful" button

**Example**:
```
Insight: "You tend to start focus sessions between 9-11am"

How this was computed:
- We analyzed 23 focus sessions from the past 30 days
- 18 of them (78%) started between 9:00am and 11:00am
- Confidence: Medium (need 60+ sessions for high confidence)

Alternative interpretations:
- This could also reflect when you have free time, not preference
- Your schedule may be externally constrained

This signal was generated by: TimePatternDetector v1.2.0
Source events: [View 23 events]

[Not helpful] [Dismiss] [Explain more]
```

---

### Consent Revocation Effects

**When user disables a consent flag**:

**Immediate effects**:
- All signals in that category are unpublished
- Insights disappear from UI
- Interventions in that category stop

**Data retention**:
- `candidate_signals` table: Signals marked as `is_published = false`
- `behavioral_events` table: Unchanged (Stage 0 is immutable)
- `published_insights` table: Insights marked as `user_dismissed = true`, `consent_revoked_at = NOW()`

**Re-enabling**:
- Signals are recomputed from scratch (not restored from cache)
- User sees "Recomputing insights..." progress
- Fresh confidence scores based on current data

---

### Special Consent: Risky Features

Some features require **explicit confirmation** with extra warnings:

#### Habit Tracking (Streaks, Completion Rates)
```
⚠️ Habit Tracking Can Be Harmful

This feature tracks:
- Consecutive days of completion (streaks)
- Completion rates (% of days completed)
- Total completions over time

Risks:
- Streaks can create pressure and shame if broken
- Completion rates may feel judgmental
- Some neurodivergent individuals find this harmful

Protections we've added:
- You can hide streak counts
- Completion rates are framed neutrally
- Missing a day is labeled "paused" not "failed"
- You can reset streaks without penalty

We recommend starting with "Routine Stability" insights instead,
which track variance without judgment.

[ ] I understand the risks and want to enable habit tracking
[Cancel] [Enable Anyway]
```

#### AI Behavioral Context
```
⚠️ AI May Hallucinate Patterns

Enabling this lets our AI assistant see your behavioral patterns
to provide more personalized suggestions.

Risks:
- AI may see patterns that don't exist
- AI may misinterpret your behavior
- AI suggestions are not truth, just guesses

Protections:
- All AI insights are labeled "AI-generated"
- You can give feedback on accuracy
- AI cannot make decisions for you

[Cancel] [Enable AI Context]
```

---

## 5. Abuse & Failure Modes (Red-Team)

### Failure Mode 1: Streak-Shame Spiral

**Scenario**: User has 14-day habit streak. Misses day 15 due to illness. Sees "Streak broken!" and feels like failure. Shame prevents future engagement.

**Leak Vector**: Habit tracking system computing streaks

**Firebreak Defense**:
- **Layer B**: Habit tracking requires explicit consent flag
- **Layer C**: Language is "Streak paused" not "broken", "Day 15 not completed" not "failed"
- **UI Constraint**: User can hide streak counts entirely
- **Consent Gate**: Habit tracking OFF by default, requires risk acknowledgment

---

### Failure Mode 2: "More App Usage = Success" Fallacy

**Scenario**: System tracks time-in-app as behavioral event. Layer 1 computes "engagement score". User sees "Your engagement is down this week" and feels pressured to use app more, even when not helpful.

**Leak Vector**: Misinterpreting engagement as positive outcome

**Firebreak Defense**:
- **Layer A**: App usage events are NOT captured by default (user can opt-in)
- **Layer B**: "Engagement" is not a valid signal type (banned term)
- **Layer C**: If patterns are shown, language is "You opened the app 3 times this week" (factual) not "engagement score"
- **Runtime Guardrail**: Automated check scans for terms like "engagement", "usage score", "time in app" in UI

---

### Failure Mode 3: Dopamine Addiction Loops

**Scenario**: User completes task. System shows "Achievement unlocked! 🎉" with confetti. User's brain craves more achievements. Creates unhealthy completion-seeking behavior, not genuine progress.

**Leak Vector**: Achievement system, gamification

**Firebreak Defense**:
- **Layer C**: Achievements require explicit opt-in with addiction warning
- **UI Constraint**: No confetti, no celebration animations (by default)
- **Consent Gate**: "Gamification features" flag, OFF by default
- **Alternative**: "Task completed" simple notification, no fanfare

---

### Failure Mode 4: Coercive Accountability Pressure

**Scenario**: Household member shares "progress" with others. Other members see "Sarah completed 10/10 tasks this week". Creates social pressure to perform, comparison mindset, competition.

**Leak Vector**: Social accountability features, household insights

**Firebreak Defense**:
- **Layer C**: Social sharing requires both parties' consent
- **UI Constraint**: Never show leaderboards or rankings
- **Consent Gate**: "Social accountability" OFF by default, requires risk warning
- **Alternative**: Share goals, not completion rates

---

### Failure Mode 5: AI Hallucinating Patterns

**Scenario**: User has sporadic focus session schedule. AI sees 3 sessions on Tuesdays, concludes "You work best on Tuesdays!" Actually, user just had free time those weeks. AI suggestion creates false belief.

**Leak Vector**: AI assistant interpreting sparse data

**Firebreak Defense**:
- **Layer B**: All AI signals include confidence score
- **Layer C**: AI insights labeled "AI-generated - verify accuracy"
- **Consent Gate**: "AI behavioral context" OFF by default
- **Runtime Guardrail**: Minimum 30 events required before pattern suggestion, confidence score must be >0.7

---

### Failure Mode 6: False Negatives - "You're Not Improving"

**Scenario**: User is working hard but behavioral data doesn't show "progress". System shows "No change detected in completion rates this month". User feels discouraged, thinks effort is futile.

**Leak Vector**: Progress tracking, trend detection

**Firebreak Defense**:
- **Layer B**: "Progress" is not a valid signal type (too judgmental)
- **Layer C**: Never show "no improvement" messages
- **UI Constraint**: Trends are framed neutrally: "Activity levels are similar to last month" not "no progress"
- **Consent Gate**: "Progress tracking" requires opt-in with mental health warning

---

### Failure Mode 7: False Positives - "You're Thriving!" Masking Decline

**Scenario**: User is burning out but maintains high completion rates through sheer willpower. System shows "Great week! 95% completion rate!" User feels validated but is actually harming themselves.

**Leak Vector**: Completion rate metrics ignoring energy/capacity

**Firebreak Defense**:
- **Regulation Engine Integration**: Check user's declared energy levels
- **Layer D**: If regulation engine shows low energy, suppress positive feedback
- **UI Constraint**: Never show "great job!" without context
- **Runtime Guardrail**: Cross-reference completion rates with focus session quality, energy check-ins

---

### Failure Mode 8: Comparison to Others

**Scenario**: System shows "Average users complete 7 tasks per week" and user completed 4. User feels inadequate, "below average", less capable.

**Leak Vector**: Population averages, normative data

**Firebreak Defense**:
- **Layer B**: NO population statistics ever computed
- **Layer C**: NO comparison to "average" or "typical" users
- **UI Constraint**: All insights are self-referential only ("compared to your usual patterns")
- **Code Review Checklist**: Flag any "average", "typical", "normal" language

---

### Failure Mode 9: Punitive Scoring Emerging Accidentally

**Scenario**: Developer adds "task difficulty" field. Later, another developer computes "performance score" as completions divided by difficulty. System starts showing "Your performance is 65%" which feels like a grade.

**Leak Vector**: Innocent feature addition cascades into scoring

**Firebreak Defense**:
- **Layer A**: Semantic drift detection scans for forbidden terms
- **Code Review Checklist**: Any new field must be audited for interpretation risk
- **Runtime Guardrail**: Automated tests flag terms like "score", "performance", "grade", "rating"
- **Layer B**: All signal types must be whitelisted, not auto-generated

---

### Failure Mode 10: Over-Notification Fatigue

**Scenario**: User enables adaptive reminders. System sees low completion rates, increases reminder frequency. User gets 10 reminders/day. Feels harassed, disables all reminders, loses genuinely helpful ones.

**Leak Vector**: Adaptive reminder logic misinterpreting low completion as need for more prompts

**Firebreak Defense**:
- **Layer D**: Reminder frequency has hard cap (max 3/day regardless of patterns)
- **Regulation Engine**: No reminders when user is dysregulated
- **UI Constraint**: User sets max reminder frequency (default: 2/day)
- **Runtime Guardrail**: If user dismisses 3 reminders in a row, pause all reminders for 24 hours

---

### Failure Mode 11: Burnout from Optimization

**Scenario**: User sees "You're most productive 9-11am". Starts forcing all deep work into that window. Overcommits during "peak hours". Burns out. Ignores body's signals.

**Leak Vector**: Time-of-day pattern insights becoming prescriptive

**Firebreak Defense**:
- **Layer C**: All pattern insights include disclaimer: "This is observation, not prescription"
- **UI Constraint**: Never show "optimal" or "best" time
- **Language**: "You tend to work 9-11am" not "Your peak productivity is 9-11am"
- **Regulation Integration**: If user consistently works during "identified patterns", show warning: "Remember to listen to your body's signals"

---

### Failure Mode 12: User Weaponizing Data Against Self

**Scenario**: User exports behavioral data, analyzes it obsessively in spreadsheets. Finds every gap, interprets as personal failure. Uses data as "evidence" they are incompetent. Harmful rumination.

**Leak Vector**: Data export feature enabling self-harm

**Firebreak Defense**:
- **Export UI**: Warning before export: "This data shows what happened, not your worth as a person"
- **Export format**: Include disclaimer in CSV header
- **Layer C**: If user exports data multiple times per day, show concern message: "We noticed frequent data exports. Are you analyzing your behavior a lot? That can be stressful."
- **Professional flag**: Option to alert trusted professional if user exhibits data-obsession patterns

---

## 6. Implementation Checklist (For Future Stages)

### Stage 1 Implementation (Interpretation Sandbox)

**Before implementing Layer B**:
- [ ] Create `candidate_signals` table with provenance tracking
- [ ] Implement `requires_consent` flag system
- [ ] Add algorithm version tracking for reproducibility
- [ ] Create signal confidence scoring framework
- [ ] Build signal superseding mechanism (revisions)
- [ ] Implement Layer A → Layer B interface contract
- [ ] Add automated tests for forbidden signal types
- [ ] Create signal lineage viewer (debugging tool)

**Minimum viable signals** (start with least risky):
- [ ] Time-of-day patterns (when user tends to be active)
- [ ] Activity clustering (which tasks co-occur)
- [ ] Routine stability (variance in start times)

**Explicitly deferred** (too risky for first iteration):
- [ ] ~~Completion rates~~ (too judgmental)
- [ ] ~~Streaks~~ (shame risk)
- [ ] ~~Success prediction~~ (too prescriptive)

---

### Stage 2 Implementation (Feedback & UX Layer)

**Before implementing Layer C**:
- [ ] Implement granular consent system (per-category flags)
- [ ] Create `published_insights` table
- [ ] Build "How was this computed?" transparency UI
- [ ] Implement Safe Mode with emergency brake
- [ ] Add "Not helpful" feedback collection
- [ ] Create neutral language style guide
- [ ] Train team on neurodivergent-safe UX
- [ ] Test with neurodivergent user group

**Minimum viable insights**:
- [ ] Timeline visualization (factual activity log)
- [ ] Time-of-day patterns (observational)
- [ ] Declared intent alignment (factual match)

**Explicitly forbidden displays**:
- [ ] NO "You're productive!"
- [ ] NO "Great job!"
- [ ] NO "Keep it up!"
- [ ] NO comparison to others
- [ ] NO grades/scores/ratings

---

### Stage 3 Implementation (Intervention Layer)

**Before implementing Layer D**:
- [ ] Integrate with regulation engine (respect energy/capacity)
- [ ] Implement `intervention_logs` audit trail
- [ ] Create `canIntervene()` permission check
- [ ] Build instant "Stop all interventions" button
- [ ] Add per-intervention-type consent flags
- [ ] Test intervention reversibility
- [ ] Conduct safety review with mental health professionals

**Minimum viable interventions**:
- [ ] Adaptive reminder timing (based on time patterns only)

**Explicitly forbidden interventions**:
- [ ] NO increasing reminder frequency based on "low performance"
- [ ] NO "motivational" messages
- [ ] NO restricting features as punishment
- [ ] NO social pressure mechanisms

---

## 7. Success Criteria

Stage 0.3 (this design phase) is successful if:

✅ **Risk Inventory Complete**:
- All existing interpretation systems identified
- Risk levels assigned
- Containment strategies defined

✅ **Layer Architecture Defined**:
- Four layers with clear boundaries
- Data formats specified
- Interface contracts documented

✅ **Consent Model Designed**:
- Default state is maximum safety
- Granular opt-in categories defined
- Emergency brake mechanism designed
- Transparency requirements specified

✅ **Failure Modes Anticipated**:
- 12+ failure modes documented
- Defenses specified for each
- Multiple layers of protection per failure mode

✅ **Implementation Roadmap**:
- Stage 1, 2, 3 clearly delineated
- Dependencies identified
- Forbidden features explicitly listed

---

## 8. Review Checklist

Use this during architecture review:

### For Any New Feature

- [ ] Which layer does this belong to? (A, B, C, or D)
- [ ] What data does it read? (Is it allowed?)
- [ ] What data does it write? (Is it allowed?)
- [ ] Does it compute aggregates? (Only Layer B+)
- [ ] Does it display to users? (Only Layer C+)
- [ ] Does it trigger actions? (Only Layer D)
- [ ] What consent flags are required?
- [ ] What failure modes does it introduce?
- [ ] How do we defend against those failure modes?
- [ ] Is language neutral and non-judgmental?
- [ ] Can user disable this feature?
- [ ] Is it reversible?

### Red Flags (Require Escalation)

- ⚠️ Any use of terms: success, failure, productive, effective, optimal, best, worst, behind, ahead
- ⚠️ Any comparison between users
- ⚠️ Any scoring or grading system
- ⚠️ Any automated action based on behavioral data
- ⚠️ Any "you should" or prescriptive language
- ⚠️ Any gamification (points, badges, levels, streaks)
- ⚠️ Any feature that cannot be disabled
- ⚠️ Any irreversible decision made by system

---

## Document Metadata

- **Version**: 1.0
- **Status**: Design Phase Complete (No Implementation)
- **Next Phase**: Stage 1 Implementation (Interpretation Sandbox)
- **Review Frequency**: Quarterly (or before any Stage 1+ work begins)

**This firebreak map protects Stage 0 from semantic contamination.**
**Future stages must respect these boundaries to maintain neurodivergent safety.**
