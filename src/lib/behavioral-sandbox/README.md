# Stage 1: Behavioral Sandbox (Layer B)

**Status**: Implemented
**Purpose**: Compute candidate behavioral signals with full provenance and consent gating

---

## Architecture Position

This module implements **Layer B** of the Semantic Firebreak Architecture:

```
Layer A: Stage 0 - Raw Event Log (append-only)
    ↓
Layer B: Stage 1 - Interpretation Sandbox ← YOU ARE HERE
    ↓
Layer C: Stage 2+ - Feedback & UX Layer (NOT YET IMPLEMENTED)
    ↓
Layer D: Stage 3+ - Automation Layer (NOT YET IMPLEMENTED)
```

---

## Core Principles

### 1. Consent-Gated Computation

**NO consent = NO computation**

All signals require explicit user consent before computation:

```typescript
// User must grant consent first
await grantConsent(userId, 'time_patterns');

// Then signals can be computed
await computeCandidateSignalsForUser(userId, {
  signalKeys: ['time_bins_activity_count']
});
```

### 2. Full Provenance Tracking

Every signal includes:
- Source event IDs (which events contributed)
- Provenance hash (SHA-256 of normalized source data)
- Algorithm version (for reproducibility)
- Confidence score (data quality indicator)

### 3. Neutral Language Only

**FORBIDDEN TERMS**:
- "success", "failure"
- "productive", "effective"
- "optimal", "best"
- "improvement", "decline"
- "streak", "completion rate"
- "consistency score"

### 4. Append-Only Signals

Signals are never updated. Instead:
- New computations create new signals
- Old signals are invalidated (status change)
- Full audit trail maintained

---

## Signal Registry

### Current Signals (Stage 1)

#### 1. `session_boundaries`
**Consent Required**: `session_structures`
**Purpose**: Detect activity session start/end times
**Output**: List of sessions with start/end timestamps
**Language**: "Session started at X, ended at Y" (factual)

#### 2. `time_bins_activity_count`
**Consent Required**: `time_patterns`
**Purpose**: Count activities by time-of-day bins
**Output**: Array of bins with activity counts
**Language**: "User was active 15 times between 9-10am" (factual)

#### 3. `activity_intervals`
**Consent Required**: `activity_durations`
**Purpose**: Extract duration of activities
**Output**: List of activities with start, end, duration
**Language**: "Activity lasted 45 minutes" (factual)

#### 4. `capture_coverage`
**Consent Required**: `data_quality_basic`
**Purpose**: Measure data capture coverage
**Output**: Days with events vs total days
**Language**: "Data captured on 20 of 30 days" (factual, NOT "habit consistency")

---

## Public API

### Consent Management

```typescript
// Check consent
const hasConsent = await hasUserConsent(userId, 'time_patterns');

// Grant consent
await grantConsent(userId, 'time_patterns');

// Revoke consent (also invalidates signals)
await revokeConsent(userId, 'time_patterns');
```

### Signal Computation

```typescript
// Compute all signals (with consent check)
const result = await computeCandidateSignalsForUser(userId);

// Compute specific signals
const result = await computeCandidateSignalsForUser(userId, {
  signalKeys: ['time_bins_activity_count'],
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  },
  forceRecompute: false // Use cached if available
});

// Result structure
interface ComputeResult {
  computed: number;        // How many signals computed
  skipped: number;         // Skipped due to no consent or insufficient data
  errors: string[];        // Any errors encountered
  signals: CandidateSignal[]; // Computed signals
}
```

### Signal Retrieval

```typescript
// Get all candidate signals
const signals = await getCandidateSignals(userId);

// Get specific signals
const signals = await getCandidateSignals(userId, {
  signalKeys: ['session_boundaries'],
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  },
  status: 'candidate', // 'candidate' | 'invalidated' | 'deleted'
  limit: 50,
  offset: 0
});

// Signal structure
interface CandidateSignal {
  signal_id: string;
  signal_key: SignalKey;
  signal_version: string;
  time_range_start: string;
  time_range_end: string;
  value_json: SignalValue; // Type varies by signal_key
  confidence: number; // 0 to 1
  provenance_event_ids: string[];
  provenance_hash: string;
  parameters_json: Record<string, unknown>;
  status: 'candidate' | 'invalidated' | 'deleted';
  computed_at: string;
}
```

### Signal Invalidation

```typescript
// When source events are deleted/modified
const result = await invalidateSignalsForDeletedEvents(userId, eventIds);

// Result structure
interface InvalidateResult {
  invalidated_count: number;
  affected_signal_ids: string[];
}
```

---

## Database Schema

### `user_consent_flags`
```sql
- id: uuid
- user_id: uuid (FK to auth.users)
- consent_key: enum (session_structures, time_patterns, ...)
- is_enabled: boolean (default false)
- granted_at: timestamptz (when enabled)
- revoked_at: timestamptz (when disabled)
```

**Default**: No rows = no consent = no computation

### `candidate_signals`
```sql
- signal_id: uuid
- user_id: uuid (FK to auth.users)
- signal_key: enum (session_boundaries, time_bins_activity_count, ...)
- signal_version: text (e.g., "1.0.0")
- time_range_start: timestamptz
- time_range_end: timestamptz
- value_json: jsonb (signal output)
- confidence: numeric (0 to 1)
- provenance_event_ids: uuid[] (source events)
- provenance_hash: text (SHA-256)
- parameters_json: jsonb
- status: enum (candidate, invalidated, deleted)
- computed_at: timestamptz
```

