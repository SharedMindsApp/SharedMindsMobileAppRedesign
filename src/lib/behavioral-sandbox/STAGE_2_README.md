# Stage 2: Feedback & UX Layer

**Status**: Implemented
**Purpose**: Consent-gated display of behavioral signals with Safe Mode emergency brake

---

## Quick Start

```typescript
import {
  // Safe Mode (Emergency Brake)
  toggleSafeMode,
  isSafeModeEnabled,

  // Display Consent
  grantDisplayConsent,
  revokeDisplayConsent,

  // Insight Access
  getDisplayableInsights,

  // Feedback (Passive)
  submitFeedback
} from '@/lib/behavioral-sandbox';

// Check Safe Mode
const safeModeActive = await isSafeModeEnabled(userId);

// Grant display consent
await grantDisplayConsent(userId, {
  signalKey: 'time_bins_activity_count'
});

// Get displayable insights (respects Safe Mode + consent)
const insights = await getDisplayableInsights(userId);

// Submit passive feedback
await submitFeedback(userId, {
  signalId: insight.signal_id,
  signalKey: insight.signal_key,
  feedbackType: 'not_helpful',
  reason: 'Causes shame'
});

// Toggle Safe Mode (emergency brake)
await toggleSafeMode(userId, {
  enabled: true,
  reason: 'User activated Safe Mode'
});
```

---

## Architecture

### Two-Stage Consent

**Stage 1 Consent** (Computation):
```typescript
await grantConsent(userId, 'time_patterns'); // Allow computation
```

**Stage 2 Consent** (Display):
```typescript
await grantDisplayConsent(userId, { signalKey: 'time_bins_activity_count' }); // Allow display
```

User must grant BOTH consents to see an insight.

---

### Safe Mode (Emergency Brake)

Safe Mode **overrides all display permissions**:

```typescript
// When Safe Mode is ON
const insights = await getDisplayableInsights(userId);
// Returns [] (empty array) - NO insights shown
```

**Features**:
- Instant activation (no delays)
- Fully reversible (no data deletion)
- Keyboard shortcut: Ctrl+Shift+S
- Overrides all Stage 2 and Stage 3 features

---

## API Reference

### Safe Mode

#### `isSafeModeEnabled(userId: string): Promise<boolean>`
Check if Safe Mode is active.

```typescript
const isActive = await isSafeModeEnabled(userId);
if (isActive) {
  // Hide all insights
}
```

#### `toggleSafeMode(userId: string, options: SafeModeOptions): Promise<void>`
Enable or disable Safe Mode.

```typescript
interface SafeModeOptions {
  enabled: boolean;
  reason?: string;
}

// Enable Safe Mode
await toggleSafeMode(userId, {
  enabled: true,
  reason: 'User feeling overwhelmed'
});

// Disable Safe Mode
await toggleSafeMode(userId, {
  enabled: false
});
```

#### `getSafeModeStatus(userId: string): Promise<SafeModeState | null>`
Get full Safe Mode state including activation count.

```typescript
const state = await getSafeModeStatus(userId);
console.log(`Activated ${state.activation_count} times`);
```

---

### Display Consent

#### `grantDisplayConsent(userId: string, options: GrantDisplayConsentOptions): Promise<void>`
Grant permission to display a specific signal.

```typescript
interface GrantDisplayConsentOptions {
  signalKey: SignalKey;
  preferCollapsed?: boolean;
  preferHidden?: boolean;
}

await grantDisplayConsent(userId, {
  signalKey: 'session_boundaries',
  preferCollapsed: false,
  preferHidden: false
});
```

#### `revokeDisplayConsent(userId: string, signalKey: SignalKey): Promise<void>`
Revoke display permission (hide signal).

```typescript
await revokeDisplayConsent(userId, 'time_bins_activity_count');
```

#### `canDisplayInsight(userId: string, signalKey: SignalKey): Promise<boolean>`
Check if insight can be displayed (Safe Mode + consent).

```typescript
const canShow = await canDisplayInsight(userId, 'activity_intervals');
```

---

### Insight Access

#### `getDisplayableInsights(userId: string, options?: GetInsightsOptions): Promise<DisplayableInsight[]>`
Get insights user is allowed to see.

