# Stage 2 Contract: Feedback & UX Layer (Layer C)

**Version**: 1.0
**Status**: Implemented
**Date**: 2025-12-15

---

## Contract Overview

This document defines the **mandatory constraints** for Stage 2 (Feedback & UX Layer).

All code in `/src/components/behavioral-insights/` and related Stage 2 service layer must comply with this contract.

**Violations of this contract are system-level failures.**

---

## 1. Safe Mode (MANDATORY - Emergency Brake)

### Rule 1.1: Safe Mode Overrides Everything

**REQUIRED**: When Safe Mode is enabled, ALL insights MUST be hidden immediately.

```typescript
// CORRECT
const safeModeEnabled = await isSafeModeEnabled(userId);
if (safeModeEnabled) {
  return []; // No insights displayed
}

// VIOLATION
const safeModeEnabled = await isSafeModeEnabled(userId);
// Display insights anyway (NOT ALLOWED)
```

**Enforcement**:
- `getDisplayableInsights()` returns empty array when Safe Mode enabled
- UI shows "Safe Mode Active" message instead of insights
- No exceptions, no overrides

---

### Rule 1.2: Safe Mode Must Be Accessible

**REQUIRED**: Safe Mode toggle MUST be:
- Visible on insights page
- Accessible via keyboard shortcut (Ctrl+Shift+S)
- Instantly effective (no confirmation delays for hiding)

**Enforcement**:
- SafeModeToggle component in UI
- Keyboard event listener
- Database function executes immediately

---

### Rule 1.3: Safe Mode is Reversible

**REQUIRED**: Safe Mode MUST NOT delete data.

```typescript
// CORRECT
await toggleSafeMode(userId, { enabled: true }); // Hides insights
// Data remains in database

// VIOLATION
await toggleSafeMode(userId, { enabled: true });
await deleteAllSignals(userId); // DELETING DATA IS FORBIDDEN
```

**Enforcement**:
- Safe Mode only affects display
- No data deletion
- Fully reversible

---

## 2. Display Consent (MANDATORY)

### Rule 2.1: Display Consent is Separate from Compute Consent

**REQUIRED**: User must grant BOTH compute consent (Stage 1) AND display consent (Stage 2).

```typescript
// CORRECT - Two separate consents
await grantConsent(userId, 'time_patterns'); // Stage 1: Allow computation
await grantDisplayConsent(userId, { signalKey: 'time_bins_activity_count' }); // Stage 2: Allow display

// VIOLATION - Assuming display consent from compute consent
const hasComputeConsent = await hasUserConsent(userId, 'time_patterns');
// Display insights without checking display consent (NOT ALLOWED)
```

**Enforcement**:
- Separate database tables: `user_consent_flags` (Stage 1) vs `insight_display_consent` (Stage 2)
- `canDisplayInsight()` checks both Safe Mode and display consent

---

### Rule 2.2: Default is OFF

**REQUIRED**: Display consent MUST default to OFF (no rows = no display).

```typescript
// CORRECT
const consent = await getDisplayConsent(userId, signalKey);
if (!consent || !consent.display_enabled) {
  // Hide insight
}

// VIOLATION
const consent = await getDisplayConsent(userId, signalKey) ?? { display_enabled: true }; // Default ON is forbidden
```

**Enforcement**:
- Database default: no rows = no consent
- UI shows "Hidden" by default
- User must explicitly opt-in

---

### Rule 2.3: Consent is Granular

**REQUIRED**: Display consent MUST be per-signal-category, not global.

```typescript
// CORRECT
await grantDisplayConsent(userId, { signalKey: 'session_boundaries' }); // Only this signal
await grantDisplayConsent(userId, { signalKey: 'time_bins_activity_count' }); // Separate consent

// VIOLATION
await grantDisplayConsentForAll(userId); // "Display all" button (NOT ALLOWED)
```

**Enforcement**:
- Each signal requires separate consent grant
- No "enable all" feature

---

## 3. Neutral Language (MANDATORY)

### Rule 3.1: Forbidden Terms in UI

**FORBIDDEN** in all UI text, titles, descriptions:

- productive, unproductive, effective, ineffective
- success, failure, optimal, suboptimal
- good, bad, better, worse, best, worst
- improvement, decline, progress, regression
- streak, completion_rate, consistency_score
- performance, productivity, quality

```tsx
// CORRECT
<h3>Activity Session Boundaries</h3>
<p>Shows when activity sessions started and ended</p>

// VIOLATION
<h3>Your Productive Sessions</h3>
<p>Shows when you were most effective</p>
```

**Enforcement**:
- Code review checklist
- Manual UI text audit
- No automated enforcement (regex too fragile)

---

### Rule 3.2: Observational Language Only

**REQUIRED**: All descriptions MUST be factual observations, not evaluations.

