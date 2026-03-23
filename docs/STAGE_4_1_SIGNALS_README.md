# Stage 4.1 — First Regulation Signals (UX + Rules)

**Layer:** Regulation → Signals
**Purpose:** Make behavioral patterns visible to the user in a calm, non-judgmental way
**Status:** Read-only signals (NO automatic responses, NO nudging yet)
**Audience:** Everyone, designed first for neurodivergent users (ADHD-safe)

## First Principles (Non-Negotiable)

Signals **MUST** be:
- ✅ Descriptive, not prescriptive
- ✅ Visible, not interruptive
- ✅ User-facing, not system-facing
- ✅ Explainable in plain language
- ✅ Ignorable without consequence

Signals **MUST NOT**:
- ❌ Trigger responses automatically
- ❌ Appear as alerts, notifications, or popups
- ❌ Use judgmental or diagnostic language
- ❌ Assume intent or motivation
- ❌ Create pressure to "fix" anything

**Signals answer:** "What seems to be happening?"
**They do NOT answer:** "What should you do?"

## What a "Regulation Signal" Is

A Regulation Signal is a short-lived, human-readable summary of a behavioral pattern inferred from existing in-app events, shown only inside the Regulation Hub.

Think of signals as:
- Weather reports, not instructions
- Dashboards, not alarms
- Mirrors, not managers

## Where Signals Live (UX)

**Primary Location:** Regulation Hub → Signals Section

Signals:
- Appear in a calm, card-based list
- Show title (plain language)
- Show short explanation
- Have a "Why this showed" expandable section
- Include timestamp
- Use neutral gray colors (no red/amber/green judgment)
- Have NO counts, streaks, or scores

**Important UX rule:** Signals do not appear elsewhere in the app yet. No banners. No interruptions. No overlays.

## The 5 Regulation Signals

### Signal 01 — Rapid Context Switching

**Human label:** "You've moved between several things quickly"

**What it describes:** Frequent switching between projects, tracks, or major contexts in a short window.

**Rule:**
- ≥ 5 context switches
- within 20 minutes
- without sustained activity in any one context

**Existing events used:**
- project_opened (via master_projects updates)
- track_selected
- focus_mode_started

**UX copy:**
```
In the last 20 minutes, you moved between several projects and tracks without settling on one for long.
```

**Why explanation:**
```
This signal appears when you move between different contexts (projects, tracks, or focus areas) without settling on one for long.

What counts as a context: Opening a project, selecting a track, or starting a focus session.

Timeframe used: The last 20 minutes of activity.

Why this is shown: This pattern is common during exploration, idea capture, or when feeling overwhelmed. It's not a problem to fix—just something you might want to be aware of.
```

**Expiry:** 60 minutes

---

### Signal 02 — Runaway Scope Expansion

**Human label:** "Your project grew quickly in one session"

**What it describes:** A burst of additive actions that expand scope rather than execute.

**Rule:**
- ≥ 5 new elements created
- within a single session (60 minutes)
- combining: side projects, offshoot ideas, tracks

**Existing events used:**
- side_projects created
- offshoot_ideas created
- guardrails_tracks_v2 created

**UX copy:**
```
This session added several new ideas and project elements in a short time.
```

**Why explanation:**
```
This signal appears when you add many new elements (side projects, offshoot ideas, tracks, or roadmap items) in a short time without completing tasks or entering focus mode.

What triggers this: Multiple creations of new project elements within a single session.

Why this is shown: Expansion is sometimes intentional (ideation mode). Sometimes it's a sign of excitement or overwhelm. Nothing is blocked or undone—this is just visibility.
```

**Expiry:** 120 minutes

---

### Signal 03 — Fragmented Focus Session

**Human label:** "Focus was started, but interrupted"

**What it describes:** Focus Mode entered, then exited or context-switched quickly.

**Rule:**
- Focus Mode started
- exited within 5 minutes
- or followed by unrelated navigation