```typescript
interface GetInsightsOptions {
  signalKeys?: SignalKey[];
  includeHidden?: boolean;
  respectSafeMode?: boolean;
}

// Get all displayable insights
const insights = await getDisplayableInsights(userId);

// Get specific signal types
const sessionInsights = await getDisplayableInsights(userId, {
  signalKeys: ['session_boundaries']
});

// Include hidden (for consent management)
const all = await getDisplayableInsights(userId, {
  includeHidden: true
});
```

**Returns**: Array of `DisplayableInsight` with metadata:
```typescript
interface DisplayableInsight extends CandidateSignal {
  can_display: boolean;
  display_consent: InsightDisplayConsent | null;
  display_metadata: {
    signal_title: string;
    signal_description: string;
    what_it_is: string;
    what_it_is_not: string;
    how_computed: string;
    why_useful: string | null;
  };
}
```

#### `getInsightMetadata(signalKey: SignalKey): InsightMetadata`
Get display metadata for a signal (titles, descriptions, warnings).

```typescript
const metadata = getInsightMetadata('capture_coverage');
console.log(metadata.title); // "Data Capture Overview"
console.log(metadata.known_risks); // Array of risk warnings
```

---

### Feedback (Passive)

#### `submitFeedback(userId: string, options: SubmitFeedbackOptions): Promise<void>`
Capture user feedback on an insight.

```typescript
interface SubmitFeedbackOptions {
  signalId: string;
  signalKey: SignalKey;
  feedbackType: 'helpful' | 'not_helpful' | 'confusing' | 'concerning';
  reason?: string;
  displayedAt?: string;
  uiContext?: Record<string, unknown>;
}

await submitFeedback(userId, {
  signalId: insight.signal_id,
  signalKey: insight.signal_key,
  feedbackType: 'not_helpful',
  reason: 'Triggers shame about irregular schedule'
});
```

**CRITICAL**: Feedback is passive. It does NOT trigger system changes.

#### `logDisplay(userId: string, options: LogDisplayOptions): Promise<void>`
Log that an insight was displayed (transparency audit trail).

```typescript
interface LogDisplayOptions {
  signalId: string;
  signalKey: SignalKey;
  displayContext: 'dashboard' | 'detail_view' | 'report' | 'consent_center';
  expanded?: boolean;
  dismissed?: boolean;
  sessionId?: string;
}

await logDisplay(userId, {
  signalId: insight.signal_id,
  signalKey: insight.signal_key,
  displayContext: 'dashboard'
});
```

---

## Neutral Language

### Forbidden Terms

Stage 2 MUST NOT use these terms in any UI:

- productive, unproductive, effective, ineffective
- success, failure, optimal, suboptimal
- good, bad, better, worse, best, worst
- improvement, decline, progress, regression
- streak, completion_rate, consistency_score
- performance, productivity, quality

### Allowed Language

Use observational language only:

- "Activity observed across time windows"
- "Shows when activity events were recorded"
- "Data captured on X of Y days"
- "Observation of temporal boundaries"

---

## Known Risks Disclosure

Every signal has **known risks** that MUST be disclosed in consent UI:

### capture_coverage Risks
- **HIGH RISK**: May be interpreted as streak or consistency score
- May trigger shame about gaps in recording
- May create pressure to record daily
- Missing data may be intentional or circumstantial

### time_bins_activity_count Risks
- May trigger shame about irregular patterns
- May create pressure to normalize schedule
- Patterns may be circumstantial, not meaningful

### session_boundaries Risks
- May trigger fixation on session duration
- May create pressure to maintain long sessions

### activity_intervals Risks
- May trigger comparison to estimated durations
- May create pressure about time spent

---

## UI Components

### SafeModeToggle
Emergency brake UI component.

**Features**:
- Shows current Safe Mode state
- Keyboard shortcut (Ctrl+Shift+S)
- Displays activation count (informational, no shame)
- Calm messaging

**Usage**:
```tsx
import { SafeModeToggle } from '@/components/behavioral-insights/SafeModeToggle';

<SafeModeToggle />
```

### ConsentCenter
Granular display permission management.

**Features**:
- Lists all available signals
- Explains data used and NOT inferred
- Discloses known risks
- Explicit opt-in (default OFF)
- Expandable details

