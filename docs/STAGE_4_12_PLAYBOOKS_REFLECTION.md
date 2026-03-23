# Stage 4.12: Regulation Playbooks & Reflection

**Layer:** Regulation → Personalisation
**Status:** Implemented ✅
**Audience:** Everyone, designed first for neurodivergent users (ADHD-safe)

## Purpose

Stage 4.12 introduces **Regulation Playbooks** - a lightweight way for users to capture what works for them when certain regulation signals appear.

This stage answers the question:
> "What usually helps me in situations like this?"

It does NOT:
- Diagnose
- Advise
- Enforce
- Optimize behavior

It exists to:
- Preserve insight
- Reduce relearning
- Support self-trust
- Help future-you remember what present-you learned

## Mental Model

**Regulation Playbooks are personal field notes.**

They are:
- NOT rules
- NOT recommendations
- NOT goals
- NOT commitments

They are:
> "When this shows up, here's what I've learned helps (or doesn't)."

The system **never** claims a playbook "worked" or "improved outcomes".

## First Principles (Non-Negotiable)

Reflection & Playbooks MUST be:
- ✅ Optional at all times
- ✅ Fast by default (10-15 seconds)
- ✅ User-authored only (no system suggestions)
- ✅ Editable, dismissible, and ignorable
- ✅ Framed as notes to self, not reports to the system
- ✅ Valuable immediately, even if used once

Reflection & Playbooks MUST NOT:
- ❌ Block progress
- ❌ Be required for signals, responses, or analytics to work
- ❌ Be framed as "helping the system learn"
- ❌ Use therapeutic, diagnostic, or evaluative language
- ❌ Create obligations, reminders, or "unfinished" states
- ❌ Be tracked for completion, frequency, or compliance

## Two-Layer Reflection Design

### Layer 1: Quick Pin (Default)

**Time cost:** ~10 seconds
**Purpose:** Capture context with minimal effort

**When Quick Pin is offered:**
- Inline on Signal Detail pages
- When signal appears for the first or second time
- Never as a popup
- Never forced

**Quick Pin UI Features:**
- Preset reason tags (optional checkboxes)
- Optional one-line note to future-you
- One tap saves
- Skip has no consequence
- No confirmation modals
- No "reflection saved" celebration
- Auto-closes on save or skip

**Reason Tag Options:**
- Too many options
- Unclear next step
- Low energy
- Just exploring
- Context changed
- Not sure

### Layer 2: Playbook Entry (Optional, Expandable)

**Offered only when:**
- The same signal appears repeatedly over time (2+ quick pins)
- The user explicitly clicks "Add to my playbook"

**Playbook Entry Features:**
- Free text notes field (no AI rewriting, no prompts)
- Optional "What usually helps" checkboxes
- Optional "What doesn't help" text field
- All fields optional
- Leaving midway is fine
- Cancel leaves no trace
- No "complete" state

**"What Usually Helps" Options:**
- Focus reset
- Pause scope
- Capture ideas, don't act
- Take a break
- Switch to admin / low-energy tasks
- Something else

## What Playbooks Do

Playbooks:
- Appear quietly on Signal Detail pages: "You've left yourself a note about this."
- Appear in Analytics section (read-only): "Past-you noticed this pattern before."
- Can be referenced when choosing responses
- Can be edited, deleted anytime

## What Playbooks Do NOT Do

Playbooks do NOT:
- ❌ Trigger responses
- ❌ Alter signal thresholds
- ❌ Generate recommendations
- ❌ Affect analytics
- ❌ "Activate" automation
- ❌ Create notifications
- ❌ Track compliance

## UX Placement

**Where Playbooks Appear:**
1. Signal Detail View → Quick Pin card (when appropriate)
2. Signal Detail View → "Your Notes" section (when playbook exists)
3. Signal Detail View → "Add to Your Playbook" (after 2+ quick pins)
4. Regulation Hub → "My Playbooks" page (optional navigation)
5. Alignment Insights → "Past Notes" card (read-only reminders)

**Where They Don't Appear:**
- No global reminders
- No notifications
- No onboarding nags
- No "review your playbook" prompts
- Never on main task flows
- Never as alerts or banners

## Language Rules (Strict)

**Allowed Language:**
- "You noticed..."
- "You wrote..."
- "This is optional"
- "Nothing here is binding"
- "Future-you might find this useful"
- "Past-you noticed this pattern before"

**Forbidden Language:**
- Improve / optimize / fix
- You should / need to
- This works / helped / caused
- Better / worse
- Success / failure
- Consistency / discipline
- Track / measure / progress

## Data Model

### `regulation_playbooks` Table
```sql
id uuid primary key
user_id uuid not null (FK to auth.users)
signal_key text not null
notes text
helps jsonb (array of strings)
doesnt_help text
created_at timestamptz
updated_at timestamptz
UNIQUE(user_id, signal_key)
```

### `regulation_quick_pins` Table
```sql
id uuid primary key
user_id uuid not null (FK to auth.users)
signal_instance_id uuid
signal_key text not null
reason_tags text[]
note text
created_at timestamptz
```

### Constraints
- RLS: user-owned only
- No analytics
- No aggregation
- No cross-user inference
- Treated as sensitive personal data

## Implementation Details

### Service Layer
**File:** `src/lib/regulation/playbookService.ts`

