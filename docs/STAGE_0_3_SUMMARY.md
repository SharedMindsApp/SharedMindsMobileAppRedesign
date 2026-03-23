# Stage 0.3 Summary - Semantic Firebreak Design

**Phase**: Design Complete (No Implementation)
**Purpose**: Map all potential "meaning leak" vectors and define protective architecture

---

## What Was Delivered

### 1. Comprehensive Risk Inventory

Scanned entire SharedMinds codebase and identified **12 distinct interpretation systems** with risk levels:

**CRITICAL HIGH Risk**:
- Habits & Achievements (streaks, completion rates, "success" labeling)
- Insights & Analytics Dashboard (collective metrics, completion rates)
- Focus Mode Analytics (scoring, productivity trends)
- AI Assistant (pattern hallucination risk)

**MEDIUM Risk**:
- Reminders & Notifications (adaptive nudging)
- Goal & Milestone Tracking (progress percentages)
- Household Matching (behavioral-based suggestions)
- Professional Reports (aggregated metrics)

**LOW Risk**:
- Fridge Canvas Widgets (mostly display)
- Calendar System (factual events)
- Messaging (not behavior-integrated yet)

---

## 2. Four-Layer Firebreak Architecture

Defined strict architectural boundaries:

**Layer A: Stage 0 - Raw Event Log**
- Append-only behavioral observations
- NO interpretation, aggregation, or user-facing output
- Currently implemented and protected

**Layer B: Stage 1 - Interpretation Sandbox**
- Computes candidate signals (NOT user-facing by default)
- Requires provenance tracking and confidence scores
- Signals remain unpublished until consent obtained
- NOT YET IMPLEMENTED

**Layer C: Stage 2+ - Feedback & UX Layer**
- Displays consent-gated insights to users
- Requires neutral language and transparency
- Users can dismiss any insight
- NOT YET IMPLEMENTED

**Layer D: Stage 3+ - Automation / Intervention**
- Context-aware nudges and adaptive systems
- Respects regulation engine constraints
- All interventions reversible and audited
- NOT YET IMPLEMENTED

---

## 3. Interface Contracts

Defined explicit APIs between layers:

**Layer A → B**: `getRawBehavioralEvents(query)` - read-only raw event access
**Layer B → C**: `getCandidateSignals(userId, consentFlags)` - filtered signal access
**Layer C → D**: `canIntervene(userId, type, context)` - permission-checked intervention

Each layer has strict **allowed operations** and **forbidden operations**.

---

## 4. Neurodivergent-Safe Consent Model

**Default State**: ALL interpretation OFF
- Only raw event capture active
- No signals computed, no insights shown, no interventions

**Granular Opt-In**: 15+ consent flags including:
- Time awareness patterns
- Routine stability metrics
- Habit tracking (with shame-risk warning)
- AI behavioral context (with hallucination warning)
- Social accountability (with comparison-risk warning)

**Emergency Brake**: "Safe Mode"
- Instant deactivation of all interpretation
- Keyboard shortcut: Cmd/Ctrl + Shift + S
- Only Stage 0 remains active

**Transparency**: Every insight includes "How was this computed?" with:
- Source events used
- Algorithm version
- Confidence score
- "Not helpful" feedback button

---

## 5. Red-Team: 12 Failure Modes & Defenses

Identified critical failure scenarios with multi-layered defenses:

1. **Streak-Shame Spiral** → Consent gate, neutral language, hide-streaks option
2. **More App Usage = Success** → Ban "engagement" metrics, factual language only
3. **Dopamine Addiction** → No gamification by default, no celebration animations
4. **Coercive Accountability** → No leaderboards, no comparisons, double-consent for sharing
5. **AI Hallucinating Patterns** → Confidence scores, "AI-generated" labels, minimum 30 events
6. **False Negatives ("Not Improving")** → Ban "progress" metrics, neutral trend language
7. **False Positives ("Thriving!")** → Cross-check with regulation engine, no praise without context
8. **Comparison to Others** → NO population stats, self-referential insights only
9. **Punitive Scoring** → Semantic drift detection, whitelist signal types, automated tests
10. **Over-Notification Fatigue** → Hard cap 3/day, pause after dismissals, regulation check
11. **Burnout from Optimization** → "Observation not prescription" disclaimers, never "optimal"
12. **Data Self-Weaponization** → Export warnings, concern message for frequent exports

Each failure mode has **4 layers of defense**: architectural, consent, UI, and runtime.

---

## Key Architectural Decisions

### Containment Actions for Existing Systems

**Habits & Achievements**:
- ✅ Existing `habit_entries` table is factual (keep)
- ❌ Streak computation must move to Layer B (Stage 1)
- ❌ Achievement unlocking requires consent gate
- ❌ Must NOT write to `behavioral_events` table

**Focus Mode Analytics**:
- ✅ Focus sessions CAN append behavioral events (start/end times)
- ❌ "focus_score" must be reframed or moved to Layer B
- ❌ "Productivity trends" forbidden, use neutral "activity patterns"
- ❌ Analytics dashboard requires consent