**Usage**:
```tsx
import { ConsentCenter } from '@/components/behavioral-insights/ConsentCenter';

<ConsentCenter />
```

### InsightCard
Display individual behavioral signal.

**Features**:
- Neutral title and description
- Confidence score visible
- Expandable "How was this computed?"
- Expandable "What this is NOT"
- Expandable "Technical details"
- "Helpful"/"Not helpful" feedback buttons
- Collapsible and dismissible

**Usage**:
```tsx
import { InsightCard } from '@/components/behavioral-insights/InsightCard';

<InsightCard insight={displayableInsight} />
```

### BehavioralInsightsDashboard
Main insights view.

**Features**:
- Three tabs: Insights, Display Settings, Safe Mode
- Respects Safe Mode (shows override message)
- Respects display consent
- Empty state with guidance
- Neutral interpretation guidance

**Usage**:
```tsx
import { BehavioralInsightsDashboard } from '@/components/behavioral-insights/BehavioralInsightsDashboard';

<Route path="/insights" element={<BehavioralInsightsDashboard />} />
```

---

## Database Schema

### `insight_display_consent`
```sql
- id: uuid
- user_id: uuid (FK to auth.users)
- signal_key: enum
- display_enabled: boolean (default false)
- granted_at: timestamptz
- revoked_at: timestamptz
- prefer_collapsed: boolean
- prefer_hidden: boolean
```

### `insight_feedback`
```sql
- feedback_id: uuid
- user_id: uuid (FK to auth.users)
- signal_id: uuid (FK to candidate_signals)
- signal_key: enum
- feedback_type: text (helpful, not_helpful, confusing, concerning)
- reason: text (nullable)
- displayed_at: timestamptz
- feedback_at: timestamptz
```

### `safe_mode_state`
```sql
- id: uuid
- user_id: uuid (FK to auth.users)
- is_enabled: boolean (default false)
- enabled_at: timestamptz
- disabled_at: timestamptz
- activation_reason: text (nullable)
- activation_count: integer
- last_toggled_at: timestamptz
```

### `insight_display_log`
```sql
- log_id: uuid
- user_id: uuid (FK to auth.users)
- signal_id: uuid (FK to candidate_signals)
- signal_key: enum
- displayed_at: timestamptz
- display_context: text
- expanded: boolean
- dismissed: boolean
- session_id: uuid (nullable)
```

---

## Compliance

### Stage 2 MUST NOT

❌ Compute new signals (Stage 1 only)
❌ Modify Stage 0 or Stage 1 data
❌ Use judgmental language (streaks, scores, productivity)
❌ Compare user to past self or others
❌ Recommend behavior changes
❌ Trigger automation or notifications
❌ Bypass Safe Mode
❌ Bypass display consent

### Stage 2 MAY

✅ Display existing Stage 1 signals
✅ Explain computation methodology
✅ Show confidence and uncertainty
✅ Capture passive feedback
✅ Log displays for transparency
✅ Enforce consent and Safe Mode
✅ Use neutral, observational language

---

## Testing

### Manual Tests

1. **Safe Mode**:
   - Enable Safe Mode → verify all insights hidden
   - Press Ctrl+Shift+S → verify Safe Mode toggles
   - Disable Safe Mode → verify insights return
   - Verify no data deleted

2. **Display Consent**:
   - Verify default is OFF (no display without consent)
   - Grant consent for one signal → verify only that signal shows
   - Revoke consent → verify signal hides immediately

3. **Language**:
   - Review all UI text for forbidden terms
   - Verify "what it is NOT" sections present
   - Verify observational language only

4. **Transparency**:
   - Expand "How was this computed?" → verify shows methodology
   - Expand "Technical details" → verify shows provenance
   - Verify confidence score visible

5. **Feedback**:
   - Click "Not helpful" → verify feedback captured
   - Verify no system changes occur
   - Verify confirmation message shows

---

## See Also

- `/STAGE_2_CONTRACT.md` - Mandatory constraints and rules
- `/STAGE_2_IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `/STAGE_1_CONTRACT.md` - Stage 1 (computation) rules
- `/src/lib/behavioral-sandbox/README.md` - Stage 1 documentation

---

**Remember: Stage 2 is display only. No automation, no recommendations, no judgment.**