**Existing events used:**
- focus_sessions table (started_at, ended_at)

**UX copy:**
```
A focus session started but didn't settle before switching to something else.
```

**Why explanation:**
```
This signal appears when you start Focus Mode but exit or switch contexts shortly after.

What counts as fragmented: Starting focus mode, then exiting within a few minutes or switching to a different project.

Why this is shown: Focus mode is optional and early exits are normal. Your context or priorities may have changed. This is just a reflection of what happened.
```

**Expiry:** 60 minutes

---

### Signal 04 — Prolonged Inactivity Gap

**Human label:** "There was a long pause in activity"

**What it describes:** No meaningful interaction for a defined period, followed by return.

**Rule:**
- No core events for ≥ 3 days
- followed by re-entry into the app

**Existing events used:**
- profiles.last_seen_at

**UX copy:**
```
There was a gap between your recent activity and earlier sessions.
```

**Why explanation:**
```
This signal appears after you return to the app following a period of no activity.

What counts as a gap: No meaningful interactions for several days, followed by re-entry.

Why this is shown: Life interruptions are normal. Illness, holidays, burnout, and life events happen. This is not treated as abandonment—just acknowledgment that time passed. Welcome back.
```

**Important:** This signal is shown only after return, never as a push notification.

**Expiry:** 1440 minutes (24 hours)

---

### Signal 05 — High Task Intake Without Completion

**Human label:** "Many tasks added, few finished"

**What it describes:** Rapid intake of tasks without corresponding completion.

**Rule:**
- ≥ 5 tasks created
- ≤ 1 task completed
- within the same 24-hour period

**Existing events used:**
- roadmap_items where type = 'task' (created)
- roadmap_items where type = 'task' and status = 'completed'

**UX copy:**
```
Several tasks were added recently, with few marked complete.
```

**Why explanation:**
```
This signal appears when several tasks are created without many being marked complete.

What triggers this: Adding multiple tasks in a session or day, with few or none marked as done.

Why this is shown: Capturing tasks is often helpful and necessary. Completion may happen later, or tasks may be moved to other systems. This is about visibility, not judgment.
```

**Expiry:** 240 minutes (4 hours)

---

## Signal Lifecycle Rules

Signals are:
- **Ephemeral** – Automatically disappear after expiry time
- **Session-scoped or time-boxed** – Not permanent records
- **Non-duplicating** – Only one active instance per signal type

Example:
"Rapid Context Switching" clears after:
- sustained focus, or
- session end, or
- time expiry (60 minutes)

Signals are **NOT**:
- Stored historically
- Counted
- Graphed
- Compared to past self
- No "you always do this"

## Signal → Response Boundary (Very Important)

At Stage 4.1:

Signals **DO NOT**:
- Suggest responses
- Enable responses
- Auto-activate anything

But:
Signals may show:
"You have regulation tools that could be used here — if you want."

That link goes to Regulation → Use, nothing more.

## Data & Ethics Constraints

**Allowed:**
- Read-only computation from existing events
- In-memory or short-lived evaluation
- User-visible explanations

**Forbidden:**
- Risk scores
- Labels like "overwhelmed", "unfocused"
- Persistent behavioral profiles
- Silent system actions

## Implementation Details

### Database Schema

**Table:** `regulation_active_signals`

```sql
CREATE TABLE regulation_active_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  explanation_why text NOT NULL,
  context_data jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  intensity text DEFAULT 'medium',
  session_id text,
  created_at timestamptz DEFAULT now()
);
```

### Service Functions

**Location:** `src/lib/regulation/signalService.ts`

**Key Functions:**
- `computeSignalsForUser(context: SignalContext)` - Run all signal checks
- `getActiveSignals(userId: string)` - Fetch current signals
- `dismissSignal(userId: string, signalId: string)` - User dismisses signal
- `createSignal(params)` - Create new signal (internal)