**AI Assistant**:
- ❌ Must NOT read `behavioral_events` directly
- ✅ Can read consent-gated Layer C signals only
- ✅ All outputs labeled "AI-generated - verify accuracy"
- ❌ Requires "AI behavioral context" consent flag

**Insights Dashboard**:
- ❌ All aggregations move to Layer B
- ❌ Completion rates require consent gate
- ❌ No "family leaderboards" ever
- ✅ Can display factual timelines without consent

---

## Implementation Roadmap

### Stage 1 (Next Phase): Interpretation Sandbox

**Create**:
- `candidate_signals` table with provenance
- Signal computation framework with confidence scores
- Layer A → B interface implementation

**Start with least risky signals**:
- Time-of-day patterns (when user is active)
- Activity clustering (which tasks co-occur)
- Routine stability (variance in timing)

**Explicitly defer**:
- Completion rates (too judgmental)
- Streaks (shame risk)
- Success prediction (too prescriptive)

### Stage 2 (Future): Feedback & UX

**Create**:
- Granular consent system
- `published_insights` table
- Transparency UI ("How was this computed?")
- Safe Mode with emergency brake

**Forbidden displays**:
- NO "You're productive!"
- NO "Great job!"
- NO comparison to others
- NO grades/scores/ratings

### Stage 3 (Far Future): Interventions

**Create**:
- Regulation engine integration
- `intervention_logs` audit trail
- Permission checking system
- Instant "Stop all interventions" button

**Forbidden interventions**:
- NO increased reminders based on "low performance"
- NO motivational messages
- NO feature restrictions as punishment
- NO social pressure

---

## Critical Protection Mechanisms

### Compile-Time
- TypeScript types prevent semantic fields in Stage 0
- Branded types prevent layer boundary violations
- Explicit forbidden functions throw errors

### Runtime
- Input validation rejects interpretive fields
- Semantic drift detection scans for forbidden terms
- Automated tests flag risky language

### Database
- No UPDATE policy on behavioral_events (enforced immutability)
- No DELETE policy except GDPR function
- No triggers that react to events

### Consent
- Default state: all interpretation OFF
- Granular opt-in per category
- Emergency brake (Safe Mode)
- Revocation cascades correctly

### UI
- Neutral, non-judgmental language mandatory
- "How was this computed?" transparency required
- "Not helpful" feedback on all insights
- No comparison to others

---

## Success Criteria Met

✅ **All existing interpretation systems identified and risk-rated**

✅ **Four-layer architecture defined with clear boundaries**

✅ **Interface contracts specified for cross-layer communication**

✅ **Neurodivergent-safe consent model designed**

✅ **12+ failure modes documented with multi-layered defenses**

✅ **Implementation roadmap created with explicit forbidden features**

---

## Next Actions

### Immediate (Before Starting Stage 1)
1. **Team training** on semantic firebreak architecture
2. **Code freeze** on existing interpretation systems (no new features)
3. **Audit planning** for habits/insights systems
4. **User research** with neurodivergent community

### Short-Term (Stage 1 Preparation)
1. Design `candidate_signals` table schema
2. Select first 3 signal types to implement (lowest risk)
3. Create signal confidence scoring framework
4. Build provenance tracking system

### Long-Term (Stage 2+ Planning)
1. Design consent UI mockups
2. Create neutral language style guide
3. Plan neurodivergent user testing
4. Consult mental health professionals

---

## Review Checklist

Before ANY Stage 1+ implementation:

- [ ] Team has read SEMANTIC_FIREBREAK_MAP.md
- [ ] Feature has been assigned to correct layer (B, C, or D)
- [ ] Interface contracts are respected
- [ ] Consent requirements are defined
- [ ] Failure modes have been identified
- [ ] Defenses are implemented at multiple layers
- [ ] Language is neutral and non-judgmental
- [ ] Feature is reversible and user-controllable
- [ ] No forbidden terms in code or UI
- [ ] Semantic drift detection passes

---

## Files Created

**Design Documentation**:
- `SEMANTIC_FIREBREAK_MAP.md` - Full architecture specification (24,000+ words)
- `STAGE_0_3_SUMMARY.md` - This summary

**Related Documents** (from Stage 0.2):
- `STAGE_0_BEHAVIORAL_CONTRACT.md` - Stage 0 constraints
- `STAGE_0_ENFORCEMENT_SUMMARY.md` - Enforcement mechanisms
- `/src/lib/behavioral-events/` - Stage 0 implementation

---

## Critical Reminder

**Stage 0 remains unchanged and protected.**

This design phase adds NO new code. It maps the risk landscape and defines how future stages will safely build on Stage 0 without contaminating it.

Existing interpretation systems (habits, insights, focus analytics) continue to function but are now flagged for future refactoring. They must NOT integrate with Stage 0 until Layer B (Stage 1) is implemented with proper consent gates.

**The firebreak holds. No meaning leaks into Stage 0.**

---

## Document Metadata

- **Version**: 1.0
- **Date**: 2025-12-15
- **Status**: Design Complete, Awaiting Stage 1 Implementation
- **Dependencies**: Stage 0.2 must remain stable
- **Next Review**: Before Stage 1 implementation begins

**Stage 0.3 design is complete. The system is protected from semantic drift.**
