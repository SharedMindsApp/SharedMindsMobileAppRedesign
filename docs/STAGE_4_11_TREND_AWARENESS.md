# Stage 4.11: Regulation Trend Awareness

**Layer:** Regulation → Analytics → Trend Awareness

**Status:** Implemented ✅

## Purpose

Adds gentle, longitudinal pattern awareness to Regulation Analytics so users can notice whether signals are new, recurring, or settling over time - without judgment, targets, alerts, or recommendations.

## What Users Can See

"Is this pattern repeating, or was it just a moment?"

## What This System Does NOT Show

- "Is this good or bad?"
- "What should I do?"
- "Is this improving or worsening?"

## Design Principles (Non-Negotiable)

Trend awareness is:
- ✅ Descriptive, not evaluative
- ✅ Qualitative, not quantitative
- ✅ Optional and ignorable
- ✅ User-facing only
- ✅ Calm and non-urgent

Trend awareness does NOT:
- ❌ Use numbers, counts, scores, or percentages
- ❌ Use streaks, charts, or graphs
- ❌ Rank signals by importance
- ❌ Trigger responses or presets
- ❌ Create alerts, warnings, or notifications
- ❌ Imply causation or responsibility

**This is reflection, not optimization.**

## Trend States

Three human-readable states describe pattern appearance:

1. **New** - Appeared recently, not seen before in this window
2. **Recurring** - Appeared more than once in the selected time window
3. **Settling** - Appeared before, but not recently

No counts. No frequency. No scoring.

## Time Windows

User-controlled time windows affect trend classification:
- Today
- Last 7 days (default)
- Last 14 days

These affect only:
- Trend classification
- Explanatory copy

They do NOT change signal computation or thresholds.

## UX Location

**Primary Location:**
Regulation Hub → Analytics → Trend Awareness

**Placement:**
Below:
- Signals (Stage 4.1)
- Alignment Insights (Stage 4.10)

This reinforces the flow:
Signals → Reflection → Trend Awareness → (Optional choices later)

## Components

### 1. RegulationTrendOverview
Main card showing patterns over time:
- Lists each regulation signal that appeared at least once
- Shows signal name and trend state
- Includes time window selector
- Uses calm, neutral colors
- No severity icons

### 2. SignalTrendBadge
Text-only, neutral display of trend state:
- Shows "New", "Recurring", or "Settling"
- No colors beyond neutral gray
- No icons

### 3. TrendTimeWindowSelector
Simple time window switcher:
- Today / Last 7 days / Last 14 days
- Subtle button design
- Updates trend states dynamically

### 4. Signal Detail View Enhancement
Adds a secondary section to signal detail pages:
- Label: "How often this has appeared recently"
- Shows trend explanation text
- No dates, counts, or timelines

## Trend Classification Rules (Internal)

These rules are NOT shown to users verbatim:

**New:**
- Appeared once in the selected window
- No earlier appearance in that window

**Recurring:**
- Appeared more than once in the selected window

**Settling:**
- Appeared before the window
- Has not appeared in the current window

## Data Implementation

**No new persistent tables required.**

Trend awareness is computed dynamically using:
- `regulation_active_signals` table
- `signal_key` field
- `detected_at` timestamp
- Selected time window

**Characteristics:**
- Read-only queries
- Non-aggregating
- Non-persistent classification
- No historical aggregation tables
- No signal counters
- No trend scores
- No user-level behavioral profiles

## Service Layer

**Location:** `src/lib/regulation/regulationTrendService.ts`

**Functions:**

1. `getSignalTrends(userId, timeWindow)`: Promise<SignalTrend[]>
   - Gets all signal trends for a user in a time window
   - Returns array of signals with trend states
   - Read-only, no side effects

2. `classifySignalTrend(signalKey, appearances[], beforeAppearances[])`: TrendState
   - Classifies a signal's trend based on appearance patterns
   - Pure function, deterministic
   - No writes

3. `getTrendExplanation(trendState)`: string
   - Returns human-readable explanation
   - No evaluative language
   - Calm and descriptive

4. `getSignalTrendState(userId, signalKey, timeWindow)`: Promise<TrendState | null>
   - Gets trend state for a specific signal
   - Used in signal detail views
   - Read-only

## Language Rules (Strict)

**Allowed Terms:**
- "Appeared"
- "Shown"
- "Noticed"
- "Hasn't shown up recently"
- "Pattern"
- "Period"

**Forbidden Terms:**
- Improve / worsen
- Better / worse
- Increase / decrease
- At risk
- Concerning
- Too much / too little
- Streak
- Score
- Frequency
- Rate

## File Structure

```
src/
├── lib/
│   └── regulation/
│       └── regulationTrendService.ts          # Service layer
└── components/
    └── regulation/
        ├── RegulationTrendOverview.tsx        # Main trend card
        ├── SignalTrendBadge.tsx               # Trend state badge
        ├── TrendTimeWindowSelector.tsx        # Time window switcher
        ├── SignalDetailPage.tsx               # Updated with trend annotation
        └── analytics/
            └── AlignmentInsightsSection.tsx   # Updated with trend overview
```

## Testing Checklist

- ✅ Switch between Today / 7 / 14 days updates trend states
- ✅ No numbers appear anywhere in the UI
- ✅ No charts or graphs rendered
- ✅ Signals correctly classified as New / Recurring / Settling
- ✅ Trend state changes as time window shifts
- ✅ No responses or presets are suggested automatically
- ✅ Everything remains ignorable without consequence
- ✅ UX feels calm, not analytical

## Exit Criteria

Users are ready to proceed when:
- ✅ They can glance at trends and feel informed, not judged
- ✅ Nothing feels like a performance metric
- ✅ They start anticipating patterns before overwhelm
- ✅ The system still feels optional and quiet

## Integration Points

### With Stage 4.1 (Regulation Signals)
- Reads from `regulation_active_signals` table
- Uses `signal_key` and `detected_at` fields
- No modifications to signal detection logic

### With Stage 4.10 (Alignment Insights)
- Appears below other analytics cards
- Same calm, descriptive tone
- No cross-references or dependencies

### Future Stages
- This stage provides NO triggers
- This stage provides NO automations
- This stage provides NO recommendations
- It exists purely for user awareness

## Examples

### Trend Overview Card Display

```
Patterns over time

This is a quiet overview of how some signals have appeared recently.
Nothing here requires action.

[Today] [Last 7 days] [Last 14 days]

Rapid Context Switching — Recurring
Runaway Scope Expansion — New
Fragmented Focus Session — Settling
```

### Signal Detail Annotation

```
How often this has appeared recently

This pattern has appeared more than once in this period.
```

## Architecture Invariants

1. **No Persistent State**: Trend classification is ephemeral and recalculated on every view
2. **No Aggregations**: No running totals, no historical summaries
3. **No Automation**: Trends trigger nothing, suggest nothing, enforce nothing
4. **Read-Only**: Service layer performs zero writes to database
5. **Optional UI**: All trend awareness components can be ignored without consequence

## Next Stage

Stage 4.11 is the final stage in the Regulation Analytics layer. No automatic progression occurs. Users may choose to:
- Continue using the system as-is
- Explore presets (Stage 4.7)
- Engage with signals individually
- Ignore regulation entirely

This is by design. Regulation remains optional.
