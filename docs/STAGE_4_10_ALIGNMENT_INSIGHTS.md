# Stage 4.10: Regulation Analytics & Alignment Insights

## Overview

Stage 4.10 completes the Regulation loop with a calm reflection layer that helps users understand how their intentions, focus, and behaviors relate over time—without judgment, pressure, or automatic enforcement.

**Intent → Observation → Reflection → Choice**

## Purpose

Provide evidence-based insight to support informed, voluntary decisions about regulation tools. This stage introduces **Alignment Insights**: calm visual reflections showing how declared intent and observed behavior patterns relate.

## Core Principles

### What This Stage MUST Be

✅ **Descriptive, not evaluative**
✅ **Compare intent vs observation**, not success vs failure
✅ **Support user agency and self-trust**
✅ **Make regulation choices feel earned, not imposed**
✅ **Remain optional, ignorable, and non-binding**

### What This Stage MUST NOT Do

❌ Introduce scores, grades, rankings, or productivity metrics
❌ Frame gaps as failures or missed commitments
❌ Trigger responses automatically
❌ Create pressure to "fix" behavior
❌ Infer motivation, discipline, or effort

## The Four Analytics Panels

### 1. Daily Alignment Reflection Card

**Purpose:** Show how the day unfolded relative to what the user planned

**Data Sources:**
- `daily_alignments`
- `daily_alignment_blocks`
- `daily_alignment_microtasks`
- Calendar events (read-only)

**Shows:**
- Planned blocks vs engagement windows
- Microtasks completed / not touched
- Neutral states: "Completed", "Still open", "Not reached today"

**Language Rules:**
- NEVER: "missed", "failed", "didn't do"
- USE: "deferred", "open", "not reached today"

**Features:**
- Collapsible panel
- No percentages or streaks
- No time pressure visuals

### 2. Focus & Fragmentation Context Card

**Purpose:** Help users visually understand focus-related signals in context

**Data Sources:**
- `focus_sessions`
- Context-switch events
- `stage4_1_regulation_signals` (read-only)

**Shows:**
- Focus sessions over time
- Overlay markers for context switching and scope expansion
- Gentle captions: "This focus session was brief before ending."

**Features:**
- Timeframe selector (Today / 7 days / 14 days)
- Explains signals, doesn't restate them as conclusions
- Shows related signals near sessions

### 3. Scope Balance Card

**Purpose:** Make expansion patterns visible without discouraging ideation

**Data Sources:**
- `taskflow_tasks` (created and completed)
- `guardrails_tracks_v2` (created)
- `offshoot_ideas` (created)
- `side_projects` (created)

**Shows:**
- Additions vs completions (side-by-side bars)
- Neutral summary text
- Breakdown of what was added

**Language Rules:**
- No "too much" or "imbalance"
- No targets or norms
- "This period involved more expansion than completion" (neutral)

### 4. Regulation Context Timeline

**Purpose:** Show when regulation tools were active, without claiming impact

**Data Sources:**
- `stage4_1_regulation_signals`
- `stage4_7_regulation_preset_activations`
- `stage3_2_intervention_invocations`

**Shows:**
- Timeline with overlays: Signals, Presets active, Responses invoked
- Event-by-event breakdown with timestamps

**Language Rules:**
- NEVER claim causation
- "During this period, fewer signals appeared" (NOT "This preset improved focus")
- Describes timing, not impact

## Components Created

### Location: `src/components/regulation/analytics/`

1. **AlignmentInsightsSection.tsx** - Main container with introduction and principles
2. **DailyAlignmentReflectionCard.tsx** - Daily plan vs reality
3. **FocusContextCard.tsx** - Focus sessions with signal overlays
4. **ScopeBalanceCard.tsx** - Additions vs completions visualization
5. **RegulationContextTimeline.tsx** - Regulation activity timeline

### Integration

Added to **RegulationHub** (`src/components/interventions/RegulationHub.tsx`) between Signals Section and Actions Section.

## Language & Ethics Guidelines

### Across ALL Components

**Use:**
- "This suggests..."
- "It looks like..."
- "During this period..."
- "Not reached today"
- "Still open"

**Avoid:**
- "You didn't"
- "You failed"
- "You should"
- "Improve", "optimize", "fix"
- "Missed", "behind", "incomplete"

### Reassurance Examples

Each panel includes:
> "This is information only. Nothing here requires action."

Main section includes:
> "This section is descriptive, not evaluative. It compares intent vs observation, not success vs failure."

## Technical Implementation

### Data Handling

- All analytics derived from existing data
- No new telemetry tables required
- No historical behavioral profiles
- No export or sharing

### Performance

- Views computed on load
- Lazy-load panels on scroll
- Memoized aggregates where appropriate
- Time-window queries only

### Database Usage

**No new tables required**

Uses existing:
- Daily Alignment tables
- Focus Session tables
- Regulation Signal tables
- Preset Activation tables
- TaskFlow and Guardrails tables

## User Experience

### Primary Access

**Regulation Hub** → "Insights & Alignment" section

### Secondary Access (Future)

- From Daily Alignment: "Review how today unfolded"
- From Signals: "See this pattern in context"

### Features

- Each panel can collapse independently
- Neutral color palette (grays, blues)
- No urgent/stressful visuals
- Optional scrolling

## Exit Criteria

You are ready when:

✅ You can clearly see why a signal appeared
✅ The insights feel accurate, not accusatory
✅ You can decide whether to use a preset—or not—without pressure
✅ The system feels like a mirror, not a manager

**If any panel feels stressful, guilt-inducing, or evaluative, it must be revised.**

## What This Section Answers

**"Given what I intended, what seems to have happened?"**

## What This Section Does NOT Answer

**"What should I do about it?"**

---

## Future Enhancements (Not Part of Stage 4.10)

Only after Stage 4.10 is trusted:

- Soft "You might want to..." suggestions (opt-in)
- Smarter Daily Alignment defaults
- Optional ML personalization
- Gentle reminders (foreground only)

**None of that is included here.**

## Summary

Stage 4.10 provides:

- **Reflection without judgment**
- **Insight without pressure**
- **Context without conclusions**
- **Choice without enforcement**

This is the ethical foundation for everything that comes next.
