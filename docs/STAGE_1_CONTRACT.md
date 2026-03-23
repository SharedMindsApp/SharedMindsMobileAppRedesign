# Stage 1 Contract: Interpretation Sandbox (Layer B)

**Version**: 1.0
**Status**: Implemented
**Date**: 2025-12-15

---

## Contract Overview

This document defines the **mandatory constraints** for Stage 1 (Behavioral Sandbox).

All code in `/src/lib/behavioral-sandbox/` and related database tables must comply with this contract.

**Violations of this contract are system-level failures.**

---

## 1. Consent Gating (MANDATORY)

### Rule 1.1: No Consent = No Computation

**REQUIRED**: Every signal computation MUST check user consent before processing.

```typescript
// CORRECT
const hasConsent = await hasUserConsent(userId, requiredConsentKey);
if (!hasConsent) {
  return { computed: 0, skipped: 1, errors: [], signals: [] };
}

// VIOLATION
const signal = await computeSignal(context, events); // No consent check!
```

**Enforcement**:
- `computeCandidateSignalsForUser()` checks consent for each signal
- Database has NO default consent (no rows = no consent)
- Skipped signals are logged but not computed

---

### Rule 1.2: Consent is Granular

**REQUIRED**: Each signal type requires specific consent category.

```typescript
// CORRECT - Each signal has its own consent requirement
session_boundaries → session_structures
time_bins_activity_count → time_patterns
activity_intervals → activity_durations
capture_coverage → data_quality_basic

// VIOLATION - Using "consent_all" flag
```

**Enforcement**:
- Signal registry maps each signal to required consent
- Cannot bypass with blanket consent

---

### Rule 1.3: Consent Revocation Invalidates Signals

**REQUIRED**: When consent is revoked, all related signals MUST be invalidated.

```typescript
// CORRECT
await revokeConsent(userId, 'time_patterns');
// This automatically invalidates time_bins_activity_count signals

// VIOLATION
await revokeConsent(userId, 'time_patterns');
// Signals remain active (NOT ALLOWED)
```

**Enforcement**:
- `revokeConsent()` calls `invalidateSignalsByConsent()`
- Database trigger logs consent revocation

---

## 2. Provenance Tracking (MANDATORY)

### Rule 2.1: All Signals Must Include Source Events

**REQUIRED**: Every signal MUST record which events contributed to its computation.

```typescript
// CORRECT
return {
  value: computedValue,
  provenance_event_ids: ['event-1-id', 'event-2-id', 'event-3-id'],
  provenance_hash: 'sha256-hash-of-normalized-events',
  confidence: 0.85
};

// VIOLATION
return {
  value: computedValue,
  provenance_event_ids: [], // Empty provenance!
  confidence: 0.85
};
```

**Enforcement**:
- Database constraint: `CHECK (array_length(provenance_event_ids, 1) > 0)`
- Cannot store signal without provenance

---

### Rule 2.2: Provenance Hash is Required

**REQUIRED**: Every signal MUST include SHA-256 hash of normalized source events.

**Purpose**: Cache invalidation when source data changes.

```typescript
// CORRECT
const hash = crypto.createHash('sha256')
  .update(JSON.stringify(normalizedEvents))
  .digest('hex');

// VIOLATION
const hash = ''; // Empty hash not allowed
const hash = Math.random().toString(); // Random hash breaks invalidation
```

**Enforcement**:
- Database constraint: `provenance_hash text NOT NULL`
- `computeProvenanceHash()` function provides stable hashing

---

### Rule 2.3: Algorithm Versioning Required

**REQUIRED**: Every signal MUST record algorithm version used for computation.

**Purpose**: Reproducibility and debugging.

```typescript
// CORRECT
signal_version: '1.0.0' // Matches SIGNAL_REGISTRY[signalKey].version

// VIOLATION
signal_version: 'latest' // Not specific enough
signal_version: '' // Empty version
```

**Enforcement**:
- Database field: `signal_version text NOT NULL`
- Must match version in signal registry

---

## 3. Neutral Language (MANDATORY)

### Rule 3.1: Forbidden Terms in Code