```tsx
// CORRECT
<p>15 events recorded between 9:00 AM and 10:00 AM</p>

// VIOLATION
<p>You were most active between 9:00 AM and 10:00 AM</p>
<p>Your best time for work is 9:00 AM</p>
```

**Enforcement**:
- Use "observed", "recorded", "noted"
- Avoid "best", "optimal", "ideal"
- No prescriptive language

---

### Rule 3.3: "What This is NOT" Required

**REQUIRED**: Every insight display MUST include "What this does NOT say" section.

```tsx
// CORRECT
<InsightCard
  insight={insight}
  whatItIsNot="Not a measure of focus quality. Not an evaluation of session value."
/>

// VIOLATION
<InsightCard insight={insight} /> // Missing "what it is NOT"
```

**Enforcement**:
- InsightCard component includes expandable section
- Metadata includes `what_it_is_not` field
- UI displays this information

---

## 4. No Comparisons (MANDATORY)

### Rule 4.1: No Time-Period Comparisons

**FORBIDDEN**: Comparing current period to past period.

```typescript
// VIOLATION
const thisWeek = await getSignals(userId, thisWeekRange);
const lastWeek = await getSignals(userId, lastWeekRange);
const improvement = thisWeek.count - lastWeek.count; // NOT ALLOWED
```

**Enforcement**:
- No "vs last week" displays
- No "trend" indicators
- No "you did X% better" messages

---

### Rule 4.2: No User Comparisons

**FORBIDDEN**: Comparing user to other users or population averages.

```typescript
// VIOLATION
const userCount = await getUserActivityCount(userId);
const avgCount = await getPopulationAverage();
const vsAverage = userCount / avgCount; // NOT ALLOWED
```

**Enforcement**:
- No access to other users' data
- No population statistics
- No "you vs others" displays

---

### Rule 4.3: No Self-Comparison Implied

**FORBIDDEN**: Language that implies self-comparison.

```tsx
// VIOLATION
<p>You recorded {count} events (better than your average)</p>
<p>This is an improvement from yesterday</p>
```

**Enforcement**:
- Avoid "better", "worse", "more", "less"
- Use absolute numbers only
- No temporal judgment

---

## 5. No Recommendations or Nudges (MANDATORY)

### Rule 5.1: No Prescriptive Suggestions

**FORBIDDEN**: Telling user what to do or try.

```tsx
// VIOLATION
<p>Try working at 9:00 AM when you're most productive</p>
<p>You should aim for longer sessions</p>
<p>Consider reducing evening activities</p>
```

**Enforcement**:
- No "try", "should", "consider", "aim for"
- No action suggestions
- Observation only

---

### Rule 5.2: No Optimization Language

**FORBIDDEN**: Implying that optimization is needed or possible.

```tsx
// VIOLATION
<p>Optimize your schedule based on these patterns</p>
<p>Maximize your productive hours</p>
<p>Improve your consistency</p>
```

**Enforcement**:
- No "optimize", "maximize", "improve"
- No goal-setting language
- No "ideal" suggestions

---

### Rule 5.3: No Behavior Change Prompts

**FORBIDDEN**: Encouraging specific behavior changes.

```tsx
// VIOLATION
<button>Set goal to record daily</button>
<p>Can you maintain this pattern?</p>
```

**Enforcement**:
- No goal-setting features in Stage 2
- No behavior change prompts
- Stage 2 is observation only

---

## 6. Transparency and Provenance (MANDATORY)

### Rule 6.1: "How Was This Computed?" Required

**REQUIRED**: Every insight MUST have expandable "How was this computed?" section.

```tsx
// CORRECT
<InsightCard>
  <ExpandableSection title="How was this computed?">
    <p>{metadata.how_computed}</p>
    <p>Based on {provenance_event_ids.length} events</p>
  </ExpandableSection>
</InsightCard>

// VIOLATION
<InsightCard>{/* No transparency section */}</InsightCard>
```

**Enforcement**:
- InsightCard component includes this section
- Shows algorithm description
- Shows source event count

---

### Rule 6.2: Confidence Score Visible

**REQUIRED**: Confidence score MUST be displayed for every insight.

```tsx
// CORRECT
<div>Confidence: {Math.round(confidence * 100)}%</div>

// VIOLATION
{/* Hiding confidence score */}
```

**Enforcement**:
- InsightCard displays confidence prominently
- Explained as "data quality indicator"
- Not hidden or minimized

---

### Rule 6.3: Provenance Accessible

**REQUIRED**: Technical details (signal ID, provenance hash) MUST be accessible.

```tsx
// CORRECT
<ExpandableSection title="Technical details">
  <p>Signal ID: {signal_id}</p>
  <p>Provenance Hash: {provenance_hash}</p>
</ExpandableSection>

// VIOLATION
{/* No access to provenance */}
```