**Constraints**:
- Append-only (no updates to computed signals)
- Provenance required (must have source events)
- Time range must be valid

### `signal_audit_log`
```sql
- audit_id: uuid
- user_id: uuid
- signal_id: uuid (nullable)
- action: text (computed, invalidated, deleted, consent_granted, consent_revoked)
- actor: text (user_id or 'system')
- reason: text
- metadata: jsonb
- created_at: timestamptz
```

---

## Adding New Signals (Future)

### 1. Update Database Enum
```sql
ALTER TYPE signal_key_enum ADD VALUE 'new_signal_key';
ALTER TYPE consent_key_enum ADD VALUE 'new_consent_key';
```

### 2. Add to Signal Registry
```typescript
// src/lib/behavioral-sandbox/registry.ts
export const SIGNAL_REGISTRY: Record<SignalKey, SignalDefinition> = {
  // ...existing signals
  new_signal_key: {
    key: 'new_signal_key',
    version: '1.0.0',
    requiredConsent: 'new_consent_key',
    description: 'Neutral description (no judgmental language)',
    parameters: [
      {
        name: 'param_name',
        type: 'number',
        default: 10,
        description: 'Parameter description'
      }
    ],
    minimumEvents: 5,
    confidenceThreshold: 0.7
  }
};
```

### 3. Add Type Definition
```typescript
// src/lib/behavioral-sandbox/types.ts
export interface NewSignalValue {
  // Neutral structure, no judgmental fields
  field1: string;
  field2: number;
}
```

### 4. Implement Compute Function
```typescript
// src/lib/behavioral-sandbox/compute.ts
function computeNewSignal(
  events: BehavioralEvent[],
  parameters: Record<string, unknown>
): ComputeOutput<NewSignalValue> {
  // Neutral computation logic
  // Full provenance tracking
  // Confidence calculation
}
```

### 5. Wire into Switch Statement
```typescript
// src/lib/behavioral-sandbox/compute.ts
export async function computeSignal(...) {
  switch (context.signalKey) {
    // ...existing cases
    case 'new_signal_key':
      return computeNewSignal(events, context.parameters);
  }
}
```

---

## Forbidden Operations

### Stage 1 Must NEVER:

1. **Display signals to users** (Stage 2+ only)
   ```typescript
   // FORBIDDEN
   return <div>{signal.value_json.count}</div>;
   ```

2. **Trigger actions** (Stage 3+ only)
   ```typescript
   // FORBIDDEN
   if (signal.value_json.count < 5) {
     sendNotification(userId, 'You need to be more active!');
   }
   ```

3. **Compute judgmental metrics**
   ```typescript
   // FORBIDDEN
   const successRate = completedTasks / totalTasks;
   const productivityScore = calculateProductivity(events);
   ```

4. **Bypass consent checks**
   ```typescript
   // FORBIDDEN
   const signals = await computeSignal(context, events); // No consent check!
   ```

5. **Compare users or time periods**
   ```typescript
   // FORBIDDEN
   const improvement = thisWeek.count - lastWeek.count;
   const vsAverage = user.count / populationAverage;
   ```

---

## Testing Checklist

- [ ] Consent gating works (no consent = no computation)
- [ ] Provenance tracking is complete (all source events tracked)
- [ ] Confidence scores are reasonable
- [ ] No forbidden terms in output
- [ ] Signals invalidate when source events change
- [ ] Audit log captures all operations
- [ ] RLS policies prevent cross-user access
- [ ] Time ranges are validated
- [ ] Signal registry matches database enums

---

## Integration with Stage 0

Stage 1 reads from Stage 0 behavioral events:

```typescript
// Stage 1 queries Stage 0 (read-only)
const events = await supabase
  .from('behavioral_events')
  .select('*')
  .eq('user_id', userId)
  .gte('occurred_at', timeRange.start)
  .lte('occurred_at', timeRange.end)
  .is('superseded_by', null);

// Stage 1 NEVER writes to behavioral_events
// Stage 1 NEVER modifies behavioral_events
```

---

## Next Steps (Stage 2)

Stage 2 will:
1. Display signals to users (with consent)
2. Implement "How was this computed?" transparency UI
3. Add "Not helpful" feedback collection
4. Create Safe Mode (emergency brake)
5. Build neutral language display templates

**But Stage 2 is NOT YET IMPLEMENTED.**

Stage 1 signals remain in the sandbox until Stage 2 explicitly publishes them.

---

## Files in This Module

```
src/lib/behavioral-sandbox/
├── index.ts          # Public API exports
├── types.ts          # TypeScript type definitions
├── registry.ts       # Signal whitelist and definitions
├── compute.ts        # Signal computation algorithms
├── service.ts        # Public service layer (consent + DB)
└── README.md         # This file
```

---

## Support

For questions about Stage 1 implementation:
- See `SEMANTIC_FIREBREAK_MAP.md` for architecture
- See `STAGE_1_CONTRACT.md` for compliance checklist
- Consult Stage 0 documentation for event structure

**Remember: Stage 1 is consent-gated, provenance-tracked, and neutral. No judgments, no actions.**