**FORBIDDEN** in all signal outputs, descriptions, and variable names:

- success, failure
- productive, unproductive, effective, ineffective
- optimal, suboptimal, best, worst
- good, bad, better, worse
- improvement, decline, progress, regression
- streak, completion_rate, consistency_score
- productivity, performance, quality

```typescript
// CORRECT
const activityCount = events.length;
const sessionDuration = endTime - startTime;
const coverageRatio = daysWithEvents / totalDays;

// VIOLATION
const productivityScore = calculateProductivity(events);
const successRate = completedTasks / totalTasks;
const consistency = calculateConsistency(events);
```

**Enforcement**:
- `containsForbiddenTerms()` function scans text
- `assertNeutralLanguage()` throws on violation
- Code review checklist includes language audit

---

### Rule 3.2: Signal Descriptions Must Be Factual

**REQUIRED**: All signal descriptions must state WHAT is measured, not WHY it's good.

```typescript
// CORRECT
description: 'Counts activity events by time-of-day bins. Shows when user tends to be active.'

// VIOLATION
description: 'Identifies your most productive hours so you can optimize your schedule.'
```

**Enforcement**:
- Signal registry includes all descriptions
- Manual review during signal addition

---

## 4. No UI Display (MANDATORY)

### Rule 4.1: Stage 1 Does Not Render UI

**FORBIDDEN**: Stage 1 code MUST NOT return JSX or render components.

```typescript
// CORRECT
return signal.value_json; // Return data

// VIOLATION
return <div>{signal.value_json.count}</div>; // Rendering UI!
```

**Enforcement**:
- No React imports in `/src/lib/behavioral-sandbox/`
- No `.tsx` files in this module
- TypeScript compilation fails if UI code present

---

### Rule 4.2: Stage 1 Does Not Format for Display

**FORBIDDEN**: Stage 1 MUST NOT format data for human consumption.

```typescript
// CORRECT
return {
  duration_seconds: 3600,
  start: '2024-01-15T09:00:00Z'
};

// VIOLATION
return {
  duration_display: '1 hour', // Formatted for UI
  start_friendly: 'January 15, 2024 at 9:00 AM' // UI formatting
};
```

**Enforcement**:
- Signal values are raw data structures
- No date formatting, no number formatting
- Stage 2+ handles display formatting

---

## 5. No Actions or Triggers (MANDATORY)

### Rule 5.1: No Notifications

**FORBIDDEN**: Stage 1 MUST NOT send notifications, emails, or alerts.

```typescript
// CORRECT
return { signals, computed: 5 };

// VIOLATION
if (signal.value_json.count < threshold) {
  sendNotification(userId, 'You need to do more!'); // NOT ALLOWED
}
```

**Enforcement**:
- No imports of notification libraries
- Code review blocks action triggers

---

### Rule 5.2: No Automated Decisions

**FORBIDDEN**: Stage 1 MUST NOT make decisions on behalf of user.

```typescript
// CORRECT
return signal; // Just compute and return

// VIOLATION
if (signal.confidence < 0.5) {
  disableFeature(userId); // Automated decision!
}
```

**Enforcement**:
- Stage 1 is computation-only
- Stage 3+ handles automation

---

## 6. Signal Registry (MANDATORY)

### Rule 6.1: All Signals Must Be Whitelisted

**REQUIRED**: Only signals in `SIGNAL_REGISTRY` are allowed.

```typescript
// CORRECT
if (!validateSignalKey(signalKey)) {
  throw new Error(`Signal key "${signalKey}" not found in registry`);
}

// VIOLATION
const signal = await computeCustomSignal(userId, anyKey); // Bypasses registry
```

**Enforcement**:
- `validateSignalKey()` checks registry
- Database enum restricts to whitelisted keys

---

### Rule 6.2: Signal Keys Must Match Database

**REQUIRED**: Signal keys in code MUST match database enum.

```sql
-- Database
CREATE TYPE signal_key_enum AS ENUM (
  'session_boundaries',
  'time_bins_activity_count',
  'activity_intervals',
  'capture_coverage'
);
```