**Enforcement**:
- InsightCard includes expandable technical section
- Full transparency about data sources

---

## 7. Feedback Capture (MANDATORY)

### Rule 7.1: "Not Helpful" Button Required

**REQUIRED**: Every insight display MUST have "Not helpful" feedback option.

```tsx
// CORRECT
<FeedbackButtons
  onHelpful={() => submitFeedback('helpful')}
  onNotHelpful={() => submitFeedback('not_helpful')}
/>

// VIOLATION
<InsightCard>{/* No feedback buttons */}</InsightCard>
```

**Enforcement**:
- InsightCard includes feedback buttons
- Captures feedback to database

---

### Rule 7.2: Feedback is Passive

**REQUIRED**: Feedback MUST NOT trigger system changes.

```typescript
// CORRECT
await submitFeedback(userId, {
  signalId,
  feedbackType: 'not_helpful',
  reason: 'Causes shame'
});
// Feedback stored for future analysis only

// VIOLATION
await submitFeedback(userId, { feedbackType: 'not_helpful' });
await hideSignalForUser(userId, signalId); // Automatic action (NOT ALLOWED)
```

**Enforcement**:
- Feedback stored in `insight_feedback` table
- No triggers, no automation
- Manual review only

---

### Rule 7.3: Feedback Confirmation

**REQUIRED**: User MUST receive confirmation that feedback was received.

```tsx
// CORRECT
{feedbackSubmitted && <p>Thank you for the feedback</p>}

// VIOLATION
{/* Silent feedback submission with no confirmation */}
```

**Enforcement**:
- UI shows "Thank you" message
- User knows feedback was captured

---

## 8. No Automation (MANDATORY)

### Rule 8.1: Stage 2 Does Not Compute Signals

**FORBIDDEN**: Stage 2 MUST NOT compute new signals.

```typescript
// CORRECT
const insights = await getDisplayableInsights(userId); // Read Stage 1 signals

// VIOLATION
const newSignal = await computeSignal(context, events); // Stage 2 cannot compute (Stage 1 only)
```

**Enforcement**:
- Stage 2 service is read-only
- No access to Stage 1 compute functions
- TypeScript imports prevent misuse

---

### Rule 8.2: Stage 2 Does Not Modify Stage 0 or Stage 1 Data

**FORBIDDEN**: Stage 2 MUST NOT write to behavioral_events or candidate_signals.

```typescript
// CORRECT
// Stage 2 only reads
const signals = await supabase.from('candidate_signals').select('*');

// VIOLATION
await supabase.from('candidate_signals').update({ ... }); // NOT ALLOWED from Stage 2
await supabase.from('behavioral_events').insert({ ... }); // NOT ALLOWED from Stage 2
```

**Enforcement**:
- Stage 2 service has no write methods for Stage 0/1 tables
- Read-only access pattern

---

### Rule 8.3: No Notifications or Alerts

**FORBIDDEN**: Stage 2 MUST NOT send notifications, emails, or alerts.

```typescript
// VIOLATION
if (newInsightAvailable) {
  await sendNotification(userId, 'New insight available!'); // NOT ALLOWED
}
```

**Enforcement**:
- No notification library imports in Stage 2
- No email sending code
- Display only when user navigates to page

---

## 9. UI Constraints (MANDATORY)

### Rule 9.1: Low Default UI Density

**REQUIRED**: UI MUST default to low density, collapsible, dismissible.

```tsx
// CORRECT
<InsightCard defaultCollapsed={true} dismissible={true} />

// VIOLATION
<InsightCard expanded={true} dismissible={false} /> // Forced display
```

**Enforcement**:
- All insights collapsible
- No forced full-screen displays
- Respect user preferences

---

### Rule 9.2: No Time Pressure Language

**FORBIDDEN**: No "daily", "weekly", "maintain" language that implies pressure.

```tsx
// VIOLATION
<p>Your daily recording streak</p>
<p>Can you maintain this weekly?</p>
```

**Enforcement**:
- No streak counters
- No "daily goal" language
- No temporal pressure

---

### Rule 9.3: No Progress Bars for Behavior

**FORBIDDEN**: No progress bars that imply behavioral progress or completion.

```tsx
// VIOLATION
<ProgressBar value={recordedDays / totalDays} label="Coverage progress" />
```

**Enforcement**:
- No visual indicators of "progress"
- Simple counts only
- No gamification elements

---

## 10. Accessibility and Safety (MANDATORY)

### Rule 10.1: Safe Mode Always Visible

**REQUIRED**: Safe Mode controls MUST be accessible from insights page.

```tsx
// CORRECT
<Header>
  <SafeModeToggle />
</Header>

// VIOLATION
{/* Safe Mode buried in settings, not easily accessible */}
```