**Signal Detection Functions:**
- `checkRapidContextSwitching(userId, sessionId?)`
- `checkRunawayScopeExpansion(userId, sessionId?)`
- `checkFragmentedFocusSession(userId, sessionId?)`
- `checkProlongedInactivityGap(userId, sessionId?)`
- `checkHighTaskIntakeWithoutCompletion(userId, sessionId?)`

### UI Components

**Location:** `src/components/regulation/`

**Components:**
- `SignalsSection.tsx` - Main container, handles loading and refresh
- `SignalCardStage4_1.tsx` - Individual signal card (calm, neutral design)

**Design Principles:**
- Neutral gray colors only (no traffic light colors)
- Expandable "Why this showed" section
- Dismiss button (X) in top-right
- Time ago display ("2h ago", "Just now")
- No intensity indicators
- No scary icons or warnings

### Auto-Expiry

Signals automatically expire via database query:
```typescript
.gt('expires_at', new Date().toISOString())
```

Expired signals are filtered out when loading.

### Refresh Mechanism

Signals refresh:
- On component mount
- Every 60 seconds (auto-refresh)
- When user clicks "Refresh" button
- After dismissing a signal

## Testing Checklist

- [ ] Create ≥5 projects quickly → Rapid Context Switching appears
- [ ] Create ≥5 side projects/ideas → Runaway Scope Expansion appears
- [ ] Start focus mode, exit within 5 min → Fragmented Focus Session appears
- [ ] Return after 3+ day gap → Prolonged Inactivity Gap appears
- [ ] Create ≥5 tasks, complete ≤1 → High Task Intake appears
- [ ] Signals show "Why this showed" when expanded
- [ ] Signals disappear after expiry time
- [ ] Dismiss button works
- [ ] Signals only appear in Regulation Hub
- [ ] No signals appear as popups or banners
- [ ] UI is calm and neutral (no red/amber/green)
- [ ] Language is descriptive, not prescriptive
- [ ] No judgment or pressure to fix anything

## Exit Criteria for Stage 4.1

You are ready to move on when:

✅ You personally say: "Yeah… that's actually what I was doing."

✅ Signals feel informative, not accusatory

✅ You forget about them until you check the hub

✅ Nothing feels urgent or corrective

Only after that do presets, responses, and automation become ethical.

## Key Files

### Frontend
- `src/components/regulation/SignalsSection.tsx`
- `src/components/regulation/SignalCardStage4_1.tsx`
- `src/components/interventions/RegulationHub.tsx`

### Backend
- `src/lib/regulation/signalService.ts`
- `src/lib/regulation/signalTypes.ts`

### Database
- `supabase/migrations/20251216114524_create_regulation_signals_stage_4_1.sql`

## Usage

### As a User

1. Navigate to Regulation Hub (`/regulation`)
2. Scroll to "Signals" section
3. See any active signals
4. Click "Why this showed" to understand the pattern
5. Dismiss if you want (optional)
6. Click "Refresh" to check for new signals

### As a Developer

1. Add new signal detection logic in `signalService.ts`
2. Follow existing pattern:
   - Query for relevant events
   - Check threshold
   - Call `createSignal()` if threshold met
3. Add new signal key to `SignalKey` type
4. Update `computeSignalsForUser()` to include new check
5. Test manually with realistic scenarios

## Why Stage 4.1 Is Deliberately "Quiet"

This stage exists to answer one question:

"Do I recognize myself in what the system is showing me?"

If the answer is **yes** → trust is earned
If the answer is **no** → everything else fails

Stage 4.1 is the foundation. Without recognition and trust, no regulation system can be ethical or effective.

## What's Next

Stage 4.2 and beyond will add:
- Signal calibration (sensitivity adjustments)
- Preset configurations
- Gentle response suggestions (opt-in only)
- Testing mode for power users
- Return context flow
- Mental model cards

But all of that is built on Stage 4.1's foundation: calm, neutral, accurate pattern detection.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Stage Status:** Implemented ✅