```typescript
// TypeScript (must match)
export type SignalKey =
  | 'session_boundaries'
  | 'time_bins_activity_count'
  | 'activity_intervals'
  | 'capture_coverage';
```

**Enforcement**:
- Type system catches mismatches
- Database rejects unknown keys

---

## 7. Append-Only Signals (MANDATORY)

### Rule 7.1: Signals Are Never Updated

**FORBIDDEN**: Once stored, signal `value_json` cannot be modified.

```typescript
// CORRECT
// Create new signal with new computation
const newSignal = await storeSignal(userId, signalKey, context, output);

// VIOLATION
await supabase
  .from('candidate_signals')
  .update({ value_json: newValue }) // NOT ALLOWED
  .eq('signal_id', existingSignalId);
```

**Enforcement**:
- No UPDATE operations on signal values
- Only `status` field can change (candidate → invalidated)

---

### Rule 7.2: Invalidation Instead of Deletion

**REQUIRED**: Signals are soft-deleted via `status` change, not hard-deleted.

```typescript
// CORRECT
await supabase
  .from('candidate_signals')
  .update({
    status: 'invalidated',
    invalidated_at: now(),
    invalidated_reason: reason
  })
  .eq('signal_id', signalId);

// VIOLATION
await supabase
  .from('candidate_signals')
  .delete() // Hard delete loses audit trail
  .eq('signal_id', signalId);
```

**Enforcement**:
- Database RLS policies prevent DELETE
- Only status updates allowed

---

## 8. Confidence Scores (MANDATORY)

### Rule 8.1: Confidence Must Reflect Data Quality

**REQUIRED**: Confidence scores (0-1) MUST indicate data sufficiency, not outcome quality.

```typescript
// CORRECT
const confidence = Math.min(totalEvents / 60, 1); // Based on sample size

// VIOLATION
const confidence = successRate; // Based on "success" (judgmental)
```

**Enforcement**:
- Database constraint: `CHECK (confidence >= 0 AND confidence <= 1)`
- Each compute function calculates confidence

---

### Rule 8.2: Minimum Events Required

**REQUIRED**: Each signal defines minimum events needed for computation.

```typescript
// CORRECT
if (events.length < definition.minimumEvents) {
  return { skipped: 1 }; // Not enough data
}

// VIOLATION
const signal = await computeSignal(context, []); // No events!
```

**Enforcement**:
- Signal registry specifies `minimumEvents`
- Service layer checks before computation

---

## 9. Time Ranges (MANDATORY)

### Rule 9.1: All Signals Have Time Boundaries

**REQUIRED**: Every signal MUST specify time range it covers.

```typescript
// CORRECT
{
  time_range_start: '2024-01-01T00:00:00Z',
  time_range_end: '2024-01-31T23:59:59Z',
  value_json: { ... }
}

// VIOLATION
{
  value_json: { ... } // No time range!
}
```

**Enforcement**:
- Database fields: `time_range_start`, `time_range_end` NOT NULL
- Database constraint: `CHECK (time_range_start <= time_range_end)`

---

## 10. Stage 0 Integration (MANDATORY)

### Rule 10.1: Read-Only Access to Stage 0

**REQUIRED**: Stage 1 MAY read from `behavioral_events`, MUST NOT write.

```typescript
// CORRECT
const events = await supabase
  .from('behavioral_events')
  .select('*'); // Read-only

// VIOLATION
await supabase
  .from('behavioral_events')
  .insert({ ... }); // NOT ALLOWED from Stage 1
```

**Enforcement**:
- Stage 1 queries Stage 0 via SELECT only
- Stage 0 writes happen through Stage 0 API

---

### Rule 10.2: Respect Supersession

**REQUIRED**: Stage 1 MUST exclude superseded events.

```typescript
// CORRECT
const events = await supabase
  .from('behavioral_events')
  .select('*')
  .is('superseded_by', null); // Only current events

// VIOLATION
const events = await supabase
  .from('behavioral_events')
  .select('*'); // Includes superseded events!
```

**Enforcement**:
- All queries include `superseded_by IS NULL`

---

## 11. Audit Logging (MANDATORY)