**Functions:**
- `getUserPlaybooks(userId)` - Get all playbooks for a user
- `getPlaybookBySignalKey(userId, signalKey)` - Get specific playbook
- `createPlaybook(userId, input)` - Create new playbook
- `updatePlaybook(userId, signalKey, input)` - Update existing playbook
- `deletePlaybook(userId, signalKey)` - Delete playbook
- `upsertPlaybook(userId, input)` - Create or update
- `createQuickPin(userId, input)` - Create quick pin
- `getQuickPinsBySignalKey(userId, signalKey)` - Get pins for signal
- `getUserQuickPins(userId)` - Get all user's pins
- `deleteQuickPin(userId, pinId)` - Delete pin
- `hasPlaybookForSignal(userId, signalKey)` - Check if playbook exists
- `countQuickPinsForSignal(userId, signalKey)` - Count pins for signal

All functions are read/write but user-scoped only. No cross-user access.

### UI Components

**Core Components:**
1. `QuickPinCard.tsx` - Fast 10-second reflection
2. `PlaybookEntryModal.tsx` - Optional deeper reflection
3. `PlaybookNoteCard.tsx` - Display saved playbook
4. `MyPlaybooksPage.tsx` - View all playbooks
5. `PlaybookRemindersCard.tsx` - Contextual reminders in analytics

**Integration Points:**
- `SignalDetailPage.tsx` - Shows quick pins and playbook notes
- `AlignmentInsightsSection.tsx` - Shows past notes reminder

## User Flow Examples

### First Time Seeing a Signal
1. User views signal detail page
2. Quick Pin card appears (optional)
3. User can select reason tags, add note, or skip
4. Save takes 10 seconds, skip takes 1 second
5. Card disappears after interaction

### Signal Appears Again
1. User views signal detail page
2. Quick Pin card appears again (optional)
3. Previous quick pins are stored but not displayed yet
4. User can save another quick pin or skip

### After 2+ Quick Pins
1. User views signal detail page
2. No more quick pin cards appear
3. "Add to Your Playbook" section appears
4. User can click to create full playbook entry
5. Or ignore completely - no consequence

### Viewing Existing Playbook
1. User views signal detail page
2. "Your Notes" section shows playbook
3. Can edit or delete
4. Notes are read-only display until edited

### Browsing All Playbooks
1. User navigates to "My Playbooks" (optional)
2. Sees all playbook entries
3. Can edit or delete any entry
4. No stats, no completion tracking

## Ethics & Safety

**Reflection data is treated as sensitive:**
- No AI interpretation
- No summarization without explicit user request
- No export by default
- No system memory outside what the user writes
- No cross-user patterns
- No aggregate analysis

**User Ownership:**
- Users can delete all playbooks anytime
- No "are you sure?" beyond standard delete confirmation
- Deletion is immediate and permanent
- No recovery mechanism needed (user owns the knowledge)

## File Structure

```
src/
├── lib/
│   └── regulation/
│       ├── playbookTypes.ts          # Type definitions
│       └── playbookService.ts        # CRUD operations
└── components/
    └── regulation/
        ├── QuickPinCard.tsx          # 10-second reflection
        ├── PlaybookEntryModal.tsx    # Full playbook entry
        ├── PlaybookNoteCard.tsx      # Display playbook
        ├── MyPlaybooksPage.tsx       # All playbooks page
        ├── PlaybookRemindersCard.tsx # Analytics reminder
        └── SignalDetailPage.tsx      # Updated with playbooks
```

## Testing Scenarios

**Quick Pin Flow:**
- ✅ Quick pin appears on first signal view
- ✅ Can select multiple reason tags
- ✅ Can add optional note
- ✅ Save completes in < 2 seconds
- ✅ Skip has no consequence, no tracking
- ✅ Card disappears after save/skip

**Playbook Entry Flow:**
- ✅ "Add to playbook" appears after 2+ quick pins
- ✅ Can create full playbook entry
- ✅ All fields are optional
- ✅ Cancel leaves no trace
- ✅ Save persists data correctly

**Playbook Display:**
- ✅ Playbook appears in Signal Detail
- ✅ Can edit existing playbook
- ✅ Can delete playbook with confirmation
- ✅ Playbooks appear in My Playbooks page
- ✅ Past notes reminder shows in analytics

**Data Privacy:**
- ✅ Only user can access their playbooks
- ✅ No cross-user access
- ✅ No analytics on playbook usage
- ✅ Deletion is permanent

## Exit Criteria

Users are ready to move on when:
- ✅ Writing a note feels easier than not writing one
- ✅ Skipping reflection feels equally valid
- ✅ Past notes feel helpful, not preachy
- ✅ They forget the system exists - but benefit when they remember it
- ✅ They feel like they are building the regulation system, not the app

## Integration with Other Stages

### With Stage 4.1 (Regulation Signals)
- Quick pins attach to signal instances
- Playbooks link to signal types
- No modification of signal detection

### With Stage 4.10 (Alignment Insights)
- PlaybookRemindersCard shows in analytics
- Read-only display, no pressure
- Links to full playbooks page

### With Stage 4.11 (Trend Awareness)
- Trends inform when to offer playbook creation
- But trends don't automatically suggest playbooks
- User always initiates

### Future Integration Possibilities
- Presets could reference playbooks (user choice)
- Daily Alignment could show relevant playbooks (read-only)
- But playbooks never trigger automation

## Why This Matters

Most behavior systems fail because they:
- Demand reflection
- Moralize inconsistency
- Centralize authority in the system

Stage 4.12 does the opposite. It says:

> "You are the authority.
> The system just helps you remember what you already learned."

That's what makes this world-class rather than just clever.

## What Comes Next

After Stage 4.12, the system is complete enough to test in real life.

Future stages (optional):
- Stage 4.13 - Alignment ↔ Regulation Feedback Loop
- Stage 5 - Gentle Automation (opt-in, later)
- Stage 6 - Long-term pattern memory (months, not days)

Stage 4.12 represents the completion of the core regulation personalization layer. Everything beyond this is enhancement, not foundation.