**Enforcement**:
- SafeModeToggle on main insights page
- Keyboard shortcut documented
- Always accessible

---

### Rule 10.2: Known Risks Disclosed

**REQUIRED**: Consent UI MUST disclose known risks (shame, fixation, pressure).

```tsx
// CORRECT
<ConsentCard>
  <KnownRisks>
    <li>May trigger shame about irregular patterns</li>
    <li>May create pressure to normalize schedule</li>
  </KnownRisks>
</ConsentCard>

// VIOLATION
<ConsentCard>{/* No risk disclosure */}</ConsentCard>
```

**Enforcement**:
- ConsentCenter component includes risk warnings
- Explicit for each signal type
- User makes informed decision

---

### Rule 10.3: Collapsible and Dismissible

**REQUIRED**: All insights MUST be collapsible and dismissible.

```tsx
// CORRECT
<InsightCard collapsible={true} onDismiss={() => hideInsight()} />

// VIOLATION
<InsightCard collapsible={false} dismissible={false} /> // Forced display
```

**Enforcement**:
- InsightCard supports collapse/dismiss
- User controls visibility
- No forced engagement

---

## Compliance Checklist

Use this before merging any Stage 2 changes:

### Safe Mode
- [ ] Safe Mode overrides all display
- [ ] Safe Mode toggle visible on insights page
- [ ] Keyboard shortcut works (Ctrl+Shift+S)
- [ ] Safe Mode is reversible (no data deletion)

### Display Consent
- [ ] Display consent separate from compute consent
- [ ] Default is OFF (no display without consent)
- [ ] Consent is granular (per-signal-category)
- [ ] Revocation works instantly

### Neutral Language
- [ ] No forbidden terms in UI text
- [ ] Descriptions are observational only
- [ ] "What this is NOT" section present
- [ ] No prescriptive or evaluative language

### No Comparisons
- [ ] No time-period comparisons
- [ ] No user comparisons
- [ ] No self-comparison implied

### No Recommendations
- [ ] No prescriptive suggestions
- [ ] No optimization language
- [ ] No behavior change prompts

### Transparency
- [ ] "How was this computed?" section present
- [ ] Confidence score visible
- [ ] Provenance accessible

### Feedback
- [ ] "Not helpful" button present
- [ ] Feedback is passive (no system changes)
- [ ] Feedback confirmation shown

### No Automation
- [ ] Stage 2 does not compute signals
- [ ] Stage 2 does not modify Stage 0/1 data
- [ ] No notifications or alerts

### UI Constraints
- [ ] Low default UI density
- [ ] No time pressure language
- [ ] No progress bars for behavior

### Safety
- [ ] Safe Mode always accessible
- [ ] Known risks disclosed in consent UI
- [ ] All insights collapsible/dismissible

---

## Violation Examples

### Example 1: Bypassing Safe Mode (VIOLATION)
```typescript
// WRONG
const safeModeEnabled = await isSafeModeEnabled(userId);
if (safeModeEnabled) {
  console.warn('Safe Mode enabled, but showing insights anyway');
}
return getDisplayableInsights(userId); // Ignoring Safe Mode!
```

### Example 2: Judgmental Language (VIOLATION)
```tsx
// WRONG
<h3>Your Most Productive Hours</h3>
<p>You work best between 9-10 AM. Try focusing your important tasks during this time!</p>
```

### Example 3: Comparison to Past (VIOLATION)
```typescript
// WRONG
const thisMonth = await getSignals(userId, thisMonthRange);
const lastMonth = await getSignals(userId, lastMonthRange);
const percentChange = ((thisMonth.count - lastMonth.count) / lastMonth.count) * 100;
```

### Example 4: Automatic Action on Feedback (VIOLATION)
```typescript
// WRONG
await submitFeedback(userId, { feedbackType: 'not_helpful' });
await revokeDisplayConsent(userId, signalKey); // Automatic action based on feedback!
```

### Example 5: Missing Transparency (VIOLATION)
```tsx
// WRONG
<InsightCard>
  <Title>{metadata.title}</Title>
  <Value>{value}</Value>
  {/* No "How was this computed?" section */}
  {/* No confidence score */}
  {/* No provenance */}
</InsightCard>
```

---

## Next Stage (Stage 3)

Stage 3 will:
- Implement automation (with consent)
- Create reminders and notifications
- Build goal-setting features
- Add reflection prompts

**But Stage 3 MUST respect Stage 2 Safe Mode.**
**If Safe Mode is ON, Stage 3 automation is also disabled.**

---

## Document Status

**Version**: 1.0
**Last Updated**: 2025-12-15
**Compliance**: All Stage 2 code complies with this contract
**Next Review**: Before Stage 3 implementation

**This contract protects users from shame, pressure, and burnout.**