### Rule 11.1: All Operations Must Be Logged

**REQUIRED**: Compute, invalidate, delete, consent grant/revoke MUST be audited.

```typescript
// CORRECT
await logAudit(userId, signalId, 'computed', userId, 'Signal computed');

// VIOLATION
// No audit log after operation
```

**Enforcement**:
- Service layer logs all operations
- Database triggers log consent changes

---

## 12. Error Handling (MANDATORY)

### Rule 12.1: Graceful Failure

**REQUIRED**: Computation failures MUST NOT crash entire batch.

```typescript
// CORRECT
for (const signalKey of signalKeys) {
  try {
    const signal = await computeSignal(...);
    result.signals.push(signal);
    result.computed++;
  } catch (error) {
    result.errors.push(`${signalKey}: ${error.message}`);
  }
}

// VIOLATION
for (const signalKey of signalKeys) {
  const signal = await computeSignal(...); // Throws, stops batch
  result.signals.push(signal);
}
```

**Enforcement**:
- Try-catch around each signal computation
- Errors collected in result.errors array

---

## Compliance Checklist

Use this before merging any Stage 1 changes:

### Consent
- [ ] All computations check consent
- [ ] Consent is granular (per signal category)
- [ ] Consent revocation invalidates signals

### Provenance
- [ ] All signals include source event IDs
- [ ] Provenance hash is computed
- [ ] Algorithm version is recorded

### Language
- [ ] No forbidden terms in code
- [ ] Descriptions are factual, not judgmental
- [ ] Variable names are neutral

### Boundaries
- [ ] No UI rendering code
- [ ] No notification or action triggers
- [ ] No automated decisions

### Registry
- [ ] Signal keys match database enum
- [ ] Signal keys match TypeScript type
- [ ] All signals in SIGNAL_REGISTRY

### Data Integrity
- [ ] Signals are append-only
- [ ] Invalidation instead of deletion
- [ ] Time ranges are valid
- [ ] Confidence scores reflect data quality

### Integration
- [ ] Read-only access to Stage 0
- [ ] Superseded events excluded
- [ ] Audit logging on all operations

### Testing
- [ ] Consent gating tested
- [ ] Provenance tracking verified
- [ ] Confidence scores reasonable
- [ ] Error handling works

---

## Violation Examples

### Example 1: Bypass Consent (VIOLATION)
```typescript
// WRONG
async function computeWithoutConsent(userId: string) {
  const events = await getBehavioralEvents(userId);
  return computeSignal(context, events); // No consent check!
}
```

### Example 2: Judgmental Language (VIOLATION)
```typescript
// WRONG
return {
  productivity_score: 0.85, // "productivity" is forbidden
  is_successful: true,      // "successful" is forbidden
};
```

### Example 3: UI Rendering (VIOLATION)
```typescript
// WRONG
export function SignalDisplay({ signal }: { signal: CandidateSignal }) {
  return <div>{signal.value_json.count}</div>; // Stage 1 cannot render UI
}
```

### Example 4: Missing Provenance (VIOLATION)
```typescript
// WRONG
return {
  value: { count: 10 },
  provenance_event_ids: [], // Empty provenance violates contract
  confidence: 0.9
};
```

---

## Enforcement Mechanisms

### Compile-Time
- TypeScript types prevent invalid signal keys
- No React imports = no UI rendering
- Database enums enforce whitelists

### Runtime
- `validateSignalKey()` checks registry
- `hasUserConsent()` gates computation
- `assertNeutralLanguage()` scans for forbidden terms
- Database constraints enforce data integrity

### Review-Time
- Code review checklist
- Manual language audit
- Architecture review for boundary violations

---

## Next Stage (Stage 2)

Stage 2 will:
- Display signals to users (with consent)
- Format for human consumption
- Implement transparency UI

**But Stage 2 MUST respect Stage 1 signals as read-only inputs.**

---

## Document Status

**Version**: 1.0
**Last Updated**: 2025-12-15
**Compliance**: All Stage 1 code complies with this contract
**Next Review**: Before Stage 2 implementation

**This contract protects the Interpretation Sandbox from semantic drift.**
